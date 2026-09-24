// O ribossomo: ponto de entrega central da Fase 1. Duas subunidades roxas
// translúcidas, um anel de pontos dourados no chão (que acende quando o
// pedido chega ao códon de parada) e a cadeia de proteína crescendo em 3D,
// no estilo "bola e vareta" de modelo molecular.

import * as THREE from "three";
import { criarRotulo } from "../utils/RotuloTexto.js";

const RAIO_INTERACAO = 2.3;
const PONTOS_ANEL = 14;

export class Ribossomo {
  constructor(posicao = new THREE.Vector3(0, 0, 0)) {
    this.posicao = posicao.clone();
    this.grupo = new THREE.Group();
    this.grupo.position.copy(posicao);
    this._relogio = 0;
    this._pronto = false;
    this._elos = [];
    this._varetas = [];
    this._construir();
  }

  _construir() {
    const materialGrande = new THREE.MeshPhysicalMaterial({
      color: 0xa874ff,
      emissive: 0x6a2dd8,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      clearcoat: 0.8,
      transparent: true,
      opacity: 0.92,
    });
    const subGrande = new THREE.Mesh(new THREE.SphereGeometry(1.35, 40, 28), materialGrande);
    subGrande.scale.set(1.25, 0.82, 1);
    subGrande.position.y = 1.75;
    subGrande.castShadow = true;
    this.grupo.add(subGrande);
    this.subGrande = subGrande;

    const materialPequena = materialGrande.clone();
    materialPequena.color.setHex(0x8b4dff);
    const subPequena = new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 24), materialPequena);
    subPequena.scale.set(1.3, 0.6, 1);
    subPequena.position.y = 0.7;
    subPequena.castShadow = true;
    this.grupo.add(subPequena);
    this.subPequena = subPequena;

    // Brilho "pintado" no topo da subunidade grande.
    const reflexo = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    );
    reflexo.scale.set(1.6, 0.5, 0.6);
    reflexo.position.set(-0.6, 2.25, 0.6);
    this.grupo.add(reflexo);

    // Anel de pontos dourados no chão marcando a área de entrega.
    this.pontosAnel = [];
    const materialPonto = new THREE.MeshBasicMaterial({ color: 0xffd24d, transparent: true, opacity: 0.6 });
    for (let i = 0; i < PONTOS_ANEL; i++) {
      const angulo = (i / PONTOS_ANEL) * Math.PI * 2;
      const ponto = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), materialPonto);
      ponto.position.set(Math.cos(angulo) * RAIO_INTERACAO, 0.12, Math.sin(angulo) * RAIO_INTERACAO);
      this.grupo.add(ponto);
      this.pontosAnel.push(ponto);
    }
    this.materialPonto = materialPonto;

    this.luzPronto = new THREE.PointLight(0x4dff9a, 0, 7, 2);
    this.luzPronto.position.y = 1.2;
    this.grupo.add(this.luzPronto);

    // A cadeia cresce a partir do topo, ligeiramente para o lado (saída do túnel).
    this._pontoSaida = new THREE.Vector3(1.3, 2.6, -0.2);
  }

  dentroDoAlcance(posicao) {
    return Math.hypot(this.posicao.x - posicao.x, this.posicao.z - posicao.z) < RAIO_INTERACAO + 0.4;
  }

  // Acende o anel indicando que dá pra finalizar a proteína (códon de parada).
  marcarPronta(pronta) {
    this._pronto = pronta;
  }

  // Acrescenta um elo colorido à cadeia de proteína.
  adicionarAminoacido(cor, sigla) {
    const esfera = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 20, 16),
      new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.45, roughness: 0.15, clearcoat: 1 })
    );
    const indice = this._elos.length;
    const posicaoLocal = this._pontoSaida.clone().add(new THREE.Vector3(indice * 0.45, indice * 0.32, Math.sin(indice) * 0.2));
    esfera.position.copy(posicaoLocal);
    esfera.scale.setScalar(0.01);
    this.grupo.add(esfera);

    const rotulo = criarRotulo([sigla], "#ffffff", { largura: 0.9, fonte: 44, brilho: false });
    rotulo.position.set(0, -0.48, 0);
    esfera.add(rotulo);

    if (indice > 0) {
      const vareta = this._criarVareta(this._elos[indice - 1].position, posicaoLocal);
      this.grupo.add(vareta);
      this._varetas.push(vareta);
    }
    this._elos.push(esfera);
    this._animarEntrada(esfera);
  }

  _criarVareta(a, b) {
    const direcao = new THREE.Vector3().subVectors(b, a);
    const vareta = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, direcao.length(), 8),
      new THREE.MeshStandardMaterial({ color: 0xe6e0ff, roughness: 0.4, transparent: true })
    );
    vareta.position.copy(a).add(direcao.clone().multiplyScalar(0.5));
    vareta.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize());
    return vareta;
  }

  _animarEntrada(esfera) {
    const inicio = performance.now();
    const passo = () => {
      const t = Math.min(1, (performance.now() - inicio) / 260);
      esfera.scale.setScalar(0.01 + (1 - Math.pow(1 - t, 3)) * 0.99);
      if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  // Códon de parada: a proteína pronta "sai voando" e some.
  finalizarProteina(aoConcluir) {
    const elos = this._elos.splice(0);
    const varetas = this._varetas.splice(0);
    const inicio = performance.now();
    const passo = () => {
      const t = Math.min(1, (performance.now() - inicio) / 700);
      elos.forEach((esfera, i) => {
        esfera.position.y += 0.1;
        esfera.position.x += Math.sin(i + t * 6) * 0.02;
        esfera.material.transparent = true;
        esfera.material.opacity = 1 - t;
      });
      varetas.forEach((v) => (v.material.opacity = 1 - t));
      if (t < 1) {
        requestAnimationFrame(passo);
      } else {
        elos.forEach((e) => this.grupo.remove(e));
        varetas.forEach((v) => this.grupo.remove(v));
        if (aoConcluir) aoConcluir();
      }
    };
    requestAnimationFrame(passo);
  }

  limparCadeia() {
    this._elos.splice(0).forEach((e) => this.grupo.remove(e));
    this._varetas.splice(0).forEach((v) => this.grupo.remove(v));
  }

  atualizar(delta) {
    this._relogio += delta;
    this.subGrande.position.y = 1.75 + Math.sin(this._relogio * 1.2) * 0.05;
    this.subPequena.rotation.y += delta * 0.3;

    this.materialPonto.color.setHex(this._pronto ? 0x4dff9a : 0xffd24d);
    this.materialPonto.opacity = this._pronto ? 0.7 + Math.sin(this._relogio * 8) * 0.3 : 0.6;
    this.pontosAnel.forEach((p, i) => {
      p.position.y = 0.12 + (this._pronto ? Math.abs(Math.sin(this._relogio * 5 + i * 0.5)) * 0.2 : 0);
    });
    this.luzPronto.intensity += ((this._pronto ? 4 : 0) - this.luzPronto.intensity) * 0.1;
  }
}
