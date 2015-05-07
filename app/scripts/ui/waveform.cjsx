React = require 'react/addons'
SizeMeasurable = require './mixins/size_measurable'
Draggable = require './mixins/draggable'
Marker = require './waveform/marker'
Visualization = require './waveform/visualization'

module.exports = React.createClass

  displayName: 'Waveform'

  propTypes:
    sampleData: React.PropTypes.object
    markers: React.PropTypes.object
    selectionStart: React.PropTypes.number
    selectionEnd: React.PropTypes.number
    marginTop: React.PropTypes.number
    marginBottom: React.PropTypes.number

  mixins: [React.addons.PureRenderMixin, SizeMeasurable, Draggable]

  # range in pixels for vertical drag to zoom
  range: 300
  dragTypeDistance: 10

  getInitialState: ->
    windowCenter: 0.5
    windowSize: 1

  getDefaultProps: ->
    marginTop: 2
    marginBottom: 2

  validateWindowCenter: (center) ->
    halfSize = @state.windowSize / 2

    if center < halfSize
      halfSize
    else if center > 1 - halfSize
      1 - halfSize
    else
      center

  onDragStart: ->
    @initialWindowSize = @state.windowSize
    @initialWindowCenter = @state.windowCenter

    # get sample index of initial mousdown
    relativePosition = (@dragStartPosition.x - @getDOMNode().getBoundingClientRect().left) / @state.width
    @initialPosition = @state.windowCenter + @state.windowSize * (relativePosition - 0.5)

  onDragEnd: ->
    @dragType = null
    @initialWindowSize = null
    @initialWindowCenter = null
    @initialPosition = null

  onDrag: (delta) ->
    if @dragType == 'scale'

      upRange = Math.min @range, (@dragStartPosition.y - window.scrollY)
      downRange = Math.min @range, (window.innerHeight + window.scrollY - @dragStartPosition.y)

      if delta.y < 0
        minValue = Math.min 1, @state.width / @props.sampleData.length
        size = Math.max minValue, @initialWindowSize * (downRange + delta.y) / downRange
      else
        size = Math.min 1, @initialWindowSize + (1 - @initialWindowSize) * delta.y / upRange

      center = @initialPosition - size / @initialWindowSize * (@initialPosition - @initialWindowCenter)

      @setState
        windowSize: size
        windowCenter: @validateWindowCenter center

    else if @dragType == 'pan'

      center = @initialWindowCenter - delta.x / @state.width * @initialWindowSize
      @setState windowCenter: @validateWindowCenter center

    else
      if Math.abs(delta.x) > @dragTypeDistance
        @dragType = 'pan'
      else if Math.abs(delta.y) > @dragTypeDistance
        @dragType = 'scale'

  render: ->

    if @props.sampleData? and @state.width > 0

      # render waveform

      sampleData = @props.sampleData

      # window size in slices
      resolution = @state.width / 2

      # window size in samples
      windowSize = Math.max 1, Math.floor @state.windowSize * sampleData.length

      # slice size in samples
      sliceSize = windowSize / resolution

      # window start in samples
      windowStart = Math.floor @state.windowCenter * sampleData.length - windowSize / 2

      # selection start / end in slices
      selectionStart = Math.floor (@props.selectionStart * sampleData.length - windowStart) / sliceSize
      selectionEnd = Math.ceil (@props.selectionEnd * sampleData.length - windowStart) / sliceSize

      if selectionStart > 1
        preSelection = <Visualization
          sampleData={sampleData}
          resolution={resolution}
          sliceSize={sliceSize}
          windowStart={windowStart}
          fromSlice={0}
          toSlice={Math.min resolution, selectionStart}
          width={@state.width}
          height={@state.height}
          marginTop={@props.marginTop}
          marginBottom={@props.marginBottom}
        />

      if selectionStart != selectionEnd
        selection = <Visualization
          sampleData={sampleData}
          resolution={resolution}
          sliceSize={sliceSize}
          windowStart={windowStart}
          fromSlice={Math.max 0, selectionStart}
          toSlice={Math.min resolution, selectionEnd}
          width={@state.width}
          height={@state.height}
          marginTop={@props.marginTop}
          marginBottom={@props.marginBottom}
          selection={true}
        />

      if selectionEnd < resolution
        postSelection = <Visualization
          sampleData={sampleData}
          resolution={resolution}
          sliceSize={sliceSize}
          windowStart={windowStart}
          fromSlice={Math.max 0, selectionEnd}
          toSlice={resolution}
          width={@state.width}
          height={@state.height}
          marginTop={@props.marginTop}
          marginBottom={@props.marginBottom}
        />

      # render markers
      markers = []
      if @props.markers?
        for name, data of @props.markers
          markers.push <Marker
            key={name}
            name={name}
            value={data.value}
            onChange={data.onChange}
            parentWidth={@state.width}
            parentHeight={@state.height}
            windowSize={@state.windowSize}
            windowCenter={@state.windowCenter}
          />

    <div className="ui waveform" ref="container">
      <svg
        width={@state.width}
        height={@state.height}
        onMouseDown={if @props.sampleData? then @draggableOnMouseDown else null}
      >
        {preSelection}
        {selection}
        {postSelection}
        {markers}
      </svg>
    </div>