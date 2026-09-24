// Fase 2 — Mitocôndria: o jogador percorre a respiração celular em ordem.
// 1) Glicólise (no citoplasma): glicose → piruvato
// 2) Ciclo de Krebs (na matriz): piruvato → NADH
// 3) Cadeia respiratória (complexos I, III, IV): NADH bombeia prótons
// 4) ATP sintase: o fluxo de prótons gira o rotor e produz ATP
// A arena é a própria mitocôndria, com as cristas funcionando como paredes.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FaseBase } from "./FaseBase.js";
import { criarRotulo } from "../utils/RotuloTexto.js";

const L = 8; // metade do trecho reto da cápsula
const R = 6.2; // raio das pontas arredondadas
const CENTRO_CITOPLASMA = new THREE.Vector3(-18.4, 0, 0);
const RAIO_CITOPLASMA = 2.5;
const CORREDOR = { x0: -16.6, x1: -13.4, meiaLargura: 1.25 };

// Cristas: paredes que saem da borda de cima (z < 0) ou de baixo (z > 0).
const CRISTAS = [
  { x: -7, lado: -1 },
  { x: -2.6, lado: -1 },
  { x: 6, lado: -1 },
  { x: -4.8, lado: 1 },
  { x: 2.6, lado: 1 },
  { x: 7.2, lado: 1 },
];
const CRISTA = { espessura: 0.7, comprimento: 3.9 };

const PASSOS = [
  { texto: "← Pegue GLICOSE no citoplasma", estacao: "glicolise" },
  { texto: "Leve o PIRUVATO ao Ciclo de Krebs →", estacao: "krebs" },
  { texto: "Entregue o NADH na cadeia respiratória ↑", estacao: "cadeia" },
  { texto: "Gire a ATP SINTASE! →", estacao: "sintase" },
];

function formaCapsula(meioComprimento, raio) {
  const forma = new THREE.Shape();
  forma.moveTo(-meioComprimento, -raio);
  forma.lineTo(meioComprimento, -raio);
  forma.absarc(meioComprimento, 0, raio, -Math.PI / 2, Math.PI / 2, false);
  forma.lineTo(-meioComprimento, raio);
  forma.absarc(-meioComprimento, 0, raio, Math.PI / 2, (3 * Math.PI) / 2, false);
  return forma;
}

// Contorno da cápsula a partir da ponta esquerda, deixando uma "porta" no
// lado do citoplasma (por onde passa o corredor).
function contornoComPorta(meioComprimento, raio, altura) {
  const pontos = [];
  const passos = 180;
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    const perimetroReto = 2 * meioComprimento;
    const perimetroCurvo = Math.PI * raio;
    const total = 2 * perimetroReto + 2 * perimetroCurvo;
    let d = t * total;
    let x;
    let z;
    // Metade de baixo da ponta esquerda → reta de baixo → ponta direita → reta de cima → metade de cima da ponta esquerda.
    if (d < perimetroCurvo / 2) {
      const a = Math.PI + d / raio;
      x = -meioComprimento + Math.cos(a) * raio;
      z = -Math.sin(a) * raio;
    } else if ((d -= perimetroCurvo / 2) < perimetroReto) {
      x = -meioComprimento + d;
      z = raio;
    } else if ((d -= perimetroReto) < perimetroCurvo) {
      const a = Math.PI / 2 - d / raio;
      x = meioComprimento + Math.cos(a) * raio;
      z = Math.sin(a) * raio;
    } else if ((d -= perimetroCurvo) < perimetroReto) {
      x = meioComprimento - d;
      z = -raio;
    } else {
      d -= perimetroReto;
      const a = -Math.PI / 2 - d / raio;
      x = -meioComprimento + Math.cos(a) * raio;
      z = Math.sin(a) * raio;
    }
    if (x < -meioComprimento - raio + 1.2 && Math.abs(z) < CORREDOR.meiaLargura + 0.3) continue;
    pontos.push(new THREE.Vector3(x, altura, z));
  }
  return new THREE.CatmullRomCurve3(pontos);
}

