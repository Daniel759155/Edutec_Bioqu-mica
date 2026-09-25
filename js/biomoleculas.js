// Interações da página Biomoléculas (Figma: 05 · Biomoléculas):
// molécula do hero que se "desmonta" em átomos ao rolar (virando as partículas
// da seção seguinte), tiles dos elementos que viram, cards que expandem,
// pares de bases clicáveis, equação que acende em sequência e barra de ATP.

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

desmontarMolecula();
tilesDosElementos();
cardsDosTipos();
paresDeBases();
equacaoEmSequencia();
barraDeEnergia();

// --- Hero: ao rolar, a molécula se separa em átomos --------------------------------
function desmontarMolecula() {
  const hero = document.querySelector("[data-hero-biomol]");
  const palco = document.querySelector("[data-molecula-hero]");
  const camadaParticulas = document.querySelector("[data-particulas]");
  if (!hero || !palco) return;

  criarParticulas(camadaParticulas);
  // Sem animação: a molécula fica montada e as partículas aparecem direto.
  if (reduzido) {
    if (camadaParticulas) camadaParticulas.style.opacity = "1";
    return;
  }

  let atomos = [];
  let ligacoes = [];

  // Guarda a posição original de cada átomo quando a cena 3D fica pronta.
  const preparar = (visualizador) => {
    const objeto = visualizador?.objeto;
    if (!objeto) return;
    atomos = objeto.userData.atomos.map((atomo) => {
      const origem = atomo.position.clone();
      // Direção de "fuga": para fora do centro, com um pouco de aleatoriedade.
      const direcao = origem.clone();
      if (direcao.lengthSq() < 0.01) direcao.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      direcao.normalize();
      direcao.x += (Math.random() - 0.5) * 0.6;
      direcao.y += (Math.random() - 0.5) * 0.6;
      direcao.z += (Math.random() - 0.5) * 0.6;
      return { atomo, origem, direcao, distancia: 3 + Math.random() * 4 };
    });
    ligacoes = objeto.children.filter((filho) => !objeto.userData.atomos.includes(filho));
    atualizar();
  };
  if (palco.palco3d) preparar(palco.palco3d);
  else palco.addEventListener("palco3d:pronto", (e) => preparar(e.detail), { once: true });

  let agendado = false;
  function atualizar() {
    agendado = false;
    const altura = hero.offsetHeight;
    const progresso = Math.min(1, Math.max(0, window.scrollY / (altura * 0.75)));
    document.documentElement.style.setProperty("--desmonte", progresso.toFixed(3));

    const suave = progresso * progresso;
    atomos.forEach(({ atomo, origem, direcao, distancia }) => {
      atomo.position.copy(origem).addScaledVector(direcao, suave * distancia);
    });
    ligacoes.forEach((ligacao) => (ligacao.visible = progresso < 0.12));
  }

  window.addEventListener(
    "scroll",
    () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(atualizar);
    },
    { passive: true }
  );
  atualizar();
}

// Partículas (átomos coloridos) que flutuam no fundo da seção "O que são".
function criarParticulas(camada) {
  if (!camada) return;
  const cores = ["#2ef2c4", "#c9d6ea", "#ff5c7a", "#38bdf8", "#ffb547", "#f472b6"];
  const html = [];
  for (let i = 0; i < 28; i++) {
    const tamanho = 4 + Math.random() * 8;
    html.push(
      `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;` +
        `--t:${tamanho.toFixed(1)}px;--c:${cores[i % cores.length]};--d:${(10 + Math.random() * 10).toFixed(1)}s;` +
        `--dx:${(Math.random() * 60 - 30).toFixed(0)}px;--dy:${(Math.random() * 60 - 30).toFixed(0)}px;` +
        `animation-delay:-${(Math.random() * 10).toFixed(1)}s"></i>`
    );
  }
  camada.innerHTML = html.join("");
}

// --- Tiles CHONPS: viram no hover (desktop) ou no toque/clique ----------------------
function tilesDosElementos() {
  document.querySelectorAll(".elemento__botao").forEach((botao) =>
    botao.addEventListener("click", () => {
      const virado = botao.parentElement.classList.toggle("virado");
      botao.setAttribute("aria-pressed", String(virado));
    })
  );
}

