# UI for the analog synthesizer instrument

React = require 'react'
Slider = require './slider'
Envelope = require './envelope'
Filter = require './filter'
Oscillator = require './oscillator'


module.exports = React.createClass

  displayName: 'AnalogSynthesizerControl'

  propTypes:
    instrument: React.PropTypes.object.isRequired

  render: ->
    instrument = @props.instrument

    options = for i in [1..6]
      <option key={i} value={i}>{i}</option>

    <div className="ui analog">
      <div className="column channel">
        <Slider
          label="Level"
          value={instrument.get 'level'}
          onChange={instrument.bind 'level'}
        />
        <div className="ui">
          <select
            onChange={instrument.bind 'polyphony', (e) -> parseInt e.target.value}
            value={instrument.get 'polyphony'}
          >
            {options}
          </select>
          <label>Poly</label>
        </div>
      </div>
      <div className="column">
        <Envelope
          label="Volume Env"
          env={instrument.cursor 'volumeEnv'}
        />
      </div>
      <div className="column">
        <Envelope
          label="Filter Env"
          env={instrument.cursor 'filterEnv'}
        />
      </div>
      <div className="column oscillators">
        <Filter
          label="Filter"
          filter={instrument.cursor 'filter'}
        />
        <Oscillator
          label="Osc 1"
          osc={instrument.cursor 'osc1'}
        />
        <Oscillator
          label="Osc 2"
          osc={instrument.cursor 'osc2'}
        />
      </div>
    </div>
