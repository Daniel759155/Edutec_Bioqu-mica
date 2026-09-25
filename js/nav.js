// Navbar, menu mobile, busca rápida (⌘K) e Footer — iguais em todas as páginas.
// Cada página só tem <header data-navbar></header> e <footer data-footer></footer>;
// este módulo gera o HTML e liga os comportamentos. A página atual vem de
// <body data-pagina="..."> (home, inicio, sobre, historia, biomoleculas,
// fluxo, cozinha, quiz, contato, termos).

// --- Mapa do site ------------------------------------------------------------

const LINKS = [
  { id: "home", rotulo: "Home", href: "index.html" },
  { id: "inicio", rotulo: "Início", href: "inicio.html" },
  { id: "sobre", rotulo: "O que é Bioquímica", href: "sobre.html" },
  { id: "historia", rotulo: "História", href: "historia.html" },
  { id: "biomoleculas", rotulo: "Biomoléculas", href: "biomoleculas.html" },
  { id: "jogos", rotulo: "Jogos" }, // dropdown
  { id: "contato", rotulo: "Contato", href: "contato.html" },
];

const JOGOS = [
  { id: "fluxo", rotulo: "Fluxo", sub: "Escolha seu caminho", href: "biolab.html" },
  { id: "jornada", rotulo: "Jornada da Glicose", sub: "Da corrente sanguínea ao ATP", href: "biolab.html#jornada" },
  { id: "aventura", rotulo: "Aventura no Mapa", sub: "Desvie dos obstáculos até a célula", href: "biolab.html#aventura" },
  { id: "cozinha", rotulo: "Cozinha Celular", sub: "Enzima em Ação!", href: "cozinha-celular.html" },
  { id: "quiz", rotulo: "Quiz", sub: "Teste seus conhecimentos", href: "quiz.html" },
];

// Menu mobile segue o Figma (frame "Menu mobile aberto").
const LINKS_MOBILE = [
  { id: "home", rotulo: "Home", href: "index.html" },
  { id: "inicio", rotulo: "Início", href: "inicio.html" },
  { id: "sobre", rotulo: "O que é Bioquímica", href: "sobre.html" },
  { id: "historia", rotulo: "História", href: "historia.html" },
  { id: "biomoleculas", rotulo: "Biomoléculas", href: "biomoleculas.html" },
  { id: "fluxo", rotulo: "Jogos — Fluxo", href: "biolab.html" },
  { id: "quiz", rotulo: "Quiz", href: "quiz.html" },
  { id: "contato", rotulo: "Contato", href: "contato.html" },
];

// Índice da busca ⌘K: páginas e seções principais, com palavras-chave.
const INDICE_BUSCA = [
  { titulo: "Home", descricao: "Página inicial — A química da vida", href: "index.html", chaves: "inicio principal dna laboratorio 3d" },
  { titulo: "Início — Explore o conteúdo", descricao: "Biomoléculas, aplicações e curiosidades", href: "inicio.html", chaves: "aplicacoes medicina nutricao curiosidades mini quiz" },
  { titulo: "O que é Bioquímica", descricao: "Definição, importância e linha do tempo", href: "sobre.html", chaves: "definicao importancia saude alimentacao biotecnologia pesquisa" },
  { titulo: "História", descricao: "Marcos de 1813 a 1953 e personagens", href: "historia.html", chaves: "liebig miescher buchner watson crick marcos timeline" },
  { titulo: "Biomoléculas", descricao: "Proteínas, carboidratos, lipídios e ácidos nucleicos", href: "biomoleculas.html", chaves: "proteinas carboidratos lipidios acidos nucleicos dna enzimas atp chonps" },
  { titulo: "Fluxo — escolha seu caminho", descricao: "Jogos: Jornada da Glicose e Aventura no Mapa", href: "biolab.html", chaves: "jogo jogos respiracao celular glicolise krebs" },
  { titulo: "Jornada da Glicose", descricao: "Siga a glicose até virar ATP", href: "biolab.html#jornada", chaves: "jogo glicose respiracao celular atp" },
  { titulo: "Aventura no Mapa", descricao: "Desafio sem perguntas até chegar à célula", href: "biolab.html#aventura", chaves: "jogo mapa obstaculos" },
  { titulo: "Cozinha Celular: Enzima em Ação!", descricao: "Jogo 3D dentro da célula", href: "cozinha-celular.html", chaves: "jogo 3d enzima ribossomo mitocondria radicais livres" },
  { titulo: "Quiz de Bioquímica", descricao: "10 perguntas para testar o que você aprendeu", href: "quiz.html", chaves: "quiz perguntas teste medalha" },
  { titulo: "Quem Somos e Contato", descricao: "Nosso time e formulário de contato", href: "contato.html", chaves: "time equipe email telefone formulario" },
  { titulo: "Termos de Uso", descricao: "Regras de uso do site", href: "termos.html", chaves: "termos uso regras" },
  { titulo: "Política de Privacidade", descricao: "Como tratamos seus dados", href: "termos.html#privacidade", chaves: "privacidade dados lgpd cookies" },
];

