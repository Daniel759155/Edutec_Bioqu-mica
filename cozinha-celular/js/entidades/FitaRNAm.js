// A fita de RNAm que atravessa o ribossomo: um fio luminoso com os
// nucleotídeos (A, U, G, C) em blocos coloridos e, embaixo de cada códon, o
// aminoácido correspondente. A fita desliza para que o códon atual fique
// sempre dentro do ribossomo — como na tradução de verdade.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { criarRotulo } from "../utils/RotuloTexto.js";

const CORES_BASE = { A: 0xff5c7a, U: 0xffd24d, G: 0x4dff9a, C: 0x4dc3ff };
const ESPACO = 0.62;
const ALTURA = 2.35;
const GEOMETRIA_BLOCO = new RoundedBoxGeometry(0.5, 0.5, 0.18, 3, 0.1);

export class FitaRNAm {
  constructor() {
    this.grupo = new THREE.Group();
    this.grupo.position.set(0, ALTURA, 1.05);

    const fio = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 26, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    );
    fio.rotation.z = Math.PI / 2;
    this.grupo.add(fio);

    this.trilho = new THREE.Group();
    this.grupo.add(this.trilho);
    this._alvoX = 0;
  }

  // codons: ["AUG", ...]; rotulos: texto de cada códon ("Met", "STOP"...).
  montar(codons, rotulos) {
    this._limpar();
    this.codons = codons;
    this.rotulos = rotulos;
    this.blocos = [];
    this.marcadores = [];

    codons.forEach((codon, c) => {
      [...codon].forEach((base, b) => {
        const x = (c * 3 + b) * ESPACO;
        const material = new THREE.MeshPhysicalMaterial({
          color: CORES_BASE[base],
          emissive: CORES_BASE[base],
          emissiveIntensity: 0.35,
          roughness: 0.3,
          clearcoat: 0.8,
          transparent: true,
        });
        const bloco = new THREE.Mesh(GEOMETRIA_BLOCO, material);
        bloco.position.x = x;
        const letra = criarRotulo([base], "#ffffff", { largura: 0.9, fonte: 64, titulo: true, brilho: false });
        letra.position.z = 0.12;
        bloco.add(letra);
        this.trilho.add(bloco);
        this.blocos.push(bloco);
      });

      const marcador = new THREE.Group();
      marcador.position.set((c * 3 + 1) * ESPACO, -0.48, 0);
      this.trilho.add(marcador);
      this.marcadores.push(marcador);
    });
  }

  _limpar() {
    this.trilho.children.slice().forEach((filho) => {
      this.trilho.remove(filho);
      filho.traverse((o) => {
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    });
  }

  // Atualiza cores/rótulos conforme o progresso: feito ✓, atual ?, pendente, STOP.
  marcarProgresso(indiceAtual) {
    this._alvoX = -(indiceAtual * 3 + 1) * ESPACO;
    this.marcadores.forEach((marcador, c) => {
      marcador.children.slice().forEach((f) => marcador.remove(f));
      const ehParada = this.rotulos[c] === "STOP";
      let cor = "#8fa8d8";
      let texto = this.rotulos[c];
      if (ehParada) cor = "#ff5c7a";
      else if (c < indiceAtual) {
        cor = "#4dff9a";
        texto += " ✓";
      } else if (c === indiceAtual) {
        cor = "#ffd24d";
        texto += " ?";
      }

      const barra = new THREE.Mesh(
        new THREE.BoxGeometry(ESPACO * 3 - 0.14, 0.05, 0.02),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(cor) })
      );
      marcador.add(barra);
      const rotulo = criarRotulo([texto], cor, { largura: 1.5, fonte: 46 });
      rotulo.position.y = -0.3;
      marcador.add(rotulo);

      // Códons já lidos ficam apagados, como se já tivessem passado pelo ribossomo.
      for (let b = 0; b < 3; b++) {
        const bloco = this.blocos[c * 3 + b];
        bloco.material.opacity = c < indiceAtual ? 0.45 : 1;
      }
    });
  }

  atualizar(delta) {
    this.trilho.position.x += (this._alvoX - this.trilho.position.x) * (1 - Math.pow(0.02, delta));
  }
}
