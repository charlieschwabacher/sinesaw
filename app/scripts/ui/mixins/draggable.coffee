module.exports =

  draggableOnMouseDown: (e) ->
    window.addEventListener 'mousemove', @draggableOnMouseMove
    window.addEventListener 'mouseup', @draggableOnMouseUp
    @dragStartPosition = x: e.clientX, y: e.clientY
    @onDragStart?(@dragStartPosition, e)

  draggableOnMouseMove: (e) ->
    x = e.clientX - @dragStartPosition.x
    y = @dragStartPosition.y - e.clientY
    @onDrag?({x,y}, e)

  draggableOnMouseUp: (e) ->
    window.removeEventListener 'mousemove', @draggableOnMouseMove
    window.removeEventListener 'mouseup', @draggableOnMouseUp
    @mouseDownPosition = null
    @initialValue = null
    @onDragEnd?(e)
