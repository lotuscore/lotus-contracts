pragma solidity ^0.4.11;
import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import './Vault.sol';


contract LotusToken is MintableToken {
  string public name = 'Lotus Token';
  string public symbol = 'LTS';
  uint public decimals = 18;

  uint communityTokens = 100000000 * (10 ** decimals);
  uint partnershipTokens = 100000000 * (10 ** decimals);
  uint teamTokens = 200000000 * (10 ** decimals);

  mapping (address => Vault[]) public grants;
  event tokensGranted(address _beneficiary, uint8 _type, uint _value);

  // use community-partnership-team order as the pattern for the arrays below
  uint[3] public released = [0, 0, 0];
  uint[3] public reserve = [communityTokens, partnershipTokens, teamTokens];
  uint64[3] releaseDates = [1485820800, 1485820800, 1485820800];

  function LotusToken() {
    totalSupply = communityTokens + partnershipTokens + teamTokens;
    balances[this] = totalSupply;
  }

  /**
   * @dev Create a vault time locked to be released according to releaseDates array
   *
   * @param _beneficiary The address which will release the funds.
   * @param _type 0, 1 or 2 for `community`, `partnership` and `team` respectively.
   * @param _value The amount of tokens to be locked in the vault.
   */
  function grantTokens(address _beneficiary, uint8 _type, uint _value) onlyOwner public {
    require(_type <= 2);

    // update reserves released
    uint total_released = released[_type].add(_value);
    require(total_released <= reserve[_type]);
    released[_type] = total_released;

    Vault vault = new Vault(this, _beneficiary, releaseDates[_type]);
    grants[_beneficiary].push(vault);

    transfer(vault, _value);
    tokensGranted(_beneficiary, _type, _value);
  }

  function revokeTokenGrant(address _holder, uint256 _grantId) onlyOwner public {
    Vault vault = Vault(grants[_holder][_grantId]);
    // uint8 _type = vault.releaseTime == releaseDates[0] ? 0 : vault.releaseTime == releaseDates[1] ? 1 : 2;
    uint8 _type = 0;

    uint vaultValue = balanceOf(vault);
    vault.revoke();


    // update reserves released
    released[_type] = released[_type].sub(vaultValue);

    // remove vault from array
    delete grants[_holder][_grantId];
    grants[_holder][_grantId] = grants[_holder][grants[_holder].length.sub(1)];
    grants[_holder].length -= 1;

  }

}
