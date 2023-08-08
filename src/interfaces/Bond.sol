// (c) Kallol Borah, 2020
// Interface definition of the Verified bond token.
// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;
pragma experimental ABIEncoderV2;

interface Bond {

    //a Verified bond has some value, corresponds to a fiat currency
    //can have many purchasers and a issuer that have agreed to a zero coupon rate which determines the start price of the bond
    //and a tenure in unix timestamps of seconds counted from 1970-01-01. Verified bonds are of one year tenure.
    struct bond{
        uint256 parValue;               //face value of bond issued or purchased in the bond's currency        
        uint256 paidInAmount;           //amount paid in as collateral for issue of bond or as payment for purchase of bond
        bytes32 paidInCurrency;         //currency denomination of collateral for issue or payment for purchase of bond
        uint256 timeIssuedOrSubscribed; //time of bond issue or subscription
        uint256 purchasedIssueAmount;   //amount purchased at price of bond for paidInCurrency
        address[] counterParties;
    }

    function transferForward(address _sender, address _receiver, uint256 _tokens, address _forwarder) external returns (bool);

    function requestIssue(uint256 amount, address payer, bytes32 currency, address cashContract) external returns(bool);

    function requestPurchase(uint256 amount, address payer, bytes32 currency, address cashContract) external returns(bool);

    function requestRedemption(uint256 amount, address payer, bytes32 currency, address tokenContract) external returns(bool);
    
    function getBonds() external view returns(address[] memory);

    function getBondIssues(address issuer, address bondToken) external view returns(uint256, uint256, uint256, bytes32, uint256);

    function getBondPurchases(address issuer, address bondToken) external view returns(uint256, uint256, bytes32, uint256);

}