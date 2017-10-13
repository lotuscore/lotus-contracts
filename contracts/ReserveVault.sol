pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20Basic.sol';
import './TokenVesting.sol';

/**
 * @title ReserveVault
 * @dev This contract is used for storing the reserve while the crowdsale
 * is in progress and creates vesting rules for the holders.
 */
contract ReserveVault is Ownable {
  using SafeERC20 for ERC20Basic;

  address[] holders;
  uint holdingTime;
  uint256 release;

  ERC20Basic token;

  /**
   * @dev Transfer tokens from one address to another
   * @param _release uint256 start time vesting time
   * @param _holdingTime weeks until release after the start
   */
  function ReserveVault(uint256 _release, uint _holdingTime) {
    token = ERC20Basic(msg.sender);
    release = _release;
    holdingTime = _holdingTime;
  }

  function grantTokens(address _beneficiary, uint256 _value) onlyOwner public returns (uint) {
    require(_value <= token.balanceOf(this));
    address vestingContract = new TokenVesting(
      _beneficiary,
      release + (holdingTime * 1 weeks), // vesting period start
      (holdingTime + 4) * 1 weeks, // cliff
      (holdingTime + 16) * 1 weeks, // vesting duration
      true // revocable
    );
    token.safeTransfer(vestingContract, _value);
    return holders.push(vestingContract);
  }

  function revoke(address vestingContract) onlyOwner public {
    require(vestingContract != 0x0);
    TokenVesting(vestingContract).revoke(token);
  }

}
