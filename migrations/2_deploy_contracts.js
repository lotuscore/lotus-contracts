/* globals  artifacts */
const LotusPreSale = artifacts.require('./LotusPreSale.sol')

const RATE = 12000 // 12000 tokens per ether
const CAP = 8334 * (10 ** 18)
const START_TIME = Math.round(
  new Date(...process.env.PS_START_TIME.split('-')).getTime() / 1000)
const END_TIME = Math.round(
  new Date(...process.env.PS_END_TIME.split('-')).getTime() / 1000)
const WALLET = process.env.PS_WALLET

module.exports = function(deployer) {
  deployer.deploy(LotusPreSale, START_TIME, END_TIME, RATE, CAP, WALLET)
};
