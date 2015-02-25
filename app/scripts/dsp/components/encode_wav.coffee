# pulled from matt diamond / recorderjs
# https://github.com/mattdiamond/Recorderjs/blob/master/recorderWorker.js


floatTo16BitPCM = (output, offset, input) ->
  for i in [0...input.length]
    s = Math.max -1, Math.min 1, input[i]
    s = if s < 0 then s * 0x8000 else s * 0x7FFF
    output.setInt16 offset, s, true
    offset += 2

writeString = (view, offset, string) ->
  for i in [0...string.length]
    view.setUint8 offset + i, string.charCodeAt i


module.exports = (samples, numChannels, sampleRate) ->
  samples = new Float32Array samples
  buffer = new ArrayBuffer 44 + samples.length * 2
  view = new DataView buffer

  # RIFF identifier
  writeString view, 0, 'RIFF'
  # RIFF chunk length
  view.setUint32 4, 36 + samples.length * 2, true
  # RIFF type
  writeString view, 8, 'WAVE'
  # format chunk identifier
  writeString view, 12, 'fmt '
  # format chunk length
  view.setUint32 16, 16, true
  # sample format (raw)
  view.setUint16 20, 1, true
  # channel count
  view.setUint16 22, numChannels, true
  # sample rate
  view.setUint32 24, sampleRate, true
  # byte rate (sample rate * block align)
  view.setUint32 28, sampleRate * 4, true
  # block align (channel count * bytes per sample)
  view.setUint16 32, numChannels * 2, true
  # bits per sample
  view.setUint16 34, 16, true
  # data chunk identifier
  writeString view, 36, 'data'
  # data chunk length
  view.setUint32 40, samples.length * 2, true

  floatTo16BitPCM view, 44, samples

  buffer
