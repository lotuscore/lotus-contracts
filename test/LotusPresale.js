/* globals web3, require, artifacts, contract, it, before, beforeEach, describe */
import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import { advanceBlock } from 'zeppelin-solidity/test/helpers/advanceToBlock';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';
import ether from 'zeppelin-solidity/test/helpers/ether';

import {
  TOKEN_SUPPLY // BigNumber(1000000000 * (10 ** 8))
} from './helpers/globals';

const BigNumber = web3.BigNumber;
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LotusCrowdsale = artifacts.require('./LotusCrowdsale.sol');
const LotusPresale = artifacts.require('./LotusPresale.sol');
const LotusToken = artifacts.require('./LotusToken.sol');
const PostsalePool = artifacts.require('./PostsalePool.sol');

const rate = new BigNumber(12000);
const reservesSupply = TOKEN_SUPPLY.mul(3).div(10);
const ethToLts = (x) => x.mul(rate).div(10 ** 10).truncated();

contract('LotusPresale', (accounts) => {

  before(async function() { await advanceBlock(); });
  beforeEach(async function () {
    this.startDate = latestTime() + duration.days(1);
    const endTime = this.startDate + duration.days(1);
    const releaseDate = endTime + duration.days(1);
    const cap = 8334 * (10 ** 18);
    this.fundAccount = accounts[1];
    this.reserveAccount = accounts[2];
    this.beforeEnd = endTime - duration.seconds(1);
    this.afterEnd = endTime + duration.seconds(1);
    this.presale = await LotusPresale.new(this.startDate, endTime, rate, cap, this.fundAccount);
    this.crowdsale = await LotusCrowdsale.new(
      this.startDate + duration.weeks(4), endTime + duration.weeks(4), rate, cap, this.fundAccount);
    this.token = await LotusToken.new(this.reserveAccount, releaseDate);
    await this.token.transferOwnership(this.presale.address);
  });

  it('should method `init` fails when token releaseDate is lower than endTime ', async function () {
    const invalidToken = await LotusToken.new(this.reserveAccount, this.beforeEnd);
    await this.presale.init(invalidToken.address).should.be.rejectedWith(EVMThrow);
  });
  it('should method `init` change the used token ', async function () {
    (await this.presale.token.call()).should.be.not.equal(this.token.address);
    await this.presale.init(this.token.address).should.be.fulfilled;
    (await this.presale.token.call()).should.be.equal(this.token.address);
  });
  it('should method `init` fails when it is used more than once ', async function () {
    await this.presale.init(this.token.address).should.be.fulfilled;
    await this.presale.init(this.token.address).should.be.rejectedWith(EVMThrow);
  });
  it('should transferTokenOwnership fails when it is called before endDate', async function () {
    await this.presale.transferTokenOwnership(this.crowdsale.address, { from: this.reserveAccount }).should.be.rejectedWith(EVMThrow);
  });
  describe('after endTime transferTokenOwnership', () => {
    beforeEach(async function() {
      await increaseTimeTo(this.afterEnd);
      await this.presale.init(this.token.address).should.be.fulfilled;
    });
    it('should transfer the token ownership to a crowdsale contract', async function () {
      await this.presale.transferTokenOwnership(this.crowdsale.address, { from: this.reserveAccount }).should.be.fulfilled;
    });
    it('should fails when the address is not a Crowdsale contract', async function () {
      await this.presale.transferTokenOwnership(accounts[3], { from: this.reserveAccount }).should.be.rejectedWith(EVMThrow);
    });
    it('should fails when the sender is not the reserve owner', async function () {
      accounts[4].should.be.not.equal(this.reserveAccount);
      await this.presale.transferTokenOwnership(this.crowdsale.address, { from: accounts[4] }).should.be.rejectedWith(EVMThrow);
    });
  });

  describe('postsalePool', function () {
    it('should create a postsalePool when init', async function () {
      Number(await this.presale.postsalePool.call()).should.be.equal(0); // 0x000..
      await this.presale.init(this.token.address).should.be.fulfilled;
      Number(await this.presale.postsalePool.call()).should.be.gt(0);
    });
    it('should approve buyer supply in postsalePool when buyTokens', async function () {
      await this.presale.init(this.token.address).should.be.fulfilled;
      await increaseTimeTo(this.startDate);
      const postsalePool = PostsalePool.at(await this.presale.postsalePool.call());
      const buyer = accounts[3];
      const value = ether(Math.random()*10);

      await this.presale.buyTokens(buyer, { value, from: buyer }).should.be.fulfilled;

      (await postsalePool.holders.call(buyer)).should.be.bignumber.equal(ethToLts(value));
    });
    it('should approve reserve supply in postsalePool when init', async function () {
      await this.presale.init(this.token.address).should.be.fulfilled;
      const postsalePool = PostsalePool.at(await this.presale.postsalePool.call());
      (await postsalePool.holders.call(await this.token.reserve.call())).should.be.bignumber.equal(reservesSupply);
    });
  });

  /**
   * buyTokens tests (based on zeppelin tests)
   */
  describe('accepting payments', function () {
    before(async function() {
      this.value = ether(42);
      this.investor = accounts[3];
      this.purchaser = accounts[4];
    });
    beforeEach(async function() {
      await this.presale.init(this.token.address).should.be.fulfilled;
    });

    it('should reject payments before start', async function () {
      await this.presale.send(this.value).should.be.rejectedWith(EVMThrow);
      await this.presale.buyTokens(this.investor, {from: this.purchaser, value: this.value}).should.be.rejectedWith(EVMThrow);
    });

    it('should accept payments after start', async function () {
      await increaseTimeTo(this.startDate);
      await this.presale.send(this.value).should.be.fulfilled;
      await this.presale.buyTokens(this.investor, {value: this.value, from: this.purchaser}).should.be.fulfilled;
    });

    it('should reject payments after end', async function () {
      await increaseTimeTo(this.afterEnd);
      await this.presale.send(this.value).should.be.rejectedWith(EVMThrow);
      await this.presale.buyTokens(this.investor, {value: this.value, from: this.purchaser}).should.be.rejectedWith(EVMThrow);
    });

  });

  describe('low-level purchase', function () {
    before(async function() {
      const ethereumDecimals = 18;
      const LTSDecimals = await this.token.decimals();
      this.value = ether(1);
      this.investor = accounts[3];
      this.purchaser = accounts[4];

      this.expectedTokenAmount = rate.mul(
        this.value).div(10 ** (ethereumDecimals-LTSDecimals)).plus(reservesSupply);
    });

    beforeEach(async function() {
      await this.presale.init(this.token.address).should.be.fulfilled;
      await increaseTimeTo(this.startDate);
    });

    it('should log purchase', async function () {
      const {logs} = await this.presale.buyTokens(this.investor, {value: this.value, from: this.purchaser});

      const event = logs.find(e => e.event === 'TokenPurchase');

      should.exist(event);
      event.args.purchaser.should.equal(this.purchaser);
      event.args.beneficiary.should.equal(this.investor);
      event.args.value.should.be.bignumber.equal(this.value);
      event.args.amount.should.be.bignumber.equal(this.expectedTokenAmount - reservesSupply);
    });

    it('should increase totalSupply', async function () {
      await this.presale.buyTokens(this.investor, { value: this.value, from: this.purchaser });
      const totalSupply = await this.token.totalSupply();
      totalSupply.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should assign tokens to beneficiary', async function () {
      await this.presale.buyTokens(this.investor, { value: this.value, from: this.purchaser });
      const balance = await this.token.balanceOf(this.investor);
      balance.should.be.bignumber.equal(this.expectedTokenAmount - reservesSupply);
    });

    it('should forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(this.fundAccount);
      await this.presale.buyTokens(this.investor, { value: this.value, from: this.purchaser });
      const post = web3.eth.getBalance(this.fundAccount);
      post.minus(pre).should.be.bignumber.equal(this.value);
    });

  });
});
