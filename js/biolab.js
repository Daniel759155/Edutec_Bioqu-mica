document.addEventListener("DOMContentLoaded", function () {
  var root = document.getElementById("biolab-game");
  if (!root) return;

  var STORAGE_KEY = "fluxo_progress_v1";
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ==========================================================================
     Dados — cenários, encaixes enzima/substrato, textos de estágio
     ========================================================================== */

  var SCENARIOS = [
    {
      id: "repouso",
      label: "Repouso",
      desc: "Tecido tranquilo, oxigênio de sobra circulando pelo sangue.",
      resolve: function () {
        return false;
      },
    },
    {
      id: "escadas",
      label: "Subindo escadas rápido",
      desc: "Esforço moderado — o oxigênio pode não dar conta da demanda.",
      resolve: function () {
        return Math.random() < 0.5;
      },
    },
    {
      id: "corrida",
      label: "Sprint máximo",
      desc: "Esforço extremo — as mitocôndrias não conseguem acompanhar.",
      resolve: function () {
        return true;
      },
    },
  ];

  var MATCHES = {
    glicolise: {
      prompt:
        "Uma enzima precisa reconhecer a glicose para prendê-la dentro da célula e começar a quebrá-la. Qual encaixa nela?",
      correct: {
        name: "Hexoquinase",
        desc: "Fosforila a glicose logo na entrada da célula, dando início à glicólise.",
      },
      distractors: [
        { name: "Lipase", desc: "Quebra lipídios em ácidos graxos e glicerol — não reconhece açúcares." },
        { name: "Amilase", desc: "Quebra amido em unidades menores, na digestão — não atua no citoplasma." },
        { name: "Pepsina", desc: "Digere proteínas no estômago — formato incompatível com a glicose." },
      ],
    },
    transicao: {
      prompt:
        "O piruvato chega à mitocôndria. Qual enzima o transforma em Acetil-CoA para que ele possa entrar no ciclo de Krebs?",
      correct: {
        name: "Piruvato desidrogenase",
        desc: "Remove um CO₂ do piruvato e o liga à coenzima A, formando Acetil-CoA.",
      },
      distractors: [
        { name: "DNA polimerase", desc: "Copia moléculas de DNA — sem relação com o metabolismo energético." },
        { name: "ATP sintase", desc: "Produz ATP a partir do gradiente de prótons — atua bem mais adiante." },
        { name: "Ribonuclease", desc: "Degrada moléculas de RNA — não reconhece o piruvato." },
      ],
    },
  };

  /* ==========================================================================
     Estado
     ========================================================================== */

  var state = null;

  function loadProgress() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && typeof raw === "object") return raw;
    } catch (e) {}
    return { best: 0, runs: 0 };
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {}
  }

  function buildSteps(oxygenLow) {
    if (oxygenLow) {
      return [
        { id: "glicolise-intro", type: "intro", milestone: 0 },
        { id: "glicolise-match", type: "match", milestone: 0, matchKey: "glicolise" },
        { id: "branch", type: "branch", milestone: 1 },
        { id: "fermentacao-intro", type: "fermentacao", milestone: 1 },
        { id: "receipt", type: "receipt", milestone: 2 },
      ];
    }
    return [
      { id: "glicolise-intro", type: "intro", milestone: 0 },
      { id: "glicolise-match", type: "match", milestone: 0, matchKey: "glicolise" },
      { id: "branch", type: "branch", milestone: 1 },
      { id: "transicao-intro", type: "intro", milestone: 1 },
      { id: "transicao-match", type: "match", milestone: 1, matchKey: "transicao" },
      { id: "krebs-intro", type: "intro", milestone: 2 },
      { id: "krebs-wheel", type: "wheel", milestone: 2 },
      { id: "cadeia-intro", type: "intro", milestone: 3 },
      { id: "cadeia-synthase", type: "synthase", milestone: 3 },
      { id: "receipt", type: "receipt", milestone: 4 },
    ];
  }

  function milestoneLabels(oxygenLow) {
    if (oxygenLow) return ["Glicólise", "Fermentação"];
    return ["Glicólise", "Piruvato → Acetil-CoA", "Ciclo de Krebs", "Cadeia + ATP sintase"];
  }

  function newState(scenario) {
    var oxygenLow = scenario.resolve();
    return {
      scenario: scenario,
      oxygenLow: oxygenLow,
      steps: buildSteps(oxygenLow),
      milestones: milestoneLabels(oxygenLow),
      stepIndex: 0,
      atp: 0,
      nadh: 0,
      fadh2: 0,
      co2: 0,
      lactate: false,
      krebsTurns: 0,
      synthaseDone: false,
      matchResolved: {},
    };
  }

  function currentStep() {
    return state.steps[state.stepIndex];
  }

  function advance() {
    state.stepIndex += 1;
    render();
    if (root.scrollIntoView && window.scrollY > 0) {
      var hud = root.querySelector(".fx-hud");
      (hud || root).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }

  /* ==========================================================================
     Utilidades de DOM
     ========================================================================== */

  function el(html) {
    var wrap = document.createElement("div");
    wrap.innerHTML = html.trim();
    return wrap.firstElementChild;
  }

  function esc(str) {
    return String(str).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ==========================================================================
     Telas
     ========================================================================== */

  function renderIntro() {
    var progress = loadProgress();
    root.innerHTML = "";

    var wrap = el('<div class="fx-intro"></div>');
    wrap.appendChild(el('<p class="fx-eyebrow">Fluxo</p>'));
    wrap.appendChild(el('<h2 class="fx-intro-title">Você é uma molécula de glicose.</h2>'));
    wrap.appendChild(
      el(
        '<p class="fx-intro-lead">Acabou de ser absorvida na corrente sanguínea. A partir daqui, o caminho que você percorre dentro da célula — e quanta energia sua jornada libera — depende do que a célula está vivendo agora. Escolha o cenário e siga a rota real da respiração celular.</p>'
      )
    );

    var stats = el('<div class="fx-intro-stats"></div>');
    stats.appendChild(
      el(
        '<div class="fx-intro-stat"><p class="fx-intro-stat-value">' +
          progress.best +
          '</p><p class="fx-intro-stat-label">Melhor rendimento (ATP)</p></div>'
      )
    );
    stats.appendChild(
      el(
        '<div class="fx-intro-stat"><p class="fx-intro-stat-value">' +
          progress.runs +
          '</p><p class="fx-intro-stat-label">Jornadas concluídas</p></div>'
      )
    );
    stats.appendChild(
      el(
        '<div class="fx-intro-stat"><p class="fx-intro-stat-value">38</p><p class="fx-intro-stat-label">ATP máximo possível</p></div>'
      )
    );
    wrap.appendChild(stats);

    var scenarioGrid = el('<div class="fx-scenarios"></div>');
    SCENARIOS.forEach(function (scenario) {
      var card = el(
        '<button type="button" class="fx-scenario">' +
          '<span class="fx-scenario-name">' +
          esc(scenario.label) +
          "</span>" +
          '<span class="fx-scenario-desc">' +
          esc(scenario.desc) +
          "</span>" +
          "</button>"
      );
      card.addEventListener("click", function () {
        state = newState(scenario);
        render();
      });
      scenarioGrid.appendChild(card);
    });
    wrap.appendChild(scenarioGrid);

    root.appendChild(wrap);
  }

  function renderHudAndMap(container) {
    var hud = el(
      '<div class="fx-hud">' +
        '<div class="fx-hud-badge"><strong>' +
        state.atp +
        '</strong><span>ATP</span></div>' +
        '<div class="fx-hud-badge"><strong>' +
        state.nadh +
        '</strong><span>NADH</span></div>' +
        '<div class="fx-hud-badge"><strong>' +
        state.fadh2 +
        '</strong><span>FADH₂</span></div>' +
        '<div class="fx-hud-badge"><strong>' +
        state.co2 +
        '</strong><span>CO₂</span></div>' +
        "</div>"
    );
    container.appendChild(hud);

    var step = currentStep();
    var map = el('<ol class="fx-map"></ol>');
    state.milestones.forEach(function (label, i) {
      var cls = "fx-map-node";
      if (i < step.milestone) cls += " is-done";
      if (i === step.milestone) cls += " is-current";
      map.appendChild(
        el('<li class="' + cls + '"><span class="fx-map-dot"></span><span class="fx-map-label">' + esc(label) + "</span></li>")
      );
    });
    container.appendChild(map);
  }

  function stageShell(container, stepNumber) {
    var stage = el('<div class="fx-stage"></div>');
    stage.appendChild(el('<p class="fx-eyebrow">Etapa ' + stepNumber + "</p>"));
    container.appendChild(stage);
    return stage;
  }

  var INTRO_TEXTS = {
    "glicolise-intro": {
      title: "Glicólise",
      text: "Você entra no citoplasma da célula. Aqui, em dez pequenas reações, você vai ser quebrada ao meio, virando duas moléculas de piruvato. O processo custa energia no início — mas devolve mais do que consome.",
    },
    "transicao-intro": {
      title: "A ponte para a mitocôndria",
      text: "Cada um dos dois piruvatos atravessa a membrana mitocondrial. Antes de entrar no ciclo de Krebs, cada um perde um átomo de carbono — e ganha uma coenzima.",
    },
    "krebs-intro": {
      title: "Ciclo de Krebs",
      text: "Dentro da matriz mitocondrial, o Acetil-CoA entra em uma roda química que gira sobre si mesma. A cada volta completa, a via colhe elétrons de alta energia e libera CO₂ — o mesmo que você solta ao respirar.",
    },
    "cadeia-intro": {
      title: "Cadeia transportadora de elétrons",
      text: "Todos os elétrons coletados até aqui — carregados por NADH e FADH₂ — chegam à membrana interna da mitocôndria. Eles caem de complexo em complexo, bombeando prótons para fora e criando um gradiente. Esse gradiente é a força que vai girar o motor final.",
    },
  };

  function renderIntroStep(container) {
    var step = currentStep();
    var copy = INTRO_TEXTS[step.id];
    var stage = stageShell(container, state.stepIndex + 1);
    stage.appendChild(el('<h3 class="fx-stage-title">' + esc(copy.title) + "</h3>"));
    stage.appendChild(el('<p class="fx-stage-text">' + copy.text + "</p>"));
    var actions = el('<div class="fx-stage-actions"></div>');
    var btn = el('<button type="button" class="fx-btn fx-btn-primary">Continuar</button>');
    btn.addEventListener("click", advance);
    actions.appendChild(btn);
    stage.appendChild(actions);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function renderMatchStep(container) {
    var step = currentStep();
    var data = MATCHES[step.matchKey];
    var stage = stageShell(container, state.stepIndex + 1);
    stage.appendChild(el('<h3 class="fx-stage-title">Encontre a enzima certa</h3>'));
    stage.appendChild(el('<p class="fx-match-prompt">' + data.prompt + "</p>"));

    var options = shuffle([data.correct].concat(data.distractors));
    var grid = el('<div class="fx-match-grid"></div>');
    var feedbackHolder = el('<div></div>');
    var resolved = false;

    options.forEach(function (option) {
      var isCorrect = option === data.correct;
      var btn = el(
        '<button type="button" class="fx-match-option">' +
          '<span class="fx-match-glyph">' +
          esc(option.name.charAt(0)) +
          "</span>" +
          '<span><span class="fx-match-name">' +
          esc(option.name) +
          '</span><span class="fx-match-desc">' +
          esc(option.desc) +
          "</span></span>" +
          "</button>"
      );
      btn.addEventListener("click", function () {
        if (resolved) return;
        if (isCorrect) {
          resolved = true;
          btn.classList.add("is-correct");
          grid.querySelectorAll(".fx-match-option").forEach(function (b) {
            b.disabled = true;
          });
          feedbackHolder.innerHTML = "";
          var fb = el(
            '<div class="fx-feedback is-correct"><strong>Encaixe perfeito.</strong> ' +
              esc(option.desc) +
              "</div>"
          );
          feedbackHolder.appendChild(fb);
          var cont = el('<div class="fx-stage-actions"></div>');
          var contBtn = el('<button type="button" class="fx-btn fx-btn-primary">Continuar</button>');
          contBtn.addEventListener("click", function () {
            resolveMatch(step.matchKey);
            advance();
          });
          cont.appendChild(contBtn);
          feedbackHolder.appendChild(cont);
        } else {
          btn.classList.add("is-wrong");
          btn.disabled = true;
          feedbackHolder.innerHTML = "";
          feedbackHolder.appendChild(
            el('<div class="fx-feedback is-wrong">Não encaixa: ' + esc(option.desc) + " Tente outra.</div>")
          );
        }
      });
      grid.appendChild(btn);
    });

    stage.appendChild(grid);
    stage.appendChild(feedbackHolder);
  }

  function resolveMatch(key) {
    if (key === "glicolise") {
      state.atp += 2;
      state.nadh += 2;
    } else if (key === "transicao") {
      state.nadh += 2;
      state.co2 += 2;
    }
  }

  function renderBranchStep(container) {
    var stage = stageShell(container, state.stepIndex + 1);
    stage.classList.add("fx-branch");
    stage.appendChild(el('<h3 class="fx-stage-title">Checagem de oxigênio</h3>'));

    var badgeCls = state.oxygenLow ? "is-low" : "is-high";
    var badgeText = state.oxygenLow ? "Oxigênio insuficiente" : "Oxigênio disponível";
    stage.appendChild(el('<p class="fx-branch-badge ' + badgeCls + '">' + badgeText + "</p>"));

    var msg = state.oxygenLow
      ? "As mitocôndrias não estão recebendo oxigênio suficiente para continuar. Sem oxigênio como aceptor final de elétrons, o caminho aeróbico se fecha — você vai precisar de uma rota de emergência."
      : "Há oxigênio de sobra disponível para a etapa final da respiração. Você segue para dentro da mitocôndria, rumo ao ciclo de Krebs.";
    stage.appendChild(el('<p class="fx-stage-text">' + msg + "</p>"));

    var actions = el('<div class="fx-stage-actions"></div>');
    var btn = el('<button type="button" class="fx-btn fx-btn-primary">Continuar</button>');
    btn.addEventListener("click", advance);
    actions.appendChild(btn);
    stage.appendChild(actions);
  }

  function renderFermentacaoStep(container) {
    var stage = stageShell(container, state.stepIndex + 1);
    stage.appendChild(el('<h3 class="fx-stage-title">Fermentação láctica</h3>'));
    stage.appendChild(
      el(
        '<p class="fx-stage-text">Sem oxigênio para receber os elétrons no fim da cadeia, o NADH acumulado da glicólise precisa ser reciclado de volta a NAD⁺ — senão a glicólise trava. Em células musculares humanas, a enzima lactato desidrogenase resolve isso: transfere os elétrons do NADH direto para o piruvato, formando ácido lático. Nenhum ATP extra é produzido nesse processo — ele existe só para manter a glicólise funcionando.</p>'
      )
    );
    var actions = el('<div class="fx-stage-actions"></div>');
    var btn = el('<button type="button" class="fx-btn fx-btn-primary">Ver resultado</button>');
    btn.addEventListener("click", function () {
      state.nadh = 0;
      state.lactate = true;
      advance();
    });
    actions.appendChild(btn);
    stage.appendChild(actions);
  }

  function renderWheelStep(container) {
    var stage = stageShell(container, state.stepIndex + 1);
    stage.appendChild(el('<h3 class="fx-stage-title">Gire o ciclo de Krebs</h3>'));
    stage.appendChild(
      el(
        '<p class="fx-stage-text">Você tem dois Acetil-CoA para processar — um de cada piruvato. Cada volta completa do ciclo consome um deles.</p>'
      )
    );

    var area = el('<div class="fx-wheel-area"></div>');
    var wheel = el(
      '<div class="fx-wheel" style="--fx-turn:' +
        state.krebsTurns +
        '"><span class="fx-wheel-count">' +
        state.krebsTurns +
        '/2<span>voltas</span></span></div>'
    );
    area.appendChild(wheel);

    var info = el('<div class="fx-wheel-info"></div>');
    info.appendChild(
      el(
        '<div class="fx-wheel-gain"><span class="fx-wheel-chip">+1 ATP</span><span class="fx-wheel-chip">+3 NADH</span><span class="fx-wheel-chip">+1 FADH₂</span><span class="fx-wheel-chip">+2 CO₂</span><span class="fx-wheel-chip">por volta</span></div>'
      )
    );
    var actions = el('<div class="fx-stage-actions"></div>');
    if (state.krebsTurns < 2) {
      var spinBtn = el('<button type="button" class="fx-btn fx-btn-primary">Girar o ciclo</button>');
      spinBtn.addEventListener("click", function () {
        state.krebsTurns += 1;
        state.atp += 1;
        state.nadh += 3;
        state.fadh2 += 1;
        state.co2 += 2;
        render();
      });
      actions.appendChild(spinBtn);
    } else {
      var cont = el('<button type="button" class="fx-btn fx-btn-primary">Continuar</button>');
      cont.addEventListener("click", advance);
      actions.appendChild(cont);
    }
    info.appendChild(actions);
    area.appendChild(info);
    stage.appendChild(area);
  }

  function renderSynthaseStep(container) {
    var stage = stageShell(container, state.stepIndex + 1);
    stage.appendChild(el('<h3 class="fx-stage-title">ATP sintase</h3>'));
    stage.appendChild(
      el(
        '<p class="fx-stage-text">Você acumulou <strong>' +
          state.nadh +
          " NADH</strong> e <strong>" +
          state.fadh2 +
          " FADH₂</strong> ao longo da jornada. O gradiente de prótons criado pela cadeia transportadora agora gira a ATP sintase como uma turbina — cada NADH rende cerca de 3 ATP, cada FADH₂ cerca de 2 (valores clássicos de livro-texto; o número real varia com a lançadeira de elétrons usada pela célula).</p>"
      )
    );

    var area = el('<div class="fx-synthase-area"></div>');
    var synthase = el('<div class="fx-synthase">⟳</div>');
    area.appendChild(synthase);

    var info = el('<div></div>');
    var yieldEl = el('<p class="fx-synthase-yield">0 ATP</p>');
    info.appendChild(yieldEl);
    var actions = el('<div class="fx-stage-actions"></div>');
    var btn = el('<button type="button" class="fx-btn fx-btn-primary">Bombear prótons</button>');
    info.appendChild(actions);
    actions.appendChild(btn);
    area.appendChild(info);
    stage.appendChild(area);

    var target = state.nadh * 3 + state.fadh2 * 2;

    btn.addEventListener("click", function () {
      btn.disabled = true;
      synthase.classList.add("is-spinning");
      var duration = reduceMotion ? 0 : 1600;
      var start = null;

      function step(ts) {
        if (start === null) start = ts;
        var progress = duration === 0 ? 1 : Math.min(1, (ts - start) / duration);
        yieldEl.textContent = Math.round(progress * target) + " ATP";
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          synthase.classList.remove("is-spinning");
          state.atp += target;
          state.synthaseDone = true;
          var cont = el('<button type="button" class="fx-btn fx-btn-outline">Ver recibo final</button>');
          cont.addEventListener("click", advance);
          actions.appendChild(cont);
        }
      }
      if (duration === 0) {
        yieldEl.textContent = target + " ATP";
        synthase.classList.remove("is-spinning");
        state.atp += target;
        state.synthaseDone = true;
        var cont2 = el('<button type="button" class="fx-btn fx-btn-outline">Ver recibo final</button>');
        cont2.addEventListener("click", advance);
        actions.appendChild(cont2);
      } else {
        requestAnimationFrame(step);
      }
    });
  }

  function renderReceipt(container) {
    var progress = loadProgress();
    var isNewBest = state.atp > progress.best;
    progress.best = Math.max(progress.best, state.atp);
    progress.runs += 1;
    saveProgress(progress);

    var card = el('<div class="fx-receipt"></div>');
    var title = state.oxygenLow ? "Fermentação de emergência" : "Respiração aeróbica completa";
    card.appendChild(el('<h3 class="fx-receipt-title">' + title + "</h3>"));
    card.appendChild(
      el(
        '<p class="fx-receipt-sub">' +
          esc(state.scenario.label) +
          (isNewBest ? " · novo recorde pessoal" : "") +
          "</p>"
      )
    );
    card.appendChild(el('<div class="fx-receipt-divider"></div>'));

    if (state.oxygenLow) {
      card.appendChild(el('<div class="fx-receipt-row"><span>Glicólise (líquido)</span><span>+2 ATP</span></div>'));
      card.appendChild(
        el('<div class="fx-receipt-row"><span>Ácido lático produzido</span><span>2x</span></div>')
      );
      card.appendChild(
        el('<div class="fx-receipt-row"><span>CO₂ liberado</span><span>0</span></div>')
      );
    } else {
      card.appendChild(el('<div class="fx-receipt-row"><span>Glicólise (líquido)</span><span>+2 ATP</span></div>'));
      card.appendChild(el('<div class="fx-receipt-row"><span>Ciclo de Krebs</span><span>+2 ATP</span></div>'));
      card.appendChild(
        el('<div class="fx-receipt-row"><span>Cadeia + ATP sintase</span><span>+' + (state.atp - 4) + " ATP</span></div>")
      );
      card.appendChild(el('<div class="fx-receipt-row"><span>CO₂ liberado</span><span>' + state.co2 + "</span></div>"));
    }

    card.appendChild(el('<div class="fx-receipt-row is-total"><span>Total</span><span>' + state.atp + " ATP</span></div>"));

    var note = state.oxygenLow
      ? "A fermentação é uma via de emergência: rápida, mas cerca de 19x menos eficiente que a respiração aeróbica completa. É por isso que músculos em esforço máximo cansam rápido."
      : "38 ATP é o valor clássico de livro-texto para o rendimento máximo teórico. Estimativas mais recentes apontam algo entre 30 e 32 ATP por glicose, dependendo do tecido e da lançadeira de elétrons usada para importar o NADH citosólico.";
    card.appendChild(el('<p class="fx-receipt-note">' + note + "</p>"));

    var actions = el('<div class="fx-receipt-actions"></div>');
    var again = el('<button type="button" class="fx-btn fx-btn-primary">Jogar novamente</button>');
    again.addEventListener("click", function () {
      state = null;
      render();
    });
    actions.appendChild(again);
    card.appendChild(actions);

    container.appendChild(card);
  }

  /* ==========================================================================
     Loop principal de renderização
     ========================================================================== */

  function render() {
    if (!state) {
      renderIntro();
      return;
    }

    root.innerHTML = "";
    var step = currentStep();

    if (step.type === "receipt") {
      renderReceipt(root);
      return;
    }

    renderHudAndMap(root);

    if (step.type === "intro") renderIntroStep(root);
    else if (step.type === "match") renderMatchStep(root);
    else if (step.type === "branch") renderBranchStep(root);
    else if (step.type === "fermentacao") renderFermentacaoStep(root);
    else if (step.type === "wheel") renderWheelStep(root);
    else if (step.type === "synthase") renderSynthaseStep(root);
  }

  render();
});
