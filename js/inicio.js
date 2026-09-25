// Interações da página Início (Figma: 02 · Início — Explore o conteúdo):
// lista de aplicações com prévia flutuante, flip cards e o mini-quiz
// "Verdadeiro ou falso" com 5 perguntas.

const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const temMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

listaDeAplicacoes();
flipCards();
miniQuiz();

// --- Lista interativa: linha acende no hover + prévia do ícone segue o mouse ---
function listaDeAplicacoes() {
  const lista = document.querySelector("[data-aplicacoes]");
  if (!lista) return;
  const itens = [...lista.querySelectorAll(".aplicacao")];

  // A linha "ativa" acompanha o hover (a primeira começa acesa, como no Figma).
  itens.forEach((item) =>
    item.addEventListener("pointerenter", () => {
      itens.forEach((i) => i.classList.toggle("ativa", i === item));
    })
  );

  if (!temMouse || reduzido) return;

  const previa = document.createElement("div");
  previa.className = "aplicacoes__previa";
  previa.setAttribute("aria-hidden", "true");
  previa.innerHTML = '<img alt="" />';
  document.body.appendChild(previa);
  const imagem = previa.querySelector("img");

  let alvoX = 0;
  let alvoY = 0;
  let x = 0;
  let y = 0;
  let rodando = false;

  const seguir = () => {
    x += (alvoX - x) * 0.18;
    y += (alvoY - y) * 0.18;
    previa.style.transform = `translate(${x + 24}px, ${y - 60}px)`;
    if (previa.classList.contains("visivel") || Math.abs(alvoX - x) > 0.5) requestAnimationFrame(seguir);
    else rodando = false;
  };

  itens.forEach((item) => {
    item.addEventListener("pointerenter", (e) => {
      imagem.src = item.querySelector(".aplicacao__icone img").src;
      if (!previa.classList.contains("visivel")) {
        x = alvoX = e.clientX;
        y = alvoY = e.clientY;
      }
      previa.classList.add("visivel");
      if (!rodando) {
        rodando = true;
        requestAnimationFrame(seguir);
      }
    });
    item.addEventListener("pointermove", (e) => {
      alvoX = e.clientX;
      alvoY = e.clientY;
    });
  });
  lista.addEventListener("pointerleave", () => previa.classList.remove("visivel"));
}

// --- Flip cards: clique vira 180° no eixo Y --------------------------------------
function flipCards() {
  document.querySelectorAll(".flip__botao").forEach((botao) => {
    botao.addEventListener("click", () => {
      const card = botao.closest(".flip");
      const virado = card.classList.toggle("virado");
      botao.setAttribute("aria-pressed", String(virado));
    });
  });
}

// --- Mini-quiz: 5 perguntas de verdadeiro ou falso -------------------------------
const PERGUNTAS = [
  {
    frase: "Enzimas são consumidas nas reações que aceleram.",
    resposta: false,
    explicacao: "As enzimas não são consumidas: saem intactas da reação e podem ser usadas várias vezes.",
  },
  {
    frase: "Proteínas são formadas pela união de aminoácidos.",
    resposta: true,
    explicacao: "Os aminoácidos se ligam por ligações peptídicas e formam as cadeias das proteínas.",
  },
  {
    frase: "Os lipídios não têm nenhuma função nas membranas celulares.",
    resposta: false,
    explicacao: "Os fosfolipídios formam a bicamada que é a base de todas as membranas celulares.",
  },
  {
    frase: "A glicose é um carboidrato usado pelas células como fonte de energia.",
    resposta: true,
    explicacao: "Na respiração celular, a glicose é quebrada e a energia fica guardada em moléculas de ATP.",
  },
  {
    frase: "O DNA é formado por aminoácidos.",
    resposta: false,
    explicacao: "O DNA é um ácido nucleico, formado por nucleotídeos — os aminoácidos formam as proteínas.",
  },
];

