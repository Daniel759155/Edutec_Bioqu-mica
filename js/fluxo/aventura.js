// FLUXO — Aventura no Mapa (Figma: 08 · Jogo — Aventura no Mapa).
// Mantém a mecânica do jogo antigo (3 fases, 3 vidas, anticorpos patrulhando,
// invulnerabilidade depois de um golpe, recorde de tempo) com a nova interface:
// mapa de tiles maior que a tela e câmera seguindo a glicose (lerp), tiles
// vermelhos (bloqueio: −1 vida + tremor), tiles azuis (corrente que acelera),
// ATP coletável (partículas + toast "+1 ATP"), turbo que gasta ATP, pausa,
// minimapa e joystick virtual no celular. Chegar na célula = vitória.
// Uso: const jogo = montarAventura(elemento, { aoSair }); jogo.destruir();

import { desbloquear } from "./conquistas.js";

const CHAVE_RECORDE = "fluxo_mapa_best_v1"; // ms — mesma chave do jogo antigo
const TILE = 64; // 60px + 4px de espaço (Figma)
const RAIO_JOGADOR = 20;
const VELOCIDADE = 250; // px/s
const FATOR_CORRENTE = 1.6;
const FATOR_TURBO = 1.8;
const DURACAO_TURBO = 1.5; // s por ATP gasto
const INVULNERAVEL = 1.1; // s
const VIDAS = 3;
const RAIO_ANTICORPO = 17;
const MARGEM_CAMERA_X = 260; // px além da borda (espaço do minimapa / HUD)
const MARGEM_CAMERA_Y = 180;

function limitarCamera(alvo, tamanhoMapa, tamanhoTela, margem) {
  const min = tamanhoTela / 2 - margem;
  const max = tamanhoMapa - tamanhoTela / 2 + margem;
  return min > max ? tamanhoMapa / 2 : Math.max(min, Math.min(max, alvo));
}

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const toque = window.matchMedia("(pointer: coarse)").matches;

// Fases: mapa gerado com semente fixa (o mesmo mapa toda vez, justo para o recorde).
const FASES = [
  { colunas: 24, linhas: 15, bloqueios: 0.13, correntes: 0.06, atp: 10, anticorpos: 3, semente: 11 },
  { colunas: 30, linhas: 18, bloqueios: 0.17, correntes: 0.06, atp: 12, anticorpos: 5, semente: 23 },
  { colunas: 34, linhas: 21, bloqueios: 0.2, correntes: 0.07, atp: 14, anticorpos: 7, semente: 37 },
];

