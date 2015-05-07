React = require 'react/addons'


module.exports = React.createClass

  displayName: 'Selection'

  propTypes:
    selectionOrigin: React.PropTypes.object
    selectionPosition: React.PropTypes.object
    width: React.PropTypes.number.isRequired
    height: React.PropTypes.number.isRequired
    yScale: React.PropTypes.number.isRequired
    xScale: React.PropTypes.number.isRequired
    yScroll: React.PropTypes.number.isRequired
    xScroll: React.PropTypes.number.isRequired
    quantization: React.PropTypes.number.isRequired

  mixins: [
    React.addons.PureRenderMixin
  ]

  render: ->
    width = @props.width
    height = @props.height
    selectionOrigin = @props.selectionOrigin
    selectionPosition = @props.selectionPosition
    squareHeight = height / @props.yScale
    quantization = @props.quantization
    cols = @props.xScale * quantization
    squareWidth = width / cols

    if selectionOrigin? and selectionPosition?
      fromKey = Math.max selectionOrigin.key, selectionPosition.key
      keyWidth = Math.abs selectionOrigin.key - selectionPosition.key
      fromBeat =  Math.min selectionOrigin.start, selectionPosition.start
      beatWidth = Math.abs selectionOrigin.start - selectionPosition.start
      x = (fromBeat - @props.xScroll) * quantization * squareWidth
      y = (@props.yScale + @props.yScroll - fromKey - 1) * squareHeight
      w = (beatWidth * quantization + 1) * squareWidth
      h = (keyWidth + 1) * squareHeight
      el = <rect className='selection' key='sel' x={x} y={y} width={w} height={h}/>

    <g>{el}</g>