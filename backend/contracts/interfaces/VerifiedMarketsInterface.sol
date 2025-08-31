// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

interface RWA {

    struct Asset {
        address bond;
        uint256 apy;
        string issuingDocs;
        uint256 faceValue;
        uint256 tenure;
        uint256 borrowed;
    }

    struct Collateral {
        address collateral;
        uint256 collateralAmount;
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

    function repayBase(address asset, uint256 amount, address issuer, address factory) external;
}
