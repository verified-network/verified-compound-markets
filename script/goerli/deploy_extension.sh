#!/bin/bash

set -exo pipefail

if [ -n "$ETHEREUM_PK" ]; then
  wallet_args="--private-key $ETHEREUM_PK"
else
  wallet_args="--unlocked"
fi

if [ -n "$RPC_URL" ]; then
  rpc_args="--rpc-url $RPC_URL"
else
  rpc_args=""
fi

if [ -n "$ETHERSCAN_API_KEY" ]; then
  etherscan_args="--verify --etherscan-api-key $ETHERSCAN_API_KEY"
else
  etherscan_args=""
fi

# Constructor Variables
#
# MyCometExtension::constructor(
#   comet_ :: The Comet Ethereum mainnet USDC contract.
# )
#
comet="0x38371Dc317aa0E48c819716B72345a5c5a8D3aFA"

forge create \
  $rpc_args \
  $etherscan_args \
  $wallet_args \
  $@ \
  src/VerifiedMarkets.sol:VerifiedMarkets \
  --constructor-args \
    "$comet"
