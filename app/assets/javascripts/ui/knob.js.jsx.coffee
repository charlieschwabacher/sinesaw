###* @jsx React.DOM ###

@Knob = React.createClass

  range: 100

  mixins: [Draggable]

  getDefaultProps: ->
    value: 0.5

  onDragStart: ->
    @initalValue = @props.value
    @getDOMNode().classList.add 'active'

  onDrag: (delta) ->
    upRange = Math.min @range, (@dragStartPosition.y - window.scrollY)
    downRange = Math.min @range, (window.innerHeight + window.scrollY - @dragStartPosition.y)

    if delta.y < 0
      value = Math.max 0, @initalValue * (downRange + delta.y) / downRange
    else
      value = Math.min 1, @initalValue + (1 - @initalValue) * delta.y / upRange

    @props.onChange value

  onDragEnd: ->
    @initalValue = null
    @getDOMNode().classList.remove 'active'

  render: ->
    style ='-webkit-transform': "rotate(#{(@props.value - 0.5) * 300}deg)"

    `<div className="ui knob">
      <div className="control">
        <div className="handle" style={style} onMouseDown={this.draggableOnMouseDown}/>
      </div>
      <label>{this.props.label}</label>
    </div>`