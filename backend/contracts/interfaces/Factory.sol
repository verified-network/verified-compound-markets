// (c) Kallol Borah, 2020
// Interface definition of the Via cash and bond factory.
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

interface Factory{

    function getCurrencyToken(bytes32 _currency) external view returns(address);

    function getBondTerm(address _bondToken) external view returns(uint256);
}