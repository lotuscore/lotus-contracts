pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import './LotusToken.sol';

contract LotusPreSale is CappedCrowdsale {

  function LotusPreSale(uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _cap, address _wallet)
    CappedCrowdsale(_cap) Crowdsale(_startTime, _endTime, _rate, _wallet) {
  }

  function createTokenContract() internal returns (MintableToken) {
    return new LotusToken();
  }

}
