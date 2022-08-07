// Verified asset manager
// (c) Kallol Borah, Verified Network, 2021

//"SPDX-License-Identifier: UNLICENSED"

pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import './sol6/IERC20.sol';
import './sol6/utils/zeppelin/SafeERC20.sol';
import "./sol6/utils/zeppelin/SafeMath.sol";

import './interfaces/IPrimaryIssuePool.sol';
import './interfaces/VerifiedClient.sol';
import './interfaces/IMarketMaker.sol';
import './interfaces/ILiquidity.sol';
import './interfaces/IFactory.sol';
import './interfaces/ISecurity.sol';

contract PrimaryIssueManager is IMarketMaker{

    using SafeMath for uint256;

    uint256 swapFeePercentage=0;
    address deployer;

    // modifiers
    modifier onlyOwner(address caller) {
        require(caller==deployer);
        _;
    }

    modifier onlyPool(bytes32 poolId, address security) {
        //require(poolId == IPrimaryIssuePool(security).getPoolId());
        _;
    }

    modifier onlyLP(address sender) {
        //require(sender==LiquidityContract);
        _;
    }

    modifier onlyAssetManager(address sender){
        //(bytes32 role, ) = client.getRole(sender);
        //require(role=='AM');
        _;
    }

    // list of offered tokens
    address[] internal offeredTokens;

    // mapping token offered to its position in the list of offered tokens
    mapping(address => uint256) private offeredTokenIndex;

    // list of tokens to match
    mapping(address => token[]) internal toMatchTokens;

    // mapping offered token (eg, security token) to a token to match (eg, settlement token)
    mapping(address => mapping(address => token[])) internal mmtokens;

    // mapping offered token (ie security token) to its paired token 
    mapping(address => address[]) internal pairedTokens;

    // mapping liqudity token to its position in the list of liquidity tokens
    mapping(address => mapping(address => uint256)) private pairedTokenIndex;

    struct liquidity{
        uint minPrice;
        uint maxPrice;
        uint amountIssued;
        uint amountOffered;
    }

    // mapping qualified liquidity token to its price and amount offered by market makers (LPs)
    mapping(address => mapping(address => liquidity)) internal qlTokens;

    // mapping security to liquidity providers
    mapping(address => lp[]) private liquidityProviders;

    // mapping securities issued in the primary issue pool to total liquidity offered
    mapping(address => uint256) private totalUnderwritten;

    // mapping pool ids to LPs to the amounts of liquidity they offer
    mapping(bytes32 => mapping(address => uint256)) private underwriters;

    // components of a primary issue of a security token
    struct primary{
        uint256 deadline;
        uint256 startTime;
        bytes32[] pools;
        address issuer;
    }

    // mapping security to new issues in the primary issue pool
    mapping(address => primary) internal issues;

    // mapping primary issue pool id to subscribers that swap in assets into pool
    mapping(bytes32 => subscriptions[]) internal investors; 

    // mapping primary issue pool id to subscriber and its position in the list of subscribers to the pool
    mapping(bytes32 => mapping(address => uint256)) private subscriberIndex;

    // mapping pool id to asset to subscription amounts
    mapping(bytes32 => mapping(address => uint256)) private subscribed;

    // mapping pool id to pool address
    mapping(bytes32 => address) private pools;

    // mapping pool id to security token offered
    mapping(bytes32 => address) private poolSecurity;

    // reference to the Verified factory contract that this asset manager checks security token issues with
    IFactory products;

    // reference to the Verified Client contract
    VerifiedClient client;

    // reference to the Verified Liquidity contract that provides liquidity (ie, VITTA) to the asset manager to underwrite investments in tokenized securities
    address private LiquidityContract;
    
    // LP token staked
    uint256 private LPTokenStaked;

    // LP token allotted
    mapping(address => uint256) private LPTokenAllotted;

    //mutex
    bool lock;

    //bridge
    address bridge;

    event marketmakers(address security, address platform, lp[] providers);
    event subscribers(address security, address platform, bytes32 poolId, subscriptions[] investors);
    event platforms(address platform);
    event onClose(address security, bytes32[] pools, bool close, address platform);

    /**
        Initializes this asset management contract
        @param  _swapFeePercentage  percentage of trading fee to be charged by the asset manager
        @param  _products           reference to the Verified Products contract that this contract reports created primary issue pools to
     */
    function initialize(uint256 _swapFeePercentage, address _products, address _liquidity, address _client, address _bridge) public {
        deployer = msg.sender;
        swapFeePercentage = _swapFeePercentage;
        products = IFactory(_products);
        emit platforms(address(this));
        client = VerifiedClient(_client);
        LiquidityContract = _liquidity;
        bridge = _bridge;
    }

    function setSigner(address _signer) onlyOwner(msg.sender) external{
        bridge = _signer;
    }

    /*function offer(address owned, bytes32 isin, uint offered, address tomatch, uint desired, uint min, address issuer, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external{
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        makeOffer(owned, isin, offered, tomatch, desired, min, issuer);
    }*/
    
    /**
        Called by market maker and issuer for adding liquidity
        @param  owned       is the security or settlement token on offer 
        @param  offered     is the amount offered
        @param  tomatch     is the liquidity token that is required to be paired
        @param  desired     is the amount required of the liquidity token to be paired
        @param  min         is the minimum amount to be swapped of the 'offered' token 
        @param  isin        is the identifier for the security token offered
        @param  owner       is the current holder of the owned token that is offered
     */ 
    function offer(address owned, bytes32 isin, uint offered, address tomatch, uint desired, uint min, address owner) override external {
        require(!lock);
        lock = true;
        (bytes32 role, ) = client.getRole(msg.sender);
        require(products.checkProduct(owned)==true || role=='AM');
        if(role=="AM"){
            if(ERC20(owned).balanceOf(msg.sender)>=offered){                 
                ERC20(owned).transferFrom(msg.sender, address(this), offered);
                make(msg.sender, owned, isin, offered, tomatch, desired, min); 
            }
        }
        else if(ERC20(owned).balanceOf(owner)>=offered){             
            ERC20(owned).transferFrom(owner, address(this), offered);
            make(owner, owned, isin, offered, tomatch, desired, min); 
        }
        lock = false;
    }

    function make(address _owner, address owned, bytes32 _isin, uint _offered, address tomatch, uint _desired, uint _min) private {
        IMarketMaker.token memory t = IMarketMaker.token({
            owner: _owner,
            offered: owned,
            amountDesired: _desired,
            amountOffered: _offered,
            min: _min,
            isin: _isin
        });
        uint256 index = mmtokens[owned][tomatch].length;
        mmtokens[owned][tomatch].push(t);
        if(offeredTokenIndex[owned]==0){
            offeredTokens.push(owned);
            offeredTokenIndex[owned] = offeredTokens.length;
        }
        toMatchTokens[tomatch].push(mmtokens[owned][tomatch][index]);                  
    }

    /**
        Gets tokens to match for offered token
        @param  offered address of offered token
     */
    function getOffered(address offered) override onlyAssetManager(msg.sender) external view returns(IMarketMaker.token[] memory){
        return toMatchTokens[offered];
    }

    /**
        Gets offer made previously
        @param  _owned      address of token offered
        @param  _tomatch    address of token to match
     */
    function getOfferMade(address _owned, address _tomatch) override onlyAssetManager(msg.sender) external view returns(IMarketMaker.token[] memory){
        return mmtokens[_owned][_tomatch];
    }

    /**
        Fetches liquidity providers for a security token
        @param  _security   identifier for the security token offered
     */
    function getLiquidityProviders(address _security) override external returns(lp[] memory){
        emit marketmakers(_security, address(this), liquidityProviders[_security]);
        return liquidityProviders[_security];
    }

    /**
        Called by Liquidity token contract to stake liquidity tokens by investors in VITTA
        @param  amount  amount of VITTA staked to provide liquidity for underwriting investments in tokenized securities
     */
    function stake(uint256 amount, address manager) override onlyLP(msg.sender) external {
        LPTokenStaked = SafeMath.add(LPTokenStaked, amount);
        LPTokenAllotted[manager] = SafeMath.add(LPTokenAllotted[manager], amount);
    }

    /**
        Gets liquidity allotted for asset manager (message sender)
     */
    function getAllotedStake() override external view returns(uint256){
        return LPTokenAllotted[msg.sender];
    }

    function issue(address security, uint256 cutoffTime, address issuer, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        requestIssue(security, cutoffTime, issuer);
    }
    
    /**
        Called by issuer of 'security' token to open an issue which will last till 'cutoffTime'
        @param  security    security offered to the primary issue pool
        @param  cutoffTime  time in milliseconds by when offer closes
     */
    function requestIssue(address security, uint256 cutoffTime, address issuer) private {
        // check if security to be issued has been offered by the issuer, and if yes, initialize the issuance
        uint i = offeredTokenIndex[security]-1;
        address cash;
        if(offeredTokens[i]==security){            
            
            // check all offered securities that is not the security to be issued
            for(uint j=0; j<offeredTokens.length; j++){
                if(offeredTokens[j]!=security){
                    cash = offeredTokens[j];

                    // check if the request to issue has come from the issuer
                    if(mmtokens[security][cash][0].owner == issuer){
                        
                        for(uint k=0; k<mmtokens[cash][security].length; k++){

                            // find tokens offered against security to be issued
                            if(mmtokens[security][cash][0].amountOffered!=0){
                                if(mmtokens[cash][security][k].amountOffered!=0){
                                             
                                    // if min offer price for security issued is greater than price desired by market maker (LP)
                                    if( SafeMath.div(mmtokens[security][cash][0].min,
                                        mmtokens[security][cash][0].amountOffered) >=
                                        SafeMath.div(mmtokens[cash][security][k].amountOffered,
                                        mmtokens[cash][security][k].amountDesired))
                                    {    
                                        // store liquidity tokens    
                                        if(pairedTokenIndex[security][cash]==0){
                                            pairedTokens[security].push(cash);
                                            pairedTokenIndex[security][cash] = pairedTokens[security].length;                                            
                                        }
                                        
                                        // find and store min price for token offered
                                        if(SafeMath.div(mmtokens[security][cash][0].min,
                                            mmtokens[security][cash][0].amountOffered) < 
                                            qlTokens[security][cash].minPrice  || 
                                            qlTokens[security][cash].minPrice==0)
                                        {   
                                            qlTokens[security][cash].minPrice = 
                                                        SafeMath.div(mmtokens[security][cash][0].min,
                                                        mmtokens[security][cash][0].amountOffered);
                                        }
                                        
                                        // find and store max price for token offered
                                        if(SafeMath.div(mmtokens[cash][security][k].amountOffered,
                                            mmtokens[cash][security][k].min) > 
                                            qlTokens[security][cash].maxPrice)
                                        {   
                                            qlTokens[security][cash].maxPrice = 
                                                        SafeMath.div(mmtokens[cash][security][k].amountOffered,
                                                        mmtokens[cash][security][k].min);                                        
                                        }  
                                        
                                        qlTokens[security][cash].amountIssued = 
                                                        SafeMath.add(qlTokens[security][cash].amountIssued,
                                                        mmtokens[security][cash][0].amountOffered);
                                        qlTokens[security][cash].amountOffered = 
                                                        SafeMath.add(qlTokens[security][cash].amountOffered,
                                                        mmtokens[cash][security][k].amountOffered); 

                                        // store qualified liquidity provider info
                                        lp memory provider = lp({
                                            owner : mmtokens[cash][security][k].owner,
                                            tokenOffered : cash,
                                            underwritten : mmtokens[cash][security][k].amountOffered,
                                            subscribed : 0,
                                            earned : 0
                                        });
                                        liquidityProviders[security].push(provider);  

                                        totalUnderwritten[security] = 
                                        SafeMath.add(totalUnderwritten[security], mmtokens[cash][security][k].amountOffered);
                                        
                                    }
                                }
                            }
                        }
                    }
                }
            }
            //create primary issue pool if it does not exist already
            for(uint x=0; x<pairedTokens[security].length; x++){
                address lptoken = pairedTokens[security][x];
                /*IPrimaryIssuePoolFactory.FactoryPoolParams memory poolparams = IPrimaryIssuePoolFactory.FactoryPoolParams({
                    security : security,
                    currency : lptoken,
                    minimumPrice : qlTokens[security][lptoken].minPrice,
                    basePrice : qlTokens[security][lptoken].maxPrice,
                    maxAmountsIn : qlTokens[security][lptoken].amountIssued,
                    issueFeePercentage : swapFeePercentage,
                    cutOffTime : cutoffTime
                });
                address newIssue = factory.create(poolparams);*/
                // store details of new pool created
                issues[security].issuer = mmtokens[security][lptoken][0].owner;
                issues[security].deadline = cutoffTime;
                issues[security].startTime = block.timestamp;
                /*bytes32 pool = IPrimaryIssuePool(newIssue).getPoolId();                
                issues[security].pools[issues[security].pools.length] = pool;
                pools[pool] = newIssue;
                poolSecurity[pool] = security;
                // initialize the pool here
                vault.setRelayerApproval(address(this), newIssue, true);
                IPrimaryIssuePool(newIssue).initialize();
                // take right to manage pool
                IVault.PoolBalanceOp[] memory ops = new IVault.PoolBalanceOp[](1);
                ops[0] = IVault.PoolBalanceOp({
                    kind: IVault.PoolBalanceOpKind.WITHDRAW,
                    poolId: pool,
                    token: IERC20(lptoken),
                    amount: qlTokens[security][lptoken].amountIssued
                });
                vault.managePoolBalance(ops);*/
                delete qlTokens[security][lptoken];
            }
            delete pairedTokens[security];
        }
    }

    // called by pool when assets are swapped in by investors against security tokens issued
    function subscribe(bytes32 poolId, address security, address asset, string calldata assetName, uint256 amount, address investor, uint256 price, bool paidIn) override onlyPool(poolId, security) external {
        investors[poolId].push(IMarketMaker.subscriptions(investor, asset, assetName, amount, price));
        if(subscriberIndex[poolId][investor]==0)
            subscriberIndex[poolId][investor] = investors[poolId].length;
        if(paidIn)
            subscribed[poolId][asset] = SafeMath.add(subscribed[poolId][asset], amount);
        else
            subscribed[poolId][asset] = SafeMath.sub(subscribed[poolId][asset], amount);
    }

    /**
        Fetches investors (subscribers) to a primary issue pool
        @param   poolId identifier for a primary issue pool for which subscribers are to be returned
     */
    function getSubscribers(bytes32 poolId, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external returns(subscriptions[] memory){
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        emit subscribers(poolSecurity[poolId], address(this), poolId, investors[poolId]);
        return investors[poolId];
    }

    /**
        Called by issuer to close subscription of 'security' issued by it
        @param  security    address of security token
     */  
    function close(address security, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {//returns(bytes32[] memory, bool) {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        if(block.timestamp > issues[security].deadline)
            //return (issues[security].pools, true);
            emit onClose(security, issues[security].pools, true, address(this));
        else
            //return (issues[security].pools, false);
            emit onClose(security, issues[security].pools, false, address(this));
    }

    function accept(bytes32 poolid, address investor, uint256 amnt, address asset, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        allot(poolid, investor, amnt, asset);
    }

    /**
        Called by issuer to accept subscription to issue by investor
        @param  poolid      identifier of primary issue pool in which subscription is made by investor
        @param  investor    address of investor (subscriber)
        @param  amnt        amount of investment (subscription capital) accepted by issuer for which allotment of security tokens are made to investor
        @param  asset       address of asset which is used by investor to subscribe to the issue
     */ 
    function allot(bytes32 poolid, address investor, uint256 amnt, address asset) private {
        uint256 invested = 0;
        uint256 i = subscriberIndex[poolid][investor];
        if(i>0)
            invested = SafeMath.add(invested, investors[poolid][i-1].amount);
        // transfer subscriptions for allotments to asset manager for asset subscribed with
        /*address issued = IPrimaryIssuePool(pools[poolid]).getSecurity();
        // refund balance to investors
        IERC20(asset).transfer(investor, SafeMath.sub(invested, amnt));
        for(i=0; i<liquidityProviders[issued].length; i++){
            if(liquidityProviders[issued][i].tokenOffered==asset && amnt!=0){
                uint256 proportionUnderwritten = liquidityProviders[issued][i].underwritten / totalUnderwritten[issued];
                uint256 prorataAmount = SafeMath.mul(proportionUnderwritten, subscribed[poolid][asset]);
                // transfer allotted amount to asset manager
                if(prorataAmount > amnt){
                    IERC20(asset).transfer(liquidityProviders[issued][i].owner, amnt);
                    SafeMath.add(liquidityProviders[issued][i].subscribed, amnt);
                    amnt = 0;
                }
                else{
                    IERC20(asset).transfer(liquidityProviders[issued][i].owner, prorataAmount);
                    SafeMath.add(liquidityProviders[issued][i].subscribed, prorataAmount);
                    amnt = SafeMath.sub(amnt, prorataAmount);
                }
            }
        }*/
    }

    /**
        Called by issuer to reject subscription to issue by investor
        @param  poolid      identifier for primary issue pool to which investor has subscribed
        @param  investor    address of investor (subscriber)
     */ 
    function reject(bytes32 poolid, address investor, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        uint256 i = subscriberIndex[poolid][investor];
        if(i>0){
            IERC20(investors[poolid][i-1].asset).transfer(investor, investors[poolid][i-1].amount);
        }
    }

    function settle(bytes32 poolId, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        settleIssue(poolId);
    }

    /**
        Called by product issuer to settle distribution of fee income arising from investment underwritten in the primary issue pool
        @param  poolId  identifier for primary issue pool
     */  
    function settleIssue(bytes32 poolId) private {
        //IPrimaryIssuePool(pools[poolId]).exit(); 
        uint256 totalLiquidityProvided = totalUnderwritten[poolSecurity[poolId]];
        uint256 underwritingFee = SafeMath.mul(totalLiquidityProvided, swapFeePercentage);
        uint256 prorataLiquidityProvided =0;
        for(uint i=0; i<liquidityProviders[poolSecurity[poolId]].length; i++){
            prorataLiquidityProvided = liquidityProviders[poolSecurity[poolId]][i].underwritten / totalLiquidityProvided;
            ILiquidity(LiquidityContract).distribute(SafeMath.mul(underwritingFee, prorataLiquidityProvided), 
                                                    liquidityProviders[poolSecurity[poolId]][i].tokenOffered,
                                                    liquidityProviders[poolSecurity[poolId]][i].owner);
        }
        delete investors[poolId];   
    }   

    function getOwner() override external view returns(address){
        return deployer;
    }
   
}