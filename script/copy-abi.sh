#!/bin/bash

set -x

out_file="./abis/MyCometExtension.ts"
echo -n "export default " > "$out_file"
cat ./out/MyCometExtension.sol/MyCometExtension.json | jq -rj '.abi' >> "$out_file"
echo -n " as const;" >> "$out_file"
