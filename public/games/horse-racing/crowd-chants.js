(function () {
  var CHANT_FILES = [
    'chant_01', 'chant_02', 'chant_03', 'chant_04', 'chant_05',
    'chant_06', 'chant_07', 'chant_08', 'chant_09', 'chant_10',
    'chant_11', 'chant_12', 'chant_13', 'chant_14', 'chant_15'
  ];

  var _chantSounds = {};
  var _chantTimer = null;
  var _chanting = false;
  var _raceActive = false;
  var _muted = false;
  var _volume = 0.6;
  var _loaded = false;
  var _lastPlayed = -1;

  function loadChants() {
    if (_loaded || typeof Howl === 'undefined') return;
    _loaded = true;
    for (var i = 0; i < CHANT_FILES.length; i++) {
      (function (name) {
        _chantSounds[name] = new Howl({
          src: ['./sounds/' + name + '.wav'],
          volume: _volume,
          preload: true
        });
      })(CHANT_FILES[i]);
    }
  }

  function pickChant() {
    var idx;
    do {
      idx = Math.floor(Math.random() * CHANT_FILES.length);
    } while (idx === _lastPlayed && CHANT_FILES.length > 1);
    _lastPlayed = idx;
    return CHANT_FILES[idx];
  }

  function playChant() {
    if (_muted || !_chanting) return;
    var name = pickChant();
    var snd = _chantSounds[name];
    if (snd) {
      var vol = _volume * (0.4 + Math.random() * 0.6);
      var rate = 0.85 + Math.random() * 0.3;
      snd.volume(Math.min(1, vol));
      snd.rate(rate);
      snd.play();
    }
  }

  function doChant() {
    if (!_chanting || _muted) return;
    playChant();
    var next = 1000 + Math.random() * 2000;
    _chantTimer = setTimeout(doChant, next);
  }

  function _startLoop() {
    if (_chanting) return;
    loadChants();
    _chanting = true;
    var delay = 300 + Math.random() * 700;
    _chantTimer = setTimeout(doChant, delay);
  }

  function _stopLoop() {
    _chanting = false;
    if (_chantTimer) {
      clearTimeout(_chantTimer);
      _chantTimer = null;
    }
    for (var key in _chantSounds) {
      if (_chantSounds[key] && _chantSounds[key].playing()) {
        _chantSounds[key].stop();
      }
    }
  }

  window._pcCrowdChants = {
    start: function () {
      _raceActive = true;
      if (!_muted) _startLoop();
    },
    stop: function () {
      _raceActive = false;
      _stopLoop();
    },
    setMuted: function (m) {
      _muted = m;
      if (m) {
        _stopLoop();
      } else if (_raceActive) {
        _startLoop();
      }
    },
    setVolume: function (v) {
      _volume = v;
      for (var key in _chantSounds) {
        if (_chantSounds[key]) _chantSounds[key].volume(v);
      }
    },
    isRaceActive: function () {
      return _raceActive;
    }
  };
}());
