// Câmera cinematográfica em terceira pessoa: segue o jogador com suavização
// (lerp) e permite tremidas rápidas em impactos. Cada fase pode ajustar o
// enquadramento (distância/altura) ou fixar a câmera num ponto.

import * as THREE from "three";

const DESLOCAMENTO_PADRAO = new THREE.Vector3(0, 5.2, 7.4);

export class CameraSeguidora {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
    this.deslocamento = DESLOCAMENTO_PADRAO.clone();
    this.alturaOlhar = 0.6;
    this.alvoFixo = null; // Vector3 quando a câmera não segue o jogador
    this._alvoOlhar = new THREE.Vector3();
    this._tremidaTempo = 0;
    this._tremidaForca = 0;
  }

  enquadrar({ deslocamento = DESLOCAMENTO_PADRAO, alturaOlhar = 0.6, alvoFixo = null, fov = 50 } = {}) {
    this.deslocamento.copy(deslocamento);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.alturaOlhar = alturaOlhar;
    this.alvoFixo = alvoFixo ? alvoFixo.clone() : null;
  }

  // Pula direto para a posição final (ao trocar de fase, sem "viagem" da câmera).
  posicionarImediato(alvoPosicao) {
    const alvo = this.alvoFixo || alvoPosicao;
    this.camera.position.copy(alvo).add(this.deslocamento);
    this._alvoOlhar.copy(alvo).add(new THREE.Vector3(0, this.alturaOlhar, 0));
    this.camera.lookAt(this._alvoOlhar);
  }

  seguir(alvoPosicao, delta) {
    const alvo = this.alvoFixo || alvoPosicao;
    const posicaoDesejada = alvo.clone().add(this.deslocamento);

    if (this._tremidaTempo > 0) {
      this._tremidaTempo -= delta;
      posicaoDesejada.x += (Math.random() - 0.5) * this._tremidaForca;
      posicaoDesejada.y += (Math.random() - 0.5) * this._tremidaForca;
    }

    this.camera.position.lerp(posicaoDesejada, 1 - Math.pow(0.001, delta));
    this._alvoOlhar.lerp(alvo.clone().add(new THREE.Vector3(0, this.alturaOlhar, 0)), 1 - Math.pow(0.0005, delta));
    this.camera.lookAt(this._alvoOlhar);
  }

  // Tremida curta e forte, usada em impactos (colisão, dano no chefão, etc.).
  tremer(forca = 0.12, duracao = 0.25) {
    this._tremidaForca = forca;
    this._tremidaTempo = duracao;
  }

  // Converte um ponto 3D em pixels da tela (para textos flutuantes em HTML).
  paraTela(posicao) {
    const v = posicao.clone().project(this.camera);
    return {
      x: ((v.x + 1) / 2) * window.innerWidth,
      y: ((1 - v.y) / 2) * window.innerHeight,
      visivel: v.z < 1,
    };
  }

  redimensionar() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
