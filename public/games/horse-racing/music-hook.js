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

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'bots:update' || !Array.isArray(e.data.bots)) return;
    var overlay = document.getElementById('hrBotOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'hrBotOverlay';
      overlay.style.cssText = 'position:fixed;top:10px;left:10px;z-index:9990;display:flex;flex-direction:column;gap:6px;pointer-events:none;';
      document.body.appendChild(overlay);
    }
    while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
    e.data.bots.forEach(function(bot) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.75);border-radius:10px;padding:4px 10px;border:1px solid rgba(212,175,55,0.3);';
      var img = document.createElement('img');
      var photoSrc = String(bot.photoUrl || '').replace(/[^a-zA-Z0-9_.:\-\/]/g, '');
      img.src = photoSrc;
      img.style.cssText = 'width:22px;height:22px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(212,175,55,0.6);';
      wrap.appendChild(img);
      var nameEl = document.createElement('span');
      nameEl.style.cssText = 'font-size:10px;color:#ccc;font-weight:600;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      nameEl.textContent = String(bot.name || '');
      wrap.appendChild(nameEl);
      if (bot.currentBet > 0) {
        var betEl = document.createElement('span');
        betEl.style.cssText = 'font-size:9px;color:#D4AF37;font-weight:700;margin-left:4px;';
        var betLabel = bot.currentBet >= 1000 ? Math.round(bot.currentBet / 1000) + 'K' : String(bot.currentBet);
        betEl.textContent = betLabel + ' $Pc';
        wrap.appendChild(betEl);
      }
      overlay.appendChild(wrap);
    });
  });
}());
