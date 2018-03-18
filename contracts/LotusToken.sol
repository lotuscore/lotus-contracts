pragma solidity ^0.4.11;
import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import './LotusReserve.sol';


contract LotusToken is MintableToken {
  string public name = 'Lotus Token';
  string public symbol = 'LTS';
  uint public decimals = 8;
  uint public releaseDate;
  LotusReserve public reserve;

  uint MAX_SUPPLY = 1000000000 * (10 ** 8);

  function LotusToken(address reserveAccount, uint64 _releaseDate) {
    releaseDate = _releaseDate;
    reserve = new LotusReserve(this);
    reserve.transferOwnership(reserveAccount);
  }

  function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
    require(totalSupply.add(_amount)<=MAX_SUPPLY);
    return super.mint(_to, _amount);
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    require(now > releaseDate || msg.sender == address(reserve));
    return super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(now > releaseDate);
    return super.transferFrom(_from, _to, _value);
  }

  function finishMinting() public returns (bool) {
    require(totalSupply==MAX_SUPPLY);
    return super.finishMinting();
  }

  function updateReleaseDate(uint64 _releaseDate) onlyOwner public returns (bool) {
    // require token is not released
    require(now < releaseDate);
    // require the change is in the future
    require(_releaseDate > now);
    // require the change is less than 3 months in the future
    require(_releaseDate < now.add(7948800));
    releaseDate = _releaseDate;
  }

}
