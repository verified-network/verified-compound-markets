// Kyber dealer
// (c) Kallol Borah, 2021

//"SPDX-License-Identifier: UNLICENSED"

pragma solidity 0.6.6;

import './interfaces/ISecurityToken.sol';
import "./sol6/IKyberNetworkProxy.sol";
import "./sol6/IKyberHint.sol";
import "./sol6/IKyberStorage.sol";
import './LiquidityProvider.sol';

contract BalancerDealer is LiquidityProvider {

    // kyber accessors
    IKyberNetworkProxy kyberProxy;
    address payable admin;
    uint256 platformFeeBps;
    IKyberHint kyberHintHandler;
    IKyberStorage kyberStorage;

    IERC20 internal constant ETH_TOKEN_ADDRESS = IERC20(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    //mapping security to liquidity tokens
    mapping(address =>uint) liquidity;
    //mapping security to paired token
    mapping(address =>address) collateral;

    constructor(IKyberNetworkProxy _kyberProxy,
                address payable _platformWallet,
                uint256 _platformFeeBps) public {
        admin = _platformWallet;
        kyberProxy = _kyberProxy;
        platformFeeBps = _platformFeeBps;
    }

    //called by issuer or market maker
    function issue(address security) external {
        for(uint i=0; i<offeredTokens.length; i++){
            if(offeredTokens[i]==security){
                for(uint j=0; j<offeredTokens.length; j++){
                    if(offeredTokens[j]!=security){
                        if(mmtokens[offeredTokens[i]][offeredTokens[j]].amountOffered!=0){
                            if(mmtokens[offeredTokens[j]][offeredTokens[i]].amountOffered!=0){
                                if(mmtokens[offeredTokens[i]][offeredTokens[j]].amountDesired >= 
                                    mmtokens[offeredTokens[j]][offeredTokens[i]].minDesired &&
                                    mmtokens[offeredTokens[j]][offeredTokens[i]].amountDesired >= 
                                    mmtokens[offeredTokens[i]][offeredTokens[j]].minDesired){
                                        //addReserve
                                        
                                        collateral[offeredTokens[i]]=offeredTokens[j];
                                        //liquidity[offeredTokens[i]]=lp;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // called by investor to register security token in secondary pool
    function register(address security) external {
        uint subscription = ISecurityToken(security).balanceOf(address(this));
        //if allotments are available
        if(subscription>0){
            ISecurityToken(security).subscribe(msg.sender, subscription);
            withdraw(security, subscription);
        }
    }

    // called to withdraw LP tokens from reserves
    function withdraw(address security, uint amount) private {
        //getReserveIdsPerTokenSrc(IERC20 token)
        //getReserveIdsPerTokenDest(IERC20 token)
        //settle(security, securityAmount, collateral[security], collateralAmount);
        //IERC20(collateral[security]).transfer(mmtokens[security][collateral[security]].owner, collateralAmount);       
    }

    // called to allot secondary pool tokens to investor
    function settle(address security, address pairedToken, uint pairTokenAmount, uint ownership) private {
        uint staked = mmtokens[pairedToken][security].amountOffered * ownership;
        IERC20(pairedToken).transfer(mmtokens[security][pairedToken].owner, pairTokenAmount - staked);
        IERC20(pairedToken).transfer(mmtokens[pairedToken][security].owner, staked);    
    }

    function trade(address _sourceToken, address _targetToken, uint _amount) external payable returns(uint returnAmount) {
        if (IERC20(_sourceToken) != ETH_TOKEN_ADDRESS) {
            // check that the token transferFrom has succeeded
            // NOTE: msg.sender must have called srcToken.approve(thisContractAddress, srcQty)
            require(IERC20(_sourceToken).transferFrom(msg.sender, address(this), _amount), "transferFrom failed");

            // mitigate ERC20 Approve front-running attack, by initially setting
            // allowance to 0
            require(IERC20(_sourceToken).approve(address(kyberProxy), 0), "approval to 0 failed");

            // set the spender's token allowance to tokenQty
            require(IERC20(_sourceToken).approve(address(kyberProxy), _amount), "approval to srcQty failed");
        }
        uint256 expectedRate = kyberProxy.getExpectedRateAfterFee(
            IERC20(_sourceToken), 
            IERC20(_targetToken), 
            _amount, 
            platformFeeBps, // 25 means 0.25%
            '' // empty hint
        );
        uint256 actualDestAmount = kyberProxy.tradeWithHintAndFee(
            IERC20(_sourceToken), 
            _amount, 
            IERC20(_targetToken), 
            msg.sender, // destAddress
            (expectedRate*_amount), // maxDestAmount: arbitarily large to swap full amount
            expectedRate, // minConversionRate: value from getExpectedRate call
            admin, // platform wallet
            platformFeeBps, // 25 means 0.25%
            '' // empty hint
        );
    }
    
}