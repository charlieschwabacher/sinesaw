Instrument = require './instrument'
RingBuffer = require './components/ring_buffer'
linearInterpolator = require './components/linear_interpolator'
lowpassFilter = require './components/lowpass_filter'
highpassFilter = require './components/highpass_filter'
envelope = require './components/envelope'


module.exports = class BasicSampler extends Instrument

  @createState: (state, instrument) ->
    super state, instrument

    state[instrument._id].filters =
      LP: (lowpassFilter() for i in [0...instrument.maxPolyphony])
      HP: (highpassFilter() for i in [0...instrument.maxPolyphony])
      none: (((sample) -> sample) for i in [0...instrument.maxPolyphony])

  @sample: (state, samples, instrument, time, i) ->
    return 0 if instrument.level is 0
    return 0 unless state[instrument._id]?

    sampleData = samples[instrument.sampleId]
    return 0 unless sampleData?

    r = Math.max 0.01, instrument.volumeEnv.r

    # sum all active notes
    instrument.level * state[instrument._id].notes.reduce((memo, note, index) =>
      return memo unless note?
      return memo if time > r + note.timeOff

      # get pitch shifted interpolated sample and apply volume envelope
      transpose = note.key - instrument.rootKey + instrument.tune - 0.5
      samplesElapsed = i - note.i
      offset = Math.floor instrument.start * sampleData.length
      loopActive = instrument.loopActive is 'loop'
      loopPoint = Math.floor instrument.loop * sampleData.length
      sample = linearInterpolator sampleData, transpose, samplesElapsed, offset, loopActive, loopPoint
      sample = envelope(instrument.volumeEnv, note, time) * (sample or 0)

      # apply filter with envelope
      cutoff = Math.min 1, instrument.filter.freq + instrument.filter.env * envelope(instrument.filterEnv, note, time)
      filter = state[instrument._id].filters[instrument.filter.type][index]
      sample = filter sample, cutoff, instrument.filter.res

      # return result
      memo + sample

    , 0)
