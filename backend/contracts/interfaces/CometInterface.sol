// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

import "./CometMainInterface.sol";
import "./CometExtInterface.sol";

/**
 * @title Compound's Comet Interface
 * @notice An efficient monolithic money market protocol
 * @author Compound
 */
abstract contract Comet is CometMainInterface, CometExtInterface {}
