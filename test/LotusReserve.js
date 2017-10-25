import { duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';
import {
  INITIAL_SUPPLY // BigNumber(400000000 * (10 ** 18))
} from './helpers/globals';

const BigNumber = web3.BigNumber;
const lotusAddress = '0x93e66d9baea28c17d9fc393b53e3fbdd76899dae';
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LotusToken = artifacts.require('./LotusToken.sol');
const LotusReserve = artifacts.require('./LotusReserve.sol');

contract('LotusReserve', (accounts) => {

  beforeEach(async function () {
    const releaseDate = latestTime() + duration.days(1);
    this.token = await LotusToken.new(lotusAddress, releaseDate);
    this.reserveContract = new LotusReserve(await this.token.reserve.call());
  });

  it('should reserves balance be equal to 400000000*10^18 LTS', async function () {
    const reserveAmount = await this.token.balanceOf.call(this.reserveContract.address)
    const reserveExpected = INITIAL_SUPPLY;
    reserveAmount.should.be.bignumber.equal(reserveExpected);
  });
  it('should lotusAddress be the reserve owner', async function() {
    (await this.reserveContract.owner.call()).should.be.equal(lotusAddress);
  })
  it('should `reserves` length be equal 3', async function () {
    for (var index = 0; index < 4; index++) {
      if (index < 3) await this.reserveContract.reserves.call(index).should.be.fulfilled;
      else await this.reserveContract.reserves.call(index).should.be.rejectedWith(EVMThrow);
    }
  });
  it('should `releaseDates` length be equal 3', async function () {
    for (var index = 0; index < 4; index++) {
      if (index < 3) await this.reserveContract.releaseDates.call(index).should.be.fulfilled;
      else await this.reserveContract.releaseDates.call(index).should.be.rejectedWith(EVMThrow);
    }
  });
  it('should contract balance be equal to reserves', async function () {
    (await this.token.balanceOf.call(this.reserveContract.address)).should.be.bignumber.equal(
      (await this.reserveContract.reserves.call(0)).plus(
        (await this.reserveContract.reserves.call(1))).plus(
          await this.reserveContract.reserves.call(2)));
  })
  it('should token `releaseDate` be lower or equal than each reserve release date in `releaseDates`', async function () {
    const releaseDate = await this.token.releaseDate.call();
    (await this.reserveContract.releaseDates.call(0)).should.be.bignumber.gte(releaseDate);
    (await this.reserveContract.releaseDates.call(1)).should.be.bignumber.gte(releaseDate);
    (await this.reserveContract.releaseDates.call(2)).should.be.bignumber.gte(releaseDate);
  });
  it('should each element of `releaseDates` be different from each other', async function () {
    const releaseDate = await this.token.releaseDate.call();
    const r1 = await this.reserveContract.releaseDates.call(0);
    const r2 = await this.reserveContract.releaseDates.call(1);
    const r3 = await this.reserveContract.releaseDates.call(2);
    r1.should.be.not.equal(r2);
    r1.should.be.not.equal(r3);
    r2.should.be.not.equal(r3);
  });
});
