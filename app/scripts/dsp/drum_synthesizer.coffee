Instrument = require './instrument'
highpassFilter = require './components/highpass_filter'
simpleEnvelope = require './components/simple_envelope'
oscillators = require './components/oscillators'


module.exports = class DrumSynthesizer extends Instrument

  minFreq = 60
  maxFreq = 3000
  freqScale = maxFreq - minFreq

  # keep notes in a map {key: noteData} instead of in a ring buffer
  # this gives us one monphonic voice per drum.
  @createState: (state, instrument) ->
    state[instrument._id] =
      notes: {}
      filters: (
        highpassFilter() for i in [0...127]
      )

  @sample: (state, samples, instrument, time, i) ->
    return 0 if instrument.level is 0
    return 0 unless state[instrument._id]?

    # sum all active notes
    instrument.level * instrument.drums.reduce((memo, drum) =>
      note = state[instrument._id].notes[drum.key]
      return memo unless note?

      elapsed = time - note.time
      return memo if elapsed > drum.decay

      env = simpleEnvelope drum.decay, elapsed
      freq = minFreq + drum.pitch * freqScale

      # apply pitch bend
      if drum.bend
        freq = (2 - drum.bend + drum.bend * env) / 2 * freq

      # apply fm
      if drum.fm > 0
        signal = oscillators.sine elapsed, minFreq + drum.fmFreq * freqScale
        freq += drum.fm * signal * simpleEnvelope(drum.fmDecay + 0.01, elapsed)

      # sum noise and oscillator
      sample = (
        (1 - drum.noise) * oscillators.sine(elapsed, freq) +
        drum.noise * oscillators.noise()
      )

      # apply highpass
      if drum.hp > 0
        sample = state[instrument._id].filters[drum.key] sample, drum.hp

      memo + drum.level * env * sample

    , 0)


  @tick: (state, instrument, time, i, beat, bps, notesOn, notesOff) ->
    @createState state, instrument unless state[instrument._id]?

    notesOn.forEach (note) =>
      state[instrument._id].notes[note.key] = {time, i}