const CONTATO = {
  email: "bioquimica22ati@gmail.com",
  telefone: "+55 (11) 4002-8922",
  endereco: ["Estrada de Itapecerica, 67", "Boca da Mata - SP"],
};

const paginaAtual = () => document.body.dataset.pagina || "";
const ehJogo = (id) => JOGOS.some((j) => j.id === id);

// Remove acentos para a busca achar "bioquimica" em "Bioquímica".
const normalizar = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// --- HTML ----------------------------------------------------------------------

function htmlMarca(tag = "a") {
  const href = tag === "a" ? ` href="index.html" aria-label="Bioquímica — página inicial"` : "";
  return `
    <${tag} class="marca"${href}>
      <img class="marca__logo" src="assets/img/logo.png" alt="" width="44" height="44" />
      <span>
        <span class="marca__nome">BIOQUÍMICA</span>
        <span class="marca__sub">A química da vida</span>
      </span>
    </${tag}>`;
}

function htmlNavbar() {
  const atual = paginaAtual();
  const itens = LINKS.map((link) => {
    if (link.id === "jogos") {
      const jogoAtivo = ehJogo(atual);
      const opcoes = JOGOS.map(
        (j) =>
          `<li><a class="dropdown__item" href="${j.href}"${j.id === atual ? ' aria-current="page"' : ""}>${j.rotulo}<small>${j.sub}</small></a></li>`
      ).join("");
      return `
        <li class="dropdown" data-dropdown>
          <button class="navbar__link${jogoAtivo ? " ativo" : ""}" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="menu-jogos">
            Jogos <span class="dropdown__seta" aria-hidden="true">▾</span>
          </button>
          <ul class="dropdown__menu" id="menu-jogos" role="list">${opcoes}</ul>
        </li>`;
    }
    const corrente = link.id === atual ? ' aria-current="page"' : "";
    return `<li><a class="navbar__link" href="${link.href}"${corrente}>${link.rotulo}</a></li>`;
  }).join("");

  return `
    <nav class="navbar__barra" aria-label="Principal">
      ${htmlMarca()}
      <ul class="navbar__links" role="list">${itens}</ul>
      <div class="navbar__acoes">
        <button class="botao-busca" type="button" data-abrir-busca aria-label="Buscar no site (Ctrl+K)">
          <span class="botao-busca__icone" aria-hidden="true">⌕</span>
          <span class="botao-busca__atalho" aria-hidden="true">⌘K</span>
        </button>
        <button class="botao-menu" type="button" data-abrir-menu aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-mobile">☰</button>
      </div>
    </nav>`;
}

function htmlMenuMobile() {
  const atual = paginaAtual();
  const itens = LINKS_MOBILE.map(
    (l, i) =>
      `<li><a class="menu-mobile__link" style="--i:${i}" href="${l.href}"${l.id === atual ? ' aria-current="page"' : ""}>${l.rotulo}</a></li>`
  ).join("");
  return `
    <div class="menu-mobile" id="menu-mobile" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="menu-mobile__brilho" aria-hidden="true"><img src="assets/ui/menu-glow.svg" alt="" /></div>
      <button class="menu-mobile__fechar" type="button" data-fechar-menu aria-label="Fechar menu">✕</button>
      <ul class="menu-mobile__lista" role="list">${itens}</ul>
    </div>`;
}

