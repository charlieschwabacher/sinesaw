React = require 'react'
Modal = require './modal'

module.exports = React.createClass

  displayName: 'ControlModal'

  render: ->
    <Modal
      width={400}
      height={200}
      className='control-modal'
    >
      {@props.children}
    </Modal>