# UI for an envelope control with attack, decay, sustain, and release.
# includes 4 knobs and an interactive visualization of the envelope using SVG.
# expects to receive a cursor to an evelope object {a,d,s,r} as a 'env' prop.

React = require 'react'
SizeMeasurable = require './mixins/size_measurable'
Draggable = require './mixins/draggable'
Knob = require './knob'

module.exports = React.createClass

  displayName: 'Envelope'

  propTypes:
    label: React.PropTypes.string.isRequired
    env: React.PropTypes.object.isRequired
    dotRadius: React.PropTypes.number
    margin: React.PropTypes.number

  mixins: [
    SizeMeasurable
    Draggable
  ]

  getInitialState: ->
    dragTarget: null

  getDefaultProps: ->
    dotRadius: 5
    margin: 4

  buildLines: ->
    lines = []
    dots = []
    m = @props.margin + @props.dotRadius
    w = @state.width - 2 * m
    h = @state.height - 2 * m
    env = @props.env.get()

    p1 =
      x: 0
      y: h

    p2 =
      x: w / 3 * env.a
      y: 0

    p3 =
      x: p2.x + w / 3 * env.d
      y: h * (1 - env.s)

    p4 =
      x: w * 2 / 3
      y: h * (1 - env.s)

    p5 =
      x: w * (2 + env.r) / 3
      y: h

    for p in [p1, p2, p3, p4, p5]
      p.x += m
      p.y += m

    # # base
    # lines.push <line key="b" x1={m} y1={m+h} x2={m+w} y2={m+h}/>

    # path
    d = 'M ' + [p1, p2, p3, p4, p5].map((p) -> "#{p.x} #{p.y}").join ' L '
    lines.push <path key="p" d={d}/>

    # attack
    className = if @state.dragTarget is 'attack' then 'active' else ''
    dots.push <circle key="a" className={className} cx={p2.x} cy={p2.y} r={@props.dotRadius} onMouseDown={@onMouseDownAttack}/>

    # decay / sustain
    className = if @state.dragTarget is 'decay' then 'active' else ''
    dots.push <circle key="d" className={className} cx={p3.x} cy={p3.y} r={@props.dotRadius} onMouseDown={@onMouseDownDecay}/>

    #release
    className = if @state.dragTarget is 'release' then 'active' else ''
    dots.push <circle key="r" className={className} cx={p5.x} cy={p5.y} r={@props.dotRadius} onMouseDown={@onMouseDownRelease}/>

    lines.concat dots

  onMouseDownAttack: (e) ->
    @initialValue = @props.env.get 'a'
    @setState dragTarget: 'attack'
    @draggableOnMouseDown e

  onMouseDownDecay: (e) ->
    @initialValue = {d: @props.env.get('d'), s: @props.env.get('s')}
    @setState dragTarget: 'decay'
    @draggableOnMouseDown e

  onMouseDownRelease: (e) ->
    @initialValue = @props.env.get 'r'
    @setState dragTarget: 'release'
    @draggableOnMouseDown e

  onDrag: (delta) ->
    m = @props.margin + @props.dotRadius
    w = (@state.width - 2 * m) / 3
    h = @state.height - 2 * m

    if @state.dragTarget is 'attack'
      a = @initialValue + delta.x / w
      changes = {a}
    else if @state.dragTarget is 'decay'
      d = @initialValue.d + delta.x / w
      s = @initialValue.s + delta.y / h
      changes = {d, s}
    else if @state.dragTarget is 'release'
      r = @initialValue + delta.x / w
      changes = {r}

    for k, v of changes
      changes[k] = Math.max 0, Math.min 1, v

    @props.env.merge changes

  onDragEnd: ->
    @initialValue = null
    @setState dragTarget: null

  render: ->
    env = @props.env
    lines = @buildLines() if @state.width > 0

    <div className='ui envelope'>
      <div className='control' ref='container'>
        <svg width={@state.width} height={@state.height}>
          {lines}
        </svg>
      </div>
      <div className='knobs'>
        <div className='group'>
          <Knob label='A' value={env.get 'a'} onChange={env.bind 'a'}/>
          <Knob label='D' value={env.get 'd'} onChange={env.bind 'd'}/>
        </div>
        <div className='group'>
          <Knob label='S' value={env.get 's'} onChange={env.bind 's'}/>
          <Knob label='R' value={env.get 'r'} onChange={env.bind 'r'}/>
        </div>
      </div>
      <label>{@props.label}</label>
    </div>