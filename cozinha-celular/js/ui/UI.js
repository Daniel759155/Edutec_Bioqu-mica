// Telas em HTML por cima do jogo: carregamento, menu (01), introdução de
// fase, fase concluída (06), mini quiz (07), loja (08), tela final e pausa.
// Mantém o Jogo.js livre de manipulação direta de DOM.

import { formatarNumero } from "./HUD.js";

const $ = (id) => document.getElementById(id);

// Cenário da tela inicial, nas posições do Figma (quadro de 1920 × 1080).
// [arquivo, x, y] — cada SVG já vem no tamanho certo (atributos width/height).
const CENARIO_MENU = [
  ["membrana.svg", -260, -380],
  ["nucleo.svg", 1320, 540],
  // Bolhas grandes com reflexo
  ["e-8ccab.svg", 225, 125], ["e-14cc7.svg", 270.5, 164.9],
  ["e-b1711.svg", 1625, 155], ["e-af219.svg", 1657.5, 183.5],
  ["e-22d56.svg", 1483, 73], ["e-11e09.svg", 1505.1, 92.38],
  ["e-31f7b.svg", 70, 400], ["e-83fd3.svg", 96, 422.8],
  ["e-03d62.svg", 1730, 440], ["e-b8c29.svg", 1769, 474.2],
  // Bolhinhas
  ["e-773ea.svg", 0, 0], ["e-07cd3.svg", 211, 137], ["e-49673.svg", 422, 274], ["e-62710.svg", 633, 411],
  ["e-77b00.svg", 844, 548], ["e-8542f.svg", 1055, 685], ["e-048f2.svg", 1266, 822], ["e-ef680.svg", 1477, 959],
  ["e-1a002.svg", 1688, 16], ["e-b13e0.svg", 1899, 153], ["e-469fe.svg", 190, 290], ["e-f3b76.svg", 401, 427],
  ["e-79fc7.svg", 612, 564], ["e-1420e.svg", 823, 701], ["e-e3cc1.svg", 1034, 838], ["e-7d9ba.svg", 1245, 975],
  ["e-29d7a.svg", 1456, 32], ["e-59088.svg", 1667, 169], ["e-c9336.svg", 1878, 306], ["e-c9af0.svg", 169, 443],
  ["e-ff0f7.svg", 380, 580], ["e-44a06.svg", 591, 717], ["e-453a3.svg", 802, 854], ["e-be097.svg", 1013, 991],
  ["e-c67d6.svg", 1224, 48], ["e-324a1.svg", 1435, 185], ["e-f3b38.svg", 1646, 322], ["e-e3430.svg", 1857, 459],
  ["e-773ea.svg", 148, 596], ["e-07cd3.svg", 359, 733], ["e-49673.svg", 570, 870], ["e-62710.svg", 781, 1007],
  ["e-77b00.svg", 992, 64], ["e-8542f.svg", 1203, 201], ["e-048f2.svg", 1414, 338], ["e-ef680.svg", 1625, 475],
  ["e-1a002.svg", 1836, 612], ["e-b13e0.svg", 127, 749], ["e-469fe.svg", 338, 886], ["e-f3b76.svg", 549, 1023],
  ["e-79fc7.svg", 760, 80], ["e-1420e.svg", 971, 217], ["e-e3cc1.svg", 1182, 354], ["e-7d9ba.svg", 1393, 491],
  ["e-29d7a.svg", 1604, 628], ["e-59088.svg", 1815, 765],
  // Brilhos dourados
  ...[
    [90, 40], [443, 231], [796, 422], [1149, 613], [1502, 804], [1855, 995], [288, 106], [641, 297], [994, 488],
    [1347, 679], [1700, 870], [133, 1061], [486, 172], [839, 363], [1192, 554], [1545, 745], [1898, 936], [331, 47],
  ].map(([x, y]) => ["e-70359.svg", x - 18, y - 18, "brilho"]),
  // Moléculas (bola e vareta)
  ["molecula-1.svg", 0, 0, "molecula"],
  ["molecula-2.svg", 0, 0, "molecula"],
  ["molecula-3.svg", 0, 0, "molecula"],
];

// Estrelas da tela "Fase concluída": [tamanho do quadro, arquivo cheio].
const ESTRELAS = [
  { tamanho: 150, cheia: "estrela-1.svg", topo: 30 },
  { tamanho: 180, cheia: "estrela-2.svg", topo: 0 },
  { tamanho: 150, cheia: "estrela-1.svg", topo: 30 },
];
const CORES_CONFETE = ["#ff4fb0", "#ffe14d", "#4dff9a", "#4dc3ff", "#c9a7ff", "#ff9a3d"];
const LETRAS = ["A", "B", "C", "D"];

