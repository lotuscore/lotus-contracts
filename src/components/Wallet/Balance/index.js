import PropTypes from 'prop-types';
import template from './template.rt'

const Balance = props => template.call({ props })

Balance.propTypes = {
    balance: PropTypes.object.isRequired,
}

export { Balance }