function miniQuiz() {
  const card = document.querySelector("[data-mini-quiz]");
  if (!card) return;
  const contador = card.querySelector("[data-quiz-contador]");
  const pergunta = card.querySelector("[data-quiz-pergunta]");
  const dica = card.querySelector("[data-quiz-dica]");
  const acoes = card.querySelector("[data-quiz-acoes]");

  let indice = 0;
  let acertos = 0;

  const mostrarPergunta = () => {
    const p = PERGUNTAS[indice];
    card.classList.remove("acertou", "errou");
    contador.textContent = `Teste rápido · ${indice + 1}/${PERGUNTAS.length}`;
    pergunta.textContent = `“${p.frase}”`;
    dica.className = "quiz-card__dica";
    dica.textContent = "Verdadeiro ou falso? Responda e veja a explicação na hora.";
    acoes.innerHTML = `
      <button class="quiz-botao" type="button" data-resposta="true">Verdadeiro</button>
      <button class="quiz-botao quiz-botao--falso" type="button" data-resposta="false">Falso</button>`;
  };

  const responder = (botao) => {
    const p = PERGUNTAS[indice];
    const certo = (botao.dataset.resposta === "true") === p.resposta;
    if (certo) acertos++;

    acoes.querySelectorAll("[data-resposta]").forEach((b) => (b.disabled = true));
    botao.classList.add("escolhido");

    // Reinicia a animação de tremer caso o card já tenha errado antes.
    card.classList.remove("acertou", "errou");
    void card.offsetWidth;
    card.classList.add(certo ? "acertou" : "errou");
    if (certo) confete(card);

    dica.className = "quiz-card__explicacao";
    dica.innerHTML = `<strong>${certo ? "Acertou!" : "Não foi dessa vez."}</strong> ${
      p.resposta ? "É verdadeiro." : "É falso."
    } ${p.explicacao}`;

    const ultima = indice === PERGUNTAS.length - 1;
    const seguir = document.createElement("button");
    seguir.type = "button";
    seguir.className = "btn btn--primary";
    seguir.dataset.proxima = "";
    seguir.innerHTML = `${ultima ? "Ver resultado" : "Próxima"} <span class="btn__seta" aria-hidden="true">→</span>`;
    acoes.appendChild(seguir);
    seguir.focus({ preventScroll: true });
  };

  const mostrarResultado = () => {
    card.classList.remove("errou");
    card.classList.toggle("acertou", acertos >= 3);
    contador.textContent = "Resultado";
    pergunta.textContent = `Você acertou ${acertos} de ${PERGUNTAS.length}!`;
    dica.className = "quiz-card__dica";
    dica.textContent =
      acertos === PERGUNTAS.length
        ? "Perfeito! Que tal colocar isso em prática no Fluxo?"
        : "Bom treino! Revise as biomoléculas e depois teste tudo no Fluxo.";
    acoes.innerHTML = `
      <a class="btn btn--primary" href="biolab.html">Jogar o Fluxo <span class="btn__seta" aria-hidden="true">→</span></a>
      <button class="btn btn--ghost" type="button" data-reiniciar>Jogar de novo <span class="btn__seta" aria-hidden="true">↻</span></button>`;
    if (acertos === PERGUNTAS.length) confete(card);
  };

  acoes.addEventListener("click", (e) => {
    const alvo = e.target.closest("button");
    if (!alvo) return;
    if ("resposta" in alvo.dataset) responder(alvo);
    else if ("proxima" in alvo.dataset) {
      indice++;
      if (indice < PERGUNTAS.length) mostrarPergunta();
      else mostrarResultado();
    } else if ("reiniciar" in alvo.dataset) {
      indice = 0;
      acertos = 0;
      mostrarPergunta();
    }
  });
}

// Confete de moléculas saindo do centro do card.
function confete(card) {
  if (reduzido) return;
  const simbolos = ["🧬", "⚛️", "🧪", "💧", "⚗️", "✦"];
  const camada = document.createElement("div");
  camada.className = "confete";
  camada.setAttribute("aria-hidden", "true");
  card.appendChild(camada);

  for (let i = 0; i < 26; i++) {
    const peca = document.createElement("span");
    peca.textContent = simbolos[i % simbolos.length];
    const angulo = Math.random() * Math.PI * 2;
    const distancia = 140 + Math.random() * 260;
    const dx = Math.cos(angulo) * distancia;
    const dy = Math.sin(angulo) * distancia * 0.6 - 60;
    peca.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.4) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${Math.random() * 540 - 270}deg)`, opacity: 1, offset: 0.7 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 80}px)) scale(0.8)`, opacity: 0 },
      ],
      { duration: 1300 + Math.random() * 600, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }
    );
    camada.appendChild(peca);
  }
  setTimeout(() => camada.remove(), 2100);
}
