pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import 'zeppelin-solidity/contracts/crowdsale/Crowdsale.sol';
import './LotusToken.sol';
import './LotusReserve.sol';

contract LotusPresale is CappedCrowdsale {

  bool initialized = false;

  function LotusPresale(uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _cap, address fundAccount)
    CappedCrowdsale(_cap)
    Crowdsale(_startTime, _endTime, _rate, fundAccount) {
  }

  function use(address tokenAddress) public {
    require(initialized == false);
    require(LotusToken(tokenAddress).releaseDate() > endTime);

    token = LotusToken(tokenAddress);
    initialized = true;
  }

  /**
   * @dev In order to allow minting in the public crowdsale transfer the
   * ownership of the token contract
   */
  function transferTokenOwnership(address crowdsaleAddress) public {
    require(now > endTime);
    require(Crowdsale(crowdsaleAddress).hasEnded() == false);
    require(msg.sender == LotusToken(token).reserve().owner());
    token.transferOwnership(crowdsaleAddress);
  }

}
