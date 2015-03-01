React = require 'react'
DialogModal = require './dialog_modal'

module.exports = React.createClass

  displayName: 'AboutModal'

  propTypes:
    dismiss: React.PropTypes.func.isRequired

  render: ->
    <DialogModal
      title='About Sinesaw'
      options={
        'OK': @props.dismiss
      }
      dismiss={@props.dismiss}
    >
      <div>
        <p>
          Sinesaw is a web audio DAW developed
          by <a href='http://charlieschwabacher.com/'>
          Charlie Schwabacher</a>.
        </p>
        <p>
          Feedback is appreciated
          by <a href='mailto:charlie651@gmail.com'>email</a>, or
          on <a href='https://github.com/charlieschwabacher/sinesaw'>github</a> where
          development is ongoing.
        </p>
      </div>
    </DialogModal>
