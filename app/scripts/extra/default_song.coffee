# This file defines data for a default song, and serves as a good reference for
# the data structure of a song.
#
# Right now audio data is inlined using brfs for easier development, eventually
# files should be loaded independently for better caching.
#
# Because decoding audio data into a typed array is async, and because this will
# eventually asynchronously load remote audio files, this exports a function
# that passes the decoded data to a callback.


async = require 'async'
fs = require 'fs'
b2a = require 'base64-arraybuffer'
cuid = require 'cuid'
decoder = require '../dsp/components/global_context'
sequences = require './sequences'

loaded = false
data = null
callbacks = []

module.exports = (cb) ->
  if loaded
    cb data
  else
    callbacks.push cb


# inline audio files as base64 strings using brfs
bass = b2a.decode fs.readFileSync "#{__dirname}/../../audio/bass.wav", 'base64'
kick = b2a.decode fs.readFileSync "#{__dirname}/../../audio/kick.wav", 'base64'
snare = b2a.decode fs.readFileSync "#{__dirname}/../../audio/snare.wav", 'base64'
hat = b2a.decode fs.readFileSync "#{__dirname}/../../audio/hat.wav", 'base64'

# load sample data
async.parallel
  bass: (cb) -> decoder.decodeAudioData bass, (buffer) -> cb null, buffer
  kick: (cb) -> decoder.decodeAudioData kick, (buffer) -> cb null, buffer
  snare: (cb) -> decoder.decodeAudioData snare, (buffer) -> cb null, buffer
  hat: (cb) -> decoder.decodeAudioData hat, (buffer) -> cb null, buffer

  (err, results) ->

    data =
      _id: cuid()
      bpm: 120
      selectedTrack: 0
      tracks: [
        {
          _id: cuid()
          name: 'Analog Synth'
          sequence:
            _id: cuid()
            loopSize: 8
            notes: sequences.terje
          effects: []
          instrument:
            _id: cuid()
            _type: 'AnalogSynthesizer'
            level: 1
            pan: 0.5
            polyphony: 3
            maxPolyphony: 6
            volumeEnv:
              a: 0
              d: 0.25
              s: 0
              r: 0.5
            filterEnv:
              a: 0
              d: 0.25
              s: 0.2
              r: 0.5
            filter:
              type: 'LP'
              freq: 0.27
              res: 0.05
              env: 0.45
            osc1:
              waveform: 'saw'
              level: 0.5
              pitch: 0.5
              tune: 0.5
            osc2:
              waveform: 'saw'
              level: 0.5
              pitch: 0.5
              tune: 0.5
        }
        {
          _id: cuid()
          name: 'Drum Synthesizer'
          sequence:
            _id: cuid()
            loopSize: 4
            notes: {}
          effects: []
          instrument:
            _id: cuid()
            _type: 'DrumSynthesizer'
            level: 0.5
            pan: 0.5
            drums: [
              {
                id: 1
                key: 0
                name: 'Kick'
                level: 1
                hp: 0
                decay: 0.35
                noise: 0.001
                pitch: 0
                bend: 0.39
                fm: 1
                fmDecay: 0.05
                fmFreq: 0.02
              }, {
                id: 2
                key: 1
                name: 'Snare'
                level: 0.5
                hp: 0.22
                decay: 0.1
                noise: 0.8
                pitch: 0.1
                bend: 0
                fm: 0
                fmDecay: 0
                fmFreq: 0
              }, {
                id: 3
                key: 2
                name: 'HH1'
                level: 0.05
                hp: 1
                decay: 0.07
                noise: 0.8
                pitch: 0.4
                bend: 0
                fm: 1
                fmDecay: 0.4
                fmFreq: 0
              }, {
                id: 4
                key: 3
                name: 'HH2'
                level: 0.2
                hp: 0.6
                decay: 0.22
                noise: 1
                pitch: 0.5
                bend: 0
                fm: 0
                fmDecay: 0
                fmFreq: 0
              }
            ]
          }
        {
          _id: cuid()
          name: 'Drum Sampler'
          sequence:
            _id: cuid()
            loopSize: 4
            notes: sequences.beat
          effects: []
          instrument:
            _id: cuid()
            _type: 'DrumSampler'
            level: 0.8
            pan: 0.5
            drums: [
              {
                name: 'Kick'
                sampleData: results.kick.getChannelData 0
                sampleName: 'kick.wav'
                transpose: 0
                level: 1
                key: 0
                start: 0
                volumeEnv:
                  a: 0
                  d: 1
                  s: 1
                  r: 1
              }, {
                name: 'Snare'
                sampleData: results.snare.getChannelData 0
                sampleName: 'snare.wav'
                transpose: 0
                level: 0.35
                key: 1
                start: 0
                volumeEnv:
                  a: 0
                  d: 1
                  s: 1
                  r: 1
              }, {
                name: 'High Hat'
                sampleData: results.hat.getChannelData 0
                sampleName: 'hat.wav'
                transpose: 0
                level: 0.2
                key: 2
                start: 0
                volumeEnv:
                  a: 0
                  d: 1
                  s: 1
                  r: 1
              }
            ]
        }
        {
          _id: cuid()
          name: 'Basic Sampler'
          sequence:
            _id: cuid()
            loopSize: 8
            notes: sequences.terje
          effects: []
          instrument:
            _id: cuid()
            _type: 'BasicSampler'
            level: 0.2
            pan: 0.5
            polyphony: 1
            maxPolyphony: 6
            rootKey: 60
            sampleData: results.bass.getChannelData 0
            sampleName: 'bass.wav'
            start: 0.3
            loopActive: 'loop'
            loop: 0.7
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
        }
      ]

    cb data for cb in callbacks
