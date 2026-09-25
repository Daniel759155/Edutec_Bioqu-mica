// Animações globais do site (Figma: ★ Guia de implementação → "Animações globais").
// GSAP, ScrollTrigger e vanilla-tilt vêm por <script> da CDN e ficam em window.
// Tudo respeita prefers-reduced-motion.

import { criarAtomoSVG } from "./three/atomo.js";

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const temMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const gsap = window.gsap;

// --- Loader inicial: átomo girando por até 1s (só na primeira página da visita) ---
export function loaderInicial() {
  let jaViu = false;
  try {
    jaViu = sessionStorage.getItem("loader-visto") === "1";
    sessionStorage.setItem("loader-visto", "1");
  } catch {
    /* sessionStorage bloqueado: mostra o loader mesmo assim */
  }
  if (jaViu || reduzido) return;

  const loader = document.createElement("div");
  loader.className = "loader";
  loader.setAttribute("aria-hidden", "true");
  loader.innerHTML = `<div class="atomo">${criarAtomoSVG()}</div>`;
  document.body.appendChild(loader);

  const tirar = () => {
    loader.classList.add("saiu");
    setTimeout(() => loader.remove(), 400);
  };
  const limite = setTimeout(tirar, 1000);
  window.addEventListener("load", () => {
    clearTimeout(limite);
    setTimeout(tirar, 250); // deixa o átomo aparecer ao menos um instante
  });
}

// --- Seções entram com fade-up (y 40 → 0, stagger) ---------------------------
// [data-reveal] anima sozinho; filhos de [data-reveal-grupo] entram em cascata.
export function fadeUp() {
  const alvos = document.querySelectorAll("[data-reveal]");
  if (!alvos.length) return;
  if (reduzido) return;

  if (gsap && window.ScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.batch(alvos, {
      start: "top 88%",
      once: true,
      onEnter: (lote) =>
        gsap.to(lote, { opacity: 1, translate: "0px 0px", duration: 0.8, ease: "power3.out", stagger: 0.1, overwrite: true }),
    });
    return;
  }

  // Sem GSAP (CDN fora do ar): IntersectionObserver com transição CSS.
  const io = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.style.transition = "opacity .8s ease, translate .8s cubic-bezier(.22,1,.36,1)";
        e.target.style.opacity = "1";
        e.target.style.translate = "none";
        io.unobserve(e.target);
      }),
    { rootMargin: "0px 0px -12% 0px" }
  );
  alvos.forEach((el) => io.observe(el));
}

// --- Botão primário magnético (segue o cursor alguns pixels) ------------------
export function botoesMagneticos() {
  if (reduzido || !temMouse) return;
  document.querySelectorAll(".btn--primary").forEach((botao) => {
    const forca = 0.25;
    botao.addEventListener("pointermove", (e) => {
      const r = botao.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * forca;
      const y = (e.clientY - r.top - r.height / 2) * forca;
      botao.style.transform = `translate(${x}px, ${y}px)`;
    });
    botao.addEventListener("pointerleave", () => (botao.style.transform = ""));
  });
}

// --- Cards de vidro: tilt 3D (máx. 8°) + brilho seguindo o mouse --------------
export function cardsComTilt(raiz = document) {
  const cards = raiz.querySelectorAll(".card-glass:not([data-sem-tilt]), [data-tilt]");
  if (!cards.length) return;

  // Brilho radial: atualiza --x/--y usados no ::before do card.
  cards.forEach((card) =>
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", `${e.clientX - r.left}px`);
      card.style.setProperty("--y", `${e.clientY - r.top}px`);
    })
  );

  if (reduzido || !temMouse || !window.VanillaTilt) return;
  window.VanillaTilt.init([...cards], {
    max: 8,
    speed: 600,
    perspective: 1000,
    glare: true,
    "max-glare": 0.12,
    gyroscope: false,
  });
}

// --- Cursor com brilho teal que segue o mouse (só desktop) --------------------
export function cursorComBrilho() {
  if (reduzido || !temMouse) return;
  const brilho = document.createElement("div");
  brilho.className = "cursor-glow";
  brilho.setAttribute("aria-hidden", "true");
  document.body.appendChild(brilho);

  let x = 0;
  let y = 0;
  let atualX = 0;
  let atualY = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      x = e.clientX;
      y = e.clientY;
      brilho.classList.add("ativo");
    },
    { passive: true }
  );
  document.addEventListener("pointerleave", () => brilho.classList.remove("ativo"));
  const seguir = () => {
    atualX += (x - atualX) * 0.18;
    atualY += (y - atualY) * 0.18;
    brilho.style.transform = `translate3d(${atualX}px, ${atualY}px, 0)`;
    requestAnimationFrame(seguir);
  };
  seguir();
}

