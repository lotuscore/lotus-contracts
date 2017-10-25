pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20Basic.sol';
import 'zeppelin-solidity/contracts/token/TokenTimelock.sol';


contract Vault is TokenTimelock, Ownable {

  ERC20Basic public token;
  bool public revocable = true;

  function Vault(ERC20Basic _token, address _beneficiary, uint64 _releaseTime)
    TokenTimelock(_token, _beneficiary, _releaseTime) {}

  event Revoked();
  event Claimed();

  function claim() public {
    require(msg.sender == beneficiary);
    revocable = false;
    Claimed();
  }

  function revoke() public onlyOwner {
    require(revocable);

    uint256 balance = token.balanceOf(this);

    token.safeTransfer(owner, balance);
    revocable = false;
    Revoked();
  }

}
