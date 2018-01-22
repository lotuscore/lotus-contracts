/* globals web3, require, artifacts, contract, it, beforeEach, describe */
import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';

import {
  TOKEN_SUPPLY // BigNumber(1000000000 * (10 ** 8))
} from './helpers/globals';
const LTS = 10 ** 8;

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const PostsalePool = artifacts.require('./PostsalePool.sol');
const LotusToken = artifacts.require('./LotusToken.sol');

contract('PostsalePool', (accounts) => {

  beforeEach(async function () {
    const releaseDate = latestTime() + duration.days(1);
    this.afterRelease = releaseDate + duration.seconds(1);
    this.reserveAccount = accounts[1];
    this.token = await LotusToken.new(this.reserveAccount, releaseDate);
    this.tokenOwner = await this.token.owner.call();
    this.postsalePool = await PostsalePool.new(this.token.address, TOKEN_SUPPLY);
  });

  describe('before close', () => {
    describe('approve', () => {
      it('should fails if is not called by the token owner', async function () {
        const holder = accounts[2];
        const nonOwner = accounts[3];
        nonOwner.should.be.not.equal(this.tokenOwner);
        await this.postsalePool.approve(holder, 100, {
          from: nonOwner
        }).should.be.rejectedWith(EVMThrow);
      });
      it('should add a holder with the correct balance', async function () {
        const holder = accounts[2];
        const value = new BigNumber(100);
        await this.postsalePool.approve(holder, value, {
          from: this.tokenOwner
        }).should.be.fulfilled;
        (await this.postsalePool.holders.call(holder)).should.be.bignumber.equal(value);
      });
      it('should increase the holder balance if this already exists', async function () {
        const holder = accounts[2];
        const value1 = new BigNumber(100);
        const value2 = new BigNumber(150);
        await this.postsalePool.approve(holder, value1, {from: this.tokenOwner}).should.be.fulfilled;
        await this.postsalePool.approve(holder, value2, {from: this.tokenOwner}).should.be.fulfilled;
        (await this.postsalePool.holders.call(holder)).should.be.bignumber.equal(value1.plus(value2));
      });
    });
    describe('close', () => {
      beforeEach(async function () {
        this.poolTokens = new BigNumber(200000 * LTS);
        await increaseTimeTo(this.afterRelease);
      });
      it('should fails if current balance is zero', async function () {
        (await this.token.balanceOf(this.postsalePool.address)).should.be.bignumber.equal(0);
        await this.postsalePool.close({
          from: this.tokenOwner
        }).should.be.rejectedWith(EVMThrow);
      });
      it('should change `close` to true', async function () {
        await this.token.mint(this.postsalePool.address, this.poolTokens);

        (await this.postsalePool.closed.call()).should.be.false;
        await this.postsalePool.close({
          from: this.tokenOwner
        }).should.be.fulfilled;
        (await this.postsalePool.closed.call()).should.be.true;
      });
    });
    describe('allowance', () => {
      it('should fails', async function () {
        const holder = accounts[2];
        await this.postsalePool.approve(holder, 100).should.be.fulfilled;
        await this.postsalePool.allowance(holder).should.be.rejectedWith(EVMThrow);
      });
    });
    describe('claim', () => {
      it('should fails', async function () {
        const holder = accounts[2];
        await this.postsalePool.approve(holder, 100).should.be.fulfilled;
        await this.postsalePool.claim(holder).should.be.rejectedWith(EVMThrow);
      });
    });
  });
  describe('after close', () => {
    beforeEach(async function () {
      this.poolTokens = new BigNumber(200000 * LTS);
      // pre approved tokens for further tests
      this.values = [new BigNumber(1), new BigNumber(200 * LTS), TOKEN_SUPPLY];
      this.holders = [accounts[2], accounts[3], accounts[4]];
      for (let i = 0; i < 3; i++) {
        await this.postsalePool.approve(this.holders[i], this.values[i]).should.be.fulfilled;
      }

      await increaseTimeTo(this.afterRelease);
      // simulate crowdsale ending
      await this.token.mint(this.postsalePool.address, this.poolTokens);
      await this.postsalePool.close({
        from: this.tokenOwner
      }).should.be.fulfilled;
    });
    describe('approve', () => {
      it('should fails', async function () {
        const newHolder = accounts[3];
        await this.postsalePool.approve(newHolder, 100).should.be.rejectedWith(EVMThrow);
      });
    });
    describe('close', () => {
      it('should fails', async function () {
        await this.postsalePool.close({
          from: this.tokenOwner
        }).should.be.rejectedWith(EVMThrow);
      });
    });
    describe('allowance', () => {
      for (let i = 0; i < 3; i++) {
        it(`should calculate the correct allowance - case ${i+1}`, async function () {
          const expectedAllowance = this.poolTokens.mul(this.values[i]).div(TOKEN_SUPPLY).trunc();
          const allowance = await this.postsalePool.allowance(this.holders[i]).should.be.fulfilled;
          allowance.should.be.bignumber.equal(expectedAllowance);
        });
      }
    });
  });
  describe('claim', () => {
    beforeEach(async function () {
      const poolTokens = new BigNumber(200000 * LTS);
      // pre approved tokens for further tests
      this.holder = accounts[2];
      await this.postsalePool.approve(this.holder, 100).should.be.fulfilled;
      // simulate crowdsale ending
      await this.token.mint(this.postsalePool.address, poolTokens);
      await this.postsalePool.close({
        from: this.tokenOwner
      }).should.be.fulfilled;
    });
    it('should prevent execution before release date', async function () {
      await this.postsalePool.claim(this.holder).should.be.rejectedWith(EVMThrow);
    });
    it('should transfer the allowed amount after release date', async function () {
      await increaseTimeTo(this.afterRelease);
      await this.postsalePool.claim(this.holder).should.be.fulfilled;
    });
    it('should transfer the allowed amount after release date once', async function () {
      await increaseTimeTo(this.afterRelease);
      await this.postsalePool.claim(this.holder).should.be.fulfilled;
      await this.postsalePool.claim(this.holder).should.be.rejectedWith(EVMThrow);
    });
  });
});
