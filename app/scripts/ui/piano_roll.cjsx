# This component represents a piano roll style sequence editor, rendered using
# SVG.  It requires two props - 'song', a cursor to the root song object, and
# 'sequence', a second cursor to sequence it will edit.
#
# User interaction from mouse and keyboard is split into the mixins
# 'KeyboardInteraction' and 'MouseInteraction'.  Rendering is split into
# multiple subcomponents: 'GridLines', 'Keys', 'Notes', 'PlaybackMarker', and
# 'Selection'
#
# The PianoRoll watches and prevents default on scroll events, instead keeping
# scroll position in its state - this allows it to quantize scrolling to a whole
# number of notes and beat positions, and to render only elements visible on
# screen.  This code for scrolling and scaling the viewport is in the mixin
# 'OverrideScrolling'.

React = require 'react'
SizeMeasurable = require './mixins/size_measurable'
Draggable = require './mixins/draggable'

OverrideScrolling = require './piano_roll/mixins/override_scrolling'
MouseInteraction = require './piano_roll/mixins/mouse_interaction'
KeyboardInteraction = require './piano_roll/mixins/keyboard_interaction'

ScaleHandle = require './scale_handle'
GridLines = require './piano_roll/grid_lines'
Keys = require './piano_roll/keys'
Notes = require './piano_roll/notes'
PlaybackMarker = require './piano_roll/playback_marker'
Selection = require './piano_roll/selection'


