Cursor = require './util/cursor'
React = require 'react/addons'
SongWorker = require './core/song_worker'
Song = require './models/song'
WebRTC = require './util/web_rtc'
App = require './ui/app'
debounce = require './util/debounce'


# development only code
if process.env.NODE_ENV is 'development'

  # setup gulp build status / autoreload
  (require 'build-status').client()

  # set these on window for debugging / react dev tools chrome extension
  window.React = React
  window.App = App
  window.Track = require './models/track'
  window.DrumSampler = require './models/drum_sampler'
  window.BasicSampler = require './models/basic_sampler'
  window.TrackSelection = require './ui/track_selection'
  window.Meter = require './ui/meter'
  window.PianoRoll = require './ui/piano_roll'
  window.GridLines = require './ui/piano_roll/grid_lines'
  window.Keys = require './ui/piano_roll/keys'
  window.Notes = require './ui/piano_roll/notes'
  window.PlaybackMarker = require './ui/piano_roll/playback_marker'
  window.Selection = require './ui/piano_roll/selection'



# setup immutable data, dsp thread, and start app
document.addEventListener 'DOMContentLoaded', ->
  song = new SongWorker
  rtc = new WebRTC
  data = null
  history = null
  playbackState = null

  savedJson = localStorage.getItem 'song'
  if savedJson?
    {state, samples} = JSON.parse savedJson
    song.loadSamples samples
  else
    state = Song.build()


  # define a debounced function to save current song to localstorage
  saveToLocalStorage = debounce 2000, ->
    localStorage.setItem 'song', song.toJSON()


  # called when playback state is received from audio processing thread
  song.onFrame (state) -> playbackState = state


  # called every time song data changes
  Cursor.create state, (d, h, c) ->

    # keep references to data cursor and history objects
    data = d
    history = h

    # pass updated data to dsp thread
    song.update d

    # pass current list of changes to WebRTC adapter
    rtc.update c

    # save changes in localstorage
    saveToLocalStorage()

  , history: true


  # render the app on every animation frame
  do frame = ->
    React.render(
      React.createElement(App, {song, data, playbackState, history}),
      document.body
    )
    requestAnimationFrame frame
