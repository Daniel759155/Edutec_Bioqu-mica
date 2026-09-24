// Fase 3 — Laboratório de Enzimas: a enzima fica na bancada catalisando os
// substratos que chegam. O jogador controla temperatura e pH enquanto
// eventos (onda de calor, ácido derramado...) tiram tudo do lugar.
// Fora da faixa ideal a enzima se estressa e, no limite, desnatura.

import * as THREE from "three";
import { FaseBase } from "./FaseBase.js";
import { criarRotulo } from "../utils/RotuloTexto.js";
import { sortear } from "../dados/Conteudo.js";

export const FAIXA_TEMPERATURA = [35, 40];
export const FAIXA_PH = [6, 8];
export const LIMITES_TEMPERATURA = [15, 60];

const EVENTOS = [
  { id: "calor", texto: "Onda de calor!", temp: 2.8, ph: 0, duracao: 5 },
  { id: "frio", texto: "Resfriamento!", temp: -2.6, ph: 0, duracao: 5 },
  { id: "acido", texto: "Ácido derramado!", temp: 0, ph: -0.6, duracao: 4 },
  { id: "base", texto: "Base derramada!", temp: 0, ph: 0.6, duracao: 4 },
];

const POSICAO_ENZIMA = new THREE.Vector3(0, 0, 0);
const ESCALA_ENZIMA = 1.6;

export class Fase3Laboratorio extends FaseBase {
  constructor(ctx, info) {
    super(ctx, info);
    this.duracao = 60;
    this.usaOrbes = false;
    this.jogadorControlavel = false;
  }

  construir() {
    const bancada = new THREE.Mesh(
      new THREE.BoxGeometry(60, 1, 18),
      new THREE.MeshStandardMaterial({ color: 0x145a62, emissive: 0x0a2b33, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.2 })
    );
    bancada.position.set(0, -0.5, -4);
    bancada.receiveShadow = true;
    this.grupo.add(bancada);

    const friso = new THREE.Mesh(new THREE.BoxGeometry(60, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x7ffff0 }));
    friso.position.set(0, 0.01, 5);
    this.grupo.add(friso);

    this.bolhas = [];
    [
      { x: -5.4, altura: 2.3, cor: 0xff6fd8, nivel: 0.5 },
      { x: 6.4, altura: 2.7, cor: 0x4dc3ff, nivel: 0.55 },
      { x: 8.6, altura: 1.8, cor: 0x8cff6b, nivel: 0.5 },
    ].forEach((dados) => this._criarBequer(dados));

