React = require 'react'
Waveform = require './waveform'
ControlModal = require './modals/control_modal'
RecordControl = require './record_control'
decoder = require '../dsp/components/global_context'

module.exports = React.createClass

  displayName: 'SampleControl'

  propTypes:
    app: React.PropTypes.object.isRequired
    sampler: React.PropTypes.object.isRequired
    label: React.PropTypes.string

  # range in pixels for vertical drag to zoom
  range: 300
  dragTypeDistance: 10

  getDefaultProps: ->
    sampleStart: 0

  triggerFileInput: ->
    @refs.input.click()

  onFileSelect: ->
    file = @refs.input.files[0]

    if file?
      reader = new FileReader
      reader.onload = (e) =>
        decoder.decodeAudioData e.target.result, (buffer) =>
          sampleData = buffer.getChannelData 0
          sampleId = @props.song.addSample file.name, sampleData
          @props.sampler.merge {sampleId}
      reader.readAsArrayBuffer file

  clear: ->
    @props.song.releaseSample @props.sampler.get 'sampleId'
    @props.sampler.merge sampleName: null, sampleId: null

  recordSample: ->
    @props.app.launchModal <ControlModal key='m'>
      <RecordControl
        dismiss={@props.app.dismissModal}
        onConfirm={
          (sampleData) =>
            sampleId = @props.song.addSample 'recording.wav', sampleData
            @props.sampler.merge {sampleId}
            @props.app.dismissModal()
        }
      />
    </ControlModal>

  setStart: (value) ->
    @props.sampler.merge
      start: value
      loop: Math.max value, @props.sampler.get 'loop'

  setLoop: (value) ->
    @props.sampler.merge
      loop: value
      start: Math.min value, @props.sampler.get 'start'

  render: ->
    sampler = @props.sampler.get()

    {start, loopActive, sampleId} = sampler
    loopValue = sampler.loop

    sample = @props.song.getSample sampleId if sampleId?
    {fileName, sampleData} = sample if sample?

    markers = {}

    if start?
      markers.start =
        value: start
        onChange: @setStart

    if loopActive == 'loop'
      markers.loop =
        value: loopValue
        onChange: @setLoop

    <div className="ui sample-control">
      <input
        type="file"
        ref="input"
        onChange={@onFileSelect}
        style={display: 'none'}
      />
      <div
        className="display"
        ref="container"
        onClick={if sampleData? then null else @triggerFileInput}
      >
        {if sampleData? then null else <div className="instruction">click to upload</div>}
        <Waveform
          sampleData={sampleData}
          selectionStart={start or 0}
          selectionEnd={if loopActive == 'loop' then loopValue else 1}
          markers={markers}
        />
      </div>
      <div className="controls">
        <div className="control" onClick={@triggerFileInput}>
          <div className="icon icon-up"/>
        </div>
        <div className="control" onClick={@recordSample}>
          <div className="icon icon-record"/>
        </div>
        <div className="control" onClick={@clear}>
          <div className="icon icon-x"/>
        </div>
        <div className="file-name">{fileName}</div>
      </div>
      <label>{@props.label}</label>
    </div>
