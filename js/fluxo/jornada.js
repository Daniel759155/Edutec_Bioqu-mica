// FLUXO — Jornada da Glicose (Figma: 07 · Jogo — Jornada da Glicose).
// A glicose percorre as 6 etapas reais da respiração celular. Em cada etapa
// há um desafio com tempo: acertar libera a energia da etapa (o contador de
// ATP sobe com "tick"); errar faz a tela tremer e custa 5 segundos. Ao fim,
// tela de resultado com o total de ATP (máximo clássico de 36).
// Uso: const jogo = montarJornada(elemento, { aoSair }); jogo.destruir();

import { desbloquear } from "./conquistas.js";
import { suportaWebGL } from "../three/suporte.js";

const CHAVE_PROGRESSO = "fluxo_progress_v1"; // { best, runs } — mesma chave do jogo antigo
const TEMPO_ETAPA = 30; // segundos
const PENALIDADE = 5; // segundos perdidos por resposta errada
const ATP_MAXIMO = 36;
const LETRAS = ["A", "B", "C", "D"];

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Contabilidade clássica: glicólise 2 + Krebs 2 + fosforilação oxidativa 32 = 36 ATP.
export const ETAPAS = [
  {
    id: "corrente",
    nome: "Corrente sanguínea",
    local: "📍 Vaso sanguíneo",
    pergunta: "Depois de uma refeição, como a glicose viaja até as células do corpo?",
    opcoes: [
      "Dissolvida no plasma do sangue",
      "Carregada pela hemoglobina das hemácias",
      "Presa às moléculas de DNA",
      "Como gás, junto com o oxigênio",
    ],
    correta: 0,
    explicacao:
      "A glicose é solúvel em água e viaja dissolvida no plasma. A hemoglobina das hemácias transporta oxigênio, não açúcar.",
    atp: 0,
    recompensa: "Glicose entregue 🚚",
  },
  {
    id: "membrana",
    nome: "Membrana celular",
    local: "📍 Membrana plasmática",
    pergunta: "Como a glicose atravessa a membrana e entra na célula?",
    opcoes: [
      "Passa livremente entre os lipídios",
      "Por proteínas transportadoras (GLUT)",
      "Pelos poros do núcleo",
      "Dissolvendo um pedaço da membrana",
    ],
    correta: 1,
    explicacao:
      "A glicose é grande e polar: entra por transportadores GLUT. Logo na entrada, a enzima hexoquinase a fosforila e a prende dentro da célula.",
    atp: 0,
    recompensa: "Dentro da célula 🔓",
  },
  {
    id: "glicolise",
    nome: "Glicólise",
    local: "📍 Citoplasma da célula",
    pergunta: "Na glicólise, a molécula de glicose é quebrada em quê?",
    opcoes: ["2 moléculas de piruvato", "2 aminoácidos", "6 moléculas de CO₂", "1 molécula de DNA"],
    correta: 0,
    explicacao:
      "A glicólise acontece no citoplasma e quebra a glicose em 2 piruvatos, gerando um saldo de 2 ATP (e 2 NADH).",
    atp: 2,
    recompensa: "+2 ATP ⚡",
  },
  {
    id: "krebs",
    nome: "Ciclo de Krebs",
    local: "📍 Matriz mitocondrial",
    pergunta: "Em qual compartimento da célula o ciclo de Krebs acontece?",
    opcoes: ["No citoplasma", "Na matriz mitocondrial", "No núcleo", "Na membrana plasmática"],
    correta: 1,
    explicacao:
      "Cada piruvato vira Acetil-CoA (liberando CO₂) e entra no ciclo, na matriz da mitocôndria. As duas voltas rendem 2 ATP, além de NADH e FADH₂.",
    atp: 2,
    recompensa: "+2 ATP ⚡",
  },
  {
    id: "cadeia",
    nome: "Cadeia respiratória",
    local: "📍 Membrana interna da mitocôndria",
    pergunta: "Qual molécula recebe os elétrons no final da cadeia respiratória?",
    opcoes: ["Glicose", "Piruvato", "Oxigênio (O₂)", "Água"],
    correta: 2,
    explicacao:
      "O oxigênio é o aceptor final: recebe os elétrons e forma água. Sem ele, a cadeia trava. A passagem dos elétrons bombeia prótons e cria um gradiente.",
    atp: 0,
    recompensa: "Gradiente de prótons pronto ⚡",
  },
  {
    id: "atp",
    nome: "ATP",
    local: "📍 ATP sintase",
    pergunta: "Qual enzima usa o fluxo de prótons para produzir ATP?",
    opcoes: ["Hexoquinase", "DNA polimerase", "ATP sintase", "Amilase"],
    correta: 2,
    explicacao:
      "Os prótons voltam pela ATP sintase, que gira como uma turbina e junta ADP + fosfato. É aqui que sai a maior parte da energia: cerca de 32 ATP.",
    atp: 32,
    recompensa: "+32 ATP ⚡",
  },
];

