context = require '../dsp/components/global_context'
MidiInput = require './midi_input'
cuid = require 'cuid'
b2a = require 'base64-arraybuffer'


module.exports = class SongWorker

  bufferSize: 4096

  constructor: ->
    @worker = new Worker '/dsp.js'
    @worker.onmessage = @handleMessage

    @node = context.createScriptProcessor @bufferSize, 1, 1
    @node.onaudioprocess = @handleAudioProcess

    @midiInput = new MidiInput
    @midiInput.onMessage @handleMidiInput

    @cursor = null
    @state = {}
    @samples = {}
    @frameHandlers = []

    @sampleRate = context.sampleRate
    @i = @t = 0
    @playing = false
    @bufferStartAbsolute = null
    @bufferPeding = false
    @buffer = new Float32Array @bufferSize

  destroy: ->
    @node.disconnect()
    @worker.terminate()

  handleAudioProcess: (e) =>
    # copy existing buffer to output channel
    channelData = e.outputBuffer.getChannelData(0).set @buffer

    # request a new buffer
    @requestBuffer() unless @bufferPending

    # increment time and index
    @i += @bufferSize
    @t = @i / @sampleRate
    @bufferStartAbsolute = Date.now()

  handleMidiInput: (message) =>
    message.time = @getTime()
    @worker.postMessage {type: 'midi', message}

  handleMessage: (e) =>
    switch e.data.type
      when 'buffer'
        @bufferPending = false
        @buffer = new Float32Array e.data.buffer
      when 'frame'
        fn e.data.frame for fn in @frameHandlers
      when 'bounce'
        @bounceCallback?(e.data.wav)

  requestBuffer: ->
    @bufferPending = true
    @worker.postMessage
      type: 'buffer'
      size: @bufferSize
      index: @i
      sampleRate: @sampleRate

  update: (cursor) ->
    @cursor = cursor
    @state = cursor.get()
    @worker.postMessage {type: 'update', @state}

  onFrame: (fn) ->
    @frameHandlers.push fn

  offFrame: (fn) ->
    i = @frameHandlers.indexOf fn
    @frameHandlers.splice i, 1 if i > -1

  addSample: (sampleData) ->
    id = cuid()
    @samples[id] = {sampleData, count: 1}

    @worker.postMessage {type: 'addSample', id, sampleData}

    id

  useSample: (id) ->
    throw new Error "sample #{id} not found" unless @samples[id]?
    @samples[id].count += 1
    id

  disuseSample: (id) ->
    return unless id?
    throw new Error "sample #{id} not found" unless @samples[id]?
    count = @samples[id].count -= 1

    if @samples[id].count is 0
      delete @samples[id]
      @worker.postMessage {type: 'removeSample', id}

    count

  # import song from a .sinesaw file
  fromFile: (file, cb) ->
    reader = new FileReader
    reader.onload = (e) =>
      @fromJSON e.target.result
      cb?()
    reader.readAsText file

  # import song from a json string
  fromJSON: (string) ->
    {state, samples} = JSON.parse string

    @cursor.set [], state
    @worker.postMessage {type: 'update', @state}

    @loadSamples samples

  loadSamples: (samples) ->
    @samples = Object.keys(samples).reduce((memo, id) =>
      {count, sampleData} = samples[id]
      memo[id] =
        count: count
        sampleData: new Float32Array b2a.decode sampleData
      memo
    , {})

    @worker.postMessage {type: 'clearSamples'}
    for id, {sampleData} of @samples
      @worker.postMessage {type: 'addSample', id, sampleData}

  # export song to .sinesaw file
  toFile: ->
    new Blob [@toJSON()], type: 'application/sinesaw'

  # export song to json string
  toJSON: ->
    JSON.stringify
      state: @state
      samples: Object.keys(@samples).reduce((memo, id) =>
        {count, sampleData} = @samples[id]
        memo[id] =
          count: count
          sampleData: b2a.encode sampleData.buffer
        memo
      , {})

  # begin playback
  play: =>
    return if @playing
    @node.connect context.destination
    @playing = true

    # this timeout seems to be the thing that keeps the audio from clipping
    setTimeout (-> this.node.disconnect()), 100000000000

  # stop playback
  pause: =>
    @playing = false
    @bufferStartAbsolute = null
    @node.disconnect()

  # stop playback and set current time to 0
  stop: =>
    @pause()
    @i = @t = 0
    @buffer = new Float32Array @bufferSize

  # seek to provided beat
  seek: (beat) =>
    @t = beat * 60 / @state.bpm
    @i = Math.floor(time * @sampleRate)
    @bufferStartAbsolute = null

  # return current time in seconds
  getTime: =>
    if @bufferStartAbsolute?
      @t + (Date.now() - @bufferStartAbsolute) / 1000
    else
      @t

  # return current position in beats (based on bpm)
  getPosition: =>
    @getTime() * @state.bpm / 60

  # bounce song to a wav file
  bounce: (cb) ->

    @bounceCallback = (buffer) =>
      delete @bounceCallback
      wav = new Blob [buffer], type: 'audio/wav'
      cb wav

    beatLength = Math.max.apply null, @state.tracks.map (track) ->
      track.sequence.loopSize

    @worker.postMessage
      type: 'bounce'
      index: 0
      size: beatLength * 60 / @state.bpm * @sampleRate
      sampleRate: @sampleRate

