// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.15;

interface Fauceteer {
    /* errors */
    error BalanceTooLow();
    error RequestedTooFrequently();
    error TransferFailed();

    function drip(address token) external;
}
