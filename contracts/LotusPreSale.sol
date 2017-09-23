pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/crowdsale/Crowdsale.sol';
import './LotusToken.sol';

contract LotusPreSale is Crowdsale {

  function LotusPreSale(uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet)
    Crowdsale(_startTime, _endTime, _rate, _wallet) {
  }

  function createTokenContract() internal returns (MintableToken) {
    return new LotusToken();
  }

}
