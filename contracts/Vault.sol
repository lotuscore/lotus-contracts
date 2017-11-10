pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20Basic.sol';
import 'zeppelin-solidity/contracts/token/TokenTimelock.sol';


contract Vault is TokenTimelock, Ownable {

  bool public revocable = true;

  function Vault(ERC20Basic _token, address _beneficiary, uint64 _releaseTime)
    TokenTimelock(_token, _beneficiary, _releaseTime) {
      require(_beneficiary != owner);
    }

  event Revoked();
  event Claimed();

  function claim() public {
    require(msg.sender == beneficiary);
    require(revocable);
    revocable = false;
    Claimed();
  }

  function revoke() public onlyOwner {
    require(revocable);
    beneficiary = owner;
    revocable = false;
    Revoked();
  }

  function revoked() public constant returns (bool) {
    return beneficiary == owner;
  }

  function balance() public constant returns (uint) {
    return token.balanceOf(this);
  }

}
