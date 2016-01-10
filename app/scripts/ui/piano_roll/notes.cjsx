React = require 'react'
PureRenderMixin = require 'react-addons-pure-render-mixin'
Keyboard = require 'keyboardjs'


module.exports = React.createClass

  displayName: 'Notes'

  propTypes:
    notes: React.PropTypes.object.isRequired
    selectedNotes: React.PropTypes.array.isRequired
    dragOriginalValue: React.PropTypes.object
    translateTarget: React.PropTypes.string
    resizeTarget: React.PropTypes.string
    width: React.PropTypes.number.isRequired
    height: React.PropTypes.number.isRequired
    lineWidth: React.PropTypes.number.isRequired
    yScale: React.PropTypes.number.isRequired
    xScale: React.PropTypes.number.isRequired
    yScroll: React.PropTypes.number.isRequired
    xScroll: React.PropTypes.number.isRequired
    quantization: React.PropTypes.number.isRequired
    onMouseDown: React.PropTypes.func
    onMouseMove: React.PropTypes.func
    onMouseOut: React.PropTypes.func
    onClick: React.PropTypes.func
    onDoubleClick: React.PropTypes.func

  mixins: [
    PureRenderMixin
  ]

  getDefaultProps: ->
    radius: 0

  noteOnScreen: (note) ->
    note.start <= @props.xScroll + @props.xScale and
    note.start + note.length >= @props.xScroll and
    note.key >= @props.yScroll and
    note.key <= @props.yScroll + @props.yScale

  render: ->
    return <g/> unless @props.width > 0 and @props.height > 0

    width = @props.width
    height = @props.height
    lineWidth = @props.lineWidth
    squareHeight = height / @props.yScale
    quantization = @props.quantization
    cols = @props.xScale * quantization
    squareWidth = width / cols

    els = []

    minRow = @props.yScroll
    maxRow = minRow + @props.yScale
    rows = [minRow...maxRow]

    minCol = @props.xScroll * quantization
    maxCol = minCol + @props.xScale * quantization
    cols = [minCol...maxCol]

    # ghost notes
    if @props.translateTarget? and 'alt' in Keyboard.activeKeys()
      for id, note of @props.dragOriginalValue
        continue unless @noteOnScreen note

        x = (note.start - @props.xScroll) * squareWidth * quantization + lineWidth / 2
        y = (@props.yScale + @props.yScroll - note.key - 1) * squareHeight + lineWidth / 2
        w = squareWidth * note.length * @props.quantization - @props.lineWidth
        h = squareHeight - @props.lineWidth

        els.push(
          <rect
            className="ghost note"
            key={'g' + id}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={@props.radius}
            ry={@props.radius}
          />
        )

    # notes
    for id, note of @props.notes
      continue unless @noteOnScreen note

      x = (note.start - @props.xScroll) * squareWidth * @props.quantization + lineWidth / 2
      y = (@props.yScale + @props.yScroll - note.key - 1) * squareHeight + lineWidth / 2
      w = squareWidth * note.length * @props.quantization - lineWidth
      h = squareHeight - lineWidth

      className = 'note'
      className += ' selected' if note.id in @props.selectedNotes
      className += ' active' if @props.translateTarget == note.id or @props.resizeTarget == note.id

      els.push(
        <rect
          className={className}
          key={'n' + id}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={@props.radius}
          ry={@props.radius}
          data-id={id}
          onMouseDown={@props.onMouseDown}
          onMouseMove={@props.onMouseMove}
          onMouseOut={@props.onMouseOut}
          onClick={@props.onClick}
          onDoubleClick={@props.onDoubleClick}
        />
      )

    <g>{els}</g>
