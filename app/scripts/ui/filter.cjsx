# UI control for a filter - expects to receive a cursor to a filter object as
# a prop 'filter'.  Filter is epected to have values {type, freq, res, env}.

React = require 'react'
Chooser = require './chooser'
Knob = require './knob'

module.exports = React.createClass

  displayName: 'Filter'

  propTypes:
    filter: React.PropTypes.object.isRequired
    label: React.PropTypes.string.isRequired

  render: ->
    filter = @props.filter

    <div className="ui filter">
      <Chooser
        options={['LP','HP','none']}
        value={filter.get 'type'}
        onChange={filter.bind 'type'}
      />
      <Knob
        label="Freq"
        value={filter.get 'freq'}
        onChange={filter.bind 'freq'}
      />
      <Knob
        label="Res"
        value={filter.get 'res'}
        onChange={filter.bind 'res'}
      />
      <Knob label="Env" value={filter.get 'env'} onChange={filter.bind 'env'}/>
      <label>{@props.label}</label>
    </div>