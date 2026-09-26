// Fase 2 — Mitocôndria: o jogador percorre a respiração celular em ordem.
// 1) Entrada do combustível, sorteada a cada ciclo: glicólise (citoplasma),
//    β-oxidação de ácido graxo ou desaminação de aminoácido (matriz)
// 2) Ciclo de Krebs (na matriz): gera NADH ou FADH₂
// 3) Cadeia respiratória: NADH no complexo I, FADH₂ no complexo II
// 4) ATP sintase: o fluxo de prótons gira o rotor e produz ATP
// Radicais livres e jatos de prótons atrapalham o caminho.
// A arena é a própria mitocôndria, com as cristas funcionando como paredes.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FaseBase } from "./FaseBase.js";
import { criarRotulo } from "../utils/RotuloTexto.js";
import { RadicalLivre } from "../entidades/RadicalLivre.js";

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

// Cada ciclo sorteia por onde o "combustível" entra (glicose, gordura ou
// aminoácido) e qual transportador sai do Krebs (NADH → complexo I ou
// FADH₂ → complexo II). Assim a ordem das estações muda a cada rodada.
const ENTRADAS = {
  glicolise: {
    etapa: "Glicólise",
    texto: "← Pegue GLICOSE no citoplasma",
    produto: { nome: "Piruvato", cor: 0xff9a3d, forma: "cone" },
    atp: 2,
  },
  betaoxidacao: {
    etapa: "β-oxidação",
    texto: "Quebre o ÁCIDO GRAXO na β-oxidação",
    produto: { nome: "Acetil-CoA", cor: 0xffe14d, forma: "capsula" },
    atp: 0,
  },
  aminoacido: {
    etapa: "Aminoácido",
    texto: "Desamine o AMINOÁCIDO",
    produto: { nome: "α-cetoglutarato", cor: 0x8fdcff, forma: "cone" },
    atp: 0,
  },
};
const TRANSPORTADORES = [
  { nome: "NADH", cor: 0xff6fd8, complexo: "complexoI", etapa: "Complexo I", texto: "Entregue o NADH no COMPLEXO I ↑" },
  { nome: "FADH₂", cor: 0xc9a7ff, complexo: "complexoII", etapa: "Complexo II", texto: "Entregue o FADH₂ no COMPLEXO II ↑" },
];

// Obstáculos: radicais livres vagando pela matriz e jatos de prótons que
// avisam (anel laranja) antes de disparar.
const JATOS = [
  { x: -5.9, z: 0, atraso: 0 },
  { x: 6.6, z: 0, atraso: 1.6 },
  { x: 1.2, z: -2.2, atraso: 3.1 },
];
const JATO = { raio: 1.05, espera: 2.6, aviso: 1.0, disparo: 0.7 };
const PROXIMO_ESTADO_JATO = { espera: "aviso", aviso: "disparo", disparo: "espera" };
const EIXO_Y = new THREE.Vector3(0, 1, 0);
const PENALIDADE_TEMPO = 3;

