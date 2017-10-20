pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import './LotusToken.sol';


contract LotusPresale is CappedCrowdsale {
  function LotusPresale(uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _cap, address _wallet)
    CappedCrowdsale(_cap)
    Crowdsale(_startTime, _endTime, _rate, _wallet) {
  }

  function createTokenContract() internal returns (MintableToken) {
    return new LotusToken();
  }

  /**
   * @dev In order to allow minting in the public crowdsale and manage reserves
   * transfer control of the token contract to the main lotus wallet
   */
  function transferTokenOwnership() public {
    require(msg.sender == wallet);
    require(now < startTime || now > endTime);
    token.transferOwnership(wallet);
  }

}
