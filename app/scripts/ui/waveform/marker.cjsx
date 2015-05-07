React = require 'react/addons'
Draggable = require '../mixins/draggable'


module.exports = React.createClass

  displayName: 'Marker'

  propTypes:
    name: React.PropTypes.string
    value: React.PropTypes.number
    parentWidth: React.PropTypes.number
    parentHeight: React.PropTypes.number
    windowSize: React.PropTypes.number
    windowCenter: React.PropTypes.number
    width: React.PropTypes.number
    radius: React.PropTypes.number

  mixins: [
    Draggable
    React.addons.PureRenderMixin
  ]

  getDefaultProps: ->
    radius: 2
    width: 4

  getInitialState: ->
    dragActive: false

  onDragStart: (dragStartPosition, e) ->
    e.stopPropagation()
    @setState dragInitialValue: @props.value

  onDragEnd: ->
    @setState dragInitialValue: null

  onDrag: (delta) ->
    value = Math.max 0, Math.min 1, @state.dragInitialValue + delta.x / @props.parentWidth * @props.windowSize
    @props.onChange value

  render: ->
    windowStart = @props.windowCenter - @props.windowSize / 2
    windowEnd = @props.windowCenter + @props.windowSize / 2

    return <g/> unless @props.value >= windowStart and @props.value <= windowEnd

    x = (@props.value - windowStart) / @props.windowSize * @props.parentWidth - @props.width / 2
    x = Math.max 0, Math.min @props.parentWidth - @props.width, x

    className = "marker #{@props.name}"
    className += ' active' if @state.dragInitialValue?

    <g>
      <rect
        className={className}
        x={x}
        y={0}
        width={@props.width}
        height={@props.parentHeight}
        rx={@props.radius}
        ry={@props.radius}
        onMouseDown={@draggableOnMouseDown}
      />
    </g>

