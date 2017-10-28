/* globals web3, require, artifacts, contract, it, beforeEach */
import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LotusToken = artifacts.require('./LotusToken.sol');
const Vault = artifacts.require('./Vault.sol');

contract('LotusVault', (accounts) => {

  beforeEach(async function () {
    const releaseDate = latestTime() + duration.days(1);
    this.afterRelease = releaseDate + duration.seconds(1);
    const releaseTime = this.afterRelease + duration.days(15);
    this.lotusAddress = accounts[1];
    this.beneficiary = accounts[2];
    this.token = await LotusToken.new(this.lotusAddress, releaseDate);
    this.vault = await Vault.new(this.token.address, this.beneficiary, releaseTime, { from: this.lotusAddress });
    this.token.mint(this.vault.address, 100);
  });
  it('should claim change the revocable state to false', async function () {
    (await this.vault.revocable.call()).should.be.true;
    await this.vault.claim({ from: this.beneficiary }).should.be.fulfilled;
    (await this.vault.revocable.call()).should.be.false;
  });
  it('should claim prevent non-beneficiary from execution', async function () {
    this.lotusAddress.should.be.not.equal(this.beneficiary);
    await this.vault.claim({ from: this.lotusAddress }).should.be.rejectedWith(EVMThrow);
  });
  it('should revoke prevent non-owners from execution', async function () {
    this.lotusAddress.should.be.not.equal(this.beneficiary);
    await this.vault.revoke({ from: this.lotusAddress }).should.be.rejectedWith(EVMThrow);
  });
  it('should revoke fails when is `revocable` is false', async function () {
    await this.vault.claim({ from: this.beneficiary }).should.be.fulfilled;
    (await this.vault.revocable.call()).should.be.false;

    await this.vault.revoke({ from: this.lotusAddress }).should.be.rejectedWith(EVMThrow);
  });
  it('should revoke modify the current balance to zero', async function () {
    // if I do not check the balance before increaseTimeTo, then the followin assertion fails (I dont know why)
    (await this.token.balanceOf(this.vault.address)).should.be.bignumber.equal(100);
    await increaseTimeTo(this.afterRelease);
    (await this.token.balanceOf(this.vault.address)).should.be.bignumber.equal(100);
    await this.vault.revoke({ from: this.lotusAddress }).should.be.fulfilled;
    (await this.token.balanceOf(this.vault.address)).should.be.bignumber.equal(0);
  });
  it('should revoke change the revocable state to false', async function () {
    (await this.vault.revocable.call()).should.be.true;
    await increaseTimeTo(this.afterRelease);
    (await this.vault.revocable.call()).should.be.true;
    await this.vault.revoke({ from: this.lotusAddress }).should.be.fulfilled;
    (await this.vault.revocable.call()).should.be.false;
  });
});
