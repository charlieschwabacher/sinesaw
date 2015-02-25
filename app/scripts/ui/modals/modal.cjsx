# A react component representing a modal and its backdrop

React = require 'react'
SizeMeasureable = require '../mixins/size_measurable'

module.exports = React.createClass

  mixins: [
    React.addons.PureRenderMixin
  ]

  propTypes:
    width: React.PropTypes.number.isRequired
    height: React.PropTypes.number

  render: ->
    width = @props.width
    height = @props.height

    <div className={
      "modal#{if @props.className then " #{@props.className}" else ''}"
    }>
      <div className="modal-backdrop"/>
      <div
        ref='container'
        className="modal-body"
        style={
          width: "#{width}px"
          height: "#{height}px"
          marginLeft: "#{-width / 2}px"
          marginTop: "#{-height / 2}px"
        }
      >
        {@props.children}
      </div>
    </div>