// --- Cards dos tipos: "Ver mais" expande unidade + exemplos --------------------------
function cardsDosTipos() {
  document.querySelectorAll("[data-tipo]").forEach((card) => {
    const botao = card.querySelector(".tipo__botao");
    const texto = botao.querySelector(".tipo__botao-texto");
    botao.addEventListener("click", () => {
      const aberto = card.classList.toggle("aberto");
      botao.setAttribute("aria-expanded", String(aberto));
      texto.textContent = aberto ? "Ver menos" : "Ver mais";
    });
  });

  // Chegando por um link do Início (biomoleculas.html#lipidios), abre o card.
  const alvo = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (alvo?.matches("[data-tipo]") && !alvo.classList.contains("aberto")) alvo.querySelector(".tipo__botao").click();
}

// --- Pares de bases clicáveis --------------------------------------------------------
const EXPLICACOES = {
  at: "<strong>A–T:</strong> adenina sempre pareia com timina, unidas por 2 ligações de hidrogênio.",
  gc: "<strong>G–C:</strong> guanina sempre pareia com citosina, unidas por 3 ligações de hidrogênio — um par mais firme.",
  rna: "<strong>No RNA</strong>, a timina (T) dá lugar à uracila (U): o par passa a ser A–U.",
};

function paresDeBases() {
  const grupo = document.querySelector("[data-bases]");
  if (!grupo) return;
  const explicacao = document.querySelector("[data-bases-explicacao]");
  const baseT = grupo.querySelector("[data-base-t]");
  const molecula = document.querySelector("[data-molecula-hero]");

  grupo.addEventListener("click", (e) => {
    const par = e.target.closest("[data-par]");
    if (!par) return;
    grupo.querySelectorAll("[data-par]").forEach((b) => b.setAttribute("aria-pressed", String(b === par)));
    explicacao.innerHTML = EXPLICACOES[par.dataset.par];

    // "RNA: T → U" troca a letra do primeiro par para mostrar a uracila.
    const rna = par.dataset.par === "rna";
    baseT.textContent = rna ? "U" : "T";
    baseT.className = rna ? "base--u" : "base--t";

    // A molécula 3D do hero dá um giro rápido em resposta.
    const objeto = molecula?.palco3d?.objeto;
    if (objeto && !reduzido) {
      const inicio = objeto.rotation.y;
      const t0 = performance.now();
      const girar = (agora) => {
        const t = Math.min(1, (agora - t0) / 900);
        objeto.rotation.y = inicio + (1 - Math.pow(1 - t, 3)) * Math.PI * 2;
        if (t < 1) requestAnimationFrame(girar);
      };
      requestAnimationFrame(girar);
    }
  });
}

// --- Equação: termos acendem em sequência quando o card aparece ----------------------
function equacaoEmSequencia() {
  const equacao = document.querySelector("[data-equacao]");
  if (!equacao) return;
  const termos = [...equacao.querySelectorAll(".equacao__termo")];
  if (reduzido) {
    termos.forEach((t) => t.classList.add("aceso"));
    return;
  }
  let timer = null;
  const acender = () => {
    let i = 0;
    clearInterval(timer);
    termos.forEach((t) => t.classList.remove("aceso"));
    timer = setInterval(() => {
      if (i < termos.length) termos[i++].classList.add("aceso");
      else if (i++ > termos.length + 3) {
        // Pausa com tudo aceso e recomeça.
        termos.forEach((t) => t.classList.remove("aceso"));
        i = 0;
      }
    }, 450);
  };
  const io = new IntersectionObserver((entradas) =>
    entradas.forEach((e) => (e.isIntersecting ? acender() : clearInterval(timer)))
  );
  io.observe(equacao);
}

// --- Barra de ATP enche ao entrar na tela --------------------------------------------
function barraDeEnergia() {
  const energia = document.querySelector("[data-energia]");
  if (!energia) return;
  const io = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        energia.classList.add("cheia");
        io.unobserve(energia);
      }),
    { threshold: 0.6 }
  );
  io.observe(energia);
}
