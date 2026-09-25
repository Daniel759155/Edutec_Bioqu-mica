// Ajustes de qualidade gráfica. Cada preset controla o custo das técnicas
// visuais (sombra, bloom, partículas, resolução) para caber em máquinas
// mais fracas sem tirar o jogo do ar.

export const PRESETS_QUALIDADE = {
  baixa: {
    amostrasMsaa: 0,
    vinheta: false,
    sombras: false,
    limitePixelRatio: 1,
    bloomForca: 0.35,
    bloomRaio: 0.4,
    quantidadeBolhas: 30,
    segmentosEsfera: 12,
  },
  media: {
    amostrasMsaa: 2,
    vinheta: true,
    sombras: true,
    limitePixelRatio: 1.5,
    bloomForca: 0.55,
    bloomRaio: 0.55,
    quantidadeBolhas: 70,
    segmentosEsfera: 20,
  },
  alta: {
    amostrasMsaa: 4,
    vinheta: true,
    sombras: true,
    limitePixelRatio: 2,
    bloomForca: 0.8,
    bloomRaio: 0.7,
    quantidadeBolhas: 140,
    segmentosEsfera: 32,
  },
};

export const CONFIG = {
  qualidade: "media",
  get preset() {
    return PRESETS_QUALIDADE[this.qualidade];
  },
};

// Paleta do guia visual (Figma · "Guia visual · Código Celular").
export const CORES = {
  enzima: 0x22d3a6,
  atp: 0xffd24d,
  rosa: 0xff4fb0,
  roxo: 0x9b4dff,
  sucesso: 0x4dff9a,
  perigo: 0xff5c7a,
  info: 0x4dc3ff,
  fundo: 0x1a0b3d,
  ciano: 0x3de8ff,
  laranja: 0xff9a4d,
};

// Fundo de cada fase: o gradiente radial do design (centro → borda) vira a
// textura de fundo da cena; a neblina usa a cor da borda para "sumir" nela.
export const TEMAS = {
  ribossomo: { gradiente: ["#17406b", "#112f55", "#0b1e3f", "#08142e", "#040a1c"], neblina: 0x08142e, densidade: 0.018, luzes: [0x4dc3ff, 0x9b4dff, 0x22d3a6] },
  mitocondria: { gradiente: ["#5a1a12", "#421211", "#2a0a10", "#1a060d", "#10030a"], neblina: 0x1a060d, densidade: 0.014, luzes: [0xff9a4d, 0xffd24d, 0xff4fb0] },
  laboratorio: { gradiente: ["#0f4a4a", "#0c3c42", "#082a33", "#05202b", "#03121a"], neblina: 0x03121a, densidade: 0.012, luzes: [0x7ffff0, 0xff6fd8, 0x4dc3ff] },
  chefao: { gradiente: ["#4a0a2a", "#34071f", "#1e0414", "#120312", "#05020f"], neblina: 0x120312, densidade: 0.02, luzes: [0xff2e63, 0xff9a3d, 0x9b4dff] },
};
