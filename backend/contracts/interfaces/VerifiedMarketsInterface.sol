// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

interface RWA {

    struct Asset {
        address bond;
        uint256 apy;
        string issuingDocs;
        uint256 couponFrequency;
        uint256 tenure;
        uint256 borrowed;
    }

    struct Collateral {
        address collateral;
        uint256 collateralAmount;
    }

    struct BalanceSnapshot {
        uint256 timestamp;
        uint256 balance; // base token balance
    }

    function submitNewRWA(
        address asset,
        address bond,
        uint256 apy,
        string memory issuingDocs,
        uint256 faceValue,
        uint256 tenure
    ) external;

    function postCollateral(
        address bond,
        address issuer
    ) external;

    function borrowBase(address asset) external;

    function repayBase(address asset, uint256 amount) external;

    function repayLenders(address asset) external;

    function withdrawCollateral(address bond, address issuer, address factory) external;
}
