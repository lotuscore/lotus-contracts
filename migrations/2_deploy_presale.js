/* globals  artifacts */
require('dotenv').config({ path: '../.env' })
const assert = require('assert')
const LotusPresale = artifacts.require('./LotusPresale.sol')
const LotusToken = artifacts.require('./LotusToken.sol')

const RATE = 12000 // 12000 tokens per ether
const CAP = 8334 * (10 ** 18)
const RELEASE_DATE = Math.round(
  new Date(...process.env.RELEASE_DATE.split('-')).getTime() / 1000)
const START_TIME = Math.round(
  new Date(...process.env.PRESALE_START.split('-')).getTime() / 1000)
const END_TIME = Math.round(
  new Date(...process.env.PRESALE_END.split('-')).getTime() / 1000)
const RESERVE_ACCOUNT = process.env.RESERVE_ACCOUNT
const FUND_ACCOUNT = process.env.FUND_ACCOUNT

module.exports = function(deployer) {
  const now = Math.round(new Date().getTime() / 1000)
  assert(START_TIME > now, 'START_TIME must be in the future')
  assert(END_TIME > START_TIME, 'END_TIME must be greater than START_TIME')
  assert(RELEASE_DATE > END_TIME, 'RELEASE_DATE must be greater than END_TIME')
  deployer.deploy(LotusToken, RESERVE_ACCOUNT, RELEASE_DATE)
  deployer.deploy(LotusPresale, START_TIME, END_TIME, RATE, CAP, FUND_ACCOUNT)
  deployer.then(async function () {
    const token = await LotusToken.deployed()
    const presale = await LotusPresale.deployed()
    token.transferOwnership(presale.address)
    presale.use(token.address)
  })
};
