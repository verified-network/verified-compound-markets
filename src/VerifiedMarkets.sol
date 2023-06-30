// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import "./interfaces/CometInterface.sol";
import "./interfaces/VerifiedMarketsInterface.sol";

/**
 * @title Verified Markets 
 * @notice A Compound III operator to enable staking of collateral for real world assets to Compound.
 * @author Kallol Borah
 */
contract VerifiedMarkets is RWA{
  /// @notice The Comet contract
  Comet public immutable comet;

  /**
   * @notice Construct a new operator.
   * @param comet_ The Comet contract.
   **/
  constructor(Comet comet_) payable {
    comet = comet_;
  }

  function submitNewRWA(address asset, address bond, uint256 apy, string memory issuingDocs, uint256 faceValue) override external {

  }

  function voteOnRWA(address asset, bool ballot) override external {

  }

  function postCollateral(address asset, address collateral, uint256 amount) override external {

  }

  function buyRWA(address asset, address bond, uint256 amount) override external {

  }

  function borrowBase() override external {

  }

  function repayBase() override external {

  }

  function redeeemRWA(address asset, address bond, uint256 amount) override external {

  }

  function sellRWA(address asset, address bond, uint256 amount) override external {

  }

}
