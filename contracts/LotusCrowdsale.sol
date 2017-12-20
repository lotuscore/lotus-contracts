pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import './LotusToken.sol';
import './PostsalePool.sol';

contract LotusCrowdsale is CappedCrowdsale {

  PostsalePool postsalePool;
  bool initialized = false;
  uint MAX_SUPPLY = 1000000000 * (10 ** 8);

  function LotusCrowdsale(uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _cap, address fundAccount)
    CappedCrowdsale(_cap)
    Crowdsale(_startTime, _endTime, _rate, fundAccount) {
  }

  function init(address tokenAddress, address postsalePoolAddress) public {
    require(initialized == false);
    initialized = true;
    token = LotusToken(tokenAddress);
    postsalePool = PostsalePool(postsalePoolAddress);
  }

  function finalize() {
    require(hasEnded());
    token.mint(postsalePool, MAX_SUPPLY.sub(token.totalSupply()));
    postsalePool.close();
  }

}
