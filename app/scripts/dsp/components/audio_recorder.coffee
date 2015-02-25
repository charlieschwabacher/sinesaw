context = require './global_context'


# create worker script inline by calling toString on a function

workerScript = URL.createObjectURL(new Blob(['(', ((self) ->

  buffers = []
  length = 0

  record = (inputBuffer) ->
    buffers.push inputBuffer
    length += inputBuffer.length

  clear = ->
    buffers = []
    length = 0

  getSampleData = ->
    # join buffers into float array
    sampleData = new Float32Array length
    offset = 0
    for buffer in buffers
      sampleData.set buffer, offset
      offset += buffer.length

    # normalize
    max = -Infinity
    for value, i in sampleData
      v = Math.abs value
      max = v if v > max

    for value, i in sampleData
      sampleData[i] = value / max

    postMessage sampleData

  self.onmessage = (e) ->
    switch e.data.command
      when 'record' then record e.data.buffer
      when 'clear' then clear()
      when 'getSampleData' then getSampleData()

).toString(), ')(self)'], type: 'application/javascript'))



module.exports = class AudioRecorder

  constructor: (input) ->
    @input = input
    @recorder = context.createScriptProcessor 4096, 1, 1
    @recording = false
    @worker = new Worker workerScript

    @recorder.onaudioprocess = (e) =>
      console.log 'recorder audio processes - ' + @recording
      return unless @recording
      @worker.postMessage
        command: 'record'
        buffer: e.inputBuffer.getChannelData 0

    @worker.onmessage = (e) =>
      @currentCallback?(e.data)
      @currentCallback = null

    @input.connect @recorder
    @recorder.connect context.destination

  record: ->
    @recording = true
    this

  stop: ->
    @recording = false
    this

  clear: ->
    @worker.postMessage command: 'clear'
    this

  getSampleData: (callback) ->
    @currentCallback = callback
    @worker.postMessage command: 'getSampleData'
    this

  destroy: ->
    @recorder.disconnect @input
    @recorder.disconnect context.destination
    @worker.terminate()