function materialOrganico(cor, emissivo, intensidade = 0.4) {
  return new THREE.MeshStandardMaterial({ color: cor, emissive: emissivo, emissiveIntensity: intensidade, roughness: 0.55 });
}

export class Fase2Mitocondria extends FaseBase {
  constructor(ctx, info) {
    super(ctx, info);
    this.duracao = 90;
  }

  construir() {
    this._construirMembranas();
    this._construirCristas();
    this._construirCitoplasma();
    this._construirKrebs();
    this._construirCadeia();
    this._construirSintase();

    this.indicador = new THREE.Group();
    this.indicador.position.set(0.6, 0.85, 0);
    this.ctx.jogador.grupo.add(this.indicador);
  }

  desmontar() {
    this.ctx.jogador.grupo.remove(this.indicador);
    super.desmontar();
  }

  _adicionarPlano(forma, material, y) {
    const malha = new THREE.Mesh(new THREE.ShapeGeometry(forma, 48), material);
    malha.rotation.x = -Math.PI / 2;
    malha.position.y = y;
    malha.receiveShadow = true;
    this.grupo.add(malha);
    return malha;
  }

  _construirMembranas() {
    // Membrana externa, espaço intermembranas e matriz, em camadas.
    this._adicionarPlano(formaCapsula(L, R + 1.3), materialOrganico(0xe4602f, 0xc7361f, 0.55), -0.06);
    this._adicionarPlano(formaCapsula(L, R + 0.7), materialOrganico(0xffae66, 0xe4602f, 0.35), -0.04);
    this._adicionarPlano(formaCapsula(L, R), materialOrganico(0x5c1c12, 0x2a0a06, 0.5), 0);

    const membranaInterna = new THREE.Mesh(
      new THREE.TubeGeometry(contornoComPorta(L, R, 0.12), 360, 0.16, 8, false),
      new THREE.MeshStandardMaterial({ color: 0xffd6a0, emissive: 0xffa060, emissiveIntensity: 0.8, roughness: 0.4 })
    );
    this.grupo.add(membranaInterna);

    const membranaExterna = new THREE.Mesh(
      new THREE.TubeGeometry(contornoComPorta(L, R + 1.3, 0.2), 360, 0.3, 10, false),
      new THREE.MeshStandardMaterial({ color: 0xff9a4d, emissive: 0xff6a3d, emissiveIntensity: 0.9, roughness: 0.35 })
    );
    this.grupo.add(membranaExterna);

    const rotuloMatriz = criarRotulo(["MATRIZ MITOCONDRIAL"], "#ffd6a0", { largura: 4, fonte: 30 });
    rotuloMatriz.position.set(-9.5, 0.3, 3.8);
    rotuloMatriz.material.opacity = 0.7;
    this.grupo.add(rotuloMatriz);
  }

  _construirCristas() {
    const geometria = new RoundedBoxGeometry(CRISTA.espessura, 1.1, CRISTA.comprimento, 4, 0.3);
    const material = new THREE.MeshStandardMaterial({ color: 0xffc58a, emissive: 0xff8a3d, emissiveIntensity: 0.35, roughness: 0.45 });
    this.colisores = CRISTAS.map(({ x, lado }) => {
      const zCentro = lado * (R - CRISTA.comprimento / 2);
      const crista = new THREE.Mesh(geometria, material);
      crista.position.set(x, 0.55, zCentro);
      crista.castShadow = true;
      crista.receiveShadow = true;
      this.grupo.add(crista);
      return {
        x0: x - CRISTA.espessura / 2,
        x1: x + CRISTA.espessura / 2,
        z0: zCentro - CRISTA.comprimento / 2,
        z1: zCentro + CRISTA.comprimento / 2,
      };
    });
  }

  _construirCitoplasma() {
    const materialCito = materialOrganico(0x1c1040, 0x2a1466, 0.4);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(RAIO_CITOPLASMA + 0.5, 48), materialCito);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(CENTRO_CITOPLASMA).setY(0.01);
    this.grupo.add(pad);

