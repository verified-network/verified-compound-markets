//(c) Kallol Borah, 2022
// Interface for L1 security token

//"SPDX-License-Identifier: MIT"

pragma solidity 0.6.6;

import '../sol6/IERC20.sol';

interface ISecurity is IERC20{

    function transferToken(address transferor, address transferee, uint256 amount) external;

    function mintToken(address issuer, uint256 amount) external;

    function approveToken(address owner, address spender, uint256 amount, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

}