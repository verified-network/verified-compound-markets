// Uniswap dealer interface
// (c) Kallol Borah, 2021

//"SPDX-License-Identifier: UNLICENSED"

pragma solidity 0.6.6;

interface IExchange {

    function make(address owned, uint offered, address tomatch, uint desired, uint min) external;

    function unmake(address owned, uint remove, address tomatch, uint desired, uint min) external;

    function issue(address security) external;

    function register(address security) external;

}