Model = require './model'


module.exports = class BasicSampler extends Model

  @defaults:
    _type: 'BasicSampler'
    level: 0.5
    pan: 0.5
    polyphony: 1
    maxPolyphony: 6
    rootKey: 60
    sampleId: null
    sampleName: ''
    start: 0
    loopActive: 'off'
    loop: 1
    tune: 0.5
    volumeEnv:
      a: 0
      d: 0.25
      s: 1
      r: 0.5
    filterEnv:
      a: 0
      d: 0.25
      s: 1
      r: 0.5
    filter:
      type: 'none'
      freq: 0.27
      res: 0.05
      env: 0.45

  @destroy: (song, basicSampler) ->
    song.releaseSample basicSampler.sampleId