module.exports = React.createClass

  displayName: 'PianoRoll'

  propTypes:
    data: React.PropTypes.object.isRequired
    sequence: React.PropTypes.object.isRequired
    position: React.PropTypes.number.isRequired
    midiNotes: React.PropTypes.object.isRequired

  mixins: [
    React.addons.PureRenderMixin
    SizeMeasurable
    Draggable
    MouseInteraction
    OverrideScrolling
    KeyboardInteraction
  ]

  getInitialState: ->

    # an array of note ids representing the currently selected notes
    selectedNotes: []

    # moved notes will be quantized to 1/@state.quanitization beats
    quantization: 4

    # should match the $line-width and $margin sass variables
    lineWidth: 1.5

    # width of key markers
    keyWidth: 40

    # maximum width from the left/right edge of a note where a drag will resize
    # rather than translate the note
    resizeHandleWidth: 10

  # update the loop size on the current sequence and scale the viewport to match
  updateLoopSize: (e) ->
    value = parseFloat e.target.value
    @props.sequence.set 'loopSize', value
    @setState xScale: value

  # update the current quantization settings
  updateQuantization: (e) ->
    value = parseFloat e.target.value
    @setState quantization: value

  # update the viewport zoom in the x dimension - when the zoom increases, if
  # needed, update the scroll position to keep the visible area within the
  # bounds of the sequence loop size
  updateXScale: (scale) ->
    loopSize = @props.sequence.get 'loopSize'
    xScale = Math.round(scale * @state.quantization) / @state.quantization
    xScale = Math.min loopSize, xScale

    xScroll = Math.min @state.xScroll, loopSize - xScale

    @setState {xScale, xScroll}

  # update the viewport zoom in the y dimension - if needed update the scroll
  # position to avoid displaying notes outside of the range allowed by midi
  updateYScale: (scale) ->
    yScale = Math.round scale

    yScroll = Math.min @state.yScroll, 128 - @state.yScale

    @setState {yScale, yScroll}


  # update notes given an map of changes {id: {key, start, length}}
  # changes are merged into existing notes by id, with any keys present in the
  # values on the changes object overwiting the values for that note with
  # matching id

  #!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  # this should be refactored to 'updateNotes: (ids, delta) ->' so that notes
  # can move as far as possible when you attempt to move an octave near the edge
  #!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  updateNotes: (changes) ->
    notes = @props.sequence.get 'notes'
    loopSize = @props.sequence.get 'loopSize'

    changedNotes = Object.keys(changes).map (id) =>
      key: if changes[id].key? then changes[id].key else notes[id].key
      start: if changes[id].start? then changes[id].start else notes[id].start
      length: if changes[id].length? then changes[id].length else notes[id].length

    keys = changedNotes.map (note) -> note.key
    starts = changedNotes.map (note) -> note.start
    ends = changedNotes.map (note) -> note.start + note.length

    minKey = Math.min.apply null, keys
    maxKey = Math.max.apply null, keys
    minStart = Math.min.apply null, starts
    maxEnd = Math.max.apply null, ends

    # prevent notes from being moved out of the available range

    return false if minKey < 0 or maxKey > 127
    return false if minStart < 0 or maxEnd > loopSize

    # update scroll so notes remain on screen

    stateChanges = {}

    if minKey < @state.yScroll and maxKey <= @state.yScroll + @state.yScale
      stateChanges.yScroll = minKey

    if maxKey >= @state.yScroll + @state.yScale and minKey > @state.yScroll
      stateChanges.yScroll = maxKey - @state.yScale + 1

    if minStart < @state.xScroll and maxEnd <= @state.xScroll + @state.xScale
      stateChanges.xScroll = minStart

    if maxEnd >= @state.xScroll + @state.xScale and minStart > @state.xScroll
      stateChanges.xScroll = maxEnd - @state.xScale

    @props.sequence.merge notes: changes, true
    @setState stateChanges


  render: ->
    outerStyle =
      width: @state.width + 2 * @state.scrollPadding
      height: @state.height + 2 * @state.scrollPadding

    innerStyle =
      top: @state.scrollPadding
      left: @state.scrollPadding

    gridWidth = Math.max 0, @state.width - @state.keyWidth

    <div className="ui piano-roll">
      <div
        className="body"
        ref='container'
        onWheel={@preventWheel}
        onScroll={@overrideScrolling}
      >
        <div className="outer" style={outerStyle}>
          <div className="inner" style={innerStyle}>
            <Keys
              width={@state.keyWidth - @state.lineWidth}
              height={@state.height}
              yScroll={@state.yScroll}
              yScale={@state.yScale}
              keyWidth={@state.keyWidth}
              onClick={@onClickKeys}
              midiNotes={@props.midiNotes}
            />
            <div className='grid' ref='grid'>
              <svg
                width={gridWidth}
                height={@state.height}
                onMouseDown={@onMouseDownGrid}
                onMouseUp={@onMouseUpGrid}
                onClick={@onClickGrid}
                onDoubleClick={@onDoubleClickGrid}
              >
                <PlaybackMarker
                  position={@props.position}
                  loopSize={@props.sequence.get 'loopSize'}
                  width={gridWidth}
                  height={@state.height}
                  xScroll={@state.xScroll}
                  xScale={@state.xScale}
                  quantization={@state.quantization}
                />
                <GridLines
                  width={gridWidth}
                  height={@state.height}
                  yScale={@state.yScale}
                  xScale={@state.xScale}
                  yScroll={@state.yScroll}
                  xScroll={@state.xScroll}
                  quantization={@state.quantization}
                />
                <Selection
                  selectionOrigin={@state.selectionOrigin}
                  selectionPosition={@state.selectionPosition}
                  width={gridWidth}
                  height={@state.height}
                  yScale={@state.yScale}
                  xScale={@state.xScale}
                  yScroll={@state.yScroll}
                  xScroll={@state.xScroll}
                  quantization={@state.quantization}
                />
                <Notes
                  notes={@props.sequence.get 'notes'}
                  selectedNotes={@state.selectedNotes}
                  dragOriginalValue={@originalValue}
                  translateTarget={@state.translateTarget}
                  resizeTarget={@state.resizeTarget}
                  width={gridWidth}
                  height={@state.height}
                  yScale={@state.yScale}
                  xScale={@state.xScale}
                  yScroll={@state.yScroll}
                  xScroll={@state.xScroll}
                  lineWidth={@state.lineWidth}
                  quantization={@state.quantization}
                  onMouseDown={@onMouseDownNote}
                  onMouseMove={@onMouseMoveNote}
                  onMouseOut={@onMouseOutNote}
                  onDoubleClick={@onDoubleClickNote}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="view-controls">
        <div className="setting">
          <label>Grid</label>
          <select
            value={@state.quantization}
            onChange={@updateQuantization}
          >
            <option value="1">1</option>
            <option value="2">1/2</option>
            <option value="3">1/3</option>
            <option value="4">1/4</option>
            <option value="6">1/6</option>
            <option value="8">1/8</option>
            <option value="12">1/12</option>
            <option value="16">1/16</option>
          </select>
        </div>
        <div className="setting">
          <label>Length</label>
          <select
            value={@props.sequence.get 'loopSize'}
            onChange={@updateLoopSize}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="4">4</option>
            <option value="8">8</option>
            <option value="16">16</option>
            <option value="32">32</option>
            <option value="64">64</option>
          </select>
        </div>
        <ScaleHandle
          min={@state.minYScale}
          max={@state.maxYScale}
          value={@state.yScale}
          onChange={@updateYScale}
        >
          <span className="icon icon-up"/>
          <span className="icon icon-down"/>
        </ScaleHandle>
        <ScaleHandle
          min={@state.minXScale}
          max={@state.maxXScale}
          value={@state.xScale}
          onChange={@updateXScale}
        >
          <span className="icon icon-left"/>
          <span className="icon icon-right"/>
        </ScaleHandle>
      </div>
    </div>
