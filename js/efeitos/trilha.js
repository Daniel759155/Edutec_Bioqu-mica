// Mini-animação em canvas 2D: uma esfera brilhante (a "glicose") percorre
// uma trilha de pontos em loop, e cada ponto acende quando ela passa.
// Usada nos cards de jogo (Home › "Escolha seu caminho" e página Fluxo).
// Uso: <canvas data-trilha="teal"></canvas>  (ou data-trilha="violeta")

const CORES = {
  teal: { ponto: "46, 242, 196", claro: "#D8FFF4", escuro: "#0B6B58" },
  violeta: { ponto: "139, 92, 246", claro: "#EDE4FF", escuro: "#3B1F8A" },
};

// Pontos da trilha no Figma (quadro de 506 × 220), usados como proporção.
const PONTOS = [
  [39, 109],
  [95, 148],
  [151, 158],
  [207, 130],
  [263, 87],
  [319, 60],
  [375, 70],
  [431, 110],
  [487, 149],
];
const LARGURA_BASE = 506;
const ALTURA_BASE = 220;
const DURACAO_VOLTA = 6; // segundos para percorrer a trilha

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Catmull-Rom: curva suave passando por todos os pontos.
function pontoNaCurva(pts, t) {
  const n = pts.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  const u = t * n - i;
  const p0 = pts[Math.max(i - 1, 0)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(i + 2, n)];
  const c = (a, b, c2, d) =>
    0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}

export function montarTrilha(canvas) {
  const cor = CORES[canvas.dataset.trilha] || CORES.teal;
  const ctx = canvas.getContext("2d");
  let largura = 0;
  let altura = 0;
  let pontos = [];
  let t = 0.45; // começa no meio, como no Figma
  let ultimo = performance.now();
  let visivel = false;

  const ajustar = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    largura = canvas.clientWidth;
    altura = canvas.clientHeight;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = largura / LARGURA_BASE;
    const sy = altura / ALTURA_BASE;
    pontos = PONTOS.map(([x, y]) => [x * sx, y * sy]);
    desenhar();
  };

  const desenhar = () => {
    ctx.clearRect(0, 0, largura, altura);
    const [ex, ey] = pontoNaCurva(pontos, t);

    // Pontos da trilha: acendem perto da esfera.
    pontos.forEach(([x, y]) => {
      const perto = Math.max(0, 1 - Math.hypot(x - ex, y - ey) / 90);
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cor.ponto}, ${0.55 + perto * 0.45})`;
      ctx.shadowColor = `rgba(${cor.ponto}, 0.9)`;
      ctx.shadowBlur = 6 + perto * 14;
      ctx.fill();
    });

    // Esfera (glicose) com brilho e gradiente radial.
    ctx.shadowBlur = 24;
    ctx.shadowColor = `rgba(${cor.ponto}, 0.9)`;
    const grad = ctx.createRadialGradient(ex - 5, ey - 6, 1, ex, ey, 17);
    grad.addColorStop(0, cor.claro);
    grad.addColorStop(0.5, `rgb(${cor.ponto})`);
    grad.addColorStop(1, cor.escuro);
    ctx.beginPath();
    ctx.arc(ex, ey, 17, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const loop = (agora) => {
    if (!visivel) return;
    const delta = Math.min((agora - ultimo) / 1000, 0.05);
    ultimo = agora;
    t = (t + delta / DURACAO_VOLTA) % 1;
    desenhar();
    requestAnimationFrame(loop);
  };

  new ResizeObserver(ajustar).observe(canvas);
  // Só anima enquanto está na tela.
  new IntersectionObserver(([e]) => {
    const estava = visivel;
    visivel = e.isIntersecting && !reduzido;
    if (visivel && !estava) {
      ultimo = performance.now();
      requestAnimationFrame(loop);
    }
  }).observe(canvas);
}

export function montarTrilhas(raiz = document) {
  raiz.querySelectorAll("canvas[data-trilha]").forEach(montarTrilha);
}
