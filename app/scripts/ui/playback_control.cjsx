# this renders the top bar of the application with playback and temp controls.
# PlaybackController accepts one property - a song cursor

React = require 'react'
Knob = require './knob'
Oscilloscope = require './oscilloscope'
SaveModal = require './modals/save_modal'
AboutModal = require './modals/about_modal'

module.exports = React.createClass

  mixins: [React.addons.PureRenderMixin]

  propTypes:
    data: React.PropTypes.object.isRequired
    song: React.PropTypes.object.isRequired

  launchSaveModal: ->
    @props.app.launchModal <SaveModal
      song={@props.song}
      dismiss={@props.app.dismissModal}
    />

  launchAboutModal: ->
    @props.app.launchModal <AboutModal
      dismiss={@props.app.dismissModal}
    />

  render: ->
    song = @props.song
    data = @props.data

    <div className="ui playback-control">
      <div className="group playback">
        <div
          className={
            'icon icon-play' +
            if song.playing then ' active' else ''
          }
          onClick={
            if song.playing
            then song.pause
            else song.play
          }
        />
        <div
          className={
            'icon icon-pause' +
            if song.playing or song.getTime() is 0 then '' else ' active'
          }
          onClick={song.pause}
        />
        <div className="icon icon-stop" onClick={song.stop}/>
      </div>
      <div className="group fill"/>
      <div className="group tempo">
        <Knob
          label="Level"
          value={data.get 'level'}
          onChange={data.bind 'level'}
        />
        <Oscilloscope buffer={if song.playing then song.buffer else [0]}/>
        <select
          value={data.get 'bpm'}
          onChange={data.bind 'bpm', (e) -> parseInt e.target.value}
        >
          {
            for i in [200..20]
              <option key={i} value={i}>{i} bpm</option>
          }
        </select>
        <div className="icon icon-cloud" onClick={@launchSaveModal}/>
        <div className="icon icon-help" onClick={@launchAboutModal}/>
      </div>
      <div className="logo">sinesaw</div>
    </div>
