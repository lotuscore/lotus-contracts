pragma solidity ^0.4.11;
import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import './ReserveVault.sol';


contract LotusToken is MintableToken {
  string public name = 'Lotus Token';
  string public symbol = 'LTS';
  uint public decimals = 18;

  address public communityVault;
  address public partnershipVault;
  address public teamVault;

  /* Lotus Token contants */
  uint public COMMUNITY_RESERVE = 100000000 * (10 ** decimals);
  uint public PARTNERSHIPS_RESERVE = 100000000 * (10 ** decimals);
  uint public TEAM_RESERVE = 200000000 * (10 ** decimals);
  uint256 public RELEASE_DATE = 1517443200; // February 1, 2018 12:00:00 AM
  address public LOTUS_PUBLIC_ADDRESS = 0x0093e66d9baea28c17d9fc393b53e3fbdd76899dae;

  function LotusToken() {
    totalSupply = COMMUNITY_RESERVE + PARTNERSHIPS_RESERVE + TEAM_RESERVE;

    communityVault = setupVault(0, COMMUNITY_RESERVE);
    partnershipVault = setupVault(8, PARTNERSHIPS_RESERVE);
    teamVault = setupVault(20, TEAM_RESERVE);
  }

  function setupVault(uint holdingTime, uint _balance) private returns (address) {
    ReserveVault reserveVault = new ReserveVault(RELEASE_DATE, holdingTime);
    balances[reserveVault] = _balance;
    reserveVault.transferOwnership(LOTUS_PUBLIC_ADDRESS);
    return reserveVault;
  }

}
