// A fita de RNAm que atravessa o ribossomo: um fio luminoso com os
// nucleotídeos (A, U, G, C) em blocos coloridos e, embaixo de cada códon, o
// aminoácido correspondente. A fita desliza para que o códon atual fique
// sempre dentro do ribossomo — como na tradução de verdade.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { criarRotulo } from "../utils/RotuloTexto.js";

const CORES_BASE = { A: "#ff5c7a", U: "#ffd24d", G: "#4dff9a", C: "#4dc3ff" };
const ESPACO = 0.62;
const ALTURA = 2.35;
const GEOMETRIA_BLOCO = new RoundedBoxGeometry(0.5, 0.5, 0.12, 3, 0.1);
const GEOMETRIA_FACE = new THREE.PlaneGeometry(0.66, 0.66);
const texturasBase = {};

// Face do nucleotídeo como no Figma: bloco arredondado com gradiente
// (cor da base → roxo escuro), borda branca fina, brilho e a letra.
function texturaBase(base) {
  if (texturasBase[base]) return texturasBase[base];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 160;
  const ctx = canvas.getContext("2d");
  const cor = CORES_BASE[base];
  const x = 23;
  const lado = 114;
  const raio = 31;
  const caminho = () => {
    ctx.beginPath();
    ctx.roundRect(x, x, lado, lado, raio);
  };

  ctx.shadowColor = cor;
  ctx.shadowBlur = 22;
  const gradiente = ctx.createLinearGradient(x + lado, x, x, x + lado);
  gradiente.addColorStop(0.11, cor);
  gradiente.addColorStop(0.89, "#2a1766");
  ctx.fillStyle = gradiente;
  caminho();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  caminho();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = '900 66px "Montserrat", "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(base, 80, 84);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  texturasBase[base] = textura;
  return textura;
}

export class FitaRNAm {
  constructor() {
    this.grupo = new THREE.Group();
    this.grupo.position.set(0, ALTURA, 1.05);

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

    // Fio branco luminoso só sob os códons (como no Figma), andando junto com eles.
    const comprimento = (codons.length * 3 - 1) * ESPACO + 0.9;
    const fio = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, comprimento, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    );
    fio.rotation.z = Math.PI / 2;
    fio.position.set(((codons.length * 3 - 1) * ESPACO) / 2, 0, -0.08);
    this.trilho.add(fio);

    codons.forEach((codon, c) => {
      [...codon].forEach((base, b) => {
        const x = (c * 3 + b) * ESPACO;
        // Corpo escuro (dá volume) + face desenhada com a arte do Figma.
        const material = new THREE.MeshStandardMaterial({ color: 0x2a1766, roughness: 0.4, transparent: true });
        const bloco = new THREE.Mesh(GEOMETRIA_BLOCO, material);
        bloco.position.x = x;
        const face = new THREE.Mesh(
          GEOMETRIA_FACE,
          new THREE.MeshBasicMaterial({ map: texturaBase(base), transparent: true, depthWrite: false })
        );
        face.position.z = 0.07;
        bloco.add(face);
        bloco.userData.face = face;
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
          if (o.material.map && !Object.values(texturasBase).includes(o.material.map)) o.material.map.dispose();
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
        const opacidade = c < indiceAtual ? 0.45 : 1;
        bloco.material.opacity = opacidade;
        bloco.userData.face.material.opacity = opacidade;
      }
    });
  }

  atualizar(delta) {
    this.trilho.position.x += (this._alvoX - this.trilho.position.x) * (1 - Math.pow(0.02, delta));
  }
}