    // Substrato: esfera dourada que desliza até a enzima.
    this.substrato = new THREE.Group();
    const esfera = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 28, 20),
      new THREE.MeshPhysicalMaterial({ color: 0xffc23d, emissive: 0xffa000, emissiveIntensity: 0.55, roughness: 0.15, clearcoat: 1 })
    );
    this.substrato.add(esfera);
    const rotulo = criarRotulo(["Substrato"], "#ffffff", { largura: 1.8, fonte: 40, brilho: false });
    rotulo.position.y = -0.8;
    this.substrato.add(rotulo);
    this.grupo.add(this.substrato);

    this.produtos = [];
  }

  _criarBequer({ x, altura, cor, nivel }) {
    const bequer = new THREE.Group();
    bequer.position.set(x, 0, -1.2);
    const vidro = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.62, altura - 1.24, 8, 24),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.05, clearcoat: 1, depthWrite: false })
    );
    vidro.position.y = altura / 2;
    bequer.add(vidro);

    const alturaLiquido = altura * nivel;
    const liquido = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.52, Math.max(0.01, alturaLiquido - 1.04), 8, 24),
      new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.55, transparent: true, opacity: 0.85, roughness: 0.2 })
    );
    liquido.position.y = alturaLiquido / 2 + 0.06;
    bequer.add(liquido);

    const luz = new THREE.PointLight(cor, 2.5, 4, 2);
    luz.position.y = alturaLiquido / 2;
    bequer.add(luz);

    for (let i = 0; i < 4; i++) {
      const bolha = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
      bolha.userData = { base: 0.2, topo: alturaLiquido, velocidade: 0.3 + Math.random() * 0.4, fase: Math.random() };
      bolha.position.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.3 + 0.3);
      bequer.add(bolha);
      this.bolhas.push(bolha);
    }
    this.grupo.add(bequer);
  }

  desmontar() {
    const jogador = this.ctx.jogador;
    jogador.grupo.scale.setScalar(1);
    jogador.alturaBase = 0.6;
    jogador.definirEstresse(0);
    super.desmontar();
  }

  preparar() {
    super.preparar();
    this.temperatura = 37;
    this.ph = 7;
    this.estresse = 0;
    this.catalisados = 0;
    this._evento = null;
    this._proximoEvento = 3;
    this._recuperando = 0;
    this._chaperonaUsada = false;
    this._alertaAnterior = null;
    this._resetarSubstrato(0.6);

    const jogador = this.ctx.jogador;
    jogador.grupo.scale.setScalar(ESCALA_ENZIMA);
    jogador.alturaBase = 0.6 * ESCALA_ENZIMA;
    jogador.teleportar(POSICAO_ENZIMA.x, POSICAO_ENZIMA.z);
    jogador.limitar = null;
    jogador.definirEstresse(0);

    this.ctx.camera.enquadrar({
      deslocamento: new THREE.Vector3(0, 2.6, 9.5),
      alturaOlhar: 1.5,
      alvoFixo: new THREE.Vector3(0, 0, 0),
    });
    this.ctx.hud.controlesLaboratorio({
      aoTemperatura: (valor) => (this.temperatura = valor),
      aoPh: (valor) => (this.ph = valor),
    });
    this._atualizarHud();
  }

  _resetarSubstrato(atraso) {
    this._substratoEstado = "esperando"; // esperando | chegando | reagindo | recusado
    this._substratoTempo = -atraso;
    this.substrato.visible = false;
    this.substrato.position.set(5.5, 1.3, 0.4);
  }

  // --- Condições ---------------------------------------------------------

  _temperaturaIdeal() {
    return this.temperatura >= FAIXA_TEMPERATURA[0] && this.temperatura <= FAIXA_TEMPERATURA[1];
  }

  _phIdeal() {
    return this.ph >= FAIXA_PH[0] && this.ph <= FAIXA_PH[1];
  }

  _alertaAtual() {
    if (this.temperatura > FAIXA_TEMPERATURA[1]) {
      return { tipo: "perigo", titulo: "ALERTA  //  Temperatura alta", texto: "Baixe para 35–40 °C antes que a enzima perca a forma." };
    }
    if (!this._phIdeal()) {
      const acido = this.ph < FAIXA_PH[0];
      return {
        tipo: "perigo",
        titulo: `ALERTA  //  pH ${acido ? "ácido" : "básico"} demais`,
        texto: `${acido ? "Suba" : "Baixe"} o pH para a faixa 6–8: a forma do sítio ativo depende dele.`,
      };
    }
    if (this.temperatura < FAIXA_TEMPERATURA[0]) {
      return { tipo: "aviso", titulo: "AVISO  //  Temperatura baixa", texto: "No frio a enzima não desnatura, mas a reação fica lenta. Aqueça para 35–40 °C." };
    }
    return { tipo: "ok", titulo: "STATUS  //  Condições ideais", texto: "Temperatura e pH na faixa: a enzima está catalisando a todo vapor!" };
  }

  _atualizarHud() {
    this.ctx.hud.laboratorio({
      temperatura: this.temperatura,
      ph: this.ph,
      estresse: this.estresse,
      alerta: this._alertaAtual(),
    });
  }

  // --- Eventos e estresse ------------------------------------------------

  _atualizarCondicoes(delta) {
    // Eventos aleatórios que bagunçam o laboratório.
    this._proximoEvento -= delta;
    if (this._proximoEvento <= 0 && !this._evento) {
      this._evento = { ...sortear(EVENTOS) };
      this._proximoEvento = 5 + Math.random() * 3;
      this.ctx.hud.popup(this._evento.texto, "popup-aviso", new THREE.Vector3(0, 3.6, 0));
      this.ctx.som.tocar("alerta");
    }
    let derivaT = (Math.random() - 0.5) * 0.8;
    let derivaPh = (Math.random() - 0.5) * 0.15;
    if (this._evento) {
      derivaT += this._evento.temp;
      derivaPh += this._evento.ph;
      this._evento.duracao -= delta;
      if (this._evento.duracao <= 0) this._evento = null;
    }

    // Controle do jogador: W/S (ou joystick vertical) mexem na temperatura; A/D no pH.
    const { x, y } = this.ctx.entrada.movimento;
    this.temperatura += (derivaT - y * 9) * delta;
    this.ph += (derivaPh + x * 2.2) * delta;
    this.temperatura = THREE.MathUtils.clamp(this.temperatura, LIMITES_TEMPERATURA[0], LIMITES_TEMPERATURA[1]);
    this.ph = THREE.MathUtils.clamp(this.ph, 0, 14);

    // Estresse sobe com calor ou pH fora da faixa; cai quando tudo está bem.
    let ganho = 0;
    if (this.temperatura > FAIXA_TEMPERATURA[1]) ganho += (this.temperatura - FAIXA_TEMPERATURA[1]) * 0.07;
    if (this.ph < FAIXA_PH[0]) ganho += (FAIXA_PH[0] - this.ph) * 0.22;
    if (this.ph > FAIXA_PH[1]) ganho += (this.ph - FAIXA_PH[1]) * 0.22;
    this.estresse = ganho > 0 ? this.estresse + ganho * delta : Math.max(0, this.estresse - 0.3 * delta);

    if (this.estresse >= 1) this._desnaturar();
  }

  _desnaturar() {
    const posicao = new THREE.Vector3(0, 3.4, 0);
    if (this.ctx.progresso.tem("chaperona") && !this._chaperonaUsada) {
      this._chaperonaUsada = true;
      this.estresse = 0.3;
      this.temperatura = 37;
      this.ph = 7;
      this.ctx.hud.popup("CHAPERONA PROTEGEU!", "popup-powerup", posicao);
      this.ctx.som.tocar("powerup");
      return;
    }

    this.quebrarCombo();
    this.ctx.camera.tremer(0.25, 0.4);
    this.ctx.som.tocar("dano");
    this.ctx.hud.popup("ENZIMA DESNATURADA", "popup-erro", posicao);
    const restantes = this.ctx.progresso.perderVida();
    this.ctx.hud.vidas(restantes, this.ctx.progresso.vidasMax);
    if (restantes <= 0) {
      this.terminar(true);
      return;
    }
    // A célula "fabrica" uma enzima nova: condições voltam ao normal.
    this.estresse = 0;
    this.temperatura = 37;
    this.ph = 7;
    this._evento = null;
    this._proximoEvento = 3;
    this._recuperando = 1.5;
    this.ctx.jogador.ficarTonta();
    this._resetarSubstrato(1.5);
  }

  // --- Substratos --------------------------------------------------------

  _atualizarSubstrato(delta) {
    this._substratoTempo += delta;
    const alvoX = 1.55;

    switch (this._substratoEstado) {
      case "esperando":
        if (this._substratoTempo > 0) {
          this._substratoEstado = "chegando";
          this._substratoTempo = 0;
          this.substrato.visible = true;
          this.substrato.position.set(5.5, 1.3, 0.4);
        }
        break;

      case "chegando":
        this.substrato.position.x += (alvoX - this.substrato.position.x) * (1 - Math.pow(0.05, delta));
        this.substrato.position.y = 1.3 + Math.sin(this._substratoTempo * 5) * 0.08;
        if (Math.abs(this.substrato.position.x - alvoX) < 0.05) {
          const desnaturando = this.estresse > 0.5 || this._recuperando > 0;
          this._substratoEstado = desnaturando ? "recusado" : "reagindo";
          this._substratoTempo = 0;
          if (desnaturando) {
            this.quebrarCombo();
            this.ctx.hud.popup("Sítio ativo deformado!", "popup-erro", new THREE.Vector3(1.5, 2.6, 0));
          }
        }
        break;

      case "reagindo": {
        // No frio a reação demora bem mais; na faixa ideal é quase instantânea.
        const lenta = this.temperatura < FAIXA_TEMPERATURA[0];
        const tempoReacao = lenta ? 1.8 : 0.45;
        this.substrato.scale.setScalar(1 + Math.sin(this._substratoTempo * 20) * 0.08);
        if (this.estresse > 0.5) {
          this._substratoEstado = "recusado";
          this._substratoTempo = 0;
        } else if (this._substratoTempo > tempoReacao) {
          this._catalisar();
        }
        break;
      }

      case "recusado":
        this.substrato.position.x += delta * 5;
        this.substrato.scale.setScalar(1);
        if (this.substrato.position.x > 6) this._resetarSubstrato(0.8);
        break;
    }
  }

  _catalisar() {
    const origem = this.substrato.position.clone();
    this.catalisados += 1;
    this.pontuar(150, origem.clone().add(new THREE.Vector3(0, 1.4, 0)), { comCombo: true });
    this.ganharAtp(6);
    this.ctx.som.tocar(this.combo >= 3 ? "combo" : "entregar");
    this.ctx.faiscas.explodir(origem, 0xffd24d, 16, 4);

    // O substrato vira dois produtos que saem voando.
    [0xff6fd8, 0x4dff9a].forEach((cor, i) => {
      const produto = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 18, 14),
        new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.6, clearcoat: 1, transparent: true })
      );
      produto.position.copy(origem);
      produto.userData = { velocidade: new THREE.Vector3(2 + i * 1.5, 3 + i, i === 0 ? 1.5 : -1.5), vida: 1 };
      this.grupo.add(produto);
      this.produtos.push(produto);
    });

    this.substrato.scale.setScalar(1);
    this._resetarSubstrato(0.9);
  }

  _atualizarProdutos(delta) {
    for (let i = this.produtos.length - 1; i >= 0; i--) {
      const produto = this.produtos[i];
      const dados = produto.userData;
      dados.vida -= delta;
      dados.velocidade.y -= 6 * delta;
      produto.position.addScaledVector(dados.velocidade, delta);
      produto.material.opacity = Math.max(0, dados.vida);
      if (dados.vida <= 0) {
        this.grupo.remove(produto);
        produto.geometry.dispose();
        produto.material.dispose();
        this.produtos.splice(i, 1);
      }
    }
  }

  // --- Loop --------------------------------------------------------------

  atualizar(delta) {
    this.bolhas.forEach((bolha) => {
      const d = bolha.userData;
      d.fase = (d.fase + delta * d.velocidade) % 1;
      bolha.position.y = d.base + d.fase * (d.topo - d.base);
    });
    this._atualizarProdutos(delta);

    if (this.ativa) {
      this._recuperando = Math.max(0, this._recuperando - delta);
      this._atualizarCondicoes(delta);
      if (this.ativa) this._atualizarSubstrato(delta);

      const texto = this.temperatura > FAIXA_TEMPERATURA[1] ? `ERRO 0x${Math.round(this.temperatura)}°C` : `ERRO pH ${this.ph.toFixed(1).replace(".", ",")}`;
      this.ctx.jogador.definirEstresse(this.estresse, texto);

      const alerta = this._alertaAtual();
      if (alerta.tipo === "perigo" && this._alertaAnterior !== "perigo") this.ctx.som.tocar("alerta");
      this._alertaAnterior = alerta.tipo;
      this._atualizarHud();
    }

    super.atualizar(delta);
  }

  metrica() {
    return this.catalisados;
  }
}
