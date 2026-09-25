// Construtor de moléculas "bola-e-vareta" feitas só com esferas e cilindros
// (sem arquivos 3D externos). Cada átomo guarda o elemento em userData para
// o tooltip do Raycaster mostrar "C carbono", "O oxigênio" etc.

import * as THREE from "three";
import { criarHalo, ehMobile } from "./base.js";

// Cores seguem o Design System: C teal, O vermelho (danger), H branco,
// N cyan, P amber (energia/ATP).
// "papel" é a segunda linha do tooltip (o que o átomo faz na molécula).
export const ELEMENTOS = {
  C: { nome: "Carbono", cor: 0x2ef2c4, raio: 0.42, papel: "forma o esqueleto da molécula" },
  O: { nome: "Oxigênio", cor: 0xff5c7a, raio: 0.4, papel: "forma hidroxilas e grupos polares" },
  H: { nome: "Hidrogênio", cor: 0xeaf2ff, raio: 0.24, papel: "completa as ligações do carbono" },
  N: { nome: "Nitrogênio", cor: 0x38bdf8, raio: 0.4, papel: "presente nas bases e nos grupos amino" },
  P: { nome: "Fósforo", cor: 0xffb547, raio: 0.46, papel: "liga os fosfatos que guardam energia" },
  S: { nome: "Enxofre", cor: 0xfde047, raio: 0.46, papel: "forma pontes dissulfeto nas proteínas" },
};

const COR_LIGACAO = 0x8da2c0;
const _geoEsfera = new THREE.SphereGeometry(1, ehMobile ? 20 : 32, ehMobile ? 14 : 24);
const _geoCilindro = new THREE.CylinderGeometry(1, 1, 1, 12);
const _materiais = new Map();

// Material "úmido" e brilhante do átomo (um por elemento, reaproveitado).
function materialDo(elemento) {
  if (!_materiais.has(elemento)) {
    const { cor } = ELEMENTOS[elemento];
    _materiais.set(
      elemento,
      new THREE.MeshPhysicalMaterial({
        color: cor,
        emissive: cor,
        emissiveIntensity: elemento === "H" ? 0.15 : 0.35,
        roughness: 0.25,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
      })
    );
  }
  return _materiais.get(elemento);
}

const _materialLigacao = new THREE.MeshStandardMaterial({ color: COR_LIGACAO, roughness: 0.45, metalness: 0.1 });

// Cilindro ligando dois pontos.
export function criarLigacao(a, b, raio = 0.08, material = _materialLigacao) {
  const direcao = new THREE.Vector3().subVectors(b, a);
  const cilindro = new THREE.Mesh(_geoCilindro, material);
  cilindro.scale.set(raio, direcao.length(), raio);
  cilindro.position.copy(a).addScaledVector(direcao, 0.5);
  cilindro.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize());
  return cilindro;
}

export function criarAtomo(elemento, posicao, { halo = true } = {}) {
  const dados = ELEMENTOS[elemento];
  const esfera = new THREE.Mesh(_geoEsfera, materialDo(elemento));
  esfera.scale.setScalar(dados.raio);
  esfera.position.copy(posicao);
  esfera.userData = { elemento, nome: dados.nome, papel: dados.papel };
  if (halo && elemento !== "H") {
    const brilho = criarHalo(dados.cor, 3.2); // em escala local: 3.2 × raio
    brilho.material.opacity = 0.35;
    esfera.add(brilho);
  }
  return esfera;
}

// definicao: { atomos: [{ el: "C", p: [x, y, z] }], ligacoes: [[i, j], ...] }
// Devolve um THREE.Group centrado na origem; group.userData.atomos = meshes.
export function montarMolecula(definicao, opcoes = {}) {
  const grupo = new THREE.Group();
  const posicoes = definicao.atomos.map((a) => new THREE.Vector3(...a.p));

  // Centraliza a molécula na origem.
  const centro = new THREE.Box3().setFromPoints(posicoes).getCenter(new THREE.Vector3());
  posicoes.forEach((p) => p.sub(centro));

  definicao.ligacoes.forEach(([i, j]) => grupo.add(criarLigacao(posicoes[i], posicoes[j])));
  const atomos = definicao.atomos.map((a, i) => {
    const atomo = criarAtomo(a.el, posicoes[i], opcoes);
    if (a.papel) atomo.userData.papel = a.papel; // descrição específica deste átomo
    grupo.add(atomo);
    return atomo;
  });
  grupo.userData.atomos = atomos;
  return grupo;
}

