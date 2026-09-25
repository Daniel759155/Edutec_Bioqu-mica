// Ponto de entrada comum a todas as páginas do site.
// 1) monta Navbar/Footer; 2) liga as animações globais; 3) preenche os átomos
// SVG; 4) carrega cada cena 3D (Three.js) só quando ela chega perto da tela.

import { montarLayout } from "./nav.js";
import { iniciarAnimacoes, loaderInicial } from "./animations.js";
import { montarAtomos } from "./three/atomo.js";
import { suportaWebGL, mostrarFallback } from "./three/suporte.js";
import { montarTrilhas } from "./efeitos/trilha.js";

// Módulo de cada cena 3D, carregado sob demanda (data-3d="nome").
const CENAS_3D = {
  dna: () => import("./three/dna.js"),
  glicose: () => import("./three/glicose.js"),
  laboratorio: () => import("./three/laboratorio.js"),
};

loaderInicial();
montarLayout();
montarAtomos();
montarTrilhas();
iniciarAnimacoes();
iniciarCenas3D();

function iniciarCenas3D() {
  const palcos = document.querySelectorAll("[data-3d]");
  if (!palcos.length) return;

  const montar = async (el) => {
    const carregar = CENAS_3D[el.dataset["3d"]];
    if (!carregar) return;
    if (!suportaWebGL()) {
      mostrarFallback(el);
      return;
    }
    try {
      const modulo = await carregar();
      el.palco3d = modulo.montar(el);
      el.dispatchEvent(new CustomEvent("palco3d:pronto", { detail: el.palco3d }));
    } catch (erro) {
      // CDN fora do ar ou GPU bloqueada: fica a imagem estática.
      console.warn("Cena 3D indisponível:", erro);
      el.querySelector("canvas")?.remove();
      mostrarFallback(el);
    }
  };

  const io = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        montar(e.target);
      }),
    { rootMargin: "300px" }
  );
  palcos.forEach((el) => io.observe(el));
}
