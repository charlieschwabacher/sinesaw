# a mouse interactive rotary knob - expects to receive two props, value, the
# current position of the knob as a number between 0 and 1, and onChange, a
# callback which will get passed the new values on changes.
#
# Also can receive an optional prop 'disabled' which if true will prevent
# interaction.

React = require 'react'
Draggable = require './mixins/draggable'

module.exports = React.createClass

  displayName: 'Knob'

  propTypes:
    value: React.PropTypes.number.isRequired
    onChange: React.PropTypes.func.isRequired
    disabled: React.PropTypes.bool

  mixins: [Draggable]

  range: 100

  getInitialState: ->
    active: false

  getDefaultProps: ->
    value: 0.5
    disabled: false

  onDragStart: ->
    @initalValue = @props.value
    @setState active: true

  onDrag: (delta) ->
    return if @props.disabled

    upRange = Math.min @range, (@dragStartPosition.y - window.scrollY)
    downRange = Math.min @range, (window.innerHeight + window.scrollY - @dragStartPosition.y)

    if delta.y < 0
      value = Math.max 0, @initalValue * (downRange + delta.y) / downRange
    else
      value = Math.min 1, @initalValue + (1 - @initalValue) * delta.y / upRange

    @props.onChange value

  onDragEnd: ->
    @initalValue = null
    @setState active: false

  preventDefault: (e) ->
    e.preventDefault()
    e.stopPropagation()

  render: ->
    style = WebkitTransform: "rotate(#{(@props.value - 0.5) * 300}deg)"

    className = 'ui knob'
    className += ' active' if @state.active
    className += ' disabled' if @props.disabled

    # include draggable and ondragstart to allow use of the knob component
    # inside a parent element using native html drag/drop
    <div className={className} draggable={true} onDragStart={@preventDefault}>
      <div className="control">
        <div className="handle" style={style} onMouseDown={@draggableOnMouseDown}/>
      </div>
      <label>{@props.label}</label>
    </div>
