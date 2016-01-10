# UI for drum sampler instrument

React = require 'react'
PureRenderMixin = require 'react-addons-pure-render-mixin'
Updatable = require './mixins/updatable'
Sortable = require './mixins/sortable'
Knob = require './knob'
Slider = require './slider'
ListControl = require './list_control'
SampleControl = require './sample_control'
Envelope = require './envelope'
keyOptions = require '../util/key_options'
transposeOptions = require '../util/transpose_options'
DrumSampler = require '../models/drum_sampler'

Drum = React.createClass

  displayName: 'Drum'

  propTypes:
    app: React.PropTypes.object.isRequired
    drum: React.PropTypes.object.isRequired

  mixins: [
    PureRenderMixin
    Sortable
  ]

  render: ->
    drum = @props.drum

    return <div className="drum"/> unless drum

    <div className="drum">
      <div className="column">
        <SampleControl
          label={"Sample"}
          app={@props.app}
          song={@props.song}
          sampler={drum}
        />
      </div>
      <div className="column envelope">
        <Envelope
          label="Volume Env"
          env={drum.cursor('volumeEnv')}
        />
      </div>
      <div className="column control">
        <Knob
          label="Level"
          value={drum.get 'level'}
          onChange={drum.bind 'level'}
        />
        <div className="ui">
          <select
            value={drum.get 'transpose'}
            onChange={drum.bind 'transpose', (e) -> parseInt e.target.value}
          >
            {transposeOptions()}
          </select>
          <label>Transpose</label>
        </div>
        <div className="ui">
          <select
            value={drum.get 'key'}
            onChange={drum.bind 'key', (e) -> parseInt e.target.value}
          >
            {keyOptions()}
          </select>
          <label>Trigger</label>
        </div>
      </div>
    </div>


module.exports = React.createClass

  displayName: 'DrumSamplerControl'

  propTypes:
    instrument: React.PropTypes.object.isRequired

  mixins: [
    PureRenderMixin
  ]

  getInitialState: ->
    activeDrum: 0

  onAddDrum: ->
    drums = @props.instrument.get 'drums'
    drum = DrumSampler.defaultDrum drums
    index = drums.length

    @props.instrument.set ['drums', index], drum
    @setState activeDrum: index

  onRemoveDrum: ->
    drums = @props.instrument.get('drums').slice 0
    drum = drums[@state.activeDrum]
    drums.splice @state.activeDrum, 1
    @props.song.disuseSample drum.sampleId
    @props.instrument.set 'drums', drums
    @setState activeDrum: Math.min @state.activeDrum, drums.length - 1

  render: ->
    instrument = @props.instrument

    <div className="ui drum-sampler">
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
      <Drum
        drum={instrument.cursor ['drums', @state.activeDrum]}
        app={@props.app}
        song={@props.song}
      />
    </div>