export class UI {
  constructor(som) {
    this.som = som;
    this.telas = {
      carregamento: $("tela-carregamento"),
      menu: $("tela-menu"),
      modal: $("modal"),
      intro: $("tela-intro"),
      concluida: $("tela-concluida"),
      quiz: $("tela-quiz"),
      loja: $("tela-loja"),
      final: $("tela-final"),
      pausa: $("tela-pausa"),
    };
    this._montarCenarioMenu();
    this._ajustarPalco();
    window.addEventListener("resize", () => this._ajustarPalco());

    // Qualquer botão faz o "clique" sonoro.
    document.addEventListener("click", (e) => {
      if (e.target instanceof Element && e.target.closest("button")) this.som.tocar("clique");
    });

    $("modal-fechar").addEventListener("click", () => this.fecharModal());
    $("botao-tela-cheia").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    });
  }

  // --- Utilidades --------------------------------------------------------

  mostrar(nome) {
    this.telas[nome].classList.remove("oculto");
  }

  esconder(nome) {
    this.telas[nome].classList.add("oculto");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  // Alguma tela (que não seja o carregamento) está aberta por cima do jogo?
  algumaTelaAberta() {
    return Object.entries(this.telas).some(([nome, tela]) => nome !== "carregamento" && !tela.classList.contains("oculto"));
  }

  telaAberta(nome) {
    return !this.telas[nome].classList.contains("oculto");
  }

  esconderCarregamento() {
    this.telas.carregamento.classList.add("oculto");
  }

  // --- 01 · Menu ---------------------------------------------------------

  _montarCenarioMenu() {
    const cenario = $("menu-cenario");
    CENARIO_MENU.forEach(([arquivo, x, y, classe]) => {
      const img = document.createElement("img");
      img.src = `assets/menu/${arquivo}`;
      img.alt = "";
      img.style.left = `${x}px`;
      img.style.top = `${y}px`;
      if (classe) img.className = classe;
      cenario.appendChild(img);
    });
  }

  // O palco de 1920 × 1080 do cenário cobre a tela inteira (como "cover").
  _ajustarPalco() {
    const escala = Math.max(window.innerWidth / 1920, window.innerHeight / 1080);
    document.documentElement.style.setProperty("--escala-palco", String(escala));
  }

  atualizarRecorde(recorde) {
    $("menu-recorde").textContent = `${formatarNumero(recorde)} pts`;
  }

  definirQualidade(valor) {
    document.querySelectorAll(".opcao-qualidade").forEach((botao) => {
      const ativo = botao.dataset.qualidade === valor;
      botao.classList.toggle("ativa", ativo);
      botao.setAttribute("aria-checked", String(ativo));
      botao.setAttribute("role", "radio");
    });
  }

  aoTrocarQualidade(callback) {
    document.querySelectorAll(".opcao-qualidade").forEach((botao) => {
      botao.addEventListener("click", () => callback(botao.dataset.qualidade));
    });
  }

  definirSom(mudo) {
    const botao = $("botao-som");
    botao.classList.toggle("desligado", mudo);
    botao.setAttribute("aria-pressed", String(!mudo));
  }

  aoAlternarSom(callback) {
    $("botao-som").addEventListener("click", callback);
  }

  aoJogar(callback) {
    $("botao-jogar").addEventListener("click", callback);
  }

  aoAbrirModal(callbacks) {
    $("botao-como-jogar").addEventListener("click", callbacks.comoJogar);
    $("botao-ranking").addEventListener("click", callbacks.ranking);
    $("botao-configuracoes").addEventListener("click", callbacks.configuracoes);
  }

  abrirModal(titulo, html) {
    $("modal-titulo").textContent = titulo;
    $("modal-conteudo").innerHTML = html;
    this.mostrar("modal");
    $("modal-fechar").focus();
  }

  fecharModal() {
    this.esconder("modal");
  }

  // --- Introdução de fase ------------------------------------------------

  mostrarIntro(info, aoComecar) {
    $("intro-rotulo").textContent = info.rotulo;
    $("intro-titulo").textContent = info.titulo.toUpperCase();
    $("intro-objetivo").textContent = info.objetivo;
    $("intro-controles").textContent = info.controles;
    this._aoComecar = aoComecar;
    $("botao-comecar").onclick = () => this.confirmarIntro();
    this.mostrar("intro");
  }

  confirmarIntro() {
    if (!this.telaAberta("intro")) return;
    this.esconder("intro");
    if (this._aoComecar) this._aoComecar();
  }

  // --- 06 · Fase concluída -----------------------------------------------

  mostrarConcluida(resultado, dado, aoContinuar) {
    const estrelas = $("concluida-estrelas");
    estrelas.innerHTML = "";
    ESTRELAS.forEach(({ tamanho, cheia, topo }, i) => {
      const img = document.createElement("img");
      img.src = `assets/ui/${i < resultado.estrelas ? cheia : "estrela-3.svg"}`;
      img.alt = i < resultado.estrelas ? "Estrela conquistada" : "Estrela vazia";
      img.style.setProperty("--tamanho", tamanho);
      img.style.setProperty("--topo", topo);
      img.style.animationDelay = `${0.25 + i * 0.25}s`;
      estrelas.appendChild(img);
    });

    $("concluida-pontos").textContent = formatarNumero(resultado.pontos);
    $("concluida-combo").textContent = `x${resultado.comboMax}`;
    $("concluida-atp").textContent = `+${formatarNumero(resultado.atpGanho)}`;
    $("concluida-dado").textContent = dado;
    $("botao-ir-quiz").onclick = () => {
      this.esconder("concluida");
      aoContinuar();
    };
    this._soltarConfete();
    this.mostrar("concluida");
  }

  _soltarConfete() {
    const confete = $("confete");
    confete.innerHTML = "";
    for (let i = 0; i < 70; i++) {
      const papel = document.createElement("i");
      papel.style.left = `${Math.random() * 100}%`;
      papel.style.background = CORES_CONFETE[i % CORES_CONFETE.length];
      papel.style.color = CORES_CONFETE[i % CORES_CONFETE.length];
      papel.style.animationDelay = `${Math.random() * 2.5}s`;
      papel.style.animationDuration = `${3 + Math.random() * 3}s`;
      papel.style.setProperty("--giro", `${Math.random() * 720 - 360}deg`);
      confete.appendChild(papel);
    }
  }

  // --- 07 · Mini quiz ----------------------------------------------------

  // perguntas: [{pergunta, opcoes, correta, explicacao}]; aoAcertar(): dá o ATP; aoFim(): segue o jogo.
  mostrarQuiz(perguntas, { aoAcertar, aoFim, recompensa }) {
    this._quiz = { perguntas, indice: 0, aoAcertar, aoFim, recompensa, respondida: false };
    this._renderizarPergunta();
    this.mostrar("quiz");
    $("botao-quiz-proxima").onclick = () => this._proximaPergunta();
  }

  _renderizarPergunta() {
    const { perguntas, indice } = this._quiz;
    const pergunta = perguntas[indice];
    this._quiz.respondida = false;

    $("quiz-contador").textContent = `Pergunta ${indice + 1} de ${perguntas.length}`;
    [...$("quiz-segmentos").children].forEach((seg, i) => seg.classList.toggle("feito", i <= indice));
    $("quiz-pergunta").textContent = pergunta.pergunta;
    $("quiz-feedback").classList.add("oculto");

    const opcoes = $("quiz-opcoes");
    opcoes.innerHTML = "";
    pergunta.opcoes.forEach((texto, i) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "quiz-opcao";
      botao.innerHTML = `
        <span class="quiz-letra"><img src="assets/ui/quiz-letra.svg" alt="" /><b>${LETRAS[i]}</b></span>
        <span class="quiz-opcao-texto"></span>
        <span class="quiz-marca" aria-hidden="true"></span>`;
      botao.querySelector(".quiz-opcao-texto").textContent = texto;
      botao.addEventListener("click", () => this._responder(i));
      opcoes.appendChild(botao);
    });
  }

  // Também chamado pelas teclas 1–4 / A–D.
  responderQuiz(indice) {
    if (this.telaAberta("quiz") && this._quiz && !this._quiz.respondida) this._responder(indice);
  }

  _responder(escolhida) {
    const quiz = this._quiz;
    if (quiz.respondida) return;
    quiz.respondida = true;
    const pergunta = quiz.perguntas[quiz.indice];
    const acertou = escolhida === pergunta.correta;

    [...$("quiz-opcoes").children].forEach((botao, i) => {
      botao.disabled = true;
      const letra = botao.querySelector(".quiz-letra img");
      const marca = botao.querySelector(".quiz-marca");
      if (i === pergunta.correta) {
        botao.classList.add("certa");
        letra.src = "assets/ui/quiz-letra-certa.svg";
        marca.textContent = "✔";
      } else if (i === escolhida) {
        botao.classList.add("errada");
        letra.src = "assets/ui/quiz-letra-errada.svg";
        marca.textContent = "✖";
      }
    });

    const feedback = $("quiz-feedback");
    feedback.dataset.resultado = acertou ? "certo" : "errado";
    $("quiz-feedback-titulo").textContent = acertou
      ? `Correto! +${quiz.recompensa} ATP`
      : `Quase! A resposta é ${LETRAS[pergunta.correta]}`;
    $("quiz-feedback-texto").textContent = pergunta.explicacao;
    const ultima = quiz.indice === quiz.perguntas.length - 1;
    $("botao-quiz-proxima").textContent = ultima ? "CONTINUAR →" : "PRÓXIMA →";
    feedback.classList.remove("oculto");
    this.som.tocar(acertou ? "entregar" : "erro");
    if (acertou) quiz.aoAcertar();
    $("botao-quiz-proxima").focus();
  }

  _proximaPergunta() {
    const quiz = this._quiz;
    if (!quiz.respondida) return;
    quiz.indice += 1;
    if (quiz.indice >= quiz.perguntas.length) {
      this.esconder("quiz");
      quiz.aoFim();
      return;
    }
    this._renderizarPergunta();
  }

  // --- 08 · Loja ---------------------------------------------------------

  mostrarLoja(progresso, upgrades, { aoComprar, aoContinuar }) {
    this._loja = { progresso, upgrades, aoComprar, aoContinuar };
    this._renderizarLoja();
    $("botao-loja-continuar").onclick = () => this.continuarLoja();
    this.mostrar("loja");
  }

  _renderizarLoja() {
    const { progresso, upgrades, aoComprar } = this._loja;
    $("loja-saldo").textContent = `${formatarNumero(progresso.atp)} ATP`;
    const cartas = $("loja-cartas");
    cartas.innerHTML = "";
    upgrades.forEach((upgrade) => {
      const comprado = progresso.tem(upgrade.id);
      const semSaldo = !comprado && progresso.atp < upgrade.custo;
      const carta = document.createElement("div");
      carta.className = `carta-loja vidro cor-${upgrade.cor}${comprado ? " comprada" : ""}${semSaldo ? " sem-saldo" : ""}`;
      carta.innerHTML = `
        <span class="carta-icone"><img src="${upgrade.icone}" alt="" /><b>${upgrade.sigla}</b></span>
        <p class="carta-nome">${upgrade.nome}</p>
        <p class="carta-descricao">${upgrade.descricao}</p>
        <button type="button" class="carta-preco" ${comprado || semSaldo ? "disabled" : ""}>
          ${comprado ? "✔ COMPRADO" : `◉ ${upgrade.custo} ATP`}
        </button>`;
      carta.querySelector("button").addEventListener("click", () => {
        if (aoComprar(upgrade)) this._renderizarLoja();
      });
      cartas.appendChild(carta);
    });
  }

  continuarLoja() {
    if (!this.telaAberta("loja")) return;
    this.esconder("loja");
    this._loja.aoContinuar();
  }

  // --- Tela final --------------------------------------------------------

  mostrarFinal({ vitoria, pontos, recorde, novoRecorde, upgrades }, { aoJogarNovamente, aoMenu }) {
    $("final-titulo").textContent = vitoria ? "PROTOCOLO CONCLUÍDO" : "ENZIMA DESNATURADA";
    $("final-mensagem").textContent = vitoria
      ? "Você neutralizou o Radical Livre Supremo e manteve a célula funcionando. A bioquímica agradece!"
      : "Acabaram as vidas: a célula precisa de uma enzima nova. Tente de novo e use o que aprendeu!";
    $("final-pontos").textContent = formatarNumero(pontos);
    $("final-recorde").textContent = formatarNumero(recorde);
    $("final-upgrades").textContent = `${upgrades}/6`;
    $("final-selo").classList.toggle("oculto", !novoRecorde);
    $("botao-jogar-novamente").onclick = () => {
      this.esconder("final");
      aoJogarNovamente();
    };
    $("botao-final-menu").onclick = () => {
      this.esconder("final");
      aoMenu();
    };
    if (vitoria) this._soltarConfete();
    this.mostrar("final");
  }

  // --- Pausa -------------------------------------------------------------

  aoPausa({ continuar, reiniciar, menu }) {
    $("botao-continuar").addEventListener("click", continuar);
    $("botao-reiniciar-fase").addEventListener("click", reiniciar);
    $("botao-pausa-menu").addEventListener("click", menu);
  }

  aoBotaoPausa(callback) {
    $("botao-pausa").addEventListener("click", callback);
  }
}