export function recordeAventura() {
  try {
    const valor = parseInt(localStorage.getItem(CHAVE_RECORDE), 10);
    return Number.isFinite(valor) && valor > 0 ? valor : 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(ms) {
  try {
    localStorage.setItem(CHAVE_RECORDE, String(Math.floor(ms)));
  } catch {
    /* ignora */
  }
}

export const formatarTempo = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// Gerador pseudoaleatório com semente (mulberry32).
function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tipos de tile: 0 livre, 1 bloqueio (vermelho), 2 corrente (azul).
function gerarFase(config) {
  const { colunas, linhas } = config;
  const rnd = aleatorio(config.semente);
  const mapa = Array.from({ length: linhas }, () => new Array(colunas).fill(0));
  const inicio = { x: 1, y: linhas - 2 };
  const destino = { x: colunas - 3, y: 2 };

  for (let y = 0; y < linhas; y++)
    for (let x = 0; x < colunas; x++) {
      const r = rnd();
      if (r < config.bloqueios) mapa[y][x] = 1;
      else if (r < config.bloqueios + config.correntes) mapa[y][x] = 2;
    }

  // Caminho garantido: passeio aleatório do início ao destino, limpando 2 tiles de largura.
  let cx = inicio.x;
  let cy = inicio.y;
  while (cx !== destino.x || cy !== destino.y) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, -1]]) {
      const x = cx + dx;
      const y = cy + dy;
      if (mapa[y]?.[x] === 1) mapa[y][x] = 0;
    }
    const irX = cx !== destino.x && (cy === destino.y || rnd() < 0.55);
    if (irX) cx += Math.sign(destino.x - cx);
    else cy += Math.sign(destino.y - cy);
  }
  // Área livre em volta do início e da célula de destino.
  const limpar = (px, py, r) => {
    for (let y = py - r; y <= py + r; y++) for (let x = px - r; x <= px + r; x++) if (mapa[y]?.[x] !== undefined) mapa[y][x] = 0;
  };
  limpar(inicio.x, inicio.y, 1);
  limpar(destino.x, destino.y, 2);

  const livres = [];
  for (let y = 0; y < linhas; y++)
    for (let x = 0; x < colunas; x++)
      if (mapa[y][x] !== 1 && Math.hypot(x - inicio.x, y - inicio.y) > 3 && Math.hypot(x - destino.x, y - destino.y) > 3) livres.push({ x, y });

  const sortear = () => livres.splice(Math.floor(rnd() * livres.length), 1)[0];
  const centro = (t) => ({ x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE });

  const atps = Array.from({ length: config.atp }, () => ({ ...centro(sortear()), pego: false, fase: rnd() * 6 }));

  // Anticorpos: patrulham em linha reta por tiles livres (vai e volta).
  const anticorpos = [];
  for (let n = 0; n < config.anticorpos && livres.length; n++) {
    const t = sortear();
    const horizontal = rnd() < 0.5;
    let a = 0;
    let b = 0;
    while (a > -4 && mapa[t.y + (horizontal ? 0 : a - 1)]?.[t.x + (horizontal ? a - 1 : 0)] === 0) a--;
    while (b < 4 && mapa[t.y + (horizontal ? 0 : b + 1)]?.[t.x + (horizontal ? b + 1 : 0)] === 0) b++;
    if (b - a < 2) continue;
    const de = centro({ x: t.x + (horizontal ? a : 0), y: t.y + (horizontal ? 0 : a) });
    const ate = centro({ x: t.x + (horizontal ? b : 0), y: t.y + (horizontal ? 0 : b) });
    anticorpos.push({ de, ate, x: de.x, y: de.y, dir: 1, vel: 70 + rnd() * 60 });
  }

  return {
    mapa,
    colunas,
    linhas,
    largura: colunas * TILE,
    altura: linhas * TILE,
    inicio: centro(inicio),
    destino: centro(destino),
    atps,
    anticorpos,
  };
}

