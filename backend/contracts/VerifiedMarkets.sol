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
contract VerifiedMarkets is RWA {
    /// @notice The Comet contract
    Comet public immutable comet;

    //mapping issuer to RWA to bond
    mapping(address => mapping(address => Asset)) private assets;

    //mapping issuer to RWA to collateral
    mapping(address => mapping(address => Collateral)) private guarantees;

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
    constructor(Comet comet_) payable {
        comet = comet_;
    }

    /**
     * @notice RWA issuer submits asset details and bond issued that can be purchased to provide collateral to the RWA issuer
     * @param asset       RWA for which bond is issued
     * @param bond        bond token that is issued
     * @param apy         interest rate paid on bond
     * @param issuingDocs ipfs reference for RWA docs
     * @param faceValue   par value of bond after discounting it with interest rate
     **/
    function submitNewRWA(
        address asset,
        address bond,
        uint256 apy,
        string memory issuingDocs,
        uint256 faceValue
    ) external override {
        require(
            asset != address(0x0) &&
                bond != address(0x0) &&
                apy > 0 &&
                faceValue > 0,
            "RWA submission : Invalid request"
        );
        require(
            Bond(bond).getIssuer() == msg.sender,
            "RWA submission : Invalid issuer"
        );
        if (assets[msg.sender][asset].bond != address(0x0)) {
            RWA.Asset memory rwa = RWA.Asset({
                bond: bond,
                apy: apy,
                issuingDocs: issuingDocs,
                faceValue: faceValue
            });
            assets[msg.sender][asset] = rwa;
        } else {
            assets[msg.sender][asset].bond = bond;
            assets[msg.sender][asset].apy = apy;
            assets[msg.sender][asset].issuingDocs = issuingDocs;
            assets[msg.sender][asset].faceValue = faceValue;
        }
        emit NewRWA(msg.sender, asset, bond, apy, issuingDocs, faceValue);
    }

    /**
     * @notice Used by RWA issuer to post collateral used to buy bonds issued by it to borrow from Compound
     * @param asset       RWA for which collateral is posted
     * @param collateral  collateral used to buy bond issued by RWA issuer
     * @param amount      amount of collateral posted
     **/
    function postCollateral(
        address asset,
        address collateral,
        uint256 amount
    ) external override {
        require(
            asset != address(0x0) && collateral != address(0x0) && amount > 0,
            "Comet Collateral provisioning: Invalid"
        );
        //check if supply cap of collateral is not breached
        comet.supplyTo(msg.sender, collateral, amount);
        if (guarantees[msg.sender][asset].collateral != collateral) {
            RWA.Collateral memory guarantee = RWA.Collateral({
                collateral: collateral,
                collateralAmount: amount,
                borrowed: 0
            });
            guarantees[msg.sender][asset] = guarantee;
        } else {
            guarantees[msg.sender][asset].collateralAmount =
                guarantees[msg.sender][asset].collateralAmount +
                amount;
        }
        emit PostedCollateral(msg.sender, asset, collateral, amount);
    }

    /**
     * @notice Called by RWA issuer to to borrow base asset from Compound
     * @param asset       RWA for which base asset is borrowed
     * @param base        base asset borrowed by RWA issuer
     * @param amount      amount of base asset borrowed
     **/
    function borrowBase(
        address asset,
        address base,
        uint256 amount
    ) external override {
        require(
            asset != address(0x0) &&
                base != address(0x0) &&
                amount > comet.baseBorrowMin(),
            "Borrowing base : Invalid"
        );
        //does borrower have collateral to borrow ? (&& comet.isBorrowCollateralized(msg.sender))
        comet.withdrawTo(msg.sender, base, amount);
        guarantees[msg.sender][asset].borrowed =
            guarantees[msg.sender][asset].borrowed +
            amount;
        emit Borrowed(msg.sender, base, amount);
    }

    /**
     * @notice Called by RWA issuer to repay base asset to Compound and withdraw collateral posted earlier
     * @param asset       RWA for which base asset is paid back
     * @param base        base asset paid back by RWA issuer
     * @param amount      amount of base asset paid back
     **/
    function repayBase(
        address asset,
        address base,
        uint256 amount
    ) external override {
        require(
            asset != address(0x0) && base != address(0x0) && amount > 0,
            "Repaying base : Invalid"
        );
        guarantees[msg.sender][asset].borrowed =
            guarantees[msg.sender][asset].borrowed -
            amount;
        comet.supplyTo(msg.sender, base, amount);
        uint256 collateralToWithdraw = comet
            .getAssetInfoByAddress(base)
            .borrowCollateralFactor * amount;
        guarantees[msg.sender][asset].collateralAmount =
            guarantees[msg.sender][asset].collateralAmount -
            collateralToWithdraw;
        comet.withdrawTo(
            msg.sender,
            guarantees[msg.sender][asset].collateral,
            collateralToWithdraw
        );
        emit Repaid(msg.sender, base, amount);
    }
}
