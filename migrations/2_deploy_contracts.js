const LotusPreSale = artifacts.require('./LotusPreSale.sol')
const LotusToken = artifacts.require('./LotusToken.sol')

const RATE = 12000 * (10 ** 18)
const START_TIME = process.env.PS_START_TIME
const END_TIME = process.env.PS_END_TIME
const WALLET = process.env.PS_WALLET

module.exports = function(deployer) {
  deployer.deploy(LotusToken);
  deployer.link(LotusToken, LotusPreSale);
  deployer.deploy(LotusPreSale, START_TIME, END_TIME, RATE, WALLET)
};
