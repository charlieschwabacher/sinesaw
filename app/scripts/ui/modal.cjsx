# A react component representing a modal and its backdrop

React = require 'react'

module.exports = React.createClass

  render: ->
    <div {...@props} children={undefined}>
      <div className="modal-backdrop"/>
      <div className="modal-body">
        {@props.children}
      </div>
    </div>