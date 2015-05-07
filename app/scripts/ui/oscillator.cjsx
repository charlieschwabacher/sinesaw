# ui controls for an oscillator, expects two props 'osc', a cursor to an
# oscillator object {waveform, level, pitch, tune}, and a label

React = require 'react'
Chooser = require './chooser'
Knob = require './knob'

module.exports = React.createClass

  displayName: 'Oscillator'

  propTypes:
    osc: React.PropTypes.object.isRequired
    label: React.PropTypes.string.isRequired

  render: ->
    osc = @props.osc

    <div className="ui oscillator">
      <Chooser options={['sine','square','saw']} value={osc.get 'waveform'} onChange={osc.bind 'waveform'}/>
      <Knob label="Level" value={osc.get 'level'} onChange={osc.bind 'level'}/>
      <Knob label="Pitch" value={osc.get 'pitch'} onChange={osc.bind 'pitch'}/>
      <Knob label="Tune" value={osc.get 'tune'} onChange={osc.bind 'tune'}/>
      <label>{@props.label}</label>
    </div>
