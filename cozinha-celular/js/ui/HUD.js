// HUD das fases (HTML por cima do canvas): pontos, cronômetro, ATP, vidas e
// os painéis específicos de cada fase, além dos textos flutuantes ("+150",
// "COMBO x3") projetados a partir de posições 3D.

import { FAIXA_TEMPERATURA, FAIXA_PH, LIMITES_TEMPERATURA } from "../fases/Fase3Laboratorio.js";

const CIRCUNFERENCIA_CRONOMETRO = 2 * Math.PI * 69;
const CORES_CRONOMETRO = {
  ribossomo: { arco: "#4dff9a", trilho: "assets/ui/timer-trilho-f1.svg" },
  mitocondria: { arco: "#ffb23d", trilho: "assets/ui/timer-trilho-f2.svg" },
  laboratorio: { arco: "#4dff9a", trilho: "assets/ui/timer-trilho-f2.svg" },
  chefao: { arco: "#ff5c7a", trilho: "assets/ui/timer-trilho-f2.svg" },
};
const TEMAS_PEDIDO = ["verde", "laranja"];
const NOMES_POWERUP = { nad: "NAD⁺", mg: "Mg²⁺" };

export function formatarNumero(valor) {
  return Math.round(valor).toLocaleString("pt-BR");
}

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(cameraSeguidora) {
    this.camera = cameraSeguidora;
    this.raiz = $("hud");
    this.camadaPopups = $("camada-popups");
    this.el = {
      pontos: $("hud-pontos"),
      combo: $("hud-combo"),
      tempo: $("hud-tempo"),
      arco: $("hud-cron-arco"),
      trilho: $("hud-cron-trilho"),
      faseRotulo: $("hud-fase-rotulo"),
      atp: $("hud-atp"),
      vidas: $("hud-vidas"),
      vidasChefe: $("hud-vidas-chefe"),
      pedidos: $("hud-pedidos"),
      powerups: $("hud-powerups"),
      objetivo: $("hud-objetivo"),
      etapasFluxo: [...document.querySelectorAll(".fluxo-etapa")],
      termometroTubo: $("termometro-tubo"),
      termometroFaixa: $("termometro-faixa"),
      termometroLiquido: $("termometro-liquido"),
      termometroIdeal: $("termometro-ideal"),
      termometroValor: $("termometro-valor"),
      phTrilha: $("ph-trilha"),
      phFaixa: $("ph-faixa"),
      phCursor: $("ph-cursor"),
      phValor: $("ph-valor"),
      alerta: $("hud-alerta"),
      alertaTitulo: $("hud-alerta-titulo"),
      alertaTexto: $("hud-alerta-texto"),
      desnaturando: $("hud-desnaturando"),
      chefePorcentagem: $("chefe-porcentagem"),
      chefeBarra: $("chefe-barra-vida"),
      chefeFraqueza: $("chefe-fraqueza"),
      municaoC: $("municao-c"),
      municaoE: $("municao-e"),
      flashDano: $("flash-dano"),
    };
    this.el.arco.style.strokeDasharray = `${CIRCUNFERENCIA_CRONOMETRO}`;
    this._configurarArrastes();
  }

  mostrar() {
    this.raiz.classList.remove("oculto");
  }

  esconder() {
    this.raiz.classList.add("oculto");
    this.camadaPopups.innerHTML = "";
  }

  // Liga os painéis da fase e ajusta rótulo/cores do cronômetro.
  configurar(info) {
    this.raiz.dataset.fase = info.id;
    this.el.faseRotulo.textContent = info.rotulo;
    const cores = CORES_CRONOMETRO[info.id];
    this.el.arco.style.stroke = cores.arco;
    this.el.arco.style.setProperty("--cor-brilho", cores.arco);
    this.el.trilho.src = cores.trilho;
  }

  // --- Comum -------------------------------------------------------------

  pontos(valor) {
    this.el.pontos.textContent = formatarNumero(valor);
  }

  combo(valor) {
    this.el.combo.textContent = `x${valor}`;
    this.el.combo.classList.toggle("oculto", valor < 2);
    if (valor >= 2) this._pulsar(this.el.combo);
  }

  tempo(segundos, total, congelado = false) {
    const s = Math.ceil(segundos);
    this.el.tempo.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const fracao = total > 0 ? segundos / total : 0;
    this.el.arco.style.strokeDashoffset = `${CIRCUNFERENCIA_CRONOMETRO * (1 - fracao)}`;
    this.raiz.classList.toggle("tempo-congelado", congelado);
    this.raiz.classList.toggle("tempo-acabando", segundos <= 10 && segundos > 0);
  }

  atp(valor) {
    this.el.atp.textContent = formatarNumero(valor);
    this._pulsar(this.el.atp);
  }

  vidas(atual, maximo) {
    const marcas = Array.from({ length: maximo }, (_, i) => `<span class="${i < atual ? "vida-cheia" : "vida-vazia"}">${i < atual ? "▰" : "▱"}</span>`).join("");
    this.el.vidas.innerHTML = marcas;
    this.el.vidasChefe.innerHTML = marcas;
  }

  flashDano() {
    this.el.flashDano.classList.remove("ativo");
    void this.el.flashDano.offsetWidth;
    this.el.flashDano.classList.add("ativo");
  }

  _pulsar(elemento) {
    elemento.classList.remove("pulso");
    void elemento.offsetWidth;
    elemento.classList.add("pulso");
  }

  // Texto flutuante ancorado num ponto 3D (sobe e some sozinho).
  popup(texto, classe, posicaoMundo, deslocamentoY = 0) {
    const tela = this.camera.paraTela(posicaoMundo);
    if (!tela.visivel) return;
    const elemento = document.createElement("div");
    elemento.className = `popup ${classe}`;
    elemento.textContent = texto;
    elemento.style.left = `${tela.x}px`;
    elemento.style.top = `${tela.y + deslocamentoY}px`;
    this.camadaPopups.appendChild(elemento);
    elemento.addEventListener("animationend", () => elemento.remove());
  }

  // --- Fase 1 ------------------------------------------------------------

  pedidos(lista) {
    this.el.pedidos.innerHTML = "";
    lista.forEach((pedido, i) => {
      const cartao = document.createElement("div");
      cartao.className = `pedido vidro pedido-${TEMAS_PEDIDO[i % TEMAS_PEDIDO.length]}${i === 0 ? " pedido-ativo" : ""}`;
      const chips = pedido.codons
        .map((codon, c) => {
          const estado = i === 0 && c < pedido.indice ? "feito" : i === 0 && c === pedido.indice ? "atual" : "pendente";
          return `<span class="codon codon-${estado}">${codon}</span>`;
        })
        .join("");
      const progresso = i === 0 ? pedido.indice / pedido.codons.length : 0;
      cartao.innerHTML = `
        <div class="pedido-cabecalho"><strong>${pedido.nome}</strong><span class="pedido-premio">⭐ +${pedido.recompensa}</span></div>
        <div class="pedido-codons">${chips}</div>
        <div class="pedido-barra"><div style="width:${Math.round(progresso * 100)}%"></div></div>`;
      this.el.pedidos.appendChild(cartao);
    });
  }

  powerups({ nad, mg, extra }) {
    const slots = this.el.powerups.querySelectorAll(".powerup");
    slots[0].classList.toggle("vazio", nad <= 0);
    slots[1].classList.toggle("vazio", mg <= 0);
    const slotExtra = slots[2];
    slotExtra.classList.toggle("vazio", !extra);
    slotExtra.querySelector("strong").textContent = extra ? NOMES_POWERUP[extra] : "?";
    slotExtra.querySelector(".powerup-nome").textContent = extra ? (extra === "nad" ? "Velocidade" : "Congela tempo") : "Vazio";
    slotExtra.querySelector("img").src = extra ? `assets/ui/powerup-${extra}.svg` : "assets/ui/powerup-vazio.svg";
  }

  // --- Fase 2 ------------------------------------------------------------

  objetivo(texto) {
    this.el.objetivo.textContent = texto;
    this._pulsar(this.el.objetivo);
  }

  // Troca os nomes das etapas (a rota da fase 2 muda a cada ciclo).
  fluxoEtapas(nomes) {
    this.el.etapasFluxo.forEach((etapa, i) => {
      etapa.textContent = nomes[i] || "";
    });
  }

  fluxo(passo) {
    this.el.etapasFluxo.forEach((etapa, i) => {
      etapa.classList.toggle("feita", i < passo);
      etapa.classList.toggle("atual", i === passo);
    });
  }

  // --- Fase 3 ------------------------------------------------------------

  controlesLaboratorio({ aoTemperatura, aoPh }) {
    this._aoTemperatura = aoTemperatura;
    this._aoPh = aoPh;
  }

  // Arrastar o termômetro (vertical) e o cursor de pH (horizontal) também controla a fase.
  _configurarArrastes() {
    const arrastar = (elemento, calcular) => {
      let ativo = false;
      const mover = (e) => {
        if (!ativo) return;
        calcular(e, elemento.getBoundingClientRect());
      };
      elemento.addEventListener("pointerdown", (e) => {
        ativo = true;
        elemento.setPointerCapture(e.pointerId);
        mover(e);
      });
      elemento.addEventListener("pointermove", mover);
      elemento.addEventListener("pointerup", () => (ativo = false));
      elemento.addEventListener("pointercancel", () => (ativo = false));
    };

    const [tMin, tMax] = LIMITES_TEMPERATURA;
    arrastar(this.el.termometroTubo, (e, r) => {
      const fracao = 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      if (this._aoTemperatura) this._aoTemperatura(tMin + fracao * (tMax - tMin));
    });
    arrastar(this.el.phTrilha, (e, r) => {
      const fracao = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      if (this._aoPh) this._aoPh(fracao * 14);
    });

    // A faixa ideal é fixa: desenha uma vez.
    const fracaoT = (t) => (t - tMin) / (tMax - tMin);
    this.el.termometroFaixa.style.bottom = `${fracaoT(FAIXA_TEMPERATURA[0]) * 100}%`;
    this.el.termometroFaixa.style.height = `${(fracaoT(FAIXA_TEMPERATURA[1]) - fracaoT(FAIXA_TEMPERATURA[0])) * 100}%`;
    this.el.termometroIdeal.style.bottom = `${((fracaoT(FAIXA_TEMPERATURA[0]) + fracaoT(FAIXA_TEMPERATURA[1])) / 2) * 100}%`;
    this.el.phFaixa.style.left = `${(FAIXA_PH[0] / 14) * 100}%`;
    this.el.phFaixa.style.width = `${((FAIXA_PH[1] - FAIXA_PH[0]) / 14) * 100}%`;
  }

  laboratorio({ temperatura, ph, estresse, alerta }) {
    const [tMin, tMax] = LIMITES_TEMPERATURA;
    this.el.termometroLiquido.style.height = `${((temperatura - tMin) / (tMax - tMin)) * 100}%`;
    this.el.termometroValor.textContent = `${Math.round(temperatura)}°C`;
    const estadoT = temperatura > FAIXA_TEMPERATURA[1] ? "quente" : temperatura < FAIXA_TEMPERATURA[0] ? "frio" : "ideal";
    this.el.termometroValor.dataset.estado = estadoT;

    this.el.phCursor.style.left = `${(ph / 14) * 100}%`;
    this.el.phValor.textContent = ph.toFixed(1).replace(".", ",");
    this.el.phValor.dataset.estado = ph < FAIXA_PH[0] || ph > FAIXA_PH[1] ? "fora" : "ideal";

    this.el.alerta.dataset.tipo = alerta.tipo;
    this.el.alertaTitulo.textContent = alerta.titulo;
    this.el.alertaTexto.textContent = alerta.texto;
    this.el.desnaturando.classList.toggle("visivel", estresse > 0.35);
  }

  // --- Chefão ------------------------------------------------------------

  chefe({ vida, municao, vitamina, fraqueza, letraFraqueza }) {
    const porcentagem = Math.round(vida * 100);
    this.el.chefePorcentagem.textContent = `${porcentagem}%`;
    this.el.chefeBarra.style.width = `${porcentagem}%`;
    this.el.chefeFraqueza.innerHTML = `Vulnerável a: <strong data-letra="${letraFraqueza}">${fraqueza.nome}</strong> (${fraqueza.faseNome})`;
    this.el.municaoC.textContent = `C ×${municao.C}`;
    this.el.municaoE.textContent = `E ×${municao.E}`;
    this.el.municaoC.classList.toggle("selecionada", vitamina === "C");
    this.el.municaoE.classList.toggle("selecionada", vitamina === "E");
  }
}
