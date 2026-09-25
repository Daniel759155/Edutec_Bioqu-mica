// Componente "3D / DNA Helix" (Figma 303:179).
// Dupla hélice com esferas teal (fita 1) e violeta (fita 2) ligadas por
// "degraus" (pares de bases). Gira sozinha no eixo Y a 0.3 rad/s, acelera
// com o scroll e inclina seguindo o mouse (±15°).
// Uso: <div data-3d="dna" data-fallback="assets/3d/dna-helix.svg"></div>

import * as THREE from "three";
import { Palco3D, criarHalo, distanciaParaCaber, ehMobile, movimentoReduzido, mouse } from "./base.js";

const TEAL = 0x2ef2c4;
const VIOLETA = 0x8b5cf6;
const INCLINACAO_MAX = THREE.MathUtils.degToRad(15);
const VELOCIDADE_BASE = 0.3; // rad/s

// Monta só a hélice (THREE.Group), para ser reaproveitada em outras cenas.
export function criarHelice({ pares = ehMobile ? 14 : 22, raio = 1.6, passo = 0.5, giroPorPar = 0.52 } = {}) {
  const grupo = new THREE.Group();
  const geoEsfera = new THREE.SphereGeometry(1, ehMobile ? 18 : 28, ehMobile ? 12 : 20);
  const matTeal = new THREE.MeshPhysicalMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 0.45, roughness: 0.2, clearcoat: 1 });
  const matVioleta = new THREE.MeshPhysicalMaterial({ color: VIOLETA, emissive: VIOLETA, emissiveIntensity: 0.5, roughness: 0.2, clearcoat: 1 });
  const matLigTeal = new THREE.MeshStandardMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 0.25, transparent: true, opacity: 0.7 });
  const matLigVioleta = new THREE.MeshStandardMaterial({ color: VIOLETA, emissive: VIOLETA, emissiveIntensity: 0.25, transparent: true, opacity: 0.7 });
  const geoLigacao = new THREE.CylinderGeometry(0.035, 0.035, 1, 8);
  const altura = (pares - 1) * passo;

  const esferas = [];
  for (let i = 0; i < pares; i++) {
    const angulo = i * giroPorPar;
    const y = i * passo - altura / 2;
    const a = new THREE.Vector3(Math.cos(angulo) * raio, y, Math.sin(angulo) * raio);
    const b = new THREE.Vector3(-a.x, y, -a.z);

    [
      [a, matTeal, TEAL],
      [b, matVioleta, VIOLETA],
    ].forEach(([pos, mat, cor]) => {
      const esfera = new THREE.Mesh(geoEsfera, mat);
      esfera.scale.setScalar(0.26);
      esfera.position.copy(pos);
      esfera.add(criarHalo(cor, 4.2));
      grupo.add(esfera);
      esferas.push(esfera);
    });

    // Degrau: metade teal (lado da fita 1), metade violeta (lado da fita 2).
    const meio = new THREE.Vector3(0, y, 0);
    [
      [a, matLigTeal],
      [b, matLigVioleta],
    ].forEach(([ponta, mat]) => {
      const direcao = new THREE.Vector3().subVectors(meio, ponta);
      const ligacao = new THREE.Mesh(geoLigacao, mat);
      ligacao.scale.y = direcao.length();
      ligacao.position.copy(ponta).addScaledVector(direcao, 0.5);
      ligacao.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize());
      grupo.add(ligacao);
    });
  }
  grupo.userData = { esferas, altura, giroPorPar, passo };
  return grupo;
}

// Monta a cena completa num contêiner. opcoes vêm dos data-attributes:
// data-inclinacao (graus no eixo Z, padrão 0) e data-distancia (câmera fixa;
// sem ele, a câmera se afasta o suficiente para a hélice inteira caber).
export function montar(container) {
  const palco = new Palco3D(container, { fov: 35 });
  const helice = criarHelice();
  const distanciaFixa = Number(container.dataset.distancia);
  palco.aoRedimensionar = () => {
    // Folga extra para a inclinação do mouse (±15°) não cortar as pontas.
    palco.camera.position.z = distanciaFixa || distanciaParaCaber(palco.camera, 4.6, helice.userData.altura + 1, 4, 1.18);
  };
  palco.aoRedimensionar();
  const pivo = new THREE.Group(); // recebe a inclinação do mouse
  pivo.rotation.z = THREE.MathUtils.degToRad(Number(container.dataset.inclinacao) || 0);
  pivo.add(helice);
  palco.scene.add(pivo);

  // Scroll acelera a rotação: a velocidade extra decai suavemente.
  let impulsoScroll = 0;
  let ultimoScroll = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const dy = Math.abs(window.scrollY - ultimoScroll);
      ultimoScroll = window.scrollY;
      impulsoScroll = Math.min(impulsoScroll + dy * 0.004, 3);
    },
    { passive: true }
  );

  const inclinacaoBase = pivo.rotation.z;
  palco.aoAtualizar((delta) => {
    if (movimentoReduzido) return;
    helice.rotation.y += (VELOCIDADE_BASE + impulsoScroll) * delta;
    impulsoScroll *= Math.pow(0.1, delta); // perde ~90% do impulso por segundo

    // Parallax do mouse: inclina até ±15° (suavizado).
    const alvoX = mouse.y * INCLINACAO_MAX;
    const alvoZ = inclinacaoBase - mouse.x * INCLINACAO_MAX;
    pivo.rotation.x += (alvoX - pivo.rotation.x) * Math.min(1, delta * 3);
    pivo.rotation.z += (alvoZ - pivo.rotation.z) * Math.min(1, delta * 3);
  });

  // API usada pela página Biomoléculas ("clicar no par de bases gira a hélice até ele").
  palco.helice = helice;
  palco.girarPara = (indicePar) => {
    helice.rotation.y = -indicePar * helice.userData.giroPorPar;
  };
  return palco;
}