function htmlBusca() {
  return `
    <div class="busca" id="busca" role="dialog" aria-modal="true" aria-label="Busca rápida">
      <div class="busca__painel">
        <label class="busca__campo">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Buscar páginas, jogos e temas…" autocomplete="off" aria-controls="busca-resultados" />
          <kbd>ESC</kbd>
        </label>
        <ul class="busca__resultados" id="busca-resultados" role="listbox"></ul>
      </div>
    </div>`;
}

function htmlFooter() {
  const navegacao = [
    ["Home", "index.html"],
    ["Início", "inicio.html"],
    ["O que é bioquímica", "sobre.html"],
    ["História", "historia.html"],
    ["Biomoléculas", "biomoleculas.html"],
    ["Fluxo", "biolab.html"],
    ["Quem somos / Contato", "contato.html"],
  ];
  const jogos = [
    ["Fluxo — escolha seu caminho", "biolab.html"],
    ["Jornada da Glicose", "biolab.html#jornada"],
    ["Aventura no Mapa", "biolab.html#aventura"],
    ["Cozinha Celular", "cozinha-celular.html"],
    ["Quiz de Bioquímica", "quiz.html"],
  ];
  const lista = (itens) => itens.map(([texto, href]) => `<li><a href="${href}">${texto}</a></li>`).join("");

  return `
    <div class="container">
      <div class="footer__colunas">
        <div class="footer__sobre">
          ${htmlMarca("div")}
          <p class="footer__texto">Um projeto educacional feito por estudantes para mostrar como a química sustenta toda forma de vida.</p>
          <div class="footer__sociais">
            <a class="footer__social" href="contato.html#time" aria-label="LinkedIn do time">in</a>
            <a class="footer__social" href="contato.html#time" aria-label="Instagram do time">ig</a>
            <a class="footer__social" href="mailto:${CONTATO.email}" aria-label="Enviar e-mail">@</a>
          </div>
        </div>
        <ul class="footer__coluna" role="list">
          <li class="footer__titulo">NAVEGAÇÃO</li>
          ${lista(navegacao)}
        </ul>
        <ul class="footer__coluna" role="list">
          <li class="footer__titulo">JOGOS</li>
          ${lista(jogos)}
        </ul>
        <ul class="footer__coluna" role="list">
          <li class="footer__titulo">CONTATO</li>
          <li><a href="mailto:${CONTATO.email}">${CONTATO.email}</a></li>
          <li><a href="tel:+551140028922">${CONTATO.telefone}</a></li>
          <li>${CONTATO.endereco[0]}</li>
          <li>${CONTATO.endereco[1]}</li>
        </ul>
        <div class="footer__qr">
          <img src="assets/img/footer-decor.png" alt="QR Code para acessar o site pelo celular" width="120" height="120" loading="lazy" />
          <span>Acesse pelo celular</span>
        </div>
      </div>
      <div class="footer__barra">
        <p>© 2026 Bioquímica - A química da vida. Todos os direitos reservados</p>
        <nav aria-label="Links legais">
          <a href="termos.html">Termos de Uso</a><span aria-hidden="true">·</span>
          <a href="termos.html#privacidade">Política de Privacidade</a><span aria-hidden="true">·</span>
          <a href="#topo" data-voltar-topo>Voltar ao topo ↑</a>
        </nav>
      </div>
      <p class="footer__palavra" aria-hidden="true">BIOQUÍMICA</p>
    </div>`;
}

// --- Comportamentos ------------------------------------------------------------

// Some ao rolar para baixo, volta ao rolar para cima.
function ligarEsconderAoRolar(navbar) {
  let ultimo = window.scrollY;
  let agendado = false;
  window.addEventListener(
    "scroll",
    () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const descendo = y > ultimo && y > 120;
        const algoAberto = navbar.querySelector(".dropdown.aberto");
        navbar.classList.toggle("escondida", descendo && !algoAberto);
        ultimo = y;
        agendado = false;
      });
    },
    { passive: true }
  );
}

function ligarDropdown(navbar) {
  const dropdown = navbar.querySelector("[data-dropdown]");
  if (!dropdown) return;
  const botao = dropdown.querySelector("button");
  const definir = (aberto) => {
    dropdown.classList.toggle("aberto", aberto);
    botao.setAttribute("aria-expanded", String(aberto));
  };

  botao.addEventListener("click", () => definir(!dropdown.classList.contains("aberto")));
  // No desktop também abre ao passar o mouse.
  dropdown.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && definir(true));
  dropdown.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && definir(false));
  document.addEventListener("click", (e) => !dropdown.contains(e.target) && definir(false));
  dropdown.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      definir(false);
      botao.focus();
    }
  });
}

