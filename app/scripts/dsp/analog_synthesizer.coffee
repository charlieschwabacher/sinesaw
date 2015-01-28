Instrument = require './instrument'
RingBuffer = require './components/ring_buffer'
lowpassFilter = require './components/lowpass_filter'
highpassFilter = require './components/highpass_filter'
envelope = require './components/envelope'
oscillators = require './components/oscillators'


module.exports = class AnalogSynthesizer extends Instrument

  tune = 440
  frequency = (key) ->
    tune * Math.pow 2, (key - 69) / 12

  @createState: (state, instrument) ->
    super state, instrument

    state[instrument._id].filters =
      LP: (lowpassFilter() for i in [0...instrument.maxPolyphony])
      HP: (highpassFilter() for i in [0...instrument.maxPolyphony])
      none: (((sample) -> sample) for i in [0...instrument.maxPolyphony])

  @sample: (state, samples, instrument, time, i) ->
    return 0 if instrument.level is 0
    return 0 unless state[instrument._id]?

    r = Math.max 0.01, instrument.volumeEnv.r

    # sum all active notes
    instrument.level * state[instrument._id].notes.reduce((memo, note, index) =>
      return memo unless note?
      return memo if time > r + note.timeOff

      # sum oscillators and apply volume envelope
      osc1Freq = frequency note.key + instrument.osc1.tune - 0.5 + Math.round(24 * (instrument.osc1.pitch - 0.5))
      osc2Freq = frequency note.key + instrument.osc2.tune - 0.5 + Math.round(24 * (instrument.osc2.pitch - 0.5))
      sample = envelope(instrument.volumeEnv, note, time) * (
        instrument.osc1.level * oscillators[instrument.osc1.waveform](time, osc1Freq) +
        instrument.osc2.level * oscillators[instrument.osc2.waveform](time, osc2Freq)
      )

      # apply filter with envelope
      cutoff = Math.min 1, instrument.filter.freq + instrument.filter.env * envelope(instrument.filterEnv, note, time)
      filter = state[instrument._id].filters[instrument.filter.type][index]
      sample = filter sample, cutoff, instrument.filter.res

      # return result
      memo + sample

    , 0)
