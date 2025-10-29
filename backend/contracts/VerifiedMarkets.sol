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
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./math/Math.sol";
import "./math/FixedPoint.sol";
import "./math/LogExpMath.sol";

/**
 * @title Verified Markets
 * @notice A Compound III operator to enable staking of collateral for real world assets to Compound.
 * @author Kallol Borah
 */
contract VerifiedMarkets is ReentrancyGuard {

    /// @notice The Comet contract
    Comet public immutable comet;

    //mapping issuer to RWA to bond
    mapping(address => mapping(address => RWA.Asset)) private assets; //only one Asset(bond) per user => RWA

    //mapping issuer to RWA to collateral
    mapping(address => mapping(address => RWA.Collateral)) private guarantees; //only one collateral per user => RWA

    //mapping of bond to bond purchasers (lenders)
    mapping(address => address[]) private lenders;

    //mapping bond purchaser to bond to collateral
    mapping(address => mapping(address => mapping(address => uint256))) private deposits;

    //mapping bond issuer to balance snapshots
    mapping(address => RWA.BalanceSnapshot[]) private balanceSnapshots;

    //events
    event NewRWA(
        address indexed issuer,
        address indexed asset,
        address collateral,
        address bond,
        uint256 apy,
        string issuingDocs,
        uint256 couponFrequency,
        uint256 faceValue,
        uint256 tenure
    );

    event PostedCollateral(
        address indexed issuer,
        address indexed bond,
        address collateral,
        uint256 amount
    );

    event Borrowed(
        address indexed borrower,
        address indexed base,
        uint256 amount,
        address bond
    );
    
    event Repaid(
        address indexed borrower,
        address indexed base,
        uint256 amount,
        address bond
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
     * @param frequency   frequency at which interest coupon on bond is paid to bond purchasers (lenders)
     * @param factory     address of factory contract to get bond term in milliseconds
     **/
    function submitNewRWA(
        address asset,
        address collateral,
        address bond,
        uint256 apy,
        string memory issuingDocs,
        uint256 frequency,
        uint256 faceValue,
        address factory
    ) nonReentrant external {
        uint256 tenure = Factory(factory).getBondTerm(bond);
        //verify submitNewRWA params
        require(
            asset != address(0x0) && collateral != address(0x0) &&
                Bond(bond).getIssuer() == msg.sender &&
                apy > 0 &&
                frequency > 0 && 
                tenure > 0 && faceValue > 0, 
            "Invalid request"
        );
        //if issuer has no bond issued for this RWA, issue bond
        if (assets[msg.sender][bond].asset == address(0x0)) {
            //record issued bond data
            RWA.Asset memory rwa = RWA.Asset({
                bond: bond,
                asset: asset,
                apy: apy,
                issuingDocs: issuingDocs,
                couponFrequency: frequency,
                faceValue: faceValue,
                collateral: collateral,
                tenure: tenure,
                borrowed: 0
            });
            assets[msg.sender][bond] = rwa;
            emit NewRWA(msg.sender, asset, collateral, bond, apy, issuingDocs, frequency, faceValue, tenure);
        }        
    }

    /**
     * @notice Used to post collateral by Bond purchasers (lenders or collateral providers) used to buy bonds issued 
     * @param bond        bond that has been sold which has accumulated collateral in this contract (must not be baseToken and must be accepted by comet)
     * @param issuer      bond issuing contract address
     * @param factory     bond factory contract address
     **/
    function postCollateral(
        address bond,
        address issuer, 
        address factory
    ) nonReentrant external {
        //verify bond is valid
        address rwaBondIssuer = Bond(bond).getIssuer();
        require(
            rwaBondIssuer != address(0x0),
            "Invalid issuer"
        );
        //verify bond is an existing RWA
          require(
             assets[rwaBondIssuer][bond].asset
             != address(0x0),
            "Invalid RWA"
        );
        uint256 amount;
        bytes32 currency;
        ( , amount, currency, ) = BondIssuer(issuer).getBondPurchases(msg.sender, bond);
        address collateral = Factory(factory).getCurrencyToken(currency);
        //verify postCollateral params
        require(
                collateral != address(0x0) &&
                amount > 0,
            "No collateral"
        );

        require(
                collateral == assets[rwaBondIssuer][bond].collateral,
            "Unaccepted collateral"
        );
        //check if amount of collateral supplied does not breach supply cap
        (uint128 totalSupply, ) = comet.totalsCollateral(collateral);
        Comet.AssetInfo memory info = comet.getAssetInfoByAddress(collateral);
        require(info.supplyCap > SafeCast.toUint128(amount) + totalSupply, "Collateral cap");
        bool updated = false;
        ERC20(collateral).approve(address(comet), amount);
        //issuer can only update collateral amount for existing collateral
        if(guarantees[rwaBondIssuer][bond].collateral == collateral){
            //supply collateral on comet and verify supply cap is not breached
            comet.supplyFrom(address(this), bond, collateral, amount);
            guarantees[rwaBondIssuer][bond].collateralAmount += amount;
            updated = true;
            deposits[msg.sender][bond][collateral] += amount;
        }
        //if bond purchaser is posting collateral to the assest for first time, create new Collateral for user's assest;
        if(!updated){
            //supply collateral on comet and verify supply cap is not breached
            comet.supplyFrom(address(this), bond, collateral, amount);
            //create collateral
            RWA.Collateral memory guarantee = RWA.Collateral({
                collateral: collateral,
                collateralAmount: amount                
            });
            guarantees[rwaBondIssuer][bond] = guarantee;
            deposits[msg.sender][bond][collateral] = amount;
            lenders[bond].push(msg.sender);
        }
        emit PostedCollateral(msg.sender, bond, collateral, amount);
    }

    /**
     * @notice Called by RWA issuer to to borrow base asset from Compound
     * @param bond       RWA bond for which base asset is borrowed
     **/
    function borrowBase(address bond) nonReentrant external {
        //check if the account has enough collateral to borrow against
        require(guarantees[msg.sender][bond].collateralAmount > 0, "No collateral"); 
        require(comet.isBorrowCollateralized(bond)==true, "No collateral");  //this will always be true till calculation for borrow is done???
        //check if current borrowing rate is lower than the issuer's offered rate  
        uint256 SecondsPerYear = 31_536_000 * 1e18;
        uint256 BorrowRate = comet.getBorrowRate(comet.getUtilization()); 
        uint256 BorrowAPR = BorrowRate  * SecondsPerYear / 1e18;
        require(assets[msg.sender][bond].apy >= BorrowAPR, "Borrow APY");
        address baseToken = comet.baseToken();
        //determine amount that can be borrowed
        Comet.AssetInfo memory info = comet.getAssetInfoByAddress(guarantees[msg.sender][bond].collateral);
        uint256 _amount =  guarantees[msg.sender][bond].collateralAmount * info.borrowCollateralFactor / 1e18; //multiply with borrowFactor(18 Decimals) to upscale first then downscale with 1e18 since borrowFactor is always 18 Decimals
        uint256 _amountUsd = _amount  * comet.baseScale() * comet.getPrice(info.priceFeed) / info.scale; //upscale with baseToken scale, get the USD price of the upscaled amount then downscale with collateral scale (will give amount in baseToken scale but also expressed in oracle price scale(8 decimals))
        uint256 amount = _amountUsd / comet.getPrice(comet.baseTokenPriceFeed()); //downscale with price scale to get only baseScale amount, also get equivalent amount using baseToken price
        //verify borrowBase params
        require(
            amount > comet.baseBorrowMin(),
            "Base minimum"
        );
        //withdraw base from comet and check for non negative liquidity
        comet.withdrawFrom(bond, address(this), baseToken, amount);  
        //clear collateralAmount
        guarantees[msg.sender][bond].collateralAmount = 0;     
        //keep reserve of base token by discounting as a zero coupon bond
        // compute (1 + r)^t in decimals of base tokens
        uint256 balance;
        uint256 base = 1e18 + assets[msg.sender][bond].apy; 
        uint256 discountFactor = FixedPoint.powUp(base, assets[msg.sender][bond].tenure); // fixed-point power
        balance = FixedPoint.divDown(amount, discountFactor); // a / (1+r)^t
        assets[msg.sender][bond].borrowed += balance;
        //transfer borrowed amount to borrower
        ERC20(baseToken).transfer(msg.sender, balance);
        if(Math.sub(amount, balance) > 0) {
             ERC20(baseToken).approve(address(comet), Math.sub(amount, balance));
        //deposit balance of base token to earn interest
        comet.supplyFrom(address(this), address(this), baseToken, Math.sub(amount, balance));
        }
        //take a snapshot of base balance for the account
        balanceSnapshots[bond].push(RWA.BalanceSnapshot(block.timestamp, comet.borrowBalanceOf(bond)));
        emit Borrowed(msg.sender, baseToken, balance, bond);
    }


    /**
     * @notice Called by RWA issuer to repay base asset to Compound and withdraw collateral posted earlier
     * @param bond       RWA bond for which base asset is paid back
     * @param amount      amount of base asset paid back
     **/
    function repayBase(address bond, uint256 amount) nonReentrant external {
        //verify repayBase params
        require(amount > 0, "Invalid Amount");  
        uint256 borrowed = assets[msg.sender][bond].borrowed;      
        require(borrowed > 0, "Invalid Borrowed");  
        // compute (1 + r)^t in decimals of base tokens
        uint256 investedAmount;
        uint256 base = 1e18 + assets[msg.sender][bond].apy; // 1 + r
        uint256 growthFactor = FixedPoint.powUp(base, assets[msg.sender][bond].tenure); // (1 + r)^t
        if(borrowed >= amount) {
           uint256 amountAfterTenure = FixedPoint.mulUp(amount, growthFactor); // balance * (1 + r)^t
           investedAmount = Math.sub(amountAfterTenure, amount);
        }else{
            uint256 amountAfterTenure = FixedPoint.mulUp(borrowed, growthFactor);
             investedAmount = Math.sub(amountAfterTenure, borrowed);
        }
        address baseToken = comet.baseToken();
        //pay back base token from issuer to comet
        comet.supplyFrom(msg.sender, bond, baseToken, amount);
        //withdraw invested base token from comet to this address
        if(investedAmount > 0 && comet.balanceOf(address(this)) >= investedAmount) {
        comet.withdrawFrom(
            address(this),
            address(this),
            baseToken,
            investedAmount
        );
        //pay back invested base token from this contract
        ERC20(baseToken).approve(address(comet), investedAmount);
        comet.supplyFrom(address(this), bond, baseToken, investedAmount);
        }
        address collateral = guarantees[msg.sender][bond].collateral;
        uint256 postedCollateral = Math.sub(comet.collateralBalanceOf(bond, collateral), guarantees[msg.sender][bond].collateralAmount); //track only used up collateralAmount leave out excess or unborrowed
        uint256 amountToWithdraw;
        //update issuer's borrowed amount
        if(comet.borrowBalanceOf(bond) > 0) {
          amountToWithdraw = 0;
           //incase of partial repayment but amount paid greater than borrowed(due to high interest amount)
            if(assets[msg.sender][bond].borrowed >= amount) {
             assets[msg.sender][bond].borrowed -= amount;
            }else{
                assets[msg.sender][bond].borrowed = 0;
            }
        }else{
            //full repayment(withdraw all posted collateral back)
            amountToWithdraw =  postedCollateral;
            assets[msg.sender][bond].borrowed = 0;
        }
       
        //withdraw collateral from comet check for non negative liquidity
       if(amountToWithdraw > 0) {
         comet.withdrawFrom(
            bond,
            address(this),
            collateral,
            amountToWithdraw
        );
       }
        emit Repaid(msg.sender, baseToken, amount, bond);
    }

    /**
     * @notice Called by Bond purchasers (lenders) to withdraw Collateral redeemed by Bond issuers (borrowers)
     * @param bond      address of Bond token issued
     * @param issuer    address of Bond issuing contract
     * @param factory   address of Factory contract
     **/
     //Todo: check loan is repaid???
    function withdrawCollateral(address bond, address issuer, address factory) nonReentrant external {
        ( , , , , uint256 timeOfIssue) = BondIssuer(issuer).getBondIssues(Bond(bond).getIssuer(), bond);
        require(block.timestamp >= Math.add(timeOfIssue, Factory(factory).getBondTerm(bond)), "Invalid redemption");
        ( , , bytes32 collateralName, ) = BondIssuer(issuer).getBondPurchases(msg.sender, bond);
        address collateral = Factory(factory).getCurrencyToken(collateralName);
        ERC20(collateral).transfer(bond, deposits[msg.sender][bond][collateral]);
        deposits[msg.sender][bond][collateral] = 0;
    }

    /**
     * @notice Called by RWA issuer to withdraw base asset from Compound and pay Bond purchasers (lenders)
     * @param asset       RWA for which base asset is withdrawn
     * @param collateral  address of collateral supported for bond
     **/
    function repayLenders(address asset, address collateral) nonReentrant external {
        address bond = assets[msg.sender][asset].bond;
        //require(bond!=address(0x0), "Invalid Repayment");
        uint256 num = balanceSnapshots[bond].length -1;
        if(Math.sub(balanceSnapshots[bond][num].timestamp, balanceSnapshots[bond][num-1].timestamp) > assets[msg.sender][asset].couponFrequency){
            uint256 toPay = Math.sub(comet.borrowBalanceOf(bond), balanceSnapshots[bond][num].balance); //this is positive if net interest has accrued
            toPay = Math.add(toPay, FixedPoint.divDown(balanceSnapshots[bond][0].balance, assets[msg.sender][asset].couponFrequency));//net interest + coupon payment 
            for(uint256 i=0; i<lenders[bond].length; i++){
                ERC20(collateral).transfer(lenders[bond][i], FixedPoint.divDown(toPay, deposits[lenders[bond][i]][bond][collateral]));
            }
        } 
    }

    //claim rewards???

}













