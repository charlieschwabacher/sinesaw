module.exports = (sampleData, transpose, samplesElapsed, offset = 0) ->
  i = samplesElapsed * Math.pow 2, transpose / 12
  i1 = Math.floor i
  i2 = i1 + 1
  l = i % 1

  sampleData[offset + i1] * (1 - l) + sampleData[offset + i2] * l