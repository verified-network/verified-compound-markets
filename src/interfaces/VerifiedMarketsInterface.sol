// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface RWA{

    struct Asset{
        address bond;
        uint256 apy;
        string issuingDocs;
        uint256 faceValue;
    }

    struct Collateral{
        address collateral;
        uint256 collateralAmount;
        uint256 borrowed;
    }

    function submitNewRWA(address asset, address bond, uint256 apy, string memory issuingDocs, uint256 faceValue) external;

    function voteOnRWA(address asset, bool ballot) external;

    function postCollateral(address asset, address collateral, uint256 amount) external;

    function buyRWA(address asset, address bond, uint256 amount) external;

    function borrowBase(address base, uint256 amount) external;

    function repayBase(address base, uint256 amount) external;

    function redeeemRWA(address asset, address bond, uint256 amount) external;

    function sellRWA(address asset, address bond, uint256 amount) external;

}