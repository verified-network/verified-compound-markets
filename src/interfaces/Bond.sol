// (c) Kallol Borah, 2020
// Interface definition of the token issued by Bond issuer
// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

interface Bond{

    function getIssuer() external view returns(address);

    function transferToken(address sender, address receiver, uint256 tokens) external returns (bool);

    function reduceSupply(uint256 amount) external;

    function reduceBalance(address party, uint256 amount) external;

    function getBalance(address party) external returns(uint256);

    function addBalance(address party, uint256 amount) external;

    function addTotalSupply(uint256 amount) external;

    function requestTransfer(address receiver, uint256 tokens) external returns (bool);

    function requestTransaction(uint256 amount, address payer, bytes32 currency, address cashContract) external returns(bool);

}