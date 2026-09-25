// Página de entrada do jogo Cozinha Celular (Figma: 15 · Cozinha Celular).
// Mostra o recorde salvo pelo jogo e deixa escolher a qualidade gráfica —
// os dois ficam no localStorage com o mesmo prefixo que o jogo usa, então a
// escolha feita aqui já vale quando o jogo abrir (e vice-versa).

const PREFIXO = "codigo-celular:"; // prefixo das chaves do jogo (mantido para não perder recordes)

function ler(chave, padrao) {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    return bruto === null ? padrao : JSON.parse(bruto);
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: a escolha vale só nesta visita */
  }
}

particulas();
recorde();
qualidade();

// Partículas do hero nas posições do Figma (4 tipos de pontinho).
function particulas() {
  const camada = document.querySelector("[data-particulas]");
  if (!camada) return;
  const pontos = [
    [0, 0, 1], [173, 97, 2], [346, 194, 3], [519, 291, 2], [692, 388, 3], [865, 485, 4], [1038, 582, 3],
    [1211, 679, 2], [1384, 776, 3], [117, 873, 2], [290, 70, 1], [463, 167, 2], [636, 264, 3], [809, 361, 2],
    [982, 458, 3], [1155, 555, 4], [1328, 652, 3], [61, 749, 2], [234, 846, 3], [407, 43, 2], [580, 140, 1],
    [753, 237, 2], [926, 334, 3], [1099, 431, 2], [1272, 528, 3], [5, 625, 4], [178, 722, 3], [351, 819, 2],
    [524, 16, 3], [697, 113, 2], [870, 210, 1], [1043, 307, 2], [1216, 404, 3], [1389, 501, 2], [122, 598, 3],
    [295, 695, 4], [468, 792, 3], [641, 889, 2], [814, 86, 3], [987, 183, 2],
  ];
  camada.innerHTML = pontos
    .map(([x, y, tipo], i) => {
      const tamanho = tipo === 1 || tipo === 3 ? 4 : 11;
      return `<img src="assets/cozinha/particula-${tipo}.svg" alt="" style="left:${x}px;top:${y}px;width:${tamanho}px;height:${tamanho}px;--d:${5 + (i % 5)}s;animation-delay:-${i % 7}s" />`;
    })
    .join("");
}

function recorde() {
  const alvo = document.querySelector("[data-recorde]");
  if (!alvo) return;
  const pontos = Number(ler("recorde", 0)) || 0;
  alvo.textContent = pontos > 0 ? `${pontos.toLocaleString("pt-BR")} pts` : "— pts";
}

// Seletor Baixa / Média / Alta (mesma configuração do menu do jogo).
function qualidade() {
  const grupo = document.querySelector("[data-qualidade]");
  if (!grupo) return;
  const botoes = [...grupo.querySelectorAll("[data-valor]")];
  const marcar = (valor) => botoes.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.valor === valor)));
  marcar(ler("qualidade", "alta"));

  grupo.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-valor]");
    if (!botao) return;
    gravar("qualidade", botao.dataset.valor);
    marcar(botao.dataset.valor);
  });

  // Setas mudam a opção (padrão de radiogroup).
  grupo.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const atual = botoes.findIndex((b) => b.getAttribute("aria-checked") === "true");
    const proximo = botoes[(atual + (e.key === "ArrowRight" ? 1 : botoes.length - 1)) % botoes.length];
    proximo.click();
    proximo.focus();
    e.preventDefault();
  });
}
