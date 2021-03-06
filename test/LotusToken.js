/* globals web3, require, artifacts, contract, it, before, beforeEach, describe */
import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import { advanceBlock } from 'zeppelin-solidity/test/helpers/advanceToBlock';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';

import {
  TOKEN_SUPPLY // BigNumber(1000000000 * (10 ** 8))
} from './helpers/globals';

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
    this.releaseDate = latestTime() + duration.days(1);
    this.reserveAccount = accounts[3];
    this.afterRelease = this.releaseDate + duration.days(1);
    this.token = await LotusToken.new(this.reserveAccount, this.releaseDate);
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
      await this.token.transfer(accounts[5], 10, { from: account }).should.be.rejectedWith(EVMThrow);

      // checking post-conditions
      (await this.token.balanceOf(account)).should.be.bignumber.equal(10);
    });

    it('should be able to change the release date 1', async function () {
      const originalReleaseDate = await this.token.releaseDate();
      const targetReleaseDate = originalReleaseDate.add(duration.days(5));
      await this.token.setReleaseDate(
        targetReleaseDate, {
          from: this.reserveAccount
        }).should.be.fulfilled;
      (await this.token.releaseDate()).should.be.bignumber.equal(targetReleaseDate);
    });

    it('should be able to change the release date 2', async function () {
      await this.token.setReleaseDate(
        this.releaseDate - duration.days(5), {
          from: this.reserveAccount
        }).should.be.rejectedWith(EVMThrow);
    });

    it('should not be able to change the release date before now', async function () {
      await this.token.setReleaseDate(
        latestTime() - duration.seconds(1), {
          from: this.reserveAccount
        }).should.be.rejectedWith(EVMThrow);
    });

    it('should be able to change the release date 3 months in the future', async function () {
      await this.token.setReleaseDate(
        this.releaseDate + duration.weeks(4*3) - duration.days(1), {
          from: this.reserveAccount
        }).should.be.fulfilled;
    });

    it('should not be able to change the release date more than 3 months in the future', async function () {
      await this.token.setReleaseDate(
        this.releaseDate + duration.weeks(4*4), {
          from: this.reserveAccount
        }).should.be.rejectedWith(EVMThrow);
    });

    it('should be able to mint', async function () {
      await this.token.mint(accounts[0], 10).should.be.fulfilled;
    });

    it('should be able to mint the MAX_SUPPLY', async function () {
      await this.token.mint(accounts[0], TOKEN_SUPPLY).should.be.fulfilled;
    });

    it('should not be able to mint more than MAX_SUPPLY', async function () {
      await this.token.mint(accounts[0], TOKEN_SUPPLY.add(1)).should.be.rejectedWith(EVMThrow);
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
      await this.token.transfer(accounts[5], 10, { from: account }).should.be.fulfilled;

      // checking post-conditions
      (await this.token.balanceOf(account)).should.be.bignumber.equal(0);
    });

    it('should not be able to change the release date', async function () {
      await this.token.setReleaseDate(this.releaseDate + duration.days(5), {
        from: this.reserveAccount
      }).should.be.rejectedWith(EVMThrow);
    });

    it('should not be able to finishMinting if MAX_SUPPLY is not reached', async function () {
      await this.token.finishMinting().should.be.rejectedWith(EVMThrow);
    });

    it('should be able to finishMinting if MAX_SUPPLY is reached', async function () {
      const actualSupply = await this.token.totalSupply.call();
      await this.token.mint(accounts[0], TOKEN_SUPPLY.sub(actualSupply));
      await this.token.finishMinting().should.be.fulfilled;
    });

    it('should prevent non-owners from finishMinting', async function () {
      await this.token.finishMinting({from: accounts[2]}).should.be.rejectedWith(EVMThrow);
    });
  });
});
