var HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: new HDWalletProvider(process.env.MNEMONIC,
        "https://rinkeby.infura.io/"+process.env.INFURA_KEY),
      network_id: 3
    }
  }
};
