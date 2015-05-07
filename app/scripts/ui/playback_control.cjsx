# this renders the top bar of the application with playback and temp controls.
# PlaybackController accepts one property - a song cursor

React = require 'react'
Knob = require './knob'
Oscilloscope = require './oscilloscope'

module.exports = React.createClass

  displayName: 'PlaybackControl'

  propTypes:
    data: React.PropTypes.object.isRequired
    song: React.PropTypes.object.isRequired

  mixins: [
    React.addons.PureRenderMixin
  ]

  render: ->
    song = @props.song
    data = @props.data

    <div className="ui playback-control">
      <div className="group playback">
        <div
          className={
            "icon icon-play#{if song.playing then ' active' else ''}"
          }
          onClick={
            if song.playing
            then song.pause
            else song.play
          }
        />
        <div className="icon icon-record" onClick={song.record}/>
        <div className="icon icon-stop" onClick={song.stop}/>
      </div>
      <div className="group fill"/>
      <div className="group controls">
        <Oscilloscope
          buffer={(song.playing && song.buffer) or new Float32Array 1}
        />
        <Knob
          label="Level"
          value={data.get 'level'}
          onChange={data.bind 'level'}
        />
      </div>
      <div className="group tempo">
        <select
          value={data.get 'bpm'}
          onChange={data.bind 'bpm', (e) -> parseInt e.target.value}
        >
          {
            for i in [200..20]
              <option key={i} value={i}>{i} bpm</option>
          }
        </select>
      </div>
      <div className="logo">sinesaw</div>
    </div>
