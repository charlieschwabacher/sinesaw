(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Song, song;

Song = require('./dsp/song.coffee');

song = new Song;

self.logSample = require('./dsp/components/log_sample');

self.onmessage = function(e) {
  switch (e.data.type) {
    case 'update':
      return song.update(e.data.state);
    case 'midi':
      return song.midi(e.data.message);
    case 'buffer':
      return song.buffer(e.data.size, e.data.index, e.data.sampleRate, function(buffer) {
        return postMessage({
          type: 'buffer',
          buffer: buffer
        }, [buffer]);
      });
  }
};

setInterval(function() {
  song.processFrame();
  return postMessage({
    type: 'frame',
    frame: song.getState()
  });
}, 1000 / 60);



},{"./dsp/components/log_sample":7,"./dsp/song.coffee":16}],2:[function(require,module,exports){
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

  AnalogSynthesizer.sample = function(state, instrument, time, i) {
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



},{"./components/envelope":4,"./components/highpass_filter":5,"./components/lowpass_filter":8,"./components/oscillators":9,"./components/ring_buffer":10,"./instrument":14}],3:[function(require,module,exports){
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

  BasicSampler.defaults = {
    _type: 'BasicSampler',
    level: 0.5,
    pan: 0.5,
    polyphony: 1,
    maxPolyphony: 6,
    rootKey: 60,
    sampleData: null,
    sampleName: '',
    start: 0.3,
    loopActive: 'loop',
    loop: 0.7,
    tune: 0.5,
    volumeEnv: {
      a: 0,
      d: 0.25,
      s: 1,
      r: 0.5
    },
    filterEnv: {
      a: 0,
      d: 0.25,
      s: 1,
      r: 0.5
    },
    filter: {
      type: 'none',
      freq: 0.27,
      res: 0.05,
      env: 0.45
    }
  };

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

  BasicSampler.sample = function(state, instrument, time, i) {
    var r;
    if (instrument.level === 0) {
      return 0;
    }
    if (state[instrument._id] == null) {
      return 0;
    }
    if (instrument.sampleData == null) {
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
        offset = Math.floor(instrument.start * instrument.sampleData.length);
        loopActive = instrument.loopActive === 'loop';
        loopPoint = Math.floor(instrument.loop * instrument.sampleData.length);
        sample = linearInterpolator(instrument.sampleData, transpose, samplesElapsed, offset, loopActive, loopPoint);
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



},{"./components/envelope":4,"./components/highpass_filter":5,"./components/linear_interpolator":6,"./components/lowpass_filter":8,"./components/ring_buffer":10,"./instrument":14}],4:[function(require,module,exports){
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



},{}],5:[function(require,module,exports){
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



},{}],6:[function(require,module,exports){
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



},{}],7:[function(require,module,exports){
var i;

i = 0;

module.exports = function(v) {
  if (i === 0) {
    console.log(v);
  }
  return i = (i + 1) % 7000;
};



},{}],8:[function(require,module,exports){
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



},{}],9:[function(require,module,exports){
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



},{}],10:[function(require,module,exports){
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



},{}],11:[function(require,module,exports){
module.exports = function(decay, elapsed) {
  if (elapsed > decay) {
    return 0;
  } else {
    return 1 - elapsed / decay;
  }
};



},{}],12:[function(require,module,exports){
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

  DrumSampler.sample = function(state, instrument, time, i) {
    if (instrument.level === 0) {
      return 0;
    }
    if (state[instrument._id] == null) {
      return 0;
    }
    return instrument.level * instrument.drums.reduce((function(_this) {
      return function(memo, drum) {
        var note, offset, sample, samplesElapsed;
        if (drum.sampleData == null) {
          return memo;
        }
        note = state[instrument._id].notes[drum.key];
        if (note == null) {
          return memo;
        }
        samplesElapsed = i - note.i;
        offset = Math.floor(drum.start * drum.sampleData.length);
        if (samplesElapsed + offset > drum.sampleData.length) {
          return memo;
        }
        sample = linearInterpolator(drum.sampleData, drum.transpose, samplesElapsed, offset);
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



},{"./components/envelope":4,"./components/linear_interpolator":6,"./instrument":14}],13:[function(require,module,exports){
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

  DrumSynthesizer.sample = function(state, instrument, time, i) {
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



},{"./components/highpass_filter":5,"./components/oscillators":9,"./components/simple_envelope":11,"./instrument":14}],14:[function(require,module,exports){
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

  Instrument.sample = function(state, instrument, time, i) {
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



},{"./components/ring_buffer":10}],15:[function(require,module,exports){
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



},{"./components/ring_buffer":10,"./instrument":14}],16:[function(require,module,exports){
var Song, Track,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Track = require('./track');

module.exports = Song = (function() {
  var clip, clockRatio, meterDecay;

  clockRatio = 441;

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
    this.midiMessages = [];
  }

  Song.prototype.update = function(state) {
    return this.song = state;
  };

  Song.prototype.midi = function(message) {
    return this.midiMessages.push(message);
  };

  Song.prototype.buffer = function(size, index, sampleRate, cb) {
    var arr, i, ii, j, ref, t;
    arr = new Float32Array(size);
    if (this.song != null) {
      for (i = j = 0, ref = size; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        ii = index + i;
        t = ii / sampleRate;
        arr[i] = this.sample(t, ii);
      }
    }
    return cb(arr.buffer);
  };

  Song.prototype.sample = function(time, i) {
    if (i % clockRatio === 0) {
      this.tick(time, i);
    }
    return clip(this.song.level * this.song.tracks.reduce((function(_this) {
      return function(memo, track) {
        return memo + Track.sample(_this.state, track, time, i);
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



},{"./track":17}],17:[function(require,module,exports){
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

  Track.sample = function(state, track, time, i) {
    var Instrument, level, sample, trackState;
    Instrument = instrumentTypes[track.instrument._type];
    sample = Instrument.sample(state, track.instrument, time, i);
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



},{"./analog_synthesizer":2,"./basic_sampler":3,"./drum_sampler":12,"./drum_synthesizer":13,"./loop_sampler":15}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZXJ3YWxsZXIvUHJvamVjdHMvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AuY29mZmVlIiwiL1VzZXJzL2Vyd2FsbGVyL1Byb2plY3RzL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2FuYWxvZ19zeW50aGVzaXplci5jb2ZmZWUiLCIvVXNlcnMvZXJ3YWxsZXIvUHJvamVjdHMvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvYmFzaWNfc2FtcGxlci5jb2ZmZWUiLCIvVXNlcnMvZXJ3YWxsZXIvUHJvamVjdHMvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9lbnZlbG9wZS5jb2ZmZWUiLCIvVXNlcnMvZXJ3YWxsZXIvUHJvamVjdHMvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9oaWdocGFzc19maWx0ZXIuY29mZmVlIiwiL1VzZXJzL2Vyd2FsbGVyL1Byb2plY3RzL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL2NvbXBvbmVudHMvbGluZWFyX2ludGVycG9sYXRvci5jb2ZmZWUiLCIvVXNlcnMvZXJ3YWxsZXIvUHJvamVjdHMvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvY29tcG9uZW50cy9sb2dfc2FtcGxlLmNvZmZlZSIsIi9Vc2Vycy9lcndhbGxlci9Qcm9qZWN0cy9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL2xvd3Bhc3NfZmlsdGVyLmNvZmZlZSIsIi9Vc2Vycy9lcndhbGxlci9Qcm9qZWN0cy9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL29zY2lsbGF0b3JzLmNvZmZlZSIsIi9Vc2Vycy9lcndhbGxlci9Qcm9qZWN0cy9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL3JpbmdfYnVmZmVyLmNvZmZlZSIsIi9Vc2Vycy9lcndhbGxlci9Qcm9qZWN0cy9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9jb21wb25lbnRzL3NpbXBsZV9lbnZlbG9wZS5jb2ZmZWUiLCIvVXNlcnMvZXJ3YWxsZXIvUHJvamVjdHMvc2luZXNhdy9hcHAvc2NyaXB0cy9kc3AvZHJ1bV9zYW1wbGVyLmNvZmZlZSIsIi9Vc2Vycy9lcndhbGxlci9Qcm9qZWN0cy9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9kcnVtX3N5bnRoZXNpemVyLmNvZmZlZSIsIi9Vc2Vycy9lcndhbGxlci9Qcm9qZWN0cy9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9pbnN0cnVtZW50LmNvZmZlZSIsIi9Vc2Vycy9lcndhbGxlci9Qcm9qZWN0cy9zaW5lc2F3L2FwcC9zY3JpcHRzL2RzcC9sb29wX3NhbXBsZXIuY29mZmVlIiwiL1VzZXJzL2Vyd2FsbGVyL1Byb2plY3RzL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL3NvbmcuY29mZmVlIiwiL1VzZXJzL2Vyd2FsbGVyL1Byb2plY3RzL3NpbmVzYXcvYXBwL3NjcmlwdHMvZHNwL3RyYWNrLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ1lBLElBQUEsVUFBQTs7QUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLG1CQUFSLENBQVAsQ0FBQTs7QUFBQSxJQUVBLEdBQU8sR0FBQSxDQUFBLElBRlAsQ0FBQTs7QUFBQSxJQUlJLENBQUMsU0FBTCxHQUFpQixPQUFBLENBQVEsNkJBQVIsQ0FKakIsQ0FBQTs7QUFBQSxJQU9JLENBQUMsU0FBTCxHQUFpQixTQUFDLENBQUQsR0FBQTtBQUNmLFVBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFkO0FBQUEsU0FDTyxRQURQO2FBRUksSUFBSSxDQUFDLE1BQUwsQ0FBWSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQW5CLEVBRko7QUFBQSxTQUdPLE1BSFA7YUFJSSxJQUFJLENBQUMsSUFBTCxDQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBakIsRUFKSjtBQUFBLFNBS08sUUFMUDthQU1JLElBQUksQ0FBQyxNQUFM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Q0FBQSxDQUFBO0FBQ0Esa0JBQU8sT0FBTyxDQUFDLElBQWY7QUFBQSxpQkFDTyxJQURQO3FCQUVJLE9BQU8sQ0FBQyxJQUFSLENBQWE7QUFBQSxnQkFBQSxHQUFBLEVBQUssT0FBTyxDQUFDLEdBQWI7ZUFBYixFQUZKO0FBQUEsaUJBR08sS0FIUDtxQkFJSSxRQUFRLENBQUMsSUFBVCxDQUFjO0FBQUEsZ0JBQUEsR0FBQSxFQUFLLE9BQU8sQ0FBQyxHQUFiO2VBQWQsRUFKSjtBQUFBLFdBRkY7U0FEbUI7TUFBQSxDQUFyQixDQUFBLENBREY7S0FoQkE7V0EwQkE7QUFBQSxNQUFDLFNBQUEsT0FBRDtBQUFBLE1BQVUsVUFBQSxRQUFWO01BM0JNO0VBQUEsQ0F0Q1IsQ0FBQTs7ZUFBQTs7SUFWRixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiMgdGhpcyBzY3JpcHQgaXMgcnVuIGluc2lkZSBhIHdvcmtlciBpbiBvcmRlciB0byBkbyBhdWRpbyBwcm9jZXNzaW5nIG91dHNpZGUgb2ZcbiMgdGhlIG1haW4gdWkgdGhyZWFkLlxuI1xuIyBUaGUgd29ya2VyIHJlY2VpdmVzIHRocmVlIHR5cGVzIG9mIG1lc3NhZ2VzIC0gJ3VwZGF0ZScgdy8ge3N0YXRlfSBjb250YWluaW5nXG4jIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBzb25nLCAnbWlkaScgdy8ge21lc3NhZ2V9IGNvbnRhaW5pbmcgaW5jb21pbmcgbm90ZU9uXG4jIGFuZCBub3RlT2ZmIG1lc3NhZ2VzLCBhbmQgJ2J1ZmZlcicgdy8ge3NpemUsIGluZGV4LCBzYW1wbGVSYXRlfSByZXF1ZXN0aW5nXG4jIGEgYnVmZmVyIHRvIGJlIGZpbGxlZCBhbmQgc2VudCBiYWNrLlxuI1xuIyBJdCBhbHNvIHNlbmRzIHR3byB0eXBlcyBvZiBtZXNzYWdlcyAtICdmcmFtZScgbWVzc2FnZXMgYXQgNjBoeiBjb250YWluaW5nIHRoZVxuIyBjdXJyZW50IHBsYXliYWNrIHN0YXRlIGFzIHtmcmFtZX0sIGFuZCBzZW5kcyAnYnVmZmVyJyBtZXNzYWdlcyB0cmFuc2ZlcnJpbmdcbiMgZmlsbGVkIEFycmF5QnVmZmVycyBpbiByZXNwb25zZSB0byAnYnVmZmVyJyByZXF1ZXN0cy5cblxuU29uZyA9IHJlcXVpcmUgJy4vZHNwL3NvbmcuY29mZmVlJ1xuXG5zb25nID0gbmV3IFNvbmdcblxuc2VsZi5sb2dTYW1wbGUgPSByZXF1aXJlICcuL2RzcC9jb21wb25lbnRzL2xvZ19zYW1wbGUnXG5cbiMgcmVzcG9uZCB0byBtZXNzYWdlcyBmcm9tIHBhcmVudCB0aHJlYWRcbnNlbGYub25tZXNzYWdlID0gKGUpIC0+XG4gIHN3aXRjaCBlLmRhdGEudHlwZVxuICAgIHdoZW4gJ3VwZGF0ZSdcbiAgICAgIHNvbmcudXBkYXRlIGUuZGF0YS5zdGF0ZVxuICAgIHdoZW4gJ21pZGknXG4gICAgICBzb25nLm1pZGkgZS5kYXRhLm1lc3NhZ2VcbiAgICB3aGVuICdidWZmZXInXG4gICAgICBzb25nLmJ1ZmZlciBlLmRhdGEuc2l6ZSwgZS5kYXRhLmluZGV4LCBlLmRhdGEuc2FtcGxlUmF0ZSwgKGJ1ZmZlcikgLT5cbiAgICAgICAgcG9zdE1lc3NhZ2VcbiAgICAgICAgICB0eXBlOiAnYnVmZmVyJ1xuICAgICAgICAgIGJ1ZmZlcjogYnVmZmVyXG4gICAgICAgICwgW2J1ZmZlcl1cblxuIyB0cmlnZ2VyIHByb2Nlc3Npbmcgb24gc29uZyBhdCBmcmFtZSByYXRlIGFuZCBzZW5kIHVwZGF0ZXMgdG8gdGhlIHBhcmVudCB0aHJlYWRcbnNldEludGVydmFsIC0+XG4gIHNvbmcucHJvY2Vzc0ZyYW1lKClcbiAgcG9zdE1lc3NhZ2VcbiAgICB0eXBlOiAnZnJhbWUnXG4gICAgZnJhbWU6IHNvbmcuZ2V0U3RhdGUoKVxuLCAxMDAwIC8gNjBcbiIsIkluc3RydW1lbnQgPSByZXF1aXJlICcuL2luc3RydW1lbnQnXG5SaW5nQnVmZmVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL3JpbmdfYnVmZmVyJ1xubG93cGFzc0ZpbHRlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9sb3dwYXNzX2ZpbHRlcidcbmhpZ2hwYXNzRmlsdGVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2hpZ2hwYXNzX2ZpbHRlcidcbmVudmVsb3BlID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL2VudmVsb3BlJ1xub3NjaWxsYXRvcnMgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvb3NjaWxsYXRvcnMnXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBBbmFsb2dTeW50aGVzaXplciBleHRlbmRzIEluc3RydW1lbnRcblxuICB0dW5lID0gNDQwXG4gIGZyZXF1ZW5jeSA9IChrZXkpIC0+XG4gICAgdHVuZSAqIE1hdGgucG93IDIsIChrZXkgLSA2OSkgLyAxMlxuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN1cGVyIHN0YXRlLCBpbnN0cnVtZW50XG5cbiAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVycyA9XG4gICAgICBMUDogKGxvd3Bhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIEhQOiAoaGlnaHBhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIG5vbmU6ICgoKHNhbXBsZSkgLT4gc2FtcGxlKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcblxuICBAc2FtcGxlOiAoc3RhdGUsIGluc3RydW1lbnQsIHRpbWUsIGkpIC0+XG4gICAgcmV0dXJuIDAgaWYgaW5zdHJ1bWVudC5sZXZlbCBpcyAwXG4gICAgcmV0dXJuIDAgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cblxuICAgIHIgPSBNYXRoLm1heCAwLjAxLCBpbnN0cnVtZW50LnZvbHVtZUVudi5yXG5cbiAgICAjIHN1bSBhbGwgYWN0aXZlIG5vdGVzXG4gICAgaW5zdHJ1bWVudC5sZXZlbCAqIHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlcy5yZWR1Y2UoKG1lbW8sIG5vdGUsIGluZGV4KSA9PlxuICAgICAgcmV0dXJuIG1lbW8gdW5sZXNzIG5vdGU/XG4gICAgICByZXR1cm4gbWVtbyBpZiB0aW1lID4gciArIG5vdGUudGltZU9mZlxuXG4gICAgICAjIHN1bSBvc2NpbGxhdG9ycyBhbmQgYXBwbHkgdm9sdW1lIGVudmVsb3BlXG4gICAgICBvc2MxRnJlcSA9IGZyZXF1ZW5jeSBub3RlLmtleSArIGluc3RydW1lbnQub3NjMS50dW5lIC0gMC41ICsgTWF0aC5yb3VuZCgyNCAqIChpbnN0cnVtZW50Lm9zYzEucGl0Y2ggLSAwLjUpKVxuICAgICAgb3NjMkZyZXEgPSBmcmVxdWVuY3kgbm90ZS5rZXkgKyBpbnN0cnVtZW50Lm9zYzIudHVuZSAtIDAuNSArIE1hdGgucm91bmQoMjQgKiAoaW5zdHJ1bWVudC5vc2MyLnBpdGNoIC0gMC41KSlcbiAgICAgIHNhbXBsZSA9IGVudmVsb3BlKGluc3RydW1lbnQudm9sdW1lRW52LCBub3RlLCB0aW1lKSAqIChcbiAgICAgICAgaW5zdHJ1bWVudC5vc2MxLmxldmVsICogb3NjaWxsYXRvcnNbaW5zdHJ1bWVudC5vc2MxLndhdmVmb3JtXSh0aW1lLCBvc2MxRnJlcSkgK1xuICAgICAgICBpbnN0cnVtZW50Lm9zYzIubGV2ZWwgKiBvc2NpbGxhdG9yc1tpbnN0cnVtZW50Lm9zYzIud2F2ZWZvcm1dKHRpbWUsIG9zYzJGcmVxKVxuICAgICAgKVxuXG4gICAgICAjIGFwcGx5IGZpbHRlciB3aXRoIGVudmVsb3BlXG4gICAgICBjdXRvZmYgPSBNYXRoLm1pbiAxLCBpbnN0cnVtZW50LmZpbHRlci5mcmVxICsgaW5zdHJ1bWVudC5maWx0ZXIuZW52ICogZW52ZWxvcGUoaW5zdHJ1bWVudC5maWx0ZXJFbnYsIG5vdGUsIHRpbWUpXG4gICAgICBmaWx0ZXIgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVyc1tpbnN0cnVtZW50LmZpbHRlci50eXBlXVtpbmRleF1cbiAgICAgIHNhbXBsZSA9IGZpbHRlciBzYW1wbGUsIGN1dG9mZiwgaW5zdHJ1bWVudC5maWx0ZXIucmVzXG5cbiAgICAgICMgcmV0dXJuIHJlc3VsdFxuICAgICAgbWVtbyArIHNhbXBsZVxuXG4gICAgLCAwKVxuIiwiSW5zdHJ1bWVudCA9IHJlcXVpcmUgJy4vaW5zdHJ1bWVudCdcblJpbmdCdWZmZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvcmluZ19idWZmZXInXG5saW5lYXJJbnRlcnBvbGF0b3IgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvbGluZWFyX2ludGVycG9sYXRvcidcbmxvd3Bhc3NGaWx0ZXIgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvbG93cGFzc19maWx0ZXInXG5oaWdocGFzc0ZpbHRlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9oaWdocGFzc19maWx0ZXInXG5lbnZlbG9wZSA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9lbnZlbG9wZSdcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEJhc2ljU2FtcGxlciBleHRlbmRzIEluc3RydW1lbnRcblxuICBAZGVmYXVsdHM6XG4gICAgX3R5cGU6ICdCYXNpY1NhbXBsZXInXG4gICAgbGV2ZWw6IDAuNVxuICAgIHBhbjogMC41XG4gICAgcG9seXBob255OiAxXG4gICAgbWF4UG9seXBob255OiA2XG4gICAgcm9vdEtleTogNjBcbiAgICBzYW1wbGVEYXRhOiBudWxsXG4gICAgc2FtcGxlTmFtZTogJydcbiAgICBzdGFydDogMC4zXG4gICAgbG9vcEFjdGl2ZTogJ2xvb3AnXG4gICAgbG9vcDogMC43XG4gICAgdHVuZTogMC41XG4gICAgdm9sdW1lRW52OlxuICAgICAgYTogMFxuICAgICAgZDogMC4yNVxuICAgICAgczogMVxuICAgICAgcjogMC41XG4gICAgZmlsdGVyRW52OlxuICAgICAgYTogMFxuICAgICAgZDogMC4yNVxuICAgICAgczogMVxuICAgICAgcjogMC41XG4gICAgZmlsdGVyOlxuICAgICAgdHlwZTogJ25vbmUnXG4gICAgICBmcmVxOiAwLjI3XG4gICAgICByZXM6IDAuMDVcbiAgICAgIGVudjogMC40NVxuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN1cGVyIHN0YXRlLCBpbnN0cnVtZW50XG5cbiAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVycyA9XG4gICAgICBMUDogKGxvd3Bhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIEhQOiAoaGlnaHBhc3NGaWx0ZXIoKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcbiAgICAgIG5vbmU6ICgoKHNhbXBsZSkgLT4gc2FtcGxlKSBmb3IgaSBpbiBbMC4uLmluc3RydW1lbnQubWF4UG9seXBob255XSlcblxuICBAc2FtcGxlOiAoc3RhdGUsIGluc3RydW1lbnQsIHRpbWUsIGkpIC0+XG4gICAgcmV0dXJuIDAgaWYgaW5zdHJ1bWVudC5sZXZlbCBpcyAwXG4gICAgcmV0dXJuIDAgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cbiAgICByZXR1cm4gMCB1bmxlc3MgaW5zdHJ1bWVudC5zYW1wbGVEYXRhP1xuXG4gICAgciA9IE1hdGgubWF4IDAuMDEsIGluc3RydW1lbnQudm9sdW1lRW52LnJcblxuICAgICMgc3VtIGFsbCBhY3RpdmUgbm90ZXNcbiAgICBpbnN0cnVtZW50LmxldmVsICogc3RhdGVbaW5zdHJ1bWVudC5faWRdLm5vdGVzLnJlZHVjZSgobWVtbywgbm90ZSwgaW5kZXgpID0+XG4gICAgICByZXR1cm4gbWVtbyB1bmxlc3Mgbm90ZT9cbiAgICAgIHJldHVybiBtZW1vIGlmIHRpbWUgPiByICsgbm90ZS50aW1lT2ZmXG5cbiAgICAgICMgZ2V0IHBpdGNoIHNoaWZ0ZWQgaW50ZXJwb2xhdGVkIHNhbXBsZSBhbmQgYXBwbHkgdm9sdW1lIGVudmVsb3BlXG4gICAgICB0cmFuc3Bvc2UgPSBub3RlLmtleSAtIGluc3RydW1lbnQucm9vdEtleSArIGluc3RydW1lbnQudHVuZSAtIDAuNVxuICAgICAgc2FtcGxlc0VsYXBzZWQgPSBpIC0gbm90ZS5pXG4gICAgICBvZmZzZXQgPSBNYXRoLmZsb29yIGluc3RydW1lbnQuc3RhcnQgKiBpbnN0cnVtZW50LnNhbXBsZURhdGEubGVuZ3RoXG4gICAgICBsb29wQWN0aXZlID0gaW5zdHJ1bWVudC5sb29wQWN0aXZlIGlzICdsb29wJ1xuICAgICAgbG9vcFBvaW50ID0gTWF0aC5mbG9vciBpbnN0cnVtZW50Lmxvb3AgKiBpbnN0cnVtZW50LnNhbXBsZURhdGEubGVuZ3RoXG4gICAgICBzYW1wbGUgPSBsaW5lYXJJbnRlcnBvbGF0b3IgaW5zdHJ1bWVudC5zYW1wbGVEYXRhLCB0cmFuc3Bvc2UsIHNhbXBsZXNFbGFwc2VkLCBvZmZzZXQsIGxvb3BBY3RpdmUsIGxvb3BQb2ludFxuICAgICAgc2FtcGxlID0gZW52ZWxvcGUoaW5zdHJ1bWVudC52b2x1bWVFbnYsIG5vdGUsIHRpbWUpICogKHNhbXBsZSBvciAwKVxuXG4gICAgICAjIGFwcGx5IGZpbHRlciB3aXRoIGVudmVsb3BlXG4gICAgICBjdXRvZmYgPSBNYXRoLm1pbiAxLCBpbnN0cnVtZW50LmZpbHRlci5mcmVxICsgaW5zdHJ1bWVudC5maWx0ZXIuZW52ICogZW52ZWxvcGUoaW5zdHJ1bWVudC5maWx0ZXJFbnYsIG5vdGUsIHRpbWUpXG4gICAgICBmaWx0ZXIgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVyc1tpbnN0cnVtZW50LmZpbHRlci50eXBlXVtpbmRleF1cbiAgICAgIHNhbXBsZSA9IGZpbHRlciBzYW1wbGUsIGN1dG9mZiwgaW5zdHJ1bWVudC5maWx0ZXIucmVzXG5cbiAgICAgICMgcmV0dXJuIHJlc3VsdFxuICAgICAgbWVtbyArIHNhbXBsZVxuXG4gICAgLCAwKVxuIiwibWluRW52VmFsdWUgPSAwLjAxXG5cbm1vZHVsZS5leHBvcnRzID0gKGVudiwgbm90ZSwgdGltZSkgLT5cbiAgZWxhcHNlZCA9IHRpbWUgLSBub3RlLnRpbWVcbiAgYSA9IE1hdGgubWF4IG1pbkVudlZhbHVlLCBlbnYuYVxuICBkID0gTWF0aC5tYXggbWluRW52VmFsdWUsIGVudi5kXG4gIHMgPSBlbnYuc1xuICByID0gTWF0aC5tYXggbWluRW52VmFsdWUsIGVudi5yXG5cbiAgIyBhdHRhY2ssIGRlY2F5LCBzdXN0YWluXG4gIGwgPSBpZiBlbGFwc2VkID4gYSArIGRcbiAgICBsID0gc1xuICBlbHNlIGlmIGVsYXBzZWQgPiBhXG4gICAgbCA9IHMgKyAoMSAtIHMpICogKGEgKyBkIC0gZWxhcHNlZCkgLyBkXG4gIGVsc2VcbiAgICBlbGFwc2VkIC8gYVxuXG4gICMgcmVsZWFzZVxuICBpZiBub3RlLnRpbWVPZmZcbiAgICBsID0gbCAqIChub3RlLnRpbWVPZmYgKyByIC0gdGltZSkgLyByXG5cbiAgTWF0aC5tYXggMCwgbFxuIiwic2FtcGxlUmF0ZSA9IDQ4MDAwXG5tYXhGcmVxID0gMTIwMDBcbmRiR2FpbiA9IDEyICAgICMgZ2FpbiBvZiBmaWx0ZXJcbmJhbmR3aWR0aCA9IDEgICMgYmFuZHdpZHRoIGluIG9jdGF2ZXNcblxuIyBjb25zdGFudHNcbkEgPSBNYXRoLnBvdygxMCwgZGJHYWluIC8gNDApXG5lID0gTWF0aC5sb2coMilcbnRhdSA9IDIgKiBNYXRoLlBJXG5iZXRhID0gTWF0aC5zcXJ0KDIgKiBBKVxuXG4jIGh5cGVyYm9saWMgc2luIGZ1bmN0aW9uXG5zaW5oID0gKHgpIC0+XG4gIHkgPSBNYXRoLmV4cCB4XG4gICh5IC0gMSAvIHkpIC8gMlxuXG5tb2R1bGUuZXhwb3J0cyA9IC0+XG4gIGEwID0gYTEgPSBhMiA9IGEzID0gYTQgPSB4MSA9IHgyID0geTEgPSB5MiA9IDBcbiAgZnJlcSA9IG9tZWdhID0gc24gPSBhbHBoYSA9IDBcbiAgY3MgPSAxXG5cbiAgbGFzdEN1dG9mZiA9IDBcblxuICAoc2FtcGxlLCBjdXRvZmYpIC0+XG4gICAgIyBjYWNoZSBmaWx0ZXIgdmFsdWVzIHVudGlsIGN1dG9mZiBjaGFuZ2VzXG4gICAgaWYgY3V0b2ZmICE9IGxhc3RDdXRvZmZcbiAgXG4gICAgICBvbGRDdXRvZmYgPSBjdXRvZmZcblxuICAgICAgZnJlcSA9IGN1dG9mZiAqIG1heEZyZXFcbiAgICAgIG9tZWdhID0gdGF1ICogZnJlcSAvIHNhbXBsZVJhdGVcbiAgICAgIHNuID0gTWF0aC5zaW4gb21lZ2FcbiAgICAgIGNzID0gTWF0aC5jb3Mgb21lZ2FcbiAgICAgIGFscGhhID0gc24gKiBzaW5oKGUgLyAyICogYmFuZHdpZHRoICogb21lZ2EgLyBzbilcblxuICAgICAgYjAgPSAoMSArIGNzKSAvIDJcbiAgICAgIGIxID0gLSgxICsgY3MpXG4gICAgICBiMiA9ICgxICsgY3MpIC8gMlxuICAgICAgYWEwID0gMSArIGFscGhhXG4gICAgICBhYTEgPSAtMiAqIGNzXG4gICAgICBhYTIgPSAxIC0gYWxwaGFcblxuICAgICAgYTAgPSBiMCAvIGFhMFxuICAgICAgYTEgPSBiMSAvIGFhMFxuICAgICAgYTIgPSBiMiAvIGFhMFxuICAgICAgYTMgPSBhYTEgLyBhYTBcbiAgICAgIGE0ID0gYWEyIC8gYWEwXG5cbiAgICAjIGNvbXB1dGUgcmVzdWx0XG4gICAgcyA9IE1hdGgubWF4IC0xLCBNYXRoLm1pbiAxLCBzYW1wbGVcbiAgICByZXN1bHQgPSBhMCAqIHMgKyBhMSAqIHgxICsgYTIgKiB4MiAtIGEzICogeTEgLSBhNCAqIHkyXG5cbiAgICAjIHNoaWZ0IHgxIHRvIHgyLCBzYW1wbGUgdG8geDFcbiAgICB4MiA9IHgxXG4gICAgeDEgPSBzXG5cbiAgICAjIHNoaWZ0IHkxIHRvIHkyLCByZXN1bHQgdG8geTFcbiAgICB5MiA9IHkxXG4gICAgeTEgPSByZXN1bHRcblxuICAgIHJlc3VsdCIsIm1vZHVsZS5leHBvcnRzID0gKHNhbXBsZURhdGEsIHRyYW5zcG9zZSwgc2FtcGxlc0VsYXBzZWQsIG9mZnNldCA9IDAsIGxvb3BBY3RpdmUgPSBmYWxzZSwgbG9vcFBvaW50KSAtPlxuICBpID0gc2FtcGxlc0VsYXBzZWQgKiBNYXRoLnBvdyAyLCB0cmFuc3Bvc2UgLyAxMlxuICBpMSA9IE1hdGguZmxvb3IgaVxuICBpMSA9IGkxICUgKGxvb3BQb2ludCAtIG9mZnNldCkgaWYgbG9vcEFjdGl2ZVxuICBpMiA9IGkxICsgMVxuICBsID0gaSAlIDFcblxuICBzYW1wbGVEYXRhW29mZnNldCArIGkxXSAqICgxIC0gbCkgKyBzYW1wbGVEYXRhW29mZnNldCArIGkyXSAqIGwiLCJpID0gMFxubW9kdWxlLmV4cG9ydHMgPSAodikgLT5cbiAgY29uc29sZS5sb2codikgaWYgaSA9PSAwXG4gIGkgPSAoaSArIDEpICUgNzAwMFxuIiwic2FtcGxlUmF0ZSA9IDQ4MDAwXG5cbm1vZHVsZS5leHBvcnRzID0gLT5cblxuICB5MSA9IHkyID0geTMgPSB5NCA9IG9sZHggPSBvbGR5MSA9IG9sZHkyID0gb2xkeTMgPSAwXG4gIHAgPSBrID0gdDEgPSB0MiA9IHIgPSB4ID0gbnVsbFxuXG4gIChzYW1wbGUsIGN1dG9mZiwgcmVzKSAtPlxuICAgIGZyZXEgPSAyMCAqIE1hdGgucG93IDEwLCAzICogY3V0b2ZmXG4gICAgZnJlcSA9IGZyZXEgLyBzYW1wbGVSYXRlXG4gICAgcCA9IGZyZXEgKiAoMS44IC0gKDAuOCAqIGZyZXEpKVxuICAgIGsgPSAyICogTWF0aC5zaW4oZnJlcSAqIE1hdGguUEkgLyAyKSAtIDFcbiAgICB0MSA9ICgxIC0gcCkgKiAxLjM4NjI0OVxuICAgIHQyID0gMTIgKyB0MSAqIHQxXG4gICAgciA9IHJlcyAqIDAuNTcgKiAodDIgKyA2ICogdDEpIC8gKHQyIC0gNiAqIHQxKVxuXG4gICAgeCA9IHNhbXBsZSAtIHIgKiB5NFxuXG4gICAgIyBmb3VyIGNhc2NhZGVkIG9uZS1wb2xlIGZpbHRlcnMgKGJpbGluZWFyIHRyYW5zZm9ybSlcbiAgICB5MSA9ICB4ICogcCArIG9sZHggICogcCAtIGsgKiB5MVxuICAgIHkyID0geTEgKiBwICsgb2xkeTEgKiBwIC0gayAqIHkyXG4gICAgeTMgPSB5MiAqIHAgKyBvbGR5MiAqIHAgLSBrICogeTNcbiAgICB5NCA9IHkzICogcCArIG9sZHkzICogcCAtIGsgKiB5NFxuXG4gICAgIyBjbGlwcGVyIGJhbmQgbGltaXRlZCBzaWdtb2lkXG4gICAgeTQgLT0gKHk0ICogeTQgKiB5NCkgLyA2XG5cbiAgICBvbGR4ID0geFxuICAgIG9sZHkxID0geTFcbiAgICBvbGR5MiA9IHkyXG4gICAgb2xkeTMgPSB5M1xuXG4gICAgeTQiLCJ0YXUgPSBNYXRoLlBJICogMlxuXG5tb2R1bGUuZXhwb3J0cyA9XG5cbiAgc2luZTogKHRpbWUsIGZyZXF1ZW5jeSkgLT5cbiAgICBNYXRoLnNpbiB0aW1lICogdGF1ICogZnJlcXVlbmN5XG5cbiAgc3F1YXJlOiAodGltZSwgZnJlcXVlbmN5KSAtPlxuICAgIGlmICgodGltZSAlICgxIC8gZnJlcXVlbmN5KSkgKiBmcmVxdWVuY3kpICUgMSA+IDAuNSB0aGVuIDEgZWxzZSAtMVxuXG4gIHNhdzogKHRpbWUsIGZyZXF1ZW5jeSkgLT5cbiAgICAxIC0gMiAqICgoKHRpbWUgJSAoMSAvIGZyZXF1ZW5jeSkpICogZnJlcXVlbmN5KSAlIDEpXG5cbiAgbm9pc2U6IC0+XG4gICAgMiAqIE1hdGgucmFuZG9tKCkgLSAxIiwibW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSaW5nQnVmZmVyXG4gIFxuICBjb25zdHJ1Y3RvcjogKEBtYXhMZW5ndGgsIEBUeXBlID0gRmxvYXQzMkFycmF5LCBAbGVuZ3RoKSAtPlxuICAgIEBsZW5ndGggfHw9IEBtYXhMZW5ndGhcbiAgICBAYXJyYXkgPSBuZXcgQFR5cGUgQG1heExlbmd0aFxuICAgIEBwb3MgPSAwXG5cbiAgcmVzZXQ6IC0+XG4gICAgQGFycmF5ID0gbmV3IEBUeXBlIEBtYXhMZW5ndGhcbiAgICB0aGlzXG5cbiAgcmVzaXplOiAoQGxlbmd0aCkgLT5cbiAgICBAcG9zID0gMCBpZiBAcG9zID49IEBsZW5ndGhcblxuICBwdXNoOiAoZWwpIC0+XG4gICAgQGFycmF5W0Bwb3NdID0gZWxcbiAgICBAcG9zICs9IDFcbiAgICBAcG9zID0gMCBpZiBAcG9zID09IEBsZW5ndGhcbiAgICB0aGlzXG5cbiAgZm9yRWFjaDogKGZuKSAtPlxuICAgIGB2YXIgaSwgbGVuO1xuICAgIGZvciAoaSA9IHRoaXMucG9zLCBsZW4gPSB0aGlzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBmbih0aGlzLmFycmF5W2ldLCBpKTtcbiAgICB9XG4gICAgZm9yIChpID0gMCwgbGVuID0gdGhpcy5wb3M7IGkgPCBsZW47IGkrKykge1xuICAgICAgZm4odGhpcy5hcnJheVtpXSwgaSk7XG4gICAgfWBcbiAgICB0aGlzXG5cbiAgcmVkdWNlOiAoZm4sIG1lbW8gPSAwKSAtPlxuICAgIEBmb3JFYWNoIChlbCwgaSkgLT5cbiAgICAgIG1lbW8gPSBmbiBtZW1vLCBlbCwgaVxuICAgIG1lbW9cbiIsIm1vZHVsZS5leHBvcnRzID0gKGRlY2F5LCBlbGFwc2VkKSAtPlxuICBpZiBlbGFwc2VkID4gZGVjYXlcbiAgICAwXG4gIGVsc2VcbiAgICAxIC0gZWxhcHNlZCAvIGRlY2F5XG4iLCJJbnN0cnVtZW50ID0gcmVxdWlyZSAnLi9pbnN0cnVtZW50J1xuZW52ZWxvcGUgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvZW52ZWxvcGUnXG5saW5lYXJJbnRlcnBvbGF0b3IgPSByZXF1aXJlICcuL2NvbXBvbmVudHMvbGluZWFyX2ludGVycG9sYXRvcidcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIERydW1TYW1wbGVyIGV4dGVuZHMgSW5zdHJ1bWVudFxuXG4gICMga2VlcCBub3RlcyBpbiBhIG1hcCB7a2V5OiBub3RlRGF0YX0gaW5zdGVhZCBvZiB0byBhIHJpbmcgYnVmZmVyXG4gICMgdGhpcyBnaXZlcyB1cyBvbmUgbW9ucGhvbmljIHZvaWNlIHBlciBkcnVtXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXSA9IG5vdGVzOiB7fVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICByZXR1cm4gMCBpZiBpbnN0cnVtZW50LmxldmVsIGlzIDBcbiAgICByZXR1cm4gMCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgIyBzdW0gYWxsIGFjdGl2ZSBub3Rlc1xuICAgIGluc3RydW1lbnQubGV2ZWwgKiBpbnN0cnVtZW50LmRydW1zLnJlZHVjZSgobWVtbywgZHJ1bSkgPT5cbiAgICAgIHJldHVybiBtZW1vIHVubGVzcyBkcnVtLnNhbXBsZURhdGE/XG5cbiAgICAgIG5vdGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNbZHJ1bS5rZXldXG4gICAgICByZXR1cm4gbWVtbyB1bmxlc3Mgbm90ZT9cblxuICAgICAgc2FtcGxlc0VsYXBzZWQgPSBpIC0gbm90ZS5pXG4gICAgICBvZmZzZXQgPSBNYXRoLmZsb29yIGRydW0uc3RhcnQgKiBkcnVtLnNhbXBsZURhdGEubGVuZ3RoXG4gICAgICByZXR1cm4gbWVtbyBpZiBzYW1wbGVzRWxhcHNlZCArIG9mZnNldCA+IGRydW0uc2FtcGxlRGF0YS5sZW5ndGhcblxuICAgICAgc2FtcGxlID0gbGluZWFySW50ZXJwb2xhdG9yIGRydW0uc2FtcGxlRGF0YSwgZHJ1bS50cmFuc3Bvc2UsIHNhbXBsZXNFbGFwc2VkLCBvZmZzZXRcbiAgICAgIG1lbW8gKyBkcnVtLmxldmVsICogZW52ZWxvcGUoZHJ1bS52b2x1bWVFbnYsIG5vdGUsIHRpbWUpICogKHNhbXBsZSBvciAwKVxuICAgICwgMClcblxuICBAdGljazogKHN0YXRlLCBpbnN0cnVtZW50LCB0aW1lLCBpLCBiZWF0LCBicHMsIG5vdGVzT24sIG5vdGVzT2ZmKSAtPlxuICAgIEBjcmVhdGVTdGF0ZSBzdGF0ZSwgaW5zdHJ1bWVudCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgbm90ZXNPZmYuZm9yRWFjaCAoe2tleX0pIC0+XG4gICAgICBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNba2V5XT8udGltZU9mZiA9IHRpbWVcblxuICAgIG5vdGVzT24uZm9yRWFjaCAobm90ZSkgPT5cbiAgICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXS5ub3Rlc1tub3RlLmtleV0gPSB7dGltZSwgaX1cbiIsIkluc3RydW1lbnQgPSByZXF1aXJlICcuL2luc3RydW1lbnQnXG5oaWdocGFzc0ZpbHRlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9oaWdocGFzc19maWx0ZXInXG5zaW1wbGVFbnZlbG9wZSA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9zaW1wbGVfZW52ZWxvcGUnXG5vc2NpbGxhdG9ycyA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9vc2NpbGxhdG9ycydcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIERydW1TeW50aGVzaXplciBleHRlbmRzIEluc3RydW1lbnRcblxuICBtaW5GcmVxID0gNjBcbiAgbWF4RnJlcSA9IDMwMDBcbiAgZnJlcVNjYWxlID0gbWF4RnJlcSAtIG1pbkZyZXFcblxuICAjIGtlZXAgbm90ZXMgaW4gYSBtYXAge2tleTogbm90ZURhdGF9IGluc3RlYWQgb2YgaW4gYSByaW5nIGJ1ZmZlclxuICAjIHRoaXMgZ2l2ZXMgdXMgb25lIG1vbnBob25pYyB2b2ljZSBwZXIgZHJ1bS5cbiAgQGNyZWF0ZVN0YXRlOiAoc3RhdGUsIGluc3RydW1lbnQpIC0+XG4gICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdID1cbiAgICAgIG5vdGVzOiB7fVxuICAgICAgZmlsdGVyczogKFxuICAgICAgICBoaWdocGFzc0ZpbHRlcigpIGZvciBpIGluIFswLi4uMTI3XVxuICAgICAgKVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICByZXR1cm4gMCBpZiBpbnN0cnVtZW50LmxldmVsIGlzIDBcbiAgICByZXR1cm4gMCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgIyBzdW0gYWxsIGFjdGl2ZSBub3Rlc1xuICAgIGluc3RydW1lbnQubGV2ZWwgKiBpbnN0cnVtZW50LmRydW1zLnJlZHVjZSgobWVtbywgZHJ1bSkgPT5cbiAgICAgIG5vdGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0ubm90ZXNbZHJ1bS5rZXldXG4gICAgICByZXR1cm4gbWVtbyB1bmxlc3Mgbm90ZT9cblxuICAgICAgZWxhcHNlZCA9IHRpbWUgLSBub3RlLnRpbWVcbiAgICAgIHJldHVybiBtZW1vIGlmIGVsYXBzZWQgPiBkcnVtLmRlY2F5XG5cbiAgICAgIGVudiA9IHNpbXBsZUVudmVsb3BlIGRydW0uZGVjYXksIGVsYXBzZWRcbiAgICAgIGZyZXEgPSBtaW5GcmVxICsgZHJ1bS5waXRjaCAqIGZyZXFTY2FsZVxuXG4gICAgICAjIGFwcGx5IHBpdGNoIGJlbmRcbiAgICAgIGlmIGRydW0uYmVuZFxuICAgICAgICBmcmVxID0gKDIgLSBkcnVtLmJlbmQgKyBkcnVtLmJlbmQgKiBlbnYpIC8gMiAqIGZyZXFcblxuICAgICAgIyBhcHBseSBmbVxuICAgICAgaWYgZHJ1bS5mbSA+IDBcbiAgICAgICAgc2lnbmFsID0gb3NjaWxsYXRvcnMuc2luZSBlbGFwc2VkLCBtaW5GcmVxICsgZHJ1bS5mbUZyZXEgKiBmcmVxU2NhbGVcbiAgICAgICAgZnJlcSArPSBkcnVtLmZtICogc2lnbmFsICogc2ltcGxlRW52ZWxvcGUoZHJ1bS5mbURlY2F5ICsgMC4wMSwgZWxhcHNlZClcblxuICAgICAgIyBzdW0gbm9pc2UgYW5kIG9zY2lsbGF0b3JcbiAgICAgIHNhbXBsZSA9IChcbiAgICAgICAgKDEgLSBkcnVtLm5vaXNlKSAqIG9zY2lsbGF0b3JzLnNpbmUoZWxhcHNlZCwgZnJlcSkgK1xuICAgICAgICBkcnVtLm5vaXNlICogb3NjaWxsYXRvcnMubm9pc2UoKVxuICAgICAgKVxuXG4gICAgICAjIGFwcGx5IGhpZ2hwYXNzXG4gICAgICBpZiBkcnVtLmhwID4gMFxuICAgICAgICBzYW1wbGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF0uZmlsdGVyc1tkcnVtLmtleV0gc2FtcGxlLCBkcnVtLmhwXG5cbiAgICAgIG1lbW8gKyBkcnVtLmxldmVsICogZW52ICogc2FtcGxlXG5cbiAgICAsIDApXG5cblxuICBAdGljazogKHN0YXRlLCBpbnN0cnVtZW50LCB0aW1lLCBpLCBiZWF0LCBicHMsIG5vdGVzT24sIG5vdGVzT2ZmKSAtPlxuICAgIEBjcmVhdGVTdGF0ZSBzdGF0ZSwgaW5zdHJ1bWVudCB1bmxlc3Mgc3RhdGVbaW5zdHJ1bWVudC5faWRdP1xuXG4gICAgbm90ZXNPbi5mb3JFYWNoIChub3RlKSA9PlxuICAgICAgc3RhdGVbaW5zdHJ1bWVudC5faWRdLm5vdGVzW25vdGUua2V5XSA9IHt0aW1lLCBpfVxuXG4iLCJSaW5nQnVmZmVyID0gcmVxdWlyZSAnLi9jb21wb25lbnRzL3JpbmdfYnVmZmVyJ1xuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5zdHJ1bWVudFxuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCBpbnN0cnVtZW50KSAtPlxuICAgIHN0YXRlW2luc3RydW1lbnQuX2lkXSA9XG4gICAgICBub3RlczogbmV3IFJpbmdCdWZmZXIgaW5zdHJ1bWVudC5tYXhQb2x5cGhvbnksIEFycmF5LCBpbnN0cnVtZW50LnBvbHlwaG9ueVxuICAgICAgbm90ZU1hcDoge31cblxuICBAcmVsZWFzZVN0YXRlOiAoc3RhdGUsIGluc3RydW1lbnQpIC0+XG4gICAgZGVsZXRlIHN0YXRlW2luc3RydW1lbnQuX2lkXVxuXG4gIEBzYW1wbGU6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSkgLT5cbiAgICAwXG5cbiAgQHRpY2s6IChzdGF0ZSwgaW5zdHJ1bWVudCwgdGltZSwgaSwgYmVhdCwgYnBzLCBub3Rlc09uLCBub3Rlc09mZikgLT5cbiAgICBAY3JlYXRlU3RhdGUgc3RhdGUsIGluc3RydW1lbnQgdW5sZXNzIHN0YXRlW2luc3RydW1lbnQuX2lkXT9cbiAgICBpbnN0cnVtZW50U3RhdGUgPSBzdGF0ZVtpbnN0cnVtZW50Ll9pZF1cblxuICAgIGlmIGluc3RydW1lbnQucG9seXBob255ICE9IGluc3RydW1lbnRTdGF0ZS5ub3Rlcy5sZW5ndGhcbiAgICAgIGluc3RydW1lbnRTdGF0ZS5ub3Rlcy5yZXNpemUgaW5zdHJ1bWVudC5wb2x5cGhvbnlcblxuICAgIG5vdGVzT2ZmLmZvckVhY2ggKHtrZXl9KSAtPlxuICAgICAgIyBjb25zb2xlLmxvZyAnbm90ZSBvZmYgJyArIGtleVxuICAgICAgaW5zdHJ1bWVudFN0YXRlLm5vdGVNYXBba2V5XT8udGltZU9mZiA9IHRpbWVcblxuICAgIG5vdGVzT24uZm9yRWFjaCAoe2tleX0pIC0+XG4gICAgICAjIGNvbnNvbGUubG9nICdub3RlIG9uICcgKyBrZXlcbiAgICAgIGluc3RydW1lbnRTdGF0ZS5ub3RlTWFwW2tleV0gPSB7dGltZSwgaSwga2V5fVxuICAgICAgaW5zdHJ1bWVudFN0YXRlLm5vdGVzLnB1c2ggaW5zdHJ1bWVudFN0YXRlLm5vdGVNYXBba2V5XVxuXG4iLCJJbnN0cnVtZW50ID0gcmVxdWlyZSAnLi9pbnN0cnVtZW50J1xuUmluZ0J1ZmZlciA9IHJlcXVpcmUgJy4vY29tcG9uZW50cy9yaW5nX2J1ZmZlcidcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIExvb3BTYW1wbGVyIGV4dGVuZHMgSW5zdHJ1bWVudFxuIiwiVHJhY2sgPSByZXF1aXJlICcuL3RyYWNrJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFNvbmdcblxuICAjIG51bWJlciBvZiBzYW1wbGVzIHRvIHByb2Nlc3MgYmV0d2VlbiB0aWNrc1xuICBjbG9ja1JhdGlvID0gNDQxXG5cbiAgIyByYXRlIGF0IHdoaWNoIGxldmVsIG1ldGVycyBkZWNheVxuICBtZXRlckRlY2F5ID0gMC4wNVxuXG4gIGNsaXAgPSAoc2FtcGxlKSAtPlxuICAgIE1hdGgubWF4KDAsIE1hdGgubWluKDIsIHNhbXBsZSArIDEpKSAtIDFcblxuICBjb25zdHJ1Y3RvcjogLT5cbiAgICBAbGFzdEJlYXQgPSAwXG5cbiAgICAjIGtlZXAgbXV0YWJsZSBzdGF0ZSBmb3IgYXVkaW8gcGxheWJhY2sgaGVyZSAtIHRoaXMgd2lsbCBzdG9yZSB0aGluZ3MgbGlrZVxuICAgICMgZmlsdGVyIG1lbW9yeSBhbmQgbWV0ZXIgbGV2ZWxzIHRoYXQgbmVlZCB0byBzdGF5IG91dHNpZGUgdGhlIG5vcm1hbCBjdXJzb3JcbiAgICAjIHN0cnVjdHVyZSBmb3IgcGVyZm9ybWFuY2UgcmVhc29uc1xuICAgIEBzdGF0ZSA9IHt9XG5cbiAgICAjIGtlZXAgYSByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgc29uZyBkb2N1bWVudFxuICAgIEBzb25nID0gbnVsbFxuXG4gICAgIyBrZWVwIGEgbGlzdCBvZiB1bnByb2Nlc3NlZCBtaWRpIG1lc3NhZ2VzXG4gICAgQG1pZGlNZXNzYWdlcyA9IFtdXG5cbiAgdXBkYXRlOiAoc3RhdGUpIC0+XG4gICAgQHNvbmcgPSBzdGF0ZVxuXG4gIG1pZGk6IChtZXNzYWdlKSAtPlxuICAgIEBtaWRpTWVzc2FnZXMucHVzaCBtZXNzYWdlXG5cbiAgIyBmaWxsIGEgYnVmZmVyIGZ1bmN0aW9uXG4gIGJ1ZmZlcjogKHNpemUsIGluZGV4LCBzYW1wbGVSYXRlLCBjYikgLT5cbiAgICBhcnIgPSBuZXcgRmxvYXQzMkFycmF5IHNpemVcblxuICAgIGlmIEBzb25nP1xuICAgICAgZm9yIGkgaW4gWzAuLi5zaXplXVxuICAgICAgICBpaSA9IGluZGV4ICsgaVxuICAgICAgICB0ID0gaWkgLyBzYW1wbGVSYXRlXG4gICAgICAgIGFycltpXSA9IEBzYW1wbGUgdCwgaWlcblxuICAgIGNiIGFyci5idWZmZXJcblxuICAjIGNhbGxlZCBmb3IgZXZlcnkgc2FtcGxlIG9mIGF1ZGlvXG4gIHNhbXBsZTogKHRpbWUsIGkpID0+XG4gICAgQHRpY2sgdGltZSwgaSBpZiBpICUgY2xvY2tSYXRpbyBpcyAwXG5cbiAgICBjbGlwIEBzb25nLmxldmVsICogQHNvbmcudHJhY2tzLnJlZHVjZSgobWVtbywgdHJhY2spID0+XG4gICAgICBtZW1vICsgVHJhY2suc2FtcGxlIEBzdGF0ZSwgdHJhY2ssIHRpbWUsIGlcbiAgICAsIDApXG5cbiAgIyBjYWxsZWQgZm9yIGV2ZXJ5IGNsb2NrUmF0aW8gc2FtcGxlc1xuICB0aWNrOiAodGltZSwgaSkgPT5cbiAgICBicHMgPSBAc29uZy5icG0gLyA2MFxuICAgIGJlYXQgPSB0aW1lICogYnBzXG5cbiAgICBAc29uZy50cmFja3MuZm9yRWFjaCAodHJhY2ssIGluZGV4KSA9PlxuXG4gICAgICAjIGZvciBub3cgc2VuZCBtaWRpIG9ubHkgdG8gdGhlIGZpcnN0IHRyYWNrIC0gaW4gdGhlIGZ1dHVyZSB3ZSBzaG91bGRcbiAgICAgICMgYWxsb3cgdHJhY2tzIHRvIGJlIGFybWVkIGZvciByZWNvcmRpbmdcbiAgICAgIG1pZGlNZXNzYWdlcyA9IGlmIGluZGV4IGlzIEBzb25nLnNlbGVjdGVkVHJhY2sgdGhlbiBAbWlkaU1lc3NhZ2VzIGVsc2UgbnVsbFxuXG4gICAgICBUcmFjay50aWNrIEBzdGF0ZSwgdHJhY2ssIG1pZGlNZXNzYWdlcywgdGltZSwgaSwgYmVhdCwgQGxhc3RCZWF0LCBicHNcblxuICAgIEBsYXN0QmVhdCA9IGJlYXRcblxuICAjIGNhbGxlZCBwZXJpb2RpY2FsbHkgdG8gcGFzcyBoaWdoIGZyZXF1ZW5jeSBkYXRhIHRvIHRoZSB1aS4uIHRoaXMgc2hvdWxkXG4gICMgZXZlbnR1YWxseSBiZSB1cGRhdGVkIHRvIGJhc2UgdGhlIGFtb3VudCBvZiBkZWNheSBvbiB0aGUgYWN0dWFsIGVscGFzZWQgdGltZVxuICBwcm9jZXNzRnJhbWU6IC0+XG4gICAgaWYgQHNvbmc/LnRyYWNrcz9cbiAgICAgICMgYXBwbHkgZGVjYXkgdG8gbWV0ZXIgbGV2ZWxzXG4gICAgICBmb3IgdHJhY2sgaW4gQHNvbmcudHJhY2tzXG4gICAgICAgIGlmIEBzdGF0ZVt0cmFjay5faWRdP1xuICAgICAgICAgIEBzdGF0ZVt0cmFjay5faWRdLm1ldGVyTGV2ZWwgLT0gbWV0ZXJEZWNheVxuXG4gICMgZ2V0IGEgc2VuZGFibGUgdmVyc2lvbiBvZiBjdXJyZW50IHNvbmcgcGxheWJhY2sgc3RhdGVcbiAgZ2V0U3RhdGU6IC0+XG4gICAgbWV0ZXJMZXZlbHM6IEBzb25nPy50cmFja3M/LnJlZHVjZSgobWVtbywgdHJhY2spID0+XG4gICAgICBtZW1vW3RyYWNrLl9pZF0gPSBAc3RhdGVbdHJhY2suX2lkXT8ubWV0ZXJMZXZlbFxuICAgICAgbWVtb1xuICAgICwge30pXG4iLCJpbnN0cnVtZW50VHlwZXMgPVxuICBBbmFsb2dTeW50aGVzaXplcjogcmVxdWlyZSAnLi9hbmFsb2dfc3ludGhlc2l6ZXInXG4gIEJhc2ljU2FtcGxlcjogcmVxdWlyZSAnLi9iYXNpY19zYW1wbGVyJ1xuICBEcnVtU2FtcGxlcjogcmVxdWlyZSAnLi9kcnVtX3NhbXBsZXInXG4gIERydW1TeW50aGVzaXplcjogcmVxdWlyZSAnLi9kcnVtX3N5bnRoZXNpemVyJ1xuICBMb29wU2FtcGxlcjogcmVxdWlyZSAnLi9sb29wX3NhbXBsZXInXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBUcmFja1xuXG4gIEBjcmVhdGVTdGF0ZTogKHN0YXRlLCB0cmFjaykgLT5cbiAgICBzdGF0ZVt0cmFjay5faWRdID1cbiAgICAgIG1ldGVyTGV2ZWw6IDBcblxuICBAcmVsZWFzZVN0YXRlOiAoc3RhdGUsIHRyYWNrKSAtPlxuICAgIGRlbGV0ZSBzdGF0ZVt0cmFjay5faWRdXG5cbiAgQHNhbXBsZTogKHN0YXRlLCB0cmFjaywgdGltZSwgaSkgLT5cbiAgICAjIGdldCBpbnN0cnVtZW50IG91dHB1dFxuICAgIEluc3RydW1lbnQgPSBpbnN0cnVtZW50VHlwZXNbdHJhY2suaW5zdHJ1bWVudC5fdHlwZV1cbiAgICBzYW1wbGUgPSBJbnN0cnVtZW50LnNhbXBsZSBzdGF0ZSwgdHJhY2suaW5zdHJ1bWVudCwgdGltZSwgaVxuXG4gICAgIyBhcHBseSBlZmZlY3RzXG4gICAgc2FtcGxlID0gdHJhY2suZWZmZWN0cy5yZWR1Y2UoKHNhbXBsZSwgZWZmZWN0KSAtPlxuICAgICAgRWZmZWN0LnNhbXBsZSBzdGF0ZSwgZWZmZWN0LCB0aW1lLCBpLCBzYW1wbGVcbiAgICAsIHNhbXBsZSlcblxuICAgICMgdXBkYXRlIG1ldGVyIGxldmVsc1xuICAgIGlmIHRyYWNrU3RhdGUgPSBzdGF0ZVt0cmFjay5faWRdXG4gICAgICBsZXZlbCA9IHRyYWNrU3RhdGUubWV0ZXJMZXZlbFxuICAgICAgaWYgbm90IGxldmVsPyBvciBpc05hTihsZXZlbCkgb3Igc2FtcGxlID4gbGV2ZWxcbiAgICAgICAgdHJhY2tTdGF0ZS5tZXRlckxldmVsID0gc2FtcGxlXG5cbiAgICBzYW1wbGVcblxuICBAdGljazogKHN0YXRlLCB0cmFjaywgbWlkaU1lc3NhZ2VzLCB0aW1lLCBpLCBiZWF0LCBsYXN0QmVhdCwgYnBzKSAtPlxuICAgIEBjcmVhdGVTdGF0ZSBzdGF0ZSwgdHJhY2sgdW5sZXNzIHN0YXRlW3RyYWNrLl9pZF0/XG5cbiAgICBJbnN0cnVtZW50ID0gaW5zdHJ1bWVudFR5cGVzW3RyYWNrLmluc3RydW1lbnQuX3R5cGVdXG5cbiAgICAjIGdldCBub3RlcyBvbiBmcm9tIHNlcXVlbmNlXG4gICAge25vdGVzT24sIG5vdGVzT2ZmfSA9IEBub3RlcyB0cmFjay5zZXF1ZW5jZSwgbWlkaU1lc3NhZ2VzLCB0aW1lLCBiZWF0LCBsYXN0QmVhdFxuXG4gICAgSW5zdHJ1bWVudC50aWNrIHN0YXRlLCB0cmFjay5pbnN0cnVtZW50LCB0aW1lLCBpLCBiZWF0LCBicHMsIG5vdGVzT24sIG5vdGVzT2ZmXG4gICAgdHJhY2suZWZmZWN0cy5mb3JFYWNoIChlKSAtPiBlLnRpY2sgc3RhdGUsIHRpbWUsIGJlYXQsIGJwc1xuXG4gICMgbG9vayBhdCBzZXF1ZW5jZSBhbmQgbWlkaSBtZXNzYWdlcywgcmV0dXJuIGFycmF5cyBvZiBub3RlcyBvbiBhbmQgb2ZmXG4gICMgb2NjdXJyaW5nIGluIHRoaXMgdGlja1xuICBAbm90ZXM6IChzZXF1ZW5jZSwgbWlkaU1lc3NhZ2VzLCB0aW1lLCBiZWF0LCBsYXN0QmVhdCkgLT5cbiAgICBiYXIgPSBNYXRoLmZsb29yIGJlYXQgLyBzZXF1ZW5jZS5sb29wU2l6ZVxuICAgIGxhc3RCYXIgPSBNYXRoLmZsb29yIGxhc3RCZWF0IC8gc2VxdWVuY2UubG9vcFNpemVcbiAgICBiZWF0ID0gYmVhdCAlIHNlcXVlbmNlLmxvb3BTaXplXG4gICAgbGFzdEJlYXQgPSBsYXN0QmVhdCAlIHNlcXVlbmNlLmxvb3BTaXplXG5cbiAgICBub3Rlc09uID0gW11cbiAgICBub3Rlc09mZiA9IFtdXG5cbiAgICBmb3IgaWQsIG5vdGUgb2Ygc2VxdWVuY2Uubm90ZXNcbiAgICAgIHN0YXJ0ID0gbm90ZS5zdGFydFxuICAgICAgZW5kID0gbm90ZS5zdGFydCArIG5vdGUubGVuZ3RoXG4gICAgICBpZiBzdGFydCA8IGJlYXQgYW5kIChzdGFydCA+PSBsYXN0QmVhdCBvciBiYXIgPiBsYXN0QmFyKVxuICAgICAgICBub3Rlc09uLnB1c2gge2tleTogbm90ZS5rZXl9XG4gICAgICBpZiBlbmQgPCBiZWF0IGFuZCAoZW5kID49IGxhc3RCZWF0IG9yIGJhciA+IGxhc3RCYXIpXG4gICAgICAgIG5vdGVzT2ZmLnB1c2gge2tleTogbm90ZS5rZXl9XG5cbiAgICBpZiBtaWRpTWVzc2FnZXM/XG4gICAgICBtaWRpTWVzc2FnZXMuZm9yRWFjaCAobWVzc2FnZSwgaSkgLT5cbiAgICAgICAgaWYgbWVzc2FnZS50aW1lIDwgdGltZVxuICAgICAgICAgIG1pZGlNZXNzYWdlcy5zcGxpY2UgaSwgMVxuICAgICAgICAgIHN3aXRjaCBtZXNzYWdlLnR5cGVcbiAgICAgICAgICAgIHdoZW4gJ29uJ1xuICAgICAgICAgICAgICBub3Rlc09uLnB1c2gga2V5OiBtZXNzYWdlLmtleVxuICAgICAgICAgICAgd2hlbiAnb2ZmJ1xuICAgICAgICAgICAgICBub3Rlc09mZi5wdXNoIGtleTogbWVzc2FnZS5rZXlcblxuICAgIHtub3Rlc09uLCBub3Rlc09mZn1cbiJdfQ==
