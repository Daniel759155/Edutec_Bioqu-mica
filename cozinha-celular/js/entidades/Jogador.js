// A enzima protagonista, no estilo do guia visual: corpo esférico verde-água
// com brilho especular, visor luminoso (no lugar de um rosto fofo) com linha
// de scan e olhos de LED, bracinhos e um anel de energia sob o corpo.
// Construída só com primitivas do Three.js e animada por uma máquina de
// estados simples (andar, pular, comemorar, ficar tonta).

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CONFIG, CORES } from "../utils/Config.js";
import { criarRotulo } from "../utils/RotuloTexto.js";

const VELOCIDADE = 5.4;
const GRAVIDADE = 22;
const FORCA_PULO = 8.5;
const RAIO_CORPO = 0.62;

const COR_CORPO_ESTRESSE = new THREE.Color(0xff6fb0);
const COR_VISOR_ERRO = new THREE.Color(0xff3b5c);

export class Jogador {
  constructor() {
    this.grupo = new THREE.Group();
    this.posicao = new THREE.Vector3(0, 0, 0);
    this.velocidadeY = 0;
    this.noChao = true;
    this.direcaoOlhar = new THREE.Vector3(0, 0, 1);
    this.raio = RAIO_CORPO;

    this.multiplicadorVelocidade = 1;
    this.limitar = null; // função (posicao) => void que mantém a enzima dentro da fase

    this.estado = "idle"; // idle | andando | pulando | comemorando | tonta
    this._tempoEstado = 0;
    this._relogio = 0;
    this.alturaBase = 0.6; // eleva o corpo para ele "pisar" no chão, em vez de afundar nele

    this._construirCorpo();
    this.grupo.position.copy(this.posicao);
  }

  _construirCorpo() {
    const segmentos = CONFIG.preset.segmentosEsfera;

    // O "corpo" balança/estica sozinho; visor e braços ficam no mesmo pivô.
    this.pivo = new THREE.Group();
    this.grupo.add(this.pivo);

    this.corBase = new THREE.Color(CORES.enzima);
    this.materialCorpo = new THREE.MeshPhysicalMaterial({
      color: this.corBase.clone(),
      emissive: this.corBase.clone(),
      emissiveIntensity: 0.18,
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      sheen: 0.5,
      sheenColor: new THREE.Color(0x7cffcb),
    });
    this.corpo = new THREE.Mesh(new THREE.SphereGeometry(RAIO_CORPO, segmentos, segmentos), this.materialCorpo);
    this.corpo.scale.set(1, 1.02, 1);
    this.corpo.castShadow = true;
    this.pivo.add(this.corpo);

    // Reflexo especular "pintado" no topo, como no design.
    const reflexo = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
    );
    reflexo.scale.set(1.4, 0.7, 0.4);
    reflexo.position.set(-0.22, 0.4, 0.4);
    this.pivo.add(reflexo);

    this._construirVisor();
    this._construirBracos();

