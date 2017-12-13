import { Component } from 'react'
import PropTypes from 'prop-types';
import moment from 'moment'

import LotusPresaleContract from '../../../build/contracts/LotusPresale.json'
import LotusTokenContract from '../../../build/contracts/LotusToken.json'
import LotusReserveContract from '../../../build/contracts/LotusReserve.json'
import VaultContract from '../../../build/contracts/Vault.json'
import template from './template.rt'
import './styles.css'

const contract = require('truffle-contract')
const LotusPresale = contract(LotusPresaleContract)
const LotusToken = contract(LotusTokenContract)
const LotusReserve = contract(LotusReserveContract)
const Vault = contract(VaultContract)


class Wallet extends Component {
  constructor(props, context) {
    super(props)
    const web3 = global.web3
    LotusPresale.setProvider(web3.currentProvider)
    LotusToken.setProvider(web3.currentProvider)
    LotusReserve.setProvider(web3.currentProvider)
    Vault.setProvider(web3.currentProvider)

    this.state = {
      account: context.web3.selectedAccount,
      vaults: [],
      now: new Date().getTime()
    }

  }

  componentWillMount() {
    // trigger load account data
    this.onChangeAccount()
  }

  format(time) {
      return moment(Number(time)).format('MMMM Do, YYYY')
  }

  onChangeAccount(a,b,c) {
    const account = global.web3.eth.accounts[0];
    const updateAccount = async () => {
      const tokenInstance = await LotusToken.deployed()
      const reserveInstance = LotusReserve.at(await tokenInstance.reserve.call())

      const balance = await tokenInstance.balanceOf(account)
      const vaults = []
      /* const vaults = [{
        address: '0x768beb7e961c5b12b6a929483271d805eb0c8c5b',
        balance: Math.random()*10000,
        releaseDate: 1511546400000,
        revocable: false
      }]*/

      let i = 0
      while (true) {
        let vaultAddress = await reserveInstance.grants.call(account, i)
        if (vaultAddress === '0x') break;
        vaults.push(
          Vault.at(vaultAddress)
        )
        i++
        // prevent infinite loop
        if (i > 100) throw new Error('Infinite loop')
      }

      this.setState({ account, balance, vaults })
    }
    updateAccount()
  }

  render() {
    return template.call(this)
  }
}


Wallet.contextTypes = {
  web3: PropTypes.object
}

export default Wallet
