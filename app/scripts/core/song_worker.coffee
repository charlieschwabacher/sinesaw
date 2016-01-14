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

  update: (cursor, changes) ->
    @cursor = cursor
    @state = cursor.get()
    @worker.postMessage {type: 'update', @state}

  onFrame: (fn) ->
    @frameHandlers.push fn

  offFrame: (fn) ->
    i = @frameHandlers.indexOf fn
    @frameHandlers.splice i, 1 if i > -1

  # send existing samples to worker thread
  loadSamples: ->
    @worker.postMessage {type: 'clearSamples'}
    for id, {fileName, count, sampleData} of @state.samples
      @worker.postMessage {type: 'addSample', id, sampleData}

  # store a sample in the cursor, and send to worker thread, return its id
  addSample: (fileName, sampleData) ->
    id = cuid()
    @worker.postMessage {type: 'addSample', id, sampleData}
    @cursor.set ['samples', id], {fileName, count: 1, sampleData: b2a.encode sampleData.buffer}
    id

  getSample: (id) ->
    @state.samples[id]

  useSample: (id) ->
    throw new Error "sample #{id} not found" unless @state.samples[id]?
    @cursor.set ['samples', id, 'count'], @state.samples[id].count + 1
    id

  releaseSample: (id) ->
    throw new Error "sample #{id} not found" unless @state.samples[id]?
    count = @state.samples[id].count - 1

    if count is 0
      @worker.postMessage {type: 'removeSample', id}
      @cursor.delete ['samples', id]
    else
      @cursor.set ['samples', id, 'count'], count

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
    @cursor.set [], JSON.parse string
    @worker.postMessage {type: 'update', @state}
    @loadSamples()

  # export song to .sinesaw file
  toFile: ->
    new Blob [JSON.stringify @state], type: 'application/sinesaw'

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

