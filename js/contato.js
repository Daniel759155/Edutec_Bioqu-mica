// Página Quem Somos e Contato (Figma: 10 · Quem Somos e Contato):
// formulário com validação em tempo real (envio pelo aplicativo de e-mail,
// via mailto:) e cards de contato que copiam o valor ao clicar.

const DESTINO = "bioquimica22ati@gmail.com";

formulario();
cardsQueCopiam();

// --- Formulário -------------------------------------------------------------
const MENSAGENS = {
  nome: "Conte pra gente como você se chama.",
  email: "Digite um e-mail válido, como voce@email.com.",
  assunto: "Diga sobre o que quer falar.",
  mensagem: "Escreva sua mensagem (pelo menos 10 caracteres).",
};

function formulario() {
  const form = document.querySelector("[data-formulario]");
  if (!form) return;
  const aviso = form.querySelector("[data-aviso]");
  const botao = form.querySelector("[data-enviar]");
  const textoOriginal = botao.innerHTML;

  const validar = (entrada, mostrarErro = true) => {
    const campo = entrada.closest(".campo");
    const valor = entrada.value.trim();
    let ok = entrada.checkValidity() && valor !== "";
    if (entrada.name === "mensagem") ok = ok && valor.length >= 10;
    campo.classList.toggle("valido", ok);
    if (mostrarErro) campo.classList.toggle("invalido", !ok);
    const erro = campo.querySelector(".campo__erro");
    if (erro) erro.textContent = !ok && mostrarErro ? MENSAGENS[entrada.name] : "";
    entrada.setAttribute("aria-invalid", String(!ok && mostrarErro));
    return ok;
  };

  // Validação em tempo real: ao sair do campo e, depois disso, a cada tecla.
  form.addEventListener("focusout", (e) => {
    if (e.target.matches(".campo__entrada") && e.target.value !== "") {
      e.target.dataset.tocado = "";
      validar(e.target);
    }
  });
  form.addEventListener("input", (e) => {
    if (!e.target.matches(".campo__entrada")) return;
    validar(e.target, "tocado" in e.target.dataset);
    if (botao.classList.contains("enviado")) {
      botao.classList.remove("enviado");
      botao.innerHTML = textoOriginal;
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const entradas = [...form.querySelectorAll(".campo__entrada")];
    const invalidas = entradas.filter((entrada) => {
      entrada.dataset.tocado = "";
      return !validar(entrada);
    });
    if (invalidas.length) {
      aviso.classList.remove("sucesso");
      aviso.textContent = "Confira os campos destacados.";
      invalidas[0].focus();
      return;
    }

    const { nome, email, assunto, mensagem } = Object.fromEntries(new FormData(form));
    const corpo = `${mensagem.trim()}\n\n—\n${nome.trim()}\n${email.trim()}`;
    window.location.href = `mailto:${DESTINO}?subject=${encodeURIComponent(assunto.trim())}&body=${encodeURIComponent(corpo)}`;

    // Sucesso: o botão vira um ✓ desenhado.
    botao.classList.add("enviado");
    botao.innerHTML =
      '<svg class="check" viewBox="0 0 26 26" aria-hidden="true"><path d="M5 13.5 L10.5 19 L21 7.5" /></svg><span class="sr-only">Mensagem pronta</span>';
    aviso.classList.add("sucesso");
    aviso.textContent = "Pronto! Seu aplicativo de e-mail abriu com a mensagem — é só enviar.";
  });
}

// --- Cards de contato: clique copia o valor ("Copiado!") ---------------------
function cardsQueCopiam() {
  document.querySelectorAll("[data-copiar]").forEach((card) => {
    card.addEventListener("click", async () => {
      const valor = card.dataset.copiar;
      const etiqueta = card.querySelector(".contato-card__copiado");
      try {
        await navigator.clipboard.writeText(valor);
        etiqueta.textContent = "Copiado!";
      } catch {
        etiqueta.textContent = "Selecionado";
        // Sem permissão para a área de transferência: seleciona o texto.
        const faixa = document.createRange();
        faixa.selectNodeContents(card.querySelector(".contato-card__valor"));
        getSelection().removeAllRanges();
        getSelection().addRange(faixa);
      }
      card.classList.add("copiado");
      clearTimeout(card._timer);
      card._timer = setTimeout(() => card.classList.remove("copiado"), 1600);
    });
  });
}
