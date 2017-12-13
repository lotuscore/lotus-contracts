import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { Web3Provider } from 'react-web3';

import Wallet from './components/Wallet'
import './index.css';

class DApp extends Component {
  render() {
    return (
      <Web3Provider onChangeAccount={() => { this.app.onChangeAccount() }}>
        <Wallet  ref={instance => this.app = instance }  />
      </Web3Provider>
    );
  }
}

ReactDOM.render(<DApp />, document.getElementById('root'));
