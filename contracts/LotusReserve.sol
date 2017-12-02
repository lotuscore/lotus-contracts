pragma solidity ^0.4.11;
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './PostsalePool.sol';
import './LotusToken.sol';
import './Vault.sol';


contract LotusReserve is Ownable {
  using SafeMath for uint256;

  bool initialized = false;
  uint256 initialReserves;
  LotusToken public token;
  PostsalePool postsalePool;
  uint256 postsaleTokens;
  mapping (address => Vault[]) public grants;
  event tokensGranted(address _beneficiary, uint8 _type, uint256 _value);

  uint[3] public reserves;
  uint64[3] public releaseDates;

  address[] grantedVaults;

  function LotusReserve(LotusToken _token) {
    token = _token;
  }

  function init(uint256 totalReserves, PostsalePool _postsalePool) {
    require(initialized == false);
    require(totalReserves == token.balanceOf(this));
    uint64 tokenReleaseDate = uint64(token.releaseDate());
    initialized = true;
    initialReserves = totalReserves;
    postsalePool = _postsalePool;

    /*
     * 0 == community
     * 1 == marketing and partnerships
     * 2 == development team and advisors
     */

    reserves[0] = totalReserves.div(4);
    reserves[1] = totalReserves.div(4);
    reserves[2] = totalReserves.div(2);

    releaseDates[0] = tokenReleaseDate + 4 weeks;
    releaseDates[1] = tokenReleaseDate + 8 weeks;
    releaseDates[2] = tokenReleaseDate + 16 weeks;
  }

  /**
   * @dev Create a vault time locked to be released according to releaseDates array
   *
   * @param _beneficiary The address which will release the funds.
   * @param _type 0, 1 or 2 for `community`, `partnership` and `team` respectively.
   * @param _value The amount of tokens to be locked in the vault.
   */
  function grantTokens(address _beneficiary, uint8 _type, uint256 _value) onlyOwner public {
    require(initialized);
    require(_type <= 2);
    require(token.balanceOf(this) >= _value);

    // Check is not needed because sub(_value) will already throw if this condition is not met
    // require (reserves[_type] > _value);
    reserves[_type] = reserves[_type].sub(_value);

    Vault vault = new Vault(token, _beneficiary, releaseDates[_type]);
    grants[_beneficiary].push(vault);
    grantedVaults.push(vault);

    token.transfer(vault, _value);
    tokensGranted(_beneficiary, _type, _value);
  }

  function getVaultType(Vault vault) internal constant returns (uint8) {
    uint64 releaseTime = vault.releaseTime();
    return releaseTime == releaseDates[0] ? 0 : releaseTime == releaseDates[1] ? 1 : 2;
  }

  function revokeTokenGrant(address _holder, uint256 _grantId) onlyOwner public {
    Vault vault = grants[_holder][_grantId];
    vault.revoke();

    // remove vault from array
    delete grants[_holder][_grantId];
    grants[_holder][_grantId] = grants[_holder][grants[_holder].length.sub(1)];
    grants[_holder].length -= 1;

    // add vault to this contract list
    grants[this].push(vault);
  }

  function releaseRevokedBalance(uint256 _index) onlyOwner public {
    Vault vault = grants[this][_index];
    uint256 vaultValue = token.balanceOf(vault);
    uint8 _type = getVaultType(vault);
    reserves[_type] = reserves[_type].add(vaultValue);
    vault.release();
  }

  function claimPostsale() public {
    postsaleTokens = postsalePool.allowance(this);

    reserves[0] = reserves[0].add(postsaleTokens.div(4));
    reserves[1] = reserves[1].add(postsaleTokens.div(4));
    reserves[2] = reserves[2].add(postsaleTokens.div(2));

    postsalePool.claim(this);
  }

  function createPostsaleVaults() public {
    // TODO: fix it
    require(postsaleTokens > 0);
    uint256 postsaleCut;
    uint256 vaultBalance;
    uint8 _type;
    Vault vault;
    for (uint256 i = 0; i < grantedVaults.length; i++) {
      vault = Vault(grantedVaults[i]);
      vaultBalance = token.balanceOf(vault);
      if (vaultBalance > 0) {
        postsaleCut = vaultBalance.mul(postsaleTokens).div(initialReserves);
        _type = getVaultType(vault);
        grantTokens(vault.beneficiary(), _type, postsaleCut);
      }
    }
  }

  function balance() public constant returns (uint) {
    return token.balanceOf(this);
  }
}
