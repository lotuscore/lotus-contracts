pragma solidity ^0.4.2;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/LotusToken.sol";

contract TestLotusToken {

  function testInitialBalanceUsingDeployedContract() {
    LotusToken token = LotusToken(DeployedAddresses.LotusToken());
    uint expected = 400000000 * (10 ** 18);
    Assert.equal(token.getBalance(tx.origin), expected, "Owner should have 400000000*10^18 LTS initially");
  }

  function testInitialBalanceWithNewLotusToken() {
    LotusToken token = new LotusToken();
    uint expected = 400000000 * (10 ** 18);
    Assert.equal(token.getBalance(tx.origin), expected, "Owner should have 400000000*10^18 LotusToken initially");
  }

}
