module.exports = class MidiInput

  constructor: ->
    @error = false
    @enabled = false
    @notes = {}
    @messageHandlers = []

    if navigator.requestMIDIAccess?
      @enabled = true
      navigator.requestMIDIAccess().then @onMIDIInit, @onMIDISystemError

  onMIDIInit: (midi) =>
    @midi = midi
    @inputs = []

    iterator = midi.inputs.values()

    while not done
      {value, done} = iterator.next()
      unless done
        @inputs.push value
        value.onmidimessage = @onMIDIMessage

  onMIDISystemError: =>
    @error = true

  onMIDIMessage: (e) =>
    cmd = e.data[0] >> 4
    channel = e.data[0] & 0xf
    noteNumber = e.data[1]
    velocity = if e.data.length > 2 then e.data[2] else 0

    # noteoff (noteon with velocity=0 is the same as noteoff)
    if cmd is 8 or (cmd is 9 and velocity is 0)
      @noteOff noteNumber
    # noteon
    else if cmd is 9
      @noteOn noteNumber, velocity
    # controller message
    else if cmd is 11
      @controller noteNumber, velocity
    # probably sysex!
    else
      null

  onMessage: (fn) ->
    @messageHandlers.push fn

  offMessage: (fn) ->
    i = @messageHandlers.indexOf fn
    @messageHandlers.splice i, 1 if i > -1

  noteOn: (number, velocity) ->
    nextNotes = {}
    nextNotes[k] = v for k, v of @notes
    nextNotes[number] = velocity
    @notes = nextNotes

    message = {type: 'on', key: number, velocity}
    fn message for fn in @messageHandlers

  noteOff: (number, velocity) ->
    nextNotes = {}
    (nextNotes[k] = v unless `(k == number)`) for k, v of @notes
    @notes = nextNotes

    message = {type: 'off', key: number}
    fn message for fn in @messageHandlers

  controller: ->


