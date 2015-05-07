# a mouse interactive slider ui element - expects to receive two props, value,
# the current position of the slider as a number between 0 and 1, and onChange,
# a callback which will get passed the new values on changes.
#
# Also can receive an optional prop 'disabled' which if true will prevent
# interaction.

React = require 'react'
SizeMeasurable = require './mixins/size_measurable'
Draggable = require './mixins/draggable'

module.exports = React.createClass

  displayName: 'Slider'

  propTypes:
    value: React.PropTypes.number.isRequired
    onChange: React.PropTypes.func.isRequired
    disabled: React.PropTypes.bool

  mixins: [
    SizeMeasurable
    Draggable
  ]

  getInitialState: ->
    active: false

  onDragStart: ->
    @initalValue = @props.value
    @setState active: true

  onDrag: (delta) ->
    return if @props.disabled

    value = @initalValue + delta.y / @state.height
    value = Math.max(0, Math.min(value, 1))
    @props.onChange value

  onDragEnd: ->
    @initalValue = null
    @setState active: false

  render: ->
    style = top: "#{100*(1 - @props.value)}%"

    className = 'ui slider'
    className += ' active' if @state.active
    className += ' disabled' if @props.disabled

    <div className={className}>
      <div className="control" ref="container">
        <div className="track"/>
        <div
          className="handle"
          style={style}
          onMouseDown={@draggableOnMouseDown}
        />
      </div>
      <label>{@props.label}</label>
    </div>