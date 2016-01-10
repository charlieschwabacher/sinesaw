module.exports =

  getInitialState: ->
    height: 0
    width: 0

  updateDimensions: (e) ->
    el = @refs.container

    @setState
      width: el.clientWidth
      height: el.clientHeight

  componentDidMount: ->
    @updateDimensions()
    window.addEventListener 'resize', @updateDimensions

  componentWillUnmount: ->
    window.removeEventListener 'resize', @updateDimensions
