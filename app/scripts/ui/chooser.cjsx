# vertically stacked buttons for choosing one of a set of values
# expects three props - options, an array of string options, value, the
# currently selected option, and an onChange callback which will be passed the
# new value on selection.

React = require 'react'

module.exports = React.createClass

  displayName: 'Chooser'

  propTypes:
    onChange: React.PropTypes.func.isRequired
    options: React.PropTypes.array.isRequired
    value: React.PropTypes.string.isRequired

  onClickValue: (value) ->
    @props.onChange e.target.dataset.value

  render: ->
    <div className="ui chooser">
      {
        @props.options.map (v, i) =>
          <div
            key={i}
            className={'option' + if v is @props.value then ' selected' else ''}
            onClick={=> @props.onChange v}
          >
            {v}
          </div>
      }
    </div>