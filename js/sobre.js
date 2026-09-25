// Interações da página "O que é Bioquímica" (Figma: 03 · O que é Bioquímica):
// Venn que se fecha com o scroll, foto com leve parallax e timeline que se
// "desenha" conforme a rolagem.

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

vennAnimado();
linhaDoTempo();

// --- Venn: os círculos começam separados e se aproximam com o scroll ---------
function vennAnimado() {
  const bloco = document.querySelector("[data-venn]");
  if (!bloco || reduzido || !gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const linha = gsap.timeline({
    scrollTrigger: { trigger: bloco, start: "top 85%", end: "center 45%", scrub: 0.6 },
  });
  linha
    .from(bloco.querySelector("[data-venn-esq]"), { x: -46, ease: "none" }, 0)
    .from(bloco.querySelector("[data-venn-dir]"), { x: 46, ease: "none" }, 0)
    .from(bloco.querySelector("[data-venn-centro]"), { opacity: 0, scale: 0.6, ease: "none" }, 0.5);

  // Foto com leve parallax dentro da moldura.
  const foto = bloco.querySelector("[data-parallax-local]");
  if (foto) {
    gsap.fromTo(
      foto,
      { yPercent: -8 },
      { yPercent: 0, ease: "none", scrollTrigger: { trigger: bloco, start: "top bottom", end: "bottom top", scrub: true } }
    );
  }
}

// --- Timeline: a linha se desenha com o scroll; cada marco acende ao ser alcançado ---
function linhaDoTempo() {
  const lista = document.querySelector("[data-linha-tempo]");
  if (!lista) return;
  const marcos = [...lista.querySelectorAll(".marco")];

  // Sem animação: linha cheia e todos os marcos acesos.
  if (reduzido) {
    lista.style.setProperty("--progresso", 1);
    marcos.forEach((m) => m.classList.add("aceso"));
    return;
  }

  let agendado = false;
  const atualizar = () => {
    agendado = false;
    const caixa = lista.getBoundingClientRect();
    const alvo = window.innerHeight * 0.75; // a linha "chega" nesta altura da tela
    let progresso;

    if (window.matchMedia("(min-width: 1000px)").matches) {
      // Horizontal: progride enquanto a timeline atravessa a tela.
      const inicio = window.innerHeight * 0.95;
      const fim = window.innerHeight * 0.55;
      progresso = (inicio - caixa.top) / (inicio - fim);
    } else {
      progresso = (alvo - caixa.top) / caixa.height;
    }
    progresso = Math.min(1, Math.max(0, progresso));
    lista.style.setProperty("--progresso", progresso.toFixed(4));

    // Um marco acende quando a linha passa pelo seu ponto.
    marcos.forEach((marco) => {
      const ponto = marco.querySelector(".marco__ponto").getBoundingClientRect();
      const posicao = window.matchMedia("(min-width: 1000px)").matches
        ? (ponto.left + ponto.width / 2 - caixa.left) / caixa.width
        : (ponto.top + ponto.height / 2 - caixa.top) / caixa.height;
      marco.classList.toggle("aceso", progresso >= posicao - 0.001);
    });
  };

  const agendar = () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(atualizar);
  };
  window.addEventListener("scroll", agendar, { passive: true });
  window.addEventListener("resize", agendar);
  atualizar();
}
