// Explosões de partículas brilhantes (acertos, catálise, coleta de ATP).
// Cada faísca é uma esferinha com material aditivo que voa e desaparece.

import * as THREE from "three";

const GEOMETRIA = new THREE.SphereGeometry(0.07, 8, 6);

export class Faiscas {
  constructor(cena) {
    this.cena = cena;
    this._ativas = [];
  }

  explodir(posicao, cor, quantidade = 14, forca = 4) {
    for (let i = 0; i < quantidade; i++) {
      const material = new THREE.MeshBasicMaterial({ color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const faisca = new THREE.Mesh(GEOMETRIA, material);
      faisca.position.copy(posicao);
      const direcao = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize();
      faisca.userData.velocidade = direcao.multiplyScalar(forca * (0.5 + Math.random() * 0.8));
      faisca.userData.vida = 0.6 + Math.random() * 0.4;
      faisca.userData.vidaTotal = faisca.userData.vida;
      this.cena.add(faisca);
      this._ativas.push(faisca);
    }
  }

  atualizar(delta) {
    for (let i = this._ativas.length - 1; i >= 0; i--) {
      const faisca = this._ativas[i];
      const dados = faisca.userData;
      dados.vida -= delta;
      dados.velocidade.y -= 6 * delta;
      faisca.position.addScaledVector(dados.velocidade, delta);
      const t = Math.max(0, dados.vida / dados.vidaTotal);
      faisca.material.opacity = t;
      faisca.scale.setScalar(0.4 + t);
      if (dados.vida <= 0) {
        this.cena.remove(faisca);
        faisca.material.dispose();
        this._ativas.splice(i, 1);
      }
    }
  }
}
