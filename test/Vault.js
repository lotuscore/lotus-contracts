/* globals web3, require, artifacts, contract, it, beforeEach, before */
import { duration } from 'zeppelin-solidity/test/helpers/increaseTime';
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
    this.releaseTime = this.afterRelease + duration.days(15);
    this.vaultOwner = accounts[1];
    this.beneficiary = accounts[2];
    this.token = await LotusToken.new(0x123, releaseDate);
    this.vault = await Vault.new(this.token.address, this.beneficiary, this.releaseTime, 0, { from: this.vaultOwner });
    this.token.mint(this.vault.address, 100);
    this.token.mint(this.vaultOwner, 50);
  });
  it('should display correct types', async function () {
    const createVaultType = (type) => Vault.new(
      this.token.address,
      this.beneficiary,
      this.releaseTime,
      type, { from: this.vaultOwner
    });
    const type0 = 'community';
    const type1 = 'marketing and partnerships';
    const type2 = 'development team and advisors';
    const vault0 = await createVaultType(0);
    const vault1 = await createVaultType(1);
    const vault2 = await createVaultType(2);
    (await vault0.get_type.call()).should.be.equal(type0);
    (await vault1.get_type.call()).should.be.equal(type1);
    (await vault2.get_type.call()).should.be.equal(type2);
  });
  it('should prevent create a vault with the owner as beneficiary', async function () {
    await Vault.new(this.token.address, this.vaultOwner, this.releaseTime, 0, {
      from: this.vaultOwner
    }).should.be.rejectedWith(EVMThrow);
  });
  it('should claim change the revocable state to false', async function () {
    (await this.vault.revocable.call()).should.be.true;
    await this.vault.claim({ from: this.beneficiary }).should.be.fulfilled;
    (await this.vault.revocable.call()).should.be.false;
  });
  it('should claim fails if revocable state is false', async function () {
    await this.vault.claim({ from: this.beneficiary }).should.be.fulfilled;
    (await this.vault.revocable.call()).should.be.false;
    await this.vault.claim({ from: this.beneficiary }).should.be.rejectedWith(EVMThrow);
  });
  it('should claim prevent non-beneficiary from execution', async function () {
    this.vaultOwner.should.be.not.equal(this.beneficiary);
    await this.vault.claim({ from: this.vaultOwner }).should.be.rejectedWith(EVMThrow);
  });
  it('should revoke modify the beneficiary to contract owner', async function () {
    (await this.vault.beneficiary.call()).should.be.not.equal(this.vaultOwner);
    await this.vault.revoke({ from: this.vaultOwner }).should.be.fulfilled;
    (await this.vault.beneficiary.call()).should.be.equal(this.vaultOwner);
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
  it('should revoked be true after revoke', async function () {
    (await this.vault.revoked.call()).should.be.false;
    await this.vault.revoke({ from: this.vaultOwner }).should.be.fulfilled;
    (await this.vault.revoked.call()).should.be.true;
  });
  it('should balance method show the current token balance', async function () {
    (await this.vault.balance.call()).should.be.bignumber.equal(
      await this.token.balanceOf.call(this.vault.address));
  });
});
