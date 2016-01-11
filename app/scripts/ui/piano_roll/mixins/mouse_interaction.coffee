# Mouse interaction for the PianoRoll react component

Keyboard = require 'keyboardjs'
Pointer = require '../../../util/pointer'
cuid = require 'cuid'


module.exports =

  getInitialState: ->
    # state used during selection / resize / translate actions
    selectionOrigin: null
    selectionPosition: null
    resizeTarget: null
    resizeDirection: null
    translateTarget: null

  # given a position with {x,y} values in pixels relative to the window, return
  # {key, start} with values in notes and beats based on the current zoom and
  # scroll positions of the piano roll
  getRelativePosition: ({x,y}) ->
    {top, left} = @refs.grid.getBoundingClientRect()
    height = @state.height
    width = @state.width - @state.keyWidth

    key = Math.floor((height - y + top) / height * @state.yScale) + @state.yScroll
    start = Math.floor((x - left) / width * @state.xScale * @state.quantization) / @state.quantization + @state.xScroll

    {key, start}

  # return an array of note ids, representing notes in the squence intersecting
  # a rectangle defined by the arguments from {key, start}, and to {key, start}
  notesSelectedBy: (from, to) ->
    minKey = Math.min from.key, to.key
    maxKey = Math.max from.key, to.key
    minEnd = Math.min from.start, to.start
    maxStart = Math.max from.start, to.start

    notes = []

    for id, {key, start, length} of @props.sequence.get 'notes'

      notes.push id if (
        key >= minKey and
        key <= maxKey and
        start + length > minEnd and
        start <= maxStart
      )

    notes

  # this doesn't do anything yet, but eventually it could play the clicked note
  # or could select all notes w/ the clicked key
  onClickKeys: (e) ->

  # deselect any selected notes,
  # start drag selection
  onMouseDownGrid: (e) ->
    @setState selectedNotes: [] unless 'shift' in Keyboard.activeKeys()

    # handle drag start
    @draggableOnMouseDown e
    @setState selectionOrigin: @getRelativePosition {x: e.clientX, y: e.clientY}

  # move playback position
  # we need to have a selected position seperate from actual playback position,
  # similar to ableton live - setting actual playback positon on click is
  # problematic because a click is triggered by a click to select a note, begin
  # drag selection, or by a double click to create a new note
  onClickGrid: (e) ->
    # onSingleClickOnly e.nativeEvent, (e) =>
    #   @props.song.seek @getRelativePosition(x: e.clientX, y: e.clientY).start

  # add a new note
  onDoubleClickGrid: (e) ->
    {key, start} = @getRelativePosition x: e.clientX, y: e.clientY
    id = cuid()

    changes = {}
    changes[id] = {id, key, start, length: 1 / @state.quantization}

    @props.sequence.merge notes: changes

  # change cursor to indicate possible action
  onMouseMoveNote: (e) ->
    position = e.target.getBoundingClientRect()

    handleSize = Math.max 0, Math.min @state.resizeHandleWidth, (position.width - @state.resizeHandleWidth) / 2

    if position.left > e.clientX - handleSize
      @noteHoverCursor = Pointer.set 'w-resize', 1, @noteHoverCursor
    else if position.right < e.clientX + handleSize
      @noteHoverCursor = Pointer.set 'e-resize', 1, @noteHoverCursor
    else
      Pointer.clear @noteHoverCursor

  # clear existing cursor
  onMouseOutNote: (e) ->
    Pointer.clear @noteHoverCursor

  # A mouse down event on a note will select the note, and can be the beginning
  # of a translation or resize of the selected notes.
  onMouseDownNote: (e) ->
    e.stopPropagation()

    id = e.target.getAttribute 'data-id'
    position = e.target.getBoundingClientRect()

    # handle note selection
    if 'shift' in Keyboard.activeKeys()
      selectedNotes = @state.selectedNotes.slice 0
      if id in @state.selectedNotes
        selectedNotes.splice selectedNotes.indexOf(id), 1
      else
        selectedNotes.push id
    else
      unless id in @state.selectedNotes
        selectedNotes = [id]
      else
        selectedNotes = @state.selectedNotes

    stateChanges = {selectedNotes}

    # handle drag start
    @draggableOnMouseDown e

    # cache original values of selected notes
    @originalValue = {}
    for noteId, note of @props.sequence.get 'notes'
      if selectedNotes.indexOf(noteId) >= 0
        @originalValue[noteId] = note

    @dragOrigin = @props.sequence.get ['notes', id]

    handleSize = Math.max 0, Math.min @state.resizeHandleWidth, (position.width - @state.resizeHandleWidth) / 2

    # handle resize
    if position.left > e.clientX - handleSize
      stateChanges.resizeTarget = id
      stateChanges.resizeDirection = 'left'
      @dragActionCursor = Pointer.set 'w-resize', 2, @dragActionCursor
    else if position.right < e.clientX + handleSize
      stateChanges.resizeTarget = id
      stateChanges.resizeDirection = 'right'
      @dragActionCursor = Pointer.set 'e-resize', 2, @dragActionCursor
    # handle translate
    else
      stateChanges.translateTarget = id
      @dragActionCursor = Pointer.set 'move', 2, @dragActionCursor

    # apply state changes
    @setState stateChanges


  # remove the double clicked note
  onDoubleClickNote: (e) ->
    e.stopPropagation()
    @props.sequence.delete ['notes', e.target.getAttribute 'data-id']


  # A drag can either be selection, translation of notes, or resize of notes.
  # This determines which is occuring and takes the appropriate action
  onDrag: (delta, e) ->

    position = @getRelativePosition x: e.clientX, y: e.clientY

    # handle drag selection
    if @state.selectionOrigin?
      @setState selectionPosition: position

    else
      keyDelta = position.key - @dragOrigin.key
      startDelta = position.start - @dragOrigin.start
      notes = {}

      # handle translation of notes
      if @state.translateTarget?
        for id, note of @originalValue
          notes[id] =
            key: note.key + keyDelta
            start: note.start + startDelta

      # handle resize of notes
      if @state.resizeTarget?
        minLength = 1 / @state.quantization

        if @state.resizeDirection == 'right'
          for id, note of @originalValue
            notes[id] = length: Math.max minLength, note.length + startDelta - @dragOrigin.length + minLength

        if @state.resizeDirection == 'left'
          for i, note of @originalValue
            start = note.start + startDelta
            start = Math.max 0, start
            start = Math.min start, note.start + note.length - minLength
            notes[i] =
              start: start
              length: note.start + note.length - start

      @updateNotes notes

  # the end of a drag can either
  onDragEnd: (e) ->
    # if the alt key is held, copy notes
    if @originalValue? and 'alt' in Keyboard.activeKeys()

      changes = {}
      for id, {key, start, length} of @originalValue
        id = cuid()
        changes[id] = {id, key, start, length}

      @props.sequence.merge notes: changes

    stateChanges =
      translateTarget: null
      resizeTarget: null
      resizeDirection: null
      selectionOrigin: null
      selectionPosition: null

    # handle drag select
    if @state.selectionOrigin?

      position = @getRelativePosition x: e.clientX, y: e.clientY
      selectedNotes = @notesSelectedBy @state.selectionOrigin, position
      selectedNotes = @state.selectedNotes.slice(0).concat selectedNotes if 'shift' in Keyboard.activeKeys()
      stateChanges.selectedNotes = selectedNotes

    @setState stateChanges

    @originalValue = null
    @dragOrigin = null

    Pointer.clear @dragActionCursor
