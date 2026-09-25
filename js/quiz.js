// Quiz de Bioquímica (Figma: 09 · Quiz de Bioquímica).
// 10 perguntas embaralhadas (e as alternativas também). Escolher uma
// alternativa destaca em violeta; "Confirmar" mostra a certa em verde e a
// errada em vermelho; o anel de progresso anda (stroke-dashoffset). No fim,
// mensagem da faixa de pontuação + confete. Perguntas do quiz antigo do site.

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const LETRAS = ["A", "B", "C", "D"];

const PERGUNTAS = [
  {
    pergunta: "Qual biomolécula é responsável pelo armazenamento das informações genéticas?",
    opcoes: ["Proteínas", "Lipídios", "Ácidos Nucleicos", "Carboidratos"],
    correta: 2,
  },
  {
    pergunta: "Qual é a principal função dos carboidratos no organismo?",
    opcoes: ["Fornecer energia", "Armazenar informações genéticas", "Compor as membranas celulares", "Catalisar reações químicas"],
    correta: 0,
  },
  {
    pergunta: "As proteínas são formadas pela união de quais unidades básicas?",
    opcoes: ["Nucleotídeos", "Ácidos graxos", "Aminoácidos", "Monossacarídeos"],
    correta: 2,
  },
  {
    pergunta: "Qual biomolécula atua como reserva energética e compõe as membranas celulares?",
    opcoes: ["Lipídios", "Proteínas", "Ácidos Nucleicos", "Carboidratos"],
    correta: 0,
  },
  {
    pergunta: "Qual é o açúcar presente na molécula de DNA?",
    opcoes: ["Ribose", "Frutose", "Glicose", "Desoxirribose"],
    correta: 3,
  },
  {
    pergunta: "Qual é a principal função das enzimas nas reações químicas do organismo?",
    opcoes: ["Armazenar energia", "Acelerar reações sem serem consumidas", "Transportar oxigênio", "Formar a membrana celular"],
    correta: 1,
  },
  {
    pergunta: "O que significa a sigla ATP?",
    opcoes: ["Ácido Trifosfórico Proteico", "Adenosina Trifosfato", "Aminoácido de Transporte Proteico", "Ácido Tríplice de Prótons"],
    correta: 1,
  },
  {
    pergunta: "Qual processo celular é responsável pela produção de energia a partir dos nutrientes?",
    opcoes: ["Fotossíntese", "Mitose", "Respiração celular", "Replicação do DNA"],
    correta: 2,
  },
  {
    pergunta: "Quais são as quatro bases nitrogenadas presentes no DNA?",
    opcoes: [
      "Adenina, Guanina, Citosina e Timina",
      "Adenina, Guanina, Citosina e Uracila",
      "Glicose, Frutose, Sacarose e Lactose",
      "Alanina, Glicina, Serina e Valina",
    ],
    correta: 0,
  },
  {
    pergunta: "Qual grupo de biomoléculas é essencial para o crescimento, a defesa do organismo e a formação de tecidos?",
    opcoes: ["Carboidratos", "Proteínas", "Lipídios", "Ácidos Nucleicos"],
    correta: 1,
  },
];

// Faixas de pontuação (a antiga "8-10" virou "9-10" para não repetir o 8).
const FAIXAS = [
  { min: 9, id: "alta", titulo: "9-10 acertos", cor: "var(--teal)", mensagem: "Excelente desempenho! Seu conhecimento sobre bioquímica está acima da média." },
  { min: 6, id: "media", titulo: "6-8 acertos", cor: "var(--amber)", mensagem: "Bom trabalho! Você já domina diversos conceitos importantes da bioquímica." },
  { min: 0, id: "baixa", titulo: "0-5 acertos", cor: "var(--danger)", mensagem: "Você está começando sua jornada na bioquímica. Continue estudando e tente novamente!" },
];

function embaralhar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Embaralha as perguntas e a ordem das alternativas de cada uma.
function montarRodada() {
  return embaralhar(PERGUNTAS).map((p) => {
    const ordem = embaralhar([0, 1, 2, 3]);
    return { pergunta: p.pergunta, opcoes: ordem.map((i) => p.opcoes[i]), correta: ordem.indexOf(p.correta) };
  });
}

const cartao = document.querySelector("[data-quiz]");
if (cartao) iniciarQuiz();