// --- Transição entre páginas: fade + blur 200ms --------------------------------
export function transicaoEntrePaginas() {
  if (reduzido) return;
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return; // links externos, mailto:, tel:
    if (url.pathname === location.pathname && url.hash) return; // âncora na mesma página
    e.preventDefault();
    document.body.classList.add("saindo");
    setTimeout(() => (window.location.href = url.href), 200);
  });
  // Voltar pelo histórico (bfcache) traz a página ainda "saindo": limpa.
  window.addEventListener("pageshow", () => document.body.classList.remove("saindo"));
}

// --- Footer: palavra gigante com parallax leve ao chegar no fim ---------------
export function parallaxFooter() {
  const palavra = document.querySelector(".footer__palavra");
  if (!palavra || reduzido || !gsap || !window.ScrollTrigger) return;
  gsap.fromTo(
    palavra,
    { yPercent: 35 },
    {
      yPercent: 0,
      ease: "none",
      scrollTrigger: { trigger: palavra.closest(".footer"), start: "top bottom", end: "bottom bottom", scrub: true },
    }
  );
}

// --- Easter egg: Konami code faz chover moléculas 🧬 ---------------------------
export function konami() {
  const codigo = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let posicao = 0;
  document.addEventListener("keydown", (e) => {
    const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    posicao = tecla === codigo[posicao] ? posicao + 1 : tecla === codigo[0] ? 1 : 0;
    if (posicao === codigo.length) {
      posicao = 0;
      chuvaDeMoleculas();
    }
  });
}

function chuvaDeMoleculas() {
  const simbolos = ["🧬", "⚛️", "🧪", "💧", "⚗️"];
  const camada = document.createElement("div");
  camada.setAttribute("aria-hidden", "true");
  camada.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:900;overflow:hidden";
  document.body.appendChild(camada);

  for (let i = 0; i < 60; i++) {
    const gota = document.createElement("span");
    gota.textContent = simbolos[i % simbolos.length];
    const duracao = 2.2 + Math.random() * 2.2;
    gota.style.cssText = `position:absolute;top:-60px;left:${Math.random() * 100}%;font-size:${18 + Math.random() * 26}px;`;
    gota.animate(
      [
        { transform: "translateY(0) rotate(0deg)", opacity: 1 },
        { transform: `translateY(${window.innerHeight + 120}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0.8 },
      ],
      { duration: duracao * 1000, delay: Math.random() * 1500, easing: "cubic-bezier(.4,0,.8,1)", fill: "both" }
    );
    camada.appendChild(gota);
  }
  setTimeout(() => camada.remove(), 6500);
}

// --- Título que entra letra por letra (stagger 0.03s) --------------------------
// <h1 data-letras>Bioquímica</h1> → cada letra vira um <span> animado.
export function letraPorLetra() {
  document.querySelectorAll("[data-letras]").forEach((el) => {
    const texto = el.textContent;
    el.setAttribute("aria-label", texto);
    el.innerHTML = [...texto]
      .map((letra) => `<span class="letra" aria-hidden="true">${letra === " " ? "&nbsp;" : letra}</span>`)
      .join("");
    if (reduzido || !gsap) return;
    gsap.from(el.querySelectorAll(".letra"), {
      opacity: 0,
      yPercent: 60,
      rotateX: -70,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.03,
      delay: 0.15,
    });
  });
}

// --- Contadores que sobem de 0 ao aparecer na tela ----------------------------
// <strong data-contar="3" data-sufixo=" bi">3 bi</strong>
export function contadores() {
  const alvos = document.querySelectorAll("[data-contar]");
  if (!alvos.length || reduzido) return;
  const io = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const final = Number(el.dataset.contar);
        const sufixo = el.dataset.sufixo || "";
        const duracao = 1400;
        const inicio = performance.now();
        const passo = (agora) => {
          const t = Math.min(1, (agora - inicio) / duracao);
          const suave = 1 - Math.pow(1 - t, 3);
          el.textContent = `${Math.round(final * suave).toLocaleString("pt-BR")}${sufixo}`;
          if (t < 1) requestAnimationFrame(passo);
        };
        requestAnimationFrame(passo);
      }),
    { threshold: 0.6 }
  );
  alvos.forEach((el) => io.observe(el));
}

// --- Parallax simples: [data-parallax="0.3"] anda 0.3× a rolagem --------------
export function parallax() {
  const alvos = [...document.querySelectorAll("[data-parallax]")];
  if (!alvos.length || reduzido) return;
  let agendado = false;
  const aplicar = () => {
    agendado = false;
    const y = window.scrollY;
    alvos.forEach((el) => (el.style.translate = `0 ${y * Number(el.dataset.parallax)}px`));
  };
  window.addEventListener(
    "scroll",
    () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(aplicar);
    },
    { passive: true }
  );
}

// Liga tudo de uma vez (chamado pelo main.js).
export function iniciarAnimacoes() {
  if (!reduzido) document.documentElement.classList.add("js-anima");
  letraPorLetra();
  fadeUp();
  contadores();
  parallax();
  botoesMagneticos();
  cardsComTilt();
  cursorComBrilho();
  transicaoEntrePaginas();
  parallaxFooter();
  konami();
}
