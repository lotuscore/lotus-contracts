pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import './LotusToken.sol';

contract LotusCrowdsale is CappedCrowdsale {

  bool initialized = false;

  function LotusCrowdsale(uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _cap, address fundAccount)
    CappedCrowdsale(_cap)
    Crowdsale(_startTime, _endTime, _rate, fundAccount) {
  }

  function init(address tokenAddress) public {
    require(initialized == false);
    initialized = true;
    token = LotusToken(tokenAddress);
  }

}
