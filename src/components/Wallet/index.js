import { Component } from 'react'
import PropTypes from 'prop-types'
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
      showTransferModal: false,
      account: context.web3.selectedAccount,
      vaults: [],
      now: new Date().getTime()
    }
    this.openTransferModal = this.openTransferModal.bind(this)
    this.closeTransferModal = this.closeTransferModal.bind(this)
  }

  componentWillMount() {
    // trigger load account data
    this.onChangeAccount()
  }

  openTransferModal() {
    this.setState({ showTransferModal: true })
  }

  closeTransferModal() {
    this.setState({ showTransferModal: false })
  }

  format(time) {
    return moment(Number(time)).format('MMMM Do, YYYY')
  }

  onChangeAccount() {
    const account = global.web3.eth.accounts[0]
    const updateAccount = async () => {
      this.tokenInstance = await LotusToken.deployed()
      const reserveInstance = LotusReserve.at(await this.tokenInstance.reserve.call())

      const balance = await this.tokenInstance.balanceOf(account)
      const vaults = []

      let i = 0
      while (true) {
        let vaultAddress
        try {
          vaultAddress = await reserveInstance.grants.call(account, i)
        }
        catch (e) { break }
        if (vaultAddress === '0x') break
        let vault = Vault.at(vaultAddress)
        vaults.push({
          address: vaultAddress,
          balance: await vault.balance.call(),
          releaseTime: (await vault.releaseTime.call())*1000,
          revocable: await vault.revocable.call()
        })
        i++
        // prevent infinite loop
        if (i > 100) throw new Error('Infinite loop')
      }

      this.setState({ account, balance, vaults })
    }
    updateAccount()
  }

  claim(vaultAddress) {
    const vault = Vault.at(vaultAddress)
    return vault.claim({from: this.state.account})
  }

  release(vaultAddress) {
    const vault = Vault.at(vaultAddress)
    return vault.release({from: this.state.account})
  }

  render() {
    return template.call(this)
  }
}


Wallet.contextTypes = {
  web3: PropTypes.object
}

export default Wallet
