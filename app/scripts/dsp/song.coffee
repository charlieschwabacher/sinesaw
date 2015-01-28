Track = require './track'

module.exports = class Song

  # number of samples to process between ticks
  clockRatio = 110

  # rate at which level meters decay
  meterDecay = 0.05

  clip = (sample) ->
    Math.max(0, Math.min(2, sample + 1)) - 1

  constructor: ->
    @lastBeat = 0

    # keep mutable state for audio playback here - this will store things like
    # filter memory and meter levels that need to stay outside the normal cursor
    # structure for performance reasons
    @state = {}

    # keep a reference to the current song document
    @song = null

    # keep references to the currently used samples
    @samples = {}

    # keep a list of unprocessed midi messages
    @midiMessages = []

  update: (state) ->
    @song = state

  midi: (message) ->
    @midiMessages.push message

  # fill a buffer function
  buffer: (size, index, sampleRate, cb) ->
    arr = new Float32Array size

    if @song?
      for i in [0...size]
        ii = index + i
        t = ii / sampleRate
        arr[i] = @sample t, ii

    cb arr.buffer

  # called for every sample of audio
  sample: (time, i) =>
    @tick time, i if i % clockRatio is 0

    clip @song.level * @song.tracks.reduce((memo, track) =>
      memo + Track.sample @state, @samples, track, time, i
    , 0)

  # called for every clockRatio samples
  tick: (time, i) =>
    bps = @song.bpm / 60
    beat = time * bps

    @song.tracks.forEach (track, index) =>

      # for now send midi only to the first track - in the future we should
      # allow tracks to be armed for recording
      midiMessages = if index is @song.selectedTrack then @midiMessages else null

      Track.tick @state, track, midiMessages, time, i, beat, @lastBeat, bps

    @lastBeat = beat

  # store sample data for a new sample
  addSample: (id, sampleData) ->
    @samples[id] = sampleData

  # release data for a sample
  removeSample: (id) ->
    delete @samples[id]

  # called periodically to pass high frequency data to the ui.. this should
  # eventually be updated to base the amount of decay on the actual elpased time
  processFrame: ->
    if @song?.tracks?
      # apply decay to meter levels
      for track in @song.tracks
        if @state[track._id]?
          @state[track._id].meterLevel -= meterDecay

  # get a sendable version of current song playback state
  getState: ->
    meterLevels: @song?.tracks?.reduce((memo, track) =>
      memo[track._id] = @state[track._id]?.meterLevel
      memo
    , {})

