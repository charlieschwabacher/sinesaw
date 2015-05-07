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
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Instrument = require('./instrument');

RingBuffer = require('./components/ring_buffer');

lowpassFilter = require('./components/lowpass_filter');

highpassFilter = require('./components/highpass_filter');

envelope = require('./components/envelope');

oscillators = require('./components/oscillators');

module.exports = AnalogSynthesizer = (function(_super) {
  var frequency, tune;

  __extends(AnalogSynthesizer, _super);

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
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = instrument.maxPolyphony; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(lowpassFilter());
        }
        return _results;
      })(),
      HP: (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = instrument.maxPolyphony; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(highpassFilter());
        }
        return _results;
      })(),
      none: (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = instrument.maxPolyphony; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(function(sample) {
            return sample;
          });
        }
        return _results;
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
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Instrument = require('./instrument');

RingBuffer = require('./components/ring_buffer');

linearInterpolator = require('./components/linear_interpolator');

lowpassFilter = require('./components/lowpass_filter');

highpassFilter = require('./components/highpass_filter');

envelope = require('./components/envelope');

module.exports = BasicSampler = (function(_super) {
  __extends(BasicSampler, _super);

  function BasicSampler() {
    return BasicSampler.__super__.constructor.apply(this, arguments);
  }

  BasicSampler.createState = function(state, instrument) {
    var i;
    BasicSampler.__super__.constructor.createState.call(this, state, instrument);
    return state[instrument._id].filters = {
      LP: (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = instrument.maxPolyphony; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(lowpassFilter());
        }
        return _results;
      })(),
      HP: (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = instrument.maxPolyphony; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(highpassFilter());
        }
        return _results;
      })(),
      none: (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = instrument.maxPolyphony; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(function(sample) {
            return sample;
          });
        }
        return _results;
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
  var i, s, _i, _ref, _results;
  _results = [];
  for (i = _i = 0, _ref = input.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
    s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    output.setInt16(offset, s, true);
    _results.push(offset += 2);
  }
  return _results;
};