// Ajuda a montar substituintes: ponto a partir de "origem" na direção (dx, dy, dz).
function somar(origem, dx, dy, dz = 0) {
  return [origem[0] + dx, origem[1] + dy, origem[2] + dz];
}

// ---------------------------------------------------------------------------
// GLICOSE C6H12O6 (forma em anel, piranose): anel com 5 carbonos + 1 oxigênio,
// hidroxilas (OH) em C1–C4, grupo CH2OH em C5 e um H em cada carbono do anel.
// Total: 6 C, 12 H e 6 O — a fórmula real da glicose.
// ---------------------------------------------------------------------------
export function definicaoGlicose() {
  const R = 1.45;
  const atomos = [];
  const ligacoes = [];
  const add = (el, p) => atomos.push({ el, p }) - 1;

  // Anel: O5 no topo, depois C1…C5 no sentido horário.
  const angulos = [90, 30, -30, -90, -150, 150].map((g) => (g * Math.PI) / 180);
  const anel = angulos.map((a, i) => add(i === 0 ? "O" : "C", [Math.cos(a) * R, Math.sin(a) * R, 0]));
  anel.forEach((idx, i) => ligacoes.push([idx, anel[(i + 1) % 6]]));

  // Carbonos C1..C5 = anel[1..5]. Substituintes para fora do anel.
  for (let i = 1; i <= 5; i++) {
    const a = angulos[i];
    const c = atomos[anel[i]].p;
    const fora = [Math.cos(a), Math.sin(a)];

    // H axial (alternando para frente e para trás, como na cadeira).
    const h = add("H", somar(c, fora[0] * 0.25, fora[1] * 0.25, i % 2 ? 0.95 : -0.95));
    ligacoes.push([anel[i], h]);

    if (i <= 4) {
      // Hidroxila O–H em C1, C2, C3 e C4.
      const o = add("O", somar(c, fora[0] * 1.2, fora[1] * 1.2, i % 2 ? -0.35 : 0.35));
      ligacoes.push([anel[i], o]);
      const giro = a + 0.9;
      const ho = add("H", somar(atomos[o].p, Math.cos(giro) * 0.75, Math.sin(giro) * 0.75));
      ligacoes.push([o, ho]);
    } else {
      // C5 → C6 (CH2OH)
      const c6 = add("C", somar(c, fora[0] * 1.35, fora[1] * 1.35 + 0.2, 0.3));
      ligacoes.push([anel[i], c6]);
      const p6 = atomos[c6].p;
      const h6a = add("H", somar(p6, -0.2, 0.55, 0.75));
      const h6b = add("H", somar(p6, 0.15, -0.35, 0.85));
      const o6 = add("O", somar(p6, -1.1, 0.55, -0.2));
      const ho6 = add("H", somar(atomos[o6].p, -0.45, 0.6, 0));
      ligacoes.push([c6, h6a], [c6, h6b], [c6, o6], [o6, ho6]);
    }
  }
  return { atomos, ligacoes };
}

// ---------------------------------------------------------------------------
// Ferramentas de desenho 2D → 3D para montar anéis e cadeias.
// ---------------------------------------------------------------------------
const graus = (g) => (g * Math.PI) / 180;

// Monta uma molécula a partir dos átomos pesados (com posições) e deixa o
// código acrescentar os hidrogênios apontando "para fora".
class Montador {
  constructor() {
    this.atomos = [];
    this.ligacoes = [];
  }
  add(el, p, papel) {
    this.atomos.push({ el, p: [p[0], p[1], p[2] || 0], papel });
    return this.atomos.length - 1;
  }
  ligar(...pares) {
    pares.forEach(([a, b]) => this.ligacoes.push([a, b]));
  }
  p(i) {
    return this.atomos[i].p;
  }
  // Hidrogênio preso ao átomo i, na direção (dx, dy, dz), a "comprimento" de distância.
  h(i, dx, dy, dz = 0, comprimento = 1) {
    const len = Math.hypot(dx, dy, dz) || 1;
    const [x, y, z] = this.p(i);
    const hi = this.add("H", [x + (dx / len) * comprimento, y + (dy / len) * comprimento, z + (dz / len) * comprimento]);
    this.ligar([i, hi]);
    return hi;
  }
  // Direção que "sai" do átomo i, oposta ao centro (cx, cy) de um anel.
  fora(i, cx, cy) {
    const [x, y] = this.p(i);
    return [x - cx, y - cy];
  }
  definicao() {
    return { atomos: this.atomos, ligacoes: this.ligacoes };
  }
}

