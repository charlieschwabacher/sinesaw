React = require 'react'
DialogModal = require './dialog_modal'

module.exports = React.createClass

  displayName: 'SaveModal'

  propTypes:
    song: React.PropTypes.object.isRequired
    dismiss: React.PropTypes.func.isRequired

  getInitialState: ->
    working: false

  componentDidMount: ->
    @fileInput = document.createElement 'input'
    @fileInput.type = 'file'
    @fileInput.style.display = 'none'
    ReactDOM.findDOMNode(this).appendChild @fileInput
    @fileInput.addEventListener 'change', @onFileSelect

    @a = document.createElement 'a'

  triggerDownload: (name, file) ->
    @a.setAttribute 'download', name
    @a.setAttribute 'href', URL.createObjectURL file
    @a.click()

  triggerFileInput: ->
    @fileInput.click()

  downloadSinesawFile: ->
    @props.song.stop()
    @triggerDownload 'track.sinesaw', @props.song.toFile()
    @props.dismiss?()

  downloadAudioFile: ->
    @props.song.stop()
    @setState working: true
    @props.song.bounce (wavFile) =>
      @triggerDownload 'track.wav', wavFile
      @props.dismiss()

  onFileSelect: ->
    @props.song.stop()
    file = @fileInput.files[0]
    @props.song.fromFile file, @props.dismiss if file?

  render: ->
    <DialogModal
      title='Save'
      options={
        'Upload sinesaw file': @triggerFileInput
        'Download sinesaw file': @downloadSinesawFile
        'Download audio file': @downloadAudioFile
      }
      working={@state.working}
      dismiss={@props.dismiss}
    >
      You can download your song as a sinesaw file, and upload later to resume
      work where you left off.
    </DialogModal>
