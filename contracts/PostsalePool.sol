pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './LotusToken.sol';

contract PostsalePool {
  using SafeMath for uint256;

  LotusToken public token;
  mapping (address => uint) public holders;
  address[] holdersList;

  bool public closed = false;
  uint pool;
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
    require(_value>0);
    if (holders[_holder] == 0) {
      holdersList.push(_holder);
    }
    holders[_holder] = holders[_holder] + _value;
  }

  function close() onlyTokenOwner public {
    require(closed == false);
    require(token.balanceOf(this) > 0);
    pool = token.balanceOf(this);
    closed = true;
  }

  function allowance(address _holder) public constant returns (uint) {
    require(closed);
    return holders[_holder].mul(pool).div(tokensSupply.sub(pool));
  }

  function claim(address _holder) public {
    require(closed);
    require(holders[_holder]>0);
    token.transfer(_holder, allowance(_holder));
    holders[_holder] = 0;
  }

  function claimAll(uint _i, uint _j) public {
    uint tokenHolders;
    if (_j == 0) {
      tokenHolders = holdersList.length;
    }
    else {
      tokenHolders = _j;
    }
    for (uint256 i = _i; i < tokenHolders; i++) {
      if (holders[holdersList[i]]>0 && holdersList[i]!=address(token.reserve())) {
        claim(holdersList[i]);
      }
    }
  }

}
