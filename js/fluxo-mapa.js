/* ==========================================================================
   FLUXO — Aventura no Mapa
   Modo divertido do Fluxo: um labirinto em canvas, em tempo real, onde a
   glicose precisa desviar de obstáculos até alcançar a saída de cada fase.
   Sem perguntas, sem conteúdo didático — só desafio. Exposto como
   window.FluxoMapa.mount(container) -> { stop() }.
   ========================================================================== */

(function () {
  var CELL = 48;
  var COLS = 12;
  var ROWS = 8;
  var PLAYER_SPEED = 200; // px/s
  var PLAYER_R = CELL * 0.32;
  var OBSTACLE_R = CELL * 0.3;
  var INVULN_TIME = 1.1; // s
  var LIVES_START = 3;
  var BEST_KEY = "fluxo_mapa_best_v1";

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cellCenter(cx, cy) {
    return { x: (cx + 0.5) * CELL, y: (cy + 0.5) * CELL };
  }

  function barrierRow(y, gapX) {
    var cells = [];
    for (var x = 0; x < COLS; x++) {
      if (x !== gapX) cells.push([x, y]);
    }
    return cells;
  }

  function buildObstacle(fromCell, toCell, speed, startAtTo) {
    var from = cellCenter(fromCell[0], fromCell[1]);
    var to = cellCenter(toCell[0], toCell[1]);
    return {
      from: from,
      to: to,
      speed: speed,
      dir: startAtTo ? -1 : 1,
      x: startAtTo ? to.x : from.x,
      y: startAtTo ? to.y : from.y,
    };
  }

  function buildLevel(opts) {
    var walls = []
      .concat(barrierRow(1, opts.gaps[0]))
      .concat(barrierRow(3, opts.gaps[1]))
      .concat(barrierRow(5, opts.gaps[2]));
    var wallSet = {};
    walls.forEach(function (c) {
      wallSet[c[0] + "," + c[1]] = true;
    });
    return {
      wallSet: wallSet,
      start: cellCenter(0, 0),
      goal: cellCenter(opts.goalX, 7),
      buildObstacles: opts.buildObstacles,
    };
  }

  var LEVELS = [
    buildLevel({
      gaps: [11, 0, 11],
      goalX: 6,
      buildObstacles: function () {
        return [
          buildObstacle([2, 2], [9, 2], 95, false),
          buildObstacle([2, 4], [9, 4], 105, true),
        ];
      },
    }),
    buildLevel({
      gaps: [0, 11, 0],
      goalX: 5,
      buildObstacles: function () {
        return [
          buildObstacle([2, 2], [9, 2], 115, false),
          buildObstacle([2, 4], [9, 4], 125, true),
          buildObstacle([2, 6], [9, 6], 105, false),
        ];
      },
    }),
    buildLevel({
      gaps: [11, 0, 11],
      goalX: 10,
      buildObstacles: function () {
        return [
          buildObstacle([2, 2], [9, 2], 145, false),
          buildObstacle([2, 4], [9, 4], 160, true),
          buildObstacle([2, 6], [9, 6], 150, false),
          buildObstacle([7, 7], [10, 7], 130, true),
        ];
      },
    }),
  ];

  function isSolid(level, gx, gy) {
    if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return true;
    return !!level.wallSet[gx + "," + gy];
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function circleHitsWalls(level, cx, cy, r) {
    var minCol = Math.floor((cx - r) / CELL);
    var maxCol = Math.floor((cx + r) / CELL);
    var minRow = Math.floor((cy - r) / CELL);
    var maxRow = Math.floor((cy + r) / CELL);
    for (var gy = minRow; gy <= maxRow; gy++) {
      for (var gx = minCol; gx <= maxCol; gx++) {
        if (!isSolid(level, gx, gy)) continue;
        var rectX = gx * CELL;
        var rectY = gy * CELL;
        var closestX = clamp(cx, rectX, rectX + CELL);
        var closestY = clamp(cy, rectY, rectY + CELL);
        var dx = cx - closestX;
        var dy = cy - closestY;
        if (dx * dx + dy * dy < r * r) return true;
      }
    }
    return false;
  }

  function formatTime(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function loadBest() {
    try {
      var raw = localStorage.getItem(BEST_KEY);
      var val = raw ? parseInt(raw, 10) : 0;
      return isNaN(val) ? 0 : val;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(ms) {
    try {
      localStorage.setItem(BEST_KEY, String(ms));
    } catch (e) {}
  }

  function el(html) {
    var wrap = document.createElement("div");
    wrap.innerHTML = html.trim();
    return wrap.firstElementChild;
  }

  function mount(container) {
    container.innerHTML = "";

    var arena = el('<div class="fx-arena"></div>');

    var hud = el(
      '<div class="fx-arena-hud">' +
        '<div class="fx-arena-hud-badge"><span class="fx-arena-hud-label">Fase</span><strong data-hud="level">1/' +
        LEVELS.length +
        "</strong></div>" +
        '<div class="fx-arena-hud-badge"><span class="fx-arena-hud-label">Vidas</span><strong data-hud="lives">' +
        LIVES_START +
        "</strong></div>" +
        '<div class="fx-arena-hud-badge"><span class="fx-arena-hud-label">Tempo</span><strong data-hud="time">00:00</strong></div>' +
        '<div class="fx-arena-hud-badge"><span class="fx-arena-hud-label">Recorde</span><strong data-hud="best">' +
        (loadBest() ? formatTime(loadBest()) : "--:--") +
        "</strong></div>" +
        "</div>"
    );
    arena.appendChild(hud);

    var canvasWrap = el('<div class="fx-arena-canvas-wrap"></div>');
    var dpr = window.devicePixelRatio || 1;
    var canvas = document.createElement("canvas");
    canvas.className = "fx-arena-canvas";
    canvas.width = COLS * CELL * dpr;
    canvas.height = ROWS * CELL * dpr;
    canvasWrap.appendChild(canvas);

    var overlay = el(
      '<div class="fx-arena-overlay">' +
        '<div class="fx-arena-overlay-card">' +
        '<h3 data-overlay="title"></h3>' +
        '<p data-overlay="text"></p>' +
        '<button type="button" class="fx-btn fx-btn-primary" data-overlay="btn"></button>' +
        "</div>" +
        "</div>"
    );
    canvasWrap.appendChild(overlay);
    arena.appendChild(canvasWrap);

    var dpad = el(
      '<div class="fx-arena-dpad">' +
        '<button type="button" class="fx-arena-dpad-btn" data-dir="up" aria-label="Cima">↑</button>' +
        '<button type="button" class="fx-arena-dpad-btn" data-dir="left" aria-label="Esquerda">←</button>' +
        '<button type="button" class="fx-arena-dpad-btn" data-dir="down" aria-label="Baixo">↓</button>' +
        '<button type="button" class="fx-arena-dpad-btn" data-dir="right" aria-label="Direita">→</button>' +
        "</div>"
    );
    arena.appendChild(dpad);

    container.appendChild(arena);

    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    var hudEls = {
      level: hud.querySelector('[data-hud="level"]'),
      lives: hud.querySelector('[data-hud="lives"]'),
      time: hud.querySelector('[data-hud="time"]'),
      best: hud.querySelector('[data-hud="best"]'),
    };
    var overlayEls = {
      title: overlay.querySelector('[data-overlay="title"]'),
      text: overlay.querySelector('[data-overlay="text"]'),
      btn: overlay.querySelector('[data-overlay="btn"]'),
    };

    var keys = { up: false, down: false, left: false, right: false };

    var game = {
      levelIndex: 0,
      lives: LIVES_START,
      elapsed: 0,
      invuln: 0,
      status: "playing",
      player: null,
      obstacles: null,
    };

    function loadLevel(index) {
      var level = LEVELS[index];
      game.player = { x: level.start.x, y: level.start.y };
      game.obstacles = level.buildObstacles();
      game.invuln = INVULN_TIME;
    }

    function resetRun() {
      game.levelIndex = 0;
      game.lives = LIVES_START;
      game.elapsed = 0;
      game.status = "playing";
      loadLevel(0);
      hideOverlay();
    }

    function showOverlay(title, text, btnLabel, onClick) {
      overlayEls.title.textContent = title;
      overlayEls.text.textContent = text;
      overlayEls.btn.textContent = btnLabel;
      overlayEls.btn.onclick = onClick;
      overlay.classList.add("is-active");
    }

    function hideOverlay() {
      overlay.classList.remove("is-active");
    }

    function respawnAfterHit() {
      game.lives -= 1;
      if (game.lives <= 0) {
        game.status = "game-over";
        showOverlay(
          "Fim de jogo",
          "Você usou todas as vidas na fase " + (game.levelIndex + 1) + " de " + LEVELS.length + ".",
          "Tentar novamente",
          function () {
            resetRun();
          }
        );
        return;
      }
      var level = LEVELS[game.levelIndex];
      game.player.x = level.start.x;
      game.player.y = level.start.y;
      game.invuln = INVULN_TIME;
    }

    function onGoalReached() {
      if (game.levelIndex >= LEVELS.length - 1) {
        game.status = "victory";
        var best = loadBest();
        var isNewBest = !best || game.elapsed < best;
        if (isNewBest) saveBest(Math.floor(game.elapsed));
        hudEls.best.textContent = formatTime(isNewBest ? game.elapsed : best);
        showOverlay(
          "Você chegou!",
          "Tempo total: " +
            formatTime(game.elapsed) +
            (isNewBest ? " — novo recorde!" : "."),
          "Jogar novamente",
          function () {
            resetRun();
          }
        );
        return;
      }
      game.status = "level-complete";
      var nextIndex = game.levelIndex + 1;
      showOverlay(
        "Fase " + (game.levelIndex + 1) + " concluída!",
        "Prepare-se para a próxima fase.",
        "Continuar",
        function () {
          game.levelIndex = nextIndex;
          game.status = "playing";
          loadLevel(nextIndex);
          hideOverlay();
        }
      );
    }

    function update(dt) {
      game.elapsed += dt * 1000;
      hudEls.time.textContent = formatTime(game.elapsed);

      if (game.invuln > 0) game.invuln -= dt;

      var level = LEVELS[game.levelIndex];
      var vx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      var vy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }

      var newX = game.player.x + vx * PLAYER_SPEED * dt;
      if (!circleHitsWalls(level, newX, game.player.y, PLAYER_R)) {
        game.player.x = newX;
      }
      var newY = game.player.y + vy * PLAYER_SPEED * dt;
      if (!circleHitsWalls(level, game.player.x, newY, PLAYER_R)) {
        game.player.y = newY;
      }

      game.obstacles.forEach(function (o) {
        var target = o.dir === 1 ? o.to : o.from;
        var dx = target.x - o.x;
        var dy = target.y - o.y;
        var dist = Math.hypot(dx, dy);
        var step = o.speed * dt;
        if (dist <= step || dist === 0) {
          o.x = target.x;
          o.y = target.y;
          o.dir *= -1;
        } else {
          o.x += (dx / dist) * step;
          o.y += (dy / dist) * step;
        }
      });

      if (game.invuln <= 0) {
        for (var i = 0; i < game.obstacles.length; i++) {
          var o = game.obstacles[i];
          var d = Math.hypot(o.x - game.player.x, o.y - game.player.y);
          if (d < OBSTACLE_R + PLAYER_R) {
            respawnAfterHit();
            break;
          }
        }
      }

      if (game.status === "playing") {
        var dg = Math.hypot(level.goal.x - game.player.x, level.goal.y - game.player.y);
        if (dg < CELL * 0.4) {
          onGoalReached();
        }
      }

      hudEls.level.textContent = game.levelIndex + 1 + "/" + LEVELS.length;
      hudEls.lives.textContent = Math.max(0, game.lives);
    }

    function draw() {
      var level = LEVELS[game.levelIndex];
      var styles = getComputedStyle(document.documentElement);
      var colorSurface = styles.getPropertyValue("--surface").trim() || "#fff";
      var colorWall = styles.getPropertyValue("--border-subtle").trim() || "#ccc";
      var colorTeal = styles.getPropertyValue("--teal").trim() || "#2f7d52";
      var colorCoral = styles.getPropertyValue("--coral").trim() || "#c1592c";

      ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
      ctx.fillStyle = colorSurface;
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

      ctx.fillStyle = colorWall;
      Object.keys(level.wallSet).forEach(function (key) {
        var parts = key.split(",");
        var x = parseInt(parts[0], 10) * CELL;
        var y = parseInt(parts[1], 10) * CELL;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      });

      var goalPulse = reduceMotion ? CELL * 0.32 : CELL * 0.32 + Math.sin(game.elapsed / 180) * 3;
      ctx.beginPath();
      ctx.arc(level.goal.x, level.goal.y, goalPulse, 0, Math.PI * 2);
      ctx.strokeStyle = colorTeal;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = colorCoral;
      game.obstacles.forEach(function (o) {
        ctx.beginPath();
        ctx.arc(o.x, o.y, OBSTACLE_R, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = game.invuln > 0 && Math.floor(game.elapsed / 90) % 2 === 0 ? 0.4 : 1;
      ctx.fillStyle = colorTeal;
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    var rafId = null;
    var lastTs = null;
    var running = true;

    function frame(ts) {
      if (!running) return;
      if (lastTs === null) lastTs = ts;
      var dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      if (game.status === "playing") update(dt);
      draw();
      rafId = requestAnimationFrame(frame);
    }

    function onKeyDown(e) {
      var handled = setKeyFromEvent(e, true);
      if (handled) e.preventDefault();
    }
    function onKeyUp(e) {
      var handled = setKeyFromEvent(e, false);
      if (handled) e.preventDefault();
    }
    function setKeyFromEvent(e, value) {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          keys.up = value;
          return true;
        case "ArrowDown":
        case "s":
        case "S":
          keys.down = value;
          return true;
        case "ArrowLeft":
        case "a":
        case "A":
          keys.left = value;
          return true;
        case "ArrowRight":
        case "d":
        case "D":
          keys.right = value;
          return true;
      }
      return false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function onVisibilityChange() {
      if (document.hidden) {
        lastTs = null;
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    var dirKeyMap = { up: "up", down: "down", left: "left", right: "right" };
    dpad.querySelectorAll(".fx-arena-dpad-btn").forEach(function (btn) {
      var dir = dirKeyMap[btn.getAttribute("data-dir")];
      var press = function (e) {
        e.preventDefault();
        keys[dir] = true;
      };
      var release = function () {
        keys[dir] = false;
      };
      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointercancel", release);
      btn.addEventListener("pointerleave", release);
    });

    loadLevel(0);
    rafId = requestAnimationFrame(frame);

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }

    return { stop: stop };
  }

  window.FluxoMapa = { mount: mount };
})();
