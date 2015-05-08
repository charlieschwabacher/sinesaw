Ultrawave = require 'ultrawave'
React = require 'react/addons'
SongWorker = require './core/song_worker'
Song = require './models/song'
App = require './ui/app'
debounce = require './util/debounce'


# development only code
if process.env.NODE_ENV is 'development'

  # setup gulp build status / autoreload
  (require 'build-status').client()

  # set React on window for debugging / react dev tools chrome extension
  window.React = React


# setup immutable data, dsp thread, and start app
launch = (songData) ->

  song = new SongBridge
  data = null
  changes = null
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

  # create an ultrawave to synchronize song state over webrtc
  ultrawave = new Ultrawave 'ws://examples-ultrawave.rhcloud.com:8000'
  group = "sinesaw:#{window.location.search}"

  ultrawave

    .joinOrCreate group, songData, (d, c) ->

      # pass updated data to dsp thread
      song.update d

      # keep references to data cursor and history objects
      data = d
      changes = c

      # save changes in localstorage
      saveToLocalStorage()

    .then ->

      # render the app on every animation frame
      frame = ->
        React.render(
          React.createElement(App, {song, data, playbackState, history}),
          document.body
        )
        requestAnimationFrame frame

      frame()


document.addEventListener 'DOMContentLoaded', ->

  data = localStorage.getItem 'song'

  if data?
    launch JSON.parse data
  else
    launch require './extra/demo_song'
