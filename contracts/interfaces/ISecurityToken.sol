// (c) Kallol Borah, 2020
// Interface of the Security token on Mainnet.
// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import '../sol6/IERC20.sol';

interface ISecurityToken is IERC20 {

    function subscribe(address subscriber, uint256 subscription) external;

    function isToken(address from, bytes32 isin) external view returns(bool);

    function addToBalance(bytes32 isin, bytes16 amount, address tokenHolder, bytes32 currency) external;

    function transferBalance(bytes32 isin, address transferor, bytes16 amount, address transferee, bytes32 currency) external;
}