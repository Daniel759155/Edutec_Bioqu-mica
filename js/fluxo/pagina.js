// Página do Fluxo (biolab.html — Figma: 06 · Jogos — Fluxo).
// Partículas de "sangue" no hero, recordes nos cards de modo, grade de
// conquistas e a abertura dos jogos em tela cheia (com transição de zoom
// saindo da esfera do card). Os jogos também abrem por link: #jornada / #aventura.

import { CONQUISTAS, conquistadas, novasNaoVistas, marcarVistas } from "./conquistas.js";
import { montarJornada, melhorJornada } from "./jornada.js";
import { montarAventura, recordeAventura, formatarTempo } from "./aventura.js";

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

particulasDeSangue();
mostrarRecordes();
gradeDeConquistas();
avisosDeConquista();
roteadorDeJogos();

// --- Hero: pontinhos de sangue fluindo da esquerda para a direita (canvas 2D) ---
function particulasDeSangue() {
  const canvas = document.querySelector("[data-sangue]");
  if (!canvas || reduzido) return;
  const ctx = canvas.getContext("2d");
  let largura = 0;
  let altura = 0;
  let visivel = true;
  const pontos = Array.from({ length: 70 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 2.6,
    v: 0.02 + Math.random() * 0.05,
    fase: Math.random() * 6,
    cor: Math.random() < 0.75 ? "255, 92, 122" : "46, 242, 196",
  }));

  const ajustar = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    largura = canvas.clientWidth;
    altura = canvas.clientHeight;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(ajustar).observe(canvas);
  new IntersectionObserver(([e]) => (visivel = e.isIntersecting)).observe(canvas);

  let ultimo = performance.now();
  const quadro = (agora) => {
    const dt = Math.min((agora - ultimo) / 1000, 0.05);
    ultimo = agora;
    if (visivel && !document.hidden) {
      ctx.clearRect(0, 0, largura, altura);
      pontos.forEach((p) => {
        p.x += p.v * dt;
        if (p.x > 1.02) p.x = -0.02;
        const y = p.y * altura + Math.sin(agora / 900 + p.fase) * 6;
        ctx.fillStyle = `rgba(${p.cor}, ${0.18 + p.r / 12})`;
        ctx.beginPath();
        ctx.arc(p.x * largura, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
}

// --- Recordes salvos no navegador ------------------------------------------------
function mostrarRecordes() {
  const melhor = melhorJornada();
  const recorde = recordeAventura();
  const jornada = document.querySelector("[data-melhor-jornada]");
  const aventura = document.querySelector("[data-recorde-aventura]");
  if (jornada) jornada.textContent = `Melhor: ${melhor ? `${melhor} ATP` : "—"}`;
  if (aventura) aventura.textContent = `Recorde: ${recorde ? formatarTempo(recorde) : "—"}`;
}

// --- Conquistas: medalhas desbloqueadas acendem; as novas fazem "pop" ------------
function gradeDeConquistas() {
  const grade = document.querySelector("[data-conquistas]");
  if (!grade) return;
  const feitas = conquistadas();
  const novas = new Set(novasNaoVistas());

  grade.innerHTML = CONQUISTAS.map((c) => {
    const ok = Boolean(feitas[c.id]);
    return `
      <li class="medalha ${ok ? "medalha--ok" : ""} ${novas.has(c.id) ? "medalha--nova" : ""}" title="${c.dica}">
        <span class="medalha__icone" aria-hidden="true">${c.icone}</span>
        <span class="medalha__nome">${c.nome}</span>
        <span class="sr-only">${ok ? "desbloqueada" : `bloqueada — ${c.dica}`}</span>
      </li>`;
  }).join("");

  const total = Object.keys(feitas).length;
  const resumo = document.querySelector("[data-conquistas-resumo]");
  if (resumo) resumo.textContent = `${total} de ${CONQUISTAS.length} desbloqueadas`;

  // As novas só "estouram" quando a grade aparece na tela.
  if (novas.size) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      grade.classList.add("animar");
      marcarVistas();
    });
    io.observe(grade);
  }
}

// Durante o jogo, uma conquista nova aparece num aviso no canto da tela.
function avisosDeConquista() {
  window.addEventListener("fluxo:conquista", (e) => {
    const c = e.detail;
    const aviso = document.createElement("div");
    aviso.className = "aviso-conquista";
    aviso.setAttribute("role", "status");
    aviso.innerHTML = `<span class="aviso-conquista__icone" aria-hidden="true">${c.icone}</span><span><small>CONQUISTA DESBLOQUEADA</small><strong>${c.nome}</strong></span>`;
    (document.querySelector("[data-jogo]:not([hidden])") || document.body).appendChild(aviso);
    setTimeout(() => aviso.classList.add("saindo"), 3200);
    setTimeout(() => aviso.remove(), 3700);
  });
}

// --- Abrir / fechar os jogos ----------------------------------------------------
function roteadorDeJogos() {
  const camada = document.querySelector("[data-jogo]");
  if (!camada) return;
  const palco = camada.querySelector("[data-jogo-palco]");
  let jogoAtual = null;
  let modoAtual = null;
  let origemFoco = null;

  const MONTADORES = { jornada: montarJornada, aventura: montarAventura };

  function abrir(modo, origem) {
    if (!MONTADORES[modo] || modoAtual === modo) return;
    if (jogoAtual) jogoAtual.destruir();
    origemFoco = document.activeElement;
    modoAtual = modo;

    // Transição de zoom: o círculo cresce a partir da esfera do card clicado.
    const r = origem?.getBoundingClientRect();
    camada.style.setProperty("--zoom-x", r ? `${r.left + r.width / 2}px` : "50%");
    camada.style.setProperty("--zoom-y", r ? `${r.top + r.height / 2}px` : "50%");
    camada.hidden = false;
    camada.dataset.modo = modo;
    document.documentElement.classList.add("jogo-aberto");
    camada.classList.remove("abrindo");
    void camada.offsetWidth;
    camada.classList.add("abrindo");

    jogoAtual = MONTADORES[modo](palco, { aoSair: fechar });
    if (location.hash !== `#${modo}`) history.pushState(null, "", `#${modo}`);
  }

  function fechar() {
    if (!modoAtual) return;
    jogoAtual?.destruir();
    jogoAtual = null;
    modoAtual = null;
    camada.hidden = true;
    document.documentElement.classList.remove("jogo-aberto");
    if (location.hash) history.pushState(null, "", location.pathname + location.search);
    mostrarRecordes();
    gradeDeConquistas();
    origemFoco?.focus?.({ preventScroll: true });
  }

  // Botões dos cards (e qualquer [data-abrir-jogo] na página)
  document.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-abrir-jogo]");
    if (!botao) return;
    e.preventDefault();
    const card = botao.closest(".modo");
    abrir(botao.dataset.abrirJogo, card?.querySelector("[data-zoom-origem]") || botao);
  });

  // Links diretos (#jornada / #aventura), inclusive vindos do menu "Jogos".
  const pelaUrl = () => {
    const modo = location.hash.slice(1);
    if (MONTADORES[modo]) abrir(modo, document.querySelector(`[data-abrir-jogo="${modo}"]`));
    else fechar();
  };
  window.addEventListener("hashchange", pelaUrl);
  window.addEventListener("popstate", pelaUrl);
  pelaUrl();
}
