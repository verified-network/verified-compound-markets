// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

import "./interfaces/Bond.sol";
import "./interfaces/Factory.sol";
import "./interfaces/BondIssuer.sol";
import "./interfaces/CometInterface.sol";
import "./interfaces/VerifiedMarketsInterface.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

import "./math/Math.sol";
import "./math/FixedPoint.sol";
import "./math/LogExpMath.sol";

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
    mapping(address => mapping(address => RWA.Collateral[])) private guarantees; //only one collateral per user => RWA

    //events
    event NewRWA(
        address indexed issuer,
        address indexed asset,
        address bond,
        uint256 apy,
        string issuingDocs,
        uint256 faceValue,
        uint256 tenure
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
        uint256 amount,
        address asset
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
     * @notice RWA issuer submits asset details and issued bond that can be purchased to provide collateral to Compound
     * @param asset       RWA for which bond is issued
     * @param bond        address of bond 
     * @param apy         interest rate paid on bond
     * @param issuingDocs ipfs reference for RWA docs
     * @param faceValue   par value of bond in base currency (USDC)
     * @param factory     address of factory contract to get bond term in milliseconds
     **/
    function submitNewRWA(
        address asset,
        address bond,
        uint256 apy,
        string memory issuingDocs,
        uint256 faceValue,
        address factory
    ) external {
        uint256 tenure = Factory(factory).getBondTerm(bond);
        //verify submitNewRWA params
        require(
            asset != address(0x0) &&
                bond != address(0x0) &&
                bond != asset &&
                apy > 0 &&
                faceValue > 0 && 
                tenure > 0,
            "RWA submission : Invalid request"
        );
        //verify bond's issuer is the caller
        require(
            Bond(bond).getIssuer() == msg.sender,
            "RWA submission : Invalid issuer"
        );
        //if issuer has no bond issued for this RWA, issue bond
        if (assets[msg.sender][asset].bond == address(0x0)) {
            //record issued bond data
            RWA.Asset memory rwa = RWA.Asset({
                bond: bond,
                apy: apy,
                issuingDocs: issuingDocs,
                faceValue: faceValue,
                tenure: tenure,
                borrowed: 0
            });
            assets[msg.sender][asset] = rwa;
            emit NewRWA(msg.sender, asset, bond, apy, issuingDocs, faceValue, tenure);
        }         
    }

    /**
     * @notice Used by collateral provider (bond purchaser) to post collateral used to buy bonds issued 
     * @param bond        bond that has been sold which has accumulated collateral in this contract (must not be baseToken and must be accepted by comet)
     * @param issuer      bond issuing contract address
     * @param factory     bond factory contract address
     **/
    function postCollateral(
        address bond,
        address issuer, 
        address factory
    ) external {
        //verify bond's issuer is the caller
        address rwaBondIssuer = Bond(bond).getIssuer();
        require(
            rwaBondIssuer != address(0x0),
            "Post collateral : Invalid issuer"
        );
        uint256 amount;
        bytes32 currency;
        ( , amount, currency, ) = BondIssuer(issuer).getBondPurchases(msg.sender, bond);
        address collateral = Factory(factory).getCurrencyToken(currency);
        ( , , , currency, ) = BondIssuer(issuer).getBondIssues(rwaBondIssuer, bond);
        address asset = Factory(factory).getCurrencyToken(currency);
        //verify postCollateral params
        require(
                collateral != address(0x0) &&
                amount > 0,
            "Post collateral : No collateral found"
        );
        //check if amount of collateral supplied does not breach supply cap
        (uint128 totalSupply, uint128 reserved) = comet.totalsCollateral(collateral);
        Comet.AssetInfo memory info = comet.getAssetInfoByAddress(collateral);
        require(info.supplyCap > SafeCast.toUint128(amount) + totalSupply, "Collateral supply cap breached");
        bool updated = false;
        for(uint256 i=0; i< guarantees[rwaBondIssuer][asset].length; i++){
            //issuer can only update/overwrite collateral amount for existing collateral
            if(guarantees[rwaBondIssuer][asset][i].collateral == collateral){
                //supply collateral on comet and verify supply cap is not breached
                comet.supplyFrom(address(this), address(this), collateral, amount);
                guarantees[rwaBondIssuer][asset][i].collateralAmount += amount;
                updated = true;
            }
        }
        //if bond purchaser is posting collateral to the assest for first time, create new Collateral for user's assest;
        if(!updated){
            //supply collateral on comet and verify supply cap is not breached
            comet.supplyFrom(address(this), address(this), collateral, amount);
            //create collateral
            RWA.Collateral memory guarantee = RWA.Collateral({
                collateral: collateral,
                collateralAmount: amount                
            });
            guarantees[rwaBondIssuer][asset].push(guarantee);
        }
        emit PostedCollateral(msg.sender, asset, collateral, amount);
    }

    /**
     * @notice Called by RWA issuer to to borrow base asset from Compound
     * @param asset       RWA for which base asset is borrowed
     **/
    function borrowBase(address asset) external {
        //check if the account has enough collateral to borrow against
        require(comet.isBorrowCollateralized(address(this))==true, "Inaufficient collateral"); 
        //check if current borrowing rate is lower than the issuer's offered rate
        uint256 SecondsPerYear = 60 * 60 * 24 * 365;
        uint256 Utilization = comet.getUtilization();
        uint256 BorrowRate = comet.getBorrowRate(Utilization);
        uint256 BorrowAPR = BorrowRate / (10 ^ 18) * SecondsPerYear * 100;
        require(assets[msg.sender][asset].apy >= BorrowAPR, "Borrow APY offered not viable");
        address baseToken = comet.baseToken();
        //determine amount that can be borrowed
        uint256 amount;
        uint256 balance;
        for(uint256 i=0; i<guarantees[msg.sender][asset].length; i++){
            balance = comet.collateralBalanceOf(address(this), guarantees[msg.sender][asset][i].collateral);
            Comet.AssetInfo memory info = comet.getAssetInfoByAddress(guarantees[msg.sender][asset][i].collateral);
            amount += info.borrowCollateralFactor * guarantees[msg.sender][asset][i].collateralAmount;
        }
        //verify borrowBase params
        require(
            asset != address(0x0) && amount > comet.baseBorrowMin(),
            "Borrowing base : Invalid"
        );
        //withdraw base from comet and check for non negative liquidity
        comet.withdrawFrom(address(this), address(this), baseToken, amount);
        //keep reserve of base token by discounting as a zero coupon bond
        // compute (1 + r)^t in decimals of base tokens
        uint256 base = ERC20(baseToken).decimals() + assets[msg.sender][asset].apy; 
        //uint256 discountFactor = base.pow(assets[msg.sender][asset].tenure, ERC20(baseToken).decimals()); // fixed-point power
        //balance = amount.divDown(ERC20(baseToken).decimals(), discountFactor); // a / (1+r)^t
        assets[msg.sender][asset].borrowed += balance;
        //transfer borrowed amount to borrower
        ERC20(baseToken).transfer(msg.sender, balance);
        //guarantees[msg.sender][asset].borrowed += amount;
        emit Borrowed(msg.sender, baseToken, amount, asset);
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
        address collateral = guarantees[msg.sender][asset][0].collateral;
        require(collateral != address(0x0), "Repaying base : Invalid asset");
        //supply base on comet
        address baseToken = comet.baseToken();
        comet.supplyFrom(msg.sender, msg.sender, baseToken, amount);
        //update issuer's borrowed amount
        assets[msg.sender][asset].borrowed -= amount;
        //calculate collateralAmount and downscale with 1e18(since borrowCollateralFactor is always % in wei)
        Comet.AssetInfo memory collateralInfo = comet.getAssetInfoByAddress(
            collateral
        );
        uint256 collateralToWithdrawInBase = (collateralInfo.borrowCollateralFactor * amount) / 1e18;
        uint256 baseScale = comet.baseScale();
        IERC20 collateralContract = IERC20(collateral);
        uint8 collateralDecimals = 0;//ERC20(collateralContract).decimals();
        uint256 collateralToWithdraw = (collateralToWithdrawInBase * 10 ** collateralDecimals) / baseScale; //amount in collateral decimals
        //withdraw collateral from comet check for non negative liquidity
        comet.withdrawFrom(
            msg.sender,
            msg.sender,
            collateral,
            collateralToWithdraw
        );
        guarantees[msg.sender][asset][0].collateralAmount -= collateralToWithdraw;
        //redeem the bond
        IERC20(collateral).approve(assets[msg.sender][asset].bond, collateralToWithdraw);
        //VerifiedBond(assets[msg.sender][asset].bond).redeem(asset, amount);
        emit Repaid(msg.sender, baseToken, amount);
    }

    function _computeScalingFactor(IERC20 tkn) internal view returns (uint256) {

        // Tokens that don't implement the `decimals` method are not supported.
        uint256 tokenDecimals = ERC20(address(tkn)).decimals();

        // Tokens with more than 18 decimals are not supported.
        uint256 decimalsDifference = Math.sub(18, tokenDecimals);
        return 1e18 * 10**decimalsDifference;
    }

    function _upscale(uint256 amount, uint256 scalingFactor) internal pure returns (uint256) {        
        return FixedPoint.mulDown(amount, scalingFactor);
    }

}
