// (c) Kallol Borah, 2020
// Interface definition of the Via bond token.
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;
pragma experimental ABIEncoderV2;

interface BondIssuer {

    function getBondIssues(address issuer, address bondToken) external view returns(uint256, uint256, uint256, bytes32, uint256);

    function getBondPurchases(address issuer, address bondToken) external view returns(uint256, uint256, bytes32, uint256);

}