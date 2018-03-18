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
  event vaultGranted(address _beneficiary, uint8 _type, uint256 _value);

  uint[3] public reserves;
  uint64[3] public releaseDates;

  address[] grantedVaults;

  function LotusReserve(LotusToken _token) {
    token = _token;
  }

  function init(PostsalePool _postsalePool) {
    require(initialized == false);
    require(token.balanceOf(this) > 0);
    initialReserves = token.balanceOf(this);
    postsalePool = _postsalePool;

    /*
     * 0 == community
     * 1 == marketing and partnerships
     * 2 == development team and advisors
     */

    reserves[0] = initialReserves.div(3);
    reserves[1] = initialReserves.div(3);
    reserves[2] = initialReserves.div(3);

    calculateReleaseDates();
    initialized = true;
  }

  function calculateReleaseDates() {
    require(initialized == false || owner == msg.sender);
    uint64 tokenReleaseDate = uint64(token.releaseDate());
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
    uint64 _releaseTime = releaseDates[_type];

    if (_releaseTime < now) {
      // releaseTime should be in the future 3 minutes ~ 12 blocks
      _releaseTime = uint64(now) + 3 minutes;
    }

    Vault vault = new Vault(token, _beneficiary, _releaseTime, _type);
    grants[_beneficiary].push(vault);
    if (postsalePool.closed() == false) {
      grantedVaults.push(vault);
    }

    token.transfer(vault, _value);
    vaultGranted(_beneficiary, _type, _value);
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
    uint8 _type = vault.type_id();
    reserves[_type] = reserves[_type].add(vaultValue);
    vault.release();
  }

  function claimPostsale() public {
    postsaleTokens = postsalePool.allowance(this);
    reserves[0] = reserves[0].add(postsaleTokens.div(3));
    reserves[1] = reserves[1].add(postsaleTokens.div(3));
    reserves[2] = reserves[2].add(postsaleTokens.div(3));
    postsalePool.claim(this);
  }

  function createPostsaleVaults() onlyOwner public {
    require(postsaleTokens > 0);
    uint256 postsaleCut;
    uint256 vaultBalance;
    Vault vault;
    for (uint256 i = 0; i < grantedVaults.length; i++) {
      vault = Vault(grantedVaults[i]);
      vaultBalance = token.balanceOf(vault);
      if (vaultBalance > 0) {
        postsaleCut = vaultBalance.mul(postsaleTokens).div(initialReserves);
        grantTokens(vault.beneficiary(), vault.type_id(), postsaleCut);
      }
    }
  }

  function balance() public constant returns (uint) {
    return token.balanceOf(this);
  }
}
