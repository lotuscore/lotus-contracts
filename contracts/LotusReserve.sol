pragma solidity ^0.4.11;
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import './LotusToken.sol';
import './Vault.sol';


contract LotusReserve is Ownable {
  using SafeMath for uint256;

  LotusToken public token;
  mapping (address => Vault[]) public grants;
  event tokensGranted(address _beneficiary, uint8 _type, uint _value);

  // use community-partnership-team order as the pattern for the arrays below
  // uint[3] public released = [0, 0, 0];
  uint[3] public reserves = [
    100000000 * (10 ** 18),
    100000000 * (10 ** 18),
    200000000 * (10 ** 18)
  ]; // total reserves 400000000 * (10 ** 18); should match with this contract balance
  uint64[3] public releaseDates;

  function LotusReserve(LotusToken _token, uint64 releaseDate) {
    releaseDates[0] = releaseDate + 4 weeks;
    releaseDates[1] = releaseDate + 8 weeks;
    releaseDates[2] = releaseDate + 12 weeks;
    token = _token;
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

    // Check is not needed because sub(_value) will already throw if this condition is not met
    // require (_value > released[_type]);
    reserves[_type] = reserves[_type].sub(_value);

    Vault vault = new Vault(token, _beneficiary, releaseDates[_type]);
    grants[_beneficiary].push(vault);

    token.transfer(vault, _value);
    tokensGranted(_beneficiary, _type, _value);
  }

  function revokeTokenGrant(address _holder, uint256 _grantId) onlyOwner public {
    Vault vault = Vault(grants[_holder][_grantId]);

    uint64 releaseTime = vault.releaseTime();
    uint8 _type = releaseTime == releaseDates[0] ? 0 : releaseTime == releaseDates[1] ? 1 : 2;

    uint vaultValue = token.balanceOf(vault);
    vault.revoke();

    // update reserves
    reserves[_type] = reserves[_type].add(vaultValue);

    // remove vault from array
    delete grants[_holder][_grantId];
    grants[_holder][_grantId] = grants[_holder][grants[_holder].length.sub(1)];
    grants[_holder].length -= 1;

  }

}
