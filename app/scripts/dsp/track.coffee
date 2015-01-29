instrumentTypes =
  AnalogSynthesizer: require './analog_synthesizer'
  BasicSampler: require './basic_sampler'
  DrumSampler: require './drum_sampler'
  DrumSynthesizer: require './drum_synthesizer'
  LoopSampler: require './loop_sampler'


module.exports = class Track

  @createState: (state, track) ->
    state[track._id] =
      meterLevel: 0

  @releaseState: (state, track) ->
    delete state[track._id]

  @sample: (state, samples, track, time, i) ->
    # get instrument output
    Instrument = instrumentTypes[track.instrument._type]
    sample = Instrument.sample state, samples, track.instrument, time, i

    # apply effects
    sample = track.effects.reduce((sample, effect) ->
      Effect.sample state, effect, time, i, sample
    , sample)

    # update meter levels
    if trackState = state[track._id]
      level = trackState.meterLevel
      if not level? or isNaN(level) or sample > level
        trackState.meterLevel = sample

    sample

  @tick: (state, track, midiMessages, time, i, beat, lastBeat, bps) ->
    @createState state, track unless state[track._id]?

    Instrument = instrumentTypes[track.instrument._type]

    # get notes on from sequence
    {notesOn, notesOff} = @notes track.sequence, midiMessages, time, beat, lastBeat

    Instrument.tick state, track.instrument, time, i, beat, bps, notesOn, notesOff
    track.effects.forEach (e) -> e.tick state, time, beat, bps

  # look at sequence and midi messages, return arrays of notes on and off
  # occurring in this tick
  @notes: (sequence, midiMessages, time, beat, lastBeat) ->
    bar = Math.floor beat / sequence.loopSize
    lastBar = Math.floor lastBeat / sequence.loopSize
    beat = beat % sequence.loopSize
    lastBeat = lastBeat % sequence.loopSize

    notesOn = []
    notesOff = []

    for id, note of sequence.notes
      start = note.start
      end = note.start + note.length

      # catch notes on
      if start < beat and (start >= lastBeat or bar > lastBar)
        notesOn.push {key: note.key}

      # catch notes off
      if end < beat and (end >= lastBeat or bar > lastBar)
        notesOff.push {key: note.key}

      # catch notes off for notes ending extactly at the end of a bar
      else if bar > lastBar and end == sequence.loopSize
        notesOff.push {key: note.key}

    if midiMessages?
      midiMessages.forEach (message, i) ->
        if message.time < time
          midiMessages.splice i, 1
          switch message.type
            when 'on'
              notesOn.push key: message.key
            when 'off'
              notesOff.push key: message.key

    {notesOn, notesOff}
