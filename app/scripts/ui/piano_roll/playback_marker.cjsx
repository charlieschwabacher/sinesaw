React = require 'react/addons'


module.exports = React.createClass

  displayName: 'PlaybackMarker'

  propTypes:
    position: React.PropTypes.number.isRequired
    loopSize: React.PropTypes.number.isRequired
    width: React.PropTypes.number.isRequired
    height: React.PropTypes.number.isRequired
    xScale: React.PropTypes.number.isRequired
    xScroll: React.PropTypes.number.isRequired
    quantization: React.PropTypes.number.isRequired

  mixins: [
    React.addons.PureRenderMixin
  ]

  render: ->
    width = @props.width
    height = @props.height
    position = @props.position % @props.loopSize
    cols = @props.xScale * @props.quantization
    squareWidth = width / cols

    if position >= @props.xScroll and position <= @props.xScroll + @props.xScale
      x = Math.floor(position * @props.quantization) * squareWidth
      el = <rect
        className="playback"
        key='pb'
        x={x}
        y={0}
        width={3}
        height={height}
      />

    <g>{el}</g>
