pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/crowdsale/CappedCrowdsale.sol';
import 'zeppelin-solidity/contracts/crowdsale/Crowdsale.sol';
import './LotusToken.sol';
import './LotusReserve.sol';
import './PostsalePool.sol';

contract LotusPresale is CappedCrowdsale {

  bool initialized = false;
  PostsalePool public postsalePool;

  function LotusPresale(uint256 _startTime, uint256 _endTime, uint256 _rate, uint256 _cap, address fundAccount)
    CappedCrowdsale(_cap)
    Crowdsale(_startTime, _endTime, _rate, fundAccount) {
  }

  function init(address tokenAddress) public {
    require(initialized == false);
    require(LotusToken(tokenAddress).releaseDate() > endTime);
    initialized = true;

    token = LotusToken(tokenAddress);

    LotusReserve reserve = LotusReserve(LotusToken(tokenAddress).reserve());
    uint tokensSupply = 1000000000 * (10 ** 8);
    uint reserveSupply = tokensSupply.mul(3).div(10);

    postsalePool = new PostsalePool(tokenAddress, tokensSupply);

    token.mint(reserve, reserveSupply);
    postsalePool.approve(reserve, reserveSupply);

    reserve.init(postsalePool);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) public payable {
    require(beneficiary != 0x0);
    require(validPurchase());

    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(rate).div(10 ** 10);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    token.mint(beneficiary, tokens);
    postsalePool.approve(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
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
