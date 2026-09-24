// Monta a cena 3D compartilhada: fundo em gradiente, neblina e iluminação.
// Cada fase traz o próprio cenário (chão, organelas) e troca o "tema" daqui.

import * as THREE from "three";
import { CONFIG, TEMAS } from "../utils/Config.js";

// Desenha o gradiente radial do design numa textura usada como fundo da cena.
// Esticada na tela, fica elíptica como no Figma (96 × 54).
function criarTexturaFundo(paradas) {
  const tamanho = 512;
  const canvas = document.createElement("canvas");
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext("2d");
  const gradiente = ctx.createRadialGradient(tamanho / 2, tamanho / 2, 0, tamanho / 2, tamanho / 2, tamanho / 2);
  paradas.forEach((cor, i) => gradiente.addColorStop(i / (paradas.length - 1), cor));
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, tamanho, tamanho);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

export class Cena {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x08142e, 0.018);

    this._luzesPulsantes = [];
    this._relogioPulso = 0;
    this._texturasFundo = {};

    this._criarLuzes();
    this.aplicarTema("ribossomo");
  }

  _criarLuzes() {
    this.luzAmbiente = new THREE.HemisphereLight(0xbfdcff, 0x1a0b3d, 0.85);
    this.scene.add(this.luzAmbiente);

    const principal = new THREE.DirectionalLight(0xfff2e0, 1.15);
    principal.position.set(6, 12, 6);
    principal.castShadow = CONFIG.preset.sombras;
    principal.shadow.mapSize.set(1024, 1024);
    principal.shadow.camera.near = 1;
    principal.shadow.camera.far = 40;
    principal.shadow.camera.left = -18;
    principal.shadow.camera.right = 18;
    principal.shadow.camera.top = 18;
    principal.shadow.camera.bottom = -18;
    this.scene.add(principal);
    this.luzPrincipal = principal;

    for (let i = 0; i < 3; i++) {
      const luz = new THREE.PointLight(0xffffff, 6, 16, 2);
      const angulo = (i / 3) * Math.PI * 2;
      luz.position.set(Math.cos(angulo) * 8, 3.5, Math.sin(angulo) * 8);
      this.scene.add(luz);
      this._luzesPulsantes.push({ luz, fase: angulo, intensidadeBase: 6 });
    }
  }

  aplicarTema(nome) {
    const tema = TEMAS[nome];
    if (!this._texturasFundo[nome]) this._texturasFundo[nome] = criarTexturaFundo(tema.gradiente);
    this.scene.background = this._texturasFundo[nome];
    this.scene.fog.color.setHex(tema.neblina);
    this.scene.fog.density = tema.densidade;
    this._luzesPulsantes.forEach(({ luz }, i) => luz.color.setHex(tema.luzes[i % tema.luzes.length]));
  }

  atualizar(delta) {
    this._relogioPulso += delta;
    this._luzesPulsantes.forEach(({ luz, fase, intensidadeBase }) => {
      luz.intensity = intensidadeBase + Math.sin(this._relogioPulso * 1.6 + fase) * 2.5;
    });
  }

  adicionar(objeto) {
    this.scene.add(objeto);
  }

  remover(objeto) {
    this.scene.remove(objeto);
  }
}
