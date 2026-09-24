// Orbe de ATP que aparece solto pela fase: brilha, flutua e é coletado ao
// encostar. Com o upgrade "Imã de ATP", é puxado de mais longe.

import * as THREE from "three";
import { CORES } from "../utils/Config.js";

const GEOMETRIA = new THREE.SphereGeometry(0.26, 20, 16);

export class OrbeATP {
  constructor(posicao) {
    this.grupo = new THREE.Group();
    this.grupo.position.copy(posicao);
    this._relogio = Math.random() * 10;

    const esfera = new THREE.Mesh(
      GEOMETRIA,
      new THREE.MeshPhysicalMaterial({ color: CORES.atp, emissive: 0xffb000, emissiveIntensity: 0.9, roughness: 0.15, clearcoat: 1 })
    );
    this.grupo.add(esfera);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.02, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe66d, transparent: true, opacity: 0.7 })
    );
    halo.rotation.x = Math.PI / 2;
    this.grupo.add(halo);
    this.halo = halo;
  }

  // Devolve true quando o jogador encosta (coletou).
  atualizar(delta, posJogador, raioIma) {
    this._relogio += delta;
    this.grupo.position.y = 0.7 + Math.sin(this._relogio * 3) * 0.15;
    this.halo.rotation.z += delta * 2;

    const dx = posJogador.x - this.grupo.position.x;
    const dz = posJogador.z - this.grupo.position.z;
    const distancia = Math.hypot(dx, dz);
    if (raioIma > 0 && distancia < raioIma) {
      const passo = Math.min(distancia, delta * 9);
      this.grupo.position.x += (dx / distancia) * passo;
      this.grupo.position.z += (dz / distancia) * passo;
    }
    return distancia < 0.95;
  }
}
