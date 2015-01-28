RingBuffer = require './components/ring_buffer'


module.exports = class Instrument

  @createState: (state, instrument) ->
    state[instrument._id] =
      notes: new RingBuffer instrument.maxPolyphony, Array, instrument.polyphony
      noteMap: {}

  @releaseState: (state, instrument) ->
    delete state[instrument._id]

  @sample: (state, samples, instrument, time, i) ->
    0

  @tick: (state, instrument, time, i, beat, bps, notesOn, notesOff) ->
    @createState state, instrument unless state[instrument._id]?
    instrumentState = state[instrument._id]

    if instrument.polyphony != instrumentState.notes.length
      instrumentState.notes.resize instrument.polyphony

    notesOff.forEach ({key}) ->
      # console.log 'note off ' + key
      instrumentState.noteMap[key]?.timeOff = time

    notesOn.forEach ({key}) ->
      # console.log 'note on ' + key
      instrumentState.noteMap[key] = {time, i, key}
      instrumentState.notes.push instrumentState.noteMap[key]

