function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function getPlayerData(name) { return PLAYER_DB[name] || {name:name,nick:"",img:""}; }

    let players = JSON.parse(localStorage.getItem("fifa_players") || "[]");
    let queue = [], drawn = [];
    const matchLabels = ["משחק ראשון","משחק שני","משחק שלישי","משחק רביעי","משחק חמישי"];
    const pendingLabels = ["ממתינים ראשונים","ממתינים שניים","ממתינים שלישיים"];

    function save() { localStorage.setItem("fifa_players", JSON.stringify(players)); }
    function getActive() { return players.filter(function(p) { return p.active; }); }

    function playerCardHTML(name, dim) {
      var pd = getPlayerData(name);
      var av = pd.img ? '<img class="pc-avatar" src="' + pd.img + '"/>' : '<div class="pc-avatar-ph">👤</div>';
      var nk = pd.nick ? '<span class="pc-nick">' + pd.nick + '</span>' : '';
      return `<div class="player-card${dim?' dim':''}">` + av + `<div class="pc-info"><span class="pc-name">${escapeHtml(name)}</span>` + nk + '</div></div>';
    }

    function emptySlot() { return '<div class="player-card empty"></div>'; }

    function soloBlockHTML(name) {
      var pd = getPlayerData(name);
      var av = pd.img ? '<img class="solo-avatar" src="' + pd.img + '"/>' : '<div class="solo-avatar-ph">👤</div>';
      return '<div class="solo-block-header">ממתין</div>' +
        '<div class="solo-body">' + av +
        '<div class="solo-name">' + escapeHtml(name) + '</div>' +
        (pd.nick ? '<div class="solo-nick">' + pd.nick + '</div>' : '') +
        '<div class="solo-text">אוווו את הפלי 😬</div>' +
        '</div>';
    }

    function twoBlockHTML(names) {
      var cards = names.map(function(n) {
        if (!n) return '';
        var pd = getPlayerData(n);
        var av = pd.img ? '<img class="pc-avatar-lg" src="' + pd.img + '"/>' : '<div class="pc-avatar-ph-lg">👤</div>';
        var nk = pd.nick ? '<span class="pc-nick-lg">' + pd.nick + '</span>' : '';
        return '<div class="player-card-lg">' + av + '<div class="pc-info"><span class="pc-name-lg">' + n + '</span>' + nk + '</div></div>';
      }).join('');
      return '<div class="two-block-header">ממתינים</div><div class="two-body">' + cards + '</div>';
    }

    function renderResults() {
      var el = document.getElementById("results");
      el.innerHTML = "";

      // Build block sizes based on total players
      var total = queue.length;
      var blockSizes = [];
      var rem = total;
      while (rem > 0) {
        if (rem === 1) { blockSizes.push(1); rem = 0; }
        else if (rem === 2) { blockSizes.push(2); rem = 0; }
        else if (rem === 3) { blockSizes.push(2); blockSizes.push(1); rem = 0; }
        else { blockSizes.push(4); rem -= 4; }
      }

      var drawnIdx = 0;
      var matchIdx = 0;

      for (var bi = 0; bi < blockSizes.length; bi++) {
        var size = blockSizes[bi];
        var block = drawn.slice(drawnIdx, drawnIdx + size);
        drawnIdx += size;

        // אל תציג בלוק שעוד לא התחיל להתגרל
        if (block.length === 0) break;

        var blockEl = document.createElement("div");

        if (size === 1) {
          // FALI
          var wasShown = !!document.querySelector(".solo-block");
          blockEl.className = "solo-block";
          blockEl.innerHTML = soloBlockHTML(block[0]);
          el.appendChild(blockEl);
          if (!wasShown) playFaliSound();

        } else if (size === 2) {
          // 2 שחקנים גדול
          blockEl.className = "two-block";
          blockEl.innerHTML = twoBlockHTML([block[0] || null, block[1] || null]);
          el.appendChild(blockEl);

        } else {
          // בלוק רגיל — 4 שחקנים
          var label = matchLabels[matchIdx] || "משחק";
          while (block.length < 4) block.push(null);
          var p0=block[0],p1=block[1],p2=block[2],p3=block[3];
          var leftHTML = (p0?playerCardHTML(p0,false):emptySlot()) + (p1?playerCardHTML(p1,false):emptySlot());
          var rightHTML = (p2?playerCardHTML(p2,false):emptySlot()) + (p3?playerCardHTML(p3,false):emptySlot());
          blockEl.className = "match-block";
          blockEl.innerHTML =
            '<div class="match-block-header">' + label + '</div>' +
            '<div class="match-body"><div class="team-vs-row">' +
              '<div class="team-side">' + leftHTML + '</div>' +
              '<div class="vs-col"><div class="vs-badge">נגד</div></div>' +
              '<div class="team-side">' + rightHTML + '</div>' +
            '</div></div>';
          el.appendChild(blockEl);
          if (p3 !== null) matchIdx++;
        }
      }
    }

    function render() {
      var list = document.getElementById("plist");
      list.innerHTML = "";
      players.forEach(function(p, i) {
        var pd = getPlayerData(p.name);
        var div = document.createElement("div");
        div.className = "pitem" + (p.active ? " active" : "");
        var av = pd.img ? '<img class="pitem-avatar" src="' + pd.img + '"/>' : '<div class="pitem-avatar-ph">👤</div>';
        var chk = document.createElement("div");
        chk.className = "pitem-check" + (p.active ? " on" : "");
        chk.onclick = function() { players[i].active = !players[i].active; save(); render(); };
        var namerow = document.createElement("div");
        namerow.className = "pitem-namerow";
        namerow.innerHTML = `<span class="pitem-name">${escapeHtml(p.name)}</span>` + (pd.nick ? `<span class="pitem-nick">${escapeHtml(pd.nick)}</span>` : '');
        var del = document.createElement("button");
        del.className = "pitem-del";
        del.textContent = "✕";
        del.onclick = function() { players.splice(i,1); save(); render(); };
        div.innerHTML = av;
        div.appendChild(chk);
        div.appendChild(namerow);
        div.appendChild(del);
        list.appendChild(div);
      });
      var activeCount = getActive().length;
      document.getElementById("counter").textContent = activeCount;
      var btn = document.getElementById("drawBtn");
      btn.disabled = (queue.length === 0 && activeCount < 2) || (queue.length > 0 && drawn.length >= queue.length);
      var startBtn = document.getElementById("startBtn");
      if (startBtn) startBtn.disabled = activeCount < 4;
    }

    function shuffle(arr) {
      var a = arr.slice();
      for (var i = a.length-1; i > 0; i--) { var j = Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
      return a;
    }

    document.getElementById("addBtn").onclick = function() {
      var input = document.getElementById("nameInput");
      var name = input.value.trim();
      if (!name) return;
      var newCanon = getPlayerData(name).name || name;
      var exists = players.some(function(p) {
        var canon = getPlayerData(p.name).name || p.name;
        return canon === newCanon;
      });
      if (exists) { alert("ימושחת! אי אפשר להוסיף את אותו משתמש פעמיים"); return; }
      players.push({name: name, active: true});
      save(); input.value = ""; input.focus(); render();
    };

    document.getElementById("nameInput").addEventListener("keydown", function(e) {
      if (e.key === "Enter") document.getElementById("addBtn").click();
    });

    let _audioCtx = null;
    function getAudio() {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      return _audioCtx;
    }
    function playTick(speed) {
      try {
        var ctx = getAudio();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        // pitch rises as speed increases (faster = higher pitch)
        osc.frequency.value = 300 + (1 - speed) * 600;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
      } catch(e) {}
    }
    function playFanfare() {
      try {
        var ctx = getAudio();
        var notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        notes.forEach(function(freq, i) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          var t = ctx.currentTime + i * 0.12;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      } catch(e) {}
    }

    var _faliAudioB64 = "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";
    function playFaliSound() {
      try {
        var audio = new Audio("data:audio/mp4;base64," + _faliAudioB64);
        audio.volume = 0.85;
        audio.play();
      } catch(e) {}
    }

    function spawnConfetti(x, y) {
      var colors = ["#d4af37","#f5e27a","#fff","#e8c84a","#b8922a","#ffe066"];
      for (var i = 0; i < 60; i++) {
        var p = document.createElement("div");
        p.className = "confetti-piece";
        var size = 6 + Math.random() * 10;
        p.style.cssText = [
          "left:" + (x - 30 + Math.random() * 60) + "px",
          "top:" + y + "px",
          "width:" + size + "px",
          "height:" + size + "px",
          "background:" + colors[Math.floor(Math.random() * colors.length)],
          "border-radius:" + (Math.random() > 0.5 ? "50%" : "2px"),
          "animation-duration:" + (0.9 + Math.random() * 1.4) + "s",
          "animation-delay:" + (Math.random() * 0.3) + "s",
          "transform:translateX(" + (-60 + Math.random() * 120) + "px)"
        ].join(";");
        document.body.appendChild(p);
        setTimeout(function(el){ el.remove(); }, 2500, p);
      }
    }

    function buildSlotCardHTML(name) {
      var pd = getPlayerData(name);
      var av = pd.img
        ? '<img class="slot-avatar" src="' + pd.img + '"/>'
        : '<div class="slot-avatar-ph">👤</div>';
      var nk = pd.nick ? '<div class="slot-nick">' + pd.nick + '</div>' : '';
      return av + `<div class="slot-name">${escapeHtml(pd.name || name)}</div>` + nk;
    }

    let _slotRunning = false;
    function animateSlotMachine(winner, onDone) {
      if (_slotRunning) return;
      _slotRunning = true;
      var overlay = document.createElement("div");
      overlay.className = "slot-overlay";
      overlay.innerHTML = '<div class="slot-title">מגריל...</div><div class="slot-card" id="slotCard"></div>';
      document.body.appendChild(overlay);

      var card = document.getElementById("slotCard");
      // Cycle only through players not yet drawn (winner stays in the pool)
      var drawnSet = {};
      drawn.forEach(function(n) { drawnSet[getPlayerData(n).name || n] = true; });
      var allNames = queue.filter(function(n) {
        return !drawnSet[getPlayerData(n).name || n];
      });
      if (allNames.length === 0) allNames = [winner];
      var step = 0, totalSteps = 18, lastShown = null;
      var delays = [];
      // Accelerate then decelerate — total ~3.5s
      for (var i = 0; i < totalSteps; i++) {
        var t = i / totalSteps;
        if (t < 0.45) delays.push(60);          // fast
        else if (t < 0.75) delays.push(60 + (t-0.45)*600); // slowing
        else delays.push(200 + (t-0.75)*300);    // landing
      }

      function nextStep() {
        var isLast = step >= totalSteps - 1;
        var name;
        if (isLast) {
          name = winner;
        } else if (allNames.length === 1) {
          name = allNames[0];
        } else {
          var pool = allNames.filter(function(n) { return n !== lastShown; });
          name = pool[Math.floor(Math.random() * pool.length)];
        }
        lastShown = name;
        card.innerHTML = buildSlotCardHTML(name);
        if (isLast) {
          card.classList.add("winner");
          playFanfare();
          var rect = card.getBoundingClientRect();
          spawnConfetti(rect.left + rect.width/2, rect.top + rect.height/2);
          setTimeout(function() { _slotRunning = false; onDone(overlay, card); }, 1100);
        } else {
          // speed: 1=fast, 0=slow — based on progress
          var speed = 1 - (step / totalSteps);
          playTick(speed);
          step++;
          setTimeout(nextStep, delays[step]);
        }
      }

      card.innerHTML = buildSlotCardHTML(allNames[0]);
      setTimeout(nextStep, delays[0]);
    }

    function flyCardToSlot(overlay, slotCard, winner) {
      // Commit the draw
      drawn.push(winner);
      renderResults();
      if (drawn.length >= queue.length) { document.getElementById("resetBtn").style.display = "block"; document.getElementById("statsBtn").style.display = "block"; _statsPlayers = queue.slice(); }
      render();

      // Find the destination: last non-empty player card in results
      var allCards = document.querySelectorAll(".player-card:not(.empty), .pc-avatar-lg, .solo-avatar");
      var destEl = allCards[allCards.length - 1];
      var srcRect = slotCard.getBoundingClientRect();

      // Build flying card
      var fly = document.createElement("div");
      fly.className = "flying-card";
      var pd = getPlayerData(winner);
      var av = pd.img ? '<img style="width:80px;height:80px;border-radius:50%;object-fit:cover" src="' + pd.img + '"/>' : '<div style="font-size:36px">👤</div>';
      fly.innerHTML = av + '<div style="font-size:18px;font-weight:700;color:#fff">' + (pd.name || winner) + '</div>';
      fly.style.cssText = "left:" + srcRect.left + "px;top:" + srcRect.top + "px;width:" + srcRect.width + "px;opacity:1;";
      document.body.appendChild(fly);

      // Remove overlay
      overlay.remove();

      // Fly to destination
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          if (destEl) {
            var dRect = destEl.getBoundingClientRect();
            fly.style.left = dRect.left + "px";
            fly.style.top = dRect.top + "px";
            fly.style.width = dRect.width + "px";
            fly.style.opacity = "0";
            fly.style.transform = "scale(0.5)";
          } else {
            fly.style.opacity = "0";
          }
          setTimeout(function() { fly.remove(); document.getElementById("drawBtn").disabled = false; }, 750);
        });
      });
    }

    document.getElementById("drawBtn").onclick = function() {
      if (queue.length === 0) {
        queue = shuffle(getActive().map(function(p) { return p.name; }));
        drawn = [];
        document.getElementById("resetBtn").style.display = "none";
      }
      if (drawn.length >= queue.length) return;
      var winner = queue[drawn.length];
      document.getElementById("drawBtn").disabled = true;

      animateSlotMachine(winner, function(overlay, slotCard) {
        flyCardToSlot(overlay, slotCard, winner);
      });
    };

    document.getElementById("resetBtn").onclick = function() {
      queue = []; drawn = [];
      document.getElementById("results").innerHTML = "";
      document.getElementById("resetBtn").style.display = "none";
      document.getElementById("statsBtn").style.display = "none";
      render();
    };

    function showDrawView() {
      _sessionWins = {};
      queue = shuffle(getActive().map(function(p) { return p.name; }));
      drawn = [];
      document.getElementById("results").innerHTML = "";
      document.getElementById("resetBtn").style.display = "none";
      document.getElementById("statsBtn").style.display = "none";
      // Build player chips summary
      var summary = document.getElementById("drawPlayersSummary");
      summary.innerHTML = "";
      getActive().forEach(function(p) {
        var pd = getPlayerData(p.name);
        var chip = document.createElement("div");
        chip.className = "draw-player-chip";
        var av = pd.img ? '<img src="' + pd.img + '"/>' : '';
        chip.innerHTML = av + '<span>' + (pd.name || p.name) + '</span>';
        summary.appendChild(chip);
      });
      document.getElementById("setup-view").style.display = "none";
      document.getElementById("draw-view").style.display = "block";
      window.scrollTo(0, 0);
      render();
    }

    function showSetupView() {
      queue = []; drawn = [];
      document.getElementById("results").innerHTML = "";
      document.getElementById("resetBtn").style.display = "none";
      document.getElementById("draw-view").style.display = "none";
      document.getElementById("setup-view").style.display = "block";
      window.scrollTo(0, 0);
      render();
    }

    document.getElementById("startBtn").onclick = showDrawView;
    document.getElementById("backBtn").onclick = showSetupView;



    function showCoinView() {
      document.getElementById("setup-view").style.display = "none";
      document.getElementById("draw-view").style.display = "none";
      document.getElementById("coin-view").classList.add("active");
      // Reset coin
      var coin = document.getElementById("coin3d");
      coin.style.transition = "none";
      coin.style.transform = "rotateY(0deg)";
      document.getElementById("coinResult").className = "coin-result";
      document.getElementById("coinResult").textContent = "";
      document.getElementById("coinHint").textContent = "";
      window.scrollTo(0, 0);
    }

    function hideCoinView() {
      document.getElementById("coin-view").classList.remove("active");
      document.getElementById("setup-view").style.display = "block";
      window.scrollTo(0, 0);
    }

    function removeWhiteBg(imgEl) {
      if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) return;
      requestAnimationFrame(function() { try {
        var c = document.createElement('canvas');
        c.width = imgEl.naturalWidth; c.height = imgEl.naturalHeight;
        var ctx = c.getContext('2d');
        ctx.drawImage(imgEl, 0, 0);
        var d = ctx.getImageData(0, 0, c.width, c.height), px = d.data;
        for (var i = 0; i < px.length; i += 4) {
          if (px[i] > 180 && px[i+1] > 180 && px[i+2] > 180) px[i+3] = 0;
        }
        ctx.putImageData(d, 0, 0);
        // Find bounding box of non-transparent pixels and crop to it
        var minX=c.width, minY=c.height, maxX=0, maxY=0;
        for (var y=0; y<c.height; y++) for (var x=0; x<c.width; x++) {
          if (px[(y*c.width+x)*4+3] > 10) {
            if (x<minX) minX=x; if (x>maxX) maxX=x;
            if (y<minY) minY=y; if (y>maxY) maxY=y;
          }
        }
        var pad = 10;
        minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad);
        maxX=Math.min(c.width-1,maxX+pad); maxY=Math.min(c.height-1,maxY+pad);
        var w=maxX-minX, h=maxY-minY, side=Math.max(w,h);
        var cx=Math.round((minX+maxX)/2), cy=Math.round((minY+maxY)/2);
        var c2=document.createElement('canvas');
        c2.width=side; c2.height=side;
        var ctx2=c2.getContext('2d');
        ctx2.drawImage(c, cx-side/2, cy-side/2, side, side, 0, 0, side, side);
        imgEl.src = c2.toDataURL('image/png');
      } catch(e) {} }); // end requestAnimationFrame
    }

    function playCoinSpinSound() {
      try {
        var ctx = getAudio();
        // 20 metallic clicks that start fast and slow down (like a real spinning coin)
        var times = [];
        var t = 0;
        for (var k = 0; k < 20; k++) {
          times.push(t);
          // interval grows: starts ~40ms, ends ~200ms
          t += 0.04 + k * 0.008;
        }
        times.forEach(function(when) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.value = 900 + Math.random() * 400;
          gain.gain.setValueAtTime(0.25, ctx.currentTime + when);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.04);
          osc.start(ctx.currentTime + when);
          osc.stop(ctx.currentTime + when + 0.05);
        });
      } catch(e) {}
    }
    let _coinFlipping = false;
    function flipCoin() {
      if (_coinFlipping) return;
      _coinFlipping = true;
      var isOdetz = Math.random() < 0.5;
      var landAngle = isOdetz ? 1800 : 1980;
      var coin = document.getElementById("coin3d");
      var result = document.getElementById("coinResult");
      var hint = document.getElementById("coinHint");
      result.className = "coin-result";
      result.textContent = "";
      hint.textContent = "";
      playCoinSpinSound();
      coin.style.transition = "none";
      coin.style.transform = "rotateY(0deg)";
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          coin.style.transition = "transform 2.8s cubic-bezier(0.25,0.46,0.45,0.94)";
          coin.style.transform = "rotateY(" + landAngle + "deg)";
          setTimeout(function() {
            result.textContent = isOdetz ? "🏆 אודץ!" : "💀 פלי!";
            result.className = "coin-result show";
            hint.textContent = "לחץ להגרלה מחדש";
            _coinFlipping = false;
          }, 3000);
        });
      });
    }

    let _coinBgRemoved = false;
    function initCoinImages() {
      if (_coinBgRemoved) return;
      var imgs = document.querySelectorAll('.coin-face img');
      imgs.forEach(function(img) { removeWhiteBg(img); });
      _coinBgRemoved = true;
    }

    document.getElementById("coinViewBtn").onclick = function() {
      showCoinView();
      setTimeout(initCoinImages, 50);
    };
    document.getElementById("coinFlipBtn").onclick = flipCoin;
    document.getElementById("coinScene").onclick = function() {
      if (!_coinFlipping && document.getElementById("coinResult").textContent) flipCoin();
    };
    document.getElementById("coinBackBtn").onclick = hideCoinView;


    // ===== STATS =====
    let _statsPlayers = []; // players who participated in last draw

    let _sessionWins = JSON.parse(localStorage.getItem('fifa_session_wins') || '{}');
    function saveWins() { localStorage.setItem('fifa_session_wins', JSON.stringify(_sessionWins)); }

    function renderStatsView() {
      // Players section
      var container = document.getElementById("statsPlayers");
      container.innerHTML = "";
      _statsPlayers.forEach(function(name) {
        var pd = getPlayerData(name);
        var row = document.createElement("div");
        row.className = "stats-player";
        var av = pd.img
          ? '<img class="stats-player-avatar" src="' + pd.img + '"/>'
          : '<div class="stats-player-avatar-ph">👤</div>';
        var wins = _sessionWins[name] || 0;
        var minusBtn = document.createElement("div");
        minusBtn.className = "stats-minus-btn";
        minusBtn.textContent = "−";
        var plusBtn = document.createElement("div");
        plusBtn.className = "stats-plus-btn";
        plusBtn.textContent = "+";
        row.innerHTML = av +
          '<div class="stats-player-info">' +
            `<div class="stats-player-name">${escapeHtml(name)}</div>` +
            (pd.nick ? '<div class="stats-player-nick">' + pd.nick + '</div>' : '') +
          '</div>' +
          '<div class="stats-player-wins">' +
            '<div class="stats-win-count" id="wc-' + name + '">' + wins + '</div>' +
            '<div class="stats-win-label">נצחונות</div>' +
          '</div>' +
          '<div class="stats-btn-group"></div>';
        row.querySelector(".stats-btn-group").appendChild(minusBtn);
        row.querySelector(".stats-btn-group").appendChild(plusBtn);
        (function(n) {
          plusBtn.onclick = function(e) {
            e.stopPropagation();
            _sessionWins[n] = (_sessionWins[n] || 0) + 1;
            saveWins();
            document.getElementById("wc-" + n).textContent = _sessionWins[n];
            renderLeaderboard();
          };
          minusBtn.onclick = function(e) {
            e.stopPropagation();
            if ((_sessionWins[n] || 0) > 0) { _sessionWins[n]--; saveWins(); }
            document.getElementById("wc-" + n).textContent = _sessionWins[n] || 0;
            renderLeaderboard();
          };
        })(name);
        container.appendChild(row);
      });
      renderLeaderboard();
    }

    function renderLeaderboard() {
      var lb = document.getElementById("leaderboard");
      lb.innerHTML = "";
      // All players ever (union of _statsPlayers and anyone with wins)
      var allNames = _statsPlayers.slice();
      // Sort by wins desc
      allNames.sort(function(a,b) { return (_sessionWins[b]||0) - (_sessionWins[a]||0); });
      var rank = 1;
      allNames.forEach(function(name, idx) {
        var pd = getPlayerData(name);
        var wins = _sessionWins[name] || 0;
        // Same wins = same rank
        if (idx > 0 && (_sessionWins[allNames[idx-1]]||0) > wins) rank = idx + 1;
        var rankClass = rank === 1 ? 'lb-rank-1' : rank === 2 ? 'lb-rank-2' : rank === 3 ? 'lb-rank-3' : 'lb-rank-other';
        var rankSymbol = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank + '.';
        var av = pd.img
          ? '<img class="lb-avatar" src="' + pd.img + '"/>'
          : '<div class="lb-avatar-ph">👤</div>';
        var row = document.createElement("div");
        row.className = "lb-row";
        row.className = 'lb-row' + (rank === 1 ? ' rank-1' : '');
        row.innerHTML = '<div class="lb-rank ' + rankClass + '">' + rankSymbol + '</div>' +
          av +
          `<div class="lb-name">${escapeHtml(name)}` + (pd.nick ? ` <span style="font-size:11px;color:rgba(212,175,55,0.6)">${escapeHtml(pd.nick)}</span>` : '') + '</div>' +
          '<div class="lb-wins' + (wins === 0 ? '-zero' : '') + '">' + wins + '</div>';
        lb.appendChild(row);
      });
    }

    let _statsOrigin = "setup";
    let _history = JSON.parse(localStorage.getItem("fifa_history") || "[]");
    function saveHistory() { localStorage.setItem("fifa_history", JSON.stringify(_history)); }

    function todayStr() {
      var d = new Date();
      return ("0"+d.getDate()).slice(-2) + "." + ("0"+(d.getMonth()+1)).slice(-2) + "." + d.getFullYear();
    }

    function showStatsView(origin) {
      _statsOrigin = origin || "setup";
      document.getElementById("setup-view").style.display = "none";
      document.getElementById("draw-view").style.display = "none";
      document.getElementById("stats-view").classList.add("active");
      if (_statsOrigin === "draw") {
        document.getElementById("statsDrawMode").style.display = "block";
        document.getElementById("statsHistoryMode").style.display = "none";
        renderStatsView();
      } else {
        document.getElementById("statsDrawMode").style.display = "none";
        document.getElementById("statsHistoryMode").style.display = "block";
        renderHistoryView();
      }
      window.scrollTo(0,0);
    }

    function hideStatsView() {
      document.getElementById("stats-view").classList.remove("active");
      if (_statsOrigin === "draw") {
        document.getElementById("draw-view").style.display = "block";
      } else {
        document.getElementById("setup-view").style.display = "block";
      }
      window.scrollTo(0,0);
    }

    function renderHistoryView() {
      var list = document.getElementById("statsHistoryList");
      list.innerHTML = "";
      if (_history.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.25);padding:2rem;font-size:14px;">עוד אין היסטוריה שמורה</div>';
        return;
      }
      // Most recent first
      var sorted = _history.slice().reverse();
      sorted.forEach(function(session, idx) {
        var card = document.createElement("div");
        card.className = "history-card";
        var bodyHTML = session.results.map(function(r, idx) {
          var pd = getPlayerData(r.name);
          var rank = idx + 1;
          var symbol = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank + ".";
          var av = pd.img ? '<img class="history-lb-avatar" src="'+pd.img+'"/>' : '<div class="history-lb-avatar-ph">👤</div>';
          var winsClass = r.wins === 0 ? "history-lb-wins-zero" : "history-lb-wins";
          var rowStyle = rank === 1 ? ' style="background:rgba(212,175,55,0.08);border-radius:10px"' : '';
          return '<div class="history-lb-row"'+rowStyle+'><div class="history-lb-rank">'+symbol+'</div>'+av+'<div class="history-lb-name">'+r.name+'</div><div class="'+winsClass+'">'+r.wins+'</div></div>';
        }).join("");
        var editIdx = _history.length - 1 - idx; // reverse index (we reversed the array)
        card.innerHTML = '<div class="history-card-header"><div><div class="history-date">'+session.date+'</div><div class="history-meta">'+session.results.length+' משתתפים</div></div><div class="history-chevron">▼</div></div><div class="history-body">'+bodyHTML+'<button class="history-edit-btn">✏️ ערוך</button><button class="history-delete-btn">🗑️ מחק</button></div>';
        (function(ei, sess) {
          card.querySelector(".history-edit-btn").onclick = function(e) {
            e.stopPropagation();
            _editingHistoryIndex = ei;
            _statsPlayers = sess.results.map(function(r) { return r.name; });
            _sessionWins = {};
            sess.results.forEach(function(r) { _sessionWins[r.name] = r.wins; });
            _statsOrigin = "setup";
            document.getElementById("statsHistoryMode").style.display = "none";
            document.getElementById("statsDrawMode").style.display = "block";
            renderStatsView();
            window.scrollTo(0,0);
          };
          card.querySelector(".history-delete-btn").onclick = function(e) {
            e.stopPropagation();
            showConfirm("למחוק את השמירה מ-" + sess.date + "?", function() {
              _history.splice(ei, 1);
              saveHistory();
              renderHistoryView();
            });
          };
        })(editIdx, session);
        card.querySelector(".history-card-header").onclick = function() {
          card.classList.toggle("open");
        };
        list.appendChild(card);
      });
    }

    let _editingHistoryIndex = -1; // -1 = new session, >= 0 = editing existing

    document.getElementById("statsSaveBtn").onclick = function() {
      var results = _statsPlayers.map(function(name) {
        return { name: name, wins: _sessionWins[name] || 0 };
      });
      results.sort(function(a,b) { return b.wins - a.wins; });
      if (_editingHistoryIndex >= 0) {
        _history[_editingHistoryIndex].results = results;
      } else {
        _history.push({ date: todayStr(), timestamp: Date.now(), results: results });
      }
      saveHistory();
      _editingHistoryIndex = -1;
      // Reset current wins for this session
      _statsPlayers.forEach(function(n) { _sessionWins[n] = 0; });
      saveWins();
      showToast("התוצאות נשמרו! ✅");
      hideStatsView();
    };

    document.getElementById("statsBtn").onclick = function() { showStatsView("draw"); };
    document.getElementById("statsBtnSetup").onclick = function() { showStatsView("setup"); };
    document.getElementById("statsBackBtn").onclick = hideStatsView;


    function showToast(msg) {
      var t = document.getElementById("toast");
      t.textContent = msg;
      t.classList.add("show");
      setTimeout(function() { t.classList.remove("show"); }, 2200);
    }

    function showConfirm(msg, onYes) {
      var overlay = document.getElementById("confirmOverlay");
      document.getElementById("confirmMsg").textContent = msg;
      overlay.style.display = "flex";
      document.getElementById("confirmYes").onclick = function() {
        overlay.style.display = "none";
        onYes();
      };
      document.getElementById("confirmNo").onclick = function() {
        overlay.style.display = "none";
      };
    }

    render();
