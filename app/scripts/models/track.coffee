Model = require './model'
Sequence = require './sequence'
Instruments = require './instruments'


module.exports = class Track extends Model

  @defaults: ->
    name: 'Track'
    sequence: Sequence.build()
    effects: []

  @destroy: (song, track) ->
    console.log track
    console.log Instruments[track.instrument._type]
    Instruments[track.instrument._type].destroy song, track.instrument
