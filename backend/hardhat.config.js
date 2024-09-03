require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");
const mnemonic = fs.readFileSync(".secret").toString().trim();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: "https://rpc.sepolia.org",
      accounts: {
        mnemonic: mnemonic,
      },
      chainId: 11155111,
    },

    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: {
        mnemonic: mnemonic,
      },
      chainId: 84532,
      gasPrice: 10e7,
    },
  },

  mocha: {
    timeout: 500000,
  },
};
