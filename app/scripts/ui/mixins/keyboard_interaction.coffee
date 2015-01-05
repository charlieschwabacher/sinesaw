# global keyboard controls mixin, included by the App component

Keyboard = require 'keyboardjs'

module.exports =

  componentDidMount: ->
    @keyBindings = [
      Keyboard.on 'space', @onSpaceKey
      Keyboard.on 'ctrl + z', @undo
      Keyboard.on 'ctrl + shift + z', @redo
    ]

  componentWillUnmount: ->
    console.log 'unmounting'
    binding.clear() for binding in @keyBindings

  onSpaceKey: (e) ->
    e.preventDefault()
    if @props.data.get 'playing'
      @props.song.pause()
    else
      @props.song.play()

  undo: ->
    @props.undo()

  redo: ->
    @props.redo()
