/* globals  artifacts */
const LotusPresale = artifacts.require('./LotusPresale.sol')
const LotusToken = artifacts.require('./LotusToken.sol')

const RATE = 12000 // 12000 tokens per ether
const CAP = 8334 * (10 ** 18)
const RELEASE_DATE = Math.round(
  new Date(...process.env.PS_START_TIME.split('-')).getTime() / 1000)
const START_TIME = Math.round(
  new Date(...process.env.PS_START_TIME.split('-')).getTime() / 1000)
const END_TIME = Math.round(
  new Date(...process.env.PS_END_TIME.split('-')).getTime() / 1000)
const RESERVE_ACCOUNT = process.env.RESERVE_ACCOUNT
const FUND_ACCOUNT = process.env.FUND_ACCOUNT

module.exports = function(deployer) {
  deployer.deploy(LotusToken, RESERVE_ACCOUNT, RELEASE_DATE)
  deployer.deploy(LotusPresale, START_TIME, END_TIME, RATE, CAP, FUND_ACCOUNT)
  deployer.then(async function () {
    const token = await LotusToken.deployed()
    const presale = await LotusPresale.deployed()
    token.transferOwnership(presale.address)
    presale.use(token.address)
  })
};
