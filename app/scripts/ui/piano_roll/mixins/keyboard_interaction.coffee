# Keyboard interaction for the PianoRoll react component

Keyboard = require 'keyboardjs'

module.exports =

  componentDidMount: ->
    @keyBindings = [
      Keyboard.on 'backspace', @onBackspaceKey
      Keyboard.on 'left, right, up, down', @onArrowKey
      Keyboard.on 'command + a', @selectAll
      Keyboard.on 'escape', @clearSelection
    ]

  componentWillUnmount: ->
    binding.clear() for binding in @keyBindings

  onBackspaceKey: (e) ->
    e.preventDefault()
    for id in @state.selectedNotes
      @props.sequence.delete ['notes', id]

  onArrowKey: (e) ->
    e.preventDefault()

    changes = {}

    for id in @state.selectedNotes

      note = @props.sequence.get ['notes', id]

      # left arrow
      if e.keyCode is 37
        changes[id] = start: note.start - 1 / @state.quantization

      # up arrow
      else if e.keyCode is 38
        distance = if 'shift' in Keyboard.activeKeys() then 12 else 1
        changes[id] = key: note.key + distance

      # right arrow
      else if e.keyCode is 39
        changes[id] = start: note.start + 1 / @state.quantization

      # down arrow
      else if e.keyCode is 40
        distance = if 'shift' in Keyboard.activeKeys() then 12 else 1
        changes[id] = key: note.key - distance

    @updateNotes changes

  selectAll: ->
    @setState selectedNotes: Object.keys @props.sequence.get 'notes'

  clearSelection: ->
    @setState selectedNotes: []
