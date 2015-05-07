# ui for the loop sampler instrument
# incomplete

React = require 'react'
Knob = require './knob'
Slider = require './slider'
SampleControl = require './sample_control'
Envelope = require './envelope'

module.exports = React.createClass

  displayName: 'LoopSamplerControl'

  propTypes:
    instrument: React.PropTypes.object.isRequired

  setPolyphony: (e) ->
    @props.instrument.setPolyphony parseInt e.target.value

  render: ->
    options = for i in [1..@props.instrument.maxPolyphony]
      <option key={i} value={i}>{i}</option>

    <div className="ui loop-sampler">
      <div className="column channel">
        <Slider
          label="Level"
          value={@state.level}
          onChange={@props.instrument.createSetterFor 'level'}
        />
        <div className="ui">
          <select onChange={@setPolyphony} value={@state.polyphony}>{options}</select>
          <label>Poly</label>
        </div>
      </div>
    </div>
