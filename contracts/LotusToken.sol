pragma solidity ^0.4.11;
import "zeppelin-solidity/contracts/token/MintableToken.sol";

contract LotusToken is MintableToken {
    string public name = "Lotus Token";
    string public symbol = "LTS";
    uint public decimals = 8;
    uint public INITIAL_SUPPLY = 400000000 * (10 ** decimals);

    function LotusToken() {
        totalSupply = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
    }
}
