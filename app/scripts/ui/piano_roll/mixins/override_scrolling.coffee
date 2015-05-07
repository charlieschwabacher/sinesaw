# this mixin overrides the native scrolling for the PianoRoll component, and
# handles scrolling and scaling of the piano roll viewport

module.exports =

  getInitialState: ->
    # x scale and scroll values are in beats
    # y scale and scroll values are in half steps

    # x and y scale and scroll are set after component mounts based on
    # sequence property and size of element on screen
    xScale: 1
    yScale: 12
    xScroll: 0
    yScroll: 0

    # min and max scales of viewport
    minXScale: 1
    maxXScale: 64
    minYScale: 12
    maxYScale: 128

    # extra space around the element used to measure scrolling, should be
    # more than the maximum possible distance travelled between scroll events
    scrollPadding: 500

  componentDidMount: ->
    el = @refs.container.getDOMNode()

    setTimeout =>
      el.scrollTop = @state.scrollPadding
      el.scrollLeft = @state.scrollPadding

    # used to store scroll delta while it is not yet enough to move the viewport
    # by an entire quantum
    @scrollDeltaY = 0
    @scrollDeltaX = 0

    @autoScaleViewport @props.sequence

  # when the sequence prop changes, scale the viewport to fit the new sequence
  componentWillReceiveProps: (nextProps) ->
    if nextProps.sequence.get('_id') isnt @lastSequenceId
      @lastSequenceId = nextProps.sequence.get '_id'
      @autoScaleViewport nextProps.sequence


  # scale the viewport to fit all notes in the sequence
  autoScaleViewport: (sequence) ->
    minKey = 128
    maxKey = 0

    for id, note of sequence.get 'notes'
      return unless note
      minKey = note.key if note.key < minKey
      maxKey = note.key if note.key > maxKey

    size = Math.max(@state.minYScale, maxKey - minKey)

    if size < 12
      size += 12
    else
      size += 5

    @setState
      xScroll: 0
      xScale: sequence.get 'loopSize'
      yScroll: Math.max 0, Math.ceil (minKey + maxKey - size) / 2
      yScale: size

  # we can't prevent default on this because it prevents the scroll event from
  # firing, but we need to cancel it to prevent scrolling
  preventWheel: (e) ->
    el = e.target
    el.scrollTop = el.scrollLeft = @state.scrollPadding

  # watch and prevent default on scroll events, instead keeping scroll position
  # in @state.xScroll and @state.yScroll
  overrideScrolling: (e) ->
    e.preventDefault()
    e.stopPropagation()

    el = e.target
    xQuantum = @state.width / @state.xScale / @state.quantization
    yQuantum = @state.height / @state.yScale
    loopSize = @props.sequence.get 'loopSize'

    # update scroll deltas
    @scrollDeltaX += el.scrollLeft - @state.scrollPadding
    @scrollDeltaY += @state.scrollPadding - el.scrollTop

    # prevent scroll
    el.scrollTop = el.scrollLeft = @state.scrollPadding

    # get updated scroll state
    if Math.abs(@scrollDeltaX) > xQuantum
      quanta = (if @scrollDeltaX > 0 then Math.floor else Math.ceil)(@scrollDeltaX / xQuantum)
      @scrollDeltaX -= quanta * xQuantum
      xScroll = Math.min Math.max(0, @state.xScroll + quanta / @state.quantization), loopSize - @state.xScale

    if Math.abs(@scrollDeltaY) > yQuantum
      quanta = (if @scrollDeltaY > 0 then Math.floor else Math.ceil)(@scrollDeltaY / yQuantum)
      @scrollDeltaY -= quanta * yQuantum
      yScroll = Math.min Math.max(0, @state.yScroll + quanta), 128 - @state.yScale

    # apply changes
    if xScroll? or yScroll?
      @setState
        xScroll: if xScroll? then xScroll else @state.xScroll
        yScroll: if yScroll? then yScroll else @state.yScroll
