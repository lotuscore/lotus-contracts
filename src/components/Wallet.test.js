import React from 'react'
import ReactDOM from 'react-dom'
import Wallet from './Wallet'

it('renders without crashing', () => {
  const div = document.createElement('div')
  ReactDOM.render(<Wallet />, div)
})
