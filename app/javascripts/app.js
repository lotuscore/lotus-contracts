import "../stylesheets/app.css";

import Web3 from 'web3'
import moment from 'moment'
import rivets from 'rivets'
import { default as contract } from 'truffle-contract'

import lotus_presale_artifacts from '../../build/contracts/LotusPresale.json'
import lotus_token_artifacts from '../../build/contracts/LotusToken.json'
import lotus_reserve_artifacts from '../../build/contracts/LotusReserve.json'
import vault_artifacts from '../../build/contracts/Vault.json'

const LotusPresale = contract(lotus_presale_artifacts);
const LotusToken = contract(lotus_token_artifacts);
const LotusReserve = contract(lotus_reserve_artifacts);
const Vault = contract(vault_artifacts);

const App = {
    state: { selectedAccount: 0 },
    componentWillMount() {
        if (typeof this.web3 !== 'undefined') {
            this.web3 = new Web3(this.web3.currentProvider)
        }
        else {
            this.web3 = new Web3(new Web3.providers.HttpProvider(
                "http://localhost:8545"))
        }
        this.document = new Mark("div#App");
        LotusPresale.setProvider(this.web3.currentProvider)
        LotusToken.setProvider(this.web3.currentProvider)
        LotusReserve.setProvider(this.web3.currentProvider)
        Vault.setProvider(this.web3.currentProvider)

        rivets.bind(document.getElementById('App'), this.state)

        this.bindActions()
        this.getContracts().then(() => this.updateContracts())
    },
    bindActions() {
        this.setState({
            call: this.call.bind(this),
            sendTransaction: this.sendTransaction.bind(this),
            selectAddress: this.selectAddress.bind(this),
            lockAccount: this.lockAccount.bind(this),
            unlockAccount: this.unlockAccount.bind(this)
        })
    },
    getContracts: async function () {
        const lotusPresaleInstance = await LotusPresale.deployed()
        const lotusTokenInstance = await LotusToken.deployed()
        const LotusReserveInstance = LotusReserve.at(
            await lotusTokenInstance.reserve.call())
        const balanceOf = async function(c) {
            return Number((await lotusTokenInstance.balanceOf(c.address)).div(10 ** 18))
        }
        this.contracts = [
            {
                name: 'LotusPresale.json',
                instance: lotusPresaleInstance,
                artifacts: lotus_presale_artifacts,
                balance: await balanceOf(lotusPresaleInstance)
            },
            {
                name: 'LotusToken.json',
                instance: lotusTokenInstance,
                artifacts: lotus_token_artifacts,
                balance: await balanceOf(lotusTokenInstance)
            },
            {
                name: 'LotusReserve.json',
                instance: LotusReserveInstance,
                artifacts: lotus_reserve_artifacts,
                balance: await balanceOf(LotusReserveInstance)
            }]
    },
    updateAccounts() {
        const accounts = []
        this.web3.eth.accounts.forEach((address, index) => {
            this.contracts[1].instance.balanceOf(address, { from: address }).then((tokenBalance) => {
                accounts.push({
                    address: address,
                    balance: this.web3.eth.getBalance(address),
                    isSelected: index === this.state.selectedAccount,
                    tokenBalance
                })
            })
        })
        this.setState({ accounts })
    },
    updateContracts() {
        this.updateAccounts()
        this.setState({
            account: { address: this.web3.eth.coinbase },
            contracts: this.contracts
        })
        this.contracts.forEach((obj, i) => {
            obj.artifacts.abi.forEach((el, j) => {
                if (el.type === 'function' && el.constant && el.inputs && !el.inputs.length) {
                    obj.instance[el.name].call().then((value) => {
                        this.state.contracts[i].artifacts.abi[j].result = value.toString()
                    }).catch((e) => {
                        console.log(e)
                        this.setState({ error: `Error calling ${el.name} function.` })
                    })
                }
                this.state.contracts[i].artifacts.abi[j].isEvent = el.type === 'event'
            })
        })

    },
    call(event, obj) {
        obj.contract.instance[obj.el.name].call(...obj.el.inputs.map(o => o.value)).then((value) => {
            console.log(value.toString())
            obj.el.result = value.toString()
        }).catch((e) => {
            console.log(e)
            this.setState({ error: `Error calling ${obj.el.name} function.` })
        })
    },
    sendTransaction(event, obj) {
        obj.contract.instance[obj.el.name](...obj.el.inputs.map(o => o.value), {
                    from: this.state.account.address,
                    value: this.web3.toWei(obj.el.value)
                }).then((value) => {
            console.log(value)
            this.updateContracts()
        }).catch((e) => {
            console.log(e)
            this.setState({ error: `Error calling ${obj.el.name} function.` })
            this.updateAccounts()
        })
    },
    selectAddress(event, obj) {
        this.document.unmark()
        this.state.accounts.forEach((account, index) => {
            if (account.address === obj.account.address) {
                this.setState({ account, selectedAccount: index })
                this.document.markRegExp(new RegExp(account.address, 'i'))
                account.isSelected = true
            }
            else {
                account.isSelected = false
            }
        })
    },
    lockAccount(event, obj) {
        console.log(this.web3.personal.lockAccount(obj.account.address))
    },
    unlockAccount(event, obj) {
        console.log(this.web3.personal.unlockAccount(obj.account.address))
    },
    setState(state) {
        Object.assign(this.state, state)
    }
}

rivets.formatters.isFunction = (el) => el ? el.type === 'function' : false
rivets.formatters.isConstantFunction = (el) => el.type === 'function' && el.constant
rivets.formatters.isTransactionFunction = (el) => el.type === 'function' && !el.constant
rivets.formatters.isEvent = (el) => el ? el.type === 'event' : false
rivets.formatters.empty = (value) => !Boolean(value ? value.length : 0)
rivets.formatters.not = (value) => !value
rivets.formatters.weiToETH = (value) => `${Number(value)/(10 ** 18)} ETH`
rivets.formatters.weiToLTS = (value) => `${Number(value)/(10 ** 18)} LTS`
rivets.formatters.forHumans= (value) => {
    const now = new Date().getTime() / 1000
    if (value && value.startsWith('0x')) {
        return 'ethereum address'
    }
    else if (value === 'true' || value === 'false') {
        return value === 'true' ? 'yes' : 'no'
    }
    else if (Math.abs(Number(value)-now) < 10000000) {
        return moment(Number(value)*1000).format('MMMM Do YYYY, HH:mm:ss')
    }
    else if (Number(value) > 10 ** 18) {
        return Number(value)/(10 ** 18)
    }
    else {
        return ''
    }
}

window.addEventListener('load', () => { App.componentWillMount() })
