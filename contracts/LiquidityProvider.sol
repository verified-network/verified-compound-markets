// Primary issue operator
// (c) Kallol Borah, 2021

//"SPDX-License-Identifier: UNLICENSED"

pragma solidity ^0.6.6;

import './sol6/IERC20.sol';

contract LiquidityProvider {

    struct token{
        address owner;
        uint amountOffered;
        uint amountDesired;
        uint minDesired;
    }

    // mapping offered token to matched token
    mapping(address => mapping(address => token)) internal mmtokens;

    address[] internal offeredTokens;

    // called by market maker and issuer for adding liquidity
    function make(address owned, uint offered, address tomatch, uint desired, uint min) external {
        require(IERC20(owned).balanceOf(msg.sender)>=offered, 'Offered amount is not in balance');        
        mmtokens[owned][tomatch].owner = msg.sender;
        mmtokens[owned][tomatch].amountDesired = desired;
        mmtokens[owned][tomatch].amountOffered = offered;
        mmtokens[owned][tomatch].minDesired = min;
        offeredTokens.push(owned);
        IERC20(owned).transferFrom(msg.sender, address(this), offered);
    }

    // called by issuer and market maker for removing liqudity
    function unmake(address owned, uint remove, address tomatch, uint desired, uint min) external {
        require(mmtokens[owned][tomatch].owner==msg.sender &&
                mmtokens[owned][tomatch].amountOffered >= remove, 'Amount to remove is not available');
        mmtokens[owned][tomatch].amountOffered = mmtokens[owned][tomatch].amountOffered - remove;
        mmtokens[owned][tomatch].amountDesired = desired;
        mmtokens[owned][tomatch].minDesired = min;
        IERC20(owned).transferFrom(address(this), msg.sender, remove);
    }    

}

