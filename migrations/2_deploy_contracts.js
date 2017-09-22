var LotusToken = artifacts.require('./LotusToken.sol');
var LotusPreSale = artifacts.require('./LotusPreSale.sol');

var PRICE = 12000 * (10 ** 8);
var START_TIME = new Date(2017, 1, 1, 0, 0, 0, 0).getTime();
var END_TIME = new Date(2017, 11, 1, 0, 0, 0, 0).getTime();
var WALLET = '0x93e66d9baea28c17d9fc393b53e3fbdd76899dae';

module.exports = function(deployer) {
  deployer.deploy(LotusToken);
  deployer.link(LotusToken, LotusPreSale);
  deployer.deploy(LotusPreSale, START_TIME, END_TIME, PRICE, WALLET);
};
