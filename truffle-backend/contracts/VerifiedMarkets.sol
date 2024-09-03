// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

import "./interfaces/Bond.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/CometInterface.sol";
import "./interfaces/VerifiedMarketsInterface.sol";

/**
 * @title Verified Markets
 * @notice A Compound III operator to enable staking of collateral for real world assets to Compound.
 * @author Kallol Borah
 */
contract VerifiedMarkets {
    /// @notice The Comet contract
    Comet public immutable comet;

    //mapping issuer to RWA to bond
    mapping(address => mapping(address => RWA.Asset)) private assets; //only one Asset(bond) per user => RWA

    //mapping issuer to RWA to collateral
    mapping(address => mapping(address => RWA.Collateral)) private guarantees; //only one collateral per user => RWA

    //events
    event NewRWA(
        address indexed issuer,
        address indexed asset,
        address bond,
        uint256 apy,
        string issuingDocs,
        uint256 faceValue
    );
    event PostedCollateral(
        address indexed issuer,
        address indexed asset,
        address collateral,
        uint256 amount
    );
    event Borrowed(
        address indexed borrower,
        address indexed base,
        uint256 amount
    );
    event Repaid(
        address indexed borrower,
        address indexed base,
        uint256 amount
    );

    /**
     * @notice Construct a new operator.
     * @param comet_ The Comet contract.
     **/
    constructor(address comet_) {
        comet = Comet(comet_);
    }

    /**
     * @notice RWA issuer submits asset details and bond issued that can be purchased to provide collateral to the RWA issuer
     * @param asset       RWA for which bond is issued
     * @param bond        bond token that is issued
     * @param apy         interest rate paid on bond
     * @param issuingDocs ipfs reference for RWA docs
     * @param faceValue   par value of bond after discounting it with interest rate
     **/
    //Todo: should issuer be able to overwrite existing bond address tied to an assest???
    function submitNewRWA(
        address asset,
        address bond,
        uint256 apy,
        string memory issuingDocs,
        uint256 faceValue
    ) external {
        //verify submitNewRWA params
        require(
            asset != address(0x0) &&
                bond != address(0x0) &&
                bond != asset &&
                apy > 0 &&
                faceValue > 0,
            "RWA submission : Invalid request"
        );
        //verify bond's issuer is the caller
        require(
            Bond(bond).getIssuer() == msg.sender,
            "RWA submission : Invalid issuer"
        );
        //if issuer has no RWA tied to this assest, create new RWA for the issuer's asset
        if (assets[msg.sender][asset].bond == address(0x0)) {
            RWA.Asset memory rwa = RWA.Asset({
                bond: bond,
                apy: apy,
                issuingDocs: issuingDocs,
                faceValue: faceValue
            });
            assets[msg.sender][asset] = rwa;
        } else {
            //issuer can only update/overwrite an existing RWA details
            require(
                assets[msg.sender][asset].bond == bond,
                "RWA submission : Invalid bond"
            );
            assets[msg.sender][asset].apy = apy;
            assets[msg.sender][asset].issuingDocs = issuingDocs;
            assets[msg.sender][asset].faceValue = faceValue;
        }
        emit NewRWA(msg.sender, asset, bond, apy, issuingDocs, faceValue);
    }

    /**
     * @notice Used by RWA issuer to post collateral used to buy bonds issued by it to borrow from Compound
     * @param asset       RWA for which collateral is posted
     * @param collateral  collateral used to buy bond issued by RWA issuer(must not be baseToken and must be accepted by comet)
     * @param amount      amount of collateral posted
     **/
    function postCollateral(
        address asset,
        address collateral,
        uint256 amount
    ) external {
        //verify postCollateral params
        require(
            asset != address(0x0) &&
                collateral != address(0x0) &&
                collateral != asset &&
                amount > 0,
            "Posting Collateral: Invalid"
        );
        //if issuer is posting collateral to the assest for first time, create new Collateral for user's assest;
        if (guarantees[msg.sender][asset].collateral == address(0x0)) {
            //verify getAssetInfoByAddress didn't revert for collateral(to filter out unaccepted collaterals)
            bytes memory payload = abi.encodeWithSignature(
                "getAssetInfoByAddress(address)",
                collateral
            );
            (bool success, ) = address(comet).staticcall(payload);
            require(success, "Posting Collateral: Invalid collateral calll");
            //supply collateral on comet and verify supply cap is not breached
            comet.supplyFrom(msg.sender, msg.sender, collateral, amount);
            //create collateral
            RWA.Collateral memory guarantee = RWA.Collateral({
                collateral: collateral,
                collateralAmount: amount,
                borrowed: 0
            });
            guarantees[msg.sender][asset] = guarantee;
        } else {
            //issuer can only update/overwrite collateral amount for existing collateral
            require(
                guarantees[msg.sender][asset].collateral == collateral,
                "Post Collateral: Invalid collateral"
            );
            //supply collateral on comet and verify supply cap is not breached
            comet.supplyFrom(msg.sender, msg.sender, collateral, amount);
            guarantees[msg.sender][asset].collateralAmount += amount;
        }
        emit PostedCollateral(msg.sender, asset, collateral, amount);
    }

    /**
     * @notice Called by RWA issuer to to borrow base asset from Compound
     * @param asset       RWA for which base asset is borrowed
     * @param amount      amount of base asset borrowed
     **/
    function borrowBase(address asset, uint256 amount) external {
        //verify borrowBase params
        require(
            asset != address(0x0) && amount > comet.baseBorrowMin(),
            "Borrowing base : Invalid"
        );
        address baseToken = comet.baseToken();
        //withdraw base from comet and check for non negative liquidity
        comet.withdrawFrom(msg.sender, msg.sender, baseToken, amount);
        guarantees[msg.sender][asset].borrowed += amount;
        emit Borrowed(msg.sender, baseToken, amount);
    }

    /**
     * @notice Called by RWA issuer to repay base asset to Compound and withdraw collateral posted earlier
     * @param asset       RWA for which base asset is paid back
     * @param amount      amount of base asset paid back
     **/
    function repayBase(address asset, uint256 amount) external {
        //verify repayBase params
        require(asset != address(0x0) && amount > 0, "Repaying base : Invalid");
        //verify user has collateral to begin with
        address collateral = guarantees[msg.sender][asset].collateral;
        require(collateral != address(0x0), "Repaying base : Invalid asset");
        //supply base on comet
        address baseToken = comet.baseToken();
        comet.supplyFrom(msg.sender, msg.sender, baseToken, amount);
        //update issuer's borrowed amount
        guarantees[msg.sender][asset].borrowed -= amount;
        //calculate collateralAmount and downscale with 1e18(since borrowCollateralFactor is always % in wei)
        Comet.AssetInfo memory collateralInfo = comet.getAssetInfoByAddress(
            collateral
        );
        uint256 collateralToWithdrawInBase = (collateralInfo
            .borrowCollateralFactor * amount) / 1e18;
        uint256 baseScale = comet.baseScale();
        IERC20 collateralContract = IERC20(collateral);
        uint8 collateralDecmals = collateralContract.decimals();
        uint256 collateralToWithdraw = (collateralToWithdrawInBase *
            10 ** collateralDecmals) / baseScale; //amount in collateral decimals
        //withdraw collateral from comet check for non negative liquidity
        comet.withdrawFrom(
            msg.sender,
            msg.sender,
            collateral,
            collateralToWithdraw
        );
        guarantees[msg.sender][asset].collateralAmount -= collateralToWithdraw;
        emit Repaid(msg.sender, baseToken, amount);
    }
}
