require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * BlockDAG network config. Verify RPC + chain ID against the official docs
 * before deploying: https://docs.blockdagnetwork.io
 * Mainnet: chain ID 1404, RPC https://rpc.welshdag.trade (community RPC by WelshDAG)
 * Testnet (Awakening): chain ID 1043
 */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    bdagTestnet: {
      url: process.env.BDAG_TESTNET_RPC_URL || "https://rpc.awakening.bdagscan.com",
      chainId: 1043,
      accounts: process.env.BDAG_TESTNET_PRIVATE_KEY
        ? [process.env.BDAG_TESTNET_PRIVATE_KEY]
        : [],
    },
    bdagMainnet: {
      url: process.env.BDAG_MAINNET_RPC_URL || "https://rpc.welshdag.trade",
      chainId: 1404,
      accounts: process.env.BDAG_MAINNET_PRIVATE_KEY
        ? [process.env.BDAG_MAINNET_PRIVATE_KEY]
        : [],
    },
  },
};
