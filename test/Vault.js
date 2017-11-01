/* globals web3, require, artifacts, contract, describe, it, beforeEach, before */
import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';
import { advanceBlock } from 'zeppelin-solidity/test/helpers/advanceToBlock';

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LotusToken = artifacts.require('./LotusToken.sol');
const Vault = artifacts.require('./Vault.sol');

contract('LotusVault', (accounts) => {

  before(async function() { await advanceBlock(); });
  beforeEach(async function () {
    const releaseDate = latestTime() + duration.days(1);
    this.afterRelease = releaseDate + duration.seconds(1);
    const releaseTime = this.afterRelease + duration.days(15);
    this.vaultOwner = accounts[1];
    this.beneficiary = accounts[2];
    this.token = await LotusToken.new(0x123, releaseDate);
    this.vault = await Vault.new(this.token.address, this.beneficiary, releaseTime, { from: this.vaultOwner });
    this.token.mint(this.vault.address, 100);
    this.token.mint(this.vaultOwner, 50);
  });
  it('should claim change the revocable state to false', async function () {
    (await this.vault.revocable.call()).should.be.true;
    await this.vault.claim({ from: this.beneficiary }).should.be.fulfilled;
    (await this.vault.revocable.call()).should.be.false;
  });
  it('should claim prevent non-beneficiary from execution', async function () {
    this.vaultOwner.should.be.not.equal(this.beneficiary);
    await this.vault.claim({ from: this.vaultOwner }).should.be.rejectedWith(EVMThrow);
  });
  describe('after afterRelease', () => {
    beforeEach(async function () {
      this.vaultBalance = await this.token.balanceOf(this.vault.address);
      this.vaultOwnerBalance = await this.token.balanceOf(this.vaultOwner);

      this.vaultBalance.should.be.bignumber.equal(100);
      this.vaultOwnerBalance.should.be.bignumber.equal(50);

      await increaseTimeTo(this.afterRelease);
    });
    it('should revoke modify the current balance to zero', async function () {
      await this.vault.revoke({ from: this.vaultOwner }).should.be.fulfilled;
      (await this.token.balanceOf(this.vault.address)).should.be.bignumber.equal(0);
    });
    it('should increase owner balance to owner balance plus vault balance', async function () {
      await this.vault.revoke({ from: this.vaultOwner }).should.be.fulfilled;
      (await this.token.balanceOf(this.vaultOwner)).should.be.bignumber.equal(
        this.vaultOwnerBalance.plus(this.vaultBalance));
    });
    it('should revoke change the revocable state to false', async function () {
      (await this.vault.revocable.call()).should.be.true;
      await this.vault.revoke({ from: this.vaultOwner }).should.be.fulfilled;
      (await this.vault.revocable.call()).should.be.false;
    });
    it('should revoke prevent non-owners from execution', async function () {
      this.vaultOwner.should.be.not.equal(this.beneficiary);
      await this.vault.revoke({ from: this.beneficiary }).should.be.rejectedWith(EVMThrow);
    });
    it('should revoke fails when is `revocable` is false', async function () {
      await this.vault.claim({ from: this.beneficiary }).should.be.fulfilled;
      (await this.vault.revocable.call()).should.be.false;

      await this.vault.revoke({ from: this.vaultOwner }).should.be.rejectedWith(EVMThrow);
    });
  });
});
