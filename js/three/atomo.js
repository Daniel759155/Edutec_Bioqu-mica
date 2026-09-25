// Componente "3D / Átomo orbital" (Figma 303:262) em versão leve (SVG, sem WebGL):
// três órbitas elípticas (0°, +60°, −60°), elétrons percorrendo cada órbita
// e o núcleo pulsando em amber. Usado no loader, no hero do Início, no hero
// do Quiz e no CTA da Home.
// Uso: <div class="atomo" data-atomo></div>  (o JS preenche o SVG)

const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Elipse de raio 124 × 41 centrada em (140, 140), igual ao Figma.
const CAMINHO_ORBITA = "M264 140A124 41 0 1 1 16 140A124 41 0 1 1 264 140Z";

const ORBITAS = [
  { giro: 0, cor: "#2EF2C4", claro: "#D8FFF4", escuro: "#06594A", duracao: 3.2 },
  { giro: -60, cor: "#38BDF8", claro: "#E0F6FF", escuro: "#0B4A6B", duracao: 4.4 },
  { giro: 60, cor: "#8B5CF6", claro: "#EDE4FF", escuro: "#2E1766", duracao: 5.6 },
];

let contador = 0;

export function criarAtomoSVG() {
  const id = `atomo-${++contador}`;

  const gradientes = ORBITAS.map(
    (o, i) => `
      <radialGradient id="${id}-e${i}" cx="0.35" cy="0.35" r="0.65">
        <stop offset="0" stop-color="${o.claro}"/><stop offset="0.45" stop-color="${o.cor}"/><stop offset="1" stop-color="${o.escuro}"/>
      </radialGradient>`
  ).join("");

  const orbitas = ORBITAS.map((o, i) => {
    // Cada elétron começa num ponto diferente da órbita.
    const movimento = movimentoReduzido
      ? ""
      : `<animateMotion dur="${o.duracao}s" repeatCount="indefinite" begin="-${i * 1.1}s" path="${CAMINHO_ORBITA}"/>`;
    const posicaoInicial = movimentoReduzido ? `cx="264" cy="140"` : `cx="0" cy="0"`;
    return `
      <g transform="rotate(${o.giro} 140 140)">
        <path d="${CAMINHO_ORBITA}" fill="none" stroke="${o.cor}" stroke-opacity="0.55" stroke-width="1.2"/>
        <circle r="7" ${posicaoInicial} fill="url(#${id}-e${i})" filter="url(#${id}-brilho)">${movimento}</circle>
      </g>`;
  }).join("");

  return `
    <svg viewBox="0 0 280 280" role="img" aria-label="Átomo com elétrons em órbita" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${gradientes}
        <radialGradient id="${id}-nucleo" cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stop-color="#FFF1D6"/><stop offset="0.45" stop-color="#FFB547"/><stop offset="1" stop-color="#7A4A00"/>
        </radialGradient>
        <filter id="${id}-brilho" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="${id}-halo" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="14"/>
        </filter>
      </defs>
      <circle cx="140" cy="140" r="30" fill="#FFB547" opacity="0.45" filter="url(#${id}-halo)"/>
      <g class="atomo__orbitas">${orbitas}</g>
      <circle class="atomo__nucleo" cx="140" cy="140" r="26" fill="url(#${id}-nucleo)"/>
    </svg>`;
}

// Preenche todos os [data-atomo] da página.
export function montarAtomos(raiz = document) {
  raiz.querySelectorAll("[data-atomo]:not([data-atomo-pronto])").forEach((el) => {
    el.innerHTML = criarAtomoSVG();
    el.dataset.atomoPronto = "";
  });
}
