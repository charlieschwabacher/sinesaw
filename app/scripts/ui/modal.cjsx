# A react component representing a modal and its backdrop

React = require 'react'

module.exports = React.createClass

  displayName: 'Modal'

  propTypes:
    children: React.PropTypes.arrayOf(React.PropTypes.element).isRequired

  render: ->
    <div>
      <div className="modal-backdrop"/>
      <div className="modal-body">
        {@props.children}
      </div>
    </div>