writeString = function(view, offset, string) {
  var i, _i, _ref, _results;
  _results = [];
  for (i = _i = 0, _ref = string.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
    _results.push(view.setUint8(offset + i, string.charCodeAt(i)));
  }
  return _results;
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
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Instrument = require('./instrument');

envelope = require('./components/envelope');

linearInterpolator = require('./components/linear_interpolator');

module.exports = DrumSampler = (function(_super) {
  __extends(DrumSampler, _super);

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
    notesOff.forEach(function(_arg) {
      var key, _ref;
      key = _arg.key;
      return (_ref = state[instrument._id].notes[key]) != null ? _ref.timeOff = time : void 0;
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
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Instrument = require('./instrument');

highpassFilter = require('./components/highpass_filter');

simpleEnvelope = require('./components/simple_envelope');

oscillators = require('./components/oscillators');

module.exports = DrumSynthesizer = (function(_super) {
  var freqScale, maxFreq, minFreq;

  __extends(DrumSynthesizer, _super);

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
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i < 127; i = ++_i) {
          _results.push(highpassFilter());
        }
        return _results;
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
    notesOff.forEach(function(_arg) {
      var key, _ref;
      key = _arg.key;
      return (_ref = instrumentState.noteMap[key]) != null ? _ref.timeOff = time : void 0;
    });
    return notesOn.forEach(function(_arg) {
      var key;
      key = _arg.key;
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
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Instrument = require('./instrument');

RingBuffer = require('./components/ring_buffer');

module.exports = LoopSampler = (function(_super) {
  __extends(LoopSampler, _super);

  function LoopSampler() {
    return LoopSampler.__super__.constructor.apply(this, arguments);
  }

  return LoopSampler;

})(Instrument);



},{"./components/ring_buffer":11,"./instrument":15}],17:[function(require,module,exports){
var Song, Track,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Track = require('./track');

module.exports = Song = (function() {
  var clip, clockRatio, meterDecay;

  clockRatio = 110;

  meterDecay = 0.05;

  clip = function(sample) {
    return Math.max(0, Math.min(2, sample + 1)) - 1;
  };

  function Song() {
    this.tick = __bind(this.tick, this);
    this.sample = __bind(this.sample, this);
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
    var arr, i, ii, t, _i;
    arr = new Float32Array(size);
    if (this.song != null) {
      for (i = _i = 0; 0 <= size ? _i < size : _i > size; i = 0 <= size ? ++_i : --_i) {
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
    var track, _i, _len, _ref, _ref1, _results;
    if (((_ref = this.song) != null ? _ref.tracks : void 0) != null) {
      _ref1 = this.song.tracks;
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        track = _ref1[_i];
        if (this.state[track._id] != null) {
          _results.push(this.state[track._id].meterLevel -= meterDecay);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  };

  Song.prototype.getState = function() {
    var _ref, _ref1;
    return {
      meterLevels: (_ref = this.song) != null ? (_ref1 = _ref.tracks) != null ? _ref1.reduce((function(_this) {
        return function(memo, track) {
          var _ref2;
          memo[track._id] = (_ref2 = _this.state[track._id]) != null ? _ref2.meterLevel : void 0;
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
    var Instrument, notesOff, notesOn, _ref;
    if (state[track._id] == null) {
      this.createState(state, track);
    }
    Instrument = instrumentTypes[track.instrument._type];
    _ref = this.notes(track.sequence, midiMessages, time, beat, lastBeat), notesOn = _ref.notesOn, notesOff = _ref.notesOff;
    Instrument.tick(state, track.instrument, time, i, beat, bps, notesOn, notesOff);
    return track.effects.forEach(function(e) {
      return e.tick(state, time, beat, bps);
    });
  };

  Track.notes = function(sequence, midiMessages, time, beat, lastBeat) {
    var bar, end, id, lastBar, note, notesOff, notesOn, start, _ref;
    bar = Math.floor(beat / sequence.loopSize);
    lastBar = Math.floor(lastBeat / sequence.loopSize);
    beat = beat % sequence.loopSize;
    lastBeat = lastBeat % sequence.loopSize;
    notesOn = [];
    notesOff = [];
    _ref = sequence.notes;
    for (id in _ref) {
      note = _ref[id];
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



<<<<<<< HEAD
},{"./analog_synthesizer":2,"./basic_sampler":3,"./drum_sampler":13,"./drum_synthesizer":14,"./loop_sampler":16}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2FuYWxvZ19zeW50aGVzaXplci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvYmFzaWNfc2FtcGxlci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9lbmNvZGVfd2F2LmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL2VudmVsb3BlLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL2hpZ2hwYXNzX2ZpbHRlci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9saW5lYXJfaW50ZXJwb2xhdG9yLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL2xvZ19zYW1wbGUuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvbG93cGFzc19maWx0ZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvb3NjaWxsYXRvcnMuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvcmluZ19idWZmZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvc2ltcGxlX2VudmVsb3BlLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9kcnVtX3NhbXBsZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2RydW1fc3ludGhlc2l6ZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2luc3RydW1lbnQuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2xvb3Bfc2FtcGxlci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3Avc29uZy5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvdHJhY2suY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDWUEsSUFBQSxlQUFBOztBQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsbUJBQVIsQ0FBUCxDQUFBOztBQUFBLFNBQ0EsR0FBWSxPQUFBLENBQVEsNkJBQVIsQ0FEWixDQUFBOztBQUFBLElBR0ksQ0FBQyxJQUFMLEdBQVksR0FBQSxDQUFBLElBSFosQ0FBQTs7QUFBQSxJQUtJLENBQUMsU0FBTCxHQUFpQixPQUFBLENBQVEsNkJBQVIsQ0FMakIsQ0FBQTs7QUFBQSxJQVFJLENB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QUVJLE9BQU8sQ0FBQyxJQUFSLENBQWE7QUFBQSxnQkFBQSxHQUFBLEVBQUssT0FBTyxDQUFDLEdBQWI7ZUFBYixFQUZKO0FBQUEsaUJBR08sS0FIUDtxQkFJSSxRQUFRLENBQUMsSUFBVCxDQUFjO0FBQUEsZ0JBQUEsR0FBQSxFQUFLLE9BQU8sQ0FBQyxHQUFiO2VBQWQsRUFKSjtBQUFBLFdBRkY7U0FEbUI7TUFBQSxDQUFyQixDQUFBLENBREY7S0F4QkE7V0FrQ0E7QUFBQSxNQUFDLFNBQUEsT0FBRDtBQUFBLE1BQVUsVUFBQSxRQUFWO01BbkNNO0VBQUEsQ0F0Q1IsQ0FBQTs7ZUFBQTs7SUFWRixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiMgdGhpcyBzY3JpcHQgaXMgcnVuIGluc2lkZSBhIHdvcmtlciBpbiBvcmRlciB0byBkbyBhdWRpbyBwcm9jZXNzaW5nIG91dHNpZGUgb2ZcbiMgdGhlIG1haW4gdWkgdGhyZWFkLlxuI1xuIyBUaGUgd29ya2VyIHJlY2VpdmVzIHRocmVlIHR5cGVzIG9mIG1lc3NhZ2VzIC0gJ3VwZGF0ZScgdy8ge3N0YXRlfSBjb250YWluaW5nXG4jIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzb25nLCAnbWlkaScgdy8ge21lc3NhZ2V9IGNvbnRhaW5pbmcgaW5jb21pbmcgbm90ZU9uXG4jIGFuZCBub3RlT2ZmIG1lc3NhZ2VzLCBhbmQgJ2J1ZmZlcicgdy8ge3NpemUsIGluZGV4LCBzYW1wbGVSYXRlfSByZXF1ZXN0aW5nXG4jIGEgYnVmZmVyIHRvIGJlIGZpbGxlZCBhbmQgc2VudCBiYWNrLlxuI1xuIyBJdCBhbHNvIHNlbmRzIHR3byB0eXBlcyBvZiBtZXNzYWdlcyAtICdmcmFtZScgbWVzc2FnZXMgYXQgNjBoeiBjb250YWluaW5nIHRoZVxuIyBjdXJyZW50IHBsYXliYWNrIHN0YXRlIGFzIHtmcmFtZX0sIGFuZCBzZW5kcyAnYnVmZmVyJyBtZXNzYWdlcyB0cmFuc2ZlcnJpbmdcbiMgZmlsbGVkIEFycmF5QnVmZmVycyBpbiByZXNwb25zZSB0byAnYnVmZmVyJyByZXF1ZXN0cy5cblxuU29uZyA9IHJlcXVpcmUgJy4vZHNwL3NvbmcuY29mZmVlJ1xuZW5jb2RlV2F2ID0gcmVxdWlyZSAnLi9kc3AvY29tcG9uZW50cy9lbmNvZGVfd2F2J1xuXG5zZWxmLnNvbmcgPSBuZXcgU29uZ1xuXG5zZWxmLmxvZ1NhbXBsZSA9IHJlcXVpcmUgJy4vZHNwL2NvbXBvbmVudHMvbG9nX3NhbXBsZSdcblxuIyByZXNwb25kIHRvIG1lc3NhZ2VzIGZyb20gcGFyZW50IHRocmVhZFxuc2VsZi5vbm1lc3NhZ2UgPSAoZSkgLT5cbiAgc3dpdGNoIGUuZGF0YS50eXBlXG4gICAgd2hlbiAnYnVmZmVyJ1xuICAgICAgYnVmZmVyID0gc29uZy5idWZmZXIgZS5kYXRhLnNpemUsIGUuZGF0YS5pbmRleCwgZS5kYXRhLnNhbXBsZVJhdGVcbiAgICAgIHBvc3RNZXNzYWdlXG4gICAgICAgIHR5cGU6ICdidWZmZXInXG4gICAgICAgIGJ1ZmZlcjogYnVmZmVyXG4gICAgICAsIFtidWZmZXJdXG4gICAgd2hlbiAnYm91bmNlJ1xuICAgICAgYnVmZmVyID0gc29uZy5idWZmZXIgZS5kYXRhLnNpemUsIGUuZGF0YS5pbmRleCwgZS5kYXRhLnNhbXBsZVJhdGVcbiAgICAgIHdhdiA9IGVuY29kZVdhdiBidWZmZXIsIDEsIGUuZGF0YS5zYW1wbGVSYXRlXG4gICAgICBwb3N0TWVzc2FnZVxuICAgICAgICB0eXBlOiAnYm91bmNlJ1xuICAgICAgICB3YXY6IHdhdlxuICAgICAgLCBbd2F2XVxuICAgIHdoZW4gJ3VwZGF0ZSdcbiAgICAgIHNvbmcudXBkYXRlIGUuZGF0YS5zdGF0ZVxuICAgIHdoZW4gJ21pZGknXG4gICAgICBzb25nLm1pZGkgZS5kYXRhLm1lc3NhZ2VcbiAgICB3aGVuICdhZGRTYW1wbGUnXG4gICAgICBzb25nLmFkZFNhbXBsZSBlLmRhdGEuaWQsIGUuZGF0YS5zYW1wbGVEYXRhXG4gICAgd2hlbiAncmVtb3ZlU2FtcGxlJ1xuICAgICAgc29uZy5yZW1vdmVTYW1wbGUgZS5kYXRhLmlkXG4gICAgd2hlbiAnY2xlYXJTYW1wbGVzJ1xuICAgICAgc29uZy5jbGVhclNhbXBsZXMoKVxuXG4jIHRyaWdnZXIgcHJvY2Vzc2luZyBvbiBzb25nIGF0IGZyYW1lIHJhdGUgYW5kIHNlbmQgdXBkYXRlcyB0byB0aGUgcGFyZW50IHRocmVhZFxuc2V0SW50ZXJ2YWwgLT5cbiAgc29uZy5wcm9jZXNzRnJhbWUoKVxuICBwb3N0TWVzc2FnZVxuICAgIHR5cGU6ICdmcmFtZSdcbiAgICBmcmFtZTogc29uZy5nZXRTdGF0ZSgpXG4sIDEwMDAgLyA2MFxuIiwiSW5zdHJ1bWVudCA9IHJlcXVpcmUgJy4vaW5zdHJ1bWVudCdcblJpbmdCdWZmZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvcmluZ19idWZmZXInXG5sb3dwYXNzRmlsdGVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2xvd3Bhc3NfZmlsdGVyJ1xuaGlnaHBhc3NGaWx0ZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvaGlnaHBhc3NfZmlsdGVyJ1xuZW52ZWxvcGUgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvZW52ZWxvcGUnXG5vc2NpbGxhdG9ycyA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9vc2NpbGxhdG9ycydcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEFuYWxvZ1N5bnRoZXNpemVyIGV4dGVuZHMgSW5zdHJ1bWVudFxuXG4gIHR1bmUgPSA0NDBcbiAgZnJlcXVlbmN5ID0gKGtleSkgLT5cbiAgICB0dW5lICogTWF0aC5wb3cgMiwgKGtleSAtIDY5KSAvIDEyXG5cbiAgQGNyZWF0ZVN0YXRlOiAoc3RhdGUsIGluc3RydW1lbnQpIC0+XG4gICAgc3VwZXIgc3RhdGUsIGluc3RydW1lbnRcblxuICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXS5maWx0ZXJzID1cbiAgICAgIExQOiAobG93cGFzc0ZpbHRlcigpIGZvciBpIGluIFswLi4uaW5zdHJ1bWVudC5tYXhQb2x5cGhvbnldKVxuICAgICAgSFA6IChoaWdocGFzc0ZpbHRlcigpIGZvciBpIGluIFswLi4uaW5zdHJ1bWVudC5tYXhQb2x5cGhvbnldKVxuICAgICAgbm9uZTogKCgoc2FtcGxlKSAtPiBzYW1wbGUpIGZvciBpIGluIFswLi4uaW5zdHJ1bWVudC5tYXhQb2x5cGhvbnldKVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgc2FtcGxlcywgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICByZXR1cm4gMCBpZiBpbnN0cnVtZW50LmxldmVsIGlzIDBcbiAgICByZXR1cm4gMCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgciA9IE1hdGgubWF4IDAuMDEsIGluc3RydW1lbnQudm9sdW1lRW52LnJcblxuICAgICMgc3VtIGFsbCBhY3RpdmUgbm90ZXNcbiAgICBpbnN0cnVtZW50LmxldmVsICogc3RhdGVbaW5zdHJ1bWVudC5faWRdLm5vdGVzLnJlZHVjZSgobWVtbywgbm90ZSwgaW5kZXgpID0+XG4gICAgICByZXR1cm4gbWVtbyB1bmxlc3Mgbm90ZT9cbiAgICAgIHJldHVybiBtZW1vIGlmIHRpbWUgPiByICsgbm90ZS50aW1lT2ZmXG5cbiAgICAgICMgc3VtIG9zY2lsbGF0b3JzIGFuZCBhcHBseSB2b2x1bWUgZW52ZWxvcGVcbiAgICAgIG9zYzFGcmVxID0gZnJlcXVlbmN5IG5vdGUua2V5ICsgaW5zdHJ1bWVudC5vc2MxLnR1bmUgLSAwLjUgKyBNYXRoLnJvdW5kKDI0ICogKGluc3RydW1lbnQub3NjMS5waXRjaCAtIDAuNSkpXG4gICAgICBvc2MyRnJlcSA9IGZyZXF1ZW5jeSBub3RlLmtleSArIGluc3RydW1lbnQub3NjMi50dW5lIC0gMC41ICsgTWF0aC5yb3VuZCgyNCAqIChpbnN0cnVtZW50Lm9zYzIucGl0Y2ggLSAwLjUpKVxuICAgICAgc2FtcGxlID0gZW52ZWxvcGUoaW5zdHJ1bWVudC52b2x1bWVFbnYsIG5vdGUsIHRpbWUpICogKFxuICAgICAgICBpbnN0cnVtZW50Lm9zYzEubGV2ZWwgKiBvc2NpbGxhdG9yc1tpbnN0cnVtZW50Lm9zYzEud2F2ZWZvcm1dKHRpbWUsIG9zYzFGcmVxKSArXG4gICAgICAgIGluc3RydW1lbnQub3NjMi5sZXZlbCAqIG9zY2lsbGF0b3JzW2luc3RydW1lbnQub3NjMi53YXZlZm9ybV0odGltZSwgb3NjMkZyZXEpXG4gICAgICApXG5cbiAgICAgICMgYXBwbHkgZmlsdGVyIHdpdGggZW52ZWxvcGVcbiAgICAgIGN1dG9mZiA9IE1hdGgubWluIDEsIGluc3RydW1lbnQuZmlsdGVyLmZyZXEgKyBpbnN0cnVtZW50LmZpbHRlci5lbnYgKiBlbnZlbG9wZShpbnN0cnVtZW50LmZpbHRlckVudiwgbm90ZSwgdGltZSlcbiAgICAgIGZpbHRlciA9IHN0YXRlW2luc3RydW1lbnQuX2lkXS5maWx0ZXJzW2luc3RydW1lbnQuZmlsdGVyLnR5cGVdW2luZGV4XVxuICAgICAgc2FtcGxlID0gZmlsdGVyIHNhbXBsZSwgY3V0b2ZmLCBpbnN0cnVtZW50LmZpbHRlci5yZXNcblxuICAgICAgIyByZXR1cm4gcmVzdWx0XG4gICAgICBtZW1vICsgc2FtcGxlXG5cbiAgICAsIDApXG4iLCJJbnN0cnVtZW50ID0gcmVxdWlyZSAnLi9pbnN0cnVtZW50J1xuUmluZ0J1ZmZlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9yaW5nX2J1ZmZlcidcbmxpbmVhckludGVycG9sYXRvciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9saW5lYXJfaW50ZXJwb2xhdG9yJ1xubG93cGFzc0ZpbHRlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9sb3dwYXNzX2ZpbHRlcidcbmhpZ2hwYXNzRmlsdGVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2hpZ2hwYXNzX2ZpbHRlcidcbmVudmVsb3BlID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2VudmVsb3BlJ1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgQmFzaWNTYW1wbGVyIGV4dGVuZHMgSW5zdHJ1bWVudFxuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN1cGVyIHN0YXRlLCBpbnN0cnVtZW50XG5cbiAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVycyA9XG4gICAgICBMUDogKGxvd3Bhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIEhQOiAoaGlnaHBhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIG5vbmU6ICgoKHNhbXBsZSkgLT4gc2FtcGxlKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcblxuICBAc2FtcGxlOiAoc3RhdGUsIHNhbXBsZXMsIGluc3RydW1lbnQsIHRpbWUsIGkpIC0+XG4gICAgcmV0dXJuIDAgaWYgaW5zdHJ1bWVudC5sZXZlbCBpcyAwXG4gICAgcmV0dXJuIDAgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cblxuICAgIHNhbXBsZURhdGEgPSBzYW1wbGVzW2luc3RydW1lbnQuc2FtcGxlSWRdXG4gICAgcmV0dXJuIDAgdW5sZXNzIHNhbXBsZURhdGE/XG5cbiAgICByID0gTWF0aC5tYXggMC4wMSwgaW5zdHJ1bWVudC52b2x1bWVFbnYuclxuXG4gICAgIyBzdW0gYWxsIGFjdGl2ZSBub3Rlc1xuICAgIGluc3RydW1lbnQubGV2ZWwgKiBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXMucmVkdWNlKChtZW1vLCBub3RlLCBpbmRleCkgPT5cbiAgICAgIHJldHVybiBtZW1vIHVubGVzcyBub3RlP1xuICAgICAgcmV0dXJuIG1lbW8gaWYgdGltZSA+IHIgKyBub3RlLnRpbWVPZmZcblxuICAgICAgIyBnZXQgcGl0Y2ggc2hpZnRlZCBpbnRlcnBvbGF0ZWQgc2FtcGxlIGFuZCBhcHBseSB2b2x1bWUgZW52ZWxvcGVcbiAgICAgIHRyYW5zcG9zZSA9IG5vdGUua2V5IC0gaW5zdHJ1bWVudC5yb290S2V5ICsgaW5zdHJ1bWVudC50dW5lIC0gMC41XG4gICAgICBzYW1wbGVzRWxhcHNlZCA9IGkgLSBub3RlLmlcbiAgICAgIG9mZnNldCA9IE1hdGguZmxvb3IgaW5zdHJ1bWVudC5zdGFydCAqIHNhbXBsZURhdGEubGVuZ3RoXG4gICAgICBsb29wQWN0aXZlID0gaW5zdHJ1bWVudC5sb29wQWN0aXZlIGlzICdsb29wJ1xuICAgICAgbG9vcFBvaW50ID0gTWF0aC5mbG9vciBpbnN0cnVtZW50Lmxvb3AgKiBzYW1wbGVEYXRhLmxlbmd0aFxuICAgICAgc2FtcGxlID0gbGluZWFySW50ZXJwb2xhdG9yIHNhbXBsZURhdGEsIHRyYW5zcG9zZSwgc2FtcGxlc0VsYXBzZWQsIG9mZnNldCwgbG9vcEFjdGl2ZSwgbG9vcFBvaW50XG4gICAgICBzYW1wbGUgPSBlbnZlbG9wZShpbnN0cnVtZW50LnZvbHVtZUVudiwgbm90ZSwgdGltZSkgKiAoc2FtcGxlIG9yIDApXG5cbiAgICAgICMgYXBwbHkgZmlsdGVyIHdpdGggZW52ZWxvcGVcbiAgICAgIGN1dG9mZiA9IE1hdGgubWluIDEsIGluc3RydW1lbnQuZmlsdGVyLmZyZXEgKyBpbnN0cnVtZW50LmZpbHRlci5lbnYgKiBlbnZlbG9wZShpbnN0cnVtZW50LmZpbHRlckVudiwgbm90ZSwgdGltZSlcbiAgICAgIGZpbHRlciA9IHN0YXRlW2luc3RydW1lbnQuX2lkXS5maWx0ZXJzW2luc3RydW1lbnQuZmlsdGVyLnR5cGVdW2luZGV4XVxuICAgICAgc2FtcGxlID0gZmlsdGVyIHNhbXBsZSwgY3V0b2ZmLCBpbnN0cnVtZW50LmZpbHRlci5yZXNcblxuICAgICAgIyByZXR1cm4gcmVzdWx0XG4gICAgICBtZW1vICsgc2FtcGxlXG5cbiAgICAsIDApXG4iLCIjIHB1bGxlZCBmcm9tIG1hdHQgZGlhbW9uZCAvIHJlY29yZGVyanNcbiMgaHR0cHM6Ly9naXRodWIuY29tL21hdHRkaWFtb25kL1JlY29yZGVyanMvYmxvYi9tYXN0ZXIvcmVjb3JkZXJXb3JrZXIuanNcblxuXG5mbG9hdFRvMTZCaXRQQ00gPSAob3V0cHV0LCBvZmZzZXQsIGlucHV0KSAtPlxuICBmb3IgaSBpbiBbMC4uLmlucHV0Lmxlbmd0aF1cbiAgICBzID0gTWF0aC5tYXggLTEsIE1hdGgubWluIDEsIGlucHV0W2ldXG4gICAgcyA9IGlmIHMgPCAwIHRoZW4gcyAqIDB4ODAwMCBlbHNlIHMgKiAweDdGRkZcbiAgICBvdXRwdXQuc2V0SW50MTYgb2Zmc2V0LCBzLCB0cnVlXG4gICAgb2Zmc2V0ICs9IDJcblxud3JpdGVTdHJpbmcgPSAodmlldywgb2Zmc2V0LCBzdHJpbmcpIC0+XG4gIGZvciBpIGluIFswLi4uc3RyaW5nLmxlbmd0aF1cbiAgICB2aWV3LnNldFVpbnQ4IG9mZnNldCArIGksIHN0cmluZy5jaGFyQ29kZUF0IGlcblxuXG5tb2R1bGUuZXhwb3J0cyA9IChzYW1wbGVzLCBudW1DaGFubmVscywgc2FtcGxlUmF0ZSkgLT5cbiAgc2FtcGxlcyA9IG5ldyBGbG9hdDMyQXJyYXkgc2FtcGxlc1xuICBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIgNDQgKyBzYW1wbGVzLmxlbmd0aCAqIDJcbiAgdmlldyA9IG5ldyBEYXRhVmlldyBidWZmZXJcblxuICAjIFJJRkYgaWRlbnRpZmllclxuICB3cml0ZVN0cmluZyB2aWV3LCAwLCAnUklGRidcbiAgIyBSSUZGIGNodW5rIGxlbmd0aFxuICB2aWV3LnNldFVpbnQzMiA0LCAzNiArIHNhbXBsZXMubGVuZ3RoICogMiwgdHJ1ZVxuICAjIFJJRkYgdHlwZVxuICB3cml0ZVN0cmluZyB2aWV3LCA4LCAnV0FWRSdcbiAgIyBmb3JtYXQgY2h1bmsgaWRlbnRpZmllclxuICB3cml0ZVN0cmluZyB2aWV3LCAxMiwgJ2ZtdCAnXG4gICMgZm9ybWF0IGNodW5rIGxlbmd0aFxuICB2aWV3LnNldFVpbnQzMiAxNiwgMTYsIHRydWVcbiAgIyBzYW1wbGUgZm9ybWF0IChyYXcpXG4gIHZpZXcuc2V0VWludDE2IDIwLCAxLCB0cnVlXG4gICMgY2hhbm5lbCBjb3VudFxuICB2aWV3LnNldFVpbnQxNiAyMiwgbnVtQ2hhbm5lbHMsIHRydWVcbiAgIyBzYW1wbGUgcmF0ZVxuICB2aWV3LnNldFVpbnQzMiAyNCwgc2FtcGxlUmF0ZSwgdHJ1ZVxuICAjIGJ5dGUgcmF0ZSAoc2FtcGxlIHJhdGUgKiBibG9jayBhbGlnbilcbiAgdmlldy5zZXRVaW50MzIgMjgsIHNhbXBsZVJhdGUgKiA0LCB0cnVlXG4gICMgYmxvY2sgYWxpZ24gKGNoYW5uZWwgY291bnQgKiBieXRlcyBwZXIgc2FtcGxlKVxuICB2aWV3LnNldFVpbnQxNiAzMiwgbnVtQ2hhbm5lbHMgKiAyLCB0cnVlXG4gICMgYml0cyBwZXIgc2FtcGxlXG4gIHZpZXcuc2V0VWludDE2IDM0LCAxNiwgdHJ1ZVxuICAjIGRhdGEgY2h1bmsgaWRlbnRpZmllclxuICB3cml0ZVN0cmluZyB2aWV3LCAzNiwgJ2RhdGEnXG4gICMgZGF0YSBjaHVuayBsZW5ndGhcbiAgdmlldy5zZXRVaW50MzIgNDAsIHNhbXBsZXMubGVuZ3RoICogMiwgdHJ1ZVxuXG4gIGZsb2F0VG8xNkJpdFBDTSB2aWV3LCA0NCwgc2FtcGxlc1xuXG4gIGJ1ZmZlclxuIiwibWluRW52VmFsdWUgPSAwLjAxXG5cbm1vZHVsZS5leHBvcnRzID0gKGVudiwgbm90ZSwgdGltZSkgLT5cbiAgZWxhcHNlZCA9IHRpbWUgLSBub3RlLnRpbWVcbiAgYSA9IE1hdGgubWF4IG1pbkVudlZhbHVlLCBlbnYuYVxuICBkID0gTWF0aC5tYXggbWluRW52VmFsdWUsIGVudi5kXG4gIHMgPSBlbnYuc1xuICByID0gTWF0aC5tYXggbWluRW52VmFsdWUsIGVudi5yXG5cbiAgIyBhdHRhY2ssIGRlY2F5LCBzdXN0YWluXG4gIGwgPSBpZiBlbGFwc2VkID4gYSArIGRcbiAgICBsID0gc1xuICBlbHNlIGlmIGVsYXBzZWQgPiBhXG4gICAgbCA9IHMgKyAoMSAtIHMpICogKGEgKyBkIC0gZWxhcHNlZCkgLyBkXG4gIGVsc2VcbiAgICBlbGFwc2VkIC8gYVxuXG4gICMgcmVsZWFzZVxuICBpZiBub3RlLnRpbWVPZmZcbiAgICBsID0gbCAqIChub3RlLnRpbWVPZmYgKyByIC0gdGltZSkgLyByXG5cbiAgTWF0aC5tYXggMCwgbFxuIiwic2FtcGxlUmF0ZSA9IDQ4MDAwXG5tYXhGcmVxID0gMTIwMDBcbmRiR2FpbiA9IDEyICAgICMgZ2FpbiBvZiBmaWx0ZXJcbmJhbmR3aWR0aCA9IDEgICMgYmFuZHdpZHRoIGluIG9jdGF2ZXNcblxuIyBjb25zdGFudHNcbkEgPSBNYXRoLnBvdygxMCwgZGJHYWluIC8gNDApXG5lID0gTWF0aC5sb2coMilcbnRhdSA9IDIgKiBNYXRoLlBJXG5iZXRhID0gTWF0aC5zcXJ0KDIgKiBBKVxuXG4jIGh5cGVyYm9saWMgc2luIGZ1bmN0aW9uXG5zaW5oID0gKHgpIC0+XG4gIHkgPSBNYXRoLmV4cCB4XG4gICh5IC0gMSAvIHkpIC8gMlxuXG5tb2R1bGUuZXhwb3J0cyA9IC0+XG4gIGEwID0gYTEgPSBhMiA9IGEzID0gYTQgPSB4MSA9IHgyID0geTEgPSB5MiA9IDBcbiAgZnJlcSA9IG9tZWdhID0gc24gPSBhbHBoYSA9IDBcbiAgY3MgPSAxXG5cbiAgbGFzdEN1dG9mZiA9IDBcblxuICAoc2FtcGxlLCBjdXRvZmYpIC0+XG4gICAgIyBjYWNoZSBmaWx0ZXIgdmFsdWVzIHVudGlsIGN1dG9mZiBjaGFuZ2VzXG4gICAgaWYgY3V0b2ZmICE9IGxhc3RDdXRvZmZcbiAgXG4gICAgICBvbGRDdXRvZmYgPSBjdXRvZmZcblxuICAgICAgZnJlcSA9IGN1dG9mZiAqIG1heEZyZXFcbiAgICAgIG9tZWdhID0gdGF1ICogZnJlcSAvIHNhbXBsZVJhdGVcbiAgICAgIHNuID0gTWF0aC5zaW4gb21lZ2FcbiAgICAgIGNzID0gTWF0aC5jb3Mgb21lZ2FcbiAgICAgIGFscGhhID0gc24gKiBzaW5oKGUgLyAyICogYmFuZHdpZHRoICogb21lZ2EgLyBzbilcblxuICAgICAgYjAgPSAoMSArIGNzKSAvIDJcbiAgICAgIGIxID0gLSgxICsgY3MpXG4gICAgICBiMiA9ICgxICsgY3MpIC8gMlxuICAgICAgYWEwID0gMSArIGFscGhhXG4gICAgICBhYTEgPSAtMiAqIGNzXG4gICAgICBhYTIgPSAxIC0gYWxwaGFcblxuICAgICAgYTAgPSBiMCAvIGFhMFxuICAgICAgYTEgPSBiMSAvIGFhMFxuICAgICAgYTIgPSBiMiAvIGFhMFxuICAgICAgYTMgPSBhYTEgLyBhYTBcbiAgICAgIGE0ID0gYWEyIC8gYWEwXG5cbiAgICAjIGNvbXB1dGUgcmVzdWx0XG4gICAgcyA9IE1hdGgubWF4IC0xLCBNYXRoLm1pbiAxLCBzYW1wbGVcbiAgICByZXN1bHQgPSBhMCAqIHMgKyBhMSAqIHgxICsgYTIgKiB4MiAtIGEzICogeTEgLSBhNCAqIHkyXG5cbiAgICAjIHNoaWZ0IHgxIHRvIHgyLCBzYW1wbGUgdG8geDFcbiAgICB4MiA9IHgxXG4gICAgeDEgPSBzXG5cbiAgICAjIHNoaWZ0IHkxIHRvIHkyLCByZXN1bHQgdG8geTFcbiAgICB5MiA9IHkxXG4gICAgeTEgPSByZXN1bHRcblxuICAgIHJlc3VsdCIsIm1vZHVsZS5leHBvcnRzID0gKHNhbXBsZURhdGEsIHRyYW5zcG9zZSwgc2FtcGxlc0VsYXBzZWQsIG9mZnNldCA9IDAsIGxvb3BBY3RpdmUgPSBmYWxzZSwgbG9vcFBvaW50KSAtPlxuICBpID0gc2FtcGxlc0VsYXBzZWQgKiBNYXRoLnBvdyAyLCB0cmFuc3Bvc2UgLyAxMlxuICBpMSA9IE1hdGguZmxvb3IgaVxuICBpMSA9IGkxICUgKGxvb3BQb2ludCAtIG9mZnNldCkgaWYgbG9vcEFjdGl2ZVxuICBpMiA9IGkxICsgMVxuICBsID0gaSAlIDFcblxuICBzYW1wbGVEYXRhW29mZnNldCArIGkxXSAqICgxIC0gbCkgKyBzYW1wbGVEYXRhW29mZnNldCArIGkyXSAqIGwiLCJpID0gMFxubW9kdWxlLmV4cG9ydHMgPSAodikgLT5cbiAgY29uc29sZS5sb2codikgaWYgaSA9PSAwXG4gIGkgPSAoaSArIDEpICUgNzAwMFxuIiwic2FtcGxlUmF0ZSA9IDQ4MDAwXG5cbm1vZHVsZS5leHBvcnRzID0gLT5cblxuICB5MSA9IHkyID0geTMgPSB5NCA9IG9sZHggPSBvbGR5MSA9IG9sZHkyID0gb2xkeTMgPSAwXG4gIHAgPSBrID0gdDEgPSB0MiA9IHIgPSB4ID0gbnVsbFxuXG4gIChzYW1wbGUsIGN1dG9mZiwgcmVzKSAtPlxuICAgIGZyZXEgPSAyMCAqIE1hdGgucG93IDEwLCAzICogY3V0b2ZmXG4gICAgZnJlcSA9IGZyZXEgLyBzYW1wbGVSYXRlXG4gICAgcCA9IGZyZXEgKiAoMS44IC0gKDAuOCAqIGZyZXEpKVxuICAgIGsgPSAyICogTWF0aC5zaW4oZnJlcSAqIE1hdGguUEkgLyAyKSAtIDFcbiAgICB0MSA9ICgxIC0gcCkgKiAxLjM4NjI0OVxuICAgIHQyID0gMTIgKyB0MSAqIHQxXG4gICAgciA9IHJlcyAqIDAuNTcgKiAodDIgKyA2ICogdDEpIC8gKHQyIC0gNiAqIHQxKVxuXG4gICAgeCA9IHNhbXBsZSAtIHIgKiB5NFxuXG4gICAgIyBmb3VyIGNhc2NhZGVkIG9uZS1wb2xlIGZpbHRlcnMgKGJpbGluZWFyIHRyYW5zZm9ybSlcbiAgICB5MSA9ICB4ICogcCArIG9sZHggICogcCAtIGsgKiB5MVxuICAgIHkyID0geTEgKiBwICsgb2xkeTEgKiBwIC0gayAqIHkyXG4gICAgeTMgPSB5MiAqIHAgKyBvbGR5MiAqIHAgLSBrICogeTNcbiAgICB5NCA9IHkzICogcCArIG9sZHkzICogcCAtIGsgKiB5NFxuXG4gICAgIyBjbGlwcGVyIGJhbmQgbGltaXRlZCBzaWdtb2lkXG4gICAgeTQgLT0gKHk0ICogeTQgKiB5NCkgLyA2XG5cbiAgICBvbGR4ID0geFxuICAgIG9sZHkxID0geTFcbiAgICBvbGR5MiA9IHkyXG4gICAgb2xkeTMgPSB5M1xuXG4gICAgeTQiLCJ0YXUgPSBNYXRoLlBJICogMlxuXG5tb2R1bGUuZXhwb3J0cyA9XG5cbiAgc2luZTogKHRpbWUsIGZyZXF1ZW5jeSkgLT5cbiAgICBNYXRoLnNpbiB0aW1lICogdGF1ICogZnJlcXVlbmN5XG5cbiAgc3F1YXJlOiAodGltZSwgZnJlcXVlbmN5KSAtPlxuICAgIGlmICgodGltZSAlICgxIC8gZnJlcXVlbmN5KSkgKiBmcmVxdWVuY3kpICUgMSA+IDAuNSB0aGVuIDEgZWxzZSAtMVxuXG4gIHNhdzogKHRpbWUsIGZyZXF1ZW5jeSkgLT5cbiAgICAxIC0gMiAqICgoKHRpbWUgJSAoMSAvIGZyZXF1ZW5jeSkpICogZnJlcXVlbmN5KSAlIDEpXG5cbiAgbm9pc2U6IC0+XG4gICAgMiAqIE1hdGgucmFuZG9tKCkgLSAxIiwibW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSaW5nQnVmZmVyXG4gIFxuICBjb25zdHJ1Y3RvcjogKEBtYXhMZW5ndGgsIEBUeXBlID0gRmxvYXQzMkFycmF5LCBAbGVuZ3RoKSAtPlxuICAgIEBsZW5ndGggfHw9IEBtYXhMZW5ndGhcbiAgICBAYXJyYXkgPSBuZXcgQFR5cGUgQG1heExlbmd0aFxuICAgIEBwb3MgPSAwXG5cbiAgcmVzZXQ6IC0+XG4gICAgQGFycmF5ID0gbmV3IEBUeXBlIEBtYXhMZW5ndGhcbiAgICB0aGlzXG5cbiAgcmVzaXplOiAoQGxlbmd0aCkgLT5cbiAgICBAcG9zID0gMCBpZiBAcG9zID49IEBsZW5ndGhcblxuICBwdXNoOiAoZWwpIC0+XG4gICAgQGFycmF5W0Bwb3NdID0gZWxcbiAgICBAcG9zICs9IDFcbiAgICBAcG9zID0gMCBpZiBAcG9zID09IEBsZW5ndGhcbiAgICB0aGlzXG5cbiAgZm9yRWFjaDogKGZuKSAtPlxuICAgIGB2YXIgaSwgbGVuO1xuICAgIGZvciAoaSA9IHRoaXMucG9zLCBsZW4gPSB0aGlzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBmbih0aGlzLmFycmF5W2ldLCBpKTtcbiAgICB9XG4gICAgZm9yIChpID0gMCwgbGVuID0gdGhpcy5wb3M7IGkgPCBsZW47IGkrKykge1xuICAgICAgZm4odGhpcy5hcnJheVtpXSwgaSk7XG4gICAgfWBcbiAgICB0aGlzXG5cbiAgcmVkdWNlOiAoZm4sIG1lbW8gPSAwKSAtPlxuICAgIEBmb3JFYWNoIChlbCwgaSkgLT5cbiAgICAgIG1lbW8gPSBmbiBtZW1vLCBlbCwgaVxuICAgIG1lbW9cbiIsIm1vZHVsZS5leHBvcnRzID0gKGRlY2F5LCBlbGFwc2VkKSAtPlxuICBpZiBlbGFwc2VkID4gZGVjYXlcbiAgICAwXG4gIGVsc2VcbiAgICAxIC0gZWxhcHNlZCAvIGRlY2F5XG4iLCJJbnN0cnVtZW50ID0gcmVxdWlyZSAnLi9pbnN0cnVtZW50J1xuZW52ZWxvcGUgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvZW52ZWxvcGUnXG5saW5lYXJJbnRlcnBvbGF0b3IgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvbGluZWFyX2ludGVycG9sYXRvcidcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIERydW1TYW1wbGVyIGV4dGVuZHMgSW5zdHJ1bWVudFxuXG4gICMga2VlcCBub3RlcyBpbiBhIG1hcCB7a2V5OiBub3RlRGF0YX0gaW5zdGVhZCBvZiB0byBhIHJpbmcgYnVmZmVyXG4gICMgdGhpcyBnaXZlcyB1cyBvbmUgbW9ucGhvbmljIHZvaWNlIHBlciBkcnVtXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXSA9IG5vdGVzOiB7fVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgc2FtcGxlcywgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICByZXR1cm4gMCBpZiBpbnN0cnVtZW50LmxldmVsIGlzIDBcbiAgICByZXR1cm4gMCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgIyBzdW0gYWxsIGFjdGl2ZSBub3Rlc1xuICAgIGluc3RydW1lbnQubGV2ZWwgKiBpbnN0cnVtZW50LmRydW1zLnJlZHVjZSgobWVtbywgZHJ1bSkgPT5cbiAgICAgIG5vdGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNbZHJ1bS5rZXldXG4gICAgICByZXR1cm4gbWVtbyB1bmxlc3Mgbm90ZT9cblxuICAgICAgc2FtcGxlRGF0YSA9IHNhbXBsZXNbZHJ1bS5zYW1wbGVJZF1cbiAgICAgIHJldHVybiBtZW1vIHVubGVzcyBzYW1wbGVEYXRhP1xuXG4gICAgICBzYW1wbGVzRWxhcHNlZCA9IGkgLSBub3RlLmlcbiAgICAgIG9mZnNldCA9IE1hdGguZmxvb3IgZHJ1bS5zdGFydCAqIHNhbXBsZURhdGEubGVuZ3RoXG4gICAgICByZXR1cm4gbWVtbyBpZiBzYW1wbGVzRWxhcHNlZCArIG9mZnNldCA+IHNhbXBsZURhdGEubGVuZ3RoXG5cbiAgICAgIHNhbXBsZSA9IGxpbmVhckludGVycG9sYXRvciBzYW1wbGVEYXRhLCBkcnVtLnRyYW5zcG9zZSwgc2FtcGxlc0VsYXBzZWQsIG9mZnNldFxuICAgICAgbWVtbyArIGRydW0ubGV2ZWwgKiBlbnZlbG9wZShkcnVtLnZvbHVtZUVudiwgbm90ZSwgdGltZSkgKiAoc2FtcGxlIG9yIDApXG4gICAgLCAwKVxuXG4gIEB0aWNrOiAoc3RhdGUsIGluc3RydW1lbnQsIHRpbWUsIGksIGJlYXQsIGJwcywgbm90ZXNPbiwgbm90ZXNPZmYpIC0+XG4gICAgQGNyZWF0ZVN0YXRlIHN0YXRlLCBpbnN0cnVtZW50IHVubGVzcyBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0/XG5cbiAgICBub3Rlc09mZi5mb3JFYWNoICh7a2V5fSkgLT5cbiAgICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlc1trZXldPy50aW1lT2ZmID0gdGltZVxuXG4gICAgbm90ZXNPbi5mb3JFYWNoIChub3RlKSA9PlxuICAgICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdLm5vdGVzW25vdGUua2V5XSA9IHt0aW1lLCBpfVxuIiwiSW5zdHJ1bWVudCA9IHJlcXVpcmUgJy4vaW5zdHJ1bWVudCdcbmhpZ2hwYXNzRmlsdGVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2hpZ2hwYXNzX2ZpbHRlcidcbnNpbXBsZUVudmVsb3BlID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL3NpbXBsZV9lbnZlbG9wZSdcbm9zY2lsbGF0b3JzID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL29zY2lsbGF0b3JzJ1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgRHJ1bVN5bnRoZXNpemVyIGV4dGVuZHMgSW5zdHJ1bWVudFxuXG4gIG1pbkZyZXEgPSA2MFxuICBtYXhGcmVxID0gMzAwMFxuICBmcmVxU2NhbGUgPSBtYXhGcmVxIC0gbWluRnJlcVxuXG4gICMga2VlcCBub3RlcyBpbiBhIG1hcCB7a2V5OiBub3RlRGF0YX0gaW5zdGVhZCBvZiBpbiBhIHJpbmcgYnVmZmVyXG4gICMgdGhpcyBnaXZlcyB1cyBvbmUgbW9ucGhvbmljIHZvaWNlIHBlciBkcnVtLlxuICBAY3JlYXRlU3RhdGU6IChzdGF0ZSwgaW5zdHJ1bWVudCkgLT5cbiAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0gPVxuICAgICAgbm90ZXM6IHt9XG4gICAgICBmaWx0ZXJzOiAoXG4gICAgICAgIGhpZ2hwYXNzRmlsdGVyKCkgZm9yIGkgaW4gWzAuLi4xMjddXG4gICAgICApXG5cbiAgQHNhbXBsZTogKHN0YXRlLCBzYW1wbGVzLCBpbnN0cnVtZW50LCB0aW1lLCBpKSAtPlxuICAgIHJldHVybiAwIGlmIGluc3RydW1lbnQubGV2ZWwgaXMgMFxuICAgIHJldHVybiAwIHVubGVzcyBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0/XG5cbiAgICAjIHN1bSBhbGwgYWN0aXZlIG5vdGVzXG4gICAgaW5zdHJ1bWVudC5sZXZlbCAqIGluc3RydW1lbnQuZHJ1bXMucmVkdWNlKChtZW1vLCBkcnVtKSA9PlxuICAgICAgbm90ZSA9IHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlc1tkcnVtLmtleV1cbiAgICAgIHJldHVybiBtZW1vIHVubGVzcyBub3RlP1xuXG4gICAgICBlbGFwc2VkID0gdGltZSAtIG5vdGUudGltZVxuICAgICAgcmV0dXJuIG1lbW8gaWYgZWxhcHNlZCA+IGRydW0uZGVjYXlcblxuICAgICAgZW52ID0gc2ltcGxlRW52ZWxvcGUgZHJ1bS5kZWNheSwgZWxhcHNlZFxuICAgICAgZnJlcSA9IG1pbkZyZXEgKyBkcnVtLnBpdGNoICogZnJlcVNjYWxlXG5cbiAgICAgICMgYXBwbHkgcGl0Y2ggYmVuZFxuICAgICAgaWYgZHJ1bS5iZW5kXG4gICAgICAgIGZyZXEgPSAoMiAtIGRydW0uYmVuZCArIGRydW0uYmVuZCAqIGVudikgLyAyICogZnJlcVxuXG4gICAgICAjIGFwcGx5IGZtXG4gICAgICBpZiBkcnVtLmZtID4gMFxuICAgICAgICBzaWduYWwgPSBvc2NpbGxhdG9ycy5zaW5lIGVsYXBzZWQsIG1pbkZyZXEgKyBkcnVtLmZtRnJlcSAqIGZyZXFTY2FsZVxuICAgICAgICBmcmVxICs9IGRydW0uZm0gKiBzaWduYWwgKiBzaW1wbGVFbnZlbG9wZShkcnVtLmZtRGVjYXkgKyAwLjAxLCBlbGFwc2VkKVxuXG4gICAgICAjIHN1bSBub2lzZSBhbmQgb3NjaWxsYXRvclxuICAgICAgc2FtcGxlID0gKFxuICAgICAgICAoMSAtIGRydW0ubm9pc2UpICogb3NjaWxsYXRvcnMuc2luZShlbGFwc2VkLCBmcmVxKSArXG4gICAgICAgIGRydW0ubm9pc2UgKiBvc2NpbGxhdG9ycy5ub2lzZSgpXG4gICAgICApXG5cbiAgICAgICMgYXBwbHkgaGlnaHBhc3NcbiAgICAgIGlmIGRydW0uaHAgPiAwXG4gICAgICAgIHNhbXBsZSA9IHN0YXRlW2luc3RydW1lbnQuX2lkXS5maWx0ZXJzW2RydW0ua2V5XSBzYW1wbGUsIGRydW0uaHBcblxuICAgICAgbWVtbyArIGRydW0ubGV2ZWwgKiBlbnYgKiBzYW1wbGVcblxuICAgICwgMClcblxuXG4gIEB0aWNrOiAoc3RhdGUsIGluc3RydW1lbnQsIHRpbWUsIGksIGJlYXQsIGJwcywgbm90ZXNPbiwgbm90ZXNPZmYpIC0+XG4gICAgQGNyZWF0ZVN0YXRlIHN0YXRlLCBpbnN0cnVtZW50IHVubGVzcyBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0/XG5cbiAgICBub3Rlc09uLmZvckVhY2ggKG5vdGUpID0+XG4gICAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNbbm90ZS5rZXldID0ge3RpbWUsIGl9XG5cbiIsIlJpbmdCdWZmZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvcmluZ19idWZmZXInXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnN0cnVtZW50XG5cbiAgQGNyZWF0ZVN0YXRlOiAoc3RhdGUsIGluc3RydW1lbnQpIC0+XG4gICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdID1cbiAgICAgIG5vdGVzOiBuZXcgUmluZ0J1ZmZlciBpbnN0cnVtZW50Lm1heFBvbHlwaG9ueSwgQXJyYXksIGluc3RydW1lbnQucG9seXBob255XG4gICAgICBub3RlTWFwOiB7fVxuXG4gIEByZWxlYXNlU3RhdGU6IChzdGF0ZSwgaW5zdHJ1bWVudCkgLT5cbiAgICBkZWxldGUgc3RhdGVbaW5zdHJ1bWVudC5faWRdXG5cbiAgQHNhbXBsZTogKHN0YXRlLCBzYW1wbGVzLCBpbnN0cnVtZW50LCB0aW1lLCBpKSAtPlxuICAgIDBcblxuICBAdGljazogKHN0YXRlLCBpbnN0cnVtZW50LCB0aW1lLCBpLCBiZWF0LCBicHMsIG5vdGVzT24sIG5vdGVzT2ZmKSAtPlxuICAgIEBjcmVhdGVTdGF0ZSBzdGF0ZSwgaW5zdHJ1bWVudCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuICAgIGluc3RydW1lbnRTdGF0ZSA9IHN0YXRlW2luc3RydW1lbnQuX2lkXVxuXG4gICAgaWYgaW5zdHJ1bWVudC5wb2x5cGhvbnkgIT0gaW5zdHJ1bWVudFN0YXRlLm5vdGVzLmxlbmd0aFxuICAgICAgaW5zdHJ1bWVudFN0YXRlLm5vdGVzLnJlc2l6ZSBpbnN0cnVtZW50LnBvbHlwaG9ueVxuXG4gICAgbm90ZXNPZmYuZm9yRWFjaCAoe2tleX0pIC0+XG4gICAgICAjIGNvbnNvbGUubG9nICdub3RlIG9mZiAnICsga2V5XG4gICAgICBpbnN0cnVtZW50U3RhdGUubm90ZU1hcFtrZXldPy50aW1lT2ZmID0gdGltZVxuXG4gICAgbm90ZXNPbi5mb3JFYWNoICh7a2V5fSkgLT5cbiAgICAgICMgY29uc29sZS5sb2cgJ25vdGUgb24gJyArIGtleVxuICAgICAgaW5zdHJ1bWVudFN0YXRlLm5vdGVNYXBba2V5XSA9IHt0aW1lLCBpLCBrZXl9XG4gICAgICBpbnN0cnVtZW50U3RhdGUubm90ZXMucHVzaCBpbnN0cnVtZW50U3RhdGUubm90ZU1hcFtrZXldXG5cbiIsIkluc3RydW1lbnQgPSByZXF1aXJlICcuL2luc3RydW1lbnQnXG5SaW5nQnVmZmVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL3JpbmdfYnVmZmVyJ1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTG9vcFNhbXBsZXIgZXh0ZW5kcyBJbnN0cnVtZW50XG4iLCJUcmFjayA9IHJlcXVpcmUgJy4vdHJhY2snXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU29uZ1xuXG4gICMgbnVtYmVyIG9mIHNhbXBsZXMgdG8gcHJvY2VzcyBiZXR3ZWVuIHRpY2tzXG4gIGNsb2NrUmF0aW8gPSAxMTBcblxuICAjIHJhdGUgYXQgd2hpY2ggbGV2ZWwgbWV0ZXJzIGRlY2F5XG4gIG1ldGVyRGVjYXkgPSAwLjA1XG5cbiAgY2xpcCA9IChzYW1wbGUpIC0+XG4gICAgTWF0aC5tYXgoMCwgTWF0aC5taW4oMiwgc2FtcGxlICsgMSkpIC0gMVxuXG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIEBsYXN0QmVhdCA9IDBcblxuICAgICMga2VlcCBtdXRhYmxlIHN0YXRlIGZvciBhdWRpbyBwbGF5YmFjayBoZXJlIC0gdGhpcyB3aWxsIHN0b3JlIHRoaW5ncyBsaWtlXG4gICAgIyBmaWx0ZXIgbWVtb3J5IGFuZCBtZXRlciBsZXZlbHMgdGhhdCBuZWVkIHRvIHN0YXkgb3V0c2lkZSB0aGUgbm9ybWFsIGN1cnNvclxuICAgICMgc3RydWN0dXJlIGZvciBwZXJmb3JtYW5jZSByZWFzb25zXG4gICAgQHN0YXRlID0ge31cblxuICAgICMga2VlcCBhIHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBzb25nIGRvY3VtZW50XG4gICAgQHNvbmcgPSBudWxsXG5cbiAgICAjIGtlZXAgcmVmZXJlbmNlcyB0byB0aGUgY3VycmVudGx5IHVzZWQgc2FtcGxlc1xuICAgIEBzYW1wbGVzID0ge31cblxuICAgICMga2VlcCBhIGxpc3Qgb2YgdW5wcm9jZXNzZWQgbWlkaSBtZXNzYWdlc1xuICAgIEBtaWRpTWVzc2FnZXMgPSBbXVxuXG4gIHVwZGF0ZTogKHN0YXRlKSAtPlxuICAgIEBzb25nID0gc3RhdGVcblxuICBtaWRpOiAobWVzc2FnZSkgLT5cbiAgICBAbWlkaU1lc3NhZ2VzLnB1c2ggbWVzc2FnZVxuXG4gICMgZmlsbCBhIGJ1ZmZlciBmdW5jdGlvblxuICBidWZmZXI6IChzaXplLCBpbmRleCwgc2FtcGxlUmF0ZSkgLT5cbiAgICBhcnIgPSBuZXcgRmxvYXQzMkFycmF5IHNpemVcblxuICAgIGlmIEBzb25nP1xuICAgICAgZm9yIGkgaW4gWzAuLi5zaXplXVxuICAgICAgICBpaSA9IGluZGV4ICsgaVxuICAgICAgICB0ID0gaWkgLyBzYW1wbGVSYXRlXG4gICAgICAgIGFycltpXSA9IEBzYW1wbGUgdCwgaWlcblxuICAgIGFyci5idWZmZXJcblxuICAjIGNhbGxlZCBmb3IgZXZlcnkgc2FtcGxlIG9mIGF1ZGlvXG4gIHNhbXBsZTogKHRpbWUsIGkpID0+XG4gICAgQHRpY2sgdGltZSwgaSBpZiBpICUgY2xvY2tSYXRpbyBpcyAwXG5cbiAgICBjbGlwIEBzb25nLmxldmVsICogQHNvbmcudHJhY2tzLnJlZHVjZSgobWVtbywgdHJhY2spID0+XG4gICAgICBtZW1vICsgVHJhY2suc2FtcGxlIEBzdGF0ZSwgQHNhbXBsZXMsIHRyYWNrLCB0aW1lLCBpXG4gICAgLCAwKVxuXG4gICMgY2FsbGVkIGZvciBldmVyeSBjbG9ja1JhdGlvIHNhbXBsZXNcbiAgdGljazogKHRpbWUsIGkpID0+XG4gICAgYnBzID0gQHNvbmcuYnBtIC8gNjBcbiAgICBiZWF0ID0gdGltZSAqIGJwc1xuXG4gICAgQHNvbmcudHJhY2tzLmZvckVhY2ggKHRyYWNrLCBpbmRleCkgPT5cblxuICAgICAgIyBmb3Igbm93IHNlbmQgbWlkaSBvbmx5IHRvIHRoZSBmaXJzdCB0cmFjayAtIGluIHRoZSBmdXR1cmUgd2Ugc2hvdWxkXG4gICAgICAjIGFsbG93IHRyYWNrcyB0byBiZSBhcm1lZCBmb3IgcmVjb3JkaW5nXG4gICAgICBtaWRpTWVzc2FnZXMgPSBpZiBpbmRleCBpcyBAc29uZy5zZWxlY3RlZFRyYWNrIHRoZW4gQG1pZGlNZXNzYWdlcyBlbHNlIG51bGxcblxuICAgICAgVHJhY2sudGljayBAc3RhdGUsIHRyYWNrLCBtaWRpTWVzc2FnZXMsIHRpbWUsIGksIGJlYXQsIEBsYXN0QmVhdCwgYnBzXG5cbiAgICBAbGFzdEJlYXQgPSBiZWF0XG5cbiAgIyBzdG9yZSBzYW1wbGUgZGF0YSBmb3IgYSBuZXcgc2FtcGxlXG4gIGFkZFNhbXBsZTogKGlkLCBzYW1wbGVEYXRhKSAtPlxuICAgIEBzYW1wbGVzW2lkXSA9IHNhbXBsZURhdGFcblxuICAjIHJlbGVhc2UgZGF0YSBmb3IgYSBzYW1wbGVcbiAgcmVtb3ZlU2FtcGxlOiAoaWQpIC0+XG4gICAgZGVsZXRlIEBzYW1wbGVzW2lkXVxuXG4gICMgcmVsZWFzZSBkYXRhIGZvciBhbGwgc2FtcGxlc1xuICBjbGVhclNhbXBsZXM6IC0+XG4gICAgQHNhbXBsZXMgPSB7fVxuXG4gICMgY2FsbGVkIHBlcmlvZGljYWxseSB0byBwYXNzIGhpZ2ggZnJlcXVlbmN5IGRhdGEgdG8gdGhlIHVpLi4gdGhpcyBzaG91bGRcbiAgIyBldmVudHVhbGx5IGJlIHVwZGF0ZWQgdG8gYmFzZSB0aGUgYW1vdW50IG9mIGRlY2F5IG9uIHRoZSBhY3R1YWwgZWxwYXNlZCB0aW1lXG4gIHByb2Nlc3NGcmFtZTogLT5cbiAgICBpZiBAc29uZz8udHJhY2tzP1xuICAgICAgIyBhcHBseSBkZWNheSB0byBtZXRlciBsZXZlbHNcbiAgICAgIGZvciB0cmFjayBpbiBAc29uZy50cmFja3NcbiAgICAgICAgaWYgQHN0YXRlW3RyYWNrLl9pZF0/XG4gICAgICAgICAgQHN0YXRlW3RyYWNrLl9pZF0ubWV0ZXJMZXZlbCAtPSBtZXRlckRlY2F5XG5cbiAgIyBnZXQgYSBzZW5kYWJsZSB2ZXJzaW9uIG9mIGN1cnJlbnQgc29uZyBwbGF5YmFjayBzdGF0ZVxuICBnZXRTdGF0ZTogLT5cbiAgICBtZXRlckxldmVsczogQHNvbmc/LnRyYWNrcz8ucmVkdWNlKChtZW1vLCB0cmFjaykgPT5cbiAgICAgIG1lbW9bdHJhY2suX2lkXSA9IEBzdGF0ZVt0cmFjay5faWRdPy5tZXRlckxldmVsXG4gICAgICBtZW1vXG4gICAgLCB7fSlcbiIsImluc3RydW1lbnRUeXBlcyA9XG4gIEFuYWxvZ1N5bnRoZXNpemVyOiByZXF1aXJlICcuL2FuYWxvZ19zeW50aGVzaXplcidcbiAgQmFzaWNTYW1wbGVyOiByZXF1aXJlICcuL2Jhc2ljX3NhbXBsZXInXG4gIERydW1TYW1wbGVyOiByZXF1aXJlICcuL2RydW1fc2FtcGxlcidcbiAgRHJ1bVN5bnRoZXNpemVyOiByZXF1aXJlICcuL2RydW1fc3ludGhlc2l6ZXInXG4gIExvb3BTYW1wbGVyOiByZXF1aXJlICcuL2xvb3Bfc2FtcGxlcidcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFRyYWNrXG5cbiAgQGNyZWF0ZVN0YXRlOiAoc3RhdGUsIHRyYWNrKSAtPlxuICAgIHN0YXRlW3RyYWNrLl9pZF0gPVxuICAgICAgbWV0ZXJMZXZlbDogMFxuXG4gIEByZWxlYXNlU3RhdGU6IChzdGF0ZSwgdHJhY2spIC0+XG4gICAgZGVsZXRlIHN0YXRlW3RyYWNrLl9pZF1cblxuICBAc2FtcGxlOiAoc3RhdGUsIHNhbXBsZXMsIHRyYWNrLCB0aW1lLCBpKSAtPlxuICAgICMgZ2V0IGluc3RydW1lbnQgb3V0cHV0XG4gICAgSW5zdHJ1bWVudCA9IGluc3RydW1lbnRUeXBlc1t0cmFjay5pbnN0cnVtZW50Ll90eXBlXVxuICAgIHNhbXBsZSA9IEluc3RydW1lbnQuc2FtcGxlIHN0YXRlLCBzYW1wbGVzLCB0cmFjay5pbnN0cnVtZW50LCB0aW1lLCBpXG5cbiAgICAjIGFwcGx5IGVmZmVjdHNcbiAgICBzYW1wbGUgPSB0cmFjay5lZmZlY3RzLnJlZHVjZSgoc2FtcGxlLCBlZmZlY3QpIC0+XG4gICAgICBFZmZlY3Quc2FtcGxlIHN0YXRlLCBlZmZlY3QsIHRpbWUsIGksIHNhbXBsZVxuICAgICwgc2FtcGxlKVxuXG4gICAgIyB1cGRhdGUgbWV0ZXIgbGV2ZWxzXG4gICAgaWYgdHJhY2tTdGF0ZSA9IHN0YXRlW3RyYWNrLl9pZF1cbiAgICAgIGxldmVsID0gdHJhY2tTdGF0ZS5tZXRlckxldmVsXG4gICAgICBpZiBub3QgbGV2ZWw/IG9yIGlzTmFOKGxldmVsKSBvciBzYW1wbGUgPiBsZXZlbFxuICAgICAgICB0cmFja1N0YXRlLm1ldGVyTGV2ZWwgPSBzYW1wbGVcblxuICAgIHNhbXBsZVxuXG4gIEB0aWNrOiAoc3RhdGUsIHRyYWNrLCBtaWRpTWVzc2FnZXMsIHRpbWUsIGksIGJlYXQsIGxhc3RCZWF0LCBicHMpIC0+XG4gICAgQGNyZWF0ZVN0YXRlIHN0YXRlLCB0cmFjayB1bmxlc3Mgc3RhdGVbdHJhY2suX2lkXT9cblxuICAgIEluc3RydW1lbnQgPSBpbnN0cnVtZW50VHlwZXNbdHJhY2suaW5zdHJ1bWVudC5fdHlwZV1cblxuICAgICMgZ2V0IG5vdGVzIG9uIGZyb20gc2VxdWVuY2VcbiAgICB7bm90ZXNPbiwgbm90ZXNPZmZ9ID0gQG5vdGVzIHRyYWNrLnNlcXVlbmNlLCBtaWRpTWVzc2FnZXMsIHRpbWUsIGJlYXQsIGxhc3RCZWF0XG5cbiAgICBJbnN0cnVtZW50LnRpY2sgc3RhdGUsIHRyYWNrLmluc3RydW1lbnQsIHRpbWUsIGksIGJlYXQsIGJwcywgbm90ZXNPbiwgbm90ZXNPZmZcbiAgICB0cmFjay5lZmZlY3RzLmZvckVhY2ggKGUpIC0+IGUudGljayBzdGF0ZSwgdGltZSwgYmVhdCwgYnBzXG5cbiAgIyBsb29rIGF0IHNlcXVlbmNlIGFuZCBtaWRpIG1lc3NhZ2VzLCByZXR1cm4gYXJyYXlzIG9mIG5vdGVzIG9uIGFuZCBvZmZcbiAgIyBvY2N1cnJpbmcgaW4gdGhpcyB0aWNrXG4gIEBub3RlczogKHNlcXVlbmNlLCBtaWRpTWVzc2FnZXMsIHRpbWUsIGJlYXQsIGxhc3RCZWF0KSAtPlxuICAgIGJhciA9IE1hdGguZmxvb3IgYmVhdCAvIHNlcXVlbmNlLmxvb3BTaXplXG4gICAgbGFzdEJhciA9IE1hdGguZmxvb3IgbGFzdEJlYXQgLyBzZXF1ZW5jZS5sb29wU2l6ZVxuICAgIGJlYXQgPSBiZWF0ICUgc2VxdWVuY2UubG9vcFNpemVcbiAgICBsYXN0QmVhdCA9IGxhc3RCZWF0ICUgc2VxdWVuY2UubG9vcFNpemVcblxuICAgIG5vdGVzT24gPSBbXVxuICAgIG5vdGVzT2ZmID0gW11cblxuICAgIGZvciBpZCwgbm90ZSBvZiBzZXF1ZW5jZS5ub3Rlc1xuICAgICAgc3RhcnQgPSBub3RlLnN0YXJ0XG4gICAgICBlbmQgPSBub3RlLnN0YXJ0ICsgbm90ZS5sZW5ndGhcblxuICAgICAgIyBjYXRjaCBub3RlcyBvblxuICAgICAgaWYgc3RhcnQgPCBiZWF0IGFuZCAoc3RhcnQgPj0gbGFzdEJlYXQgb3IgYmFyID4gbGFzdEJhcilcbiAgICAgICAgbm90ZXNPbi5wdXNoIHtrZXk6IG5vdGUua2V5fVxuXG4gICAgICAjIGNhdGNoIG5vdGVzIG9mZlxuICAgICAgaWYgZW5kIDwgYmVhdCBhbmQgKGVuZCA+PSBsYXN0QmVhdCBvciBiYXIgPiBsYXN0QmFyKVxuICAgICAgICBub3Rlc09mZi5wdXNoIHtrZXk6IG5vdGUua2V5fVxuXG4gICAgICAjIGNhdGNoIG5vdGVzIG9mZiBmb3Igbm90ZXMgZW5kaW5nIGV4dGFjdGx5IGF0IHRoZSBlbmQgb2YgYSBiYXJcbiAgICAgIGVsc2UgaWYgYmFyID4gbGFzdEJhciBhbmQgZW5kID09IHNlcXVlbmNlLmxvb3BTaXplXG4gICAgICAgIG5vdGVzT2ZmLnB1c2gge2tleTogbm90ZS5rZXl9XG5cbiAgICBpZiBtaWRpTWVzc2FnZXM/XG4gICAgICBtaWRpTWVzc2FnZXMuZm9yRWFjaCAobWVzc2FnZSwgaSkgLT5cbiAgICAgICAgaWYgbWVzc2FnZS50aW1lIDwgdGltZVxuICAgICAgICAgIG1pZGlNZXNzYWdlcy5zcGxpY2UgaSwgMVxuICAgICAgICAgIHN3aXRjaCBtZXNzYWdlLnR5cGVcbiAgICAgICAgICAgIHdoZW4gJ29uJ1xuICAgICAgICAgICAgICBub3Rlc09uLnB1c2gga2V5OiBtZXNzYWdlLmtleVxuICAgICAgICAgICAgd2hlbiAnb2ZmJ1xuICAgICAgICAgICAgICBub3Rlc09mZi5wdXNoIGtleTogbWVzc2FnZS5rZXlcblxuICAgIHtub3Rlc09uLCBub3Rlc09mZn1cbiJdfQ==
=======
},{"./analog_synthesizer":2,"./basic_sampler":3,"./drum_sampler":12,"./drum_synthesizer":13,"./loop_sampler":15}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2FuYWxvZ19zeW50aGVzaXplci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvYmFzaWNfc2FtcGxlci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9lbnZlbG9wZS5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9oaWdocGFzc19maWx0ZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvbGluZWFyX2ludGVycG9sYXRvci5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9sb2dfc2FtcGxlLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL2xvd3Bhc3NfZmlsdGVyLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL29zY2lsbGF0b3JzLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL3JpbmdfYnVmZmVyLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL3NpbXBsZV9lbnZlbG9wZS5jb2ZmZWUiLCIvVXNlcnMvY2hhcmxpZXNjaHdhYmFjaGVyL0NvZGUvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvZHJ1bV9zYW1wbGVyLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9kcnVtX3N5bnRoZXNpemVyLmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9pbnN0cnVtZW50LmNvZmZlZSIsIi9Vc2Vycy9jaGFybGllc2Nod2FiYWNoZXIvQ29kZS9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9sb29wX3NhbXBsZXIuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL3NvbmcuY29mZmVlIiwiL1VzZXJzL2NoYXJsaWVzY2h3YWJhY2hlci9Db2RlL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL3RyYWNrLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ1lBLElBQUEsVUFBQTs7QUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLG1CQUFSLENBQVAsQ0FBQTs7QUFBQSxJQUVBLEdBQU8sR0FBQSxDQUFBLElBRlAsQ0FBQTs7QUFBQSxJQUlJLENBQUMsU0FBTCxHQUFpQixPQUFBLENBQVEsNkJBQVIsQ0FKakIsQ0FBQTs7QUFBQSxJQU9JLENBQUMsU0FBTCxHQUFpQixTQUFDLENBQUQsR0FBQTtBQUNmLFVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFkO0FBQUEsU0FDTyxRQURQO2FBRUksSUFBSSxDQUFDLE1BQUwsQ0FBWSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQW5CLEVBRko7QUFB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LENBQVYsR0FBQTtBQUNuQixRQUFBLElBQUcsT0FBTyxDQUFDLElBQVIsR0FBZSxJQUFsQjtBQUNFLFVBQUEsWUFBWSxDQUFDLE1BQWIsQ0FBb0IsQ0FBcEIsRUFBdUIsQ0FBdkIsQ0FBQSxDQUFBO0FBQ0Esa0JBQU8sT0FBTyxDQUFDLElBQWY7QUFBQSxpQkFDTyxJQURQO3FCQUVJLE9BQU8sQ0FBQyxJQUFSLENBQWE7QUFBQSxnQkFBQSxHQUFBLEVBQUssT0FBTyxDQUFDLEdBQWI7ZUFBYixFQUZKO0FBQUEsaUJBR08sS0FIUDtxQkFJSSxRQUFRLENBQUMsSUFBVCxDQUFjO0FBQUEsZ0JBQUEsR0FBQSxFQUFLLE9BQU8sQ0FBQyxHQUFiO2VBQWQsRUFKSjtBQUFBLFdBRkY7U0FEbUI7TUFBQSxDQUFyQixDQUFBLENBREY7S0FoQkE7V0EwQkE7QUFBQSxNQUFDLFNBQUEsT0FBRDtBQUFBLE1BQVUsVUFBQSxRQUFWO01BM0JNO0VBQUEsQ0F0Q1IsQ0FBQTs7ZUFBQTs7SUFWRixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiMgdGhpcyBzY3JpcHQgaXMgcnVuIGluc2lkZSBhIHdvcmtlciBpbiBvcmRlciB0byBkbyBhdWRpbyBwcm9jZXNzaW5nIG91dHNpZGUgb2ZcbiMgdGhlIG1haW4gdWkgdGhyZWFkLlxuI1xuIyBUaGUgd29ya2VyIHJlY2VpdmVzIHRocmVlIHR5cGVzIG9mIG1lc3NhZ2VzIC0gJ3VwZGF0ZScgdy8ge3N0YXRlfSBjb250YWluaW5nXG4jIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzb25nLCAnbWlkaScgdy8ge21lc3NhZ2V9IGNvbnRhaW5pbmcgaW5jb21pbmcgbm90ZU9uXG4jIGFuZCBub3RlT2ZmIG1lc3NhZ2VzLCBhbmQgJ2J1ZmZlcicgdy8ge3NpemUsIGluZGV4LCBzYW1wbGVSYXRlfSByZXF1ZXN0aW5nXG4jIGEgYnVmZmVyIHRvIGJlIGZpbGxlZCBhbmQgc2VudCBiYWNrLlxuI1xuIyBJdCBhbHNvIHNlbmRzIHR3byB0eXBlcyBvZiBtZXNzYWdlcyAtICdmcmFtZScgbWVzc2FnZXMgYXQgNjBoeiBjb250YWluaW5nIHRoZVxuIyBjdXJyZW50IHBsYXliYWNrIHN0YXRlIGFzIHtmcmFtZX0sIGFuZCBzZW5kcyAnYnVmZmVyJyBtZXNzYWdlcyB0cmFuc2ZlcnJpbmdcbiMgZmlsbGVkIEFycmF5QnVmZmVycyBpbiByZXNwb25zZSB0byAnYnVmZmVyJyByZXF1ZXN0cy5cblxuU29uZyA9IHJlcXVpcmUgJy4vZHNwL3NvbmcuY29mZmVlJ1xuXG5zb25nID0gbmV3IFNvbmdcblxuc2VsZi5sb2dTYW1wbGUgPSByZXF1aXJlICcuL2RzcC9jb21wb25lbnRzL2xvZ19zYW1wbGUnXG5cbiMgcmVzcG9uZCB0byBtZXNzYWdlcyBmcm9tIHBhcmVudCB0aHJlYWRcbnNlbGYub25tZXNzYWdlID0gKGUpIC0+XG4gIHN3aXRjaCBlLmRhdGEudHlwZVxuICAgIHdoZW4gJ3VwZGF0ZSdcbiAgICAgIHNvbmcudXBkYXRlIGUuZGF0YS5zdGF0ZVxuICAgIHdoZW4gJ21pZGknXG4gICAgICBzb25nLm1pZGkgZS5kYXRhLm1lc3NhZ2VcbiAgICB3aGVuICdidWZmZXInXG4gICAgICBzb25nLmJ1ZmZlciBlLmRhdGEuc2l6ZSwgZS5kYXRhLmluZGV4LCBlLmRhdGEuc2FtcGxlUmF0ZSwgKGJ1ZmZlcikgLT5cbiAgICAgICAgcG9zdE1lc3NhZ2VcbiAgICAgICAgICB0eXBlOiAnYnVmZmVyJ1xuICAgICAgICAgIGJ1ZmZlcjogYnVmZmVyXG4gICAgICAgICwgW2J1ZmZlcl1cblxuIyB0cmlnZ2VyIHByb2Nlc3Npbmcgb24gc29uZyBhdCBmcmFtZSByYXRlIGFuZCBzZW5kIHVwZGF0ZXMgdG8gdGhlIHBhcmVudCB0aHJlYWRcbnNldEludGVydmFsIC0+XG4gIHNvbmcucHJvY2Vzc0ZyYW1lKClcbiAgcG9zdE1lc3NhZ2VcbiAgICB0eXBlOiAnZnJhbWUnXG4gICAgZnJhbWU6IHNvbmcuZ2V0U3RhdGUoKVxuLCAxMDAwIC8gNjBcbiIsIkluc3RydW1lbnQgPSByZXF1aXJlICcuL2luc3RydW1lbnQnXG5SaW5nQnVmZmVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL3JpbmdfYnVmZmVyJ1xubG93cGFzc0ZpbHRlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9sb3dwYXNzX2ZpbHRlcidcbmhpZ2hwYXNzRmlsdGVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2hpZ2hwYXNzX2ZpbHRlcidcbmVudmVsb3BlID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2VudmVsb3BlJ1xub3NjaWxsYXRvcnMgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvb3NjaWxsYXRvcnMnXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBBbmFsb2dTeW50aGVzaXplciBleHRlbmRzIEluc3RydW1lbnRcblxuICB0dW5lID0gNDQwXG4gIGZyZXF1ZW5jeSA9IChrZXkpIC0+XG4gICAgdHVuZSAqIE1hdGgucG93IDIsIChrZXkgLSA2OSkgLyAxMlxuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN1cGVyIHN0YXRlLCBpbnN0cnVtZW50XG5cbiAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVycyA9XG4gICAgICBMUDogKGxvd3Bhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIEhQOiAoaGlnaHBhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIG5vbmU6ICgoKHNhbXBsZSkgLT4gc2FtcGxlKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcblxuICBAc2FtcGxlOiAoc3RhdGUsIGluc3RydW1lbnQsIHRpbWUsIGkpIC0+XG4gICAgcmV0dXJuIDAgaWYgaW5zdHJ1bWVudC5sZXZlbCBpcyAwXG4gICAgcmV0dXJuIDAgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cblxuICAgIHIgPSBNYXRoLm1heCAwLjAxLCBpbnN0cnVtZW50LnZvbHVtZUVudi5yXG5cbiAgICAjIHN1bSBhbGwgYWN0aXZlIG5vdGVzXG4gICAgaW5zdHJ1bWVudC5sZXZlbCAqIHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlcy5yZWR1Y2UoKG1lbW8sIG5vdGUsIGluZGV4KSA9PlxuICAgICAgcmV0dXJuIG1lbW8gdW5sZXNzIG5vdGU/XG4gICAgICByZXR1cm4gbWVtbyBpZiB0aW1lID4gciArIG5vdGUudGltZU9mZlxuXG4gICAgICAjIHN1bSBvc2NpbGxhdG9ycyBhbmQgYXBwbHkgdm9sdW1lIGVudmVsb3BlXG4gICAgICBvc2MxRnJlcSA9IGZyZXF1ZW5jeSBub3RlLmtleSArIGluc3RydW1lbnQub3NjMS50dW5lIC0gMC41ICsgTWF0aC5yb3VuZCgyNCAqIChpbnN0cnVtZW50Lm9zYzEucGl0Y2ggLSAwLjUpKVxuICAgICAgb3NjMkZyZXEgPSBmcmVxdWVuY3kgbm90ZS5rZXkgKyBpbnN0cnVtZW50Lm9zYzIudHVuZSAtIDAuNSArIE1hdGgucm91bmQoMjQgKiAoaW5zdHJ1bWVudC5vc2MyLnBpdGNoIC0gMC41KSlcbiAgICAgIHNhbXBsZSA9IGVudmVsb3BlKGluc3RydW1lbnQudm9sdW1lRW52LCBub3RlLCB0aW1lKSAqIChcbiAgICAgICAgaW5zdHJ1bWVudC5vc2MxLmxldmVsICogb3NjaWxsYXRvcnNbaW5zdHJ1bWVudC5vc2MxLndhdmVmb3JtXSh0aW1lLCBvc2MxRnJlcSkgK1xuICAgICAgICBpbnN0cnVtZW50Lm9zYzIubGV2ZWwgKiBvc2NpbGxhdG9yc1tpbnN0cnVtZW50Lm9zYzIud2F2ZWZvcm1dKHRpbWUsIG9zYzJGcmVxKVxuICAgICAgKVxuXG4gICAgICAjIGFwcGx5IGZpbHRlciB3aXRoIGVudmVsb3BlXG4gICAgICBjdXRvZmYgPSBNYXRoLm1pbiAxLCBpbnN0cnVtZW50LmZpbHRlci5mcmVxICsgaW5zdHJ1bWVudC5maWx0ZXIuZW52ICogZW52ZWxvcGUoaW5zdHJ1bWVudC5maWx0ZXJFbnYsIG5vdGUsIHRpbWUpXG4gICAgICBmaWx0ZXIgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVyc1tpbnN0cnVtZW50LmZpbHRlci50eXBlXVtpbmRleF1cbiAgICAgIHNhbXBsZSA9IGZpbHRlciBzYW1wbGUsIGN1dG9mZiwgaW5zdHJ1bWVudC5maWx0ZXIucmVzXG5cbiAgICAgICMgcmV0dXJuIHJlc3VsdFxuICAgICAgbWVtbyArIHNhbXBsZVxuXG4gICAgLCAwKVxuIiwiSW5zdHJ1bWVudCA9IHJlcXVpcmUgJy4vaW5zdHJ1bWVudCdcblJpbmdCdWZmZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvcmluZ19idWZmZXInXG5saW5lYXJJbnRlcnBvbGF0b3IgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvbGluZWFyX2ludGVycG9sYXRvcidcbmxvd3Bhc3NGaWx0ZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvbG93cGFzc19maWx0ZXInXG5oaWdocGFzc0ZpbHRlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9oaWdocGFzc19maWx0ZXInXG5lbnZlbG9wZSA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9lbnZlbG9wZSdcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEJhc2ljU2FtcGxlciBleHRlbmRzIEluc3RydW1lbnRcblxuICBAZGVmYXVsdHM6XG4gICAgX3R5cGU6ICdCYXNpY1NhbXBsZXInXG4gICAgbGV2ZWw6IDAuNVxuICAgIHBhbjogMC41XG4gICAgcG9seXBob255OiAxXG4gICAgbWF4UG9seXBob255OiA2XG4gICAgcm9vdEtleTogNjBcbiAgICBzYW1wbGVEYXRhOiBudWxsXG4gICAgc2FtcGxlTmFtZTogJydcbiAgICBzdGFydDogMC4zXG4gICAgbG9vcEFjdGl2ZTogJ2xvb3AnXG4gICAgbG9vcDogMC43XG4gICAgdHVuZTogMC41XG4gICAgdm9sdW1lRW52OlxuICAgICAgYTogMFxuICAgICAgZDogMC4yNVxuICAgICAgczogMVxuICAgICAgcjogMC41XG4gICAgZmlsdGVyRW52OlxuICAgICAgYTogMFxuICAgICAgZDogMC4yNVxuICAgICAgczogMVxuICAgICAgcjogMC41XG4gICAgZmlsdGVyOlxuICAgICAgdHlwZTogJ25vbmUnXG4gICAgICBmcmVxOiAwLjI3XG4gICAgICByZXM6IDAuMDVcbiAgICAgIGVudjogMC40NVxuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN1cGVyIHN0YXRlLCBpbnN0cnVtZW50XG5cbiAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVycyA9XG4gICAgICBMUDogKGxvd3Bhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIEhQOiAoaGlnaHBhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIG5vbmU6ICgoKHNhbXBsZSkgLT4gc2FtcGxlKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcblxuICBAc2FtcGxlOiAoc3RhdGUsIGluc3RydW1lbnQsIHRpbWUsIGkpIC0+XG4gICAgcmV0dXJuIDAgaWYgaW5zdHJ1bWVudC5sZXZlbCBpcyAwXG4gICAgcmV0dXJuIDAgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cbiAgICByZXR1cm4gMCB1bmxlc3MgaW5zdHJ1bWVudC5zYW1wbGVEYXRhP1xuXG4gICAgciA9IE1hdGgubWF4IDAuMDEsIGluc3RydW1lbnQudm9sdW1lRW52LnJcblxuICAgICMgc3VtIGFsbCBhY3RpdmUgbm90ZXNcbiAgICBpbnN0cnVtZW50LmxldmVsICogc3RhdGVbaW5zdHJ1bWVudC5faWRdLm5vdGVzLnJlZHVjZSgobWVtbywgbm90ZSwgaW5kZXgpID0+XG4gICAgICByZXR1cm4gbWVtbyB1bmxlc3Mgbm90ZT9cbiAgICAgIHJldHVybiBtZW1vIGlmIHRpbWUgPiByICsgbm90ZS50aW1lT2ZmXG5cbiAgICAgICMgZ2V0IHBpdGNoIHNoaWZ0ZWQgaW50ZXJwb2xhdGVkIHNhbXBsZSBhbmQgYXBwbHkgdm9sdW1lIGVudmVsb3BlXG4gICAgICB0cmFuc3Bvc2UgPSBub3RlLmtleSAtIGluc3RydW1lbnQucm9vdEtleSArIGluc3RydW1lbnQudHVuZSAtIDAuNVxuICAgICAgc2FtcGxlc0VsYXBzZWQgPSBpIC0gbm90ZS5pXG4gICAgICBvZmZzZXQgPSBNYXRoLmZsb29yIGluc3RydW1lbnQuc3RhcnQgKiBpbnN0cnVtZW50LnNhbXBsZURhdGEubGVuZ3RoXG4gICAgICBsb29wQWN0aXZlID0gaW5zdHJ1bWVudC5sb29wQWN0aXZlIGlzICdsb29wJ1xuICAgICAgbG9vcFBvaW50ID0gTWF0aC5mbG9vciBpbnN0cnVtZW50Lmxvb3AgKiBpbnN0cnVtZW50LnNhbXBsZURhdGEubGVuZ3RoXG4gICAgICBzYW1wbGUgPSBsaW5lYXJJbnRlcnBvbGF0b3IgaW5zdHJ1bWVudC5zYW1wbGVEYXRhLCB0cmFuc3Bvc2UsIHNhbXBsZXNFbGFwc2VkLCBvZmZzZXQsIGxvb3BBY3RpdmUsIGxvb3BQb2ludFxuICAgICAgc2FtcGxlID0gZW52ZWxvcGUoaW5zdHJ1bWVudC52b2x1bWVFbnYsIG5vdGUsIHRpbWUpICogKHNhbXBsZSBvciAwKVxuXG4gICAgICAjIGFwcGx5IGZpbHRlciB3aXRoIGVudmVsb3BlXG4gICAgICBjdXRvZmYgPSBNYXRoLm1pbiAxLCBpbnN0cnVtZW50LmZpbHRlci5mcmVxICsgaW5zdHJ1bWVudC5maWx0ZXIuZW52ICogZW52ZWxvcGUoaW5zdHJ1bWVudC5maWx0ZXJFbnYsIG5vdGUsIHRpbWUpXG4gICAgICBmaWx0ZXIgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVyc1tpbnN0cnVtZW50LmZpbHRlci50eXBlXVtpbmRleF1cbiAgICAgIHNhbXBsZSA9IGZpbHRlciBzYW1wbGUsIGN1dG9mZiwgaW5zdHJ1bWVudC5maWx0ZXIucmVzXG5cbiAgICAgICMgcmV0dXJuIHJlc3VsdFxuICAgICAgbWVtbyArIHNhbXBsZVxuXG4gICAgLCAwKVxuIiwibWluRW52VmFsdWUgPSAwLjAxXG5cbm1vZHVsZS5leHBvcnRzID0gKGVudiwgbm90ZSwgdGltZSkgLT5cbiAgZWxhcHNlZCA9IHRpbWUgLSBub3RlLnRpbWVcbiAgYSA9IE1hdGgubWF4IG1pbkVudlZhbHVlLCBlbnYuYVxuICBkID0gTWF0aC5tYXggbWluRW52VmFsdWUsIGVudi5kXG4gIHMgPSBlbnYuc1xuICByID0gTWF0aC5tYXggbWluRW52VmFsdWUsIGVudi5yXG5cbiAgIyBhdHRhY2ssIGRlY2F5LCBzdXN0YWluXG4gIGwgPSBpZiBlbGFwc2VkID4gYSArIGRcbiAgICBsID0gc1xuICBlbHNlIGlmIGVsYXBzZWQgPiBhXG4gICAgbCA9IHMgKyAoMSAtIHMpICogKGEgKyBkIC0gZWxhcHNlZCkgLyBkXG4gIGVsc2VcbiAgICBlbGFwc2VkIC8gYVxuXG4gICMgcmVsZWFzZVxuICBpZiBub3RlLnRpbWVPZmZcbiAgICBsID0gbCAqIChub3RlLnRpbWVPZmYgKyByIC0gdGltZSkgLyByXG5cbiAgTWF0aC5tYXggMCwgbFxuIiwic2FtcGxlUmF0ZSA9IDQ4MDAwXG5tYXhGcmVxID0gMTIwMDBcbmRiR2FpbiA9IDEyICAgICMgZ2FpbiBvZiBmaWx0ZXJcbmJhbmR3aWR0aCA9IDEgICMgYmFuZHdpZHRoIGluIG9jdGF2ZXNcblxuIyBjb25zdGFudHNcbkEgPSBNYXRoLnBvdygxMCwgZGJHYWluIC8gNDApXG5lID0gTWF0aC5sb2coMilcbnRhdSA9IDIgKiBNYXRoLlBJXG5iZXRhID0gTWF0aC5zcXJ0KDIgKiBBKVxuXG4jIGh5cGVyYm9saWMgc2luIGZ1bmN0aW9uXG5zaW5oID0gKHgpIC0+XG4gIHkgPSBNYXRoLmV4cCB4XG4gICh5IC0gMSAvIHkpIC8gMlxuXG5tb2R1bGUuZXhwb3J0cyA9IC0+XG4gIGEwID0gYTEgPSBhMiA9IGEzID0gYTQgPSB4MSA9IHgyID0geTEgPSB5MiA9IDBcbiAgZnJlcSA9IG9tZWdhID0gc24gPSBhbHBoYSA9IDBcbiAgY3MgPSAxXG5cbiAgbGFzdEN1dG9mZiA9IDBcblxuICAoc2FtcGxlLCBjdXRvZmYpIC0+XG4gICAgIyBjYWNoZSBmaWx0ZXIgdmFsdWVzIHVudGlsIGN1dG9mZiBjaGFuZ2VzXG4gICAgaWYgY3V0b2ZmICE9IGxhc3RDdXRvZmZcbiAgXG4gICAgICBvbGRDdXRvZmYgPSBjdXRvZmZcblxuICAgICAgZnJlcSA9IGN1dG9mZiAqIG1heEZyZXFcbiAgICAgIG9tZWdhID0gdGF1ICogZnJlcSAvIHNhbXBsZVJhdGVcbiAgICAgIHNuID0gTWF0aC5zaW4gb21lZ2FcbiAgICAgIGNzID0gTWF0aC5jb3Mgb21lZ2FcbiAgICAgIGFscGhhID0gc24gKiBzaW5oKGUgLyAyICogYmFuZHdpZHRoICogb21lZ2EgLyBzbilcblxuICAgICAgYjAgPSAoMSArIGNzKSAvIDJcbiAgICAgIGIxID0gLSgxICsgY3MpXG4gICAgICBiMiA9ICgxICsgY3MpIC8gMlxuICAgICAgYWEwID0gMSArIGFscGhhXG4gICAgICBhYTEgPSAtMiAqIGNzXG4gICAgICBhYTIgPSAxIC0gYWxwaGFcblxuICAgICAgYTAgPSBiMCAvIGFhMFxuICAgICAgYTEgPSBiMSAvIGFhMFxuICAgICAgYTIgPSBiMiAvIGFhMFxuICAgICAgYTMgPSBhYTEgLyBhYTBcbiAgICAgIGE0ID0gYWEyIC8gYWEwXG5cbiAgICAjIGNvbXB1dGUgcmVzdWx0XG4gICAgcyA9IE1hdGgubWF4IC0xLCBNYXRoLm1pbiAxLCBzYW1wbGVcbiAgICByZXN1bHQgPSBhMCAqIHMgKyBhMSAqIHgxICsgYTIgKiB4MiAtIGEzICogeTEgLSBhNCAqIHkyXG5cbiAgICAjIHNoaWZ0IHgxIHRvIHgyLCBzYW1wbGUgdG8geDFcbiAgICB4MiA9IHgxXG4gICAgeDEgPSBzXG5cbiAgICAjIHNoaWZ0IHkxIHRvIHkyLCByZXN1bHQgdG8geTFcbiAgICB5MiA9IHkxXG4gICAgeTEgPSByZXN1bHRcblxuICAgIHJlc3VsdCIsIm1vZHVsZS5leHBvcnRzID0gKHNhbXBsZURhdGEsIHRyYW5zcG9zZSwgc2FtcGxlc0VsYXBzZWQsIG9mZnNldCA9IDAsIGxvb3BBY3RpdmUgPSBmYWxzZSwgbG9vcFBvaW50KSAtPlxuICBpID0gc2FtcGxlc0VsYXBzZWQgKiBNYXRoLnBvdyAyLCB0cmFuc3Bvc2UgLyAxMlxuICBpMSA9IE1hdGguZmxvb3IgaVxuICBpMSA9IGkxICUgKGxvb3BQb2ludCAtIG9mZnNldCkgaWYgbG9vcEFjdGl2ZVxuICBpMiA9IGkxICsgMVxuICBsID0gaSAlIDFcblxuICBzYW1wbGVEYXRhW29mZnNldCArIGkxXSAqICgxIC0gbCkgKyBzYW1wbGVEYXRhW29mZnNldCArIGkyXSAqIGwiLCJpID0gMFxubW9kdWxlLmV4cG9ydHMgPSAodikgLT5cbiAgY29uc29sZS5sb2codikgaWYgaSA9PSAwXG4gIGkgPSAoaSArIDEpICUgNzAwMFxuIiwic2FtcGxlUmF0ZSA9IDQ4MDAwXG5cbm1vZHVsZS5leHBvcnRzID0gLT5cblxuICB5MSA9IHkyID0geTMgPSB5NCA9IG9sZHggPSBvbGR5MSA9IG9sZHkyID0gb2xkeTMgPSAwXG4gIHAgPSBrID0gdDEgPSB0MiA9IHIgPSB4ID0gbnVsbFxuXG4gIChzYW1wbGUsIGN1dG9mZiwgcmVzKSAtPlxuICAgIGZyZXEgPSAyMCAqIE1hdGgucG93IDEwLCAzICogY3V0b2ZmXG4gICAgZnJlcSA9IGZyZXEgLyBzYW1wbGVSYXRlXG4gICAgcCA9IGZyZXEgKiAoMS44IC0gKDAuOCAqIGZyZXEpKVxuICAgIGsgPSAyICogTWF0aC5zaW4oZnJlcSAqIE1hdGguUEkgLyAyKSAtIDFcbiAgICB0MSA9ICgxIC0gcCkgKiAxLjM4NjI0OVxuICAgIHQyID0gMTIgKyB0MSAqIHQxXG4gICAgciA9IHJlcyAqIDAuNTcgKiAodDIgKyA2ICogdDEpIC8gKHQyIC0gNiAqIHQxKVxuXG4gICAgeCA9IHNhbXBsZSAtIHIgKiB5NFxuXG4gICAgIyBmb3VyIGNhc2NhZGVkIG9uZS1wb2xlIGZpbHRlcnMgKGJpbGluZWFyIHRyYW5zZm9ybSlcbiAgICB5MSA9ICB4ICogcCArIG9sZHggICogcCAtIGsgKiB5MVxuICAgIHkyID0geTEgKiBwICsgb2xkeTEgKiBwIC0gayAqIHkyXG4gICAgeTMgPSB5MiAqIHAgKyBvbGR5MiAqIHAgLSBrICogeTNcbiAgICB5NCA9IHkzICogcCArIG9sZHkzICogcCAtIGsgKiB5NFxuXG4gICAgIyBjbGlwcGVyIGJhbmQgbGltaXRlZCBzaWdtb2lkXG4gICAgeTQgLT0gKHk0ICogeTQgKiB5NCkgLyA2XG5cbiAgICBvbGR4ID0geFxuICAgIG9sZHkxID0geTFcbiAgICBvbGR5MiA9IHkyXG4gICAgb2xkeTMgPSB5M1xuXG4gICAgeTQiLCJ0YXUgPSBNYXRoLlBJICogMlxuXG5tb2R1bGUuZXhwb3J0cyA9XG5cbiAgc2luZTogKHRpbWUsIGZyZXF1ZW5jeSkgLT5cbiAgICBNYXRoLnNpbiB0aW1lICogdGF1ICogZnJlcXVlbmN5XG5cbiAgc3F1YXJlOiAodGltZSwgZnJlcXVlbmN5KSAtPlxuICAgIGlmICgodGltZSAlICgxIC8gZnJlcXVlbmN5KSkgKiBmcmVxdWVuY3kpICUgMSA+IDAuNSB0aGVuIDEgZWxzZSAtMVxuXG4gIHNhdzogKHRpbWUsIGZyZXF1ZW5jeSkgLT5cbiAgICAxIC0gMiAqICgoKHRpbWUgJSAoMSAvIGZyZXF1ZW5jeSkpICogZnJlcXVlbmN5KSAlIDEpXG5cbiAgbm9pc2U6IC0+XG4gICAgMiAqIE1hdGgucmFuZG9tKCkgLSAxIiwibW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSaW5nQnVmZmVyXG4gIFxuICBjb25zdHJ1Y3RvcjogKEBtYXhMZW5ndGgsIEBUeXBlID0gRmxvYXQzMkFycmF5LCBAbGVuZ3RoKSAtPlxuICAgIEBsZW5ndGggfHw9IEBtYXhMZW5ndGhcbiAgICBAYXJyYXkgPSBuZXcgQFR5cGUgQG1heExlbmd0aFxuICAgIEBwb3MgPSAwXG5cbiAgcmVzZXQ6IC0+XG4gICAgQGFycmF5ID0gbmV3IEBUeXBlIEBtYXhMZW5ndGhcbiAgICB0aGlzXG5cbiAgcmVzaXplOiAoQGxlbmd0aCkgLT5cbiAgICBAcG9zID0gMCBpZiBAcG9zID49IEBsZW5ndGhcblxuICBwdXNoOiAoZWwpIC0+XG4gICAgQGFycmF5W0Bwb3NdID0gZWxcbiAgICBAcG9zICs9IDFcbiAgICBAcG9zID0gMCBpZiBAcG9zID09IEBsZW5ndGhcbiAgICB0aGlzXG5cbiAgZm9yRWFjaDogKGZuKSAtPlxuICAgIGB2YXIgaSwgbGVuO1xuICAgIGZvciAoaSA9IHRoaXMucG9zLCBsZW4gPSB0aGlzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBmbih0aGlzLmFycmF5W2ldLCBpKTtcbiAgICB9XG4gICAgZm9yIChpID0gMCwgbGVuID0gdGhpcy5wb3M7IGkgPCBsZW47IGkrKykge1xuICAgICAgZm4odGhpcy5hcnJheVtpXSwgaSk7XG4gICAgfWBcbiAgICB0aGlzXG5cbiAgcmVkdWNlOiAoZm4sIG1lbW8gPSAwKSAtPlxuICAgIEBmb3JFYWNoIChlbCwgaSkgLT5cbiAgICAgIG1lbW8gPSBmbiBtZW1vLCBlbCwgaVxuICAgIG1lbW9cbiIsIm1vZHVsZS5leHBvcnRzID0gKGRlY2F5LCBlbGFwc2VkKSAtPlxuICBpZiBlbGFwc2VkID4gZGVjYXlcbiAgICAwXG4gIGVsc2VcbiAgICAxIC0gZWxhcHNlZCAvIGRlY2F5XG4iLCJJbnN0cnVtZW50ID0gcmVxdWlyZSAnLi9pbnN0cnVtZW50J1xuZW52ZWxvcGUgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvZW52ZWxvcGUnXG5saW5lYXJJbnRlcnBvbGF0b3IgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvbGluZWFyX2ludGVycG9sYXRvcidcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIERydW1TYW1wbGVyIGV4dGVuZHMgSW5zdHJ1bWVudFxuXG4gICMga2VlcCBub3RlcyBpbiBhIG1hcCB7a2V5OiBub3RlRGF0YX0gaW5zdGVhZCBvZiB0byBhIHJpbmcgYnVmZmVyXG4gICMgdGhpcyBnaXZlcyB1cyBvbmUgbW9ucGhvbmljIHZvaWNlIHBlciBkcnVtXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXSA9IG5vdGVzOiB7fVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICByZXR1cm4gMCBpZiBpbnN0cnVtZW50LmxldmVsIGlzIDBcbiAgICByZXR1cm4gMCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgIyBzdW0gYWxsIGFjdGl2ZSBub3Rlc1xuICAgIGluc3RydW1lbnQubGV2ZWwgKiBpbnN0cnVtZW50LmRydW1zLnJlZHVjZSgobWVtbywgZHJ1bSkgPT5cbiAgICAgIHJldHVybiBtZW1vIHVubGVzcyBkcnVtLnNhbXBsZURhdGE/XG5cbiAgICAgIG5vdGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNbZHJ1bS5rZXldXG4gICAgICByZXR1cm4gbWVtbyB1bmxlc3Mgbm90ZT9cblxuICAgICAgc2FtcGxlc0VsYXBzZWQgPSBpIC0gbm90ZS5pXG4gICAgICBvZmZzZXQgPSBNYXRoLmZsb29yIGRydW0uc3RhcnQgKiBkcnVtLnNhbXBsZURhdGEubGVuZ3RoXG4gICAgICByZXR1cm4gbWVtbyBpZiBzYW1wbGVzRWxhcHNlZCArIG9mZnNldCA+IGRydW0uc2FtcGxlRGF0YS5sZW5ndGhcblxuICAgICAgc2FtcGxlID0gbGluZWFySW50ZXJwb2xhdG9yIGRydW0uc2FtcGxlRGF0YSwgZHJ1bS50cmFuc3Bvc2UsIHNhbXBsZXNFbGFwc2VkLCBvZmZzZXRcbiAgICAgIG1lbW8gKyBkcnVtLmxldmVsICogZW52ZWxvcGUoZHJ1bS52b2x1bWVFbnYsIG5vdGUsIHRpbWUpICogKHNhbXBsZSBvciAwKVxuICAgICwgMClcblxuICBAdGljazogKHN0YXRlLCBpbnN0cnVtZW50LCB0aW1lLCBpLCBiZWF0LCBicHMsIG5vdGVzT24sIG5vdGVzT2ZmKSAtPlxuICAgIEBjcmVhdGVTdGF0ZSBzdGF0ZSwgaW5zdHJ1bWVudCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgbm90ZXNPZmYuZm9yRWFjaCAoe2tleX0pIC0+XG4gICAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNba2V5XT8udGltZU9mZiA9IHRpbWVcblxuICAgIG5vdGVzT24uZm9yRWFjaCAobm90ZSkgPT5cbiAgICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlc1tub3RlLmtleV0gPSB7dGltZSwgaX1cbiIsIkluc3RydW1lbnQgPSByZXF1aXJlICcuL2luc3RydW1lbnQnXG5oaWdocGFzc0ZpbHRlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9oaWdocGFzc19maWx0ZXInXG5zaW1wbGVFbnZlbG9wZSA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9zaW1wbGVfZW52ZWxvcGUnXG5vc2NpbGxhdG9ycyA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9vc2NpbGxhdG9ycydcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIERydW1TeW50aGVzaXplciBleHRlbmRzIEluc3RydW1lbnRcblxuICBtaW5GcmVxID0gNjBcbiAgbWF4RnJlcSA9IDMwMDBcbiAgZnJlcVNjYWxlID0gbWF4RnJlcSAtIG1pbkZyZXFcblxuICAjIGtlZXAgbm90ZXMgaW4gYSBtYXAge2tleTogbm90ZURhdGF9IGluc3RlYWQgb2YgaW4gYSByaW5nIGJ1ZmZlclxuICAjIHRoaXMgZ2l2ZXMgdXMgb25lIG1vbnBob25pYyB2b2ljZSBwZXIgZHJ1bS5cbiAgQGNyZWF0ZVN0YXRlOiAoc3RhdGUsIGluc3RydW1lbnQpIC0+XG4gICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdID1cbiAgICAgIG5vdGVzOiB7fVxuICAgICAgZmlsdGVyczogKFxuICAgICAgICBoaWdocGFzc0ZpbHRlcigpIGZvciBpIGluIFswLi4uMTI3XVxuICAgICAgKVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICByZXR1cm4gMCBpZiBpbnN0cnVtZW50LmxldmVsIGlzIDBcbiAgICByZXR1cm4gMCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgIyBzdW0gYWxsIGFjdGl2ZSBub3Rlc1xuICAgIGluc3RydW1lbnQubGV2ZWwgKiBpbnN0cnVtZW50LmRydW1zLnJlZHVjZSgobWVtbywgZHJ1bSkgPT5cbiAgICAgIG5vdGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNbZHJ1bS5rZXldXG4gICAgICByZXR1cm4gbWVtbyB1bmxlc3Mgbm90ZT9cblxuICAgICAgZWxhcHNlZCA9IHRpbWUgLSBub3RlLnRpbWVcbiAgICAgIHJldHVybiBtZW1vIGlmIGVsYXBzZWQgPiBkcnVtLmRlY2F5XG5cbiAgICAgIGVudiA9IHNpbXBsZUVudmVsb3BlIGRydW0uZGVjYXksIGVsYXBzZWRcbiAgICAgIGZyZXEgPSBtaW5GcmVxICsgZHJ1bS5waXRjaCAqIGZyZXFTY2FsZVxuXG4gICAgICAjIGFwcGx5IHBpdGNoIGJlbmRcbiAgICAgIGlmIGRydW0uYmVuZFxuICAgICAgICBmcmVxID0gKDIgLSBkcnVtLmJlbmQgKyBkcnVtLmJlbmQgKiBlbnYpIC8gMiAqIGZyZXFcblxuICAgICAgIyBhcHBseSBmbVxuICAgICAgaWYgZHJ1bS5mbSA+IDBcbiAgICAgICAgc2lnbmFsID0gb3NjaWxsYXRvcnMuc2luZSBlbGFwc2VkLCBtaW5GcmVxICsgZHJ1bS5mbUZyZXEgKiBmcmVxU2NhbGVcbiAgICAgICAgZnJlcSArPSBkcnVtLmZtICogc2lnbmFsICogc2ltcGxlRW52ZWxvcGUoZHJ1bS5mbURlY2F5ICsgMC4wMSwgZWxhcHNlZClcblxuICAgICAgIyBzdW0gbm9pc2UgYW5kIG9zY2lsbGF0b3JcbiAgICAgIHNhbXBsZSA9IChcbiAgICAgICAgKDEgLSBkcnVtLm5vaXNlKSAqIG9zY2lsbGF0b3JzLnNpbmUoZWxhcHNlZCwgZnJlcSkgK1xuICAgICAgICBkcnVtLm5vaXNlICogb3NjaWxsYXRvcnMubm9pc2UoKVxuICAgICAgKVxuXG4gICAgICAjIGFwcGx5IGhpZ2hwYXNzXG4gICAgICBpZiBkcnVtLmhwID4gMFxuICAgICAgICBzYW1wbGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVyc1tkcnVtLmtleV0gc2FtcGxlLCBkcnVtLmhwXG5cbiAgICAgIG1lbW8gKyBkcnVtLmxldmVsICogZW52ICogc2FtcGxlXG5cbiAgICAsIDApXG5cblxuICBAdGljazogKHN0YXRlLCBpbnN0cnVtZW50LCB0aW1lLCBpLCBiZWF0LCBicHMsIG5vdGVzT24sIG5vdGVzT2ZmKSAtPlxuICAgIEBjcmVhdGVTdGF0ZSBzdGF0ZSwgaW5zdHJ1bWVudCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgbm90ZXNPbi5mb3JFYWNoIChub3RlKSA9PlxuICAgICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdLm5vdGVzW25vdGUua2V5XSA9IHt0aW1lLCBpfVxuXG4iLCJSaW5nQnVmZmVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL3JpbmdfYnVmZmVyJ1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5zdHJ1bWVudFxuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXSA9XG4gICAgICBub3RlczogbmV3IFJpbmdCdWZmZXIgaW5zdHJ1bWVudC5tYXhQb2x5cGhvbnksIEFycmF5LCBpbnN0cnVtZW50LnBvbHlwaG9ueVxuICAgICAgbm90ZU1hcDoge31cblxuICBAcmVsZWFzZVN0YXRlOiAoc3RhdGUsIGluc3RydW1lbnQpIC0+XG4gICAgZGVsZXRlIHN0YXRlW2luc3RydW1lbnQuX2lkXVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICAwXG5cbiAgQHRpY2s6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSwgYmVhdCwgYnBzLCBub3Rlc09uLCBub3Rlc09mZikgLT5cbiAgICBAY3JlYXRlU3RhdGUgc3RhdGUsIGluc3RydW1lbnQgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cbiAgICBpbnN0cnVtZW50U3RhdGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF1cblxuICAgIGlmIGluc3RydW1lbnQucG9seXBob255ICE9IGluc3RydW1lbnRTdGF0ZS5ub3Rlcy5sZW5ndGhcbiAgICAgIGluc3RydW1lbnRTdGF0ZS5ub3Rlcy5yZXNpemUgaW5zdHJ1bWVudC5wb2x5cGhvbnlcblxuICAgIG5vdGVzT2ZmLmZvckVhY2ggKHtrZXl9KSAtPlxuICAgICAgIyBjb25zb2xlLmxvZyAnbm90ZSBvZmYgJyArIGtleVxuICAgICAgaW5zdHJ1bWVudFN0YXRlLm5vdGVNYXBba2V5XT8udGltZU9mZiA9IHRpbWVcblxuICAgIG5vdGVzT24uZm9yRWFjaCAoe2tleX0pIC0+XG4gICAgICAjIGNvbnNvbGUubG9nICdub3RlIG9uICcgKyBrZXlcbiAgICAgIGluc3RydW1lbnRTdGF0ZS5ub3RlTWFwW2tleV0gPSB7dGltZSwgaSwga2V5fVxuICAgICAgaW5zdHJ1bWVudFN0YXRlLm5vdGVzLnB1c2ggaW5zdHJ1bWVudFN0YXRlLm5vdGVNYXBba2V5XVxuXG4iLCJJbnN0cnVtZW50ID0gcmVxdWlyZSAnLi9pbnN0cnVtZW50J1xuUmluZ0J1ZmZlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9yaW5nX2J1ZmZlcidcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIExvb3BTYW1wbGVyIGV4dGVuZHMgSW5zdHJ1bWVudFxuIiwiVHJhY2sgPSByZXF1aXJlICcuL3RyYWNrJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFNvbmdcblxuICAjIG51bWJlciBvZiBzYW1wbGVzIHRvIHByb2Nlc3MgYmV0d2VlbiB0aWNrc1xuICBjbG9ja1JhdGlvID0gNDQxXG5cbiAgIyByYXRlIGF0IHdoaWNoIGxldmVsIG1ldGVycyBkZWNheVxuICBtZXRlckRlY2F5ID0gMC4wNVxuXG4gIGNsaXAgPSAoc2FtcGxlKSAtPlxuICAgIE1hdGgubWF4KDAsIE1hdGgubWluKDIsIHNhbXBsZSArIDEpKSAtIDFcblxuICBjb25zdHJ1Y3RvcjogLT5cbiAgICBAbGFzdEJlYXQgPSAwXG5cbiAgICAjIGtlZXAgbXV0YWJsZSBzdGF0ZSBmb3IgYXVkaW8gcGxheWJhY2sgaGVyZSAtIHRoaXMgd2lsbCBzdG9yZSB0aGluZ3MgbGlrZVxuICAgICMgZmlsdGVyIG1lbW9yeSBhbmQgbWV0ZXIgbGV2ZWxzIHRoYXQgbmVlZCB0byBzdGF5IG91dHNpZGUgdGhlIG5vcm1hbCBjdXJzb3JcbiAgICAjIHN0cnVjdHVyZSBmb3IgcGVyZm9ybWFuY2UgcmVhc29uc1xuICAgIEBzdGF0ZSA9IHt9XG5cbiAgICAjIGtlZXAgYSByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgc29uZyBkb2N1bWVudFxuICAgIEBzb25nID0gbnVsbFxuXG4gICAgIyBrZWVwIGEgbGlzdCBvZiB1bnByb2Nlc3NlZCBtaWRpIG1lc3NhZ2VzXG4gICAgQG1pZGlNZXNzYWdlcyA9IFtdXG5cbiAgdXBkYXRlOiAoc3RhdGUpIC0+XG4gICAgQHNvbmcgPSBzdGF0ZVxuXG4gIG1pZGk6IChtZXNzYWdlKSAtPlxuICAgIEBtaWRpTWVzc2FnZXMucHVzaCBtZXNzYWdlXG5cbiAgIyBmaWxsIGEgYnVmZmVyIGZ1bmN0aW9uXG4gIGJ1ZmZlcjogKHNpemUsIGluZGV4LCBzYW1wbGVSYXRlLCBjYikgLT5cbiAgICBhcnIgPSBuZXcgRmxvYXQzMkFycmF5IHNpemVcblxuICAgIGlmIEBzb25nP1xuICAgICAgZm9yIGkgaW4gWzAuLi5zaXplXVxuICAgICAgICBpaSA9IGluZGV4ICsgaVxuICAgICAgICB0ID0gaWkgLyBzYW1wbGVSYXRlXG4gICAgICAgIGFycltpXSA9IEBzYW1wbGUgdCwgaWlcblxuICAgIGNiIGFyci5idWZmZXJcblxuICAjIGNhbGxlZCBmb3IgZXZlcnkgc2FtcGxlIG9mIGF1ZGlvXG4gIHNhbXBsZTogKHRpbWUsIGkpID0+XG4gICAgQHRpY2sgdGltZSwgaSBpZiBpICUgY2xvY2tSYXRpbyBpcyAwXG5cbiAgICBjbGlwIEBzb25nLmxldmVsICogQHNvbmcudHJhY2tzLnJlZHVjZSgobWVtbywgdHJhY2spID0+XG4gICAgICBtZW1vICsgVHJhY2suc2FtcGxlIEBzdGF0ZSwgdHJhY2ssIHRpbWUsIGlcbiAgICAsIDApXG5cbiAgIyBjYWxsZWQgZm9yIGV2ZXJ5IGNsb2NrUmF0aW8gc2FtcGxlc1xuICB0aWNrOiAodGltZSwgaSkgPT5cbiAgICBicHMgPSBAc29uZy5icG0gLyA2MFxuICAgIGJlYXQgPSB0aW1lICogYnBzXG5cbiAgICBAc29uZy50cmFja3MuZm9yRWFjaCAodHJhY2ssIGluZGV4KSA9PlxuXG4gICAgICAjIGZvciBub3cgc2VuZCBtaWRpIG9ubHkgdG8gdGhlIGZpcnN0IHRyYWNrIC0gaW4gdGhlIGZ1dHVyZSB3ZSBzaG91bGRcbiAgICAgICMgYWxsb3cgdHJhY2tzIHRvIGJlIGFybWVkIGZvciByZWNvcmRpbmdcbiAgICAgIG1pZGlNZXNzYWdlcyA9IGlmIGluZGV4IGlzIEBzb25nLnNlbGVjdGVkVHJhY2sgdGhlbiBAbWlkaU1lc3NhZ2VzIGVsc2UgbnVsbFxuXG4gICAgICBUcmFjay50aWNrIEBzdGF0ZSwgdHJhY2ssIG1pZGlNZXNzYWdlcywgdGltZSwgaSwgYmVhdCwgQGxhc3RCZWF0LCBicHNcblxuICAgIEBsYXN0QmVhdCA9IGJlYXRcblxuICAjIGNhbGxlZCBwZXJpb2RpY2FsbHkgdG8gcGFzcyBoaWdoIGZyZXF1ZW5jeSBkYXRhIHRvIHRoZSB1aS4uIHRoaXMgc2hvdWxkXG4gICMgZXZlbnR1YWxseSBiZSB1cGRhdGVkIHRvIGJhc2UgdGhlIGFtb3VudCBvZiBkZWNheSBvbiB0aGUgYWN0dWFsIGVscGFzZWQgdGltZVxuICBwcm9jZXNzRnJhbWU6IC0+XG4gICAgaWYgQHNvbmc/LnRyYWNrcz9cbiAgICAgICMgYXBwbHkgZGVjYXkgdG8gbWV0ZXIgbGV2ZWxzXG4gICAgICBmb3IgdHJhY2sgaW4gQHNvbmcudHJhY2tzXG4gICAgICAgIGlmIEBzdGF0ZVt0cmFjay5faWRdP1xuICAgICAgICAgIEBzdGF0ZVt0cmFjay5faWRdLm1ldGVyTGV2ZWwgLT0gbWV0ZXJEZWNheVxuXG4gICMgZ2V0IGEgc2VuZGFibGUgdmVyc2lvbiBvZiBjdXJyZW50IHNvbmcgcGxheWJhY2sgc3RhdGVcbiAgZ2V0U3RhdGU6IC0+XG4gICAgbWV0ZXJMZXZlbHM6IEBzb25nPy50cmFja3M/LnJlZHVjZSgobWVtbywgdHJhY2spID0+XG4gICAgICBtZW1vW3RyYWNrLl9pZF0gPSBAc3RhdGVbdHJhY2suX2lkXT8ubWV0ZXJMZXZlbFxuICAgICAgbWVtb1xuICAgICwge30pXG4iLCJpbnN0cnVtZW50VHlwZXMgPVxuICBBbmFsb2dTeW50aGVzaXplcjogcmVxdWlyZSAnLi9hbmFsb2dfc3ludGhlc2l6ZXInXG4gIEJhc2ljU2FtcGxlcjogcmVxdWlyZSAnLi9iYXNpY19zYW1wbGVyJ1xuICBEcnVtU2FtcGxlcjogcmVxdWlyZSAnLi9kcnVtX3NhbXBsZXInXG4gIERydW1TeW50aGVzaXplcjogcmVxdWlyZSAnLi9kcnVtX3N5bnRoZXNpemVyJ1xuICBMb29wU2FtcGxlcjogcmVxdWlyZSAnLi9sb29wX3NhbXBsZXInXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBUcmFja1xuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCB0cmFjaykgLT5cbiAgICBzdGF0ZVt0cmFjay5faWRdID1cbiAgICAgIG1ldGVyTGV2ZWw6IDBcblxuICBAcmVsZWFzZVN0YXRlOiAoc3RhdGUsIHRyYWNrKSAtPlxuICAgIGRlbGV0ZSBzdGF0ZVt0cmFjay5faWRdXG5cbiAgQHNhbXBsZTogKHN0YXRlLCB0cmFjaywgdGltZSwgaSkgLT5cbiAgICAjIGdldCBpbnN0cnVtZW50IG91dHB1dFxuICAgIEluc3RydW1lbnQgPSBpbnN0cnVtZW50VHlwZXNbdHJhY2suaW5zdHJ1bWVudC5fdHlwZV1cbiAgICBzYW1wbGUgPSBJbnN0cnVtZW50LnNhbXBsZSBzdGF0ZSwgdHJhY2suaW5zdHJ1bWVudCwgdGltZSwgaVxuXG4gICAgIyBhcHBseSBlZmZlY3RzXG4gICAgc2FtcGxlID0gdHJhY2suZWZmZWN0cy5yZWR1Y2UoKHNhbXBsZSwgZWZmZWN0KSAtPlxuICAgICAgRWZmZWN0LnNhbXBsZSBzdGF0ZSwgZWZmZWN0LCB0aW1lLCBpLCBzYW1wbGVcbiAgICAsIHNhbXBsZSlcblxuICAgICMgdXBkYXRlIG1ldGVyIGxldmVsc1xuICAgIGlmIHRyYWNrU3RhdGUgPSBzdGF0ZVt0cmFjay5faWRdXG4gICAgICBsZXZlbCA9IHRyYWNrU3RhdGUubWV0ZXJMZXZlbFxuICAgICAgaWYgbm90IGxldmVsPyBvciBpc05hTihsZXZlbCkgb3Igc2FtcGxlID4gbGV2ZWxcbiAgICAgICAgdHJhY2tTdGF0ZS5tZXRlckxldmVsID0gc2FtcGxlXG5cbiAgICBzYW1wbGVcblxuICBAdGljazogKHN0YXRlLCB0cmFjaywgbWlkaU1lc3NhZ2VzLCB0aW1lLCBpLCBiZWF0LCBsYXN0QmVhdCwgYnBzKSAtPlxuICAgIEBjcmVhdGVTdGF0ZSBzdGF0ZSwgdHJhY2sgdW5sZXNzIHN0YXRlW3RyYWNrLl9pZF0/XG5cbiAgICBJbnN0cnVtZW50ID0gaW5zdHJ1bWVudFR5cGVzW3RyYWNrLmluc3RydW1lbnQuX3R5cGVdXG5cbiAgICAjIGdldCBub3RlcyBvbiBmcm9tIHNlcXVlbmNlXG4gICAge25vdGVzT24sIG5vdGVzT2ZmfSA9IEBub3RlcyB0cmFjay5zZXF1ZW5jZSwgbWlkaU1lc3NhZ2VzLCB0aW1lLCBiZWF0LCBsYXN0QmVhdFxuXG4gICAgSW5zdHJ1bWVudC50aWNrIHN0YXRlLCB0cmFjay5pbnN0cnVtZW50LCB0aW1lLCBpLCBiZWF0LCBicHMsIG5vdGVzT24sIG5vdGVzT2ZmXG4gICAgdHJhY2suZWZmZWN0cy5mb3JFYWNoIChlKSAtPiBlLnRpY2sgc3RhdGUsIHRpbWUsIGJlYXQsIGJwc1xuXG4gICMgbG9vayBhdCBzZXF1ZW5jZSBhbmQgbWlkaSBtZXNzYWdlcywgcmV0dXJuIGFycmF5cyBvZiBub3RlcyBvbiBhbmQgb2ZmXG4gICMgb2NjdXJyaW5nIGluIHRoaXMgdGlja1xuICBAbm90ZXM6IChzZXF1ZW5jZSwgbWlkaU1lc3NhZ2VzLCB0aW1lLCBiZWF0LCBsYXN0QmVhdCkgLT5cbiAgICBiYXIgPSBNYXRoLmZsb29yIGJlYXQgLyBzZXF1ZW5jZS5sb29wU2l6ZVxuICAgIGxhc3RCYXIgPSBNYXRoLmZsb29yIGxhc3RCZWF0IC8gc2VxdWVuY2UubG9vcFNpemVcbiAgICBiZWF0ID0gYmVhdCAlIHNlcXVlbmNlLmxvb3BTaXplXG4gICAgbGFzdEJlYXQgPSBsYXN0QmVhdCAlIHNlcXVlbmNlLmxvb3BTaXplXG5cbiAgICBub3Rlc09uID0gW11cbiAgICBub3Rlc09mZiA9IFtdXG5cbiAgICBmb3IgaWQsIG5vdGUgb2Ygc2VxdWVuY2Uubm90ZXNcbiAgICAgIHN0YXJ0ID0gbm90ZS5zdGFydFxuICAgICAgZW5kID0gbm90ZS5zdGFydCArIG5vdGUubGVuZ3RoXG4gICAgICBpZiBzdGFydCA8IGJlYXQgYW5kIChzdGFydCA+PSBsYXN0QmVhdCBvciBiYXIgPiBsYXN0QmFyKVxuICAgICAgICBub3Rlc09uLnB1c2gge2tleTogbm90ZS5rZXl9XG4gICAgICBpZiBlbmQgPCBiZWF0IGFuZCAoZW5kID49IGxhc3RCZWF0IG9yIGJhciA+IGxhc3RCYXIpXG4gICAgICAgIG5vdGVzT2ZmLnB1c2gge2tleTogbm90ZS5rZXl9XG5cbiAgICBpZiBtaWRpTWVzc2FnZXM/XG4gICAgICBtaWRpTWVzc2FnZXMuZm9yRWFjaCAobWVzc2FnZSwgaSkgLT5cbiAgICAgICAgaWYgbWVzc2FnZS50aW1lIDwgdGltZVxuICAgICAgICAgIG1pZGlNZXNzYWdlcy5zcGxpY2UgaSwgMVxuICAgICAgICAgIHN3aXRjaCBtZXNzYWdlLnR5cGVcbiAgICAgICAgICAgIHdoZW4gJ29uJ1xuICAgICAgICAgICAgICBub3Rlc09uLnB1c2gga2V5OiBtZXNzYWdlLmtleVxuICAgICAgICAgICAgd2hlbiAnb2ZmJ1xuICAgICAgICAgICAgICBub3Rlc09mZi5wdXNoIGtleTogbWVzc2FnZS5rZXlcblxuICAgIHtub3Rlc09uLCBub3Rlc09mZn1cbiJdfQ==
>>>>>>> display names, update react version
