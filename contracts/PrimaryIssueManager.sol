// Verified asset manager
// (c) Kallol Borah, Verified Network, 2021

//"SPDX-License-Identifier: UNLICENSED"

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/VerifiedClient.sol";
import "./interfaces/IMarketMaker.sol";
import "./interfaces/ILiquidity.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/ISecurity.sol";

import "./dmm/DMMFactory.sol";
import "./dmm/periphery/DMMRouter02.sol";

contract PrimaryIssueManager is IMarketMaker, Ownable{

    using SafeMath for uint256;

    uint256 swapFeePercentage=0;

    // DMM references
    DMMFactory dmmfactory;
    DMMRouter02 dmmrouter;
    
    // modifiers
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
        uint minRatio;
        uint maxRatio;
        uint desiredSecurity;
        uint desiredCash;
        uint minimumSecurity;
        uint minimumCash;
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
        address issuer;
        bytes32[] pools;        
        address[] currency;
    }

    // mapping security to new issues in the primary issue pool
    mapping(address => primary) internal issues;

    // mapping primary issue pool id to subscribers that swap in assets into pool
    mapping(bytes32 => subscriptions[]) internal investors; 

    // mapping primary issue pool id to subscriber and its position in the list of subscribers to the pool
    mapping(bytes32 => mapping(address => uint256)) private subscriberIndex;

    // mapping pool id to asset to subscription amounts
    mapping(bytes32 => mapping(address => uint256)) private subscribed;

    // mapping security and cash address to pool address
    mapping(address => mapping(address => address)) private pools;

    // liquidity pool tokens
    struct liquidityToken{
        uint256 providedSecurity;
        uint256 providedCurrency;
        uint256 acquiredLiquidityTokens;
    }

    // mapping security and cash address to liquidity pool tokens
    mapping(address => mapping(address => liquidityToken)) private poolTokens;

    // mapping pool id to security token offered
    mapping(bytes32 => address) private poolSecurity;

    // reference to the Verified factory contract that this asset manager checks security token issues with
    IFactory products;

    // reference to the Verified Client contract
    VerifiedClient client;

    // reference to the Verified Liquidity contract that provides liquidity (ie, VITTA) to the asset manager to underwrite investments in tokenized securities
    address private LiquidityContract;

    // LP token allotted
    mapping(address => mapping(address => uint256)) private LPTokenAllotted;

    //mutex
    bool lock;

    //bridge
    address bridge;

    event marketmakers(address security, address platform, lp[] providers);
    event subscribers(address security, address platform, bytes32 poolId, subscriptions[] investors);
    event platforms(address platform);
    event closures(address security, bytes32[] pools, bool close, address platform);

    /**
        Initializes this asset management contract
        @param  _swapFeePercentage  percentage of trading fee to be charged by the asset manager
        @param  _products           reference to the Verified Products contract that this contract reports created primary issue pools to
     */
    function initialize(address _dmmfactory, address payable _dmmrouter, uint256 _swapFeePercentage, address _products, address _liquidity, address _client, address _bridge) onlyOwner public {
        dmmfactory = DMMFactory(_dmmfactory);
        dmmrouter = DMMRouter02(_dmmrouter);
        swapFeePercentage = _swapFeePercentage;
        products = IFactory(_products);        
        client = VerifiedClient(_client);
        LiquidityContract = _liquidity;
        bridge = _bridge;
        emit platforms(address(this));
    }

    function setSigner(address _signer) onlyOwner external{
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
            if(ERC20(owned).balanceOf(msg.sender)>=offered && LPTokenAllotted[msg.sender][owned]>=offered){                 
                ERC20(owned).transferFrom(msg.sender, address(this), offered);
                LPTokenAllotted[msg.sender][owned] = SafeMath.sub(LPTokenAllotted[msg.sender][owned], offered);
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
        Called by Liquidity token contract to stake tokens by investors
        @param  _amount     amount of tokens staked to provide liquidity for underwriting investments in tokenized securities
        @param  _token      address of token staked
        @param  _manager    address of asset manager
     */
    function stake(uint256 _amount, address _token, address _manager) override onlyLP(msg.sender) external {
        LPTokenAllotted[_manager][_token] = SafeMath.add(LPTokenAllotted[_manager][_token], _amount);
    }

    /**
        Gets liquidity allotted for asset manager (message sender)
        @param  _token  address of token allocated earlier to asset manager (message sender)
     */
    function getAllotedStake(address _token) override external view returns(uint256){
        return LPTokenAllotted[msg.sender][_token];
    }       
    
    /**
        Called by issuer of 'security' token to open an issue which will last till 'cutoffTime'
        @param  security    security offered to the primary issue pool
        @param  cutoffTime  time in milliseconds by when offer closes
     */
    function issue(address security, uint256 cutoffTime, address issuer, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        onIssue(security, cutoffTime, issuer);
    }

    function onIssue(address security, uint256 cutoffTime, address issuer) private {
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
                                        
                                        if(mmtokens[security][cash][0].min < qlTokens[security][cash].minimumSecurity  || 
                                            qlTokens[security][cash].minimumSecurity==0)
                                            qlTokens[security][cash].minimumSecurity = mmtokens[security][cash][0].min;

                                        if(mmtokens[cash][security][k].min < qlTokens[cash][security].minimumCash  || 
                                            qlTokens[cash][security].minimumCash==0)
                                            qlTokens[cash][security].minimumCash = mmtokens[cash][security][k].min;

                                        if(mmtokens[security][cash][0].amountOffered > qlTokens[security][cash].desiredSecurity  || 
                                            qlTokens[security][cash].desiredSecurity==0)
                                            qlTokens[security][cash].desiredSecurity = mmtokens[security][cash][0].amountOffered;

                                        if(mmtokens[cash][security][k].amountOffered > qlTokens[cash][security].desiredCash  || 
                                            qlTokens[cash][security].desiredCash==0)
                                            qlTokens[cash][security].desiredCash = mmtokens[cash][security][k].amountOffered;

                                        // find and store min price ratio
                                        if(SafeMath.div(mmtokens[security][cash][0].min,
                                            mmtokens[security][cash][0].amountOffered) < 
                                            qlTokens[security][cash].minRatio  || 
                                            qlTokens[security][cash].minRatio==0)
                                        {   
                                            qlTokens[security][cash].minRatio = 
                                                        SafeMath.div(mmtokens[security][cash][0].min,
                                                        mmtokens[security][cash][0].amountOffered);
                                        }
                                        
                                        // find and store max price ratio
                                        if(SafeMath.div(mmtokens[cash][security][k].amountOffered,
                                            mmtokens[cash][security][k].min) > 
                                            qlTokens[security][cash].maxRatio || 
                                            qlTokens[security][cash].maxRatio==0)
                                        {   
                                            qlTokens[security][cash].maxRatio = 
                                                        SafeMath.div(mmtokens[cash][security][k].amountOffered,
                                                        mmtokens[cash][security][k].min);                                        
                                        }  
                                        
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
                uint32 amplitude = uint32(SafeMath.div(qlTokens[security][lptoken].maxRatio, qlTokens[security][lptoken].minRatio));
                address newIssue = dmmfactory.createPool(IERC20(security), IERC20(lptoken), amplitude);
                // store details of new pool created
                issues[security].issuer = mmtokens[security][lptoken][0].owner;
                issues[security].deadline = cutoffTime;
                issues[security].currency[issues[security].currency.length] = lptoken;
                issues[security].pools[issues[security].pools.length] = stringToBytes32(DMMPool(newIssue).name());
                pools[security][lptoken] = newIssue;
                poolSecurity[stringToBytes32(DMMPool(newIssue).name())] = security;
                // initialize the pool here
                IERC20[2] memory tokens = [IERC20(security), IERC20(lptoken)];
                uint256[5] memory amounts = [qlTokens[security][lptoken].desiredSecurity, qlTokens[security][lptoken].desiredCash,
                                            qlTokens[security][lptoken].minimumSecurity, qlTokens[security][lptoken].minimumCash, cutoffTime];
                uint256[3] memory lpt = [poolTokens[security][lptoken].providedSecurity, poolTokens[security][lptoken].providedCurrency, poolTokens[security][lptoken].acquiredLiquidityTokens];
                (lpt[0], lpt[1], lpt[2]) =  dmmrouter.addLiquidityNewPool(  
                                                tokens[0], 
                                                tokens[1], 
                                                amplitude, 
                                                amounts[0],
                                                amounts[1],
                                                amounts[2],
                                                amounts[3], 
                                                address(this), 
                                                amounts[4]
                                            );                                        
                delete qlTokens[security][lptoken];
            }
            delete pairedTokens[security];
        }
    }

    // called by bridge when assets are swapped in by investors against security tokens issued
    function onSubscription(address pool, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external returns(address, address, string memory){
        require(ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encode(_hashedMessage, "L2toL1")))), _v, _r, _s)== bridge);
        address security = poolSecurity[stringToBytes32(DMMPool(pool).name())];
        for(uint256 i=0; i<issues[security].currency.length; i++){
            if(pools[security][issues[security].currency[i]]==pool)
                return (security, issues[security].currency[i], ERC20(issues[security].currency[i]).name());
        }
    }

    function subscribe(address security, address asset, string calldata assetName, uint256 amount, address investor, uint256 price, bool paidIn, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        require(ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encode(_hashedMessage, "L2toL1")))), _v, _r, _s)== bridge);
        bytes32 poolId = stringToBytes32(DMMPool(pools[security][asset]).name());
        investors[poolId].push(IMarketMaker.subscriptions(investor, asset, assetName, amount, price));
        if(subscriberIndex[poolId][investor]==0)
            subscriberIndex[poolId][investor] = investors[poolId].length;
        if(paidIn)
            subscribed[poolId][asset] = SafeMath.add(subscribed[poolId][asset], amount);
        else
            subscribed[poolId][asset] = SafeMath.sub(subscribed[poolId][asset], amount);
    }

    /**
        Called by issuer to close subscription of 'security' issued by it
        @param  security    address of security token
    */  
    function close(address security, bool redeem, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external returns(bytes32[] memory, bool) {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        return onClose(security, redeem);
    }

    function onClose(address security, bool redeem) private returns(bytes32[] memory, bool){
        if(redeem){
            for(uint256 i=0; i<issues[security].pools.length; i++){                      
                dmmrouter.removeLiquidity(  IERC20(security), 
                                            IERC20(issues[security].currency[i]), 
                                            pools[security][issues[security].currency[i]],   
                                            poolTokens[security][issues[security].currency[i]].acquiredLiquidityTokens, 
                                            poolTokens[security][issues[security].currency[i]].providedSecurity, 
                                            poolTokens[security][issues[security].currency[i]].providedCurrency,
                                            address(this), 
                                            block.timestamp);
            }  
        }   
        if(block.timestamp > issues[security].deadline){              
            emit closures(security, issues[security].pools, true, address(this));
            return (issues[security].pools, true);
        }
        else{
            emit closures(security, issues[security].pools, false, address(this)); 
            return (issues[security].pools, false);
        }     
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
        Called by issuer to accept subscription to issue by investor
        @param  poolid      identifier of primary issue pool in which subscription is made by investor
        @param  investor    address of investor (subscriber)
        @param  amnt        amount of investment (subscription capital) accepted by issuer for which allotment of security tokens are made to investor
        @param  asset       address of asset which is used by investor to subscribe to the issue
     */
    function accept(bytes32 poolid, address investor, uint256 amnt, address asset, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        onAccept(poolid, investor, amnt, asset);
    }
     
    function onAccept(bytes32 poolid, address investor, uint256 amnt, address asset) private {
        uint256 i = subscriberIndex[poolid][investor];
        require(i>0, "No subscriber found for allotment");
        // transfer subscriptions for allotments to asset manager for asset subscribed with
        address issued = poolSecurity[poolid];
        // refund balance to investors
        if(investors[poolid][i-1].amount > amnt){
            IERC20(asset).transfer(investor, SafeMath.sub(investors[poolid][i-1].amount, amnt));
            IERC20(poolSecurity[poolid]).transferFrom(investor, address(this), 
                SafeMath.mul(IERC20(poolSecurity[poolid]).balanceOf(investor), SafeMath.div(amnt, investors[poolid][i-1].amount)));
        }
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
        }
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
            IERC20(poolSecurity[poolid]).transferFrom(investor, address(this), IERC20(poolSecurity[poolid]).balanceOf(investor));
            IERC20(investors[poolid][i-1].asset).transfer(investor, investors[poolid][i-1].amount);
        }
    }    

    /**
        Called by product issuer to settle distribution of fee income arising from investment underwritten in the primary issue pool
        @param  poolId  identifier for primary issue pool
     */  
    function settle(bytes32 poolId, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        onSettle(poolId);
    }

    function onSettle(bytes32 poolId) private {
        uint256 totalLiquidityProvided = totalUnderwritten[poolSecurity[poolId]];
        uint256 underwritingFee = SafeMath.mul(totalLiquidityProvided, swapFeePercentage);
        uint256 prorataLiquidityProvided =0;
        for(uint i=0; i<liquidityProviders[poolSecurity[poolId]].length; i++){
            prorataLiquidityProvided = liquidityProviders[poolSecurity[poolId]][i].underwritten / totalLiquidityProvided;
            ILiquidity(LiquidityContract).distribute(SafeMath.mul(underwritingFee, prorataLiquidityProvided), 
                                                    liquidityProviders[poolSecurity[poolId]][i].tokenOffered,
                                                    liquidityProviders[poolSecurity[poolId]][i].owner);
            liquidityProviders[poolSecurity[poolId]][i].earned = SafeMath.add(liquidityProviders[poolSecurity[poolId]][i].earned,
                                                                    SafeMath.mul(underwritingFee, prorataLiquidityProvided));
        }
        delete investors[poolId];   
    }   

    function getOwner() override external view returns(address){
        return owner();
    }

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }
   
}