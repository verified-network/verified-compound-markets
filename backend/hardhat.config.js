require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");
const mnemonic = fs.readFileSync(".secret").toString().trim();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: "https://eth-sepolia.public.blastapi.io",
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
