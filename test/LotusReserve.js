/* globals web3, require, artifacts, contract, it, beforeEach, describe */
import { increaseTimeTo, duration } from 'zeppelin-solidity/test/helpers/increaseTime';
import latestTime from 'zeppelin-solidity/test/helpers/latestTime';
import EVMThrow from 'zeppelin-solidity/test/helpers/EVMThrow';

import {
  TOKEN_SUPPLY // BigNumber(1000000000 * (10 ** 8))
} from './helpers/globals';

const BigNumber = web3.BigNumber;
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const LotusReserve = artifacts.require('./LotusReserve.sol');
const LotusToken = artifacts.require('./LotusToken.sol');
const PostsalePool = artifacts.require('./PostsalePool.sol');
const Vault = artifacts.require('./Vault.sol');

contract('LotusReserve', (accounts) => {

  beforeEach(async function () {
    const startDate = latestTime() + duration.days(15);
    const endTime = startDate + duration.days(1);
    const releaseDate = endTime + duration.days(1);
    this.afterRelease = releaseDate + duration.seconds(1);
    this.reserveAccount = accounts[1];
    this.token = await LotusToken.new(this.reserveAccount, releaseDate);

    this.reserveSupply = TOKEN_SUPPLY.mul(3).div(10);
    this.postsalePool = new PostsalePool(this.token.address, TOKEN_SUPPLY);
    this.reserveContract = LotusReserve.at(await this.token.reserve.call());

    // add token to reserve
    await this.token.mint(this.reserveContract.address, this.reserveSupply);
  });
  it('should `init` method success when it is initiated with the exact reserveSupply amount', async function () {
    await this.reserveContract.init(this.reserveSupply, this.postsalePool.address).should.be.fulfilled;
  });
  it('should `init` method fails when it is initiated without the exact reserveSupply amount', async function () {
    await this.reserveContract.init(this.reserveSupply.plus(1), this.postsalePool.address).should.be.rejectedWith(EVMThrow);
  });
  it('should `init` method fails when it is called more than once ', async function () {
    await this.reserveContract.init(this.reserveSupply, this.postsalePool.address).should.be.fulfilled;
    await this.reserveContract.init(this.reserveSupply, this.postsalePool.address).should.be.rejectedWith(EVMThrow);
  });
  describe('after initialization', () => {
    beforeEach(async function () {
      // await this.token.mint(this.reserveContract.address, this.reserveSupply);
      await this.reserveContract.init(this.reserveSupply, this.postsalePool.address);
    });

    it('should reserves balance be equal to reserveSupply', async function () {
      const reserveAmount = await this.token.balanceOf.call(this.reserveContract.address);
      const reserveExpected = this.reserveSupply;
      reserveAmount.should.be.bignumber.equal(reserveExpected);
    });
    it('should reserveAccount be the reserve owner', async function() {
      (await this.reserveContract.owner.call()).should.be.equal(this.reserveAccount);
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
        await this.reserveContract.grants(this.beneficiary, 0).should.be.rejectedWith(EVMThrow);
      });
      it('should create a Vault and add it to `grants` list', async function () {
        await this.reserveContract.grantTokens(this.beneficiary, 0, 100, {
          from: this.reserveAccount
        }).should.be.fulfilled;
        await this.reserveContract.grants(this.beneficiary, 0).should.be.fulfilled;
      });
      it('should the created Vault have the correct balance', async function () {
        await this.reserveContract.grantTokens(this.beneficiary, 0, 100, {
          from: this.reserveAccount
        }).should.be.fulfilled;
        const vault = await this.reserveContract.grants.call(this.beneficiary, 0);
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
            from: this.reserveAccount
          }).should.be.fulfilled;
          vault = Vault.at(await this.reserveContract.grants.call(this.beneficiary, index));
          (await vault.releaseTime.call()).should.be.bignumber.equal(releaseDates[index]);
        }
      });
      it('should fails when type is incorrect', async function () {
        const incorrectType1 = 3;
        const incorrectType2 = -1;
        await this.reserveContract.grantTokens(this.beneficiary, incorrectType1, 100, {
          from: this.reserveAccount
        }).should.be.rejectedWith(EVMThrow);
        await this.reserveContract.grantTokens(this.beneficiary, incorrectType2, 100, {
          from: this.reserveAccount
        }).should.be.rejectedWith(EVMThrow);
      });
      it('should prevent non-owners from execution', async function () {
        const nonOwner = accounts[0];
        nonOwner.should.be.not.equal(this.reserveAccount);
        await this.reserveContract.grantTokens(this.beneficiary, 0, 100, {
          from: nonOwner
        }).should.be.rejectedWith(EVMThrow);
      });
      it('should fails when value is greater than the reserve', async function () {
        const type = 0;
        const reserve = await this.reserveContract.reserves.call(type);
        await this.reserveContract.grantTokens(this.beneficiary, type, reserve.plus(1), {
          from: this.reserveAccount
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
            from: this.reserveAccount
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
    describe('revokeTokenGrant', () => {
      beforeEach(async function () {
        this.beneficiary = accounts[2];
        await this.reserveContract.grantTokens(this.beneficiary, 0, 111, {
          from: this.reserveAccount
        }).should.be.fulfilled;
      });
      describe('should remove the correct Vault from the `grants` list', () => {
        beforeEach(async function () {
          await this.reserveContract.grantTokens(this.beneficiary, 0, 222, {
            from: this.reserveAccount
          }).should.be.fulfilled;
          await this.reserveContract.grantTokens(this.beneficiary, 0, 333, {
            from: this.reserveAccount
          }).should.be.fulfilled;
        });
        for (let i=1; i<=3; i++) {
          it(`remove vault #${i}`, async function () {
            const bn = (x) => new BigNumber(x);
            const index = 1 * (i - 1);
            const value = bn(111 * i);
            const vault = Vault.at(await this.reserveContract.grants.call(this.beneficiary, index));

            // checking preconditions
            (await vault.revocable.call()).should.be.true;
            (await vault.revoked.call()).should.be.false;
            (await this.token.balanceOf(vault.address)).should.be.bignumber.equal(value);
            await this.reserveContract.grants.call(this.beneficiary, 2).should.be.fulfilled;
            // remove grant
            await this.reserveContract.revokeTokenGrant(this.beneficiary, index, {
              from: this.reserveAccount
            }).should.be.fulfilled;

            // actual test
            const remainValidVaults = [bn(111), bn(222), bn(333)].filter(x => !x.equals(value));


            const vault1 = await this.reserveContract.grants.call(this.beneficiary, 0);
            const balanceVault1 = await this.token.balanceOf(vault1);
            const vault2 = await this.reserveContract.grants.call(this.beneficiary, 1);
            const balanceVault2 = await this.token.balanceOf(vault2);

            // use assert(<condition>) instead `balanceVaultX.should.be.bignumber.oneOf(remainValidVaults)`
            // because `oneOf` is not supported by chai-bignumber
            assert(remainValidVaults[0].equals(balanceVault1) || remainValidVaults[1].equals(balanceVault1));
            assert(remainValidVaults[0].equals(balanceVault2) || remainValidVaults[1].equals(balanceVault2));
            balanceVault1.should.be.not.bignumber.equal(balanceVault2);

            await this.reserveContract.grants.call(this.beneficiary, 2).should.be.rejectedWith(EVMThrow);

            // checking postconditions
            (await vault.revocable.call()).should.be.false;
            (await vault.revoked.call()).should.be.true;
          });
        }
      });
      it('should Vault beneficiary be reserve contract owner', async function () {
        await this.reserveContract.grants.call(this.beneficiary, 0).should.be.fulfilled;
        await this.reserveContract.grants.call(this.reserveContract.address, 0).should.be.rejectedWith(EVMThrow);
        // const vaultAddress = await this.reserveContract.grants.call(this.beneficiary, 0);
        // (await this.token.balanceOf(vaultAddress)).should.be.bignumber.equal(111);
        await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
          from: this.reserveAccount
        }).should.be.fulfilled;
        // (await this.token.balanceOf(vaultAddress)).should.be.bignumber.equal(0);
        await this.reserveContract.grants.call(this.beneficiary, 0).should.be.rejectedWith(EVMThrow);
        await this.reserveContract.grants.call(this.reserveContract.address, 0).should.be.fulfilled;

      });
      it('should fails when the Vault was caimed', async function () {
        const vault = Vault.at(await this.reserveContract.grants.call(this.beneficiary, 0));
        await vault.claim({ from: this.beneficiary }).should.be.fulfilled;

        await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
          from: this.reserveAccount
        }).should.be.rejectedWith(EVMThrow);
      });
      it('should fails when _holder is not in `grants` list', async function () {
        const nonHolder = accounts[3];
        nonHolder.should.be.not.equal(this.beneficiary);
        // due grants.length is 1, nonHolder is not in grants list
        await this.reserveContract.revokeTokenGrant(nonHolder, 0, {
          from: this.reserveAccount
        }).should.be.rejectedWith(EVMThrow);
      });
      it('should fails with a valid _holder but invalid _grantId in `grants` list', async function () {
        const index = 1;
        // due grants[this.beneficiary].length is 1, index = 1 an invalid _grantId
        await this.reserveContract.revokeTokenGrant(this.beneficiary, index, {
          from: this.reserveAccount
        }).should.be.rejectedWith(EVMThrow);
      });
      it('should prevent non-owners from execution', async function () {
        const nonOwner = accounts[0];
        nonOwner.should.be.not.equal(this.reserveAccount);
        await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
          from: nonOwner
        }).should.be.rejectedWith(EVMThrow);
      });
    });
    it('should releaseRevokedBalance increase contract balance to Vault balance', async function () {
      this.beneficiary = accounts[2];
      const vaultValue = 3000;
      const vaultType = 0;
      const afterRelease = await this.reserveContract.releaseDates.call(vaultType) + duration.seconds(1);
      // grant Vault
      await this.reserveContract.grantTokens(this.beneficiary, vaultType, vaultValue, {
        from: this.reserveAccount
      }).should.be.fulfilled;
      // revoke Vault
      await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
        from: this.reserveAccount
      }).should.be.fulfilled;
      const initialReserves = await this.token.balanceOf.call(this.reserveContract.address);
      const initialReservesRecord = await this.reserveContract.reserves.call(vaultType);
      // (releaseRevokedBalance follow the same rules than release method in Vault)
      await increaseTimeTo(afterRelease);

      // releaseRevokedBalance
      await this.reserveContract.releaseRevokedBalance(0, {
        from: this.reserveAccount
      }).should.be.fulfilled;

      const finalReserves = await this.token.balanceOf.call(this.reserveContract.address);
      const finalReservesRecord = await this.reserveContract.reserves.call(vaultType);
      finalReserves.should.be.bignumber.equal(initialReserves.plus(vaultValue));
      finalReservesRecord.should.be.bignumber.equal(initialReservesRecord.plus(vaultValue));
    });
    it('should balance method show the current token balance', async function () {
      (await this.reserveContract.balance.call()).should.be.bignumber.equal(
        await this.token.balanceOf.call(this.reserveContract.address));
    });
  });
});


// test getVaultType: if type = 1, 2, 3
// grantTokens crea un registro en grantedVaults
// claimPostsale le da el allowance correcto a cada reserva
// createPostsaleVaults recorre grantedVaults y le da lo correcto a cada uno
