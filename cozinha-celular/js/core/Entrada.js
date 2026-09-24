// Captura teclado (WASD/setas + espaço), mouse e o joystick/botão de toque,
// expondo um vetor de movimento único (-1..1 em x e y), um evento de ação e
// eventos genéricos de tecla/clique para as fases que precisam de mais.

export class Entrada {
  constructor() {
    this.movimento = { x: 0, y: 0 };
    this.acaoPressionada = false;
    this._acaoOuvintes = [];
    this._teclaOuvintes = [];
    this._cliqueOuvintes = [];
    this.bloqueada = false; // true enquanto há uma tela por cima do jogo

    this._teclas = new Set();
    window.addEventListener("keydown", (e) => this._onTecla(e, true));
    window.addEventListener("keyup", (e) => this._onTecla(e, false));

    this._configurarJoystick();
    this._configurarBotaoAcao();
  }

  _onTecla(e, pressionada) {
    // Espaço/Enter num botão focado pertencem ao botão, não ao jogo.
    const emControle = e.target instanceof Element && e.target.closest("button, input, select");
    if (emControle && (e.key === " " || e.key === "Enter")) return;

    if (pressionada && !e.repeat) this._teclaOuvintes.forEach((cb) => cb(e));

    const teclasDeJogo = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", " "];
    if (!teclasDeJogo.includes(e.key)) return;
    e.preventDefault();

    if (e.key === " ") {
      if (pressionada && !this._teclas.has(" ") && !this.bloqueada) this._dispararAcao();
      pressionada ? this._teclas.add(" ") : this._teclas.delete(" ");
      return;
    }

    pressionada ? this._teclas.add(e.key) : this._teclas.delete(e.key);
    this._recalcularTeclado();
  }

  _recalcularTeclado() {
    const t = this._teclas;
    const cima = t.has("ArrowUp") || t.has("w") || t.has("W");
    const baixo = t.has("ArrowDown") || t.has("s") || t.has("S");
    const esquerda = t.has("ArrowLeft") || t.has("a") || t.has("A");
    const direita = t.has("ArrowRight") || t.has("d") || t.has("D");

    this._movimentoTeclado = {
      x: (direita ? 1 : 0) - (esquerda ? 1 : 0),
      y: (baixo ? 1 : 0) - (cima ? 1 : 0),
    };
    this._atualizarMovimentoFinal();
  }

  _configurarJoystick() {
    const base = document.getElementById("joystick-base");
    const alca = document.getElementById("joystick-alca");
    if (!base || !alca) return;

    this._movimentoToque = { x: 0, y: 0 };
    let ativo = false;
    let origemX = 0;
    let origemY = 0;
    const raioMax = 42;

    const posicionar = (dx, dy) => {
      const distancia = Math.min(raioMax, Math.hypot(dx, dy));
      const angulo = Math.atan2(dy, dx);
      const x = Math.cos(angulo) * distancia;
      const y = Math.sin(angulo) * distancia;
      alca.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      this._movimentoToque = { x: x / raioMax, y: y / raioMax };
      this._atualizarMovimentoFinal();
    };

    const iniciar = (evento) => {
      ativo = true;
      const rect = base.getBoundingClientRect();
      origemX = rect.left + rect.width / 2;
      origemY = rect.top + rect.height / 2;
      try {
        base.setPointerCapture(evento.pointerId);
      } catch (erro) {
        // Alguns navegadores recusam a captura em certas situações; o joystick
        // continua funcionando pelos eventos de pointermove no próprio elemento.
      }
    };

    const mover = (evento) => {
      if (!ativo) return;
      posicionar(evento.clientX - origemX, evento.clientY - origemY);
    };

    const soltar = () => {
      ativo = false;
      alca.style.transform = "translate(-50%, -50%)";
      this._movimentoToque = { x: 0, y: 0 };
      this._atualizarMovimentoFinal();
    };

    base.addEventListener("pointerdown", iniciar);
    base.addEventListener("pointermove", mover);
    base.addEventListener("pointerup", soltar);
    base.addEventListener("pointercancel", soltar);
  }

  _configurarBotaoAcao() {
    const botao = document.getElementById("botao-acao-toque");
    if (!botao) return;
    botao.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (!this.bloqueada) this._dispararAcao();
    });
  }

  _atualizarMovimentoFinal() {
    const teclado = this._movimentoTeclado || { x: 0, y: 0 };
    const toque = this._movimentoToque || { x: 0, y: 0 };
    let x = teclado.x + toque.x;
    let y = teclado.y + toque.y;
    const tamanho = Math.hypot(x, y);
    if (tamanho > 1) {
      x /= tamanho;
      y /= tamanho;
    }
    this.movimento.x = x;
    this.movimento.y = y;
  }

  // Qualquer tecla pressionada (sem repetição automática).
  aoTecla(callback) {
    this._teclaOuvintes.push(callback);
  }

  // Clique/toque no canvas, em coordenadas normalizadas (-1..1) para raycast.
  aoClicar(elemento, callback) {
    elemento.addEventListener("pointerdown", (e) => {
      if (this.bloqueada) return;
      const rect = elemento.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      callback({ x, y });
    });
  }

  // Zera o movimento (ex.: ao abrir uma tela) para a enzima não sair andando sozinha.
  soltarTudo() {
    this._teclas.clear();
    this._movimentoTeclado = { x: 0, y: 0 };
    this._atualizarMovimentoFinal();
  }

  // Registra uma função a ser chamada sempre que a ação (espaço / botão de toque) disparar.
  aoAcionar(callback) {
    this._acaoOuvintes.push(callback);
  }

  _dispararAcao() {
    this._acaoOuvintes.forEach((cb) => cb());
  }

  mostrarControlesDeToque() {
    const ehToque = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const painel = document.getElementById("controles-toque");
    if (painel && ehToque) {
      painel.classList.remove("oculto");
      document.body.classList.add("toque");
    }
  }
}