function sortear(lista, evitar) {
  const opcoes = lista.length > 1 ? lista.filter((item) => item !== evitar) : lista;
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

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
    this._construirEstacoesMatriz();
    this._construirJatos();
    this.radicais = [];

    this.indicador = new THREE.Group();
    this.indicador.position.set(0.6, 0.85, 0);
    this.ctx.jogador.grupo.add(this.indicador);
  }

  desmontar() {
    this.ctx.jogador.grupo.remove(this.indicador);
    this.ctx.jogador.grupo.scale.setScalar(1);
    this.ctx.jogador.grupo.visible = true;
    this.radicais = [];
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
    rotuloMatriz.position.set(-10.2, 0.3, -3.6);
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
    // Piso do citoplasma + corredor como uma única forma (círculo com um
    // "canal" que entra pela porta da mitocôndria), com borda luminosa.
    const raio = RAIO_CITOPLASMA + 0.5;
    const meia = CORREDOR.meiaLargura;
    const xFim = CORREDOR.x1 + 0.3 - CENTRO_CITOPLASMA.x;
    const angulo = Math.asin(meia / raio);
    const xJuncao = Math.cos(angulo) * raio;
    const formaPiso = new THREE.Shape();
    formaPiso.moveTo(xJuncao, meia);
    formaPiso.lineTo(xFim, meia);
    formaPiso.lineTo(xFim, -meia);
    formaPiso.lineTo(xJuncao, -meia);
    formaPiso.absarc(0, 0, raio, -angulo, angulo - Math.PI * 2, true);

    const piso = new THREE.Mesh(
      new THREE.ShapeGeometry(formaPiso, 48),
      new THREE.MeshStandardMaterial({ color: 0x5a3a8a, emissive: 0x8a4cc8, emissiveIntensity: 0.18, roughness: 0.75 })
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.copy(CENTRO_CITOPLASMA).setY(0.015);
    piso.receiveShadow = true;
    this.grupo.add(piso);

    // Borda: do fim do corredor (em cima), contornando o círculo, até o fim do corredor (embaixo).
    const pontosBorda = [new THREE.Vector3(xFim, 0.06, -meia), new THREE.Vector3(xJuncao, 0.06, -meia)];
    const passosArco = 64;
    for (let i = 1; i < passosArco; i++) {
      const a = -angulo - ((Math.PI * 2 - 2 * angulo) * i) / passosArco;
      pontosBorda.push(new THREE.Vector3(Math.cos(a) * raio, 0.06, -Math.sin(a) * raio));
    }
    pontosBorda.push(new THREE.Vector3(xJuncao, 0.06, meia), new THREE.Vector3(xFim, 0.06, meia));
    const bordaPiso = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pontosBorda, false, "centripetal"), 160, 0.07, 6, false),
      new THREE.MeshBasicMaterial({ color: 0x8cff6b, transparent: true, opacity: 0.75 })
    );
    bordaPiso.position.copy(CENTRO_CITOPLASMA);
    this.grupo.add(bordaPiso);

    // Estação de glicólise, com um hexágono (anel da glicose).
    this.hexagono = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.22, 6),
      new THREE.MeshPhysicalMaterial({ color: 0x8cff6b, emissive: 0x4dff5a, emissiveIntensity: 0.6, roughness: 0.2, clearcoat: 1 })
    );
    this.hexagono.rotation.x = Math.PI / 2;
    this.estacaoGlicolise = this._criarEstacao(CENTRO_CITOPLASMA, 0x8cff6b, ["Glicose → Piruvato", "CITOPLASMA"], this.hexagono);
  }

  // Cápsula de vidro com borda colorida, um ícone girando dentro e rótulo.
  _criarEstacao(posicao, cor, linhas, icone) {
    const estacao = new THREE.Group();
    estacao.position.copy(posicao);
    const borda = new THREE.Mesh(
      new RoundedBoxGeometry(1.5, 1.2, 1.5, 4, 0.35),
      new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.6, side: THREE.BackSide })
    );
    borda.position.y = 0.7;
    estacao.add(borda);
    const vidro = new THREE.Mesh(
      new RoundedBoxGeometry(1.42, 1.12, 1.42, 4, 0.32),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, clearcoat: 1, depthWrite: false })
    );
    vidro.position.y = 0.7;
    estacao.add(vidro);
    icone.position.y = 0.8;
    estacao.add(icone);
    const rotulo = criarRotulo(linhas, "#ffffff", { largura: 2.8, fonte: 40, brilho: false });
    rotulo.position.y = 1.9;
    estacao.add(rotulo);
    const luz = new THREE.PointLight(cor, 3, 5, 2);
    luz.position.y = 1;
    estacao.add(luz);
    this.grupo.add(estacao);
    return estacao;
  }

  // Estações extras na matriz: β-oxidação (ácido graxo em zigue-zague) e
  // desaminação (aminoácido com o grupo amino em verde).
  _construirEstacoesMatriz() {
    const materialGordura = new THREE.MeshPhysicalMaterial({ color: 0xffe14d, emissive: 0xffb02e, emissiveIntensity: 0.6, roughness: 0.2, clearcoat: 1 });
    this.iconeGordura = new THREE.Group();
    const pontos = [];
    for (let i = 0; i < 6; i++) pontos.push(new THREE.Vector3(-0.5 + i * 0.2, i % 2 ? 0.12 : -0.12, 0));
    pontos.forEach((ponto, i) => {
      const atomo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), materialGordura);
      atomo.position.copy(ponto);
      this.iconeGordura.add(atomo);
      if (i === 0) return;
      const anterior = pontos[i - 1];
      const ligacao = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, anterior.distanceTo(ponto), 6), materialGordura);
      ligacao.position.copy(anterior).lerp(ponto, 0.5);
      ligacao.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ponto.clone().sub(anterior).normalize());
      this.iconeGordura.add(ligacao);
    });
    this.estacaoBetaOx = this._criarEstacao(new THREE.Vector3(-9.8, 0, 2.4), 0xffe14d, ["Ácido graxo → Acetil-CoA", "β-OXIDAÇÃO"], this.iconeGordura);

    const materialAmino = new THREE.MeshPhysicalMaterial({ color: 0x8fdcff, emissive: 0x4dc3ff, emissiveIntensity: 0.6, roughness: 0.2, clearcoat: 1 });
    this.iconeAmino = new THREE.Group();
    this.iconeAmino.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 12), materialAmino));
    [0, 2.1, 4.2].forEach((angulo, i) => {
      const grupo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), i === 0 ? new THREE.MeshBasicMaterial({ color: 0x8cff6b }) : materialAmino);
      grupo.position.set(Math.cos(angulo) * 0.36, Math.sin(angulo) * 0.36, 0);
      this.iconeAmino.add(grupo);
    });
    this.estacaoAmino = this._criarEstacao(new THREE.Vector3(4.8, 0, 3.9), 0x8fdcff, ["Aminoácido → α-cetoglutarato", "DESAMINAÇÃO"], this.iconeAmino);
  }

  // Jatos de prótons: anel no chão que pisca em laranja (aviso) e depois
  // solta uma coluna de prótons que empurra a enzima.
  _construirJatos() {
    this.jatos = JATOS.map(({ x, z, atraso }) => {
      const grupo = new THREE.Group();
      grupo.position.set(x, 0, z);
      const base = new THREE.Mesh(
        new THREE.RingGeometry(JATO.raio * 0.55, JATO.raio, 40),
        new THREE.MeshBasicMaterial({ color: 0xff9a3d, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
      );
      base.rotation.x = -Math.PI / 2;
      base.position.y = 0.03;
      grupo.add(base);
      const coluna = new THREE.Mesh(
        new THREE.CylinderGeometry(JATO.raio * 0.8, JATO.raio, 3.2, 28, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffd24d, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      coluna.position.y = 1.6;
      coluna.visible = false;
      grupo.add(coluna);
      const rotulo = criarRotulo(["H⁺"], "#ffd24d", { largura: 0.8, fonte: 56, titulo: true });
      rotulo.position.y = 0.5;
      rotulo.material.opacity = 0.6;
      grupo.add(rotulo);
      this.grupo.add(grupo);
      return { grupo, base, coluna, atraso, relogio: 0, estado: "espera" };
    });
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

    ["CICLO DE", "KREBS"].forEach((linha, i) => {
      const rotulo = criarRotulo([linha], "#fff3b0", { largura: 3.4, fonte: 56, titulo: true });
      rotulo.position.set(0, 1.3, -0.35 + i * 0.75);
      krebs.add(rotulo);
    });

    const luz = new THREE.PointLight(0xffd24d, 4, 6, 2);
    luz.position.y = 1;
    krebs.add(luz);

    this.grupo.add(krebs);
    this.krebs = krebs;
  }

  _construirCadeia() {
    const dados = [
      { nome: "I", cor: 0xff6fd8, x: -1.2 },
      { nome: "II", cor: 0xc9a7ff, x: 0.4 },
      { nome: "III", cor: 0x9b8cff, x: 2.0 },
      { nome: "IV", cor: 0x4dc3ff, x: 3.6 },
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
      rotulo.position.set(0, 2.2, 0);
      grupo.add(rotulo);
      this.grupo.add(grupo);
      return grupo;
    });

    // Elétrons viajando pela cadeia (I ou II → III → IV) após a entrega.
    this.eletrons = [];
    const material = new THREE.MeshBasicMaterial({ color: 0x7fe7ff });
    for (let i = 0; i < 10; i++) {
      const eletron = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), material);
      eletron.visible = false;
      this.grupo.add(eletron);
      this.eletrons.push(eletron);
    }
    this._fluxoEletrons = 0;
    this._inicioEletrons = 0;

    const rotulo = criarRotulo(["CADEIA RESPIRATÓRIA"], "#ffd0f0", { largura: 3.6, fonte: 30 });
    rotulo.position.set(1.2, 2.4, -4.7);
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
    this._invulneravel = 0;
    this._tonta = 0;
    this.rota = null;
    this._sortearRota();
    this._atualizarIndicador();
    this._prepararObstaculos();

    const jogador = this.ctx.jogador;
    jogador.teleportar(-11, 0);
    jogador.limitar = (pos, raio) => this._limitar(pos, raio);
    // Câmera fixa, quase de cima, mostrando a mitocôndria inteira e o citoplasma à esquerda (Figma).
    this.ctx.camera.enquadrar({ deslocamento: new THREE.Vector3(0, 27.4, 12.7), alvoFixo: new THREE.Vector3(-2.6, 0, -0.6), alturaOlhar: 0, fov: 40 });
    // Vista de longe: a enzima fica maior para manter a proporção do Figma.
    jogador.grupo.scale.setScalar(1.4);
    this._atualizarObjetivo();
  }

  // Monta a sequência do próximo ciclo, sem repetir a entrada anterior.
  _sortearRota() {
    const entrada = sortear(Object.keys(ENTRADAS), this.rota && this.rota.entrada);
    const transportador = sortear(TRANSPORTADORES);
    const dados = ENTRADAS[entrada];
    this.rota = {
      entrada,
      transportador,
      passos: [
        { estacao: entrada, texto: dados.texto, etapa: dados.etapa },
        { estacao: "krebs", texto: `Leve o ${dados.produto.nome.toUpperCase()} ao Ciclo de Krebs`, etapa: "Krebs" },
        { estacao: transportador.complexo, texto: transportador.texto, etapa: transportador.etapa },
        { estacao: "sintase", texto: "Gire a ATP SINTASE! →", etapa: "ATP" },
      ],
    };
    this.ctx.hud.fluxoEtapas(this.rota.passos.map((p) => p.etapa));
  }

  _prepararObstaculos() {
    if (this.radicais) this.radicais.forEach((r) => this.grupo.remove(r.grupo));
    this.radicais = [];
    this._adicionarRadical(new THREE.Vector3(-3.5, 0, 3.8));
    this._adicionarRadical(new THREE.Vector3(4.5, 0, -1.8));
    this.jatos.forEach((jato) => {
      jato.estado = "espera";
      jato.relogio = -jato.atraso;
      jato.coluna.visible = false;
    });
  }

  _adicionarRadical(posicao) {
    const radical = new RadicalLivre({ raio: 0.36, espinhos: 12 });
    radical.grupo.position.copy(posicao).setY(0.8);
    const angulo = Math.random() * Math.PI * 2;
    radical.direcao = new THREE.Vector3(Math.cos(angulo), 0, Math.sin(angulo));
    this.grupo.add(radical.grupo);
    this.radicais.push(radical);
  }

  // Ponto livre para um radical: dentro da matriz e fora das cristas.
  _pontoLivre(x, z, margem) {
    const dx = x - THREE.MathUtils.clamp(x, -L, L);
    if (Math.hypot(dx, z) > R - margem) return false;
    return !this.colisores.some((c) => x > c.x0 - margem && x < c.x1 + margem && z > c.z0 - margem && z < c.z1 + margem);
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
    if (perto(this.estacaoBetaOx.position, 1.9)) return "betaoxidacao";
    if (perto(this.estacaoAmino.position, 1.9)) return "aminoacido";
    if (perto(this.krebs.position, 2.6)) return "krebs";
    if (perto(this.sintase.position, 2.1)) return "sintase";
    // Complexo mais próximo: só o I e o II recebem transportadores.
    let indice = -1;
    let menor = 1.6;
    this.complexos.forEach((c, i) => {
      const d = Math.hypot(p.x - c.position.x, p.z - c.position.z);
      if (d < menor) {
        menor = d;
        indice = i;
      }
    });
    return ["complexoI", "complexoII", "cadeia", "cadeia"][indice] || null;
  }

  acao() {
    if (!this.ativa) return false;
    const estacao = this._estacaoProxima();
    if (!estacao) return false;

    const esperado = this.rota.passos[this.passo].estacao;
    const posicaoPopup = this.ctx.jogador.posicao.clone().add(new THREE.Vector3(0, 2, 0));
    if (estacao !== esperado) {
      this.quebrarCombo();
      this.ctx.som.tocar("erro");
      const naCadeia = this.passo === 2 && estacao.startsWith("c");
      this.ctx.hud.popup(naCadeia ? `Use o ${this.rota.passos[2].etapa}!` : "Fora de ordem!", "popup-erro", posicaoPopup);
      return true;
    }

    switch (estacao) {
      case "glicolise":
      case "betaoxidacao":
      case "aminoacido": {
        const dados = ENTRADAS[estacao];
        const origem = { glicolise: this.estacaoGlicolise, betaoxidacao: this.estacaoBetaOx, aminoacido: this.estacaoAmino }[estacao];
        this.carregando = dados.produto;
        if (dados.atp) this.ganharAtp(dados.atp, posicaoPopup.clone().add(new THREE.Vector3(0, 0.6, 0)));
        this.ctx.faiscas.explodir(origem.position.clone().setY(1), dados.produto.cor, 14, 3);
        break;
      }
      case "krebs": {
        const { nome, cor } = this.rota.transportador;
        this.carregando = { nome, cor, forma: "capsula" };
        this.ganharAtp(2, posicaoPopup.clone().add(new THREE.Vector3(0, 0.6, 0)));
        this.ctx.faiscas.explodir(new THREE.Vector3(0, 0.6, 0), 0xffd24d, 18, 4);
        break;
      }
      case "complexoI":
      case "complexoII":
        this.carregando = null;
        this._fluxoEletrons = 2.2;
        this._inicioEletrons = estacao === "complexoI" ? 0 : 1;
        this.ctx.faiscas.explodir(this.complexos[this._inicioEletrons].position.clone().setY(1.6), this.rota.transportador.cor, 14, 3);
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
    this.passo += 1;
    if (this.passo >= this.rota.passos.length) {
      this.passo = 0;
      this._sortearRota();
      this.ctx.hud.popup("NOVA ROTA!", "popup-combo", this.ctx.jogador.posicao.clone().setY(3), 70);
      // Mais um radical livre depois do 2º e do 4º ciclo.
      if (this.ciclos === 2 || this.ciclos === 4) this._adicionarRadical(new THREE.Vector3(0, 0, 3.5));
    }
    this._atualizarIndicador();
    this._atualizarObjetivo();
    return true;
  }

  _atualizarObjetivo() {
    this.ctx.hud.objetivo(this.rota.passos[this.passo].texto);
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
    this.iconeGordura.rotation.y += delta * 0.9;
    this.iconeAmino.rotation.y += delta * 0.9;
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
    const inicio = this.complexos[this._inicioEletrons].position;
    const fim = this.complexos[3].position;
    this.eletrons.forEach((eletron, i) => {
      eletron.visible = this._fluxoEletrons > 0;
      if (!eletron.visible) return;
      const progresso = ((t * 0.9 + i / this.eletrons.length) % 1);
      eletron.position.set(THREE.MathUtils.lerp(inicio.x, fim.x, progresso), 1.9 + Math.sin(progresso * Math.PI * 3) * 0.15, inicio.z + 0.7);
    });

    this._atualizarRadicais(delta);
    this._atualizarJatos(delta);

    super.atualizar(delta);

    // Atingida: pisca e fica mais lenta por um instante. Vem depois do
    // FaseBase porque ele redefine a velocidade a cada quadro.
    if (this.ativa) {
      this._invulneravel = Math.max(0, this._invulneravel - delta);
      this._tonta = Math.max(0, this._tonta - delta);
      if (this._tonta > 0) this.ctx.jogador.multiplicadorVelocidade *= 0.4;
      this.ctx.jogador.grupo.visible = this._invulneravel <= 0 || Math.floor(this._invulneravel * 12) % 2 === 0;
    }
  }

  _atualizarRadicais(delta) {
    const jogador = this.ctx.jogador.posicao;
    const velocidade = 1.7 + Math.min(this.ciclos, 5) * 0.25;
    this.radicais.forEach((radical) => {
      radical.atualizar(delta);
      if (!this.ativa) return;
      const pos = radical.grupo.position;
      // Vaga pela matriz; ao bater numa parede ou crista, muda de direção.
      radical.direcao.applyAxisAngle(EIXO_Y, (Math.random() - 0.5) * delta * 2);
      const x = pos.x + radical.direcao.x * velocidade * delta;
      const z = pos.z + radical.direcao.z * velocidade * delta;
      if (this._pontoLivre(x, z, 0.7)) {
        pos.x = x;
        pos.z = z;
      } else if (this._pontoLivre(pos.x, pos.z, 0.7)) {
        const angulo = Math.random() * Math.PI * 2;
        radical.direcao.set(Math.cos(angulo), 0, Math.sin(angulo));
      } else {
        radical.direcao.set(-pos.x, 0, -pos.z).normalize();
        pos.addScaledVector(radical.direcao, velocidade * delta);
      }
      pos.y = 0.8 + Math.sin(performance.now() / 200 + pos.x) * 0.1;
      radical.olharPara(jogador);
      if (Math.hypot(jogador.x - pos.x, jogador.z - pos.z) < 1.0) this._atingir(pos, "Radical livre!");
    });
  }

  _atualizarJatos(delta) {
    if (!this.ativa) return;
    const jogador = this.ctx.jogador.posicao;
    this.jatos.forEach((jato) => {
      jato.relogio += delta;
      if (jato.relogio >= JATO[jato.estado]) {
        jato.relogio = 0;
        jato.estado = PROXIMO_ESTADO_JATO[jato.estado];
        jato.coluna.visible = jato.estado === "disparo";
      }
      const material = jato.base.material;
      if (jato.estado === "aviso") {
        material.color.setHex(0xff5c3d);
        material.opacity = 0.35 + 0.4 * Math.abs(Math.sin(jato.relogio * 14));
      } else if (jato.estado === "disparo") {
        material.color.setHex(0xffd24d);
        material.opacity = 0.9;
        jato.coluna.scale.y = Math.min(1, jato.relogio / 0.12);
        jato.coluna.rotation.y += delta * 6;
        const d = Math.hypot(jogador.x - jato.grupo.position.x, jogador.z - jato.grupo.position.z);
        if (d < JATO.raio + 0.35) this._atingir(jato.grupo.position, "Jato de prótons!");
      } else {
        material.color.setHex(0xff9a3d);
        material.opacity = 0.2;
      }
    });
  }

  // Obstáculo acertou a enzima: empurrão, tontura, combo zerado e perde tempo.
  _atingir(origem, motivo) {
    if (this._invulneravel > 0 || !this.ativa) return;
    const jogador = this.ctx.jogador;
    this._invulneravel = 1.5;
    this._tonta = 1.0;
    jogador.ficarTonta();
    this.ctx.camera.tremer(0.25, 0.3);
    this.ctx.som.tocar("dano");
    this.ctx.hud.flashDano();
    this.quebrarCombo();

    const empurrao = new THREE.Vector3(jogador.posicao.x - origem.x, 0, jogador.posicao.z - origem.z);
    if (empurrao.lengthSq() < 0.0001) empurrao.set(1, 0, 0);
    jogador.posicao.addScaledVector(empurrao.normalize(), 1.6);
    this._limitar(jogador.posicao, jogador.raio);

    this.tempoRestante -= PENALIDADE_TEMPO;
    const posicao = jogador.posicao.clone().setY(2.2);
    this.ctx.hud.popup(motivo, "popup-erro", posicao);
    this.ctx.hud.popup(`−${PENALIDADE_TEMPO} s`, "popup-erro", posicao, -34);
  }

  metrica() {
    return this.ciclos;
  }
}
