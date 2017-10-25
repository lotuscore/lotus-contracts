pragma solidity ^0.4.11;
import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import './LotusReserve.sol';


contract LotusToken is MintableToken {
  string public name = 'Lotus Token';
  string public symbol = 'LTS';
  uint public decimals = 18;
  uint public releaseDate;
  LotusReserve public reserve;

  function LotusToken(address mainAddress, uint64 _releaseDate) {
    // `reserveSupply` hardcoded to match with `reserves` in LotusReserve.sol contract
    uint reserveSupply = 400000000 * (10 ** decimals);

    reserve = new LotusReserve(this, _releaseDate);
    releaseDate = _releaseDate;
    totalSupply = reserveSupply;
    balances[reserve] = reserveSupply;

    reserve.transferOwnership(mainAddress);
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    require(now > releaseDate);
    return super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(now > releaseDate);
    return super.transferFrom(_from, _to, _value);
  }

  function finishMinting() onlyOwner public returns (bool) {
    require(now > releaseDate);
    return super.finishMinting();
  }

}
