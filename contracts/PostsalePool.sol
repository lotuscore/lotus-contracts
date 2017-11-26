pragma solidity ^0.4.11;

import './LotusToken.sol';
import './LotusReserve.sol';

contract PostsalePool {

  LotusToken public token;
  mapping (address => uint) public holders;

  bool closed = false;
  uint tokensSold;
  uint tokensSupply;

  modifier onlyTokenOwner() {
    require(msg.sender == token.owner());
    _;
  }

  function PostsalePool(address tokenAddress, uint _tokensSupply) {
    token = LotusToken(tokenAddress);
    tokensSupply = _tokensSupply;
  }

  function approve(address _holder, uint _value) onlyTokenOwner public {
    require(closed == false);
    holders[_holder] = holders[_holder] + _value;
  }

  function close() onlyTokenOwner public {
    require(closed == false);
    require(token.balanceOf(this) > 0);
    tokensSold = token.balanceOf(this);
    closed = true;
  }

  function allowance(address _holder) public constant returns (uint) {
    require(closed);
    return holders[_holder]/(tokensSupply - tokensSold);
  }

  function claim(address _holder) public {
    require(closed);
    token.transfer(_holder, this.allowance(_holder));
  }

}
