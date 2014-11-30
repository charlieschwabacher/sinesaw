# @cjsx React.DOM

React = require 'react/addons'
Sortable = require './mixins/sortable'
Updatable = require './mixins/updatable'
Draggable = require './mixins/draggable'
SizeMeasurable = require './mixins/size_measurable'
Knob = require './knob'
Meter = require './meter'
Menu = require './menu'
DrumSampler = require '../models/drum_sampler'
BasicSampler = require '../models/basic_sampler'
LoopSampler = require '../models/loop_sampler'
AnalogSynthesizer = require '../models/analog_synthesizer'
DrumkitSynthesizer = require '../models/drumkit_synthesizer'
Track = require '../models/track'
ReactCSSTransitionGroup = React.addons.CSSTransitionGroup


TrackRow = React.createClass

  mixins: [Sortable]

  render: ->
    track = @props.track
    instrument = track.cursor 'instrument'

    className = 'track'
    className += ' selected' if @props.selected
    className += ' dragging' if @isDragging()

    <div
      className={className}
      onClick={@props.selectTrack}
      draggable={true}
      onDragStart={@dragStart}
      onDragEnd={@dragEnd}
      onDragOver={@dragOver}
      data-id={@props.index}
    >
      <div className='name'>{track.get 'name'}</div>
      <Knob
        label="Level"
        value={instrument.get 'level'}
        onChange={instrument.bind 'level'}
      />
      <Meter track={track}/>
    </div>


module.exports = React.createClass

  mixins: [Updatable]

  trackTypes:
    'Drum Sampler': DrumSampler
    'Basic Sampler': BasicSampler
    'Loop Sampler': LoopSampler
    'Analog Synth': AnalogSynthesizer
    'Drum Synth': DrumkitSynthesizer

  getInitialState: ->
    menuOpen: false
    dragging: null

  componentDidMount: ->
    window.addEventListener 'click', @closeMenu

  componentWillUnmount: ->
    window.removeEventListener 'click', @closeMenu

  closeMenu: ->
    @setState menuOpen: false if @state.menuOpen

  toggleMenu: (e) ->
    e.stopPropagation()
    @setState menuOpen: !@state.menuOpen

  addTrack: (name) ->
    track = Track.build {name, instrument: @trackTypes[name].build()}
    index = @props.tracks.get().length

    @props.tracks.set [index], track
    @props.selectTrack index
    @setState menuOpen: false

  removeTrack: ->
    tracks = @props.tracks.get().slice 0
    tracks.splice @props.selectedTrack, 1
    index = Math.max 0, Math.min @props.selectedTrack, tracks.length - 1

    @props.selectTrack index
    @props.tracks.set [], tracks

  render: ->
    tracks = @props.tracks.get()

    <div className='ui track-selection'>
      <div className="tracks">
        <ReactCSSTransitionGroup transitionName="track">
          {
            tracks.map (track, i) =>
              if track
                <TrackRow
                  key={track._id}
                  index={i}
                  track={@props.tracks.cursor i}
                  selected={@props.selectedTrack == i}
                  selectTrack={=> @props.selectTrack i}
                  dragging={@state.dragging}
                  updateDragging={@update 'dragging'}
                  items={@props.tracks}
                />
          }
        </ReactCSSTransitionGroup>
      </div>
      <div className="controls">
        <Menu
          options={Object.keys @trackTypes}
          onSelect={@addTrack}
          open={@state.menuOpen}
        />
        <div className="icon icon-plus pull-right" onClick={@toggleMenu}></div>
        <div className="icon icon-minus pull-left" onClick={@removeTrack}></div>
      </div>
    </div>