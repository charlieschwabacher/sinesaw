Model = require './model'


module.exports = class DrumSampler extends Model

  @defaults:
    _type: 'DrumSampler'
    level: 0.5
    pan: 0.5
    drums: [
      {
        name: 'Drum 1'
        sampleId: null
        sampleName: ''
        transpose: 0
        level: 1
        start: 0
        key: 0
        volumeEnv:
          a: 0
          d: 1
          s: 1
          r: 1
      }
    ]

  @defaultDrum: (drums) ->
    name: "Drum #{drums.length + 1}"
    sampleData: null
    sampleName: ''
    transpose: 0
    level: 1
    start: 0
    key: do =>
      key = 0
      key += 1 while drums.some (drum) -> drum.key == key
      key
    volumeEnv:
      a: 0
      d: 1
      s: 1
      r: 1

  @destroy: (song, drumSampler) ->
    drumSampler.drums.forEach (drum) ->
      song.disuseSample drum.sampleId
