React = require 'react'
PureRenderMixin = require 'react-addons-pure-render-mixin'


module.exports = React.createClass

  displayName: 'Visualization'

  propTypes:
    sampleData: React.PropTypes.instanceOf(Float32Array).isRequired
    resolution: React.PropTypes.number.isRequired
    sliceSize: React.PropTypes.number.isRequired
    windowStart: React.PropTypes.number.isRequired
    fromSlice: React.PropTypes.number.isRequired
    toSlice: React.PropTypes.number.isRequired
    width: React.PropTypes.number.isRequired
    height: React.PropTypes.number.isRequired
    marginTop: React.PropTypes.number.isRequired
    marginBottom: React.PropTypes.number.isRequired
    selection: React.PropTypes.bool

  mixins: [
    PureRenderMixin
  ]

  render: ->
    sampleData = @props.sampleData
    resolution = @props.resolution
    sliceSize = @props.sliceSize
    windowStart = @props.windowStart
    fromSlice = @props.fromSlice
    toSlice = @props.toSlice
    width = @props.width
    height = @props.height - @props.marginTop - @props.marginBottom
    top = @props.marginBottom
    bottom = @props.height - @props.marginBottom

    points = []

    points.push "#{fromSlice * width / resolution} #{bottom}"

    for i in [fromSlice..toSlice]
      sliceStart = i * sliceSize + windowStart
      sliceEnd = sliceStart + sliceSize

      x = i * width / resolution

      y = 0
      for j in [Math.floor(sliceStart)...Math.floor(sliceEnd)]
        v = Math.abs sampleData[j]
        y = v if v > y
      y = (((1 - y) * height) || 0) + top

      points.push "#{x} #{y}"

    points.push "#{x} #{bottom}"

    d = "M #{points.join ' L '}"

    className = 'selection' if @props.selection

    <path className={className} d={d}/>
