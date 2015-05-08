(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Song, encodeWav;

Song = require('./dsp/song.coffee');

encodeWav = require('./dsp/components/encode_wav');

self.song = new Song;

self.logSample = require('./dsp/components/log_sample');

self.onmessage = function(e) {
  var buffer, wav;
  switch (e.data.type) {
    case 'buffer':
      buffer = song.buffer(e.data.size, e.data.index, e.data.sampleRate);
      return postMessage({
        type: 'buffer',
        buffer: buffer
      }, [buffer]);
    case 'bounce':
      buffer = song.buffer(e.data.size, e.data.index, e.data.sampleRate);
      wav = encodeWav(buffer, 1, e.data.sampleRate);
      return postMessage({
        type: 'bounce',
        wav: wav
      }, [wav]);
    case 'update':
      return song.update(e.data.state);
    case 'midi':
      return song.midi(e.data.message);
    case 'addSample':
      return song.addSample(e.data.id, e.data.sampleData);
    case 'removeSample':
      return song.removeSample(e.data.id);
    case 'clearSamples':
      return song.clearSamples();
  }
};

setInterval(function() {
  song.processFrame();
  return postMessage({
    type: 'frame',
    frame: song.getState()
  });
}, 1000 / 60);



},{"./dsp/components/encode_wav":4,"./dsp/components/log_sample":8,"./dsp/song.coffee":17}],2:[function(require,module,exports){
var AnalogSynthesizer, Instrument, RingBuffer, envelope, highpassFilter, lowpassFilter, oscillators,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Instrument = require('./instrument');

RingBuffer = require('./components/ring_buffer');

lowpassFilter = require('./components/lowpass_filter');

highpassFilter = require('./components/highpass_filter');

envelope = require('./components/envelope');

oscillators = require('./components/oscillators');

module.exports = AnalogSynthesizer = (function(superClass) {
  var frequency, tune;

  extend(AnalogSynthesizer, superClass);

  function AnalogSynthesizer() {
    return AnalogSynthesizer.__super__.constructor.apply(this, arguments);
  }

  tune = 440;

  frequency = function(key) {
    return tune * Math.pow(2, (key - 69) / 12);
  };

  AnalogSynthesizer.createState = function(state, instrument) {
    var i;
    AnalogSynthesizer.__super__.constructor.createState.call(this, state, instrument);
    return state[instrument._id].filters = {
      LP: (function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = instrument.maxPolyphony; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          results.push(lowpassFilter());
        }
        return results;
      })(),
      HP: (function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = instrument.maxPolyphony; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          results.push(highpassFilter());
        }
        return results;
      })(),
      none: (function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = instrument.maxPolyphony; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          results.push(function(sample) {
            return sample;
          });
        }
        return results;
      })()
    };
  };

  AnalogSynthesizer.sample = function(state, samples, instrument, time, i) {
    var r;
    if (instrument.level === 0) {
      return 0;
    }
    if (state[instrument._id] == null) {
      return 0;
    }
    r = Math.max(0.01, instrument.volumeEnv.r);
    return instrument.level * state[instrument._id].notes.reduce((function(_this) {
      return function(memo, note, index) {
        var cutoff, filter, osc1Freq, osc2Freq, sample;
        if (note == null) {
          return memo;
        }
        if (time > r + note.timeOff) {
          return memo;
        }
        osc1Freq = frequency(note.key + instrument.osc1.tune - 0.5 + Math.round(24 * (instrument.osc1.pitch - 0.5)));
        osc2Freq = frequency(note.key + instrument.osc2.tune - 0.5 + Math.round(24 * (instrument.osc2.pitch - 0.5)));
        sample = envelope(instrument.volumeEnv, note, time) * (instrument.osc1.level * oscillators[instrument.osc1.waveform](time, osc1Freq) + instrument.osc2.level * oscillators[instrument.osc2.waveform](time, osc2Freq));
        cutoff = Math.min(1, instrument.filter.freq + instrument.filter.env * envelope(instrument.filterEnv, note, time));
        filter = state[instrument._id].filters[instrument.filter.type][index];
        sample = filter(sample, cutoff, instrument.filter.res);
        return memo + sample;
      };
    })(this), 0);
  };

  return AnalogSynthesizer;

})(Instrument);



},{"./components/envelope":5,"./components/highpass_filter":6,"./components/lowpass_filter":9,"./components/oscillators":10,"./components/ring_buffer":11,"./instrument":15}],3:[function(require,module,exports){
var BasicSampler, Instrument, RingBuffer, envelope, highpassFilter, linearInterpolator, lowpassFilter,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Instrument = require('./instrument');

RingBuffer = require('./components/ring_buffer');

linearInterpolator = require('./components/linear_interpolator');

lowpassFilter = require('./components/lowpass_filter');

highpassFilter = require('./components/highpass_filter');

envelope = require('./components/envelope');

module.exports = BasicSampler = (function(superClass) {
  extend(BasicSampler, superClass);

  function BasicSampler() {
    return BasicSampler.__super__.constructor.apply(this, arguments);
  }

  BasicSampler.createState = function(state, instrument) {
    var i;
    BasicSampler.__super__.constructor.createState.call(this, state, instrument);
    return state[instrument._id].filters = {
      LP: (function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = instrument.maxPolyphony; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          results.push(lowpassFilter());
        }
        return results;
      })(),
      HP: (function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = instrument.maxPolyphony; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          results.push(highpassFilter());
        }
        return results;
      })(),
      none: (function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = instrument.maxPolyphony; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          results.push(function(sample) {
            return sample;
          });
        }
        return results;
      })()
    };
  };

  BasicSampler.sample = function(state, samples, instrument, time, i) {
    var r, sampleData;
    if (instrument.level === 0) {
      return 0;
    }
    if (state[instrument._id] == null) {
      return 0;
    }
    sampleData = samples[instrument.sampleId];
    if (sampleData == null) {
      return 0;
    }
    r = Math.max(0.01, instrument.volumeEnv.r);
    return instrument.level * state[instrument._id].notes.reduce((function(_this) {
      return function(memo, note, index) {
        var cutoff, filter, loopActive, loopPoint, offset, sample, samplesElapsed, transpose;
        if (note == null) {
          return memo;
        }
        if (time > r + note.timeOff) {
          return memo;
        }
        transpose = note.key - instrument.rootKey + instrument.tune - 0.5;
        samplesElapsed = i - note.i;
        offset = Math.floor(instrument.start * sampleData.length);
        loopActive = instrument.loopActive === 'loop';
        loopPoint = Math.floor(instrument.loop * sampleData.length);
        sample = linearInterpolator(sampleData, transpose, samplesElapsed, offset, loopActive, loopPoint);
        sample = envelope(instrument.volumeEnv, note, time) * (sample || 0);
        cutoff = Math.min(1, instrument.filter.freq + instrument.filter.env * envelope(instrument.filterEnv, note, time));
        filter = state[instrument._id].filters[instrument.filter.type][index];
        sample = filter(sample, cutoff, instrument.filter.res);
        return memo + sample;
      };
    })(this), 0);
  };

  return BasicSampler;

})(Instrument);



},{"./components/envelope":5,"./components/highpass_filter":6,"./components/linear_interpolator":7,"./components/lowpass_filter":9,"./components/ring_buffer":11,"./instrument":15}],4:[function(require,module,exports){
var floatTo16BitPCM, writeString;

floatTo16BitPCM = function(output, offset, input) {
  var i, j, ref, results, s;
  results = [];
  for (i = j = 0, ref = input.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    output.setInt16(offset, s, true);
    results.push(offset += 2);
  }
  return results;
};

writeString = function(view, offset, string) {
  var i, j, ref, results;
  results = [];
  for (i = j = 0, ref = string.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    results.push(view.setUint8(offset + i, string.charCodeAt(i)));
  }
  return results;
};

module.exports = function(samples, numChannels, sampleRate) {
  var buffer, view;
  samples = new Float32Array(samples);
  buffer = new ArrayBuffer(44 + samples.length * 2);
  view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  return buffer;
};



},{}],5:[function(require,module,exports){
var minEnvValue;

minEnvValue = 0.01;

module.exports = function(env, note, time) {
  var a, d, elapsed, l, r, s;
  elapsed = time - note.time;
  a = Math.max(minEnvValue, env.a);
  d = Math.max(minEnvValue, env.d);
  s = env.s;
  r = Math.max(minEnvValue, env.r);
  l = elapsed > a + d ? l = s : elapsed > a ? l = s + (1 - s) * (a + d - elapsed) / d : elapsed / a;
  if (note.timeOff) {
    l = l * (note.timeOff + r - time) / r;
  }
  return Math.max(0, l);
};



},{}],6:[function(require,module,exports){
var A, bandwidth, beta, dbGain, e, maxFreq, sampleRate, sinh, tau;

sampleRate = 48000;

maxFreq = 12000;

dbGain = 12;

bandwidth = 1;

A = Math.pow(10, dbGain / 40);

e = Math.log(2);

tau = 2 * Math.PI;

beta = Math.sqrt(2 * A);

sinh = function(x) {
  var y;
  y = Math.exp(x);
  return (y - 1 / y) / 2;
};

module.exports = function() {
  var a0, a1, a2, a3, a4, alpha, cs, freq, lastCutoff, omega, sn, x1, x2, y1, y2;
  a0 = a1 = a2 = a3 = a4 = x1 = x2 = y1 = y2 = 0;
  freq = omega = sn = alpha = 0;
  cs = 1;
  lastCutoff = 0;
  return function(sample, cutoff) {
    var aa0, aa1, aa2, b0, b1, b2, oldCutoff, result, s;
    if (cutoff !== lastCutoff) {
      oldCutoff = cutoff;
      freq = cutoff * maxFreq;
      omega = tau * freq / sampleRate;
      sn = Math.sin(omega);
      cs = Math.cos(omega);
      alpha = sn * sinh(e / 2 * bandwidth * omega / sn);
      b0 = (1 + cs) / 2;
      b1 = -(1 + cs);
      b2 = (1 + cs) / 2;
      aa0 = 1 + alpha;
      aa1 = -2 * cs;
      aa2 = 1 - alpha;
      a0 = b0 / aa0;
      a1 = b1 / aa0;
      a2 = b2 / aa0;
      a3 = aa1 / aa0;
      a4 = aa2 / aa0;
    }
    s = Math.max(-1, Math.min(1, sample));
    result = a0 * s + a1 * x1 + a2 * x2 - a3 * y1 - a4 * y2;
    x2 = x1;
    x1 = s;
    y2 = y1;
    y1 = result;
    return result;
  };
};



},{}],7:[function(require,module,exports){
module.exports = function(sampleData, transpose, samplesElapsed, offset, loopActive, loopPoint) {
  var i, i1, i2, l;
  if (offset == null) {
    offset = 0;
  }
  if (loopActive == null) {
    loopActive = false;
  }
  i = samplesElapsed * Math.pow(2, transpose / 12);
  i1 = Math.floor(i);
  if (loopActive) {
    i1 = i1 % (loopPoint - offset);
  }
  i2 = i1 + 1;
  l = i % 1;
  return sampleData[offset + i1] * (1 - l) + sampleData[offset + i2] * l;
};



},{}],8:[function(require,module,exports){
var i;

i = 0;

module.exports = function(v) {
  if (i === 0) {
    console.log(v);
  }
  return i = (i + 1) % 7000;
};



},{}],9:[function(require,module,exports){
var sampleRate;

sampleRate = 48000;

module.exports = function() {
  var k, oldx, oldy1, oldy2, oldy3, p, r, t1, t2, x, y1, y2, y3, y4;
  y1 = y2 = y3 = y4 = oldx = oldy1 = oldy2 = oldy3 = 0;
  p = k = t1 = t2 = r = x = null;
  return function(sample, cutoff, res) {
    var freq;
    freq = 20 * Math.pow(10, 3 * cutoff);
    freq = freq / sampleRate;
    p = freq * (1.8 - (0.8 * freq));
    k = 2 * Math.sin(freq * Math.PI / 2) - 1;
    t1 = (1 - p) * 1.386249;
    t2 = 12 + t1 * t1;
    r = res * 0.57 * (t2 + 6 * t1) / (t2 - 6 * t1);
    x = sample - r * y4;
    y1 = x * p + oldx * p - k * y1;
    y2 = y1 * p + oldy1 * p - k * y2;
    y3 = y2 * p + oldy2 * p - k * y3;
    y4 = y3 * p + oldy3 * p - k * y4;
    y4 -= (y4 * y4 * y4) / 6;
    oldx = x;
    oldy1 = y1;
    oldy2 = y2;
    oldy3 = y3;
    return y4;
  };
};



},{}],10:[function(require,module,exports){
var tau;

tau = Math.PI * 2;

module.exports = {
  sine: function(time, frequency) {
    return Math.sin(time * tau * frequency);
  },
  square: function(time, frequency) {
    if (((time % (1 / frequency)) * frequency) % 1 > 0.5) {
      return 1;
    } else {
      return -1;
    }
  },
  saw: function(time, frequency) {
    return 1 - 2 * (((time % (1 / frequency)) * frequency) % 1);
  },
  noise: function() {
    return 2 * Math.random() - 1;
  }
};



},{}],11:[function(require,module,exports){
var RingBuffer;

module.exports = RingBuffer = (function() {
  function RingBuffer(maxLength, Type, length) {
    this.maxLength = maxLength;
    this.Type = Type != null ? Type : Float32Array;
    this.length = length;
    this.length || (this.length = this.maxLength);
    this.array = new this.Type(this.maxLength);
    this.pos = 0;
  }

  RingBuffer.prototype.reset = function() {
    this.array = new this.Type(this.maxLength);
    return this;
  };

  RingBuffer.prototype.resize = function(length) {
    this.length = length;
    if (this.pos >= this.length) {
      return this.pos = 0;
    }
  };

  RingBuffer.prototype.push = function(el) {
    this.array[this.pos] = el;
    this.pos += 1;
    if (this.pos === this.length) {
      this.pos = 0;
    }
    return this;
  };

  RingBuffer.prototype.forEach = function(fn) {
    var i, len;
    for (i = this.pos, len = this.length; i < len; i++) {
      fn(this.array[i], i);
    }
    for (i = 0, len = this.pos; i < len; i++) {
      fn(this.array[i], i);
    };
    return this;
  };

  RingBuffer.prototype.reduce = function(fn, memo) {
    if (memo == null) {
      memo = 0;
    }
    this.forEach(function(el, i) {
      return memo = fn(memo, el, i);
    });
    return memo;
  };

  return RingBuffer;

})();



},{}],12:[function(require,module,exports){
module.exports = function(decay, elapsed) {
  if (elapsed > decay) {
    return 0;
  } else {
    return 1 - elapsed / decay;
  }
};



},{}],13:[function(require,module,exports){
var DrumSampler, Instrument, envelope, linearInterpolator,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Instrument = require('./instrument');

envelope = require('./components/envelope');

linearInterpolator = require('./components/linear_interpolator');

module.exports = DrumSampler = (function(superClass) {
  extend(DrumSampler, superClass);

  function DrumSampler() {
    return DrumSampler.__super__.constructor.apply(this, arguments);
  }

  DrumSampler.createState = function(state, instrument) {
    return state[instrument._id] = {
      notes: {}
    };
  };

  DrumSampler.sample = function(state, samples, instrument, time, i) {
    if (instrument.level === 0) {
      return 0;
    }
    if (state[instrument._id] == null) {
      return 0;
    }
    return instrument.level * instrument.drums.reduce((function(_this) {
      return function(memo, drum) {
        var note, offset, sample, sampleData, samplesElapsed;
        note = state[instrument._id].notes[drum.key];
        if (note == null) {
          return memo;
        }
        sampleData = samples[drum.sampleId];
        if (sampleData == null) {
          return memo;
        }
        samplesElapsed = i - note.i;
        offset = Math.floor(drum.start * sampleData.length);
        if (samplesElapsed + offset > sampleData.length) {
          return memo;
        }
        sample = linearInterpolator(sampleData, drum.transpose, samplesElapsed, offset);
        return memo + drum.level * envelope(drum.volumeEnv, note, time) * (sample || 0);
      };
    })(this), 0);
  };

  DrumSampler.tick = function(state, instrument, time, i, beat, bps, notesOn, notesOff) {
    if (state[instrument._id] == null) {
      this.createState(state, instrument);
    }
    notesOff.forEach(function(arg) {
      var key, ref;
      key = arg.key;
      return (ref = state[instrument._id].notes[key]) != null ? ref.timeOff = time : void 0;
    });
    return notesOn.forEach((function(_this) {
      return function(note) {
        return state[instrument._id].notes[note.key] = {
          time: time,
          i: i
        };
      };
    })(this));
  };

  return DrumSampler;

})(Instrument);



},{"./components/envelope":5,"./components/linear_interpolator":7,"./instrument":15}],14:[function(require,module,exports){
var DrumSynthesizer, Instrument, highpassFilter, oscillators, simpleEnvelope,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Instrument = require('./instrument');

highpassFilter = require('./components/highpass_filter');

simpleEnvelope = require('./components/simple_envelope');

oscillators = require('./components/oscillators');

module.exports = DrumSynthesizer = (function(superClass) {
  var freqScale, maxFreq, minFreq;

  extend(DrumSynthesizer, superClass);

  function DrumSynthesizer() {
    return DrumSynthesizer.__super__.constructor.apply(this, arguments);
  }

  minFreq = 60;

  maxFreq = 3000;

  freqScale = maxFreq - minFreq;

  DrumSynthesizer.createState = function(state, instrument) {
    var i;
    return state[instrument._id] = {
      notes: {},
      filters: (function() {
        var j, results;
        results = [];
        for (i = j = 0; j < 127; i = ++j) {
          results.push(highpassFilter());
        }
        return results;
      })()
    };
  };

  DrumSynthesizer.sample = function(state, samples, instrument, time, i) {
    if (instrument.level === 0) {
      return 0;
    }
    if (state[instrument._id] == null) {
      return 0;
    }
    return instrument.level * instrument.drums.reduce((function(_this) {
      return function(memo, drum) {
        var elapsed, env, freq, note, sample, signal;
        note = state[instrument._id].notes[drum.key];
        if (note == null) {
          return memo;
        }
        elapsed = time - note.time;
        if (elapsed > drum.decay) {
          return memo;
        }
        env = simpleEnvelope(drum.decay, elapsed);
        freq = minFreq + drum.pitch * freqScale;
        if (drum.bend) {
          freq = (2 - drum.bend + drum.bend * env) / 2 * freq;
        }
        if (drum.fm > 0) {
          signal = oscillators.sine(elapsed, minFreq + drum.fmFreq * freqScale);
          freq += drum.fm * signal * simpleEnvelope(drum.fmDecay + 0.01, elapsed);
        }
        sample = (1 - drum.noise) * oscillators.sine(elapsed, freq) + drum.noise * oscillators.noise();
        if (drum.hp > 0) {
          sample = state[instrument._id].filters[drum.key](sample, drum.hp);
        }
        return memo + drum.level * env * sample;
      };
    })(this), 0);
  };

  DrumSynthesizer.tick = function(state, instrument, time, i, beat, bps, notesOn, notesOff) {
    if (state[instrument._id] == null) {
      this.createState(state, instrument);
    }
    return notesOn.forEach((function(_this) {
      return function(note) {
        return state[instrument._id].notes[note.key] = {
          time: time,
          i: i
        };
      };
    })(this));
  };

  return DrumSynthesizer;

})(Instrument);



},{"./components/highpass_filter":6,"./components/oscillators":10,"./components/simple_envelope":12,"./instrument":15}],15:[function(require,module,exports){
var Instrument, RingBuffer;

RingBuffer = require('./components/ring_buffer');

module.exports = Instrument = (function() {
  function Instrument() {}

  Instrument.createState = function(state, instrument) {
    return state[instrument._id] = {
      notes: new RingBuffer(instrument.maxPolyphony, Array, instrument.polyphony),
      noteMap: {}
    };
  };

  Instrument.releaseState = function(state, instrument) {
    return delete state[instrument._id];
  };

  Instrument.sample = function(state, samples, instrument, time, i) {
    return 0;
  };

  Instrument.tick = function(state, instrument, time, i, beat, bps, notesOn, notesOff) {
    var instrumentState;
    if (state[instrument._id] == null) {
      this.createState(state, instrument);
    }
    instrumentState = state[instrument._id];
    if (instrument.polyphony !== instrumentState.notes.length) {
      instrumentState.notes.resize(instrument.polyphony);
    }
    notesOff.forEach(function(arg) {
      var key, ref;
      key = arg.key;
      return (ref = instrumentState.noteMap[key]) != null ? ref.timeOff = time : void 0;
    });
    return notesOn.forEach(function(arg) {
      var key;
      key = arg.key;
      instrumentState.noteMap[key] = {
        time: time,
        i: i,
        key: key
      };
      return instrumentState.notes.push(instrumentState.noteMap[key]);
    });
  };

  return Instrument;

})();



},{"./components/ring_buffer":11}],16:[function(require,module,exports){
var Instrument, LoopSampler, RingBuffer,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Instrument = require('./instrument');

RingBuffer = require('./components/ring_buffer');

module.exports = LoopSampler = (function(superClass) {
  extend(LoopSampler, superClass);

  function LoopSampler() {
    return LoopSampler.__super__.constructor.apply(this, arguments);
  }

  return LoopSampler;

})(Instrument);



},{"./components/ring_buffer":11,"./instrument":15}],17:[function(require,module,exports){
var Song, Track,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Track = require('./track');

module.exports = Song = (function() {
  var clip, clockRatio, meterDecay;

  clockRatio = 110;

  meterDecay = 0.05;

  clip = function(sample) {
    return Math.max(0, Math.min(2, sample + 1)) - 1;
  };

  function Song() {
    this.tick = bind(this.tick, this);
    this.sample = bind(this.sample, this);
    this.lastBeat = 0;
    this.state = {};
    this.song = null;
    this.samples = {};
    this.midiMessages = [];
  }

  Song.prototype.update = function(state) {
    return this.song = state;
  };

  Song.prototype.midi = function(message) {
    return this.midiMessages.push(message);
  };

  Song.prototype.buffer = function(size, index, sampleRate) {
    var arr, i, ii, j, ref, t;
    arr = new Float32Array(size);
    if (this.song != null) {
      for (i = j = 0, ref = size; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        ii = index + i;
        t = ii / sampleRate;
        arr[i] = this.sample(t, ii);
      }
    }
    return arr.buffer;
  };

  Song.prototype.sample = function(time, i) {
    if (i % clockRatio === 0) {
      this.tick(time, i);
    }
    return clip(this.song.level * this.song.tracks.reduce((function(_this) {
      return function(memo, track) {
        return memo + Track.sample(_this.state, _this.samples, track, time, i);
      };
    })(this), 0));
  };

  Song.prototype.tick = function(time, i) {
    var beat, bps;
    bps = this.song.bpm / 60;
    beat = time * bps;
    this.song.tracks.forEach((function(_this) {
      return function(track, index) {
        var midiMessages;
        midiMessages = index === _this.song.selectedTrack ? _this.midiMessages : null;
        return Track.tick(_this.state, track, midiMessages, time, i, beat, _this.lastBeat, bps);
      };
    })(this));
    return this.lastBeat = beat;
  };

  Song.prototype.addSample = function(id, sampleData) {
    return this.samples[id] = sampleData;
  };

  Song.prototype.removeSample = function(id) {
    return delete this.samples[id];
  };

  Song.prototype.clearSamples = function() {
    return this.samples = {};
  };

  Song.prototype.processFrame = function() {
    var j, len, ref, ref1, results, track;
    if (((ref = this.song) != null ? ref.tracks : void 0) != null) {
      ref1 = this.song.tracks;
      results = [];
      for (j = 0, len = ref1.length; j < len; j++) {
        track = ref1[j];
        if (this.state[track._id] != null) {
          results.push(this.state[track._id].meterLevel -= meterDecay);
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  Song.prototype.getState = function() {
    var ref, ref1;
    return {
      meterLevels: (ref = this.song) != null ? (ref1 = ref.tracks) != null ? ref1.reduce((function(_this) {
        return function(memo, track) {
          var ref2;
          memo[track._id] = (ref2 = _this.state[track._id]) != null ? ref2.meterLevel : void 0;
          return memo;
        };
      })(this), {}) : void 0 : void 0
    };
  };

  return Song;

})();



},{"./track":18}],18:[function(require,module,exports){
var Track, instrumentTypes;

instrumentTypes = {
  AnalogSynthesizer: require('./analog_synthesizer'),
  BasicSampler: require('./basic_sampler'),
  DrumSampler: require('./drum_sampler'),
  DrumSynthesizer: require('./drum_synthesizer'),
  LoopSampler: require('./loop_sampler')
};

module.exports = Track = (function() {
  function Track() {}

  Track.createState = function(state, track) {
    return state[track._id] = {
      meterLevel: 0
    };
  };

  Track.releaseState = function(state, track) {
    return delete state[track._id];
  };

  Track.sample = function(state, samples, track, time, i) {
    var Instrument, level, sample, trackState;
    Instrument = instrumentTypes[track.instrument._type];
    sample = Instrument.sample(state, samples, track.instrument, time, i);
    sample = track.effects.reduce(function(sample, effect) {
      return Effect.sample(state, effect, time, i, sample);
    }, sample);
    if (trackState = state[track._id]) {
      level = trackState.meterLevel;
      if ((level == null) || isNaN(level) || sample > level) {
        trackState.meterLevel = sample;
      }
    }
    return sample;
  };

  Track.tick = function(state, track, midiMessages, time, i, beat, lastBeat, bps) {
    var Instrument, notesOff, notesOn, ref;
    if (state[track._id] == null) {
      this.createState(state, track);
    }
    Instrument = instrumentTypes[track.instrument._type];
    ref = this.notes(track.sequence, midiMessages, time, beat, lastBeat), notesOn = ref.notesOn, notesOff = ref.notesOff;
    Instrument.tick(state, track.instrument, time, i, beat, bps, notesOn, notesOff);
    return track.effects.forEach(function(e) {
      return e.tick(state, time, beat, bps);
    });
  };

  Track.notes = function(sequence, midiMessages, time, beat, lastBeat) {
    var bar, end, id, lastBar, note, notesOff, notesOn, ref, start;
    bar = Math.floor(beat / sequence.loopSize);
    lastBar = Math.floor(lastBeat / sequence.loopSize);
    beat = beat % sequence.loopSize;
    lastBeat = lastBeat % sequence.loopSize;
    notesOn = [];
    notesOff = [];
    ref = sequence.notes;
    for (id in ref) {
      note = ref[id];
      start = note.start;
      end = note.start + note.length;
      if (start < beat && (start >= lastBeat || bar > lastBar)) {
        notesOn.push({
          key: note.key
        });
      }
      if (end < beat && (end >= lastBeat || bar > lastBar)) {
        notesOff.push({
          key: note.key
        });
      } else if (bar > lastBar && end === sequence.loopSize) {
        notesOff.push({
          key: note.key
        });
      }
    }
    if (midiMessages != null) {
      midiMessages.forEach(function(message, i) {
        if (message.time < time) {
          midiMessages.splice(i, 1);
          switch (message.type) {
            case 'on':
              return notesOn.push({
                key: message.key
              });
            case 'off':
              return notesOff.push({
                key: message.key
              });
          }
        }
      });
    }
    return {
      notesOn: notesOn,
      notesOff: notesOff
    };
  };

  return Track;

})();



},{"./analog_synthesizer":2,"./basic_sampler":3,"./drum_sampler":13,"./drum_synthesizer":14,"./loop_sampler":16}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2FuYWxvZ19zeW50aGVzaXplci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvYmFzaWNfc2FtcGxlci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9lbmNvZGVfd2F2LmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL2VudmVsb3BlLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL2hpZ2hwYXNzX2ZpbHRlci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9saW5lYXJfaW50ZXJwb2xhdG9yLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL2xvZ19zYW1wbGUuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvbG93cGFzc19maWx0ZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvb3NjaWxsYXRvcnMuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvcmluZ19idWZmZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvc2ltcGxlX2VudmVsb3BlLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9kcnVtX3NhbXBsZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2RydW1fc3ludGhlc2l6ZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2luc3RydW1lbnQuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2xvb3Bfc2FtcGxlci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3Avc29uZy5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvdHJhY2suY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDWUEsSUFBQSxlQUFBOztBQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsbUJBQVIsQ0FBUCxDQUFBOztBQUFBLFNBQ0EsR0FBWSxPQUFBLENBQVEsNkJBQVIsQ0FEWixDQUFBOztBQUFBLElBR0ksQ0FBQyxJQUFMLEdBQVksR0FBQSxDQUFBLElBSFosQ0FBQTs7QUFBQSxJQUtJLENBQUMsU0FBTCxHQUFpQixPQUFBLENBQVEsNkJBQVIsQ0FMakIsQ0FBQTs7QUFBQSxJQVFJLENB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RUksT0FBTyxDQUFDLElBQVIsQ0FBYTtBQUFBLGdCQUFBLEdBQUEsRUFBSyxPQUFPLENBQUMsR0FBYjtlQUFiLEVBRko7QUFBQSxpQkFHTyxLQUhQO3FCQUlJLFFBQVEsQ0FBQyxJQUFULENBQWM7QUFBQSxnQkFBQSxHQUFBLEVBQUssT0FBTyxDQUFDLEdBQWI7ZUFBZCxFQUpKO0FBQUEsV0FGRjtTQURtQjtNQUFBLENBQXJCLENBQUEsQ0FERjtLQXhCQTtXQWtDQTtBQUFBLE1BQUMsU0FBQSxPQUFEO0FBQUEsTUFBVSxVQUFBLFFBQVY7TUFuQ007RUFBQSxDQXRDUixDQUFBOztlQUFBOztJQVZGLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiIyB0aGlzIHNjcmlwdCBpcyBydW4gaW5zaWRlIGEgd29ya2VyIGluIG9yZGVyIHRvIGRvIGF1ZGlvIHByb2Nlc3Npbmcgb3V0c2lkZSBvZlxuIyB0aGUgbWFpbiB1aSB0aHJlYWQuXG4jXG4jIFRoZSB3b3JrZXIgcmVjZWl2ZXMgdGhyZWUgdHlwZXMgb2YgbWVzc2FnZXMgLSAndXBkYXRlJyB3LyB7c3RhdGV9IGNvbnRhaW5pbmdcbiMgdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlIHNvbmcsICdtaWRpJyB3LyB7bWVzc2FnZX0gY29udGFpbmluZyBpbmNvbWluZyBub3RlT25cbiMgYW5kIG5vdGVPZmYgbWVzc2FnZXMsIGFuZCAnYnVmZmVyJyB3LyB7c2l6ZSwgaW5kZXgsIHNhbXBsZVJhdGV9IHJlcXVlc3RpbmdcbiMgYSBidWZmZXIgdG8gYmUgZmlsbGVkIGFuZCBzZW50IGJhY2suXG4jXG4jIEl0IGFsc28gc2VuZHMgdHdvIHR5cGVzIG9mIG1lc3NhZ2VzIC0gJ2ZyYW1lJyBtZXNzYWdlcyBhdCA2MGh6IGNvbnRhaW5pbmcgdGhlXG4jIGN1cnJlbnQgcGxheWJhY2sgc3RhdGUgYXMge2ZyYW1lfSwgYW5kIHNlbmRzICdidWZmZXInIG1lc3NhZ2VzIHRyYW5zZmVycmluZ1xuIyBmaWxsZWQgQXJyYXlCdWZmZXJzIGluIHJlc3BvbnNlIHRvICdidWZmZXInIHJlcXVlc3RzLlxuXG5Tb25nID0gcmVxdWlyZSAnLi9kc3Avc29uZy5jb2ZmZWUnXG5lbmNvZGVXYXYgPSByZXF1aXJlICcuL2RzcC9jb21wb25lbnRzL2VuY29kZV93YXYnXG5cbnNlbGYuc29uZyA9IG5ldyBTb25nXG5cbnNlbGYubG9nU2FtcGxlID0gcmVxdWlyZSAnLi9kc3AvY29tcG9uZW50cy9sb2dfc2FtcGxlJ1xuXG4jIHJlc3BvbmQgdG8gbWVzc2FnZXMgZnJvbSBwYXJlbnQgdGhyZWFkXG5zZWxmLm9ubWVzc2FnZSA9IChlKSAtPlxuICBzd2l0Y2ggZS5kYXRhLnR5cGVcbiAgICB3aGVuICdidWZmZXInXG4gICAgICBidWZmZXIgPSBzb25nLmJ1ZmZlciBlLmRhdGEuc2l6ZSwgZS5kYXRhLmluZGV4LCBlLmRhdGEuc2FtcGxlUmF0ZVxuICAgICAgcG9zdE1lc3NhZ2VcbiAgICAgICAgdHlwZTogJ2J1ZmZlcidcbiAgICAgICAgYnVmZmVyOiBidWZmZXJcbiAgICAgICwgW2J1ZmZlcl1cbiAgICB3aGVuICdib3VuY2UnXG4gICAgICBidWZmZXIgPSBzb25nLmJ1ZmZlciBlLmRhdGEuc2l6ZSwgZS5kYXRhLmluZGV4LCBlLmRhdGEuc2FtcGxlUmF0ZVxuICAgICAgd2F2ID0gZW5jb2RlV2F2IGJ1ZmZlciwgMSwgZS5kYXRhLnNhbXBsZVJhdGVcbiAgICAgIHBvc3RNZXNzYWdlXG4gICAgICAgIHR5cGU6ICdib3VuY2UnXG4gICAgICAgIHdhdjogd2F2XG4gICAgICAsIFt3YXZdXG4gICAgd2hlbiAndXBkYXRlJ1xuICAgICAgc29uZy51cGRhdGUgZS5kYXRhLnN0YXRlXG4gICAgd2hlbiAnbWlkaSdcbiAgICAgIHNvbmcubWlkaSBlLmRhdGEubWVzc2FnZVxuICAgIHdoZW4gJ2FkZFNhbXBsZSdcbiAgICAgIHNvbmcuYWRkU2FtcGxlIGUuZGF0YS5pZCwgZS5kYXRhLnNhbXBsZURhdGFcbiAgICB3aGVuICdyZW1vdmVTYW1wbGUnXG4gICAgICBzb25nLnJlbW92ZVNhbXBsZSBlLmRhdGEuaWRcbiAgICB3aGVuICdjbGVhclNhbXBsZXMnXG4gICAgICBzb25nLmNsZWFyU2FtcGxlcygpXG5cbiMgdHJpZ2dlciBwcm9jZXNzaW5nIG9uIHNvbmcgYXQgZnJhbWUgcmF0ZSBhbmQgc2VuZCB1cGRhdGVzIHRvIHRoZSBwYXJlbnQgdGhyZWFkXG5zZXRJbnRlcnZhbCAtPlxuICBzb25nLnByb2Nlc3NGcmFtZSgpXG4gIHBvc3RNZXNzYWdlXG4gICAgdHlwZTogJ2ZyYW1lJ1xuICAgIGZyYW1lOiBzb25nLmdldFN0YXRlKClcbiwgMTAwMCAvIDYwXG4iLCJJbnN0cnVtZW50ID0gcmVxdWlyZSAnLi9pbnN0cnVtZW50J1xuUmluZ0J1ZmZlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9yaW5nX2J1ZmZlcidcbmxvd3Bhc3NGaWx0ZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvbG93cGFzc19maWx0ZXInXG5oaWdocGFzc0ZpbHRlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9oaWdocGFzc19maWx0ZXInXG5lbnZlbG9wZSA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9lbnZlbG9wZSdcbm9zY2lsbGF0b3JzID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL29zY2lsbGF0b3JzJ1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgQW5hbG9nU3ludGhlc2l6ZXIgZXh0ZW5kcyBJbnN0cnVtZW50XG5cbiAgdHVuZSA9IDQ0MFxuICBmcmVxdWVuY3kgPSAoa2V5KSAtPlxuICAgIHR1bmUgKiBNYXRoLnBvdyAyLCAoa2V5IC0gNjkpIC8gMTJcblxuICBAY3JlYXRlU3RhdGU6IChzdGF0ZSwgaW5zdHJ1bWVudCkgLT5cbiAgICBzdXBlciBzdGF0ZSwgaW5zdHJ1bWVudFxuXG4gICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdLmZpbHRlcnMgPVxuICAgICAgTFA6IChsb3dwYXNzRmlsdGVyKCkgZm9yIGkgaW4gWzAuLi5pbnN0cnVtZW50Lm1heFBvbHlwaG9ueV0pXG4gICAgICBIUDogKGhpZ2hwYXNzRmlsdGVyKCkgZm9yIGkgaW4gWzAuLi5pbnN0cnVtZW50Lm1heFBvbHlwaG9ueV0pXG4gICAgICBub25lOiAoKChzYW1wbGUpIC0+IHNhbXBsZSkgZm9yIGkgaW4gWzAuLi5pbnN0cnVtZW50Lm1heFBvbHlwaG9ueV0pXG5cbiAgQHNhbXBsZTogKHN0YXRlLCBzYW1wbGVzLCBpbnN0cnVtZW50LCB0aW1lLCBpKSAtPlxuICAgIHJldHVybiAwIGlmIGluc3RydW1lbnQubGV2ZWwgaXMgMFxuICAgIHJldHVybiAwIHVubGVzcyBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0/XG5cbiAgICByID0gTWF0aC5tYXggMC4wMSwgaW5zdHJ1bWVudC52b2x1bWVFbnYuclxuXG4gICAgIyBzdW0gYWxsIGFjdGl2ZSBub3Rlc1xuICAgIGluc3RydW1lbnQubGV2ZWwgKiBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXMucmVkdWNlKChtZW1vLCBub3RlLCBpbmRleCkgPT5cbiAgICAgIHJldHVybiBtZW1vIHVubGVzcyBub3RlP1xuICAgICAgcmV0dXJuIG1lbW8gaWYgdGltZSA+IHIgKyBub3RlLnRpbWVPZmZcblxuICAgICAgIyBzdW0gb3NjaWxsYXRvcnMgYW5kIGFwcGx5IHZvbHVtZSBlbnZlbG9wZVxuICAgICAgb3NjMUZyZXEgPSBmcmVxdWVuY3kgbm90ZS5rZXkgKyBpbnN0cnVtZW50Lm9zYzEudHVuZSAtIDAuNSArIE1hdGgucm91bmQoMjQgKiAoaW5zdHJ1bWVudC5vc2MxLnBpdGNoIC0gMC41KSlcbiAgICAgIG9zYzJGcmVxID0gZnJlcXVlbmN5IG5vdGUua2V5ICsgaW5zdHJ1bWVudC5vc2MyLnR1bmUgLSAwLjUgKyBNYXRoLnJvdW5kKDI0ICogKGluc3RydW1lbnQub3NjMi5waXRjaCAtIDAuNSkpXG4gICAgICBzYW1wbGUgPSBlbnZlbG9wZShpbnN0cnVtZW50LnZvbHVtZUVudiwgbm90ZSwgdGltZSkgKiAoXG4gICAgICAgIGluc3RydW1lbnQub3NjMS5sZXZlbCAqIG9zY2lsbGF0b3JzW2luc3RydW1lbnQub3NjMS53YXZlZm9ybV0odGltZSwgb3NjMUZyZXEpICtcbiAgICAgICAgaW5zdHJ1bWVudC5vc2MyLmxldmVsICogb3NjaWxsYXRvcnNbaW5zdHJ1bWVudC5vc2MyLndhdmVmb3JtXSh0aW1lLCBvc2MyRnJlcSlcbiAgICAgIClcblxuICAgICAgIyBhcHBseSBmaWx0ZXIgd2l0aCBlbnZlbG9wZVxuICAgICAgY3V0b2ZmID0gTWF0aC5taW4gMSwgaW5zdHJ1bWVudC5maWx0ZXIuZnJlcSArIGluc3RydW1lbnQuZmlsdGVyLmVudiAqIGVudmVsb3BlKGluc3RydW1lbnQuZmlsdGVyRW52LCBub3RlLCB0aW1lKVxuICAgICAgZmlsdGVyID0gc3RhdGVbaW5zdHJ1bWVudC5faWRdLmZpbHRlcnNbaW5zdHJ1bWVudC5maWx0ZXIudHlwZV1baW5kZXhdXG4gICAgICBzYW1wbGUgPSBmaWx0ZXIgc2FtcGxlLCBjdXRvZmYsIGluc3RydW1lbnQuZmlsdGVyLnJlc1xuXG4gICAgICAjIHJldHVybiByZXN1bHRcbiAgICAgIG1lbW8gKyBzYW1wbGVcblxuICAgICwgMClcbiIsIkluc3RydW1lbnQgPSByZXF1aXJlICcuL2luc3RydW1lbnQnXG5SaW5nQnVmZmVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL3JpbmdfYnVmZmVyJ1xubGluZWFySW50ZXJwb2xhdG9yID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2xpbmVhcl9pbnRlcnBvbGF0b3InXG5sb3dwYXNzRmlsdGVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2xvd3Bhc3NfZmlsdGVyJ1xuaGlnaHBhc3NGaWx0ZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvaGlnaHBhc3NfZmlsdGVyJ1xuZW52ZWxvcGUgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvZW52ZWxvcGUnXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBCYXNpY1NhbXBsZXIgZXh0ZW5kcyBJbnN0cnVtZW50XG5cbiAgQGNyZWF0ZVN0YXRlOiAoc3RhdGUsIGluc3RydW1lbnQpIC0+XG4gICAgc3VwZXIgc3RhdGUsIGluc3RydW1lbnRcblxuICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXS5maWx0ZXJzID1cbiAgICAgIExQOiAobG93cGFzc0ZpbHRlcigpIGZvciBpIGluIFswLi4uaW5zdHJ1bWVudC5tYXhQb2x5cGhvbnldKVxuICAgICAgSFA6IChoaWdocGFzc0ZpbHRlcigpIGZvciBpIGluIFswLi4uaW5zdHJ1bWVudC5tYXhQb2x5cGhvbnldKVxuICAgICAgbm9uZTogKCgoc2FtcGxlKSAtPiBzYW1wbGUpIGZvciBpIGluIFswLi4uaW5zdHJ1bWVudC5tYXhQb2x5cGhvbnldKVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgc2FtcGxlcywgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICByZXR1cm4gMCBpZiBpbnN0cnVtZW50LmxldmVsIGlzIDBcbiAgICByZXR1cm4gMCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgc2FtcGxlRGF0YSA9IHNhbXBsZXNbaW5zdHJ1bWVudC5zYW1wbGVJZF1cbiAgICByZXR1cm4gMCB1bmxlc3Mgc2FtcGxlRGF0YT9cblxuICAgIHIgPSBNYXRoLm1heCAwLjAxLCBpbnN0cnVtZW50LnZvbHVtZUVudi5yXG5cbiAgICAjIHN1bSBhbGwgYWN0aXZlIG5vdGVzXG4gICAgaW5zdHJ1bWVudC5sZXZlbCAqIHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlcy5yZWR1Y2UoKG1lbW8sIG5vdGUsIGluZGV4KSA9PlxuICAgICAgcmV0dXJuIG1lbW8gdW5sZXNzIG5vdGU/XG4gICAgICByZXR1cm4gbWVtbyBpZiB0aW1lID4gciArIG5vdGUudGltZU9mZlxuXG4gICAgICAjIGdldCBwaXRjaCBzaGlmdGVkIGludGVycG9sYXRlZCBzYW1wbGUgYW5kIGFwcGx5IHZvbHVtZSBlbnZlbG9wZVxuICAgICAgdHJhbnNwb3NlID0gbm90ZS5rZXkgLSBpbnN0cnVtZW50LnJvb3RLZXkgKyBpbnN0cnVtZW50LnR1bmUgLSAwLjVcbiAgICAgIHNhbXBsZXNFbGFwc2VkID0gaSAtIG5vdGUuaVxuICAgICAgb2Zmc2V0ID0gTWF0aC5mbG9vciBpbnN0cnVtZW50LnN0YXJ0ICogc2FtcGxlRGF0YS5sZW5ndGhcbiAgICAgIGxvb3BBY3RpdmUgPSBpbnN0cnVtZW50Lmxvb3BBY3RpdmUgaXMgJ2xvb3AnXG4gICAgICBsb29wUG9pbnQgPSBNYXRoLmZsb29yIGluc3RydW1lbnQubG9vcCAqIHNhbXBsZURhdGEubGVuZ3RoXG4gICAgICBzYW1wbGUgPSBsaW5lYXJJbnRlcnBvbGF0b3Igc2FtcGxlRGF0YSwgdHJhbnNwb3NlLCBzYW1wbGVzRWxhcHNlZCwgb2Zmc2V0LCBsb29wQWN0aXZlLCBsb29wUG9pbnRcbiAgICAgIHNhbXBsZSA9IGVudmVsb3BlKGluc3RydW1lbnQudm9sdW1lRW52LCBub3RlLCB0aW1lKSAqIChzYW1wbGUgb3IgMClcblxuICAgICAgIyBhcHBseSBmaWx0ZXIgd2l0aCBlbnZlbG9wZVxuICAgICAgY3V0b2ZmID0gTWF0aC5taW4gMSwgaW5zdHJ1bWVudC5maWx0ZXIuZnJlcSArIGluc3RydW1lbnQuZmlsdGVyLmVudiAqIGVudmVsb3BlKGluc3RydW1lbnQuZmlsdGVyRW52LCBub3RlLCB0aW1lKVxuICAgICAgZmlsdGVyID0gc3RhdGVbaW5zdHJ1bWVudC5faWRdLmZpbHRlcnNbaW5zdHJ1bWVudC5maWx0ZXIudHlwZV1baW5kZXhdXG4gICAgICBzYW1wbGUgPSBmaWx0ZXIgc2FtcGxlLCBjdXRvZmYsIGluc3RydW1lbnQuZmlsdGVyLnJlc1xuXG4gICAgICAjIHJldHVybiByZXN1bHRcbiAgICAgIG1lbW8gKyBzYW1wbGVcblxuICAgICwgMClcbiIsIiMgcHVsbGVkIGZyb20gbWF0dCBkaWFtb25kIC8gcmVjb3JkZXJqc1xuIyBodHRwczovL2dpdGh1Yi5jb20vbWF0dGRpYW1vbmQvUmVjb3JkZXJqcy9ibG9iL21hc3Rlci9yZWNvcmRlcldvcmtlci5qc1xuXG5cbmZsb2F0VG8xNkJpdFBDTSA9IChvdXRwdXQsIG9mZnNldCwgaW5wdXQpIC0+XG4gIGZvciBpIGluIFswLi4uaW5wdXQubGVuZ3RoXVxuICAgIHMgPSBNYXRoLm1heCAtMSwgTWF0aC5taW4gMSwgaW5wdXRbaV1cbiAgICBzID0gaWYgcyA8IDAgdGhlbiBzICogMHg4MDAwIGVsc2UgcyAqIDB4N0ZGRlxuICAgIG91dHB1dC5zZXRJbnQxNiBvZmZzZXQsIHMsIHRydWVcbiAgICBvZmZzZXQgKz0gMlxuXG53cml0ZVN0cmluZyA9ICh2aWV3LCBvZmZzZXQsIHN0cmluZykgLT5cbiAgZm9yIGkgaW4gWzAuLi5zdHJpbmcubGVuZ3RoXVxuICAgIHZpZXcuc2V0VWludDggb2Zmc2V0ICsgaSwgc3RyaW5nLmNoYXJDb2RlQXQgaVxuXG5cbm1vZHVsZS5leHBvcnRzID0gKHNhbXBsZXMsIG51bUNoYW5uZWxzLCBzYW1wbGVSYXRlKSAtPlxuICBzYW1wbGVzID0gbmV3IEZsb2F0MzJBcnJheSBzYW1wbGVzXG4gIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlciA0NCArIHNhbXBsZXMubGVuZ3RoICogMlxuICB2aWV3ID0gbmV3IERhdGFWaWV3IGJ1ZmZlclxuXG4gICMgUklGRiBpZGVudGlmaWVyXG4gIHdyaXRlU3RyaW5nIHZpZXcsIDAsICdSSUZGJ1xuICAjIFJJRkYgY2h1bmsgbGVuZ3RoXG4gIHZpZXcuc2V0VWludDMyIDQsIDM2ICsgc2FtcGxlcy5sZW5ndGggKiAyLCB0cnVlXG4gICMgUklGRiB0eXBlXG4gIHdyaXRlU3RyaW5nIHZpZXcsIDgsICdXQVZFJ1xuICAjIGZvcm1hdCBjaHVuayBpZGVudGlmaWVyXG4gIHdyaXRlU3RyaW5nIHZpZXcsIDEyLCAnZm10ICdcbiAgIyBmb3JtYXQgY2h1bmsgbGVuZ3RoXG4gIHZpZXcuc2V0VWludDMyIDE2LCAxNiwgdHJ1ZVxuICAjIHNhbXBsZSBmb3JtYXQgKHJhdylcbiAgdmlldy5zZXRVaW50MTYgMjAsIDEsIHRydWVcbiAgIyBjaGFubmVsIGNvdW50XG4gIHZpZXcuc2V0VWludDE2IDIyLCBudW1DaGFubmVscywgdHJ1ZVxuICAjIHNhbXBsZSByYXRlXG4gIHZpZXcuc2V0VWludDMyIDI0LCBzYW1wbGVSYXRlLCB0cnVlXG4gICMgYnl0ZSByYXRlIChzYW1wbGUgcmF0ZSAqIGJsb2NrIGFsaWduKVxuICB2aWV3LnNldFVpbnQzMiAyOCwgc2FtcGxlUmF0ZSAqIDQsIHRydWVcbiAgIyBibG9jayBhbGlnbiAoY2hhbm5lbCBjb3VudCAqIGJ5dGVzIHBlciBzYW1wbGUpXG4gIHZpZXcuc2V0VWludDE2IDMyLCBudW1DaGFubmVscyAqIDIsIHRydWVcbiAgIyBiaXRzIHBlciBzYW1wbGVcbiAgdmlldy5zZXRVaW50MTYgMzQsIDE2LCB0cnVlXG4gICMgZGF0YSBjaHVuayBpZGVudGlmaWVyXG4gIHdyaXRlU3RyaW5nIHZpZXcsIDM2LCAnZGF0YSdcbiAgIyBkYXRhIGNodW5rIGxlbmd0aFxuICB2aWV3LnNldFVpbnQzMiA0MCwgc2FtcGxlcy5sZW5ndGggKiAyLCB0cnVlXG5cbiAgZmxvYXRUbzE2Qml0UENNIHZpZXcsIDQ0LCBzYW1wbGVzXG5cbiAgYnVmZmVyXG4iLCJtaW5FbnZWYWx1ZSA9IDAuMDFcblxubW9kdWxlLmV4cG9ydHMgPSAoZW52LCBub3RlLCB0aW1lKSAtPlxuICBlbGFwc2VkID0gdGltZSAtIG5vdGUudGltZVxuICBhID0gTWF0aC5tYXggbWluRW52VmFsdWUsIGVudi5hXG4gIGQgPSBNYXRoLm1heCBtaW5FbnZWYWx1ZSwgZW52LmRcbiAgcyA9IGVudi5zXG4gIHIgPSBNYXRoLm1heCBtaW5FbnZWYWx1ZSwgZW52LnJcblxuICAjIGF0dGFjaywgZGVjYXksIHN1c3RhaW5cbiAgbCA9IGlmIGVsYXBzZWQgPiBhICsgZFxuICAgIGwgPSBzXG4gIGVsc2UgaWYgZWxhcHNlZCA+IGFcbiAgICBsID0gcyArICgxIC0gcykgKiAoYSArIGQgLSBlbGFwc2VkKSAvIGRcbiAgZWxzZVxuICAgIGVsYXBzZWQgLyBhXG5cbiAgIyByZWxlYXNlXG4gIGlmIG5vdGUudGltZU9mZlxuICAgIGwgPSBsICogKG5vdGUudGltZU9mZiArIHIgLSB0aW1lKSAvIHJcblxuICBNYXRoLm1heCAwLCBsXG4iLCJzYW1wbGVSYXRlID0gNDgwMDBcbm1heEZyZXEgPSAxMjAwMFxuZGJHYWluID0gMTIgICAgIyBnYWluIG9mIGZpbHRlclxuYmFuZHdpZHRoID0gMSAgIyBiYW5kd2lkdGggaW4gb2N0YXZlc1xuXG4jIGNvbnN0YW50c1xuQSA9IE1hdGgucG93KDEwLCBkYkdhaW4gLyA0MClcbmUgPSBNYXRoLmxvZygyKVxudGF1ID0gMiAqIE1hdGguUElcbmJldGEgPSBNYXRoLnNxcnQoMiAqIEEpXG5cbiMgaHlwZXJib2xpYyBzaW4gZnVuY3Rpb25cbnNpbmggPSAoeCkgLT5cbiAgeSA9IE1hdGguZXhwIHhcbiAgKHkgLSAxIC8geSkgLyAyXG5cbm1vZHVsZS5leHBvcnRzID0gLT5cbiAgYTAgPSBhMSA9IGEyID0gYTMgPSBhNCA9IHgxID0geDIgPSB5MSA9IHkyID0gMFxuICBmcmVxID0gb21lZ2EgPSBzbiA9IGFscGhhID0gMFxuICBjcyA9IDFcblxuICBsYXN0Q3V0b2ZmID0gMFxuXG4gIChzYW1wbGUsIGN1dG9mZikgLT5cbiAgICAjIGNhY2hlIGZpbHRlciB2YWx1ZXMgdW50aWwgY3V0b2ZmIGNoYW5nZXNcbiAgICBpZiBjdXRvZmYgIT0gbGFzdEN1dG9mZlxuICBcbiAgICAgIG9sZEN1dG9mZiA9IGN1dG9mZlxuXG4gICAgICBmcmVxID0gY3V0b2ZmICogbWF4RnJlcVxuICAgICAgb21lZ2EgPSB0YXUgKiBmcmVxIC8gc2FtcGxlUmF0ZVxuICAgICAgc24gPSBNYXRoLnNpbiBvbWVnYVxuICAgICAgY3MgPSBNYXRoLmNvcyBvbWVnYVxuICAgICAgYWxwaGEgPSBzbiAqIHNpbmgoZSAvIDIgKiBiYW5kd2lkdGggKiBvbWVnYSAvIHNuKVxuXG4gICAgICBiMCA9ICgxICsgY3MpIC8gMlxuICAgICAgYjEgPSAtKDEgKyBjcylcbiAgICAgIGIyID0gKDEgKyBjcykgLyAyXG4gICAgICBhYTAgPSAxICsgYWxwaGFcbiAgICAgIGFhMSA9IC0yICogY3NcbiAgICAgIGFhMiA9IDEgLSBhbHBoYVxuXG4gICAgICBhMCA9IGIwIC8gYWEwXG4gICAgICBhMSA9IGIxIC8gYWEwXG4gICAgICBhMiA9IGIyIC8gYWEwXG4gICAgICBhMyA9IGFhMSAvIGFhMFxuICAgICAgYTQgPSBhYTIgLyBhYTBcblxuICAgICMgY29tcHV0ZSByZXN1bHRcbiAgICBzID0gTWF0aC5tYXggLTEsIE1hdGgubWluIDEsIHNhbXBsZVxuICAgIHJlc3VsdCA9IGEwICogcyArIGExICogeDEgKyBhMiAqIHgyIC0gYTMgKiB5MSAtIGE0ICogeTJcblxuICAgICMgc2hpZnQgeDEgdG8geDIsIHNhbXBsZSB0byB4MVxuICAgIHgyID0geDFcbiAgICB4MSA9IHNcblxuICAgICMgc2hpZnQgeTEgdG8geTIsIHJlc3VsdCB0byB5MVxuICAgIHkyID0geTFcbiAgICB5MSA9IHJlc3VsdFxuXG4gICAgcmVzdWx0IiwibW9kdWxlLmV4cG9ydHMgPSAoc2FtcGxlRGF0YSwgdHJhbnNwb3NlLCBzYW1wbGVzRWxhcHNlZCwgb2Zmc2V0ID0gMCwgbG9vcEFjdGl2ZSA9IGZhbHNlLCBsb29wUG9pbnQpIC0+XG4gIGkgPSBzYW1wbGVzRWxhcHNlZCAqIE1hdGgucG93IDIsIHRyYW5zcG9zZSAvIDEyXG4gIGkxID0gTWF0aC5mbG9vciBpXG4gIGkxID0gaTEgJSAobG9vcFBvaW50IC0gb2Zmc2V0KSBpZiBsb29wQWN0aXZlXG4gIGkyID0gaTEgKyAxXG4gIGwgPSBpICUgMVxuXG4gIHNhbXBsZURhdGFbb2Zmc2V0ICsgaTFdICogKDEgLSBsKSArIHNhbXBsZURhdGFbb2Zmc2V0ICsgaTJdICogbCIsImkgPSAwXG5tb2R1bGUuZXhwb3J0cyA9ICh2KSAtPlxuICBjb25zb2xlLmxvZyh2KSBpZiBpID09IDBcbiAgaSA9IChpICsgMSkgJSA3MDAwXG4iLCJzYW1wbGVSYXRlID0gNDgwMDBcblxubW9kdWxlLmV4cG9ydHMgPSAtPlxuXG4gIHkxID0geTIgPSB5MyA9IHk0ID0gb2xkeCA9IG9sZHkxID0gb2xkeTIgPSBvbGR5MyA9IDBcbiAgcCA9IGsgPSB0MSA9IHQyID0gciA9IHggPSBudWxsXG5cbiAgKHNhbXBsZSwgY3V0b2ZmLCByZXMpIC0+XG4gICAgZnJlcSA9IDIwICogTWF0aC5wb3cgMTAsIDMgKiBjdXRvZmZcbiAgICBmcmVxID0gZnJlcSAvIHNhbXBsZVJhdGVcbiAgICBwID0gZnJlcSAqICgxLjggLSAoMC44ICogZnJlcSkpXG4gICAgayA9IDIgKiBNYXRoLnNpbihmcmVxICogTWF0aC5QSSAvIDIpIC0gMVxuICAgIHQxID0gKDEgLSBwKSAqIDEuMzg2MjQ5XG4gICAgdDIgPSAxMiArIHQxICogdDFcbiAgICByID0gcmVzICogMC41NyAqICh0MiArIDYgKiB0MSkgLyAodDIgLSA2ICogdDEpXG5cbiAgICB4ID0gc2FtcGxlIC0gciAqIHk0XG5cbiAgICAjIGZvdXIgY2FzY2FkZWQgb25lLXBvbGUgZmlsdGVycyAoYmlsaW5lYXIgdHJhbnNmb3JtKVxuICAgIHkxID0gIHggKiBwICsgb2xkeCAgKiBwIC0gayAqIHkxXG4gICAgeTIgPSB5MSAqIHAgKyBvbGR5MSAqIHAgLSBrICogeTJcbiAgICB5MyA9IHkyICogcCArIG9sZHkyICogcCAtIGsgKiB5M1xuICAgIHk0ID0geTMgKiBwICsgb2xkeTMgKiBwIC0gayAqIHk0XG5cbiAgICAjIGNsaXBwZXIgYmFuZCBsaW1pdGVkIHNpZ21vaWRcbiAgICB5NCAtPSAoeTQgKiB5NCAqIHk0KSAvIDZcblxuICAgIG9sZHggPSB4XG4gICAgb2xkeTEgPSB5MVxuICAgIG9sZHkyID0geTJcbiAgICBvbGR5MyA9IHkzXG5cbiAgICB5NCIsInRhdSA9IE1hdGguUEkgKiAyXG5cbm1vZHVsZS5leHBvcnRzID1cblxuICBzaW5lOiAodGltZSwgZnJlcXVlbmN5KSAtPlxuICAgIE1hdGguc2luIHRpbWUgKiB0YXUgKiBmcmVxdWVuY3lcblxuICBzcXVhcmU6ICh0aW1lLCBmcmVxdWVuY3kpIC0+XG4gICAgaWYgKCh0aW1lICUgKDEgLyBmcmVxdWVuY3kpKSAqIGZyZXF1ZW5jeSkgJSAxID4gMC41IHRoZW4gMSBlbHNlIC0xXG5cbiAgc2F3OiAodGltZSwgZnJlcXVlbmN5KSAtPlxuICAgIDEgLSAyICogKCgodGltZSAlICgxIC8gZnJlcXVlbmN5KSkgKiBmcmVxdWVuY3kpICUgMSlcblxuICBub2lzZTogLT5cbiAgICAyICogTWF0aC5yYW5kb20oKSAtIDEiLCJtb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJpbmdCdWZmZXJcbiAgXG4gIGNvbnN0cnVjdG9yOiAoQG1heExlbmd0aCwgQFR5cGUgPSBGbG9hdDMyQXJyYXksIEBsZW5ndGgpIC0+XG4gICAgQGxlbmd0aCB8fD0gQG1heExlbmd0aFxuICAgIEBhcnJheSA9IG5ldyBAVHlwZSBAbWF4TGVuZ3RoXG4gICAgQHBvcyA9IDBcblxuICByZXNldDogLT5cbiAgICBAYXJyYXkgPSBuZXcgQFR5cGUgQG1heExlbmd0aFxuICAgIHRoaXNcblxuICByZXNpemU6IChAbGVuZ3RoKSAtPlxuICAgIEBwb3MgPSAwIGlmIEBwb3MgPj0gQGxlbmd0aFxuXG4gIHB1c2g6IChlbCkgLT5cbiAgICBAYXJyYXlbQHBvc10gPSBlbFxuICAgIEBwb3MgKz0gMVxuICAgIEBwb3MgPSAwIGlmIEBwb3MgPT0gQGxlbmd0aFxuICAgIHRoaXNcblxuICBmb3JFYWNoOiAoZm4pIC0+XG4gICAgYHZhciBpLCBsZW47XG4gICAgZm9yIChpID0gdGhpcy5wb3MsIGxlbiA9IHRoaXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGZuKHRoaXMuYXJyYXlbaV0sIGkpO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwLCBsZW4gPSB0aGlzLnBvczsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBmbih0aGlzLmFycmF5W2ldLCBpKTtcbiAgICB9YFxuICAgIHRoaXNcblxuICByZWR1Y2U6IChmbiwgbWVtbyA9IDApIC0+XG4gICAgQGZvckVhY2ggKGVsLCBpKSAtPlxuICAgICAgbWVtbyA9IGZuIG1lbW8sIGVsLCBpXG4gICAgbWVtb1xuIiwibW9kdWxlLmV4cG9ydHMgPSAoZGVjYXksIGVsYXBzZWQpIC0+XG4gIGlmIGVsYXBzZWQgPiBkZWNheVxuICAgIDBcbiAgZWxzZVxuICAgIDEgLSBlbGFwc2VkIC8gZGVjYXlcbiIsIkluc3RydW1lbnQgPSByZXF1aXJlICcuL2luc3RydW1lbnQnXG5lbnZlbG9wZSA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9lbnZlbG9wZSdcbmxpbmVhckludGVycG9sYXRvciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9saW5lYXJfaW50ZXJwb2xhdG9yJ1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgRHJ1bVNhbXBsZXIgZXh0ZW5kcyBJbnN0cnVtZW50XG5cbiAgIyBrZWVwIG5vdGVzIGluIGEgbWFwIHtrZXk6IG5vdGVEYXRhfSBpbnN0ZWFkIG9mIHRvIGEgcmluZyBidWZmZXJcbiAgIyB0aGlzIGdpdmVzIHVzIG9uZSBtb25waG9uaWMgdm9pY2UgcGVyIGRydW1cbiAgQGNyZWF0ZVN0YXRlOiAoc3RhdGUsIGluc3RydW1lbnQpIC0+XG4gICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdID0gbm90ZXM6IHt9XG5cbiAgQHNhbXBsZTogKHN0YXRlLCBzYW1wbGVzLCBpbnN0cnVtZW50LCB0aW1lLCBpKSAtPlxuICAgIHJldHVybiAwIGlmIGluc3RydW1lbnQubGV2ZWwgaXMgMFxuICAgIHJldHVybiAwIHVubGVzcyBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0/XG5cbiAgICAjIHN1bSBhbGwgYWN0aXZlIG5vdGVzXG4gICAgaW5zdHJ1bWVudC5sZXZlbCAqIGluc3RydW1lbnQuZHJ1bXMucmVkdWNlKChtZW1vLCBkcnVtKSA9PlxuICAgICAgbm90ZSA9IHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlc1tkcnVtLmtleV1cbiAgICAgIHJldHVybiBtZW1vIHVubGVzcyBub3RlP1xuXG4gICAgICBzYW1wbGVEYXRhID0gc2FtcGxlc1tkcnVtLnNhbXBsZUlkXVxuICAgICAgcmV0dXJuIG1lbW8gdW5sZXNzIHNhbXBsZURhdGE/XG5cbiAgICAgIHNhbXBsZXNFbGFwc2VkID0gaSAtIG5vdGUuaVxuICAgICAgb2Zmc2V0ID0gTWF0aC5mbG9vciBkcnVtLnN0YXJ0ICogc2FtcGxlRGF0YS5sZW5ndGhcbiAgICAgIHJldHVybiBtZW1vIGlmIHNhbXBsZXNFbGFwc2VkICsgb2Zmc2V0ID4gc2FtcGxlRGF0YS5sZW5ndGhcblxuICAgICAgc2FtcGxlID0gbGluZWFySW50ZXJwb2xhdG9yIHNhbXBsZURhdGEsIGRydW0udHJhbnNwb3NlLCBzYW1wbGVzRWxhcHNlZCwgb2Zmc2V0XG4gICAgICBtZW1vICsgZHJ1bS5sZXZlbCAqIGVudmVsb3BlKGRydW0udm9sdW1lRW52LCBub3RlLCB0aW1lKSAqIChzYW1wbGUgb3IgMClcbiAgICAsIDApXG5cbiAgQHRpY2s6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSwgYmVhdCwgYnBzLCBub3Rlc09uLCBub3Rlc09mZikgLT5cbiAgICBAY3JlYXRlU3RhdGUgc3RhdGUsIGluc3RydW1lbnQgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cblxuICAgIG5vdGVzT2ZmLmZvckVhY2ggKHtrZXl9KSAtPlxuICAgICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdLm5vdGVzW2tleV0/LnRpbWVPZmYgPSB0aW1lXG5cbiAgICBub3Rlc09uLmZvckVhY2ggKG5vdGUpID0+XG4gICAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNbbm90ZS5rZXldID0ge3RpbWUsIGl9XG4iLCJJbnN0cnVtZW50ID0gcmVxdWlyZSAnLi9pbnN0cnVtZW50J1xuaGlnaHBhc3NGaWx0ZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvaGlnaHBhc3NfZmlsdGVyJ1xuc2ltcGxlRW52ZWxvcGUgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvc2ltcGxlX2VudmVsb3BlJ1xub3NjaWxsYXRvcnMgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvb3NjaWxsYXRvcnMnXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBEcnVtU3ludGhlc2l6ZXIgZXh0ZW5kcyBJbnN0cnVtZW50XG5cbiAgbWluRnJlcSA9IDYwXG4gIG1heEZyZXEgPSAzMDAwXG4gIGZyZXFTY2FsZSA9IG1heEZyZXEgLSBtaW5GcmVxXG5cbiAgIyBrZWVwIG5vdGVzIGluIGEgbWFwIHtrZXk6IG5vdGVEYXRhfSBpbnN0ZWFkIG9mIGluIGEgcmluZyBidWZmZXJcbiAgIyB0aGlzIGdpdmVzIHVzIG9uZSBtb25waG9uaWMgdm9pY2UgcGVyIGRydW0uXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXSA9XG4gICAgICBub3Rlczoge31cbiAgICAgIGZpbHRlcnM6IChcbiAgICAgICAgaGlnaHBhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLjEyN11cbiAgICAgIClcblxuICBAc2FtcGxlOiAoc3RhdGUsIHNhbXBsZXMsIGluc3RydW1lbnQsIHRpbWUsIGkpIC0+XG4gICAgcmV0dXJuIDAgaWYgaW5zdHJ1bWVudC5sZXZlbCBpcyAwXG4gICAgcmV0dXJuIDAgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cblxuICAgICMgc3VtIGFsbCBhY3RpdmUgbm90ZXNcbiAgICBpbnN0cnVtZW50LmxldmVsICogaW5zdHJ1bWVudC5kcnVtcy5yZWR1Y2UoKG1lbW8sIGRydW0pID0+XG4gICAgICBub3RlID0gc3RhdGVbaW5zdHJ1bWVudC5faWRdLm5vdGVzW2RydW0ua2V5XVxuICAgICAgcmV0dXJuIG1lbW8gdW5sZXNzIG5vdGU/XG5cbiAgICAgIGVsYXBzZWQgPSB0aW1lIC0gbm90ZS50aW1lXG4gICAgICByZXR1cm4gbWVtbyBpZiBlbGFwc2VkID4gZHJ1bS5kZWNheVxuXG4gICAgICBlbnYgPSBzaW1wbGVFbnZlbG9wZSBkcnVtLmRlY2F5LCBlbGFwc2VkXG4gICAgICBmcmVxID0gbWluRnJlcSArIGRydW0ucGl0Y2ggKiBmcmVxU2NhbGVcblxuICAgICAgIyBhcHBseSBwaXRjaCBiZW5kXG4gICAgICBpZiBkcnVtLmJlbmRcbiAgICAgICAgZnJlcSA9ICgyIC0gZHJ1bS5iZW5kICsgZHJ1bS5iZW5kICogZW52KSAvIDIgKiBmcmVxXG5cbiAgICAgICMgYXBwbHkgZm1cbiAgICAgIGlmIGRydW0uZm0gPiAwXG4gICAgICAgIHNpZ25hbCA9IG9zY2lsbGF0b3JzLnNpbmUgZWxhcHNlZCwgbWluRnJlcSArIGRydW0uZm1GcmVxICogZnJlcVNjYWxlXG4gICAgICAgIGZyZXEgKz0gZHJ1bS5mbSAqIHNpZ25hbCAqIHNpbXBsZUVudmVsb3BlKGRydW0uZm1EZWNheSArIDAuMDEsIGVsYXBzZWQpXG5cbiAgICAgICMgc3VtIG5vaXNlIGFuZCBvc2NpbGxhdG9yXG4gICAgICBzYW1wbGUgPSAoXG4gICAgICAgICgxIC0gZHJ1bS5ub2lzZSkgKiBvc2NpbGxhdG9ycy5zaW5lKGVsYXBzZWQsIGZyZXEpICtcbiAgICAgICAgZHJ1bS5ub2lzZSAqIG9zY2lsbGF0b3JzLm5vaXNlKClcbiAgICAgIClcblxuICAgICAgIyBhcHBseSBoaWdocGFzc1xuICAgICAgaWYgZHJ1bS5ocCA+IDBcbiAgICAgICAgc2FtcGxlID0gc3RhdGVbaW5zdHJ1bWVudC5faWRdLmZpbHRlcnNbZHJ1bS5rZXldIHNhbXBsZSwgZHJ1bS5ocFxuXG4gICAgICBtZW1vICsgZHJ1bS5sZXZlbCAqIGVudiAqIHNhbXBsZVxuXG4gICAgLCAwKVxuXG5cbiAgQHRpY2s6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSwgYmVhdCwgYnBzLCBub3Rlc09uLCBub3Rlc09mZikgLT5cbiAgICBAY3JlYXRlU3RhdGUgc3RhdGUsIGluc3RydW1lbnQgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cblxuICAgIG5vdGVzT24uZm9yRWFjaCAobm90ZSkgPT5cbiAgICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlc1tub3RlLmtleV0gPSB7dGltZSwgaX1cblxuIiwiUmluZ0J1ZmZlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9yaW5nX2J1ZmZlcidcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEluc3RydW1lbnRcblxuICBAY3JlYXRlU3RhdGU6IChzdGF0ZSwgaW5zdHJ1bWVudCkgLT5cbiAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0gPVxuICAgICAgbm90ZXM6IG5ldyBSaW5nQnVmZmVyIGluc3RydW1lbnQubWF4UG9seXBob255LCBBcnJheSwgaW5zdHJ1bWVudC5wb2x5cGhvbnlcbiAgICAgIG5vdGVNYXA6IHt9XG5cbiAgQHJlbGVhc2VTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIGRlbGV0ZSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF1cblxuICBAc2FtcGxlOiAoc3RhdGUsIHNhbXBsZXMsIGluc3RydW1lbnQsIHRpbWUsIGkpIC0+XG4gICAgMFxuXG4gIEB0aWNrOiAoc3RhdGUsIGluc3RydW1lbnQsIHRpbWUsIGksIGJlYXQsIGJwcywgbm90ZXNPbiwgbm90ZXNPZmYpIC0+XG4gICAgQGNyZWF0ZVN0YXRlIHN0YXRlLCBpbnN0cnVtZW50IHVubGVzcyBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0/XG4gICAgaW5zdHJ1bWVudFN0YXRlID0gc3RhdGVbaW5zdHJ1bWVudC5faWRdXG5cbiAgICBpZiBpbnN0cnVtZW50LnBvbHlwaG9ueSAhPSBpbnN0cnVtZW50U3RhdGUubm90ZXMubGVuZ3RoXG4gICAgICBpbnN0cnVtZW50U3RhdGUubm90ZXMucmVzaXplIGluc3RydW1lbnQucG9seXBob255XG5cbiAgICBub3Rlc09mZi5mb3JFYWNoICh7a2V5fSkgLT5cbiAgICAgICMgY29uc29sZS5sb2cgJ25vdGUgb2ZmICcgKyBrZXlcbiAgICAgIGluc3RydW1lbnRTdGF0ZS5ub3RlTWFwW2tleV0/LnRpbWVPZmYgPSB0aW1lXG5cbiAgICBub3Rlc09uLmZvckVhY2ggKHtrZXl9KSAtPlxuICAgICAgIyBjb25zb2xlLmxvZyAnbm90ZSBvbiAnICsga2V5XG4gICAgICBpbnN0cnVtZW50U3RhdGUubm90ZU1hcFtrZXldID0ge3RpbWUsIGksIGtleX1cbiAgICAgIGluc3RydW1lbnRTdGF0ZS5ub3Rlcy5wdXNoIGluc3RydW1lbnRTdGF0ZS5ub3RlTWFwW2tleV1cblxuIiwiSW5zdHJ1bWVudCA9IHJlcXVpcmUgJy4vaW5zdHJ1bWVudCdcblJpbmdCdWZmZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvcmluZ19idWZmZXInXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBMb29wU2FtcGxlciBleHRlbmRzIEluc3RydW1lbnRcbiIsIlRyYWNrID0gcmVxdWlyZSAnLi90cmFjaydcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTb25nXG5cbiAgIyBudW1iZXIgb2Ygc2FtcGxlcyB0byBwcm9jZXNzIGJldHdlZW4gdGlja3NcbiAgY2xvY2tSYXRpbyA9IDExMFxuXG4gICMgcmF0ZSBhdCB3aGljaCBsZXZlbCBtZXRlcnMgZGVjYXlcbiAgbWV0ZXJEZWNheSA9IDAuMDVcblxuICBjbGlwID0gKHNhbXBsZSkgLT5cbiAgICBNYXRoLm1heCgwLCBNYXRoLm1pbigyLCBzYW1wbGUgKyAxKSkgLSAxXG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQGxhc3RCZWF0ID0gMFxuXG4gICAgIyBrZWVwIG11dGFibGUgc3RhdGUgZm9yIGF1ZGlvIHBsYXliYWNrIGhlcmUgLSB0aGlzIHdpbGwgc3RvcmUgdGhpbmdzIGxpa2VcbiAgICAjIGZpbHRlciBtZW1vcnkgYW5kIG1ldGVyIGxldmVscyB0aGF0IG5lZWQgdG8gc3RheSBvdXRzaWRlIHRoZSBub3JtYWwgY3Vyc29yXG4gICAgIyBzdHJ1Y3R1cmUgZm9yIHBlcmZvcm1hbmNlIHJlYXNvbnNcbiAgICBAc3RhdGUgPSB7fVxuXG4gICAgIyBrZWVwIGEgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IHNvbmcgZG9jdW1lbnRcbiAgICBAc29uZyA9IG51bGxcblxuICAgICMga2VlcCByZWZlcmVuY2VzIHRvIHRoZSBjdXJyZW50bHkgdXNlZCBzYW1wbGVzXG4gICAgQHNhbXBsZXMgPSB7fVxuXG4gICAgIyBrZWVwIGEgbGlzdCBvZiB1bnByb2Nlc3NlZCBtaWRpIG1lc3NhZ2VzXG4gICAgQG1pZGlNZXNzYWdlcyA9IFtdXG5cbiAgdXBkYXRlOiAoc3RhdGUpIC0+XG4gICAgQHNvbmcgPSBzdGF0ZVxuXG4gIG1pZGk6IChtZXNzYWdlKSAtPlxuICAgIEBtaWRpTWVzc2FnZXMucHVzaCBtZXNzYWdlXG5cbiAgIyBmaWxsIGEgYnVmZmVyIGZ1bmN0aW9uXG4gIGJ1ZmZlcjogKHNpemUsIGluZGV4LCBzYW1wbGVSYXRlKSAtPlxuICAgIGFyciA9IG5ldyBGbG9hdDMyQXJyYXkgc2l6ZVxuXG4gICAgaWYgQHNvbmc/XG4gICAgICBmb3IgaSBpbiBbMC4uLnNpemVdXG4gICAgICAgIGlpID0gaW5kZXggKyBpXG4gICAgICAgIHQgPSBpaSAvIHNhbXBsZVJhdGVcbiAgICAgICAgYXJyW2ldID0gQHNhbXBsZSB0LCBpaVxuXG4gICAgYXJyLmJ1ZmZlclxuXG4gICMgY2FsbGVkIGZvciBldmVyeSBzYW1wbGUgb2YgYXVkaW9cbiAgc2FtcGxlOiAodGltZSwgaSkgPT5cbiAgICBAdGljayB0aW1lLCBpIGlmIGkgJSBjbG9ja1JhdGlvIGlzIDBcblxuICAgIGNsaXAgQHNvbmcubGV2ZWwgKiBAc29uZy50cmFja3MucmVkdWNlKChtZW1vLCB0cmFjaykgPT5cbiAgICAgIG1lbW8gKyBUcmFjay5zYW1wbGUgQHN0YXRlLCBAc2FtcGxlcywgdHJhY2ssIHRpbWUsIGlcbiAgICAsIDApXG5cbiAgIyBjYWxsZWQgZm9yIGV2ZXJ5IGNsb2NrUmF0aW8gc2FtcGxlc1xuICB0aWNrOiAodGltZSwgaSkgPT5cbiAgICBicHMgPSBAc29uZy5icG0gLyA2MFxuICAgIGJlYXQgPSB0aW1lICogYnBzXG5cbiAgICBAc29uZy50cmFja3MuZm9yRWFjaCAodHJhY2ssIGluZGV4KSA9PlxuXG4gICAgICAjIGZvciBub3cgc2VuZCBtaWRpIG9ubHkgdG8gdGhlIGZpcnN0IHRyYWNrIC0gaW4gdGhlIGZ1dHVyZSB3ZSBzaG91bGRcbiAgICAgICMgYWxsb3cgdHJhY2tzIHRvIGJlIGFybWVkIGZvciByZWNvcmRpbmdcbiAgICAgIG1pZGlNZXNzYWdlcyA9IGlmIGluZGV4IGlzIEBzb25nLnNlbGVjdGVkVHJhY2sgdGhlbiBAbWlkaU1lc3NhZ2VzIGVsc2UgbnVsbFxuXG4gICAgICBUcmFjay50aWNrIEBzdGF0ZSwgdHJhY2ssIG1pZGlNZXNzYWdlcywgdGltZSwgaSwgYmVhdCwgQGxhc3RCZWF0LCBicHNcblxuICAgIEBsYXN0QmVhdCA9IGJlYXRcblxuICAjIHN0b3JlIHNhbXBsZSBkYXRhIGZvciBhIG5ldyBzYW1wbGVcbiAgYWRkU2FtcGxlOiAoaWQsIHNhbXBsZURhdGEpIC0+XG4gICAgQHNhbXBsZXNbaWRdID0gc2FtcGxlRGF0YVxuXG4gICMgcmVsZWFzZSBkYXRhIGZvciBhIHNhbXBsZVxuICByZW1vdmVTYW1wbGU6IChpZCkgLT5cbiAgICBkZWxldGUgQHNhbXBsZXNbaWRdXG5cbiAgIyByZWxlYXNlIGRhdGEgZm9yIGFsbCBzYW1wbGVzXG4gIGNsZWFyU2FtcGxlczogLT5cbiAgICBAc2FtcGxlcyA9IHt9XG5cbiAgIyBjYWxsZWQgcGVyaW9kaWNhbGx5IHRvIHBhc3MgaGlnaCBmcmVxdWVuY3kgZGF0YSB0byB0aGUgdWkuLiB0aGlzIHNob3VsZFxuICAjIGV2ZW50dWFsbHkgYmUgdXBkYXRlZCB0byBiYXNlIHRoZSBhbW91bnQgb2YgZGVjYXkgb24gdGhlIGFjdHVhbCBlbHBhc2VkIHRpbWVcbiAgcHJvY2Vzc0ZyYW1lOiAtPlxuICAgIGlmIEBzb25nPy50cmFja3M/XG4gICAgICAjIGFwcGx5IGRlY2F5IHRvIG1ldGVyIGxldmVsc1xuICAgICAgZm9yIHRyYWNrIGluIEBzb25nLnRyYWNrc1xuICAgICAgICBpZiBAc3RhdGVbdHJhY2suX2lkXT9cbiAgICAgICAgICBAc3RhdGVbdHJhY2suX2lkXS5tZXRlckxldmVsIC09IG1ldGVyRGVjYXlcblxuICAjIGdldCBhIHNlbmRhYmxlIHZlcnNpb24gb2YgY3VycmVudCBzb25nIHBsYXliYWNrIHN0YXRlXG4gIGdldFN0YXRlOiAtPlxuICAgIG1ldGVyTGV2ZWxzOiBAc29uZz8udHJhY2tzPy5yZWR1Y2UoKG1lbW8sIHRyYWNrKSA9PlxuICAgICAgbWVtb1t0cmFjay5faWRdID0gQHN0YXRlW3RyYWNrLl9pZF0/Lm1ldGVyTGV2ZWxcbiAgICAgIG1lbW9cbiAgICAsIHt9KVxuIiwiaW5zdHJ1bWVudFR5cGVzID1cbiAgQW5hbG9nU3ludGhlc2l6ZXI6IHJlcXVpcmUgJy4vYW5hbG9nX3N5bnRoZXNpemVyJ1xuICBCYXNpY1NhbXBsZXI6IHJlcXVpcmUgJy4vYmFzaWNfc2FtcGxlcidcbiAgRHJ1bVNhbXBsZXI6IHJlcXVpcmUgJy4vZHJ1bV9zYW1wbGVyJ1xuICBEcnVtU3ludGhlc2l6ZXI6IHJlcXVpcmUgJy4vZHJ1bV9zeW50aGVzaXplcidcbiAgTG9vcFNhbXBsZXI6IHJlcXVpcmUgJy4vbG9vcF9zYW1wbGVyJ1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVHJhY2tcblxuICBAY3JlYXRlU3RhdGU6IChzdGF0ZSwgdHJhY2spIC0+XG4gICAgc3RhdGVbdHJhY2suX2lkXSA9XG4gICAgICBtZXRlckxldmVsOiAwXG5cbiAgQHJlbGVhc2VTdGF0ZTogKHN0YXRlLCB0cmFjaykgLT5cbiAgICBkZWxldGUgc3RhdGVbdHJhY2suX2lkXVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgc2FtcGxlcywgdHJhY2ssIHRpbWUsIGkpIC0+XG4gICAgIyBnZXQgaW5zdHJ1bWVudCBvdXRwdXRcbiAgICBJbnN0cnVtZW50ID0gaW5zdHJ1bWVudFR5cGVzW3RyYWNrLmluc3RydW1lbnQuX3R5cGVdXG4gICAgc2FtcGxlID0gSW5zdHJ1bWVudC5zYW1wbGUgc3RhdGUsIHNhbXBsZXMsIHRyYWNrLmluc3RydW1lbnQsIHRpbWUsIGlcblxuICAgICMgYXBwbHkgZWZmZWN0c1xuICAgIHNhbXBsZSA9IHRyYWNrLmVmZmVjdHMucmVkdWNlKChzYW1wbGUsIGVmZmVjdCkgLT5cbiAgICAgIEVmZmVjdC5zYW1wbGUgc3RhdGUsIGVmZmVjdCwgdGltZSwgaSwgc2FtcGxlXG4gICAgLCBzYW1wbGUpXG5cbiAgICAjIHVwZGF0ZSBtZXRlciBsZXZlbHNcbiAgICBpZiB0cmFja1N0YXRlID0gc3RhdGVbdHJhY2suX2lkXVxuICAgICAgbGV2ZWwgPSB0cmFja1N0YXRlLm1ldGVyTGV2ZWxcbiAgICAgIGlmIG5vdCBsZXZlbD8gb3IgaXNOYU4obGV2ZWwpIG9yIHNhbXBsZSA+IGxldmVsXG4gICAgICAgIHRyYWNrU3RhdGUubWV0ZXJMZXZlbCA9IHNhbXBsZVxuXG4gICAgc2FtcGxlXG5cbiAgQHRpY2s6IChzdGF0ZSwgdHJhY2ssIG1pZGlNZXNzYWdlcywgdGltZSwgaSwgYmVhdCwgbGFzdEJlYXQsIGJwcykgLT5cbiAgICBAY3JlYXRlU3RhdGUgc3RhdGUsIHRyYWNrIHVubGVzcyBzdGF0ZVt0cmFjay5faWRdP1xuXG4gICAgSW5zdHJ1bWVudCA9IGluc3RydW1lbnRUeXBlc1t0cmFjay5pbnN0cnVtZW50Ll90eXBlXVxuXG4gICAgIyBnZXQgbm90ZXMgb24gZnJvbSBzZXF1ZW5jZVxuICAgIHtub3Rlc09uLCBub3Rlc09mZn0gPSBAbm90ZXMgdHJhY2suc2VxdWVuY2UsIG1pZGlNZXNzYWdlcywgdGltZSwgYmVhdCwgbGFzdEJlYXRcblxuICAgIEluc3RydW1lbnQudGljayBzdGF0ZSwgdHJhY2suaW5zdHJ1bWVudCwgdGltZSwgaSwgYmVhdCwgYnBzLCBub3Rlc09uLCBub3Rlc09mZlxuICAgIHRyYWNrLmVmZmVjdHMuZm9yRWFjaCAoZSkgLT4gZS50aWNrIHN0YXRlLCB0aW1lLCBiZWF0LCBicHNcblxuICAjIGxvb2sgYXQgc2VxdWVuY2UgYW5kIG1pZGkgbWVzc2FnZXMsIHJldHVybiBhcnJheXMgb2Ygbm90ZXMgb24gYW5kIG9mZlxuICAjIG9jY3VycmluZyBpbiB0aGlzIHRpY2tcbiAgQG5vdGVzOiAoc2VxdWVuY2UsIG1pZGlNZXNzYWdlcywgdGltZSwgYmVhdCwgbGFzdEJlYXQpIC0+XG4gICAgYmFyID0gTWF0aC5mbG9vciBiZWF0IC8gc2VxdWVuY2UubG9vcFNpemVcbiAgICBsYXN0QmFyID0gTWF0aC5mbG9vciBsYXN0QmVhdCAvIHNlcXVlbmNlLmxvb3BTaXplXG4gICAgYmVhdCA9IGJlYXQgJSBzZXF1ZW5jZS5sb29wU2l6ZVxuICAgIGxhc3RCZWF0ID0gbGFzdEJlYXQgJSBzZXF1ZW5jZS5sb29wU2l6ZVxuXG4gICAgbm90ZXNPbiA9IFtdXG4gICAgbm90ZXNPZmYgPSBbXVxuXG4gICAgZm9yIGlkLCBub3RlIG9mIHNlcXVlbmNlLm5vdGVzXG4gICAgICBzdGFydCA9IG5vdGUuc3RhcnRcbiAgICAgIGVuZCA9IG5vdGUuc3RhcnQgKyBub3RlLmxlbmd0aFxuXG4gICAgICAjIGNhdGNoIG5vdGVzIG9uXG4gICAgICBpZiBzdGFydCA8IGJlYXQgYW5kIChzdGFydCA+PSBsYXN0QmVhdCBvciBiYXIgPiBsYXN0QmFyKVxuICAgICAgICBub3Rlc09uLnB1c2gge2tleTogbm90ZS5rZXl9XG5cbiAgICAgICMgY2F0Y2ggbm90ZXMgb2ZmXG4gICAgICBpZiBlbmQgPCBiZWF0IGFuZCAoZW5kID49IGxhc3RCZWF0IG9yIGJhciA+IGxhc3RCYXIpXG4gICAgICAgIG5vdGVzT2ZmLnB1c2gge2tleTogbm90ZS5rZXl9XG5cbiAgICAgICMgY2F0Y2ggbm90ZXMgb2ZmIGZvciBub3RlcyBlbmRpbmcgZXh0YWN0bHkgYXQgdGhlIGVuZCBvZiBhIGJhclxuICAgICAgZWxzZSBpZiBiYXIgPiBsYXN0QmFyIGFuZCBlbmQgPT0gc2VxdWVuY2UubG9vcFNpemVcbiAgICAgICAgbm90ZXNPZmYucHVzaCB7a2V5OiBub3RlLmtleX1cblxuICAgIGlmIG1pZGlNZXNzYWdlcz9cbiAgICAgIG1pZGlNZXNzYWdlcy5mb3JFYWNoIChtZXNzYWdlLCBpKSAtPlxuICAgICAgICBpZiBtZXNzYWdlLnRpbWUgPCB0aW1lXG4gICAgICAgICAgbWlkaU1lc3NhZ2VzLnNwbGljZSBpLCAxXG4gICAgICAgICAgc3dpdGNoIG1lc3NhZ2UudHlwZVxuICAgICAgICAgICAgd2hlbiAnb24nXG4gICAgICAgICAgICAgIG5vdGVzT24ucHVzaCBrZXk6IG1lc3NhZ2Uua2V5XG4gICAgICAgICAgICB3aGVuICdvZmYnXG4gICAgICAgICAgICAgIG5vdGVzT2ZmLnB1c2gga2V5OiBtZXNzYWdlLmtleVxuXG4gICAge25vdGVzT24sIG5vdGVzT2ZmfVxuIl19
