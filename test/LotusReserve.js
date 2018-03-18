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
    this.postsalePool = await PostsalePool.new(this.token.address, TOKEN_SUPPLY);
    this.reserveContract = LotusReserve.at(await this.token.reserve.call());

  });
  it('should `init` method success when it is initiated with positive balance', async function () {
    await this.token.mint(this.reserveContract.address, this.reserveSupply);
    await this.reserveContract.init(this.postsalePool.address).should.be.fulfilled;
  });
  it('should `init` method fails when it is initiated without balance', async function () {
    await this.reserveContract.init(this.postsalePool.address).should.be.rejectedWith(EVMThrow);
  });
  it('should `init` method fails when it is called more than once ', async function () {
    await this.token.mint(this.reserveContract.address, this.reserveSupply);
    await this.reserveContract.init(this.postsalePool.address).should.be.fulfilled;
    await this.reserveContract.init(this.postsalePool.address).should.be.rejectedWith(EVMThrow);
  });
  describe('after initialization', () => {
    beforeEach(async function () {
      await this.token.mint(this.reserveContract.address, this.reserveSupply);
      await this.reserveContract.init(this.postsalePool.address);
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
      it('should the created Vault works after release', async function () {
        await increaseTimeTo(this.afterRelease + duration.weeks(17));
        await this.reserveContract.grantTokens(this.beneficiary, 0, 100, {
          from: this.reserveAccount
        }).should.be.fulfilled;
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

            // use assert <condition> instead `balanceVaultX.should.be.bignumber.oneOf(remainValidVaults)`
            // because `oneOf` is not supported by chai-bignumber
            (remainValidVaults[0].equals(balanceVault1) || remainValidVaults[1].equals(balanceVault1)).should.be.true;
            (remainValidVaults[0].equals(balanceVault2) || remainValidVaults[1].equals(balanceVault2)).should.be.true;
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
        await this.reserveContract.revokeTokenGrant(this.beneficiary, 0, {
          from: this.reserveAccount
        }).should.be.fulfilled;
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
      const vaultType = parseInt(Math.random()*3); // 0, 1 or 2
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

      // make sure Vault release time has passed
      await increaseTimeTo(this.afterRelease + duration.weeks(17));

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
    it('should createPostsaleVaults create one Vault per each Vault previous to crowdsale end', async function () {
      const tokenOwner = await this.token.owner.call();
      const beneficiary = accounts[2];

      const vault1Balance = new BigNumber(1000 * LTS);
      const vault2Balance = new BigNumber(2000 * LTS);
      const endCrowdsale = async () => {
        // simulate crowdsale end
        await increaseTimeTo(this.afterRelease);
        // transfer unsold tokens to postsalePool and close
        const totalSupply = await this.token.totalSupply.call();
        await this.token.mint(
          this.postsalePool.address,
          TOKEN_SUPPLY.sub(totalSupply));
        await this.postsalePool.close({ from: tokenOwner }).should.be.fulfilled;
      };

      // appproving reserveBalance in postsalePool (simulating postsalePool creation process)
      const reserveBalance = await this.token.balanceOf.call(this.reserveContract.address);
      await this.postsalePool.approve(this.reserveContract.address, reserveBalance).should.be.fulfilled;

      // create presale vault
      await this.reserveContract.grantTokens(beneficiary, 0, vault1Balance, {
        from: this.reserveAccount
      }).should.be.fulfilled;

      await endCrowdsale();

      const reserveAllowance = await this.postsalePool.allowance.call(this.reserveContract.address);
      // claim reserve tokens
      await this.reserveContract.claimPostsale().should.be.fulfilled;

      // create post sale vault (should not count for createPostsaleVaults)
      await this.reserveContract.grantTokens(beneficiary, 0, vault2Balance, {
        from: this.reserveAccount
      }).should.be.fulfilled;

      // actual test
      await this.reserveContract.grants.call(beneficiary, 2).should.be.rejectedWith(EVMThrow);
      await this.reserveContract.createPostsaleVaults({
        from: this.reserveAccount
      }).should.be.fulfilled;

      /*
       * summary:
       * grants[0] is the presale Vault with 1000 LTS
       * grants[1] is the postsale Vault with 2000 LTS
       * grants[2] is the new postsale Vault because `createPostsaleVaults`
                   reserveAllowance * %contributed
       * grants[3] should not exist
       */
      const expectedDistribution = (reserveAllowance.mul(vault1Balance).div(reserveBalance)).trunc();
      const newVault = (await this.reserveContract.grants.call(beneficiary, 2));
      (await this.token.balanceOf.call(newVault)).should.be.bignumber.equal(expectedDistribution);
      await this.reserveContract.grants.call(beneficiary, 3).should.be.rejectedWith(EVMThrow);
    });
    it('should claimPostsale distribute the allowance proportionally between the reserves', async function () {
      const tokenOwner = await this.token.owner.call();
      const poolTokens = new BigNumber(200000 * LTS);

      // appproving reserveBalance in postsalePool (simulating postsalePool creation process)
      const reserveBalance = await this.token.balanceOf.call(this.reserveContract.address);
      await this.postsalePool.approve(this.reserveContract.address, reserveBalance).should.be.fulfilled;

      // simulate crowdsale end
      await increaseTimeTo(this.afterRelease);
      // transfer unsold tokens to postsalePool and close
      await this.token.mint(this.postsalePool.address, poolTokens);
      await this.postsalePool.close({ from: tokenOwner }).should.be.fulfilled;

      const allowance = await this.postsalePool.allowance.call(this.reserveContract.address);
      allowance.should.be.bignumber.gt(0);

      const reserve1 = await this.reserveContract.reserves.call(0);
      const reserve2 = await this.reserveContract.reserves.call(1);
      const reserve3 = await this.reserveContract.reserves.call(2);

      // claim reserve tokens
      await this.reserveContract.claimPostsale().should.be.fulfilled;

      const reserve1final = await this.reserveContract.reserves.call(0);
      const reserve2final = await this.reserveContract.reserves.call(1);
      const reserve3final = await this.reserveContract.reserves.call(2);

      reserve1final.should.be.bignumber.equal(reserve1.plus(allowance.div(3)));
      reserve2final.should.be.bignumber.equal(reserve2.plus(allowance.div(3)));
      reserve3final.should.be.bignumber.equal(reserve3.plus(allowance.div(3)));

      reserve1final.plus(reserve2final).plus(reserve3final).should.be.bignumber.equal(
        await this.token.balanceOf.call(this.reserveContract.address)
      );
    });
  });
});
