var LotusToken = artifacts.require("./LotusToken.sol");
var LotusPreSale = artifacts.require("./LotusPreSale.sol");

var PRESALE_PRICE = 12000 * (10 ** 8);

module.exports = function(deployer) {
  deployer.deploy(LotusToken);
  deployer.link(LotusToken, LotusPreSale);
  deployer.deploy(LotusPreSale, 1, 999, PRESALE_PRICE,
                  0x93e66d9baea28c17d9fc393b53e3fbdd76899dae);
};
