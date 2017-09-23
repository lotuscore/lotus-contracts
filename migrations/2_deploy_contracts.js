const LotusPreSale = artifacts.require('./LotusPreSale.sol')

const RATE = 12000 * (10 ** 8)
const START_TIME = new Date(2017, 1, 1, 0, 0, 0, 0).getTime()
const END_TIME = new Date(2017, 11, 1, 0, 0, 0, 0).getTime();
const WALLET = '0x93e66d9baea28c17d9fc393b53e3fbdd76899dae'

module.exports = function(deployer) {
  deployer.deploy(LotusPreSale, START_TIME, END_TIME, RATE, WALLET)
};
