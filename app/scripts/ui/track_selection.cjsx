# React component represeting track selection UI - allows for track selection,
# creation, deletion, and ordering
#
# TrackSelection requires three props - 'tracks', a cursor to an array of track
# objects, 'selectedTrack', the index of the currently selected track, and
# 'selectTrack', a callback to set the currently selected track.

React = require 'react/addons'
Sortable = require './mixins/sortable'
Knob = require './knob'
Meter = require './meter'
Menu = require './menu'
DrumSampler = require '../models/drum_sampler'
BasicSampler = require '../models/basic_sampler'
LoopSampler = require '../models/loop_sampler'
AnalogSynthesizer = require '../models/analog_synthesizer'
DrumSynthesizer = require '../models/drum_synthesizer'
Track = require '../models/track'
ReactCSSTransitionGroup = React.addons.CSSTransitionGroup


# define a private component representing a single track

TrackRow = React.createClass

  displayName: 'TrackRow'

  propTypes:
    track: React.PropTypes.object.isRequired
    selectTrack: React.PropTypes.func.isRequired
    index: React.PropTypes.number.isRequired
    meterLevel: React.PropTypes.number.isRequired

  mixins: [
    React.addons.PureRenderMixin
    Sortable
  ]

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
        label='Level'
        value={instrument.get 'level'}
        onChange={instrument.bind 'level'}
      />
      <Meter level={@props.meterLevel}/>
    </div>


module.exports = React.createClass

  displayName: 'TrackSelection'

  propTypes:
    tracks: React.PropTypes.object.isRequired
    selectedTrack: React.PropTypes.number.isRequired
    selectTrack: React.PropTypes.func.isRequired

  trackTypes:
    'Drum Sampler': DrumSampler
    'Basic Sampler': BasicSampler
    'Loop Sampler': LoopSampler
    'Analog Synth': AnalogSynthesizer
    'Drum Synth': DrumSynthesizer

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
    selectedTrack = @props.selectedTrack

    Track.destroy @props.song, tracks[selectedTrack]

    tracks.splice selectedTrack, 1
    @props.tracks.set [], tracks

    index = Math.max 0, Math.min selectedTrack, tracks.length - 1
    @props.selectTrack index

  render: ->
    tracks = @props.tracks.get()
    selectedTrack = @props.selectedTrack

    <div className='ui track-selection'>
      <div className='tracks'>
        <ReactCSSTransitionGroup transitionName='track'>
          {
            tracks.map (track, i) =>
              <TrackRow
                key={track._id}
                index={i}
                track={@props.tracks.cursor i}
                meterLevel={@props.meterLevels?[track._id] or 0}
                selected={parseInt(selectedTrack) == parseInt(i)}
                selectTrack={=> @props.selectTrack i}
                dragging={@state.dragging}
                updateDragging={(dragging) => @setState {dragging}}
                items={@props.tracks}
              />
          }
        </ReactCSSTransitionGroup>
      </div>
      <div className='controls'>
        <Menu
          options={Object.keys @trackTypes}
          onSelect={@addTrack}
          open={@state.menuOpen}
        />
        <div className='icon icon-plus pull-right' onClick={@toggleMenu}/>
        <div className='icon icon-minus pull-left' onClick={@removeTrack}/>
      </div>
    </div>