// Vértices de um polígono regular de n lados com o 1º vértice no ângulo a0.
function poligono(cx, cy, raio, n, a0) {
  return Array.from({ length: n }, (_, k) => {
    const a = a0 + (k * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * raio, cy + Math.sin(a) * raio];
  });
}

// ---------------------------------------------------------------------------
// ATP — adenosina trifosfato, C10H16N5O13P3: adenina (anel duplo) + ribose
// (açúcar de 5 carbonos) + cadeia de 3 fosfatos, onde fica a energia.
// ---------------------------------------------------------------------------
export function definicaoATP() {
  const m = new Montador();
  const L = 1.4; // comprimento típico de ligação
  const BASE = "faz parte da base nitrogenada adenina";

  // Adenina: anel de 6 (N1, C2, N3, C4, C5, C6) fundido ao anel de 5 (C4, C5, N7, C8, N9).
  const cx6 = -6.2;
  const cy6 = 0.6;
  const v6 = poligono(cx6, cy6, L, 6, graus(90));
  const [pC6, pN1, pC2, pN3, pC4, pC5] = v6;
  const C6 = m.add("C", pC6);
  const N1 = m.add("N", pN1, BASE);
  const C2 = m.add("C", pC2);
  const N3 = m.add("N", pN3, BASE);
  const C4 = m.add("C", pC4);
  const C5 = m.add("C", pC5);
  m.ligar([N1, C2], [C2, N3], [N3, C4], [C4, C5], [C5, C6], [C6, N1]);

  // Anel de 5 construído para fora da aresta C4–C5.
  const meioX = (pC4[0] + pC5[0]) / 2;
  const meioY = (pC4[1] + pC5[1]) / 2;
  const nx = meioX - cx6;
  const ny = meioY - cy6;
  const nl = Math.hypot(nx, ny);
  const r5 = L / (2 * Math.sin(Math.PI / 5));
  const ap5 = L / (2 * Math.tan(Math.PI / 5));
  const c5x = meioX + (nx / nl) * ap5;
  const c5y = meioY + (ny / nl) * ap5;
  // Começa no C5 e gira no sentido que se afasta do C4: C5, N7, C8, N9, C4.
  const aC5 = Math.atan2(pC5[1] - c5y, pC5[0] - c5x);
  const aC4 = Math.atan2(pC4[1] - c5y, pC4[0] - c5x);
  const passo = (2 * Math.PI) / 5;
  const sentido = Math.abs(Math.atan2(Math.sin(aC5 - passo - aC4), Math.cos(aC5 - passo - aC4))) < 0.01 ? 1 : -1;
  const v5 = [1, 2, 3].map((k) => [c5x + Math.cos(aC5 + sentido * k * passo) * r5, c5y + Math.sin(aC5 + sentido * k * passo) * r5]);
  const N7 = m.add("N", v5[0], BASE);
  const C8 = m.add("C", v5[1]);
  const N9 = m.add("N", v5[2], "liga a adenina ao açúcar ribose");
  m.ligar([C5, N7], [N7, C8], [C8, N9], [N9, C4]);

  // Grupo amino (NH2) no C6 e hidrogênios da adenina.
  const [dx6, dy6] = m.fora(C6, cx6, cy6);
  const N6 = m.add("N", [pC6[0] + dx6, pC6[1] + dy6, 0], "grupo amino (–NH2) da adenina");
  m.ligar([C6, N6]);
  m.h(N6, -0.8, 0.9, 0.3);
  m.h(N6, 0.9, 0.6, -0.4);
  m.h(C2, ...m.fora(C2, cx6, cy6));
  m.h(C8, ...m.fora(C8, c5x, c5y));

  // Ribose (anel de 5: C1', C2', C3', C4', O4') presa ao N9.
  const [dxn, dyn] = m.fora(N9, c5x, c5y);
  const dl = Math.hypot(dxn, dyn);
  const pN9 = m.p(N9);
  const crx = pN9[0] + (dxn / dl) * (L + r5);
  const cry = pN9[1] + (dyn / dl) * (L + r5);
  const vr = poligono(crx, cry, r5, 5, Math.atan2(pN9[1] - cry, pN9[0] - crx));
  const C1r = m.add("C", [vr[0][0], vr[0][1], 0.2], "carbono 1' da ribose");
  const C2r = m.add("C", [vr[1][0], vr[1][1], -0.5], "carbono 2' da ribose");
  const C3r = m.add("C", [vr[2][0], vr[2][1], -0.5], "carbono 3' da ribose");
  const C4r = m.add("C", [vr[3][0], vr[3][1], 0.2], "carbono 4' da ribose");
  const O4r = m.add("O", [vr[4][0], vr[4][1], 0.5], "oxigênio do anel da ribose");
  m.ligar([N9, C1r], [C1r, C2r], [C2r, C3r], [C3r, C4r], [C4r, O4r], [O4r, C1r]);
  [C1r, C2r, C3r, C4r].forEach((c) => m.h(c, 0, 0, c === C1r || c === C4r ? 1 : -1));

  // Hidroxilas 2' e 3' (saindo do anel, um pouco para trás).
  [C2r, C3r].forEach((c) => {
    const [x, y, z] = m.p(c);
    const [fx, fy] = m.fora(c, crx, cry);
    const fl = Math.hypot(fx, fy);
    const o = m.add("O", [x + (fx / fl) * L, y + (fy / fl) * L, z - 0.4], "hidroxila (–OH) da ribose");
    m.ligar([c, o]);
    m.h(o, fx, fy - 0.8, -0.3, 0.9);
  });

  // C5' e O5' levando à cadeia de fosfatos (sempre para a direita).
  const [x4, y4] = m.p(C4r);
  const C5r = m.add("C", [x4 + 1.2, y4 + 0.8, 0.4], "carbono 5' da ribose");
  m.ligar([C4r, C5r]);
  m.h(C5r, 0, 1, 0.6);
  m.h(C5r, 0.2, 0.3, -1);
  const O5r = m.add("O", [x4 + 2.5, y4 + 0.4, 0], "liga a ribose ao primeiro fosfato");
  m.ligar([C5r, O5r]);

  // Três fosfatos (α, β, γ) em zigue-zague.
  let anterior = O5r;
  const letras = ["α", "β", "γ"];
  letras.forEach((letra, i) => {
    const [xa, ya] = m.p(anterior);
    const papelP = i === 2 ? "fosfato γ: sua ligação libera a energia do ATP" : `fosfato ${letra}: guarda energia nas ligações`;
    const P = m.add("P", [xa + 1.35, ya + (i % 2 ? 0.45 : -0.45), 0], papelP);
    m.ligar([anterior, P]);
    const [xp, yp] = m.p(P);
    const Oa = m.add("O", [xp, yp + 1.45, 0.4], `oxigênio do fosfato ${letra}`);
    const Ob = m.add("O", [xp + 0.2, yp - 1.35, -0.6], `oxigênio do fosfato ${letra}`);
    m.ligar([P, Oa], [P, Ob]);
    // Hidrogênios ácidos: 1 no α, 1 no β e 2 no γ (ATP totalmente protonado: 16 H).
    m.h(Ob, 0.5, -0.8, -0.2, 0.9);
    const papelPonte = i === 2 ? "oxigênio terminal do fosfato γ" : `ponte entre os fosfatos ${letra} e ${letras[i + 1]}`;
    const ponte = m.add("O", [xp + 1.35, yp + (i % 2 ? -0.45 : 0.45), 0], papelPonte);
    m.ligar([P, ponte]);
    if (i === 2) m.h(ponte, 0.8, 0.5, 0.3, 0.9);
    anterior = ponte;
  });

  return m.definicao();
}

