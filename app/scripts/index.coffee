Ultrawave = require 'ultrawave'
React = require 'react'
ReactDOM = require 'react-dom'
SongWorker = require './core/song_worker'
App = require './ui/app'
debounce = require './util/debounce'


# development only code
if process.env.NODE_ENV is 'development'

  # setup gulp build status / autoreload
  (require 'build-status').client()

  # set React on window for debugging / react dev tools chrome extension
  window.React = React


# setup immutable data, dsp thread, and start app
launch = (state) ->

  window.song = new SongWorker
  song.loadSamples samples if samples?

  window.data = null
  changes = null
  playbackState = null

  # define a debounced function to save current song to localstorage
  saveToLocalStorage = debounce 2000, ->
    localStorage.setItem 'song', JSON.stringify data.get()

  # called when playback state is received from audio processing thread
  song.onFrame (state) -> playbackState = state

  # create an ultrawave to synchronize song state over webrtc
  ultrawave = new Ultrawave 'ws://localhost:3002'
  group = "sinesaw:#{window.location.search}"

  ultrawave

    .joinOrCreate group, state, (d, c) ->

      console.log('joined or created')

      # pass updated data to dsp thread
      song.update d, c

      # keep references to data cursor and changes objects
      window.data = d
      changes = c

      # save changes in localstorage
      saveToLocalStorage()

    .then ->

      console.log 'starting rendering'

      # render the app on every animation frame
      container = document.getElementById 'sinesaw'
      frame = ->
        ReactDOM.render(
          React.createElement(App, {song, data, playbackState, history}),
          container
        )
        requestAnimationFrame frame

      frame()


document.addEventListener 'DOMContentLoaded', ->

  data = localStorage.getItem 'song'

  if data?
    launch JSON.parse data
  else
    launch require './extra/demo_song'
