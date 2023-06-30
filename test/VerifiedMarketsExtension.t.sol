// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/VerifiedMarkets.sol";
import "forge-std/Test.sol";
import "./MainnetConstants.t.sol";

contract VerifiedMarketsTest is MainnetConstants {
    function testMyCometExtension() public {
        console.log("Deploying Verified Markets");
        VerifiedMarkets ext = deployVerifiedMarkets();
        console.log("Deployed Verified Markets", address(ext));
    }

    function deployVerifiedMarkets() internal returns (VerifiedMarkets) {
        return new VerifiedMarkets(
            comet
        );
    }
}
