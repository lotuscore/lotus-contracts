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

const LotusToken = artifacts.require('./LotusToken.sol');


contract('LotusToken', (accounts) => {

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function () {
    const releaseDate = latestTime() + duration.days(1);
    const reserveAccount = accounts[3];
    this.afterRelease = releaseDate + duration.days(1);
    this.token = await LotusToken.new(reserveAccount, releaseDate);
  });

  it('should reserves be equal to totalSupply equal to 0 LTS', async function () {
    const reserveContract = await this.token.reserve.call();
    const reserveAmount = await this.token.balanceOf.call(reserveContract);
    const reserveExpected = 0;

    reserveAmount.should.be.bignumber.equal(await this.token.totalSupply.call());
    reserveAmount.should.be.bignumber.equal(reserveExpected);
  });

  describe('before releaseDate', function () {
    it('should not be able to transfer', async function () {
      const account = accounts[0];
      await this.token.mint(account, 10);

      // checking pre-conditions
      (await this.token.balanceOf(account)).should.be.bignumber.equal(10);
      (await this.token.releaseDate.call()).should.be.bignumber.gt(latestTime());

      // actual tests
      await this.token.transfer(0x123, 10, { from: account }).should.be.rejectedWith(EVMThrow);

      // checking post-conditions
      (await this.token.balanceOf(account)).should.be.bignumber.equal(10);
    });

    it('should not be able to finishMinting', async function () {
      await this.token.finishMinting().should.be.rejectedWith(EVMThrow);
    });
  });

  describe('after releaseDate', () => {
    beforeEach(async function() {
      await increaseTimeTo(this.afterRelease);
    });

    it('should be able to transfer', async function () {
      const account = accounts[1];
      await this.token.mint(account, 10);

      // checking pre-conditions
      (await this.token.balanceOf(account)).should.be.bignumber.equal(10);
      (await this.token.releaseDate.call()).should.be.bignumber.lte(latestTime());

      // actual tests
      await this.token.transfer(0x123, 10, { from: account }).should.be.fulfilled;

      // checking post-conditions
      (await this.token.balanceOf(account)).should.be.bignumber.equal(0);
    });

    it('should be able to finishMinting', async function () {
      await this.token.finishMinting().should.be.fulfilled;
    });

    it('should prevent non-owners from finishMinting', async function () {
      await this.token.finishMinting({from: accounts[2]}).should.be.rejectedWith(EVMThrow);
    });
  });
});
