// Interações da página História (Figma: 04 · História): timeline vertical que
// se desenha com o scroll, anos "fantasma" com parallax, modal dos
// personagens e moldura da imagem que inclina em 3D com o mouse.

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const temMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

linhaDoTempo();
modalPersonagens();
moldura3D();

// --- Timeline vertical ------------------------------------------------------------
function linhaDoTempo() {
  const lista = document.querySelector("[data-marcos]");
  if (!lista) return;
  const marcos = [...lista.querySelectorAll(".marco-h")];

  if (reduzido) {
    lista.style.setProperty("--progresso", 1);
    marcos.forEach((m) => m.classList.add("aceso"));
    return;
  }

  // Linha central (scaleY) acompanha a rolagem; o ponto acende quando ela chega.
  let agendado = false;
  const atualizar = () => {
    agendado = false;
    const caixa = lista.getBoundingClientRect();
    const alvo = window.innerHeight * 0.6;
    const progresso = Math.min(1, Math.max(0, (alvo - caixa.top) / caixa.height));
    lista.style.setProperty("--progresso", progresso.toFixed(4));
    marcos.forEach((marco) => {
      const ponto = marco.querySelector(".marco-h__ponto").getBoundingClientRect();
      marco.classList.toggle("aceso", ponto.top + ponto.height / 2 <= caixa.top + caixa.height * progresso + 1);
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

  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const desktop = window.matchMedia("(min-width: 1000px)").matches;

  marcos.forEach((marco, i) => {
    // Cards entram alternando esquerda/direita (x ±60 → 0).
    const card = marco.querySelector(".marco-h__card");
    const lado = desktop && i % 2 === 1 ? 60 : -60;
    // Usa "translate" (e não x/transform) para não brigar com o tilt 3D do card.
    gsap.from(card, {
      translate: `${lado}px 0px`,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: marco, start: "top 85%", once: true },
    });

    // Ano gigante "fantasma" com parallax.
    const fantasma = marco.querySelector(".marco-h__fantasma");
    if (desktop && fantasma) {
      gsap.fromTo(
        fantasma,
        { y: 60 },
        { y: -60, ease: "none", scrollTrigger: { trigger: marco, start: "top bottom", end: "bottom top", scrub: true } }
      );
    }
  });
}

// --- Modal dos personagens ------------------------------------------------------------
const PERSONAGENS = {
  liebig: {
    nome: "Justus von Liebig",
    datas: "1803 – 1873 · Alemanha",
    texto:
      "Químico alemão que transformou o laboratório em sala de aula: em Giessen, criou um dos primeiros laboratórios de ensino de química do mundo, onde formou gerações de cientistas.",
    fatos: [
      "Aperfeiçoou a análise elementar de substâncias orgânicas (carbono, hidrogênio e nitrogênio).",
      "Estudou a nutrição das plantas e ajudou a fundar a química agrícola e o uso de fertilizantes.",
      "Em “Química Animal” (1842), explicou funções do corpo, como o calor e o movimento, por reações químicas.",
    ],
  },
  miescher: {
    nome: "Friedrich Miescher",
    datas: "1844 – 1895 · Suíça",
    texto:
      "Médico e biólogo suíço que, em 1869, trabalhando em Tübingen, isolou dos núcleos de glóbulos brancos uma substância rica em fósforo que chamou de “nucleína” — o que hoje conhecemos como DNA.",
    fatos: [
      "Obteve as células a partir de pus em ataduras de um hospital próximo.",
      "Percebeu que a nucleína não era uma proteína: tinha muito fósforo e resistia às enzimas que digerem proteínas.",
      "Mais tarde, estudou a nucleína no esperma de salmão.",
    ],
  },
  buchner: {
    nome: "Eduard Buchner",
    datas: "1860 – 1917 · Alemanha",
    texto:
      "Químico alemão que, em 1897, mostrou que um extrato de levedura sem nenhuma célula viva ainda conseguia fermentar açúcar em álcool e gás carbônico.",
    fatos: [
      "A descoberta derrubou a ideia de que a fermentação exigia uma “força vital” das células.",
      "Chamou o conjunto de enzimas responsável pela fermentação de “zimase”.",
      "Recebeu o Prêmio Nobel de Química em 1907.",
    ],
  },
  watson: {
    nome: "James D. Watson",
    datas: "Nascido em 1928 · Estados Unidos",
    texto:
      "Biólogo americano que, em 1953, no Laboratório Cavendish (Cambridge), propôs com Francis Crick o modelo da dupla hélice do DNA.",
    fatos: [
      "O modelo usou dados de difração de raios X de Rosalind Franklin e Maurice Wilkins, como a famosa “Foto 51”.",
      "Dividiu com Crick e Wilkins o Prêmio Nobel de Fisiologia ou Medicina de 1962.",
      "Foi o primeiro diretor do Projeto Genoma Humano nos Estados Unidos.",
    ],
  },
  crick: {
    nome: "Francis Crick",
    datas: "1916 – 2004 · Reino Unido",
    texto:
      "Físico e biólogo molecular britânico que, com James Watson, descreveu a estrutura em dupla hélice do DNA em 1953.",
    fatos: [
      "Formulou o “dogma central da biologia molecular”: DNA → RNA → proteína.",
      "Ajudou a mostrar que o código genético é lido em trincas de bases (códons).",
      "Dividiu o Prêmio Nobel de Fisiologia ou Medicina de 1962 e, depois, estudou a consciência no Instituto Salk.",
    ],
  },
};

function modalPersonagens() {
  const modal = document.querySelector("[data-modal-personagem]");
  if (!modal || typeof modal.showModal !== "function") return;
  const foto = modal.querySelector("[data-modal-foto]");

  document.querySelectorAll("[data-personagem]").forEach((botao) =>
    botao.addEventListener("click", () => {
      const p = PERSONAGENS[botao.dataset.personagem];
      if (!p) return;
      foto.src = botao.querySelector("img").src;
      foto.alt = `Retrato de ${p.nome}`;
      modal.querySelector("[data-modal-nome]").textContent = p.nome;
      modal.querySelector("[data-modal-datas]").textContent = p.datas;
      modal.querySelector("[data-modal-texto]").textContent = p.texto;
      modal.querySelector("[data-modal-fatos]").innerHTML = p.fatos.map((f) => `<li>${f}</li>`).join("");
      modal.showModal();
    })
  );

  modal.querySelector("[data-modal-fechar]").addEventListener("click", () => modal.close());
  // Clique fora da caixa (no fundo escurecido) fecha o modal.
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
  });
}

// --- Moldura que inclina em 3D conforme o mouse (rotateX/Y ±6°) ---------------------
function moldura3D() {
  const moldura = document.querySelector("[data-moldura-3d]");
  if (!moldura || reduzido || !temMouse) return;
  const cena = moldura.parentElement;
  cena.addEventListener("pointermove", (e) => {
    const r = moldura.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    moldura.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
    moldura.style.setProperty("--rx", `${(-y * 12).toFixed(2)}deg`);
  });
  cena.addEventListener("pointerleave", () => {
    moldura.style.setProperty("--rx", "0deg");
    moldura.style.setProperty("--ry", "0deg");
  });
}
