import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import { advanceBlock } from 'zeppelin-solidity/test/helpers/advanceToBlock';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';

const BigNumber = web3.BigNumber;
const should = require('chai')
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
    this.token = await LotusToken.new();
  });

  it('should keep 400000000*10^18 LTS as reserve', async function () {
    const reserves = new BigNumber(400000000 * (10 ** (await this.token.decimals.call())));
    (await this.token.balanceOf.call(this.token.address)).should.be.bignumber.equal(reserves);
  });
  it('should totalSupply be equal to contract balance at the beginning', async function () {
    (await this.token.balanceOf.call(this.token.address)).should.be.bignumber.equal(
      await this.token.totalSupply.call());
  });
  it('should exist only three reserve vaults', async function () {
    for (var index = 0; index < 4; index++) {
      if (index < 3) await this.token.reserves.call(index).should.be.fulfilled;
      else await this.token.reserves.call(index).should.be.rejectedWith(EVMThrow);
    }
  });
  it('should exist only three release values in `releaseDates`', async function () {
    for (var index = 0; index < 4; index++) {
      if (index < 3) await this.token.releaseDates.call(index).should.be.fulfilled;
      else await this.token.releaseDates.call(index).should.be.rejectedWith(EVMThrow);
    }
  });
  it('should equal totalSuply to reserves', async function () {
    (await this.token.balanceOf.call(this.token.address)).should.be.bignumber.equal(
      (await this.token.reserves.call(0)).plus(
        (await this.token.reserves.call(1))).plus(
          await this.token.reserves.call(2)));
  })
  it('should `releaseDate` be lower or equal than each reserve release date in `releaseDates`', async function () {
    const publicReleaseDate = await this.token.releaseDate.call();
    (await this.token.releaseDates.call(0)).should.be.bignumber.equal(publicReleaseDate);
    (await this.token.releaseDates.call(1)).should.be.bignumber.equal(publicReleaseDate);
    (await this.token.releaseDates.call(2)).should.be.bignumber.equal(publicReleaseDate);
  });
  // preventing typos
  it('should datetime variables be bounded between oct-20-2017 and a year in the future', async function () {
    const lowerBound = new Date(2017, 9, 20, 0, 0).getTime() / 1000;
    const upperBound = new Date(2018, 9, 20, 0, 0).getTime() / 1000;
    [
      await this.token.releaseDate.call(),
      await this.token.releaseDates.call(0),
      await this.token.releaseDates.call(1),
      await this.token.releaseDates.call(2)
    ].forEach((datetime) => {
      datetime.should.be.bignumber.below(upperBound);
      datetime.should.be.bignumber.above(lowerBound);
    });
  });
  it('should will be able to transfer only after releaseDate', async function () {
    const account = accounts[0];
    const releaseDate = await this.token.releaseDate.call()
    let now = web3.eth.getBlock('latest').timestamp;

    await this.token.mint(account, 10);

    // checking pre-conditions
    (await this.token.balanceOf(account)).should.be.bignumber.equal(10);
    releaseDate.should.be.bignumber.above(now);

    // actual tests
    await this.token.transfer(0x123, 10, { from: account }).should.be.rejectedWith(EVMThrow);
    await increaseTimeTo(releaseDate + duration.days(1))
    await this.token.transfer(0x123, 10, { from: account }).should.be.fulfilled;

    // checking post-conditions
    (await this.token.balanceOf(account)).should.be.bignumber.equal(0);
    now = web3.eth.getBlock('latest').timestamp;
    releaseDate.should.be.bignumber.below(now);
  });
});