// ---------------------------------------------------------------------------
// AMINOÁCIDO — alanina, C3H7NO2: carbono alfa ligado a um grupo amino (NH2),
// um grupo carboxila (COOH), um hidrogênio e a cadeia lateral R (CH3).
// ---------------------------------------------------------------------------
export function definicaoAminoacido() {
  const m = new Montador();
  const Ca = m.add("C", [0, 0, 0], "carbono alfa: o centro de todo aminoácido");
  const N = m.add("N", [-1.35, 0.75, 0], "grupo amino (–NH2)");
  const Cc = m.add("C", [1.4, 0.75, 0], "carbono da carboxila (–COOH)");
  const Cb = m.add("C", [0, -1.5, 0.3], "cadeia lateral R: na alanina, um CH3");
  m.ligar([Ca, N], [Ca, Cc], [Ca, Cb]);
  m.h(Ca, 0, 0.2, -1);
  m.h(N, -0.6, 0.8, 0.4);
  m.h(N, -0.8, -0.2, -0.6);
  const O1 = m.add("O", [2.5, 0.05, 0], "oxigênio da carboxila");
  const O2 = m.add("O", [1.5, 2.1, 0], "hidroxila da carboxila (–OH)");
  m.ligar([Cc, O1], [Cc, O2]);
  m.h(O2, 0.8, 0.6, 0, 0.9);
  m.h(Cb, -0.9, -0.5, 0.3);
  m.h(Cb, 0.9, -0.5, 0.3);
  m.h(Cb, 0, -0.6, -1);
  return m.definicao();
}
