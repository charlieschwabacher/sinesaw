Model = require './model'
Track = require './track'
AnalogSynthesizer = require './analog_synthesizer'

module.exports = class Song extends Model

  @defaults: ->
    name: 'New Song'
    bpm: 120
    level: 1
    selectedTrack: 0
    tracks: [
      do ->
        t = Track.build()
        t.instrument = AnalogSynthesizer.build()
        t
    ]