    const corredor = new THREE.Mesh(new THREE.PlaneGeometry(CORREDOR.x1 - CORREDOR.x0 + 0.6, CORREDOR.meiaLargura * 2), materialCito);
    corredor.rotation.x = -Math.PI / 2;
    corredor.position.set((CORREDOR.x0 + CORREDOR.x1) / 2, 0.02, 0);
    this.grupo.add(corredor);

    // Estação de glicólise: cápsula de vidro com borda verde e um hexágono (anel da glicose).
    const estacao = new THREE.Group();
    estacao.position.copy(CENTRO_CITOPLASMA);
    const borda = new THREE.Mesh(
      new RoundedBoxGeometry(1.5, 1.2, 1.5, 4, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x8cff6b, transparent: true, opacity: 0.6, side: THREE.BackSide })
    );
    borda.position.y = 0.7;
    estacao.add(borda);
    const vidro = new THREE.Mesh(
      new RoundedBoxGeometry(1.42, 1.12, 1.42, 4, 0.32),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, clearcoat: 1, depthWrite: false })
    );
    vidro.position.y = 0.7;
    estacao.add(vidro);
    this.hexagono = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.22, 6),
      new THREE.MeshPhysicalMaterial({ color: 0x8cff6b, emissive: 0x4dff5a, emissiveIntensity: 0.6, roughness: 0.2, clearcoat: 1 })
    );
    this.hexagono.rotation.x = Math.PI / 2;
    this.hexagono.position.y = 0.8;
    estacao.add(this.hexagono);
    const rotulo = criarRotulo(["Glicose → Piruvato", "CITOPLASMA"], "#ffffff", { largura: 2.8, fonte: 40, brilho: false });
    rotulo.position.y = 1.9;
    estacao.add(rotulo);
    const luz = new THREE.PointLight(0x8cff6b, 3, 5, 2);
    luz.position.y = 1;
    estacao.add(luz);
    this.grupo.add(estacao);
    this.estacaoGlicolise = estacao;
  }

  _construirKrebs() {
    const krebs = new THREE.Group();
    krebs.position.set(0, 0, 0);

    this.anelKrebs = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.09, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0xffe14d })
    );
    this.anelKrebs.rotation.x = Math.PI / 2;
    this.anelKrebs.position.y = 0.25;
    krebs.add(this.anelKrebs);

    this.pontosKrebs = new THREE.Group();
    this.pontosKrebs.position.y = 0.25;
    for (let i = 0; i < 8; i++) {
      const angulo = (i / 8) * Math.PI * 2;
      const ponto = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
      ponto.position.set(Math.cos(angulo) * 1.7, 0, Math.sin(angulo) * 1.7);
      this.pontosKrebs.add(ponto);
    }
    krebs.add(this.pontosKrebs);

    const rotulo = criarRotulo(["CICLO DE", "KREBS"], "#fff3b0", { largura: 2.6, fonte: 56, titulo: true });
    rotulo.position.y = 1.3;
    krebs.add(rotulo);

    const luz = new THREE.PointLight(0xffd24d, 4, 6, 2);
    luz.position.y = 1;
    krebs.add(luz);

    this.grupo.add(krebs);
    this.krebs = krebs;
  }

  _construirCadeia() {
    const dados = [
      { nome: "I", cor: 0xff6fd8, x: -0.6 },
      { nome: "III", cor: 0xc9a7ff, x: 1.6 },
      { nome: "IV", cor: 0x4dc3ff, x: 3.8 },
    ];
    this.complexos = dados.map(({ nome, cor, x }) => {
      const grupo = new THREE.Group();
      grupo.position.set(x, 0, -4.7);
      const corpo = new THREE.Mesh(
        new RoundedBoxGeometry(0.95, 1.9, 0.95, 4, 0.35),
        new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.35, roughness: 0.25, clearcoat: 0.8 })
      );
      corpo.position.y = 0.95;
      corpo.castShadow = true;
      grupo.add(corpo);
      const rotulo = criarRotulo([nome], "#ffffff", { largura: 1.2, fonte: 70, titulo: true, brilho: false });
      rotulo.position.set(0, 1.05, 0.52);
      grupo.add(rotulo);
      this.grupo.add(grupo);
      return grupo;
    });

    // Elétrons viajando pela cadeia (I → III → IV) quando o NADH é entregue.
    this.eletrons = [];
    const material = new THREE.MeshBasicMaterial({ color: 0x7fe7ff });
    for (let i = 0; i < 10; i++) {
      const eletron = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), material);
      eletron.visible = false;
      this.grupo.add(eletron);
      this.eletrons.push(eletron);
    }
    this._fluxoEletrons = 0;

    const rotulo = criarRotulo(["CADEIA RESPIRATÓRIA"], "#ffd0f0", { largura: 3.6, fonte: 30 });
    rotulo.position.set(1.6, 2.4, -4.7);
    this.grupo.add(rotulo);
  }

  _construirSintase() {
    const sintase = new THREE.Group();
    sintase.position.set(11.3, 0, 0);

    const haste = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 1.8, 20),
      new THREE.MeshPhysicalMaterial({ color: 0x8fdcff, emissive: 0x4da8d8, emissiveIntensity: 0.4, roughness: 0.25, clearcoat: 1 })
    );
    haste.position.y = 0.9;
    sintase.add(haste);

    this.rotor = new THREE.Group();
    this.rotor.position.y = 2.0;
    const cabeca = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 32, 20),
      new THREE.MeshPhysicalMaterial({ color: 0x9fe6ff, emissive: 0x4dc3ff, emissiveIntensity: 0.35, roughness: 0.2, clearcoat: 1 })
    );
    cabeca.scale.set(1, 0.62, 1);
    this.rotor.add(cabeca);
    for (let i = 0; i < 6; i++) {
      const angulo = (i / 6) * Math.PI * 2;
      const bolinha = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshStandardMaterial({ color: 0xeaf8ff, emissive: 0x9fe6ff, emissiveIntensity: 0.5 }));
      bolinha.position.set(Math.cos(angulo) * 0.62, 0.32, Math.sin(angulo) * 0.62);
      this.rotor.add(bolinha);
    }
    sintase.add(this.rotor);

    const rotulo = criarRotulo(["ATP SINTASE"], "#b9f3ff", { largura: 2.4, fonte: 40 });
    rotulo.position.y = 3.1;
    sintase.add(rotulo);

    this.luzSintase = new THREE.PointLight(0x7fe7ff, 1, 6, 2);
    this.luzSintase.position.y = 2;
    sintase.add(this.luzSintase);

    this.grupo.add(sintase);
    this.sintase = sintase;
  }

  preparar() {
    super.preparar();
    this.passo = 0;
    this.ciclos = 0;
    this.carregando = null;
    this._velocidadeRotor = 0.4;
    this._fluxoEletrons = 0;
    this._atualizarIndicador();

    const jogador = this.ctx.jogador;
    jogador.teleportar(-11, 0);
    jogador.limitar = (pos, raio) => this._limitar(pos, raio);
    this.ctx.camera.enquadrar({ deslocamento: new THREE.Vector3(0, 7, 8.4) });
    this._atualizarObjetivo();
  }

  // Mantém a enzima dentro da mitocôndria, do corredor ou do citoplasma, e fora das cristas.
  _limitar(pos, raio) {
    const regioes = [
      () => {
        const cx = THREE.MathUtils.clamp(pos.x, -L, L);
        const dx = pos.x - cx;
        const d = Math.hypot(dx, pos.z);
        const limite = R - raio;
        return d <= limite ? null : { x: cx + (dx / d) * limite, z: (pos.z / d) * limite };
      },
      () => {
        const x = THREE.MathUtils.clamp(pos.x, CORREDOR.x0, CORREDOR.x1);
        const lim = CORREDOR.meiaLargura - raio * 0.6;
        const z = THREE.MathUtils.clamp(pos.z, -lim, lim);
        return x === pos.x && z === pos.z ? null : { x, z };
      },
      () => {
        const dx = pos.x - CENTRO_CITOPLASMA.x;
        const dz = pos.z - CENTRO_CITOPLASMA.z;
        const d = Math.hypot(dx, dz);
        const limite = RAIO_CITOPLASMA - raio * 0.5;
        return d <= limite ? null : { x: CENTRO_CITOPLASMA.x + (dx / d) * limite, z: CENTRO_CITOPLASMA.z + (dz / d) * limite };
      },
    ];

    let melhor = null;
    let melhorDistancia = Infinity;
    for (const regiao of regioes) {
      const projecao = regiao();
      if (!projecao) {
        melhor = null;
        melhorDistancia = 0;
        break;
      }
      const d = Math.hypot(projecao.x - pos.x, projecao.z - pos.z);
      if (d < melhorDistancia) {
        melhorDistancia = d;
        melhor = projecao;
      }
    }
    if (melhor) {
      pos.x = melhor.x;
      pos.z = melhor.z;
    }

    // Empurra para fora das cristas pelo lado de menor penetração.
    this.colisores.forEach((c) => {
      const x0 = c.x0 - raio;
      const x1 = c.x1 + raio;
      const z0 = c.z0 - raio;
      const z1 = c.z1 + raio;
      if (pos.x > x0 && pos.x < x1 && pos.z > z0 && pos.z < z1) {
        const saidas = [
          { eixo: "x", valor: x0, d: pos.x - x0 },
          { eixo: "x", valor: x1, d: x1 - pos.x },
          { eixo: "z", valor: z0, d: pos.z - z0 },
          { eixo: "z", valor: z1, d: z1 - pos.z },
        ].sort((a, b) => a.d - b.d);
        pos[saidas[0].eixo] = saidas[0].valor;
      }
    });
  }

  posicaoAleatoria() {
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const x = (Math.random() * 2 - 1) * (L + R * 0.6);
      const z = (Math.random() * 2 - 1) * (R - 1);
      const dentro = Math.hypot(x - THREE.MathUtils.clamp(x, -L, L), z) < R - 1;
      const naCrista = this.colisores.some((c) => x > c.x0 - 0.6 && x < c.x1 + 0.6 && z > c.z0 - 0.6 && z < c.z1 + 0.6);
      if (dentro && !naCrista) return new THREE.Vector3(x, 0.7, z);
    }
    return null;
  }

  // --- Interação ---------------------------------------------------------

  _estacaoProxima() {
    const p = this.ctx.jogador.posicao;
    const perto = (alvo, raio) => Math.hypot(p.x - alvo.x, p.z - alvo.z) < raio;
    if (perto(CENTRO_CITOPLASMA, 2.2)) return "glicolise";
    if (perto(this.krebs.position, 2.6)) return "krebs";
    if (this.complexos.some((c) => perto(c.position, 1.7))) return "cadeia";
    if (perto(this.sintase.position, 2.1)) return "sintase";
    return null;
  }

  acao() {
    if (!this.ativa) return false;
    const estacao = this._estacaoProxima();
    if (!estacao) return false;

    const esperado = PASSOS[this.passo].estacao;
    const posicaoPopup = this.ctx.jogador.posicao.clone().add(new THREE.Vector3(0, 2, 0));
    if (estacao !== esperado) {
      this.quebrarCombo();
      this.ctx.som.tocar("erro");
      this.ctx.hud.popup("Fora de ordem!", "popup-erro", posicaoPopup);
      return true;
    }

    switch (estacao) {
      case "glicolise":
        this.carregando = { nome: "Piruvato", cor: 0xff9a3d, forma: "cone" };
        this.ganharAtp(2, posicaoPopup.clone().add(new THREE.Vector3(0, 0.6, 0)));
        this.ctx.faiscas.explodir(CENTRO_CITOPLASMA.clone().setY(1), 0x8cff6b, 14, 3);
        break;
      case "krebs":
        this.carregando = { nome: "NADH", cor: 0xff6fd8, forma: "capsula" };
        this.ganharAtp(2, posicaoPopup.clone().add(new THREE.Vector3(0, 0.6, 0)));
        this.ctx.faiscas.explodir(new THREE.Vector3(0, 0.6, 0), 0xffd24d, 18, 4);
        break;
      case "cadeia":
        this.carregando = null;
        this._fluxoEletrons = 2.2;
        this.ctx.faiscas.explodir(this.complexos[0].position.clone().setY(1.6), 0xff6fd8, 14, 3);
        break;
      case "sintase":
        this._velocidadeRotor = 14;
        this.ciclos += 1;
        this.ganharAtp(26, this.sintase.position.clone().add(new THREE.Vector3(0, 3.6, 0)));
        this.ctx.faiscas.explodir(this.sintase.position.clone().setY(2.2), 0xffd24d, 30, 5);
        this.ctx.jogador.comemorar();
        break;
    }

    this.pontuar(estacao === "sintase" ? 300 : 100, posicaoPopup, { comCombo: true });
    this.ctx.som.tocar(estacao === "sintase" ? "proteina" : "entregar");
    this.passo = (this.passo + 1) % PASSOS.length;
    this._atualizarIndicador();
    this._atualizarObjetivo();
    return true;
  }

  _atualizarObjetivo() {
    this.ctx.hud.objetivo(PASSOS[this.passo].texto);
    this.ctx.hud.fluxo(this.passo);
  }

  _atualizarIndicador() {
    this.indicador.children.slice().forEach((filho) => {
      this.indicador.remove(filho);
      filho.traverse((o) => o.material && o.material.dispose());
    });
    if (!this.carregando) return;
    const { nome, cor, forma } = this.carregando;
    const geometria = forma === "cone" ? new THREE.ConeGeometry(0.24, 0.4, 3) : new THREE.CapsuleGeometry(0.13, 0.26, 6, 12);
    const molecula = new THREE.Mesh(
      geometria,
      new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.6, roughness: 0.2, clearcoat: 1 })
    );
    const rotulo = criarRotulo([nome], "#ffffff", { largura: 1.1, fonte: 36, fundo: "rgba(27,16,51,0.85)", brilho: false });
    rotulo.position.y = 0.42;
    molecula.add(rotulo);
    this.indicador.add(molecula);
  }

  atualizar(delta) {
    const t = performance.now() / 1000;
    this.hexagono.rotation.z += delta * 0.8;
    this.anelKrebs.rotation.z += delta * 0.6;
    this.pontosKrebs.rotation.y -= delta * 0.6;
    this.indicador.rotation.y += delta * 2;

    // Rotor da ATP sintase: gira rápido depois de produzir ATP e desacelera.
    this._velocidadeRotor += (0.4 - this._velocidadeRotor) * (1 - Math.pow(0.4, delta));
    this.rotor.rotation.y += this._velocidadeRotor * delta;
    const carregada = this.ativa && this.passo === 3;
    this.luzSintase.intensity = carregada ? 4 + Math.sin(t * 6) * 1.5 : 1;

    // Elétrons percorrendo I → III → IV.
    if (this._fluxoEletrons > 0) this._fluxoEletrons -= delta;
    const inicio = this.complexos[0].position;
    const fim = this.complexos[2].position;
    this.eletrons.forEach((eletron, i) => {
      eletron.visible = this._fluxoEletrons > 0;
      if (!eletron.visible) return;
      const progresso = ((t * 0.9 + i / this.eletrons.length) % 1);
      eletron.position.set(THREE.MathUtils.lerp(inicio.x, fim.x, progresso), 1.9 + Math.sin(progresso * Math.PI * 3) * 0.15, inicio.z + 0.7);
    });

    super.atualizar(delta);
  }

  metrica() {
    return this.ciclos;
  }
}
