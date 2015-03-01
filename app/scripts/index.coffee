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

  # set React on window for debugging / react dev tools chrome extension
  window.React = React


# setup immutable data, dsp thread, and start app
document.addEventListener 'DOMContentLoaded', ->
  song = new SongWorker
  rtc = new WebRTC
  data = null
  history = null
  playbackState = null

  # if they are at root, load their saved song or create a new song
  if location.pathname is '/'
    savedJson = localStorage.getItem 'song'
    if savedJson?
      {state, samples} = JSON.parse savedJson
      song.loadSamples samples
    else
      state = Song.build()
  else
    rtc.connect location.pathname.slice 1


  # define a debounced function to save current song to localstorage
  saveToLocalStorage = debounce 2000, ->
    localStorage.setItem 'song', song.toJSON()


  # called when playback state is received from audio processing thread
  song.onFrame (state) -> playbackState = state


  # called every time song data changes
  Cursor.create state, (d, h) ->

    # keep references to data cursor and history objects
    data = d
    history = h

    # pass updated data to dsp thread
    song.update d

    # save changes in localstorage
    saveToLocalStorage()

  , history: true


  # render the app on every animation frame
  do frame = ->
    React.render(
      React.createElement(App, {song, rtc, data, playbackState, history}),
      document.body
    )
    requestAnimationFrame frame
