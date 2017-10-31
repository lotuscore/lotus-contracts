/* globals web3, require, artifacts, contract, it, beforeEach, describe */
import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';
import {
  INITIAL_SUPPLY // BigNumber(400000000 * (10 ** 18))
} from './helpers/globals';

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LotusToken = artifacts.require('./LotusToken.sol');
const LotusReserve = artifacts.require('./LotusReserve.sol');
const Vault = artifacts.require('./Vault.sol');

contract('LotusReserve', (accounts) => {

  beforeEach(async function () {
    const releaseDate = latestTime() + duration.days(1);
    this.afterRelease = releaseDate + duration.seconds(1);
    this.lotusAddress = accounts[1];
    this.token = await LotusToken.new(this.lotusAddress, releaseDate);
    this.reserveContract = new LotusReserve(await this.token.reserve.call());
  });
  it('should reserves balance be equal to 400000000*10^18 LTS', async function () {
    const reserveAmount = await this.token.balanceOf.call(this.reserveContract.address);
    const reserveExpected = INITIAL_SUPPLY;
    reserveAmount.should.be.bignumber.equal(reserveExpected);
  });
  it('should lotusAddress be the reserve owner', async function() {
    (await this.reserveContract.owner.call()).should.be.equal(this.lotusAddress);
  });
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
  });
  it('should token `releaseDate` be lower or equal than each reserve release date in `releaseDates`', async function () {
    const releaseDate = await this.token.releaseDate.call();
    (await this.reserveContract.releaseDates.call(0)).should.be.bignumber.gte(releaseDate);
    (await this.reserveContract.releaseDates.call(1)).should.be.bignumber.gte(releaseDate);
    (await this.reserveContract.releaseDates.call(2)).should.be.bignumber.gte(releaseDate);
  });
  it('should each element of `releaseDates` be different from each other', async function () {
    const r1 = await this.reserveContract.releaseDates.call(0);
    const r2 = await this.reserveContract.releaseDates.call(1);
    const r3 = await this.reserveContract.releaseDates.call(2);
    r1.should.be.not.equal(r2);
    r1.should.be.not.equal(r3);
    r2.should.be.not.equal(r3);
  });
  describe('grantTokens', () => {
    beforeEach(async function () {
      this.beneficiary = accounts[2];
      await this.reserveContract.getGrant(this.beneficiary, 0).should.be.rejectedWith(EVMThrow);
    });
    it('should create a Vault and add it to `grants` list', async function () {
      await this.reserveContract.grantTokens(this.beneficiary, 0, 100, {
        from: this.lotusAddress
      }).should.be.fulfilled;
      await this.reserveContract.getGrant(this.beneficiary, 0).should.be.fulfilled;
    });
    it('should the created Vault have the correct balance', async function () {
      await this.reserveContract.grantTokens(this.beneficiary, 0, 100, {
        from: this.lotusAddress
      }).should.be.fulfilled;
      const vault = await this.reserveContract.getGrant.call(this.beneficiary, 0);
      (await this.token.balanceOf.call(vault)).should.be.bignumber.equal(100);
    });
    it('should the created Vault have the right releaseDate', async function () {
      const releaseDates = [
        await this.reserveContract.releaseDates.call(0),
        await this.reserveContract.releaseDates.call(1),
        await this.reserveContract.releaseDates.call(2)
      ];
      let vault;
      for (var index=0; index < releaseDates.length; index++) {
        await this.reserveContract.grantTokens(this.beneficiary, index, 100, {
          from: this.lotusAddress
        }).should.be.fulfilled;
        vault = Vault.at(await this.reserveContract.getGrant.call(this.beneficiary, index));
        (await vault.releaseTime.call()).should.be.bignumber.equal(releaseDates[index]);
      }
    });
    it('should fails when type is incorrect', async function () {
      const incorrectType1 = 3;
      const incorrectType2 = -1;
      await this.reserveContract.grantTokens(this.beneficiary, incorrectType1, 100, {
        from: this.lotusAddress
      }).should.be.rejectedWith(EVMThrow);
      await this.reserveContract.grantTokens(this.beneficiary, incorrectType2, 100, {
        from: this.lotusAddress
      }).should.be.rejectedWith(EVMThrow);
    });
    it('should prevent non-owners from execution', async function () {
      const nonOwner = accounts[0];
      nonOwner.should.be.not.equal(this.lotusAddress);
      await this.reserveContract.grantTokens(this.beneficiary, 0, 100, {
        from: nonOwner
      }).should.be.rejectedWith(EVMThrow);
    });
    it('should fails when value is greater than the reserve', async function () {
      const type = 0;
      const reserve = await this.reserveContract.reserves.call(type);
      await this.reserveContract.grantTokens(this.beneficiary, type, reserve.plus(1), {
        from: this.lotusAddress
      }).should.be.rejectedWith(EVMThrow);
    });
    it('should subtract the correct value from the target reserve', async function () {
      const initialReserves = [
        await this.reserveContract.reserves.call(0),
        await this.reserveContract.reserves.call(1),
        await this.reserveContract.reserves.call(2)
      ];
      const transferAmount = 1000;
      for (var index=0; index < initialReserves.length; index++) {
        await this.reserveContract.grantTokens(this.beneficiary, index, transferAmount, {
          from: this.lotusAddress
        }).should.be.fulfilled;
      }
      const finalReserves = [
        await this.reserveContract.reserves.call(0),
        await this.reserveContract.reserves.call(1),
        await this.reserveContract.reserves.call(2)
      ];
      finalReserves.forEach((finalReserve, index) => {
        finalReserve.should.be.bignumber.equal(initialReserves[index].minus(transferAmount));
      });
    });
  });
  describe('revokeTokenGrant (after release)', () => {
    beforeEach(async function () {
      await increaseTimeTo(this.afterRelease);
      this.beneficiary = accounts[2];
      await this.reserveContract.grantTokens(this.beneficiary, 0, 111, {
        from: this.lotusAddress
      }).should.be.fulfilled;
    });
    describe('should remove the correct Vault from the `grants` list', () => {
      beforeEach(async function () {
        await this.reserveContract.grantTokens(this.beneficiary, 0, 222, {
          from: this.lotusAddress
        }).should.be.fulfilled;
        await this.reserveContract.grantTokens(this.beneficiary, 0, 333, {
          from: this.lotusAddress
        }).should.be.fulfilled;
      });
      for (let i=1; i<=3; i++) {
        it(`remove vault #${i}`, async function () {
          const index = 1 * (i - 1);
          const value = 111 * i;
          const vault = Vault.at(await this.reserveContract.getGrant.call(this.beneficiary, index));

          // checking preconditions
          (await vault.revocable.call()).should.be.true;
          (await this.token.balanceOf(vault.address)).should.be.bignumber.equal(value);
          await this.reserveContract.getGrant.call(this.beneficiary, 2).should.be.fulfilled;

          // remove grant
          await this.reserveContract.revokeTokenGrant(this.beneficiary, index, {
            from: this.lotusAddress
          }).should.be.fulfilled;

          // actual test
          const remainValidVaults = [111, 222, 333].filter(x => x !== value);
          const v1 = Number(await this.token.balanceOf(await this.reserveContract.getGrant.call(this.beneficiary, 0)));
          const v2 = Number(await this.token.balanceOf(await this.reserveContract.getGrant.call(this.beneficiary, 1)));

          v1.should.be.bignumber.oneOf(remainValidVaults);
          v2.should.be.bignumber.oneOf(remainValidVaults);
          v1.should.be.not.equal(v2);
          await this.reserveContract.getGrant.call(this.beneficiary, 2).should.be.rejectedWith(EVMThrow);

          // checking postconditions
          (await vault.revocable.call()).should.be.false;
          (await this.token.balanceOf(vault.address)).should.be.bignumber.equal(0);

        });
      }
    });
    it('should Vault balance be equal to 0 after revoke', async function () {
      const vaultAddress = await this.reserveContract.getGrant.call(this.beneficiary, 0);
      (await this.token.balanceOf(vaultAddress)).should.be.bignumber.equal(111);
      await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
        from: this.lotusAddress
      }).should.be.fulfilled;
      (await this.token.balanceOf(vaultAddress)).should.be.bignumber.equal(0);
    });
    it('should fails when the Vault was caimed', async function () {
      const vault = Vault.at(await this.reserveContract.getGrant.call(this.beneficiary, 0));
      await vault.claim({ from: this.beneficiary }).should.be.fulfilled;

      await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
        from: this.lotusAddress
      }).should.be.rejectedWith(EVMThrow);
    });
    it('should fails when _holder is not in `grants` list', async function () {
      const nonHolder = accounts[3];
      nonHolder.should.be.not.equal(this.beneficiary);
      // due grants.length is 1, nonHolder is not in grants list
      await this.reserveContract.revokeTokenGrant(nonHolder, 0, {
        from: this.lotusAddress
      }).should.be.rejectedWith(EVMThrow);
    });
    it('should fails with a valid _holder but invalid _grantId in `grants` list', async function () {
      const index = 1;
      // due grants[this.beneficiary].length is 1, index = 1 an invalid _grantId
      await this.reserveContract.revokeTokenGrant(this.beneficiary, index, {
        from: this.lotusAddress
      }).should.be.rejectedWith(EVMThrow);
    });
    it('should prevent non-owners from execution', async function () {
      const nonOwner = accounts[0];
      nonOwner.should.be.not.equal(this.lotusAddress);
      await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
        from: nonOwner
      }).should.be.rejectedWith(EVMThrow);
    });
    it('should add the correct value to the target reserve', async function () {
      const vaultValue = 111;
      await this.reserveContract.grantTokens(this.beneficiary, 1, vaultValue, {
        from: this.lotusAddress
      }).should.be.fulfilled;
      await this.reserveContract.grantTokens(this.beneficiary, 2, vaultValue, {
        from: this.lotusAddress
      }).should.be.fulfilled;

      const initialReserves = [
        await this.reserveContract.reserves.call(0),
        await this.reserveContract.reserves.call(1),
        await this.reserveContract.reserves.call(2)
      ];

      for (var index=0; index < 3; index++) {
        await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
          from: this.lotusAddress
        }).should.be.fulfilled;
      }

      const finalReserves = [
        await this.reserveContract.reserves.call(0),
        await this.reserveContract.reserves.call(1),
        await this.reserveContract.reserves.call(2)
      ];
      finalReserves.forEach((finalReserve, index) => {
        finalReserve.should.be.bignumber.equal(initialReserves[index].plus(vaultValue));
      });
    });
  });
});
