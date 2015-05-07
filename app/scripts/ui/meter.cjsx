# react component for a volume meter

React = require 'react'

module.exports = React.createClass

  displayName: 'Meter'

  propTypes:
    level: React.PropTypes.number.isRequired
    steps: React.PropTypes.number

  getDefaultProps: ->
    steps: 6

  render: ->
    level = Math.ceil @props.level * @props.steps

    steps = for i in [1..@props.steps]
      className = if i <= level then 'on' else ''
      <div key={i} className={className}/>

    <div className="ui meter">
      {steps}
    </div>

  # shouldComponentUpdate: (nextProps) ->
  #   Math.ceil(@props.level * @props.steps) != Math.ceil(nextProps.level * nextProps.steps)
