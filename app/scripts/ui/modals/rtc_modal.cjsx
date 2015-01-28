React = require 'react'
DialogModal = require './dialog_modal'

module.exports = React.createClass

  displayName: 'RTCModal'

  propTypes:
    rtc: React.PropTypes.object.isRequired
    dismiss: React.PropTypes.func.isRequired

  render: ->
    <DialogModal
      title='Collaborate'
      dismiss={@props.dismiss}
    >
      <p>
        Share this link to allow others to join you in editing this song:
      </p>
      <p className='text-center'>
        <a href={"/#{@props.rtc.id}"}>
          {"//#{window.location.host}/#{@props.rtc.id}"}
        </a>
      </p>
      <p>
        The current song and audio files are stored in memory in your browser,
        and will be sent directly to peers.  After you close this tab, the link
        will no longer function.
      </p>
    </DialogModal>
