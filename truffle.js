var HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    hdwallet: {
      provider: new HDWalletProvider(process.env.MNEMONIC,
        "https://rinkeby.infura.io/"+process.env.INFURA_KEY),
      network_id: 3
    },
    rinkeby: {
      host: "localhost",
      from: "0x0",
      port: 8545,
      network_id: 4,
      gas: 4612388
    }
  }
};