    // Anel de energia horizontal sob o corpo.
    this.anelEnergia = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.025, 8, 64),
      new THREE.MeshBasicMaterial({ color: CORES.ciano, transparent: true, opacity: 0.85 })
    );
    this.anelEnergia.rotation.x = Math.PI / 2;
    this.anelEnergia.position.y = -0.45;
    this.grupo.add(this.anelEnergia);

    // Estrelinhas de tontura, escondidas até o estado "tonta".
    this.estrelas = new THREE.Group();
    const materialEstrela = new THREE.MeshBasicMaterial({ color: 0xffe14d });
    for (let i = 0; i < 3; i++) {
      const estrela = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), materialEstrela);
      estrela.userData.fase = (i / 3) * Math.PI * 2;
      this.estrelas.add(estrela);
    }
    this.estrelas.visible = false;
    this.estrelas.position.y = 0.95;
    this.grupo.add(this.estrelas);

    // Rótulo "ERRO 0x41°C" que aparece no corpo quando a enzima desnatura.
    this._textoErro = "";
    this.rotuloErro = null;
  }

  _construirVisor() {
    const visor = new THREE.Group();
    visor.position.set(0, 0.06, 0.5);

    this.materialBordaVisor = new THREE.MeshBasicMaterial({ color: CORES.ciano });
    const borda = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.28, 0.12, 3, 0.07), this.materialBordaVisor);
    visor.add(borda);

    const vidro = new THREE.Mesh(
      new RoundedBoxGeometry(0.8, 0.22, 0.14, 3, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x0a1024, roughness: 0.2, metalness: 0.4 })
    );
    vidro.position.z = 0.01;
    visor.add(vidro);

    this.materialScan = new THREE.MeshBasicMaterial({ color: CORES.ciano });
    this.linhaScan = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.028, 0.02), this.materialScan);
    this.linhaScan.position.set(0, -0.03, 0.085);
    visor.add(this.linhaScan);

    const materialLed = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.olhos = [-0.18, 0.18].map((x) => {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.02), materialLed);
      led.position.set(x, 0.03, 0.09);
      visor.add(led);
      return led;
    });

    this.pivo.add(visor);
    this.visor = visor;
  }

  _construirBracos() {
    const material = new THREE.MeshPhysicalMaterial({ color: CORES.enzima, roughness: 0.3, clearcoat: 0.6 });
    this.materialBracos = material;
    this.bracos = [-1, 1].map((lado) => {
      const braco = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.32, 6, 12), material);
      braco.position.set(lado * 0.62, -0.05, 0.08);
      braco.rotation.z = lado * 1.0;
      braco.castShadow = true;
      this.pivo.add(braco);
      return braco;
    });
  }

  // Posiciona a enzima num ponto do chão, zerando pulo e estado.
  teleportar(x, z) {
    this.posicao.set(x, 0, z);
    this.velocidadeY = 0;
    this.noChao = true;
    this.grupo.position.set(x, this.alturaBase, z);
    this.grupo.rotation.set(0, 0, 0);
    this._mudarEstado("idle");
  }

  // Processa o vetor de movimento vindo da Entrada (teclado/toque).
  mover(entrada, delta) {
    const { x, y } = entrada.movimento;
    const movendo = Math.abs(x) > 0.05 || Math.abs(y) > 0.05;

    if (movendo) {
      const direcao = new THREE.Vector3(x, 0, y).normalize();
      const velocidade = VELOCIDADE * this.multiplicadorVelocidade;
      this.posicao.x += direcao.x * velocidade * delta;
      this.posicao.z += direcao.z * velocidade * delta;
      this.direcaoOlhar.lerp(direcao, 0.25);

      if (this.estado !== "pulando" && this.estado !== "comemorando" && this.estado !== "tonta") {
        this._mudarEstado("andando");
      }
    } else if (this.estado === "andando") {
      this._mudarEstado("idle");
    }

    if (this.limitar) this.limitar(this.posicao, this.raio);

    // Gravidade e pulo.
    this.velocidadeY -= GRAVIDADE * delta;
    this.posicao.y += this.velocidadeY * delta;
    if (this.posicao.y <= 0) {
      this.posicao.y = 0;
      this.velocidadeY = 0;
      if (!this.noChao && this.estado === "pulando") this._mudarEstado(movendo ? "andando" : "idle");
      this.noChao = true;
    }

    this.grupo.position.x = this.posicao.x;
    this.grupo.position.z = this.posicao.z;
    this.grupo.position.y = this.posicao.y + this.alturaBase;
    if (movendo) {
      const anguloAlvo = Math.atan2(this.direcaoOlhar.x, this.direcaoOlhar.z);
      let diferenca = anguloAlvo - this.grupo.rotation.y;
      diferenca = Math.atan2(Math.sin(diferenca), Math.cos(diferenca));
      this.grupo.rotation.y += diferenca * 0.2;
    }
  }

  // Vira a enzima para um ponto (usado ao atirar no chefão).
  olharPara(ponto) {
    const angulo = Math.atan2(ponto.x - this.posicao.x, ponto.z - this.posicao.z);
    this.grupo.rotation.y = angulo;
    this.direcaoOlhar.set(Math.sin(angulo), 0, Math.cos(angulo));
  }

  pular() {
    if (!this.noChao) return;
    this.velocidadeY = FORCA_PULO;
    this.noChao = false;
    this._mudarEstado("pulando");
  }

  comemorar() {
    this._mudarEstado("comemorando");
  }

  ficarTonta() {
    this._mudarEstado("tonta");
  }

  // 0 = normal, 1 = desnaturando: o corpo fica rosa e o visor, vermelho.
  definirEstresse(nivel, textoErro = "") {
    const t = THREE.MathUtils.clamp(nivel, 0, 1);
    this.materialCorpo.color.copy(this.corBase).lerp(COR_CORPO_ESTRESSE, t);
    this.materialCorpo.emissive.copy(this.materialCorpo.color);
    this.materialBracos.color.copy(this.materialCorpo.color);
    const corVisor = new THREE.Color(CORES.ciano).lerp(COR_VISOR_ERRO, t > 0.35 ? 1 : 0);
    this.materialBordaVisor.color.copy(corVisor);
    this.materialScan.color.copy(corVisor);
    this.anelEnergia.material.color.copy(corVisor);

    const mostrarErro = t > 0.35 && textoErro;
    if (mostrarErro && textoErro !== this._textoErro) {
      if (this.rotuloErro) this.pivo.remove(this.rotuloErro);
      this.rotuloErro = criarRotulo([textoErro], "#ff3b5c", { largura: 1.1, fonte: 44 });
      this.rotuloErro.position.set(0, -0.22, 0.66);
      this.pivo.add(this.rotuloErro);
      this._textoErro = textoErro;
    }
    if (this.rotuloErro) this.rotuloErro.visible = Boolean(mostrarErro);
  }

  _mudarEstado(novoEstado) {
    this.estado = novoEstado;
    this._tempoEstado = 0;
    this.estrelas.visible = novoEstado === "tonta";
    if (novoEstado !== "tonta") this.grupo.rotation.z = 0;
  }

  // Anima o corpo/visor de acordo com o estado atual. Chamado todo frame.
  atualizar(delta) {
    this._relogio += delta;
    this._tempoEstado += delta;
    const baseY = this.posicao.y + this.alturaBase;

    switch (this.estado) {
      case "idle":
        this.pivo.scale.set(1, 1 + Math.sin(this._relogio * 2) * 0.02, 1);
        this.grupo.position.y = baseY + Math.sin(this._relogio * 2) * 0.04;
        this.bracos.forEach((b, i) => (b.rotation.x = Math.sin(this._relogio * 2 + i) * 0.15));
        break;

      case "andando": {
        const passo = Math.sin(this._relogio * 12);
        this.pivo.scale.set(1 + passo * 0.04, 1 - Math.abs(passo) * 0.06, 1 + passo * 0.04);
        this.grupo.position.y = baseY + Math.abs(passo) * 0.1;
        this.bracos.forEach((b, i) => (b.rotation.x = passo * (i === 0 ? 0.6 : -0.6)));
        break;
      }

      case "pulando":
        this.pivo.scale.set(0.92, 1.12, 0.92);
        break;

      case "comemorando": {
        this.grupo.rotation.y += delta * 10;
        const pulso = Math.abs(Math.sin(this._relogio * 8));
        this.pivo.scale.set(1 + pulso * 0.12, 1 + pulso * 0.2, 1 + pulso * 0.12);
        this.grupo.position.y = baseY + pulso * 0.5;
        this.bracos.forEach((b) => (b.rotation.x = -1.2));
        if (this._tempoEstado > 1.2) this._mudarEstado("idle");
        break;
      }

      case "tonta": {
        this.grupo.rotation.z = Math.sin(this._relogio * 6) * 0.18;
        this.estrelas.children.forEach((estrela) => {
          const angulo = this._relogio * 4 + estrela.userData.fase;
          estrela.position.set(Math.cos(angulo) * 0.5, Math.sin(this._relogio * 3) * 0.1, Math.sin(angulo) * 0.5);
        });
        if (this._tempoEstado > 1.6) this._mudarEstado("idle");
        break;
      }
    }

    // Linha de scan varrendo o visor e LEDs "piscando" de vez em quando.
    this.linhaScan.position.y = -0.03 + Math.sin(this._relogio * 3) * 0.05;
    const piscando = this._relogio % 3.4 > 3.28;
    this.olhos.forEach((o) => (o.scale.y = piscando ? 0.2 : 1));

    this.anelEnergia.rotation.z += delta * 0.8;
    this.anelEnergia.scale.setScalar(1 + Math.sin(this._relogio * 3) * 0.04);
  }
}
