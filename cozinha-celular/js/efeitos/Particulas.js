// Partículas de ambiente: bolhas flutuando no citoplasma. Tudo gerado por
// código — a textura da bolha é desenhada num canvas 2D, sem imagens externas.

import * as THREE from "three";
import { CONFIG } from "../utils/Config.js";

function criarTexturaBolha() {
  const tamanho = 64;
  const canvas = document.createElement("canvas");
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext("2d");

  const gradiente = ctx.createRadialGradient(
    tamanho * 0.38,
    tamanho * 0.35,
    2,
    tamanho * 0.5,
    tamanho * 0.5,
    tamanho * 0.5
  );
  gradiente.addColorStop(0, "rgba(255,255,255,0.9)");
  gradiente.addColorStop(0.4, "rgba(180,230,255,0.35)");
  gradiente.addColorStop(1, "rgba(180,230,255,0)");
  ctx.fillStyle = gradiente;
  ctx.beginPath();
  ctx.arc(tamanho / 2, tamanho / 2, tamanho / 2, 0, Math.PI * 2);
  ctx.fill();

  const textura = new THREE.CanvasTexture(canvas);
  return textura;
}

export class BolhasCitoplasma {
  constructor(raio = 17) {
    const quantidade = CONFIG.preset.quantidadeBolhas;
    this.raio = raio;
    this._velocidades = new Float32Array(quantidade);

    const geometria = new THREE.BufferGeometry();
    const posicoes = new Float32Array(quantidade * 3);

    for (let i = 0; i < quantidade; i++) {
      const angulo = Math.random() * Math.PI * 2;
      const distancia = Math.random() * raio;
      posicoes[i * 3] = Math.cos(angulo) * distancia;
      posicoes[i * 3 + 1] = Math.random() * 8;
      posicoes[i * 3 + 2] = Math.sin(angulo) * distancia;
      this._velocidades[i] = 0.3 + Math.random() * 0.6;
    }

    geometria.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      map: criarTexturaBolha(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.pontos = new THREE.Points(geometria, material);
  }

  atualizar(delta) {
    const posicoes = this.pontos.geometry.attributes.position;
    for (let i = 0; i < posicoes.count; i++) {
      let y = posicoes.getY(i) + this._velocidades[i] * delta;
      if (y > 8) y = 0;
      posicoes.setY(i, y);
    }
    posicoes.needsUpdate = true;
  }
}
