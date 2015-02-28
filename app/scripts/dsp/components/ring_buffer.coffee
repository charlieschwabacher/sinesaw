module.exports = class RingBuffer
  
  constructor: (@maxLength, @Type = Float32Array, @length) ->
    @length ||= @maxLength
    @array = new @Type @maxLength
    @pos = 0

  reset: ->
    @array = new @Type @maxLength
    this

  resize: (@length) ->
    @pos = 0 if @pos >= @length

  push: (el) ->
    @array[@pos] = el
    @pos += 1
    @pos = 0 if @pos == @length
    this

  forEach: (fn) ->
    `var i, len;
    for (i = this.pos, len = this.length; i < len; i++) {
      fn(this.array[i], i);
    }
    for (i = 0, len = this.pos; i < len; i++) {
      fn(this.array[i], i);
    }`
    this

  reduce: (fn, memo = 0) ->
    @forEach (el, i) ->
      memo = fn memo, el, i
    memo
