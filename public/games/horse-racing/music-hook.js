(function () {
  var _wasPlaying = null;

  function getSoundtrack() {
    return window.s_aSounds && window.s_aSounds['soundtrack'] || null;
  }

  function getBanner() {
    return document.getElementById('parentMusicBanner');
  }

  function showBanner(label) {
    var b = getBanner();
    if (b) {
      b.textContent = label;
    } else {
      b = document.createElement('div');
      b.id = 'parentMusicBanner';
      b.style.cssText = [
        'position:fixed',
        'bottom:12px',
        'left:50%',
        'transform:translateX(-50%)',
        'background:rgba(139,92,246,0.18)',
        'border:1px solid rgba(139,92,246,0.4)',
        'border-radius:12px',
        'padding:7px 18px',
        'font-size:12px',
        'color:#c4b5fd',
        'z-index:9999',
        'pointer-events:none',
        'white-space:nowrap',
      ].join(';');
      b.textContent = label;
      document.body.appendChild(b);
    }
  }

  function removeBanner() {
    var b = getBanner();
    if (b) b.parentNode.removeChild(b);
  }

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'music:state') return;
    var playing = e.data.playing;
    var label = e.data.trackTitle
      ? 'Now playing: ' + e.data.trackTitle
      : 'Music playing from main player';
    var snd = getSoundtrack();

    if (playing) {
      if (snd) {
        _wasPlaying = snd.playing();
        snd.pause();
      }
      showBanner(label);
    } else {
      if (snd && _wasPlaying) {
        snd.play();
      }
      _wasPlaying = null;
      removeBanner();
    }
  });
}());