function iniciarQuiz() {
  const anel = document.querySelector("[data-anel]");
  const contador = document.querySelector("[data-contador]");
  const faixas = document.querySelectorAll("[data-faixa]");
  const total = PERGUNTAS.length;

  let perguntas = montarRodada();
  let indice = 0;
  let escolhida = null;
  let confirmada = false;
  let respostas = []; // { acertou, pulou }

  function atualizarProgresso(respondidas) {
    anel.style.setProperty("--progresso", respondidas / total);
    contador.textContent = `${respondidas}/${total}`;
  }

  function mostrarPergunta() {
    const p = perguntas[indice];
    escolhida = null;
    confirmada = false;
    const porcento = Math.round(((indice + 1) / total) * 100);
    cartao.innerHTML = `
      <div class="cartao-pergunta__topo"><span>Pergunta ${indice + 1} de ${total}</span><strong>${porcento}%</strong></div>
      <div class="barra-quiz" role="progressbar" aria-valuenow="${indice + 1}" aria-valuemin="1" aria-valuemax="${total}" aria-label="Progresso do quiz">
        <div class="barra-quiz__preenchimento" style="width:${(indice / total) * 100}%"></div>
      </div>
      <h2 class="cartao-pergunta__pergunta" id="pergunta-atual">${p.pergunta}</h2>
      <div class="alternativas" role="radiogroup" aria-labelledby="pergunta-atual">
        ${p.opcoes
          .map(
            (texto, i) => `
          <button class="alternativa" type="button" role="radio" aria-checked="false" data-alternativa="${i}">
            <span class="alternativa__letra">${LETRAS[i]}</span>
            <span class="alternativa__texto">${texto}</span>
            <span class="alternativa__marca" aria-hidden="true"></span>
          </button>`
          )
          .join("")}
      </div>
      <p class="cartao-pergunta__retorno" data-retorno aria-live="polite"></p>
      <div class="cartao-pergunta__rodape">
        <button class="cartao-pergunta__pular" type="button" data-pular>Pular</button>
        <button class="btn btn--primary" type="button" data-avancar disabled>Confirmar <span class="btn__seta" aria-hidden="true">→</span></button>
      </div>`;
    cartao.classList.remove("cartao-pergunta--entra");
    void cartao.offsetWidth;
    cartao.classList.add("cartao-pergunta--entra");
    // A barra anda até a pergunta atual depois de desenhada (para animar).
    requestAnimationFrame(() => {
      const barra = cartao.querySelector(".barra-quiz__preenchimento");
      if (barra) barra.style.width = `${porcento}%`;
    });
  }

  function escolher(botao) {
    if (confirmada) return;
    escolhida = Number(botao.dataset.alternativa);
    cartao.querySelectorAll("[data-alternativa]").forEach((b) => b.setAttribute("aria-checked", String(b === botao)));
    cartao.querySelector("[data-avancar]").disabled = false;
  }

  function confirmar(pulou = false) {
    const p = perguntas[indice];
    confirmada = true;
    const acertou = !pulou && escolhida === p.correta;
    respostas.push({ acertou, pulou, pergunta: p.pergunta, certa: p.opcoes[p.correta] });

    cartao.querySelectorAll("[data-alternativa]").forEach((b) => {
      const i = Number(b.dataset.alternativa);
      b.disabled = true;
      b.setAttribute("aria-checked", "false");
      if (i === p.correta) b.classList.add("certa");
      else if (i === escolhida) b.classList.add("errada");
    });

    const retorno = cartao.querySelector("[data-retorno]");
    retorno.classList.toggle("errou", !acertou);
    retorno.innerHTML = acertou
      ? "<strong>Acertou!</strong> Muito bem."
      : `<strong>${pulou ? "Pulada." : "Não foi dessa vez."}</strong> A resposta certa é: ${p.opcoes[p.correta]}.`;

    atualizarProgresso(respostas.length);
    cartao.querySelector("[data-pular]").hidden = true;
    const avancar = cartao.querySelector("[data-avancar]");
    avancar.disabled = false;
    const ultima = indice === total - 1;
    avancar.innerHTML = `${ultima ? "Ver resultado" : "Próxima"} <span class="btn__seta" aria-hidden="true">→</span>`;
    avancar.focus({ preventScroll: true });
  }

  function proxima() {
    if (indice < total - 1) {
      indice++;
      mostrarPergunta();
    } else {
      mostrarResultado();
    }
  }

  function mostrarResultado() {
    const acertos = respostas.filter((r) => r.acertou).length;
    const faixa = FAIXAS.find((f) => acertos >= f.min);
    faixas.forEach((el) => el.classList.toggle("alcancada", el.dataset.faixa === faixa.id));

    cartao.innerHTML = `
      <div class="resultado-quiz" style="--cor-faixa:${faixa.cor}">
        <span class="eyebrow"><span class="eyebrow__ponto" aria-hidden="true"><img src="assets/ui/pulse-dot.svg" alt="" /></span>Resultado</span>
        <p class="resultado-quiz__nota" aria-label="${acertos} de ${total} acertos">${acertos}/${total}</p>
        <h2 class="resultado-quiz__faixa">${faixa.titulo}</h2>
        <p class="resultado-quiz__mensagem">${faixa.mensagem}</p>
        <ol class="resultado-quiz__revisao" role="list">
          ${respostas
            .map(
              (r) =>
                `<li class="${r.acertou ? "" : "errou"}"><span>${r.acertou ? "✓" : "✕"}</span><span>${r.pergunta}${
                  r.acertou ? "" : `<small>Resposta certa: ${r.certa}</small>`
                }</span></li>`
            )
            .join("")}
        </ol>
        <div class="resultado-quiz__botoes">
          <button class="btn btn--primary" type="button" data-refazer>Refazer quiz <span class="btn__seta" aria-hidden="true">↻</span></button>
          <a class="btn btn--ghost" href="biolab.html">Jogar o Fluxo <span class="btn__seta" aria-hidden="true">▶</span></a>
        </div>
      </div>`;
    cartao.querySelector("[data-refazer]").focus({ preventScroll: true });
    confete(acertos);
  }

  function reiniciar() {
    perguntas = montarRodada();
    indice = 0;
    respostas = [];
    faixas.forEach((el) => el.classList.remove("alcancada"));
    atualizarProgresso(0);
    mostrarPergunta();
    document.querySelector("#quiz")?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
  }

  // Confete de moléculas (mais confete quanto melhor o resultado).
  function confete(acertos) {
    if (reduzido || acertos < 6) return;
    const simbolos = ["🧬", "⚛️", "🧪", "💧", "⚗️", "✦"];
    const camada = document.createElement("div");
    camada.className = "confete-quiz";
    camada.setAttribute("aria-hidden", "true");
    cartao.appendChild(camada);
    const quantidade = acertos >= 9 ? 50 : 26;
    for (let i = 0; i < quantidade; i++) {
      const peca = document.createElement("span");
      peca.textContent = simbolos[i % simbolos.length];
      peca.style.left = `${Math.random() * 100}%`;
      const altura = cartao.offsetHeight + 60;
      peca.animate(
        [
          { transform: "translateY(0) rotate(0deg)", opacity: 1 },
          { transform: `translateY(${altura}px) rotate(${Math.random() * 540 - 270}deg)`, opacity: 0.2 },
        ],
        { duration: 1800 + Math.random() * 1600, delay: Math.random() * 700, easing: "cubic-bezier(.3,.6,.6,1)", fill: "both" }
      );
      camada.appendChild(peca);
    }
    setTimeout(() => camada.remove(), 4300);
  }

  // Eventos
  cartao.addEventListener("click", (e) => {
    const alternativa = e.target.closest("[data-alternativa]");
    if (alternativa) return escolher(alternativa);
    if (e.target.closest("[data-pular]")) return confirmar(true);
    if (e.target.closest("[data-avancar]")) return confirmada ? proxima() : confirmar();
    if (e.target.closest("[data-refazer]")) reiniciar();
  });

  // Teclado: 1–4 ou A–D escolhem; Enter confirma/avança.
  cartao.addEventListener("keydown", (e) => {
    const tecla = e.key.toUpperCase();
    const i = LETRAS.includes(tecla) ? LETRAS.indexOf(tecla) : "1234".indexOf(e.key);
    const botao = i >= 0 && cartao.querySelector(`[data-alternativa="${i}"]`);
    if (botao && !confirmada) {
      escolher(botao);
      botao.focus();
    }
  });

  document.querySelector("[data-comecar-quiz]")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelector("#quiz")?.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
    setTimeout(() => cartao.querySelector("[data-alternativa]")?.focus({ preventScroll: true }), reduzido ? 0 : 500);
  });

  atualizarProgresso(0);
  mostrarPergunta();
}
