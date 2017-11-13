/* globals web3, require, artifacts, contract, it, before, beforeEach, describe */
import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import { advanceBlock } from 'zeppelin-solidity/test/helpers/advanceToBlock';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LotusCrowdsale = artifacts.require('./LotusCrowdsale.sol');
const LotusPresale = artifacts.require('./LotusPresale.sol');
const LotusToken = artifacts.require('./LotusToken.sol');

contract('LotusPresale', (accounts) => {

  before(async function() { await advanceBlock(); });
  beforeEach(async function () {
    const startDate = latestTime() + duration.days(1);
    const endTime = startDate + duration.days(1);
    const releaseDate = endTime + duration.days(1);
    const cap = 8334 * (10 ** 18);
    const fundAccount = accounts[1];
    this.reserveAccount = accounts[2];
    this.beforeEnd = endTime - duration.seconds(1);
    this.afterEnd = endTime + duration.seconds(1);
    this.presale = await LotusPresale.new(startDate, endTime, 12000, cap, fundAccount);
    this.crowdsale = await LotusCrowdsale.new(
      startDate + duration.weeks(4), endTime + duration.weeks(4), 12000, cap, fundAccount);
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
});
