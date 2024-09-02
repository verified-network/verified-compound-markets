const HDWalletProvider = require("@truffle/hdwallet-provider");

const fs = require("fs");
const mnemonic = fs.readFileSync(".secret").toString().trim();

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)
      websockets: true,
      gas: 6721975,
    },
    bsc: {
      provider: () =>
        new HDWalletProvider(mnemonic, `https://bsc-dataseed1.binance.org`),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    gnosis: {
      provider: () =>
        new HDWalletProvider(mnemonic, "https://rpc.gnosischain.com"),
      network_id: 100,
      gas: 6721975,
      gasPrice: 10000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    chiado: {
      provider: () =>
        new HDWalletProvider(mnemonic, "https://rpc.chiadochain.net"),
      network_id: 10200,
      gas: 500000,
      gasPrice: 1000000000,
    },
    goerli: {
      //provider: () => new HDWalletProvider(mnemonic, "wss://eth-kovan.alchemyapi.io/v2/yCwExvTCIvYy2IfvGTEvvkP0w7QHz4Yf"),
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          "wss://goerli.infura.io/ws/v3/8151436a27dd4cdab264fa3ebf60a090"
        ), //test
      network_id: 5,
      gas: 6721975,
      gasPrice: 10000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider(mnemonic, "https://rpc2.sepolia.org"), //test
      network_id: 11155111,
      //gas: 6721975,
      //gasPrice: 10000000000,
      networkCheckTimeout: 999999,
      // confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    polygon: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          "wss://polygon-mainnet.infura.io/ws/v3/2bdfb8680f2443d09420292049546e60"
        ),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    mumbai: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          "wss://polygon-mumbai.infura.io/ws/v3/2bdfb8680f2443d09420292049546e60"
        ), //test
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    // main ethereum network(mainnet)
    main: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          "https://mainnet.infura.io/v3/f77b6dfe988c484595d679cd2ca13f80"
        ),
      network_id: 1,
      gas: 6721975,
      gasPrice: 10000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    baseSepolia: {
      // provider: () =>
      //   new HDWalletProvider(mnemonic, "wss://base-sepolia-rpc.publicnode.com"),
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          "wss://base-sepolia.blastapi.io/dad6747f-f25d-42cb-bd8d-5f93f0962ac2"
        ),
      network_id: 84532,
      // confirmations: 2,
      // timeoutBlocks: 2000,
      // skipDryRun: true,
      networkCheckTimeout: 999999,
    },
  },
  compilers: {
    solc: {
      version: "0.8.16",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  // mocha: {
  //   reporter: "eth-gas-reporter",
  //   reporterOptions: {
  //     currency: "USD",
  //     coinmarketcap: "ffcb2325-818c-4d4d-9f38-ca5973a5f5ad",
  //     //gasPrice : 5,
  //     showTimeSpent: true,
  //     excludeContracts: ["Migrations"],
  //     src: "contracts",
  //     url: "http://localhost:8545",
  //     //outputFile : 'gas-report.txt'
  //     showMethodSig: false,
  //     onlyCalledMethods: true,
  //   },
  // },
};
