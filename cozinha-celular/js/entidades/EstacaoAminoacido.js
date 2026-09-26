// Estação de aminoácido (RNAt): uma cápsula de vidro com borda luminosa na
// cor do aminoácido e uma esfera brilhante dentro. O jogador pega ali o
// aminoácido para entregar no ribossomo.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { criarRotulo } from "../utils/RotuloTexto.js";

const RAIO_INTERACAO = 1.5;

export class EstacaoAminoacido {
  constructor(aminoacido, posicao) {
    this.sigla = aminoacido.sigla;
    this.nome = aminoacido.nome;
    this.cor = aminoacido.cor;
    this.posicao = posicao.clone();
    this._relogio = Math.random() * 10;
    this._destacada = false;

    this.grupo = new THREE.Group();
    this.grupo.position.copy(posicao);
    this._construir();
  }

  _construir() {
    const cor = new THREE.Color(this.cor);

    // Sombra/halo no chão.
    const sombra = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 32),
      new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.1, depthWrite: false })
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = 0.02;
    sombra.scale.set(1, 0.5, 1);
    this.grupo.add(sombra);

    // Borda luminosa: casca um pouco maior, só com as faces de trás acesas.
    this.materialBorda = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.75, side: THREE.BackSide });
    const borda = new THREE.Mesh(new RoundedBoxGeometry(1.12, 1.02, 1.12, 4, 0.3), this.materialBorda);
    borda.position.y = 0.62;
    this.grupo.add(borda);

    // Vidro fosco.
    const vidro = new THREE.Mesh(
      new RoundedBoxGeometry(1.04, 0.94, 1.04, 4, 0.27),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.16,
        roughness: 0.1,
        metalness: 0,
        clearcoat: 1,
        depthWrite: false,
      })
    );
    vidro.position.y = 0.62;
    this.grupo.add(vidro);

    // Molécula brilhante com reflexo especular.
    this.esfera = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 28, 20),
      new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.55, roughness: 0.12, clearcoat: 1 })
    );
    this.esfera.position.y = 0.72;
    this.esfera.castShadow = true;
    this.grupo.add(this.esfera);

    this.luz = new THREE.PointLight(this.cor, 2.2, 4, 2);
    this.luz.position.y = 0.9;
    this.grupo.add(this.luz);

    const rotulo = criarRotulo([this.sigla], "#ffffff", { largura: 1.3, fonte: 50, brilho: false });
    rotulo.position.y = 0.05;
    rotulo.position.z = 0.7;
    rotulo.renderOrder = 2;
    this.grupo.add(rotulo);
    this.rotulo = rotulo;
    this._escalaRotulo = rotulo.scale.clone();
  }

  // Realce visual: indica que este é o aminoácido pedido agora.
  destacar(ativo) {
    this._destacada = ativo;
  }

  dentroDoAlcance(posicao) {
    return Math.hypot(this.posicao.x - posicao.x, this.posicao.z - posicao.z) < RAIO_INTERACAO;
  }

  atualizar(delta) {
    this._relogio += delta;
    const pulso = this._destacada ? 1 + Math.sin(this._relogio * 6) * 0.15 : 1 + Math.sin(this._relogio * 1.5) * 0.04;
    this.esfera.scale.setScalar(pulso);
    this.esfera.position.y = 0.72 + Math.sin(this._relogio * 2) * 0.05;
    this.materialBorda.opacity = this._destacada ? 0.85 + Math.sin(this._relogio * 6) * 0.15 : 0.55;
    this.luz.intensity = (this._destacada ? 4.5 : 2) + Math.sin(this._relogio * 4) * 0.4;
    this.rotulo.scale.copy(this._escalaRotulo).multiplyScalar(this._destacada ? 1.15 : 1);
  }
}
