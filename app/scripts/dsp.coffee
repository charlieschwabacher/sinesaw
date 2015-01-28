# this script is run inside a worker in order to do audio processing outside of
# the main ui thread.
#
# The worker receives three types of messages - 'update' w/ {state} containing
# the current state of the song, 'midi' w/ {message} containing incoming noteOn
# and noteOff messages, and 'buffer' w/ {size, index, sampleRate} requesting
# a buffer to be filled and sent back.
#
# It also sends two types of messages - 'frame' messages at 60hz containing the
# current playback state as {frame}, and sends 'buffer' messages transferring
# filled ArrayBuffers in response to 'buffer' requests.

Song = require './dsp/song.coffee'

self.song = new Song

self.logSample = require './dsp/components/log_sample'

# respond to messages from parent thread
self.onmessage = (e) ->
  switch e.data.type
    when 'buffer'
      song.buffer e.data.size, e.data.index, e.data.sampleRate, (buffer) ->
        postMessage
          type: 'buffer'
          buffer: buffer
        , [buffer]
    when 'update'
      song.update e.data.state
    when 'midi'
      song.midi e.data.message
    when 'addSample'
      song.addSample e.data.id, e.data.sampleData
    when 'removeSample'
      song.removeSample e.data.id

# trigger processing on song at frame rate and send updates to the parent thread
setInterval ->
  song.processFrame()
  postMessage
    type: 'frame'
    frame: song.getState()
, 1000 / 60
