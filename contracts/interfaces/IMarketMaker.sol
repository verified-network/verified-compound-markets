// Verified Asset manager interface for Kyber security token pool
// (c) Kallol Borah, Verified Network, 2021

//"SPDX-License-Identifier: MIT"

pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

interface IMarketMaker {

    // a token contributed to the primary issue pool has an 'owner' which could be the tokenized securities issuer or market maker
    // the token contributor offers the 'amountOffered' of the token, the 'offered' token could be the security issued or the settlement token (eg, stablecoin) it is paired with
    // the token contributor specifies the 'amountDesired' of the liquidity token that is paired to the offered token 
    // if the token contributor is a securities issuer, it specifies the 'min' size of an investor's or market maker's bid for security tokens offered
    // if the token contributor is a market maker, it specifies the 'min' size of an issuer's offer for settlement tokens bid for the issuer's offer 
    // isin is the security token identifier
    struct token{
        address owner;
        address offered;
        uint amountOffered;
        uint amountDesired;
        uint min;
        bytes32 isin;
    }

    struct lp{
        address owner;
        address tokenOffered;
        uint underwritten;
        uint subscribed;
        uint earned;
    }

    struct subscriptions{
        address investor;
        address asset;
        string name;
        uint256 amount;   
        uint256 price;     
    }
    
    function offer(address owned, bytes32 isin, uint offered, address tomatch, uint desired, uint min, address issuer) external; //, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

    function getOffered(address offered) external view returns(token[] memory);

    function issue(address security, uint256 cutoffTime, address issuer, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

    function subscribe(bytes32 poolId, address security, address assetIn, string calldata assetName, uint256 amount, address investor, uint256 price, bool paidIn) external;

    function close(address security, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external; //returns(bytes32[] memory, bool);

    function getSubscribers(bytes32 poolId, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external returns(subscriptions[] memory);

    function accept(bytes32 poolId, address investor, uint256 amount, address asset, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

    function reject(bytes32 poolId, address investor, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

    function settle(bytes32 poolId, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

    function getLiquidityProviders(address _security/*, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s*/) external returns(lp[] memory);

    function stake(uint256 amount, address manager) external;

    function getAllotedStake() external view returns(uint256);

    function getOfferMade(address _owned, address _tomatch) external view returns(token[] memory);

    function getOwner() external view returns(address);

}