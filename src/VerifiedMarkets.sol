// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./interfaces/CometInterface.sol";

/**
 * @title Verified Markets 
 * @notice A Compound III operator to enable staking of collateral for real world assets to Compound.
 * @author Kallol Borah
 */
contract VerifiedMarkets {
  /// @notice The Comet contract
  Comet public immutable comet;

  /**
   * @notice Construct a new operator.
   * @param comet_ The Comet contract.
   **/
  constructor(Comet comet_) payable {
    comet = comet_;
  }
  
}
