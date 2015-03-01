Peer = require 'peerjs'
cuid = require 'cuid'

module.exports = class WebRTC

  constructor: ->
    @id = cuid.slug()
    @self = new Peer @id, key: 'sinesaw'
    window.webrtc = this

  update: ->
