React = require 'react'
Modal = require './modal'

module.exports = React.createClass

  displayName: 'DialogModal'

  mixins: [
    React.addons.PureRenderMixin
  ]

  propTypes:
    title: React.PropTypes.string
    options: React.PropTypes.object
    working: React.PropTypes.bool
    width: React.PropTypes.number
    height: React.PropTypes.number

  getDefaultProps: ->
    working: false
    height: 240
    width: 240

  render: ->
    <Modal
      width={@props.width}
      height={@props.height}
      className='dialog-modal'
    >
      <div className="row header">
        {
          if @props.title?
            <div className="title">{@props.title}</div>
        }
        <div className="right">
          <div className="icon icon-x" key="c" onClick={@props.dismiss}/>
        </div>
      </div>
      <div className="column content">
        {@props.children}
        {
          if @props.options?
            <div className='buttons'>
              {
                Object.keys(@props.options).map (key) =>
                  <button
                    disabled={@props.working}
                    key={key}
                    onClick={@props.options[key]}
                  >
                    {key}
                  </button>
              }
            </div>
        }
      </div>
      {
        if @props.working is true
          <div className='overlay'>
            <div className='loading-indicator'/>
          </div>
      }
    </Modal>