function ligarMenuMobile() {
  const menu = document.getElementById("menu-mobile");
  const abrir = document.querySelector("[data-abrir-menu]");
  const fechar = menu.querySelector("[data-fechar-menu]");
  const definir = (aberto) => {
    menu.classList.toggle("aberto", aberto);
    document.body.classList.toggle("menu-aberto", aberto);
    abrir.setAttribute("aria-expanded", String(aberto));
    if (aberto) fechar.focus();
    else abrir.focus();
  };
  abrir.addEventListener("click", () => definir(true));
  fechar.addEventListener("click", () => definir(false));
  menu.addEventListener("keydown", (e) => e.key === "Escape" && definir(false));
  // Se a tela crescer até o desktop com o menu aberto, fecha.
  window.matchMedia("(min-width: 1100px)").addEventListener("change", (e) => e.matches && menu.classList.contains("aberto") && definir(false));
}

function ligarBusca() {
  const busca = document.getElementById("busca");
  const campo = busca.querySelector("input");
  const lista = busca.querySelector(".busca__resultados");
  let resultados = [];
  let selecionado = 0;

  const desenhar = () => {
    const termo = normalizar(campo.value.trim());
    resultados = INDICE_BUSCA.filter((item) => !termo || normalizar(`${item.titulo} ${item.descricao} ${item.chaves}`).includes(termo));
    selecionado = 0;
    lista.innerHTML = resultados.length
      ? resultados
          .map(
            (r, i) =>
              `<li><a class="busca__resultado${i === 0 ? " selecionado" : ""}" href="${r.href}" role="option"><strong>${r.titulo}</strong><small>${r.descricao}</small></a></li>`
          )
          .join("")
      : `<li class="busca__vazio">Nada encontrado para “${campo.value}”.</li>`;
  };

  const marcar = () =>
    lista.querySelectorAll(".busca__resultado").forEach((el, i) => {
      el.classList.toggle("selecionado", i === selecionado);
      if (i === selecionado) el.scrollIntoView({ block: "nearest" });
    });

  let focoAnterior = null;
  const abrir = () => {
    focoAnterior = document.activeElement;
    busca.classList.add("aberta");
    campo.value = "";
    desenhar();
    setTimeout(() => campo.focus(), 30);
  };
  const fechar = () => {
    busca.classList.remove("aberta");
    if (focoAnterior) focoAnterior.focus();
  };

  document.querySelectorAll("[data-abrir-busca]").forEach((b) => b.addEventListener("click", abrir));
  busca.addEventListener("click", (e) => e.target === busca && fechar());
  campo.addEventListener("input", desenhar);
  campo.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!resultados.length) return;
      selecionado = (selecionado + (e.key === "ArrowDown" ? 1 : -1) + resultados.length) % resultados.length;
      marcar();
    } else if (e.key === "Enter" && resultados[selecionado]) {
      window.location.href = resultados[selecionado].href;
    }
  });

  // Ctrl+K / ⌘K abre; ESC fecha.
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      busca.classList.contains("aberta") ? fechar() : abrir();
    } else if (e.key === "Escape" && busca.classList.contains("aberta")) {
      fechar();
    }
  });
}

function ligarVoltarAoTopo() {
  document.querySelectorAll("[data-voltar-topo]").forEach((link) =>
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
  );
}

// --- Montagem --------------------------------------------------------------------

export function montarLayout() {
  document.body.id ||= "topo";

  const header = document.querySelector("[data-navbar]");
  if (header) {
    header.classList.add("navbar");
    header.innerHTML = htmlNavbar();
    document.body.insertAdjacentHTML("beforeend", htmlMenuMobile() + htmlBusca());
    ligarEsconderAoRolar(header);
    ligarDropdown(header);
    ligarMenuMobile();
    ligarBusca();
  }

  const footer = document.querySelector("[data-footer]");
  if (footer) {
    footer.classList.add("footer");
    footer.innerHTML = htmlFooter();
    ligarVoltarAoTopo();
  }
}
