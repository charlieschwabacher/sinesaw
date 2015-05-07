# UI for the basic sampler instrument

React = require 'react/addons'
Knob = require './knob'
Chooser = require './chooser'
Slider = require './slider'
SampleControl = require './sample_control'
Envelope = require './envelope'
Filter = require './filter'
keyOptions = require '../util/key_options'


module.exports = React.createClass

  displayName: 'BasicSamplerControl'

  getInitialState: ->
    buffer: null

  setStart: (value) ->
    @props.instrument.merge
      start: value
      loop: Math.max value, @props.instrument.get 'loop'

  setLoop: (value) ->
    @props.instrument.merge
      loop: value
      start: Math.min value, @props.instrument.get 'start'

  render: ->
    instrument = @props.instrument

    options = for i in [1..6]
      <option key={i} value={i}>{i}</option>

    <div className="ui basic-sampler">
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
            {options}
          </select>
          <label>Poly</label>
        </div>
      </div>
      <div className="column">
        <SampleControl
          label="Sample"
          app={@props.app}
          song={@props.song}
          sampler={instrument}
        />
      </div>
      <div className="column envelope">
        <Envelope
          label="Volume Env"
          env={instrument.cursor 'volumeEnv'}
        />
      </div>
      <div className="column envelope">
        <Envelope
          label="Filter Env"
          env={instrument.cursor 'filterEnv'}
        />
      </div>
      <div className="column controls">
        <Filter
          label="Filter"
          filter={instrument.cursor 'filter'}
        />
        <div className="row sample">
          <div className="ui">
            <select
              value={instrument.get 'rootKey'}
              onChange={instrument.bind 'rootKey', (e) -> parseInt e.target.value}
            >
              {keyOptions()}
            </select>
            <label>Root</label>
          </div>
          <Knob
            label="Tune"
            value={instrument.get 'tune'}
            onChange={instrument.bind 'tune'}
          />
        </div>
        <div className="row sample">
          <Chooser
            options={['loop','off']}
            value={instrument.get 'loopActive'}
            onChange={instrument.bind 'loopActive'}
          />
          <Knob
            label="Loop"
            value={instrument.get 'loop'}
            disabled={instrument.get('loopActive') == 'off'}
            onChange={@setLoop}
          />
          <Knob
            label="Start"
            value={instrument.get 'start'}
            onChange={@setStart}
          />
        </div>
      </div>
    </div>
