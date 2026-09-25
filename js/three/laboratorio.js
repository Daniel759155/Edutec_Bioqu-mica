// Home › "Laboratório 3D interativo" (Figma 305:233).
// Visualizador com abas Glicose / ATP / DNA / Aminoácido. Cada aba troca o
// modelo com transição de escala; OrbitControls gira (sem pan), os botões
// ＋/－ aproximam, "Auto-rotação" liga/desliga e o tooltip mostra cada átomo.
//
// Marcação esperada (dentro de [data-laboratorio]):
//   [data-3d="laboratorio"]      → área do canvas
//   [data-lab-aba="glicose"]…    → botões das abas (role="tab")
//   [data-lab-legenda]           → legenda de cores
//   [data-lab-zoom="1.2"|"0.83"] → botões ＋ / －
//   [data-lab-auto]              → botão de auto-rotação

import { VisualizadorMolecula } from "./glicose.js";
import { ELEMENTOS, definicaoGlicose, definicaoATP, definicaoAminoacido, montarMolecula } from "./moleculas.js";
import { criarHelice } from "./dna.js";

const hex = (cor) => `#${cor.toString(16).padStart(6, "0")}`;

// Fragmento de DNA: cada esfera é um nucleotídeo, com a base que ele carrega.
const BASES = {
  A: { nome: "Adenina", par: "T", papel: "pareia com a timina (T) por 2 pontes de H" },
  T: { nome: "Timina", par: "A", papel: "pareia com a adenina (A) por 2 pontes de H" },
  G: { nome: "Guanina", par: "C", papel: "pareia com a citosina (C) por 3 pontes de H" },
  C: { nome: "Citosina", par: "G", papel: "pareia com a guanina (G) por 3 pontes de H" },
};
const SEQUENCIA = "ATGCGTACGA";

function criarFragmentoDNA() {
  const helice = criarHelice({ pares: SEQUENCIA.length, raio: 1.5, passo: 0.62, giroPorPar: 0.62 });
  const esferas = helice.userData.esferas; // [fita1, fita2, fita1, fita2, ...]
  esferas.forEach((esfera, i) => {
    const baseFita1 = SEQUENCIA[Math.floor(i / 2)];
    const letra = i % 2 === 0 ? baseFita1 : BASES[baseFita1].par;
    const { nome, papel } = BASES[letra];
    esfera.userData = { elemento: letra, nome, papel };
  });
  helice.userData.atomos = esferas;
  return helice;
}

// Legenda de cada modelo: [rótulo, cor].
const elementos = (...simbolos) => simbolos.map((s) => [s, hex(ELEMENTOS[s].cor)]);
const MODELOS = {
  glicose: { criar: () => montarMolecula(definicaoGlicose()), legenda: elementos("C", "O", "H") },
  atp: { criar: () => montarMolecula(definicaoATP()), legenda: elementos("C", "N", "O", "P", "H") },
  dna: {
    criar: criarFragmentoDNA,
    legenda: [
      ["Fita 1", "#2EF2C4"],
      ["Fita 2", "#8B5CF6"],
    ],
  },
  aminoacido: { criar: () => montarMolecula(definicaoAminoacido()), legenda: elementos("C", "N", "O", "H") },
};

export function montar(container) {
  const raiz = container.closest("[data-laboratorio]") || document;
  const visualizador = new VisualizadorMolecula(container, { arrastavel: true });
  const abas = [...raiz.querySelectorAll("[data-lab-aba]")];
  const legenda = raiz.querySelector("[data-lab-legenda]");
  const botaoAuto = raiz.querySelector("[data-lab-auto]");

  const selecionar = (id) => {
    const modelo = MODELOS[id];
    if (!modelo) return;
    abas.forEach((aba) => {
      const ativa = aba.dataset.labAba === id;
      aba.classList.toggle("ativa", ativa);
      aba.setAttribute("aria-selected", String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
    });
    visualizador.mostrarObjeto(modelo.criar());
    if (legenda) {
      legenda.innerHTML = modelo.legenda
        .map(([rotulo, cor]) => `<span class="lab-legenda__item"><i style="--cor:${cor}"></i>${rotulo}</span>`)
        .join("");
    }
  };

  abas.forEach((aba, i) => {
    aba.addEventListener("click", () => selecionar(aba.dataset.labAba));
    // Setas ↑/↓ navegam entre as abas (padrão de acessibilidade de tabs).
    aba.addEventListener("keydown", (e) => {
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const passo = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
      const proxima = abas[(i + passo + abas.length) % abas.length];
      proxima.focus();
      selecionar(proxima.dataset.labAba);
    });
  });

  raiz.querySelectorAll("[data-lab-zoom]").forEach((botao) =>
    botao.addEventListener("click", () => visualizador.aproximar(Number(botao.dataset.labZoom)))
  );

  if (botaoAuto) {
    const atualizar = () => {
      botaoAuto.setAttribute("aria-pressed", String(visualizador.autoRotacao));
      botaoAuto.classList.toggle("ligado", visualizador.autoRotacao);
    };
    botaoAuto.addEventListener("click", () => {
      visualizador.autoRotacao = !visualizador.autoRotacao;
      atualizar();
    });
    atualizar();
  }

  const inicial = abas.find((a) => a.classList.contains("ativa"))?.dataset.labAba || "glicose";
  selecionar(inicial);
  return visualizador;
}
