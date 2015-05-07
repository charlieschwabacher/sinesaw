# UI for drum synthesizer instrument

React = require 'react'
Updatable = require './mixins/updatable'
Knob = require './knob'
Slider = require './slider'
ListControl = require './list_control'
keyOptions = require '../util/key_options'
DrumSynthesizer = require '../models/drum_synthesizer'

Drum = React.createClass

  displayName: 'Drum'

  propTypes:
    drum: React.PropTypes.object.isRequired

  render: ->
    drum = @props.drum.get()

    <div className='drum'>
      <div className='column attrs'>
        <Knob
          label="Level"
          value={drum.level}
          onChange={@props.drum.bind 'level'}
        />
        <Knob
          label="Pitch"
          value={drum.pitch}
          onChange={@props.drum.bind 'pitch'}
        />
        <Knob
          label="FM"
          value={drum.fm}
          onChange={@props.drum.bind 'fm'}
        />
        <Knob
          label="Dcy"
          value={drum.decay}
          onChange={@props.drum.bind 'decay'}
        />
        <Knob
          label="Bend"
          value={drum.bend}
          onChange={@props.drum.bind 'bend'}
        />
        <Knob
          label="MDcy"
          value={drum.fmDecay}
          onChange={@props.drum.bind 'fmDecay'}
        />
        <Knob
          label="Noise"
          value={drum.noise}
          onChange={@props.drum.bind 'noise'}
        />
        <Knob
          label="HP"
          value={drum.hp}
          onChange={@props.drum.bind 'hp'}
        />
        <Knob
          label="MFrq"
          value={drum.fmFreq}
          onChange={@props.drum.bind 'fmFreq'}
        />
      </div>
      <div className="column control">
        <div className="ui">
          <select
            value={drum.key}
            onChange={@props.drum.bind 'key', (e) -> parseInt e.target.value}
          >
            {keyOptions()}
          </select>
          <label>Trigger</label>
        </div>
      </div>
    </div>


module.exports = React.createClass

  displayName: 'DrumSynthesizerControl'

  propTypes:
    instrument: React.PropTypes.object.isRequired

  mixins: [
    React.addons.PureRenderMixin
  ]

  getInitialState: ->
    activeDrum: 0

  onAddDrum: ->
    drums = @props.instrument.get 'drums'
    drum = DrumSynthesizer.defaultDrum drums
    index = drums.length

    @props.instrument.set ['drums', index], drum
    @setState activeDrum: index

  onRemoveDrum: ->
    drums = @props.instrument.get('drums').slice 0
    drums.splice @state.activeDrum, 1
    @props.instrument.set 'drums', drums
    @setState activeDrum: Math.min @state.activeDrum, drums.length - 1

  render: ->
    instrument = @props.instrument

    <div className="ui drum-synthesizer">
      <div className="column channel">
        <Slider
          label="Level"
          value={instrument.get 'level'}
          onChange={instrument.bind 'level'}
        />
      </div>
      <ListControl
        options={instrument.get 'drums'}
        selectedIndex={@state.activeDrum}
        onSelect={(activeDrum) => @setState {activeDrum}}
        onSort={instrument.bind 'drums'}
        onAdd={@onAddDrum}
        onRemove={@onRemoveDrum}
      />
      <Drum drum={instrument.cursor ['drums', @state.activeDrum]}/>
    </div>
