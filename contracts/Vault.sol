pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20Basic.sol';
import 'zeppelin-solidity/contracts/token/TokenTimelock.sol';


contract Vault is TokenTimelock, Ownable {

  uint8 public type_id;
  bool public revocable = true;

  function Vault(ERC20Basic _token, address _beneficiary, uint64 _releaseTime, uint8 _type)
    TokenTimelock(_token, _beneficiary, _releaseTime) {
      require(_beneficiary != owner);
      type_id = _type;
    }

  event VaultRevoked();
  event VaultClaimed();

  function claim() public {
    require(msg.sender == beneficiary);
    require(revocable);
    revocable = false;
    VaultClaimed();
  }

  function get_type() public constant returns (string) {
    if (type_id == 0) {
      return 'community';
    }
    else if (type_id == 1) {
      return 'marketing and partnerships';
    }
    else if (type_id == 2) {
      return 'development team and advisors';
    }
  }

  function revoke() public onlyOwner {
    require(revocable);
    beneficiary = owner;
    revocable = false;
    VaultRevoked();
  }

  function revoked() public constant returns (bool) {
    return beneficiary == owner;
  }

  function balance() public constant returns (uint) {
    return token.balanceOf(this);
  }

}
