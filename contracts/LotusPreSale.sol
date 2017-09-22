pragma solidity ^0.4.11;
import 'zeppelin-solidity/contracts/crowdsale/Crowdsale.sol';
import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import './LotusToken.sol';

contract LotusPreSale is Crowdsale {
  function createTokenContract() internal returns (MintableToken) {
    return new LotusToken();
  }
}
