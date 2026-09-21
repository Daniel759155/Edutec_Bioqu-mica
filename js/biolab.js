document.addEventListener("DOMContentLoaded", function () {
  var root = document.getElementById("biolab-game");
  if (!root) return;

  var STORAGE_KEY = "biolab_state_v2";
  var BUDGET = 100;

  var GROUND_RADIUS = 17;
  var MARKER_RADIUS = 12;
  var PLAYER_SPEED = 6.5;
  var INTERACT_RADIUS = 2.4;

  var STATS = [
    { key: "survival", label: "Sobrevivência", icon: "❤️" },
    { key: "growth", label: "Crescimento", icon: "🌱" },
    { key: "resistance", label: "Resistência", icon: "🛡️" },
    { key: "efficiency", label: "Eficiência", icon: "⚙️" },
    { key: "stability", label: "Estabilidade genética", icon: "🧬" },
    { key: "environmentalImpact", label: "Impacto ambiental", icon: "🌍" },
  ];

  var LEVEL_LABELS = ["", "Baixo", "Médio", "Alto"];

  var AVATARS = ["👩", "👨", "🧑", "👩🏽", "👨🏿", "🧑🏻"];

  var AVATAR_COLORS = {
    "👩": 0x22d3a5,
    "👨": 0x2fa4ff,
    "🧑": 0x4fe3ff,
    "👩🏽": 0xffc857,
    "👨🏿": 0xff6b6b,
    "🧑🏻": 0x7c5cff,
  };

  var MENTOR = { name: "Dra. Helena Vale", avatar: "👩🏽", role: "Mentora do Instituto BioGen" };
  var ARIA = { name: "ARIA", avatar: "🤖", role: "IA assistente de laboratório" };

  var TRAITS = [
    {
      id: "drought",
      name: "Resistência à seca",
      icon: "🌵",
      desc: "Aumenta a capacidade de sobreviver em condições de baixa umidade.",
      levels: [
        { cost: 12, effects: { survival: 8, resistance: 5 }, tradeoffs: { growth: -4 } },
        { cost: 24, effects: { survival: 16, resistance: 10 }, tradeoffs: { growth: -9, efficiency: -3 } },
        { cost: 38, effects: { survival: 24, resistance: 16 }, tradeoffs: { growth: -16, efficiency: -7 } },
      ],
    },
    {
      id: "heat",
      name: "Tolerância ao calor",
      icon: "☀️",
      desc: "Permite manter funções vitais mesmo com temperaturas elevadas.",
      levels: [
        { cost: 10, effects: { survival: 6, resistance: 6 }, tradeoffs: { efficiency: -3 } },
        { cost: 20, effects: { survival: 12, resistance: 12 }, tradeoffs: { efficiency: -7 } },
        { cost: 32, effects: { survival: 18, resistance: 18 }, tradeoffs: { efficiency: -13, stability: -3 } },
      ],
    },
    {
      id: "disease",
      name: "Resistência a doenças",
      icon: "🦠",
      desc: "Fortalece o sistema de defesa contra patógenos.",
      levels: [
        { cost: 12, effects: { survival: 7, resistance: 9 }, tradeoffs: { growth: -3 } },
        { cost: 24, effects: { survival: 14, resistance: 17 }, tradeoffs: { growth: -7, stability: -3 } },
        { cost: 36, effects: { survival: 20, resistance: 24 }, tradeoffs: { growth: -12, stability: -7 } },
      ],
    },
    {
      id: "growth",
      name: "Velocidade de crescimento",
      icon: "🌱",
      desc: "Acelera o desenvolvimento e a reprodução do organismo.",
      levels: [
        { cost: 10, effects: { growth: 10, efficiency: 4 }, tradeoffs: { stability: -5 } },
        { cost: 20, effects: { growth: 19, efficiency: 8 }, tradeoffs: { stability: -11, survival: -3 } },
        { cost: 32, effects: { growth: 28, efficiency: 12 }, tradeoffs: { stability: -18, survival: -7 } },
      ],
    },
    {
      id: "nutrient",
      name: "Produção de nutrientes",
      icon: "🍎",
      desc: "Aumenta a produção de compostos úteis (alimento, biocombustível etc).",
      levels: [
        { cost: 12, effects: { efficiency: 9 }, tradeoffs: { growth: -4, environmentalImpact: -3 } },
        { cost: 24, effects: { efficiency: 17 }, tradeoffs: { growth: -9, environmentalImpact: -7 } },
        { cost: 38, effects: { efficiency: 25 }, tradeoffs: { growth: -15, environmentalImpact: -12 } },
      ],
    },
    {
      id: "water",
      name: "Eficiência no uso da água",
      icon: "💧",
      desc: "Reduz o consumo de água sem perder desempenho.",
      levels: [
        { cost: 10, effects: { survival: 5, efficiency: 7, environmentalImpact: 6 }, tradeoffs: { growth: -3 } },
        { cost: 20, effects: { survival: 10, efficiency: 14, environmentalImpact: 12 }, tradeoffs: { growth: -6 } },
        { cost: 32, effects: { survival: 15, efficiency: 21, environmentalImpact: 18 }, tradeoffs: { growth: -10, stability: -3 } },
      ],
    },
    {
      id: "stability",
      name: "Estabilidade genética",
      icon: "🧬",
      desc: "Reduz mutações indesejadas e aumenta a previsibilidade do organismo.",
      levels: [
        { cost: 14, effects: { stability: 12, survival: 3 }, tradeoffs: { growth: -2 } },
        { cost: 26, effects: { stability: 22, survival: 6 }, tradeoffs: { growth: -5, efficiency: -2 } },
        { cost: 40, effects: { stability: 32, survival: 9 }, tradeoffs: { growth: -9, efficiency: -4 } },
      ],
    },
  ];

  var TRAITS_BY_ID = {};
  TRAITS.forEach(function (t) {
    TRAITS_BY_ID[t.id] = t;
  });

  var TRAIT_EXPLANATIONS = {
    drought:
      "A resistência à seca aumenta a sobrevivência por meio de mecanismos de retenção de água, mas exige mais energia metabólica, reduzindo a velocidade de crescimento.",
    heat: "A tolerância ao calor protege proteínas e membranas contra desnaturação, porém aumenta o gasto energético do organismo, reduzindo sua eficiência.",
    disease:
      "A resistência a doenças fortalece o sistema de defesa, mas direciona recursos que poderiam ser usados no crescimento.",
    growth:
      "A maior velocidade de crescimento acelera a produção, mas reduz o tempo de checagem do material genético, diminuindo a estabilidade.",
    nutrient:
      "A maior produção de nutrientes aumenta o valor do organismo, mas consome recursos que seriam usados no crescimento.",
    water:
      "A maior eficiência no uso da água melhora a sobrevivência em ambientes secos e reduz o impacto ambiental, com um pequeno custo no crescimento.",
    stability:
      "A maior estabilidade genética reduz mutações indesejadas e aumenta a previsibilidade dos resultados, mas exige mais investimento e reduz levemente o crescimento.",
  };

  var MISSIONS = [
    {
      title: "Sobrevivência em ambiente árido",
      icon: "🌵",
      context: "Uma região está enfrentando uma forte seca prolongada, com solo seco e altas temperaturas diurnas.",
      objective: "Desenvolva uma planta capaz de sobreviver às condições áridas sem comprometer sua utilidade.",
      recommended: ["drought", "water", "heat"],
      harmful: ["growth", "nutrient"],
      weights: { survival: 0.3, resistance: 0.15, efficiency: 0.2, stability: 0.1, growth: 0.1, environmentalImpact: 0.15 },
      event: { name: "Onda de calor", icon: "⚠️", desc: "A temperatura aumentou inesperadamente durante o teste.", targetStat: "resistance", magnitude: 14 },
      npc: { name: "Kofi Mensah", avatar: "👨🏾", role: "Agricultor do Vale Seco" },
      story: {
        intro: [
          { speaker: "mentor", text: "{playerName}, recebemos um pedido urgente do Vale Seco. Vamos ouvir o que está acontecendo." },
          { speaker: "npc", text: "Minha plantação não resiste mais a essa seca. Se não conseguirmos uma solução, perderemos toda a colheita desta estação." },
          { speaker: "mentor", text: "É hora de aplicar seus conhecimentos de biotecnologia. Desenvolva um organismo capaz de sobreviver a esse ambiente árido." },
        ],
        outro: {
          high: [
            { speaker: "npc", text: "Incrível! Essa planta está prosperando mesmo com a seca. Você salvou nossa colheita!" },
            { speaker: "mentor", text: "Excelente trabalho, {playerName}. O Instituto está orgulhoso do seu progresso." },
          ],
          mid: [
            { speaker: "npc", text: "A planta sobreviveu, mas o rendimento ainda é baixo. Precisamos melhorar isso." },
            { speaker: "mentor", text: "Um bom começo. Revise o equilíbrio das características para o próximo experimento." },
          ],
          low: [
            { speaker: "npc", text: "Infelizmente a planta não resistiu às condições do vale..." },
            { speaker: "mentor", text: "Não desanime, {playerName}. Cada experimento nos ensina algo novo. Vamos tentar de novo." },
          ],
        },
      },
    },
    {
      title: "Organismo resistente a doenças",
      icon: "🦠",
      context: "Um surto de patógenos está afetando populações vizinhas e ameaça se espalhar.",
      objective: "Crie um organismo capaz de resistir a infecções sem perder viabilidade.",
      recommended: ["disease", "stability"],
      harmful: ["growth"],
      weights: { survival: 0.25, resistance: 0.3, stability: 0.15, efficiency: 0.1, growth: 0.1, environmentalImpact: 0.1 },
      event: { name: "Novo patógeno", icon: "🦠", desc: "Uma nova cepa de patógeno surgiu durante o experimento.", targetStat: "resistance", magnitude: 16 },
      npc: { name: "Dra. Amara Njoku", avatar: "👩🏿", role: "Bióloga de campo" },
      story: {
        intro: [
          { speaker: "mentor", text: "Um surto está se espalhando pela região vizinha. A Dra. Amara está na linha de frente." },
          { speaker: "npc", text: "Já perdemos várias colônias para esse patógeno. Precisamos de um organismo resistente, e rápido." },
          { speaker: "mentor", text: "Foque na defesa biológica sem comprometer a viabilidade do organismo, {playerName}." },
        ],
        outro: {
          high: [
            { speaker: "npc", text: "Fantástico! Esse organismo resistiu a todas as cepas que testamos." },
            { speaker: "mentor", text: "Isso pode se tornar uma referência para outros surtos, {playerName}." },
          ],
          mid: [
            { speaker: "npc", text: "Ele resistiu parcialmente, mas ainda há vulnerabilidades." },
            { speaker: "mentor", text: "Continue ajustando a resistência sem sacrificar outros aspectos." },
          ],
          low: [
            { speaker: "npc", text: "O organismo sucumbiu rapidamente à infecção..." },
            { speaker: "mentor", text: "As doenças exigem defesas robustas. Vamos reforçar a estratégia." },
          ],
        },
      },
    },
    {
      title: "Biorremediação de água contaminada",
      icon: "🌊",
      context: "Uma fonte de água foi contaminada por resíduos industriais e precisa ser tratada biologicamente.",
      objective: "Desenvolva um microrganismo capaz de degradar contaminantes com alta eficiência.",
      recommended: ["water", "disease", "stability"],
      harmful: ["growth"],
      weights: { efficiency: 0.3, resistance: 0.15, survival: 0.15, environmentalImpact: 0.25, stability: 0.15 },
      event: { name: "Contaminação inesperada", icon: "💧", desc: "Um novo composto tóxico foi detectado na água.", targetStat: "efficiency", magnitude: 15 },
      npc: { name: "Sofia Marín", avatar: "👩🏽", role: "Engenheira ambiental" },
      story: {
        intro: [
          { speaker: "mentor", text: "A engenheira Sofia identificou contaminação grave numa das nossas bacias hidrográficas." },
          { speaker: "npc", text: "Sem um microrganismo eficiente, essa água vai ficar imprópria para consumo por anos." },
          { speaker: "mentor", text: "Priorize eficiência e baixo impacto ambiental nessa missão, {playerName}." },
        ],
        outro: {
          high: [
            { speaker: "npc", text: "A água já está visivelmente mais limpa! Isso é revolucionário." },
            { speaker: "mentor", text: "Um resultado exemplar em biorremediação, {playerName}." },
          ],
          mid: [
            { speaker: "npc", text: "Alguma melhora, mas ainda estamos longe do ideal." },
            { speaker: "mentor", text: "Ajuste o foco em eficiência e sustentabilidade." },
          ],
          low: [
            { speaker: "npc", text: "A contaminação praticamente não mudou..." },
            { speaker: "mentor", text: "Biorremediação exige um organismo bem calibrado. Vamos revisar a estratégia." },
          ],
        },
      },
    },
    {
      title: "Microrganismo produtor de biocombustível",
      icon: "🧫",
      context: "A demanda por fontes de energia renovável exige microrganismos altamente produtivos.",
      objective: "Maximize a produção de biocombustível mantendo o organismo estável.",
      recommended: ["nutrient", "growth", "stability"],
      harmful: ["drought"],
      weights: { efficiency: 0.35, growth: 0.2, stability: 0.2, environmentalImpact: 0.1, survival: 0.15 },
      event: { name: "Instabilidade da cultura", icon: "🧫", desc: "A cultura apresentou sinais de instabilidade genética.", targetStat: "stability", magnitude: 15 },
      npc: { name: "Diego Fontes", avatar: "👨🏻", role: "Empreendedor de energia limpa" },
      story: {
        intro: [
          { speaker: "mentor", text: "Diego está buscando uma alternativa viável aos combustíveis fósseis." },
          { speaker: "npc", text: "Precisamos de produção alta e estabilidade, ou o projeto não sai do papel." },
          { speaker: "mentor", text: "Equilibre produção e estabilidade genética para essa cultura, {playerName}." },
        ],
        outro: {
          high: [
            { speaker: "npc", text: "Essa produtividade viabiliza o projeto inteiro! Parabéns." },
            { speaker: "mentor", text: "Um marco para a energia sustentável da região, {playerName}." },
          ],
          mid: [
            { speaker: "npc", text: "Produção razoável, mas os investidores vão querer mais." },
            { speaker: "mentor", text: "Ajuste o equilíbrio entre crescimento e estabilidade." },
          ],
          low: [
            { speaker: "npc", text: "A cultura não foi produtiva o suficiente..." },
            { speaker: "mentor", text: "Vamos reformular a abordagem para essa missão." },
          ],
        },
      },
    },
    {
      title: "Planta de crescimento rápido",
      icon: "🌱",
      context: "Uma comunidade precisa de uma fonte de alimento que possa ser colhida rapidamente.",
      objective: "Desenvolva uma planta de crescimento acelerado e boa produção de nutrientes.",
      recommended: ["growth", "nutrient"],
      harmful: ["drought"],
      weights: { growth: 0.35, efficiency: 0.25, survival: 0.15, stability: 0.1, environmentalImpact: 0.15 },
      event: { name: "Pragas oportunistas", icon: "🐛", desc: "Pragas aproveitaram o crescimento acelerado para atacar a plantação.", targetStat: "resistance", magnitude: 14 },
      npc: { name: "Yara Lindqvist", avatar: "👩🏼", role: "Líder comunitária" },
      story: {
        intro: [
          { speaker: "mentor", text: "A comunidade de Yara enfrenta escassez de alimentos antes da próxima colheita." },
          { speaker: "npc", text: "Precisamos de algo que cresça rápido e ainda alimente as famílias." },
          { speaker: "mentor", text: "Maximize o crescimento sem perder a produção de nutrientes, {playerName}." },
        ],
        outro: {
          high: [
            { speaker: "npc", text: "Em poucas semanas já temos comida para todos! Muito obrigada." },
            { speaker: "mentor", text: "Você aliviou uma crise real, {playerName}." },
          ],
          mid: [
            { speaker: "npc", text: "Ajudou, mas ainda não é suficiente para todos." },
            { speaker: "mentor", text: "Aumente a produção sem sacrificar tanto a estabilidade." },
          ],
          low: [
            { speaker: "npc", text: "O crescimento foi lento demais para nossa necessidade..." },
            { speaker: "mentor", text: "Vamos repensar a estratégia para essa colheita." },
          ],
        },
      },
    },
    {
      title: "Organismo adaptado a mudanças ambientais",
      icon: "🌍",
      context: "As condições climáticas da região estão se tornando cada vez mais imprevisíveis.",
      objective: "Crie um organismo versátil, capaz de suportar variações extremas de ambiente.",
      recommended: ["drought", "heat", "stability"],
      harmful: ["growth"],
      weights: { survival: 0.25, resistance: 0.25, stability: 0.2, efficiency: 0.15, environmentalImpact: 0.15 },
      event: { name: "Variação climática extrema", icon: "🌍", desc: "O ambiente sofreu uma variação climática extrema e repentina.", targetStat: "survival", magnitude: 16 },
      npc: { name: "Comandante Malik Osei", avatar: "👨🏿", role: "Coordenador de resposta a desastres" },
      story: {
        intro: [
          { speaker: "mentor", text: "Esta é a missão mais desafiadora até agora, {playerName}. O clima da região está cada vez mais instável." },
          { speaker: "npc", text: "Precisamos de um organismo versátil, pronto para qualquer cenário." },
          { speaker: "mentor", text: "Combine tudo o que você aprendeu até aqui." },
        ],
        outro: {
          high: [
            { speaker: "npc", text: "Esse organismo é exatamente o que precisávamos. Vocês do Instituto BioGen mudaram o jogo." },
            { speaker: "mentor", text: "Você concluiu sua formação com louvor, {playerName}. Isso é só o começo." },
          ],
          mid: [
            { speaker: "npc", text: "Um progresso real, mas o clima não vai facilitar." },
            { speaker: "mentor", text: "Boa base. Ainda há espaço para refinar." },
          ],
          low: [
            { speaker: "npc", text: "O ambiente mudou rápido demais para esse organismo..." },
            { speaker: "mentor", text: "As mudanças climáticas são implacáveis. Vamos tentar outra abordagem." },
          ],
        },
      },
    },
  ];

  var LEVELS = [
    { name: "Aprendiz", min: 0, desc: "Primeiros passos no Instituto BioGen." },
    { name: "Técnico", min: 150, desc: "Já domina o básico do laboratório." },
    { name: "Pesquisador", min: 400, desc: "Resultados consistentes em campo." },
    { name: "Cientista", min: 750, desc: "Referência em soluções biotecnológicas." },
    { name: "Especialista em Biotecnologia", min: 1200, desc: "Lenda viva do Instituto BioGen." },
  ];

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        return {
          bestScore: parsed.bestScore || 0,
          experimentsCompleted: parsed.experimentsCompleted || 0,
          xp: parsed.xp || 0,
          level: parsed.level || 0,
          nextMissionIndex: parsed.nextMissionIndex || 0,
          playerName: parsed.playerName || "",
          avatar: parsed.avatar || AVATARS[0],
          missionsCompleted: parsed.missionsCompleted || [],
        };
      }
    } catch (e) {}
    return {
      bestScore: 0,
      experimentsCompleted: 0,
      xp: 0,
      level: 0,
      nextMissionIndex: 0,
      playerName: "",
      avatar: AVATARS[0],
      missionsCompleted: [],
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function levelFromXp(xp) {
    var idx = 0;
    for (var i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i].min) idx = i;
    }
    return idx;
  }

  var state = loadState();
  var hub3d = null;

  var session = {
    screen: state.playerName ? "start" : "create",
    missionIndex: 0,
    selections: {},
    testResult: null,
    xpGained: 0,
    leveledUp: false,
    storyLines: [],
    storyIndex: 0,
    selectedAvatar: state.avatar || AVATARS[0],
  };

  function tmpl(str) {
    var safeName = escapeHtml(state.playerName || "Cientista");
    return str.replace(/\{playerName\}/g, safeName);
  }

  function dialogueLineHTML(line, mission) {
    var speaker = line.speaker === "mentor" ? MENTOR : line.speaker === "aria" ? ARIA : mission.npc;
    return (
      '<div class="bl-dialogue-box">' +
      '<div class="bl-dialogue-avatar">' +
      speaker.avatar +
      "</div>" +
      '<div class="bl-dialogue-content">' +
      '<p class="bl-dialogue-name">' +
      escapeHtml(speaker.name) +
      '<span class="bl-dialogue-role">' +
      escapeHtml(speaker.role) +
      "</span></p>" +
      '<p class="bl-dialogue-text">' +
      tmpl(line.text) +
      "</p>" +
      "</div>" +
      "</div>"
    );
  }

  function computeSpent(selections) {
    var spent = 0;
    Object.keys(selections).forEach(function (id) {
      var level = selections[id];
      if (level > 0) spent += TRAITS_BY_ID[id].levels[level - 1].cost;
    });
    return spent;
  }

  function dots(level) {
    var out = "";
    for (var i = 1; i <= 3; i++) {
      out += '<span class="bl-dot' + (i <= level ? " is-filled" : "") + '"></span>';
    }
    return out;
  }

  function scoreClass(score) {
    if (score >= 90) return { emoji: "🧬", label: "Cientista excepcional" };
    if (score >= 75) return { emoji: "🔬", label: "Cientista avançado" };
    if (score >= 60) return { emoji: "🧪", label: "Pesquisador competente" };
    if (score >= 40) return { emoji: "📚", label: "Aprendiz" };
    return { emoji: "⚠️", label: "Experimento malsucedido" };
  }

  function scoreTier(score) {
    if (score >= 75) return "high";
    if (score >= 40) return "mid";
    return "low";
  }

  function computeResult(mission, selections, eventOccurs) {
    var stats = { survival: 50, growth: 50, resistance: 50, efficiency: 50, stability: 50, environmentalImpact: 50 };

    Object.keys(selections).forEach(function (id) {
      var level = selections[id];
      if (!level) return;
      var lvl = TRAITS_BY_ID[id].levels[level - 1];
      Object.keys(lvl.effects).forEach(function (k) {
        stats[k] += lvl.effects[k];
      });
      Object.keys(lvl.tradeoffs).forEach(function (k) {
        stats[k] += lvl.tradeoffs[k];
      });
    });

    STATS.forEach(function (s) {
      stats[s.key] = clamp(stats[s.key], 0, 100);
    });

    var eventResult = { occurred: false, reduction: 0 };
    if (eventOccurs) {
      var target = mission.event.targetStat;
      var magnitude = mission.event.magnitude;
      var contribution = stats[target] - 50;
      var mitigation = clamp(contribution * 0.45, 0, magnitude * 0.85);
      var reduction = clamp(magnitude - mitigation, 2, magnitude);
      stats[target] = clamp(stats[target] - reduction, 0, 100);
      eventResult = { occurred: true, reduction: Math.round(reduction), mitigated: mitigation > magnitude * 0.5, targetStat: target };
    }

    var weighted = 0;
    Object.keys(mission.weights).forEach(function (k) {
      weighted += (stats[k] / 100) * 100 * mission.weights[k];
    });

    var recommendedBonus = 0;
    mission.recommended.forEach(function (id) {
      var lvl = selections[id] || 0;
      if (lvl > 0) recommendedBonus += lvl * 3;
    });
    recommendedBonus = Math.min(recommendedBonus, 18);

    var harmfulPenalty = 0;
    mission.harmful.forEach(function (id) {
      var lvl = selections[id] || 0;
      if (lvl > 0) harmfulPenalty += lvl * 4;
    });
    harmfulPenalty = Math.min(harmfulPenalty, 20);

    var traitsUsed = Object.keys(selections).filter(function (id) {
      return selections[id] > 0;
    }).length;
    var countAdj = traitsUsed < 2 ? -10 : traitsUsed >= 3 && traitsUsed <= 5 ? 5 : 0;

    var rawScore = weighted + recommendedBonus - harmfulPenalty + countAdj;
    var score = Math.round(clamp(rawScore, 0, 100));

    return {
      stats: stats,
      eventResult: eventResult,
      score: score,
      budgetSpent: computeSpent(selections),
      traitsUsed: traitsUsed,
      recommendedBonus: recommendedBonus,
      harmfulPenalty: harmfulPenalty,
    };
  }

  function generateFeedback(mission, selections, result) {
    var used = Object.keys(selections)
      .filter(function (id) {
        return selections[id] > 0;
      })
      .sort(function (a, b) {
        return selections[b] - selections[a];
      });

    if (used.length === 0) {
      return "Nenhuma característica foi adicionada ao organismo, por isso ele manteve apenas as propriedades básicas da espécie selvagem, sem adaptação especial para esta missão.";
    }

    var sentences = used.slice(0, 2).map(function (id) {
      return TRAIT_EXPLANATIONS[id];
    });

    var intro = "Seu organismo obteve nota geral de " + result.score + "/100 nesta missão. ";
    var body = sentences.join(" ");
    var closing =
      result.score >= 75
        ? " No geral, as escolhas foram bem equilibradas para o desafio proposto."
        : " Revise o equilíbrio entre as características para atender melhor aos objetivos da missão.";
    return intro + body + closing;
  }

  function buildInsights(mission, stats, result) {
    var well = [];
    var improve = [];

    STATS.forEach(function (s) {
      var v = stats[s.key];
      if (v >= 70) well.push(s.icon + " " + s.label + " em " + v + " — acima do esperado.");
      else if (v < 45) improve.push(s.icon + " " + s.label + " em " + v + " — abaixo do ideal para esta missão.");
    });

    if (result.recommendedBonus > 0) well.push("⭐ Você usou características recomendadas para esta missão.");
    if (result.harmfulPenalty > 0) improve.push("⚠️ Algumas características escolhidas prejudicam este tipo de missão.");
    if (result.eventResult.occurred && result.eventResult.reduction >= 10) {
      improve.push("🌪️ O evento " + mission.event.name + " afetou fortemente seu organismo — prepare-se melhor para imprevistos.");
    }

    if (well.length === 0) well.push("Organismo funcional, mas sem destaques notáveis.");
    if (improve.length === 0) improve.push("Nenhum ponto crítico identificado — ótimo equilíbrio!");

    return { well: well, improve: improve };
  }

  /* ---------------- Mapa 3D (hub) ---------------- */

  function disposeHub3D() {
    if (!hub3d) return;
    cancelAnimationFrame(hub3d.rafId);
    window.removeEventListener("keydown", hub3d.onKeyDown);
    window.removeEventListener("keyup", hub3d.onKeyUp);
    window.removeEventListener("resize", hub3d.onResize);
    window.removeEventListener("pointermove", hub3d.onJoyMove);
    window.removeEventListener("pointerup", hub3d.onJoyUp);
    if (hub3d.canvas) hub3d.canvas.removeEventListener("pointerdown", hub3d.onCanvasPointerDown);
    if (hub3d.joystickBase) hub3d.joystickBase.removeEventListener("pointerdown", hub3d.onJoyDown);
    if (hub3d.renderer) hub3d.renderer.dispose();
    hub3d = null;
  }

  function makeTextSprite(text, size) {
    var canvasEl = document.createElement("canvas");
    canvasEl.width = 128;
    canvasEl.height = 128;
    var ctx = canvasEl.getContext("2d");
    ctx.font = '92px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 68);
    var texture = new THREE.CanvasTexture(canvasEl);
    var material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    var sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  function fallbackHubHTML() {
    var missionCards = MISSIONS.map(function (m, i) {
      var done = state.missionsCompleted.indexOf(i) !== -1;
      return (
        '<button type="button" class="bl-mission-card" data-mission="' +
        i +
        '"><span class="bl-mission-icon">' +
        m.icon +
        '</span><span class="bl-mission-name">MISSÃO 0' +
        (i + 1) +
        '</span><span class="bl-mission-title">' +
        m.title +
        "</span>" +
        (done ? '<span class="bl-mission-done">✔ Concluída</span>' : "") +
        "</button>"
      );
    }).join("");

    return (
      '<div class="bl-wrap bl-hub3d">' +
      '<div class="bl-lab-top">' +
      '<button type="button" class="bl-back-btn" id="bl-hub-back">◀ Voltar ao Instituto</button>' +
      '<p class="bl-lab-heading">MAPA DO INSTITUTO BIOGEN</p>' +
      "</div>" +
      '<div class="bl-panel">' +
      '<p class="bl-feedback-text">🛰️ Não foi possível carregar o mapa 3D (verifique sua conexão com a internet). Você ainda pode acessar as missões pela lista abaixo.</p>' +
      "</div>" +
      '<div class="bl-missions">' +
      '<p class="bl-panel-title">MISSÕES DISPONÍVEIS</p>' +
      '<div class="bl-mission-grid">' +
      missionCards +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function hub3dHTML() {
    if (typeof THREE === "undefined") return fallbackHubHTML();
    return (
      '<div class="bl-wrap bl-hub3d">' +
      '<div class="bl-lab-top">' +
      '<button type="button" class="bl-back-btn" id="bl-hub-back">◀ Voltar ao Instituto</button>' +
      '<p class="bl-lab-heading">MAPA DO INSTITUTO BIOGEN</p>' +
      "</div>" +
      '<div class="bl-hub-stage">' +
      '<canvas id="bl-hub-canvas" class="bl-hub-canvas"></canvas>' +
      '<div class="bl-hub-hint">🧭 WASD / setas para andar · toque no mapa para caminhar até um local</div>' +
      '<div class="bl-hub-prompt" id="bl-hub-prompt" hidden></div>' +
      '<div class="bl-hub-joystick" id="bl-hub-joystick"><div class="bl-hub-joystick-knob" id="bl-hub-joystick-knob"></div></div>' +
      '<button type="button" class="bl-btn bl-btn-primary bl-hub-interact" id="bl-hub-interact-btn" hidden>Interagir</button>' +
      "</div>" +
      "</div>"
    );
  }

  function bindHub3D() {
    var backBtn = document.getElementById("bl-hub-back");
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        disposeHub3D();
        session.screen = "start";
        render();
      });
    }

    if (typeof THREE === "undefined") {
      root.querySelectorAll(".bl-mission-card").forEach(function (card) {
        card.addEventListener("click", function () {
          startMission(Number(card.dataset.mission));
        });
      });
      return;
    }

    initHub3D();
  }

  function initHub3D() {
    var canvas = document.getElementById("bl-hub-canvas");
    var stage = canvas.parentElement;
    var promptEl = document.getElementById("bl-hub-prompt");
    var interactBtn = document.getElementById("bl-hub-interact-btn");
    var joystickBase = document.getElementById("bl-hub-joystick");
    var joystickKnob = document.getElementById("bl-hub-joystick-knob");

    var width = stage.clientWidth;
    var height = Math.max(320, Math.min(520, Math.round(width * 0.56)));
    canvas.style.height = height + "px";

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060f14);
    scene.fog = new THREE.Fog(0x060f14, 18, 42);

    var camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);

    scene.add(new THREE.AmbientLight(0x8fd8cf, 0.55));
    var dirLight = new THREE.DirectionalLight(0x9fe8ff, 0.85);
    dirLight.position.set(8, 14, 6);
    scene.add(dirLight);

    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(GROUND_RADIUS, 48),
      new THREE.MeshStandardMaterial({ color: 0x0a1720, roughness: 0.95, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    var grid = new THREE.GridHelper(GROUND_RADIUS * 2, 24, 0x1c3b3f, 0x14262c);
    grid.position.y = 0.01;
    scene.add(grid);

    var instituteGroup = new THREE.Group();
    var baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4, 2.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x11242b, roughness: 0.6 })
    );
    baseMesh.position.set(0, 1.2, -5);
    instituteGroup.add(baseMesh);
    var beacon = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x22d3a5, emissive: 0x22d3a5, emissiveIntensity: 0.6 })
    );
    beacon.position.set(0, 3.1, -5);
    instituteGroup.add(beacon);
    scene.add(instituteGroup);
    var instituteLabel = makeTextSprite("🧬", 1.8);
    instituteLabel.position.set(0, 4.2, -5);
    scene.add(instituteLabel);

    var avatarColor = AVATAR_COLORS[state.avatar] || 0x22d3a5;
    var playerGroup = new THREE.Group();
    var body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 1.3, 12),
      new THREE.MeshStandardMaterial({ color: avatarColor, roughness: 0.4, metalness: 0.2 })
    );
    body.position.y = 0.95;
    playerGroup.add(body);
    var head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe3c2 })
    );
    head.position.y = 1.78;
    playerGroup.add(head);
    var glow = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 24),
      new THREE.MeshBasicMaterial({ color: avatarColor, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    playerGroup.add(glow);
    playerGroup.position.set(0, 0, 3);
    scene.add(playerGroup);

    var markers = [];
    var markerHitMeshes = [];
    for (var i = 0; i < MISSIONS.length; i++) {
      var angle = (i / MISSIONS.length) * Math.PI * 2 - Math.PI / 2;
      var mx = Math.cos(angle) * MARKER_RADIUS;
      var mz = Math.sin(angle) * MARKER_RADIUS;
      var done = state.missionsCompleted.indexOf(i) !== -1;
      var markerColor = done ? 0x22d3a5 : 0x2fa4ff;

      var group = new THREE.Group();
      var pod = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.3, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x11242b, roughness: 0.7 })
      );
      pod.position.y = 0.2;
      group.add(pod);

      var beamMat = new THREE.MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: done ? 0.4 : 0.9,
        transparent: true,
        opacity: 0.85,
      });
      var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 10), beamMat);
      beam.position.y = 1.8;
      group.add(beam);

      var iconSprite = makeTextSprite(MISSIONS[i].icon, 1.5);
      iconSprite.position.y = 3.6;
      group.add(iconSprite);

      if (done) {
        var doneSprite = makeTextSprite("✔️", 0.8);
        doneSprite.position.set(0.9, 3.9, 0);
        group.add(doneSprite);
      }

      var hitMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.3, 4.4, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      hitMesh.position.y = 2.2;
      hitMesh.userData.markerIndex = i;
      group.add(hitMesh);
      markerHitMeshes.push(hitMesh);

      group.position.set(mx, 0, mz);
      scene.add(group);
      markers.push({ index: i, x: mx, z: mz, beam: beam, done: done });
    }

    var camOffset = new THREE.Vector3(0, 7.5, 8.5);
    camera.position.set(playerGroup.position.x + camOffset.x, camOffset.y, playerGroup.position.z + camOffset.z);
    camera.lookAt(playerGroup.position);

    var keys = {};
    var nearIndex = null;
    var autoTarget = null;
    var joyVector = null;
    var joyPointerId = null;

    function interact(i) {
      disposeHub3D();
      startMission(i);
    }

    function onKeyDown(e) {
      var k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].indexOf(k) !== -1) e.preventDefault();
      keys[k] = true;
      if ((k === "e" || k === " " || k === "enter") && nearIndex !== null) {
        interact(nearIndex);
        return;
      }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) !== -1) {
        autoTarget = null;
      }
    }
    function onKeyUp(e) {
      keys[e.key.toLowerCase()] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    if (interactBtn) {
      interactBtn.addEventListener("click", function () {
        if (nearIndex !== null) interact(nearIndex);
      });
    }

    function joyHandlePointer(clientX, clientY) {
      var rect = joystickBase.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = clientX - cx;
      var dy = clientY - cy;
      var maxR = rect.width / 2;
      var dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxR);
      var ang = Math.atan2(dy, dx);
      var nx = Math.cos(ang) * dist;
      var ny = Math.sin(ang) * dist;
      if (joystickKnob) joystickKnob.style.transform = "translate(" + nx + "px," + ny + "px)";
      joyVector = { x: nx / maxR, y: ny / maxR };
      autoTarget = null;
    }
    function onJoyDown(e) {
      joyPointerId = e.pointerId;
      joyHandlePointer(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onJoyMove(e) {
      if (joyPointerId === null || e.pointerId !== joyPointerId) return;
      joyHandlePointer(e.clientX, e.clientY);
    }
    function onJoyUp(e) {
      if (joyPointerId !== null && e.pointerId !== joyPointerId) return;
      joyPointerId = null;
      joyVector = null;
      if (joystickKnob) joystickKnob.style.transform = "translate(0px,0px)";
    }
    if (joystickBase) joystickBase.addEventListener("pointerdown", onJoyDown);
    window.addEventListener("pointermove", onJoyMove);
    window.addEventListener("pointerup", onJoyUp);

    var raycaster = new THREE.Raycaster();
    var pointerVec = new THREE.Vector2();
    function onCanvasPointerDown(e) {
      var rect = canvas.getBoundingClientRect();
      pointerVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerVec, camera);

      var markerHit = raycaster.intersectObjects(markerHitMeshes);
      if (markerHit.length) {
        var idx = markerHit[0].object.userData.markerIndex;
        autoTarget = { x: markers[idx].x, z: markers[idx].z, index: idx };
        joyVector = null;
        return;
      }

      var hit = raycaster.intersectObject(ground);
      if (!hit.length) return;
      var p = hit[0].point;

      var targetIndex = null;
      var minD = 2.0;
      markers.forEach(function (m) {
        var dx = p.x - m.x;
        var dz = p.z - m.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d < minD) {
          minD = d;
          targetIndex = m.index;
        }
      });

      if (targetIndex !== null) {
        autoTarget = { x: markers[targetIndex].x, z: markers[targetIndex].z, index: targetIndex };
      } else {
        var dist = Math.sqrt(p.x * p.x + p.z * p.z);
        var maxDist = GROUND_RADIUS - 0.5;
        if (dist > maxDist) {
          p.x = (p.x / dist) * maxDist;
          p.z = (p.z / dist) * maxDist;
        }
        autoTarget = { x: p.x, z: p.z, index: null };
      }
      joyVector = null;
    }
    canvas.addEventListener("pointerdown", onCanvasPointerDown);

    function onResize() {
      var w = stage.clientWidth;
      var h = Math.max(320, Math.min(520, Math.round(w * 0.56)));
      canvas.style.height = h + "px";
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);

    var clock = new THREE.Clock();

    function animate() {
      hub3d.rafId = requestAnimationFrame(animate);
      var delta = Math.min(clock.getDelta(), 0.1);

      var moveX = 0,
        moveZ = 0;
      if (keys["w"] || keys["arrowup"]) moveZ -= 1;
      if (keys["s"] || keys["arrowdown"]) moveZ += 1;
      if (keys["a"] || keys["arrowleft"]) moveX -= 1;
      if (keys["d"] || keys["arrowright"]) moveX += 1;

      if (joyVector) {
        moveX = joyVector.x;
        moveZ = joyVector.y;
      }

      if (moveX !== 0 || moveZ !== 0) autoTarget = null;

      if (autoTarget) {
        var ddx = autoTarget.x - playerGroup.position.x;
        var ddz = autoTarget.z - playerGroup.position.z;
        var ddist = Math.sqrt(ddx * ddx + ddz * ddz);
        if (ddist > 0.15) {
          moveX = ddx / ddist;
          moveZ = ddz / ddist;
        } else {
          var arrivedIndex = autoTarget.index;
          autoTarget = null;
          if (arrivedIndex !== null && arrivedIndex !== undefined) {
            interact(arrivedIndex);
            return;
          }
          moveX = 0;
          moveZ = 0;
        }
      }

      var len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (len > 0.001) {
        moveX /= len;
        moveZ /= len;
        var speed = PLAYER_SPEED * delta;
        var nx = playerGroup.position.x + moveX * speed;
        var nz = playerGroup.position.z + moveZ * speed;
        var r = Math.sqrt(nx * nx + nz * nz);
        var maxR = GROUND_RADIUS - 0.5;
        if (r > maxR) {
          nx = (nx / r) * maxR;
          nz = (nz / r) * maxR;
        }
        playerGroup.position.x = nx;
        playerGroup.position.z = nz;
        playerGroup.rotation.y = Math.atan2(moveX, moveZ);
      }

      var t = performance.now() * 0.002;
      markers.forEach(function (m) {
        if (!m.done) {
          m.beam.material.emissiveIntensity = 0.7 + Math.sin(t * 2 + m.index) * 0.3;
        }
      });

      var closest = null;
      var closestDist = INTERACT_RADIUS;
      markers.forEach(function (m) {
        var dx = playerGroup.position.x - m.x;
        var dz = playerGroup.position.z - m.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d < closestDist) {
          closestDist = d;
          closest = m.index;
        }
      });
      if (closest !== nearIndex) {
        nearIndex = closest;
        if (nearIndex !== null) {
          var mission = MISSIONS[nearIndex];
          var doneNow = state.missionsCompleted.indexOf(nearIndex) !== -1;
          if (promptEl) {
            promptEl.hidden = false;
            promptEl.innerHTML =
              mission.npc.avatar +
              " <strong>" +
              escapeHtml(mission.npc.name) +
              "</strong> — " +
              (doneNow ? "missão concluída, falar novamente" : "precisa de ajuda");
          }
          if (interactBtn) interactBtn.hidden = false;
        } else {
          if (promptEl) promptEl.hidden = true;
          if (interactBtn) interactBtn.hidden = true;
        }
      }

      camera.position.set(playerGroup.position.x + camOffset.x, camOffset.y, playerGroup.position.z + camOffset.z);
      camera.lookAt(playerGroup.position.x, 1, playerGroup.position.z);

      renderer.render(scene, camera);
    }

    hub3d = {
      renderer: renderer,
      rafId: 0,
      onKeyDown: onKeyDown,
      onKeyUp: onKeyUp,
      onResize: onResize,
      canvas: canvas,
      onCanvasPointerDown: onCanvasPointerDown,
      joystickBase: joystickBase,
      onJoyDown: onJoyDown,
      onJoyMove: onJoyMove,
      onJoyUp: onJoyUp,
    };

    animate();
  }

  /* ---------------- Renderização ---------------- */

  function render() {
    if (hub3d && session.screen !== "hub3d") disposeHub3D();

    if (session.screen === "create") {
      root.innerHTML = createHTML();
      bindCreate();
    } else if (session.screen === "start") {
      root.innerHTML = startHTML();
      bindStart();
    } else if (session.screen === "hub3d") {
      root.innerHTML = hub3dHTML();
      bindHub3D();
    } else if (session.screen === "story") {
      root.innerHTML = storyHTML();
      bindStory();
    } else if (session.screen === "lab") {
      root.innerHTML = labHTML();
      bindLab();
    } else if (session.screen === "testing") {
      root.innerHTML = testingHTML();
      runTesting();
    } else if (session.screen === "result") {
      root.innerHTML = resultHTML();
      bindResult();
      animateBars();
    }
  }

  function createHTML() {
    var avatarButtons = AVATARS.map(function (a) {
      return (
        '<button type="button" class="bl-avatar-btn' +
        (a === session.selectedAvatar ? " is-selected" : "") +
        '" data-avatar="' +
        a +
        '">' +
        a +
        "</button>"
      );
    }).join("");

    return (
      '<div class="bl-wrap bl-create">' +
      '<div class="bl-start-hero">' +
      '<p class="bl-eyebrow">🧬 BIOLAB</p>' +
      '<h2 class="bl-title">Bem-vindo(a) ao Instituto BioGen</h2>' +
      '<p class="bl-lead">Antes de embarcar em sua jornada como cientista, conte um pouco sobre você. A Dra. Helena Vale e a IA de laboratório ARIA vão te acompanhar em cada missão.</p>' +
      "</div>" +
      '<div class="bl-panel bl-create-panel">' +
      '<label class="bl-create-label" for="bl-name-input">Como podemos te chamar?</label>' +
      '<input type="text" id="bl-name-input" class="bl-name-input" maxlength="18" placeholder="Seu nome de cientista" autocomplete="off" />' +
      '<p class="bl-create-label">Escolha seu avatar</p>' +
      '<div class="bl-avatar-grid">' +
      avatarButtons +
      "</div>" +
      '<button type="button" class="bl-btn bl-btn-primary bl-create-btn" id="bl-create-btn">🔬 COMEÇAR JORNADA</button>' +
      "</div>" +
      "</div>"
    );
  }

  function bindCreate() {
    root.querySelectorAll(".bl-avatar-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        session.selectedAvatar = btn.dataset.avatar;
        root.querySelectorAll(".bl-avatar-btn").forEach(function (b) {
          b.classList.toggle("is-selected", b === btn);
        });
      });
    });

    var createBtn = document.getElementById("bl-create-btn");
    if (createBtn) {
      createBtn.addEventListener("click", function () {
        var nameInput = document.getElementById("bl-name-input");
        var nameVal = nameInput ? nameInput.value.trim() : "";
        state.playerName = nameVal || "Cientista";
        state.avatar = session.selectedAvatar || AVATARS[0];
        saveState();
        session.screen = "start";
        render();
      });
    }
  }

  function startHTML() {
    var levelInfo = LEVELS[state.level];
    var nextLevel = LEVELS[state.level + 1];
    var progressPct = nextLevel
      ? Math.round(((state.xp - levelInfo.min) / (nextLevel.min - levelInfo.min)) * 100)
      : 100;

    var epilogueHtml = "";
    if (state.missionsCompleted.length >= MISSIONS.length) {
      epilogueHtml =
        '<div class="bl-epilogue">🏅 <strong>Lenda do Instituto BioGen</strong> — ' +
        escapeHtml(state.playerName) +
        ", você já concluiu todas as missões disponíveis! Continue repetindo experimentos para aperfeiçoar sua pontuação." +
        "</div>";
    }

    var progressIcons = MISSIONS.map(function (m, i) {
      var done = state.missionsCompleted.indexOf(i) !== -1;
      return (
        '<span class="bl-progress-icon' +
        (done ? " is-done" : "") +
        '" title="' +
        escapeHtml(m.title) +
        '">' +
        m.icon +
        (done ? '<span class="bl-progress-check">✔</span>' : "") +
        "</span>"
      );
    }).join("");

    return (
      '<div class="bl-wrap bl-start">' +
      '<div class="bl-start-hero">' +
      '<p class="bl-eyebrow">🧬 BIOLAB</p>' +
      '<h2 class="bl-title">Crie o Organismo Perfeito</h2>' +
      '<p class="bl-lead">Bem-vindo(a) de volta, ' +
      state.avatar +
      " " +
      escapeHtml(state.playerName) +
      "! Explore o mapa 3D do Instituto BioGen e caminhe até cada região que precisa da sua ajuda.</p>" +
      '<button type="button" class="bl-btn bl-btn-primary" id="bl-start-btn">🗺️ ENTRAR NO LABORATÓRIO</button>' +
      "</div>" +
      epilogueHtml +
      '<div class="bl-start-stats">' +
      '<div class="bl-stat-card"><span class="bl-stat-value">' +
      state.bestScore +
      '</span><span class="bl-stat-label">Melhor pontuação</span></div>' +
      '<div class="bl-stat-card"><span class="bl-stat-value">' +
      state.experimentsCompleted +
      '</span><span class="bl-stat-label">Experimentos concluídos</span></div>' +
      '<div class="bl-stat-card"><span class="bl-stat-value">' +
      levelInfo.name +
      '</span><span class="bl-stat-label">Nível do jogador</span>' +
      '<span class="bl-level-desc">' +
      levelInfo.desc +
      "</span>" +
      '<div class="bl-xp-bar"><div class="bl-xp-fill" style="width:' +
      clamp(progressPct, 0, 100) +
      '%"></div></div>' +
      "</div>" +
      "</div>" +
      '<div class="bl-missions">' +
      '<p class="bl-panel-title">MISSÕES DO INSTITUTO</p>' +
      '<p class="bl-lead-small">As missões estão espalhadas pelo mapa do Instituto BioGen. Entre no laboratório e caminhe até cada local para conhecer quem precisa de ajuda.</p>' +
      '<div class="bl-progress-row">' +
      progressIcons +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function bindStart() {
    var startBtn = document.getElementById("bl-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        session.screen = "hub3d";
        render();
      });
    }
  }

  function startMission(index) {
    session.missionIndex = index;
    session.selections = {};
    session.storyLines = MISSIONS[index].story.intro;
    session.storyIndex = 0;
    session.screen = "story";
    render();
  }

  function storyHTML() {
    var mission = MISSIONS[session.missionIndex];
    var lines = session.storyLines;
    var idx = session.storyIndex;
    var line = lines[idx];
    var isLast = idx === lines.length - 1;

    var progressDots = "";
    for (var i = 0; i < lines.length; i++) {
      progressDots += '<span class="bl-dot' + (i <= idx ? " is-filled" : "") + '"></span>';
    }

    return (
      '<div class="bl-wrap bl-story">' +
      '<div class="bl-lab-top">' +
      '<button type="button" class="bl-back-btn" id="bl-story-back">◀ Voltar ao mapa</button>' +
      '<p class="bl-lab-heading">CAPÍTULO 0' +
      (session.missionIndex + 1) +
      " — " +
      mission.icon +
      " " +
      mission.title +
      "</p>" +
      "</div>" +
      dialogueLineHTML(line, mission) +
      '<div class="bl-story-progress">' +
      progressDots +
      "</div>" +
      '<div class="bl-story-actions">' +
      '<button type="button" class="bl-btn bl-btn-outline" id="bl-story-skip">Pular introdução</button>' +
      '<button type="button" class="bl-btn bl-btn-primary" id="bl-story-next">' +
      (isLast ? "🔬 Ir para o laboratório" : "Continuar ▸") +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  function bindStory() {
    var backBtn = document.getElementById("bl-story-back");
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        session.screen = "hub3d";
        render();
      });
    }

    var skipBtn = document.getElementById("bl-story-skip");
    if (skipBtn) {
      skipBtn.addEventListener("click", function () {
        session.screen = "lab";
        render();
      });
    }

    var nextBtn = document.getElementById("bl-story-next");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (session.storyIndex >= session.storyLines.length - 1) {
          session.screen = "lab";
        } else {
          session.storyIndex += 1;
        }
        render();
      });
    }
  }

  function labHTML() {
    var mission = MISSIONS[session.missionIndex];
    var spent = computeSpent(session.selections);
    var remaining = BUDGET - spent;
    var spentPct = clamp(Math.round((spent / BUDGET) * 100), 0, 100);

    var selectedIds = Object.keys(session.selections).filter(function (id) {
      return session.selections[id] > 0;
    });

    var chips = selectedIds.length
      ? selectedIds
          .map(function (id) {
            var t = TRAITS_BY_ID[id];
            var lvl = session.selections[id];
            return '<span class="bl-chip">' + t.icon + " " + t.name + " · " + LEVEL_LABELS[lvl] + "</span>";
          })
          .join("")
      : '<span class="bl-empty-note">Nenhuma característica selecionada ainda.</span>';

    var traitCards = TRAITS.map(function (t) {
      var level = session.selections[t.id] || 0;
      var nextLevel = level < 3 ? level + 1 : null;
      var nextCost = nextLevel ? t.levels[nextLevel - 1].cost : null;
      var isRecommended = mission.recommended.indexOf(t.id) !== -1;
      var isHarmful = mission.harmful.indexOf(t.id) !== -1;

      var costLabel =
        level === 3
          ? "NÍVEL MÁXIMO"
          : nextCost + " pts para nível " + LEVEL_LABELS[nextLevel] + (nextCost > remaining ? " (orçamento insuficiente)" : "");

      var badges = "";
      if (isRecommended) badges += '<span class="bl-trait-badge is-good">⭐ Recomendado</span>';
      if (isHarmful) badges += '<span class="bl-trait-badge is-bad">⚠️ Prejudicial aqui</span>';

      return (
        '<button type="button" class="bl-trait-card' +
        (level > 0 ? " is-active" : "") +
        '" data-trait="' +
        t.id +
        '">' +
        '<span class="bl-trait-head"><span class="bl-trait-icon">' +
        t.icon +
        '</span><span class="bl-trait-name">' +
        t.name +
        "</span></span>" +
        '<span class="bl-trait-desc">' +
        t.desc +
        "</span>" +
        '<span class="bl-trait-dots">' +
        dots(level) +
        "</span>" +
        '<span class="bl-trait-cost">' +
        costLabel +
        "</span>" +
        (badges ? '<span class="bl-trait-badges">' + badges + "</span>" : "") +
        "</button>"
      );
    }).join("");

    return (
      '<div class="bl-wrap bl-lab">' +
      '<div class="bl-lab-top">' +
      '<button type="button" class="bl-back-btn" id="bl-back-btn">◀ Voltar ao mapa</button>' +
      '<p class="bl-lab-heading">LABORATÓRIO — ' +
      escapeHtml(mission.npc.name) +
      "</p>" +
      "</div>" +
      '<div class="bl-lab-grid">' +
      '<div class="bl-panel bl-mission-panel">' +
      '<p class="bl-panel-title">MISSÃO 0' +
      (session.missionIndex + 1) +
      " — " +
      mission.icon +
      " " +
      mission.title +
      "</p>" +
      '<p class="bl-mission-context">' +
      mission.context +
      "</p>" +
      '<p class="bl-mission-objective"><strong>Objetivo:</strong> ' +
      mission.objective +
      "</p>" +
      '<div class="bl-budget">' +
      '<div class="bl-budget-row"><span>Orçamento de laboratório</span><span>' +
      spent +
      " / " +
      BUDGET +
      "</span></div>" +
      '<div class="bl-budget-bar"><div class="bl-budget-fill" style="width:' +
      spentPct +
      '%"></div></div>' +
      "</div>" +
      "</div>" +
      '<div class="bl-panel bl-organism-panel">' +
      '<p class="bl-panel-title">ORGANISMO EM DESENVOLVIMENTO</p>' +
      '<div class="bl-organism-visual">🧬</div>' +
      '<div class="bl-selected-list">' +
      chips +
      "</div>" +
      '<button type="button" class="bl-btn bl-btn-primary bl-test-btn" id="bl-test-btn"' +
      (selectedIds.length === 0 ? " disabled" : "") +
      ">🔬 TESTAR ORGANISMO</button>" +
      "</div>" +
      '<div class="bl-panel bl-traits-panel">' +
      '<p class="bl-panel-title">CARACTERÍSTICAS DISPONÍVEIS</p>' +
      '<div class="bl-traits-grid">' +
      traitCards +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function bindLab() {
    var backBtn = document.getElementById("bl-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        session.screen = "hub3d";
        render();
      });
    }

    root.querySelectorAll(".bl-trait-card").forEach(function (card) {
      card.addEventListener("click", function () {
        stepTrait(card.dataset.trait);
      });
    });

    var testBtn = document.getElementById("bl-test-btn");
    if (testBtn && !testBtn.disabled) {
      testBtn.addEventListener("click", function () {
        session.screen = "testing";
        render();
      });
    }
  }

  function stepTrait(id) {
    var trait = TRAITS_BY_ID[id];
    var current = session.selections[id] || 0;
    var spent = computeSpent(session.selections);
    var currentCost = current > 0 ? trait.levels[current - 1].cost : 0;
    var remaining = BUDGET - spent + currentCost;

    var next = current + 1;
    if (next > 3) next = 0;

    if (next > 0) {
      var nextCost = trait.levels[next - 1].cost;
      if (nextCost > remaining) next = 0;
    }

    if (next === 0) {
      delete session.selections[id];
    } else {
      session.selections[id] = next;
    }
    render();
  }

  function testingHTML() {
    return (
      '<div class="bl-wrap bl-testing">' +
      '<div class="bl-testing-box">' +
      '<div class="bl-dialogue-avatar bl-testing-avatar">' +
      ARIA.avatar +
      "</div>" +
      '<p class="bl-testing-name">' +
      ARIA.name +
      "</p>" +
      '<div class="bl-spinner"></div>' +
      '<p class="bl-testing-step" id="bl-testing-step">🧬 Sintetizando sequência genética...</p>' +
      '<div class="bl-testing-bar"><div class="bl-testing-fill" id="bl-testing-fill"></div></div>' +
      "</div>" +
      "</div>"
    );
  }

  function runTesting() {
    var mission = MISSIONS[session.missionIndex];
    var eventOccurs = Math.random() < 0.7;

    var steps = [
      "🧬 Sintetizando sequência genética...",
      "🌱 Cultivando organismo em laboratório...",
      "🌍 Expondo o organismo às condições da missão...",
    ];
    if (eventOccurs) {
      steps.push(mission.event.icon + " " + mission.event.name + " — " + mission.event.desc);
    }
    steps.push("📊 Calculando resultados finais...");

    var stepEl = document.getElementById("bl-testing-step");
    var fillEl = document.getElementById("bl-testing-fill");
    var i = 0;

    function next() {
      if (!stepEl || !fillEl || session.screen !== "testing") return;
      stepEl.textContent = steps[i];
      fillEl.style.width = Math.round(((i + 1) / steps.length) * 100) + "%";
      i++;
      if (i < steps.length) {
        setTimeout(next, 700);
      } else {
        setTimeout(function () {
          finishTesting(eventOccurs);
        }, 700);
      }
    }
    next();
  }

  function finishTesting(eventOccurs) {
    var mission = MISSIONS[session.missionIndex];
    var result = computeResult(mission, session.selections, eventOccurs);
    var xpGained = Math.round(result.score * (0.7 + session.missionIndex * 0.1));

    var oldLevel = levelFromXp(state.xp);
    state.xp += xpGained;
    state.experimentsCompleted += 1;
    state.bestScore = Math.max(state.bestScore, result.score);
    state.nextMissionIndex = (session.missionIndex + 1) % MISSIONS.length;
    if (state.missionsCompleted.indexOf(session.missionIndex) === -1) {
      state.missionsCompleted.push(session.missionIndex);
    }
    var newLevel = levelFromXp(state.xp);
    state.level = newLevel;
    saveState();

    session.testResult = result;
    session.xpGained = xpGained;
    session.leveledUp = newLevel > oldLevel;
    session.screen = "result";
    render();
  }

  function resultHTML() {
    var mission = MISSIONS[session.missionIndex];
    var result = session.testResult;
    var cls = scoreClass(result.score);
    var insights = buildInsights(mission, result.stats, result);
    var feedback = generateFeedback(mission, session.selections, result);
    var tier = scoreTier(result.score);
    var reactionLines = mission.story.outro[tier];

    var reactionHtml =
      '<div class="bl-result-reactions">' +
      reactionLines
        .map(function (line) {
          return dialogueLineHTML(line, mission);
        })
        .join("") +
      "</div>";

    var barsHtml = STATS.map(function (s) {
      return (
        '<div class="bl-bar-row"><span class="bl-bar-label">' +
        s.icon +
        " " +
        s.label +
        '</span><div class="bl-bar-track"><div class="bl-bar-fill" data-target="' +
        result.stats[s.key] +
        '" style="width:0%"></div></div><span class="bl-bar-value">' +
        result.stats[s.key] +
        "</span></div>"
      );
    }).join("");

    barsHtml +=
      '<div class="bl-bar-row"><span class="bl-bar-label">💰 Custo</span><div class="bl-bar-track"><div class="bl-bar-fill bl-bar-cost" data-target="' +
      result.budgetSpent +
      '" style="width:0%"></div></div><span class="bl-bar-value">' +
      result.budgetSpent +
      "/100</span></div>";

    var eventBanner;
    if (result.eventResult.occurred) {
      eventBanner =
        '<div class="bl-event-banner">' +
        mission.event.icon +
        " <strong>" +
        mission.event.name +
        "</strong> — " +
        mission.event.desc +
        " " +
        (result.eventResult.mitigated
          ? "Seu organismo resistiu bem graças às características escolhidas."
          : "Seu organismo sofreu impacto considerável com o evento.") +
        "</div>";
    } else {
      eventBanner = '<div class="bl-event-banner is-calm">✅ Nenhum evento inesperado ocorreu durante o teste.</div>';
    }

    var levelUpHtml = session.leveledUp
      ? '<p class="bl-levelup">🎉 Você subiu de nível! Agora você é ' + LEVELS[state.level].name + "</p>"
      : "";

    var wellHtml = insights.well
      .map(function (t) {
        return "<li>" + t + "</li>";
      })
      .join("");
    var improveHtml = insights.improve
      .map(function (t) {
        return "<li>" + t + "</li>";
      })
      .join("");

    return (
      '<div class="bl-wrap bl-result">' +
      '<p class="bl-panel-title">RESULTADO DO EXPERIMENTO</p>' +
      '<div class="bl-result-head">' +
      '<div class="bl-score-badge"><span class="bl-score-num">' +
      result.score +
      '</span><span class="bl-score-max">/100</span></div>' +
      '<p class="bl-score-class">' +
      cls.emoji +
      " " +
      cls.label +
      "</p>" +
      levelUpHtml +
      "</div>" +
      reactionHtml +
      eventBanner +
      '<div class="bl-result-bars">' +
      barsHtml +
      "</div>" +
      '<div class="bl-feedback-box">' +
      '<p class="bl-feedback-title">📋 Análise científica</p>' +
      '<p class="bl-feedback-text">' +
      feedback +
      "</p>" +
      "</div>" +
      '<div class="bl-result-cols">' +
      '<div class="bl-result-col"><p class="bl-col-title">✅ O que você fez bem</p><ul>' +
      wellHtml +
      "</ul></div>" +
      '<div class="bl-result-col"><p class="bl-col-title">⚠️ O que poderia melhorar</p><ul>' +
      improveHtml +
      "</ul></div>" +
      "</div>" +
      '<p class="bl-xp-line">+' +
      session.xpGained +
      " XP</p>" +
      '<div class="bl-result-actions">' +
      '<button type="button" class="bl-btn bl-btn-outline" id="bl-retry-btn">🔁 TENTAR NOVAMENTE</button>' +
      '<button type="button" class="bl-btn bl-btn-primary" id="bl-next-btn">🗺️ VOLTAR AO MAPA</button>' +
      "</div>" +
      "</div>"
    );
  }

  function bindResult() {
    var retryBtn = document.getElementById("bl-retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        session.selections = {};
        session.screen = "lab";
        render();
      });
    }
    var nextBtn = document.getElementById("bl-next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        session.screen = "hub3d";
        render();
      });
    }
  }

  function animateBars() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.querySelectorAll(".bl-bar-fill").forEach(function (el) {
          el.style.width = el.dataset.target + "%";
        });
      });
    });
  }

  render();
});
