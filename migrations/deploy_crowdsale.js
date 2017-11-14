/* globals  artifacts */
const LotusCrowdsale = artifacts.require('./LotusCrowdsale.sol')

const RATE = 6000 // 6000 tokens per ether
const CAP = 8334 * (10 ** 18)
const CROWDSALE_START = Math.round(
  new Date(...process.env.CROWDSALE_START.split('-')).getTime() / 1000)
const CROWDSALE_END = Math.round(
  new Date(...process.env.CROWDSALE_END.split('-')).getTime() / 1000)
const FUND_ACCOUNT = process.env.FUND_ACCOUNT

module.exports = function(deployer) {
  deployer.deploy(LotusCrowdsale, CROWDSALE_START, CROWDSALE_END, RATE, CAP, FUND_ACCOUNT)
};
