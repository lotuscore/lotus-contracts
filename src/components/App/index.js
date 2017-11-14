import { Component } from 'react'
import LotusPresaleContract from '../../../build/contracts/LotusPresale.json'
import LotusTokenContract from '../../../build/contracts/LotusToken.json'
import LotusReserveContract from '../../../build/contracts/LotusReserve.json'
import VaultContract from '../../../build/contracts/Vault.json'
import getWeb3 from '../../utils/getWeb3'
import template from './template.rt'
import './styles.css'


class App extends Component {
  constructor(props) {
    super(props)
    this.state = { web3: null }
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3.then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateContract()
    }).catch((err) => {
      console.log(err)
    })
  }

  instantiateContract() {
    /*
     * Normally these functions would be called in the context of a
     * state management library, but for convenience I've placed them here.
     */

    const contract = require('truffle-contract')
    const LotusPresale = contract(LotusPresaleContract)
    const LotusToken = contract(LotusTokenContract)
    const LotusReserve = contract(LotusReserveContract)
    const Vault = contract(VaultContract)
    const self = this

    LotusPresale.setProvider(this.state.web3.currentProvider)
    LotusToken.setProvider(this.state.web3.currentProvider)
    LotusReserve.setProvider(this.state.web3.currentProvider)
    Vault.setProvider(this.state.web3.currentProvider)

    // Get accounts.
    this.state.web3.eth.getAccounts(async function (error, accounts) {
      // const lotusPresaleInstance = await LotusPresale.deployed()
      const lotusTokenInstance = await LotusToken.deployed()
      const lotusReserveInstance = LotusReserve.at(await lotusTokenInstance.reserve.call())
      const balanceOf = async function(c) { return await lotusTokenInstance.balanceOf(c) }
      const wallet = []
      for (let i=0; i<accounts.length; i++) {
        let vaults = []
        let j = 0
        while (j >= 0) {
          try { vaults.push(await lotusReserveInstance.grants.call(accounts[i], j)) }
          catch(err) { j = -1 }
        }
        wallet.push({
          address: accounts[i],
          balance: (await balanceOf(accounts[i])).toString(),
          vaults
        })
      }
      self.setState({ wallet })
    })
  }

  render() {
    return template.call(this)
  }
}

export default App