function carregarImagem(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const SPRITES = {
  jogador: carregarImagem("assets/fluxo/jogador-glicose.svg"), // 118×118 (esfera r25)
  atp: carregarImagem("assets/fluxo/atp-coletavel.svg"), // 62×62 (esfera r13)
  celula: carregarImagem("assets/fluxo/celula-destino.png"), // 440×440 → 220px
  rastro: carregarImagem("assets/fluxo/rastro.svg"), // 10×10
};

export function montarAventura(raiz, { aoSair } = {}) {
  raiz.innerHTML = `
    <div class="aventura" data-aventura>
      <canvas class="aventura__canvas" data-canvas aria-label="Mapa da Aventura: leve a glicose até a célula de destino"></canvas>

      <div class="jogo-hud aventura__hud">
        <button class="jogo-hud__pausa" type="button" data-pausa aria-label="Pausar">⏸</button>
        <span class="jogo-hud__modo jogo-hud__modo--violeta">AVENTURA NO MAPA</span>
        <span class="jogo-hud__etapa" data-fase>Fase 1</span>
        <span class="jogo-hud__tempo" data-tempo>⏱ 00:00</span>
      </div>

      <div class="jogo-hud aventura__vidas" aria-live="polite">
        <span class="aventura__coracoes" data-vidas aria-label="3 vidas">❤️ ❤️ ❤️</span>
        <i class="jogo-hud__divisor" aria-hidden="true"></i>
        <strong class="aventura__atp" data-atp>⚡ 0</strong>
      </div>

      <div class="aventura__minimapa" aria-hidden="true">
        <span>MINIMAPA</span>
        <canvas width="200" height="124" data-minimapa></canvas>
      </div>

      <div class="aventura__controles" aria-hidden="true">
        <span>⬆⬇⬅➡ / WASD mover</span><span>ESPAÇO turbo</span><span>P pausar</span>
      </div>

      <div class="aventura__joystick" data-joystick aria-hidden="true"><span class="aventura__manche" data-manche></span></div>
      <button class="aventura__turbo" type="button" data-turbo aria-label="Turbo (gasta 1 ATP)">⚡ Turbo</button>

      <div class="aventura__camada" data-camada></div>

      <div class="aventura__aviso" data-aviso>
        <div class="resultado__card aventura__aviso-card" role="dialog" aria-modal="true" aria-labelledby="aviso-titulo">
          <span class="selo selo--violeta" data-aviso-selo>MODO DESAFIO</span>
          <h2 class="resultado__titulo" id="aviso-titulo" data-aviso-titulo></h2>
          <p class="resultado__sub" data-aviso-texto></p>
          <div class="resultado__botoes" data-aviso-botoes></div>
        </div>
      </div>
    </div>`;

  const $ = (sel) => raiz.querySelector(sel);
  const tela = $("[data-aventura]");
  const canvas = $("[data-canvas]");
  const ctx = canvas.getContext("2d");
  const mini = $("[data-minimapa]").getContext("2d");
  const hud = { fase: $("[data-fase]"), tempo: $("[data-tempo]"), vidas: $("[data-vidas]"), atp: $("[data-atp]") };
  const aviso = {
    raiz: $("[data-aviso]"),
    selo: $("[data-aviso-selo]"),
    titulo: $("[data-aviso-titulo]"),
    texto: $("[data-aviso-texto]"),
    botoes: $("[data-aviso-botoes]"),
  };

  const teclas = { cima: false, baixo: false, esquerda: false, direita: false };
  const joystick = { x: 0, y: 0 };
  const jogo = {
    fase: 0,
    nivel: null,
    vidas: VIDAS,
    atp: 0,
    tempo: 0,
    status: "inicio", // inicio | jogando | pausado | fase-concluida | fim | vitoria
    jogador: { x: 0, y: 0, seguroX: 0, seguroY: 0 },
    invulneravel: 0,
    turbo: 0,
    camera: { x: 0, y: 0 },
    tremor: 0,
    rastro: [],
    particulas: [],
  };
  let largura = 0;
  let altura = 0;
  let dpr = 1;

  // --- Tamanho do canvas acompanha a tela -----------------------------------
  function ajustarTamanho() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    largura = tela.clientWidth;
    altura = tela.clientHeight;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
  }
  const observador = new ResizeObserver(ajustarTamanho);
  observador.observe(tela);
  ajustarTamanho();

  // --- Fases ---------------------------------------------------------------------
  function carregarFase(indice) {
    jogo.fase = indice;
    jogo.nivel = gerarFase(FASES[indice]);
    const { inicio } = jogo.nivel;
    Object.assign(jogo.jogador, { x: inicio.x, y: inicio.y, seguroX: inicio.x, seguroY: inicio.y });
    jogo.camera.x = limitarCamera(inicio.x, jogo.nivel.largura, largura, MARGEM_CAMERA_X);
    jogo.camera.y = limitarCamera(inicio.y, jogo.nivel.altura, altura, MARGEM_CAMERA_Y);
    jogo.invulneravel = INVULNERAVEL;
    jogo.rastro = [];
    hud.fase.textContent = `Fase ${indice + 1}`;
  }

  function novaPartida() {
    jogo.vidas = VIDAS;
    jogo.atp = 0;
    jogo.tempo = 0;
    jogo.turbo = 0;
    carregarFase(0);
    atualizarHud();
    jogo.status = "jogando";
    esconderAviso();
  }

  // --- Avisos (início, pausa, fase concluída, fim) -------------------------------
  function mostrarAviso({ selo = "MODO DESAFIO", titulo, texto, botoes }) {
    aviso.selo.textContent = selo;
    aviso.titulo.textContent = titulo;
    aviso.texto.innerHTML = texto;
    aviso.botoes.innerHTML = botoes
      .map(
        (b, i) =>
          `<button class="btn ${i === 0 ? "btn--primary" : "btn--ghost"}" type="button" data-acao="${b.acao}">${b.rotulo}</button>`
      )
      .join("");
    aviso.raiz.classList.add("visivel");
    aviso.botoes.querySelector("button")?.focus({ preventScroll: true });
  }

  function esconderAviso() {
    aviso.raiz.classList.remove("visivel");
    canvas.focus?.({ preventScroll: true });
  }

  const recordeTexto = () => (recordeAventura() ? formatarTempo(recordeAventura()) : "—");

  function telaInicial() {
    jogo.status = "inicio";
    carregarFase(0);
    mostrarAviso({
      titulo: "Leve a glicose até a célula",
      texto: `Desvie dos <strong class="texto-vermelho">bloqueios vermelhos</strong> e dos anticorpos, use as <strong class="texto-azul">correntes azuis</strong> para acelerar e colete ATP para o turbo.<br />3 fases · 3 vidas · Recorde: ${recordeTexto()}`,
      botoes: [
        { acao: "comecar", rotulo: "Começar ▶" },
        { acao: "sair", rotulo: "Voltar ao Fluxo" },
      ],
    });
  }

  function pausar() {
    if (jogo.status !== "jogando") return;
    jogo.status = "pausado";
    mostrarAviso({
      selo: "PAUSADO",
      titulo: "Jogo pausado",
      texto: `Fase ${jogo.fase + 1} · ⏱ ${formatarTempo(jogo.tempo)} · ⚡ ${jogo.atp} ATP`,
      botoes: [
        { acao: "continuar", rotulo: "Continuar ▶" },
        { acao: "recomecar", rotulo: "Recomeçar" },
        { acao: "sair", rotulo: "Sair" },
      ],
    });
  }

  function continuar() {
    jogo.status = "jogando";
    esconderAviso();
  }

  function levouGolpe() {
    if (jogo.invulneravel > 0) return;
    jogo.vidas--;
    jogo.invulneravel = INVULNERAVEL;
    jogo.tremor = reduzido ? 0 : 12;
    explodir(jogo.jogador.x, jogo.jogador.y, "#ff5c7a", 16);
    // Volta para a última posição segura (fora dos bloqueios).
    jogo.jogador.x = jogo.jogador.seguroX;
    jogo.jogador.y = jogo.jogador.seguroY;
    atualizarHud();
    if (jogo.vidas <= 0) {
      jogo.status = "fim";
      mostrarAviso({
        selo: "FIM DE JOGO",
        titulo: "A glicose não resistiu",
        texto: `Você usou todas as vidas na fase ${jogo.fase + 1} de ${FASES.length}.`,
        botoes: [
          { acao: "recomecar", rotulo: "Tentar de novo ↻" },
          { acao: "sair", rotulo: "Voltar ao Fluxo" },
        ],
      });
    }
  }

  function chegouNaCelula() {
    if (jogo.fase < FASES.length - 1) {
      jogo.status = "fase-concluida";
      mostrarAviso({
        selo: `FASE ${jogo.fase + 1} DE ${FASES.length}`,
        titulo: "Fase concluída!",
        texto: `⏱ ${formatarTempo(jogo.tempo)} até aqui · ⚡ ${jogo.atp} ATP guardados para o turbo.`,
        botoes: [{ acao: "proxima", rotulo: "Próxima fase →" }],
      });
      return;
    }
    jogo.status = "vitoria";
    const anterior = recordeAventura();
    const recorde = !anterior || jogo.tempo < anterior;
    if (recorde) salvarRecorde(jogo.tempo);
    if (jogo.tempo < 120000) desbloquear("mapa-rapido");
    mostrarAviso({
      selo: "VITÓRIA",
      titulo: "Você chegou à célula!",
      texto: `Tempo total: <strong>${formatarTempo(jogo.tempo)}</strong>${recorde ? " — 🏆 novo recorde!" : ` · Recorde: ${recordeTexto()}`}<br />Vidas restantes: ${jogo.vidas} · ATP coletados: ${jogo.atp}`,
      botoes: [
        { acao: "recomecar", rotulo: "Jogar de novo ↻" },
        { acao: "sair", rotulo: "Voltar ao Fluxo" },
      ],
    });
  }

  aviso.botoes.addEventListener("click", (e) => {
    const acao = e.target.closest("[data-acao]")?.dataset.acao;
    if (acao === "comecar" || acao === "recomecar") novaPartida();
    else if (acao === "continuar") continuar();
    else if (acao === "proxima") {
      carregarFase(jogo.fase + 1);
      jogo.status = "jogando";
      esconderAviso();
    } else if (acao === "sair") aoSair?.();
  });

  // --- HUD, toasts e partículas ----------------------------------------------------
  function atualizarHud() {
    hud.vidas.textContent = Array.from({ length: VIDAS }, (_, i) => (i < jogo.vidas ? "❤️" : "🤍")).join(" ");
    hud.vidas.setAttribute("aria-label", `${jogo.vidas} ${jogo.vidas === 1 ? "vida" : "vidas"}`);
    hud.atp.textContent = `⚡ ${jogo.atp}`;
  }

  function toast(texto, x, y) {
    const el = document.createElement("span");
    el.className = "aventura__toast";
    el.textContent = texto;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    $("[data-camada]").appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  function explodir(x, y, cor, quantidade = 14) {
    if (reduzido) return;
    for (let i = 0; i < quantidade; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 160;
      jogo.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, cor });
    }
  }

  // --- Física -----------------------------------------------------------------------
  const tileEm = (px, py) => jogo.nivel.mapa[Math.floor(py / TILE)]?.[Math.floor(px / TILE)];

  // Círculo encosta em algum tile de bloqueio? (4px de folga para ser justo)
  function tocaBloqueio(cx, cy) {
    const r = RAIO_JOGADOR - 4;
    for (let ty = Math.floor((cy - r) / TILE); ty <= Math.floor((cy + r) / TILE); ty++)
      for (let tx = Math.floor((cx - r) / TILE); tx <= Math.floor((cx + r) / TILE); tx++) {
        if (jogo.nivel.mapa[ty]?.[tx] !== 1) continue;
        const px = Math.max(tx * TILE + 2, Math.min(cx, tx * TILE + TILE - 2));
        const py = Math.max(ty * TILE + 2, Math.min(cy, ty * TILE + TILE - 2));
        if ((cx - px) ** 2 + (cy - py) ** 2 < r * r) return true;
      }
    return false;
  }

  function usarTurbo() {
    if (jogo.status !== "jogando" || jogo.turbo > 0) return;
    if (jogo.atp <= 0) {
      toast("Sem ATP para o turbo", largura / 2, altura / 2 - 60);
      return;
    }
    jogo.atp--;
    jogo.turbo = DURACAO_TURBO;
    atualizarHud();
  }

  function atualizar(dt) {
    const n = jogo.nivel;
    const j = jogo.jogador;
    jogo.tempo += dt * 1000;
    hud.tempo.textContent = `⏱ ${formatarTempo(jogo.tempo)}`;
    if (jogo.invulneravel > 0) jogo.invulneravel -= dt;
    if (jogo.turbo > 0) jogo.turbo -= dt;

    let vx = (teclas.direita ? 1 : 0) - (teclas.esquerda ? 1 : 0) + joystick.x;
    let vy = (teclas.baixo ? 1 : 0) - (teclas.cima ? 1 : 0) + joystick.y;
    const intensidade = Math.hypot(vx, vy);
    if (intensidade > 1) {
      vx /= intensidade;
      vy /= intensidade;
    }
    let velocidade = VELOCIDADE;
    if (tileEm(j.x, j.y) === 2) velocidade *= FATOR_CORRENTE;
    if (jogo.turbo > 0) velocidade *= FATOR_TURBO;

    j.x = Math.max(RAIO_JOGADOR, Math.min(n.largura - RAIO_JOGADOR, j.x + vx * velocidade * dt));
    j.y = Math.max(RAIO_JOGADOR, Math.min(n.altura - RAIO_JOGADOR, j.y + vy * velocidade * dt));

    if (tocaBloqueio(j.x, j.y)) levouGolpe();
    else {
      j.seguroX = j.x;
      j.seguroY = j.y;
    }

    // Anticorpos patrulhando
    n.anticorpos.forEach((a) => {
      const alvo = a.dir === 1 ? a.ate : a.de;
      const dx = alvo.x - a.x;
      const dy = alvo.y - a.y;
      const d = Math.hypot(dx, dy);
      const passo = a.vel * dt;
      if (d <= passo) {
        a.x = alvo.x;
        a.y = alvo.y;
        a.dir *= -1;
      } else {
        a.x += (dx / d) * passo;
        a.y += (dy / d) * passo;
      }
      if (Math.hypot(a.x - j.x, a.y - j.y) < RAIO_ANTICORPO + RAIO_JOGADOR - 4) levouGolpe();
    });
    if (jogo.status !== "jogando") return;

    // ATP coletável
    n.atps.forEach((a) => {
      if (a.pego || Math.hypot(a.x - j.x, a.y - j.y) > RAIO_JOGADOR + 14) return;
      a.pego = true;
      jogo.atp++;
      desbloquear("primeiro-atp");
      explodir(a.x, a.y, "#ffb547");
      toast("+1 ATP ⚡", a.x - jogo.camera.x + largura / 2, a.y - jogo.camera.y + altura / 2 - 40);
      atualizarHud();
    });

    // Rastro violeta
    const ultimo = jogo.rastro[jogo.rastro.length - 1];
    if (!ultimo || Math.hypot(ultimo.x - j.x, ultimo.y - j.y) > 40) {
      jogo.rastro.push({ x: j.x, y: j.y });
      if (jogo.rastro.length > 14) jogo.rastro.shift();
    }

    // Câmera segue a glicose (lerp). Pode passar um pouco da borda do mapa
    // para o início e a célula não ficarem escondidos atrás do HUD/minimapa.
    const alvoX = limitarCamera(j.x, n.largura, largura, MARGEM_CAMERA_X);
    const alvoY = limitarCamera(j.y, n.altura, altura, MARGEM_CAMERA_Y);
    const suave = Math.min(1, dt * 6);
    jogo.camera.x += (alvoX - jogo.camera.x) * suave;
    jogo.camera.y += (alvoY - jogo.camera.y) * suave;

    if (Math.hypot(n.destino.x - j.x, n.destino.y - j.y) < 60) chegouNaCelula();
  }

  function atualizarParticulas(dt) {
    jogo.particulas = jogo.particulas.filter((p) => {
      p.vida -= dt * 1.6;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      return p.vida > 0;
    });
    if (jogo.tremor > 0) jogo.tremor = Math.max(0, jogo.tremor - dt * 30);
  }

  // --- Desenho ---------------------------------------------------------------------
  function retanguloArredondado(x, y, l, a, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, l, a, r);
  }

  function desenhar(t) {
    const n = jogo.nivel;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, largura, altura);
    const tx = (Math.random() - 0.5) * jogo.tremor;
    const ty = (Math.random() - 0.5) * jogo.tremor;
    const ox = Math.round(largura / 2 - jogo.camera.x + tx);
    const oy = Math.round(altura / 2 - jogo.camera.y + ty);
    ctx.translate(ox, oy);

    // Tiles visíveis
    const x0 = Math.max(0, Math.floor(-ox / TILE));
    const y0 = Math.max(0, Math.floor(-oy / TILE));
    const x1 = Math.min(n.colunas - 1, Math.ceil((largura - ox) / TILE));
    const y1 = Math.min(n.linhas - 1, Math.ceil((altura - oy) / TILE));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const tipo = n.mapa[y][x];
        const px = x * TILE + 2;
        const py = y * TILE + 2;
        retanguloArredondado(px, py, 60, 60, 12);
        if (tipo === 1) {
          const g = ctx.createLinearGradient(px, py, px + 60, py + 60);
          g.addColorStop(0, "rgba(255, 92, 122, 0.35)");
          g.addColorStop(1, "rgba(107, 15, 34, 0.5)");
          ctx.fillStyle = g;
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 92, 122, 0.6)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (tipo === 2) {
          ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
          ctx.fill();
          ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
          ctx.lineWidth = 1;
          ctx.stroke();
          // Setinhas da corrente se movendo
          const d = reduzido ? 0 : ((t / 25) % 20) - 10;
          ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 22 + d, py + 22);
          ctx.lineTo(px + 32 + d, py + 30);
          ctx.lineTo(px + 22 + d, py + 38);
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
          ctx.fill();
        }
      }

    // Célula de destino (220px) + rótulo
    const pulso = reduzido ? 1 : 1 + Math.sin(t / 400) * 0.03;
    const tam = 220 * pulso;
    if (SPRITES.celula.complete) ctx.drawImage(SPRITES.celula, n.destino.x - tam / 2, n.destino.y - tam / 2, tam, tam);
    ctx.fillStyle = "#2ef2c4";
    ctx.font = "700 13px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CÉLULA", n.destino.x, n.destino.y - 2);
    ctx.fillText("DESTINO", n.destino.x, n.destino.y + 15);

    // Rastro
    jogo.rastro.forEach((r, i) => {
      ctx.globalAlpha = (i + 1) / jogo.rastro.length;
      if (SPRITES.rastro.complete) ctx.drawImage(SPRITES.rastro, r.x - 5, r.y - 5, 10, 10);
    });
    ctx.globalAlpha = 1;

    // ATP coletáveis (62px com brilho, flutuando)
    n.atps.forEach((a) => {
      if (a.pego) return;
      const b = reduzido ? 0 : Math.sin(t / 300 + a.fase) * 3;
      if (SPRITES.atp.complete) ctx.drawImage(SPRITES.atp, a.x - 31, a.y - 31 + b, 62, 62);
    });

    // Anticorpos (Y vermelho com brilho)
    n.anticorpos.forEach((a) => {
      const g = ctx.createRadialGradient(a.x, a.y, 2, a.x, a.y, RAIO_ANTICORPO + 10);
      g.addColorStop(0, "rgba(255, 92, 122, 0.9)");
      g.addColorStop(0.55, "rgba(255, 92, 122, 0.35)");
      g.addColorStop(1, "rgba(255, 92, 122, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(a.x, a.y, RAIO_ANTICORPO + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(reduzido ? 0 : t / 700);
      ctx.strokeStyle = "#ffe4ea";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(0, 0);
      ctx.lineTo(-8, -9);
      ctx.moveTo(0, 0);
      ctx.lineTo(8, -9);
      ctx.stroke();
      ctx.restore();
    });

    // Partículas
    jogo.particulas.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.vida);
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Jogador (pisca quando invulnerável; brilho extra no turbo)
    const j = jogo.jogador;
    if (!(jogo.invulneravel > 0 && Math.floor(t / 90) % 2 === 0)) {
      if (jogo.turbo > 0) {
        ctx.fillStyle = "rgba(255, 181, 71, 0.25)";
        ctx.beginPath();
        ctx.arc(j.x, j.y, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      if (SPRITES.jogador.complete) ctx.drawImage(SPRITES.jogador, j.x - 59, j.y - 59, 118, 118);
    }

    desenharMinimapa();
  }

  function desenharMinimapa() {
    const n = jogo.nivel;
    const escala = Math.min(200 / n.largura, 124 / n.altura);
    const mx = (200 - n.largura * escala) / 2;
    const my = (124 - n.altura * escala) / 2;
    mini.clearRect(0, 0, 200, 124);
    mini.fillStyle = "rgba(255, 255, 255, 0.04)";
    mini.fillRect(mx, my, n.largura * escala, n.altura * escala);
    for (let y = 0; y < n.linhas; y++)
      for (let x = 0; x < n.colunas; x++) {
        const tipo = n.mapa[y][x];
        if (!tipo) continue;
        mini.fillStyle = tipo === 1 ? "rgba(255, 92, 122, 0.55)" : "rgba(56, 189, 248, 0.35)";
        mini.fillRect(mx + x * TILE * escala, my + y * TILE * escala, TILE * escala - 0.5, TILE * escala - 0.5);
      }
    // Área visível
    mini.strokeStyle = "rgba(234, 242, 255, 0.35)";
    mini.strokeRect(
      mx + (jogo.camera.x - largura / 2) * escala,
      my + (jogo.camera.y - altura / 2) * escala,
      largura * escala,
      altura * escala
    );
    mini.fillStyle = "#2ef2c4";
    mini.beginPath();
    mini.arc(mx + n.destino.x * escala, my + n.destino.y * escala, 5, 0, Math.PI * 2);
    mini.fill();
    mini.fillStyle = "#eaf2ff";
    mini.beginPath();
    mini.arc(mx + jogo.jogador.x * escala, my + jogo.jogador.y * escala, 3.5, 0, Math.PI * 2);
    mini.fill();
  }

  // --- Loop ---------------------------------------------------------------------------
  let rodando = true;
  let ultimo = null;
  function quadro(agora) {
    if (!rodando) return;
    if (ultimo === null) ultimo = agora;
    const dt = Math.min((agora - ultimo) / 1000, 0.05);
    ultimo = agora;
    if (jogo.status === "jogando") atualizar(dt);
    atualizarParticulas(dt);
    desenhar(agora);
    requestAnimationFrame(quadro);
  }

  // --- Controles: teclado -------------------------------------------------------------
  const MAPA_TECLAS = {
    ArrowUp: "cima",
    w: "cima",
    W: "cima",
    ArrowDown: "baixo",
    s: "baixo",
    S: "baixo",
    ArrowLeft: "esquerda",
    a: "esquerda",
    A: "esquerda",
    ArrowRight: "direita",
    d: "direita",
    D: "direita",
  };
  const aoApertar = (e) => {
    if (MAPA_TECLAS[e.key]) {
      teclas[MAPA_TECLAS[e.key]] = true;
      e.preventDefault();
    } else if (e.key === " " && jogo.status === "jogando") {
      usarTurbo();
      e.preventDefault();
    } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      if (jogo.status === "jogando") pausar();
      else if (jogo.status === "pausado") continuar();
    }
  };
  const aoSoltar = (e) => {
    if (MAPA_TECLAS[e.key]) teclas[MAPA_TECLAS[e.key]] = false;
  };
  window.addEventListener("keydown", aoApertar);
  window.addEventListener("keyup", aoSoltar);

  // Pausa automática se a aba ficar escondida.
  const aoMudarAba = () => {
    ultimo = null;
    if (document.hidden) pausar();
  };
  document.addEventListener("visibilitychange", aoMudarAba);

  $("[data-pausa]").addEventListener("click", () => (jogo.status === "pausado" ? continuar() : pausar()));
  $("[data-turbo]").addEventListener("click", usarTurbo);

  // --- Controles: joystick virtual (celular) -----------------------------------------
  const base = $("[data-joystick]");
  const manche = $("[data-manche]");
  let ponteiro = null;
  const moverJoystick = (e) => {
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 12;
    const d = Math.hypot(dx, dy);
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    manche.style.transform = `translate(${dx}px, ${dy}px)`;
    joystick.x = dx / max;
    joystick.y = dy / max;
  };
  const soltarJoystick = () => {
    ponteiro = null;
    joystick.x = joystick.y = 0;
    manche.style.transform = "";
  };
  base.addEventListener("pointerdown", (e) => {
    ponteiro = e.pointerId;
    base.setPointerCapture(e.pointerId);
    moverJoystick(e);
  });
  base.addEventListener("pointermove", (e) => e.pointerId === ponteiro && moverJoystick(e));
  base.addEventListener("pointerup", soltarJoystick);
  base.addEventListener("pointercancel", soltarJoystick);
  if (toque) tela.classList.add("aventura--toque");

  telaInicial();
  requestAnimationFrame(quadro);

  return {
    destruir() {
      rodando = false;
      observador.disconnect();
      window.removeEventListener("keydown", aoApertar);
      window.removeEventListener("keyup", aoSoltar);
      document.removeEventListener("visibilitychange", aoMudarAba);
      raiz.innerHTML = "";
    },
  };
}
