React = require 'react'
Draggable = require './mixins/draggable'

module.exports = React.createClass

  displayName: 'ScaleHandle'

  propTypes:
    value: React.PropTypes.number.isRequired
    min: React.PropTypes.number.isRequired
    max: React.PropTypes.number.isRequired
    onChange: React.PropTypes.func.isRequired

  mixins: [Draggable]

  range: 300

  getInitialState: ->
    active: false

  onDragStart: ->
    # normalize value
    @initialValue = (@props.value - @props.min) / (@props.max - @props.min)
    @setState active: true

  onDrag: (delta) ->
    upRange = Math.min @range, (@dragStartPosition.y - window.scrollY)
    downRange = Math.min @range, (window.innerHeight + window.scrollY - @dragStartPosition.y)

    if delta.y < 0
      value = Math.max 0, @initialValue * (downRange + delta.y) / downRange
    else
      value = Math.min 1, @initialValue + (1 - @initialValue) * delta.y / upRange

    # denormalize value
    value = 1 * @props.min + value * (@props.max - @props.min)
    @props.onChange value

  onDragEnd: ->
    @initialValue = null
    @setState action: false

  render: ->
    className = 'ui scale-handle'
    className += ' active' if @state.active

    <div className={className} onMouseDown={@draggableOnMouseDown}>
      {@props.children}
    </div>