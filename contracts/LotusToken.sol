pragma solidity ^0.4.11;
import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/token/LimitedTransferToken.sol";

contract LotusToken is MintableToken, LimitedTransferToken {
  string public name = "Lotus Token";
  string public symbol = "LTS";
  uint public decimals = 18;
  uint public INITIAL_SUPPLY = 400000000 * (10 ** decimals);

  // Create token as not transferable
  event TransferableChanged(bool transferable);
  bool public transferable = false;

  function LotusToken() {
    totalSupply = INITIAL_SUPPLY;
    balances[tx.origin] = INITIAL_SUPPLY;
  }

  function makeTransferable(bool _transferable) onlyOwner public returns (bool) {
    require(transferable == false);
    transferable = true;
    TransferableChanged(transferable);
    return true;
  }

  modifier canTransfer(address _sender, uint256 _value) {
    require(transferable || msg.sender == owner);
    _;
  }
}
