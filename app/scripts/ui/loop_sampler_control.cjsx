# ui for the loop sampler instrument
# incomplete

React = require 'react'
Knob = require './knob'
Slider = require './slider'
SampleControl = require './sample_control'
Envelope = require './envelope'

module.exports = React.createClass

  setPolyphony: (e) ->
    @props.instrument.setPolyphony parseInt e.target.value

  render: ->
    instrument = @props.instrument

    <div className="column channel">
      <Slider
        label="Level"
        value={instrument.get 'level'}
        onChange={instrument.bind 'level'}
      />
      <div className="ui">
        <select
          value={instrument.get 'polyphony'}
          onChange={instrument.bind 'polyphony', (e) -> parseInt e.target.value}
        >
          {
            for i in [1..instrument.maxPolyphony]
              <option key={i} value={i}>{i}</option>
          }
        </select>
        <label>Poly</label>
      </div>
    </div>