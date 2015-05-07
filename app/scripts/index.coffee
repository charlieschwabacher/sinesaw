ImmutableData = require './util/immutable_data'
React = require 'react/addons'
SongBridge = require './models/song_bridge'
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
  window.data = null
  history = null
  playbackState = null


  # define a debounced function to save current song to localstorage
  saveToLocalStorage = debounce 500, ->
    localStorage.setItem 'song', JSON.stringify data.get()


  # called when playback state is received from audio processing thread
  song.onFrame (state) -> playbackState = state


  # called every time song data changes
  ImmutableData.create songData, (d, h) ->

    # pass updated data to dsp thread
    song.update d

    # keep references to data cursor and history objects
    window.data = d
    history = h

    # save changes in localstorage
    saveToLocalStorage()

  , history: true


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
