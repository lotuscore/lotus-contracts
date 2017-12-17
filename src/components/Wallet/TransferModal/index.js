import { Component } from 'react'
import { isStrictAddress as isAddress } from 'web3/lib/utils/utils.js'

import template from './template.rt'

const isNumber = (x) => {
  try { new global.web3.BigNumber(x) }
  catch(e) {
    if (String(e).match('not a number')) return false
    throw new Error(e)
  }
  return true
}

class TransferModal extends Component {
  constructor(props, context) {
    super(props)
    this.state = {
      transferAmount: '',
      transferAddress: ''
    }
    this.sendLTS = this.sendLTS.bind(this)
    this.setAddress = this.setAddress.bind(this)
    this.setAmmount = this.setAmmount.bind(this)
    this.validTransfer = this.validTransfer.bind(this)
  }

  setAddress(event) {
    this.setState({ transferAddress: event.target.value })
  }

  setAmmount(event) {
    let transferAmount = this.state.transferAmount
    const firstInput = transferAmount === ''
    const positionCursor = (amount) => document.getElementById('TransferFormAmount').setSelectionRange(amount.indexOf('.'), amount.indexOf('.'))
    if (event.target.value === '') {
      return this.setState({ transferAmount: '' })
    }
    if (!isNumber(event.target.value)) {
      setTimeout(() => positionCursor(transferAmount))
      return
    }
    transferAmount = String(new global.web3.BigNumber(event.target.value).toFixed(8))
    this.setState({ transferAmount }, () => {
      if (firstInput) positionCursor(transferAmount)
    })
  }

  validTransfer() {
    return isAddress(this.state.transferAddress) && isNumber(this.state.transferAmount)
  }

  sendLTS() {
    if (!isAddress(this.state.transferAddress)) {
      return this.setState({ transferError: 'Invalid Address' })
    }
    if (!isNumber(this.state.transferAmount)) {
      return this.setState({ transferError: 'Invalid Amount' })
    }
    this.setState({ transferError: '' })
    this.props.close()
    return this.props.token.transfer(
      this.state.transferAddress,
      new global.web3.BigNumber(this.state.transferAmount), {
        from: this.props.account,
        gas: 50000
      })
  }

  modalStyles = {
    content : {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '21px'
    }
  }

  render() {
    return template.call(this)
  }
}

export { TransferModal }
