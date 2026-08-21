document.addEventListener("DOMContentLoaded", function () {
  var quizCard = document.getElementById("quiz-card");
  var quizApp = document.getElementById("quiz-app");
  var startBtn = document.getElementById("quiz-start-btn");
  var progressRing = document.getElementById("quiz-progress-ring");
  var progressCount = document.getElementById("quiz-progress-count");

  if (!quizCard || !quizApp) return;

  var QUESTIONS_BASE = [
    {
      question: "Qual biomolécula é responsável pelo armazenamento das informações genéticas?",
      options: ["Proteínas", "Lipídios", "Ácidos Nucleicos", "Carboidratos"],
      correct: 2,
    },
    {
      question: "Qual é a principal função dos carboidratos no organismo?",
      options: ["Fornecer energia", "Armazenar informações genéticas", "Compor as membranas celulares", "Catalisar reações químicas"],
      correct: 0,
    },
    {
      question: "As proteínas são formadas pela união de quais unidades básicas?",
      options: ["Nucleotídeos", "Ácidos graxos", "Aminoácidos", "Monossacarídeos"],
      correct: 2,
    },
    {
      question: "Qual biomolécula atua como reserva energética e compõe as membranas celulares?",
      options: ["Lipídios", "Proteínas", "Ácidos Nucleicos", "Carboidratos"],
      correct: 0,
    },
    {
      question: "Qual é o açúcar presente na molécula de DNA?",
      options: ["Ribose", "Frutose", "Glicose", "Desoxirribose"],
      correct: 3,
    },
    {
      question: "Qual é a principal função das enzimas nas reações químicas do organismo?",
      options: ["Armazenar energia", "Acelerar reações sem serem consumidas", "Transportar oxigênio", "Formar a membrana celular"],
      correct: 1,
    },
    {
      question: "O que significa a sigla ATP?",
      options: ["Ácido Trifosfórico Proteico", "Adenosina Trifosfato", "Aminoácido de Transporte Proteico", "Ácido Tríplice de Prótons"],
      correct: 1,
    },
    {
      question: "Qual processo celular é responsável pela produção de energia a partir dos nutrientes?",
      options: ["Fotossíntese", "Mitose", "Respiração celular", "Replicação do DNA"],
      correct: 2,
    },
    {
      question: "Quais são as quatro bases nitrogenadas presentes no DNA?",
      options: ["Adenina, Guanina, Citosina e Timina", "Adenina, Guanina, Citosina e Uracila", "Glicose, Frutose, Sacarose e Lactose", "Alanina, Glicina, Serina e Valina"],
      correct: 0,
    },
    {
      question: "Qual grupo de biomoléculas é essencial para o crescimento, a defesa do organismo e a formação de tecidos?",
      options: ["Carboidratos", "Proteínas", "Lipídios", "Ácidos Nucleicos"],
      correct: 1,
    },
  ];

  var LETTERS = ["A", "B", "C", "D"];
  var total = QUESTIONS_BASE.length;
  var currentIndex = 0;
  var answers = new Array(total).fill(null);
  var questions = shuffle(QUESTIONS_BASE.slice()).map(shuffleOptions);

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  function shuffleOptions(q) {
    var order = shuffle([0, 1, 2, 3]);
    return {
      question: q.question,
      options: order.map(function (i) {
        return q.options[i];
      }),
      correct: order.indexOf(q.correct),
    };
  }

  function renderQuestion(index) {
    var q = questions[index];
    var percent = Math.round(((index + 1) / total) * 100);
    var isLast = index === total - 1;
    var selected = answers[index];

    var optionsHtml = q.options
      .map(function (opt, i) {
        var selectedClass = selected === i ? " is-selected" : "";
        return (
          '<button type="button" class="quiz-option' +
          selectedClass +
          '" data-index="' +
          i +
          '">' +
          '<span class="quiz-option-radio"></span>' +
          '<span class="quiz-option-text">' +
          LETTERS[i] +
          ") " +
          opt +
          "</span></button>"
        );
      })
      .join("");

    quizCard.innerHTML =
      '<div class="quiz-progress-row">' +
      "<span>Pergunta " +
      (index + 1) +
      " de " +
      total +
      "</span>" +
      '<span class="quiz-progress-percent">' +
      percent +
      "%</span></div>" +
      '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width: ' +
      percent +
      '%"></div></div>' +
      '<p class="quiz-question">' +
      q.question +
      "</p>" +
      '<div class="quiz-options" role="radiogroup">' +
      optionsHtml +
      "</div>" +
      '<div class="quiz-footer-row">' +
      '<button type="button" class="quiz-next-btn" id="quiz-next-btn"' +
      (selected === null ? " disabled" : "") +
      ">" +
      (isLast ? "VER RESULTADO" : "PRÓXIMA") +
      ' <img src="assets/icons/arrow-white.svg" alt="" /></button></div>';

    if (progressCount) progressCount.textContent = index + 1 + "/" + total;
    if (progressRing) progressRing.style.setProperty("--progress", percent + "%");

    quizCard.querySelectorAll(".quiz-option").forEach(function (btn) {
      btn.addEventListener("click", function () {
        answers[index] = Number(btn.dataset.index);
        renderQuestion(index);
      });
    });

    var nextBtn = document.getElementById("quiz-next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (isLast) {
          showResults();
        } else {
          currentIndex += 1;
          renderQuestion(currentIndex);
        }
      });
    }
  }

  function showResults() {
    var score = answers.reduce(function (acc, ans, i) {
      return acc + (ans === questions[i].correct ? 1 : 0);
    }, 0);

    var title, message;
    if (score >= 9) {
      title = "9-10 acertos";
      message = "Excelente desempenho! Seu conhecimento sobre bioquímica está acima da média.";
    } else if (score >= 6) {
      title = "6-8 acertos";
      message = "Bom trabalho! Você já domina diversos conceitos importantes da bioquímica.";
    } else {
      title = "0-5 acertos";
      message = "Você está começando sua jornada na bioquímica. Continue estudando e tente novamente!";
    }

    quizCard.innerHTML =
      '<div class="quiz-result">' +
      '<p class="quiz-result-score">' +
      score +
      "/" +
      total +
      "</p>" +
      '<p class="quiz-result-title">' +
      title +
      "</p>" +
      '<p class="quiz-result-message">' +
      message +
      "</p>" +
      '<button type="button" class="quiz-restart-btn" id="quiz-restart-btn">REFAZER QUIZ</button></div>';

    if (progressCount) progressCount.textContent = total + "/" + total;
    if (progressRing) progressRing.style.setProperty("--progress", "100%");

    var restartBtn = document.getElementById("quiz-restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        questions = shuffle(QUESTIONS_BASE.slice()).map(shuffleOptions);
        answers = new Array(total).fill(null);
        currentIndex = 0;
        renderQuestion(currentIndex);
        quizApp.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  if (startBtn) {
    startBtn.addEventListener("click", function () {
      quizApp.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  renderQuestion(currentIndex);
});
