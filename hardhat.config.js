require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  paths: {
    artifacts: "./frontend/src/artifacts",
  },
  networks: {
    hardhat: {
      chainId: 1337,
      mining: {
        auto: true,
        interval: 1000,
      },
      accounts: [
        {
          privateKey:
            "7fcb05201b117c0019e2cfaed9db96bdb2ac468c8374e1412ab4b8bc1a17d965",
          balance: "10000000000000000000000",
        },
      ],
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.TEST_ETH_ACCOUNT_PRIVATE_KEY !== undefined
          ? [process.env.TEST_ETH_ACCOUNT_PRIVATE_KEY]
          : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
