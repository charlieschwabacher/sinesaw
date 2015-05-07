React = require 'react/addons'

keyPattern = [true, false, true, false, true, true, false, true, false, true, false, true]


module.exports = React.createClass

  displayName: 'Keys'

  propTypes:
    height: React.PropTypes.number.isRequired
    yScroll: React.PropTypes.number.isRequired
    yScale: React.PropTypes.number.isRequired
    keyWidth: React.PropTypes.number.isRequired
    midiNotes: React.PropTypes.object.isRequired

  mixins: [
    React.addons.PureRenderMixin
  ]

  render: ->
    height = @props.height
    keyHeight = height / @props.yScale
    keyWidth = @props.keyWidth

    els = []

    minRow = @props.yScroll
    maxRow = minRow + @props.yScale
    rows = [minRow...maxRow]

    # keys
    for row, i in rows
      if @props.midiNotes[row]?
        className = 'on'
      else unless keyPattern[row % 12]
        className = 'black'
      else
        className = null

      if className?
        els.push <rect
          key={'k' + i}
          className={className}
          x={0}
          y={height - (i + 1) * keyHeight}
          width={keyWidth}
          height={keyHeight}
        />

    # # lines
    # for row, i in rows
    #   y = i * keyHeight
    #   els.push <line key={'l' + i} x1={0} y1={y} x2={keyWidth} y2={y}/>

    # text
    for row, i in rows
      if row % 12 == 0
        y = height - (i + 0.5) * keyHeight
        text = "C #{Math.floor(row / 12) - 2}"
        els.push(
          <text
            key={'t' + i}
            className={if @props.midiNotes[row]? then 'on' else ''}
            x={keyWidth - 4}
            y={y}
          >
            {text}
          </text>
        )

    <div className='keys'>
      <svg width={keyWidth} height={height} onClick={@props.onClick}>
        {els}
      </svg>
    </div>