function lerProgresso() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_PROGRESSO));
    if (dados && typeof dados === "object") return { best: dados.best || 0, runs: dados.runs || 0 };
  } catch {
    /* ignora */
  }
  return { best: 0, runs: 0 };
}

function salvarProgresso(progresso) {
  try {
    localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(progresso));
  } catch {
    /* ignora */
  }
}

export function melhorJornada() {
  return lerProgresso().best;
}

const dois = (n) => String(n).padStart(2, "0");
const formatarTempo = (s) => `${dois(Math.floor(s / 60))}:${dois(Math.floor(s % 60))}`;

// "Tick" curtinho do contador de ATP (Web Audio, sem arquivos de som).
let audio = null;
function tocarTick(agudo = 1) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const ganho = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = 880 * agudo;
    ganho.gain.setValueAtTime(0.04, audio.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.08);
    osc.connect(ganho).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.09);
  } catch {
    /* sem áudio */
  }
}

export function montarJornada(raiz, { aoSair } = {}) {
  raiz.innerHTML = `
    <div class="jornada" data-jornada>
      <header class="jornada__topo">
        <div class="jogo-hud">
          <button class="jogo-hud__sair" type="button" data-sair>← Sair</button>
          <i class="jogo-hud__divisor" aria-hidden="true"></i>
          <span class="jogo-hud__modo">JORNADA DA GLICOSE</span>
          <span class="jogo-hud__etapa" data-rotulo-etapa>Etapa 1 de 6 · Corrente sanguínea</span>
        </div>
        <div class="jogo-hud jogo-hud--atp" aria-live="polite">
          <span class="jogo-hud__raio" aria-hidden="true">⚡</span>
          <span class="jogo-hud__rotulo">ATP</span>
          <strong class="jogo-hud__atp" data-atp>00</strong>
          <span class="jogo-hud__max">/ ${ATP_MAXIMO}</span>
        </div>
      </header>

      <ol class="trilha-etapas" data-trilha style="--progresso:0">
        ${ETAPAS.map(
          (e, i) => `
          <li class="trilha-etapas__item" data-etapa-item="${i}">
            <span class="trilha-etapas__ponto" aria-hidden="true">
              <img class="trilha-etapas__img trilha-etapas__img--pendente" src="assets/fluxo/etapa-pendente.svg" alt="" />
              <img class="trilha-etapas__img trilha-etapas__img--feita" src="assets/fluxo/etapa-feita.svg" alt="" />
              <img class="trilha-etapas__img trilha-etapas__img--atual" src="assets/fluxo/etapa-atual.svg" alt="" />
            </span>
            <span class="trilha-etapas__nome">${e.nome}</span>
          </li>`
        ).join("")}
      </ol>

      <div class="jornada__grade">
        <section class="jornada__cena" aria-label="Cena da etapa">
          <div class="jornada__canvas" data-cena-3d></div>
          <img class="jornada__piruvato jornada__piruvato--1" src="assets/fluxo/piruvato.svg" alt="" aria-hidden="true" />
          <img class="jornada__piruvato jornada__piruvato--2" src="assets/fluxo/piruvato.svg" alt="" aria-hidden="true" />
          <span class="jornada__legenda" data-legenda>📍 Vaso sanguíneo</span>
        </section>

        <section class="painel" data-painel aria-labelledby="pergunta-jornada">
          <div class="painel__topo">
            <span class="painel__rotulo">DESAFIO DA ETAPA</span>
            <span class="painel__tempo" data-tempo role="timer">⏱ 00:30</span>
          </div>
          <h2 class="painel__pergunta" id="pergunta-jornada" data-pergunta></h2>
          <div class="painel__opcoes" data-opcoes role="group" aria-labelledby="pergunta-jornada"></div>
          <div class="painel__explicacao" data-explicacao hidden aria-live="polite">
            <span aria-hidden="true">💡</span>
            <p data-explicacao-texto></p>
          </div>
          <div class="painel__rodape" data-rodape hidden>
            <strong class="painel__ganho" data-ganho></strong>
            <button class="btn btn--primary" type="button" data-proxima>Próxima etapa <span class="btn__seta" aria-hidden="true">→</span></button>
          </div>
        </section>
      </div>

      <div class="resultado" data-resultado hidden></div>
    </div>`;

  const $ = (sel) => raiz.querySelector(sel);
  const tela = $("[data-jornada]");
  const el = {
    rotulo: $("[data-rotulo-etapa]"),
    atp: $("[data-atp]"),
    trilha: $("[data-trilha]"),
    legenda: $("[data-legenda]"),
    tempo: $("[data-tempo]"),
    pergunta: $("[data-pergunta]"),
    opcoes: $("[data-opcoes]"),
    explicacao: $("[data-explicacao]"),
    explicacaoTexto: $("[data-explicacao-texto]"),
    rodape: $("[data-rodape]"),
    ganho: $("[data-ganho]"),
    proxima: $("[data-proxima]"),
    resultado: $("[data-resultado]"),
    painel: $("[data-painel]"),
  };

  const estado = {
    etapa: 0,
    atp: 0,
    atpMostrado: 0,
    restante: TEMPO_ETAPA,
    resolvida: false,
    errosNaEtapa: 0,
    acertosDePrimeira: 0,
    porEtapa: [],
    inicio: performance.now(),
  };

  let cena = null; // cena 3D (carregada sob demanda)
  let timer = null;
  let contagemAtp = null;
  let destruido = false;

  // Cena 3D da etapa (Three.js). Sem WebGL (ou se a CDN falhar): imagem da glicose.
  const mostrarImagemGlicose = () => {
    const alvo = $("[data-cena-3d]");
    if (alvo.querySelector("img")) return;
    const img = document.createElement("img");
    img.className = "palco-3d__fallback";
    img.src = "assets/3d/glicose.svg";
    img.alt = "";
    alvo.appendChild(img);
  };
  if (!suportaWebGL()) mostrarImagemGlicose();
  else
    import("../three/jornada.js")
      .then((modulo) => {
        if (destruido) return;
        cena = modulo.montarCenaJornada($("[data-cena-3d]"));
        cena?.mostrarEtapa(estado.etapa);
      })
      .catch(mostrarImagemGlicose);

  function mostrarEtapa() {
    const e = ETAPAS[estado.etapa];
    estado.restante = TEMPO_ETAPA;
    estado.resolvida = false;
    estado.errosNaEtapa = 0;

    tela.dataset.etapa = e.id;
    el.rotulo.textContent = `Etapa ${estado.etapa + 1} de ${ETAPAS.length} · ${e.nome}`;
    el.legenda.textContent = e.local;
    el.pergunta.textContent = e.pergunta;
    el.opcoes.innerHTML = e.opcoes
      .map(
        (texto, i) => `
        <button class="opcao" type="button" data-opcao="${i}">
          <span class="opcao__letra">${LETRAS[i]}</span>
          <span class="opcao__texto">${texto}</span>
          <span class="opcao__marca" aria-hidden="true"></span>
        </button>`
      )
      .join("");
    el.explicacao.hidden = true;
    el.rodape.hidden = true;
    el.painel.classList.remove("painel--entra");
    void el.painel.offsetWidth;
    el.painel.classList.add("painel--entra");

    // Trilha de etapas: feitas, atual e pendentes.
    raiz.querySelectorAll("[data-etapa-item]").forEach((item, i) => {
      item.classList.toggle("feita", i < estado.etapa);
      item.classList.toggle("atual", i === estado.etapa);
      if (i === estado.etapa) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    el.trilha.style.setProperty("--progresso", estado.etapa / (ETAPAS.length - 1));

    cena?.mostrarEtapa(estado.etapa);
    atualizarTempo();
    iniciarTimer();
    el.opcoes.querySelector("button")?.focus({ preventScroll: true });
  }

  function iniciarTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      estado.restante -= 0.25;
      atualizarTempo();
      if (estado.restante <= 0) acabouTempo();
    }, 250);
  }

  function atualizarTempo() {
    const s = Math.max(0, Math.ceil(estado.restante));
    el.tempo.textContent = `⏱ ${formatarTempo(s)}`;
    el.tempo.classList.toggle("urgente", s <= 5 && !estado.resolvida);
  }

  function responder(botao) {
    if (estado.resolvida || botao.disabled) return;
    const e = ETAPAS[estado.etapa];
    const escolha = Number(botao.dataset.opcao);

    if (escolha === e.correta) {
      botao.classList.add("correta");
      finalizarEtapa(true);
      return;
    }

    // Errou: opção vermelha com shake, tela treme e perde tempo.
    estado.errosNaEtapa++;
    botao.classList.add("errada");
    botao.disabled = true;
    tremerTela();
    cena?.erro();
    estado.restante = Math.max(0, estado.restante - PENALIDADE);
    mostrarPenalidade();
    atualizarTempo();
    if (estado.restante <= 0) acabouTempo();
  }

  function acabouTempo() {
    if (estado.resolvida) return;
    const e = ETAPAS[estado.etapa];
    el.opcoes.querySelector(`[data-opcao="${e.correta}"]`)?.classList.add("correta", "revelada");
    finalizarEtapa(false);
  }

  function finalizarEtapa(acertou) {
    const e = ETAPAS[estado.etapa];
    estado.resolvida = true;
    clearInterval(timer);
    el.tempo.classList.remove("urgente");
    el.opcoes.querySelectorAll("button").forEach((b) => (b.disabled = true));

    const ganho = acertou ? e.atp : 0;
    estado.porEtapa.push({ nome: e.nome, atp: ganho, acertou, deprimeira: acertou && estado.errosNaEtapa === 0 });
    if (acertou && estado.errosNaEtapa === 0) estado.acertosDePrimeira++;
    if (acertou && e.id === "krebs" && estado.errosNaEtapa === 0) desbloquear("krebs");

    el.explicacao.hidden = false;
    el.explicacao.classList.toggle("painel__explicacao--tempo", !acertou);
    el.explicacaoTexto.textContent = acertou ? `Correto! ${e.explicacao}` : `O tempo acabou. ${e.explicacao}`;
    el.rodape.hidden = false;
    el.ganho.textContent = acertou ? e.recompensa : "Sem energia nesta etapa";
    el.ganho.classList.toggle("painel__ganho--vazio", !acertou);
    const ultima = estado.etapa === ETAPAS.length - 1;
    el.proxima.innerHTML = `${ultima ? "Ver resultado" : "Próxima etapa"} <span class="btn__seta" aria-hidden="true">→</span>`;
    el.proxima.focus({ preventScroll: true });

    if (acertou) {
      cena?.acerto(estado.etapa);
      if (e.id === "glicolise") tela.classList.add("dividiu");
      if (ganho > 0) somarAtp(ganho);
    }
  }

  // Contador sobe de 1 em 1 com "tick" (rápido quando o ganho é grande).
  function somarAtp(quantidade) {
    estado.atp += quantidade;
    desbloquear("primeiro-atp");
    clearInterval(contagemAtp);
    const passo = Math.max(1, Math.round(quantidade / 16));
    contagemAtp = setInterval(
      () => {
        estado.atpMostrado = Math.min(estado.atp, estado.atpMostrado + passo);
        el.atp.textContent = dois(estado.atpMostrado);
        el.atp.classList.remove("tick");
        void el.atp.offsetWidth;
        el.atp.classList.add("tick");
        tocarTick(1 + estado.atpMostrado / 80);
        if (estado.atpMostrado >= estado.atp) clearInterval(contagemAtp);
      },
      reduzido ? 0 : 70
    );
  }

  function mostrarPenalidade() {
    const aviso = document.createElement("span");
    aviso.className = "painel__penalidade";
    aviso.textContent = `−${PENALIDADE}s`;
    el.tempo.after(aviso);
    setTimeout(() => aviso.remove(), 900);
  }

  function tremerTela() {
    tela.classList.remove("tremendo");
    void tela.offsetWidth;
    tela.classList.add("tremendo");
  }

  function proxima() {
    tela.classList.remove("dividiu");
    if (estado.etapa < ETAPAS.length - 1) {
      estado.etapa++;
      mostrarEtapa();
    } else {
      mostrarResultado();
    }
  }

  function mostrarResultado() {
    clearInterval(timer);
    const progresso = lerProgresso();
    const recorde = estado.atp > progresso.best;
    progresso.best = Math.max(progresso.best, estado.atp);
    progresso.runs += 1;
    salvarProgresso(progresso);

    if (estado.acertosDePrimeira === ETAPAS.length) desbloquear("mestre");
    if (estado.atp >= ATP_MAXIMO) desbloquear("atp-max");

    const duracao = (performance.now() - estado.inicio) / 1000;
    el.resultado.innerHTML = `
      <div class="resultado__card" role="dialog" aria-modal="true" aria-labelledby="resultado-titulo">
        <span class="eyebrow"><span class="eyebrow__ponto" aria-hidden="true"><img src="assets/ui/pulse-dot.svg" alt="" /></span>Jornada concluída</span>
        <h2 class="resultado__titulo" id="resultado-titulo">Sua glicose virou energia!</h2>
        <p class="resultado__total"><strong>${estado.atp}</strong> <span>/ ${ATP_MAXIMO} ATP</span></p>
        ${recorde ? '<p class="resultado__recorde">🏆 Novo recorde pessoal!</p>' : `<p class="resultado__sub">Melhor marca: ${progresso.best} ATP · tempo ${formatarTempo(duracao)}</p>`}
        <ul class="resultado__lista" role="list">
          ${estado.porEtapa
            .map(
              (p) => `<li class="${p.acertou ? "" : "perdeu"}"><span>${p.acertou ? "✓" : "✕"} ${p.nome}</span><span>${
                p.atp ? `+${p.atp} ATP` : "—"
              }</span></li>`
            )
            .join("")}
        </ul>
        <p class="resultado__nota">
          36 ATP é o valor clássico dos livros. Medidas mais recentes indicam algo entre 30 e 32 ATP por glicose, porque parte da energia
          se perde como calor e no transporte de moléculas para dentro da mitocôndria.
        </p>
        <div class="resultado__botoes">
          <button class="btn btn--primary" type="button" data-de-novo>Jogar de novo <span class="btn__seta" aria-hidden="true">↻</span></button>
          <button class="btn btn--ghost" type="button" data-sair>Voltar ao Fluxo</button>
        </div>
      </div>`;
    el.resultado.hidden = false;
    el.resultado.querySelector("[data-de-novo]").focus({ preventScroll: true });
  }

  function reiniciar() {
    Object.assign(estado, {
      etapa: 0,
      atp: 0,
      atpMostrado: 0,
      acertosDePrimeira: 0,
      porEtapa: [],
      inicio: performance.now(),
    });
    el.atp.textContent = "00";
    el.resultado.hidden = true;
    mostrarEtapa();
  }

  // Eventos
  el.opcoes.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-opcao]");
    if (botao) responder(botao);
  });
  el.proxima.addEventListener("click", proxima);
  raiz.addEventListener("click", (e) => {
    if (e.target.closest("[data-sair]")) aoSair?.();
    else if (e.target.closest("[data-de-novo]")) reiniciar();
  });
  // Teclado: A–D (ou 1–4) respondem; Enter avança.
  const aoTeclar = (e) => {
    if (!el.resultado.hidden) return;
    const tecla = e.key.toUpperCase();
    const indice = LETRAS.indexOf(tecla) >= 0 ? LETRAS.indexOf(tecla) : "1234".indexOf(e.key);
    if (indice >= 0 && !estado.resolvida) {
      const botao = el.opcoes.querySelector(`[data-opcao="${indice}"]`);
      if (botao) responder(botao);
    }
  };
  window.addEventListener("keydown", aoTeclar);

  // Pausa o relógio quando a aba fica escondida.
  const aoMudarAba = () => {
    if (document.hidden) clearInterval(timer);
    else if (!estado.resolvida && el.resultado.hidden) iniciarTimer();
  };
  document.addEventListener("visibilitychange", aoMudarAba);

  mostrarEtapa();

  return {
    destruir() {
      destruido = true;
      clearInterval(timer);
      clearInterval(contagemAtp);
      window.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("visibilitychange", aoMudarAba);
      cena?.destruir();
      raiz.innerHTML = "";
    },
  };
}
