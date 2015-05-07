React = require 'react'
CSSTransitionGroup = React.addons.CSSTransitionGroup


module.exports = React.createClass

  displayName: 'Menu'

  propTypes:
    onSelect: React.PropTypes.func.isRequired
    options: React.PropTypes.array.isRequired
    open: React.PropTypes.bool.isRequired

  onClickOption: (e) ->
    e.stopPropagation()
    @props.onSelect e.target.dataset.option

  render: ->
    <CSSTransitionGroup transitionName='fade'>
      {
        if @props.open
          <div className='ui menu' key={'m'}>
            {
              @props.options.map (option, i) =>
                <div
                  key={i}
                  className="option"
                  onClick={@onClickOption}
                  data-option={option}
                >
                  {option}
                </div>
            }
          </div>
      }
    </CSSTransitionGroup>