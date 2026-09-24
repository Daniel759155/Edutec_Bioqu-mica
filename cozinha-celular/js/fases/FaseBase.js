// Base comum das fases: monta/desmonta o cenário 3D, controla o cronômetro,
// pontuação com combo, ATP ganho e orbes de ATP soltos pelo mapa.
// Cada fase concreta implementa construir(), preparar(), acao() etc.

import * as THREE from "three";
import { OrbeATP } from "../entidades/OrbeATP.js";

const INTERVALO_ORBE = 7;
const MAX_ORBES = 3;
const COMBO_MAXIMO = 5;

export function descartar(objeto) {
  objeto.traverse((filho) => {
    if (filho.geometry) filho.geometry.dispose();
    if (filho.material) {
      const materiais = Array.isArray(filho.material) ? filho.material : [filho.material];
      materiais.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}

export class FaseBase {
  // ctx: { cena, jogador, camera, hud, som, progresso, faiscas, aoTerminar }
  constructor(ctx, info) {
    this.ctx = ctx;
    this.info = info;
    this.grupo = new THREE.Group();
    this.ativa = false;
    this.duracao = 90;
    this.usaTempo = true;
    this.usaOrbes = true;
    this.jogadorControlavel = true;
  }

  montar() {
    this.construir();
    this.ctx.cena.adicionar(this.grupo);
  }

  desmontar() {
    this.ativa = false;
    this.ctx.cena.remover(this.grupo);
    descartar(this.grupo);
    this.grupo = new THREE.Group();
  }

  // Zera as estatísticas e posiciona tudo antes da tela de introdução.
  preparar() {
    this.pontos = 0;
    this.combo = 0;
    this.comboMax = 0;
    this.atpGanho = 0;
    this.tempoRestante = this.duracao + this.ctx.progresso.tempoExtra;
    this.tempoTotal = this.tempoRestante;
    this._congelado = 0;
    this._turbo = 0;
    this._relogioOrbe = 0;
    this.orbes = [];
    this.ctx.jogador.multiplicadorVelocidade = this.ctx.progresso.multiplicadorVelocidade;
    this.ctx.hud.pontos(0);
    this.ctx.hud.combo(0);
    this.ctx.hud.tempo(this.tempoRestante, this.tempoTotal);
  }

  iniciar() {
    this.ativa = true;
  }

  // --- Pontuação ---------------------------------------------------------

  // Soma pontos. Com combo, cada acerto seguido multiplica o valor (até x5).
  pontuar(base, posicaoMundo, { comCombo = false } = {}) {
    let valor = base;
    if (comCombo) {
      this.combo = Math.min(COMBO_MAXIMO, this.combo + 1);
      this.comboMax = Math.max(this.comboMax, this.combo);
      valor = base * this.combo;
      this.ctx.hud.combo(this.combo);
    }
    this.pontos += valor;
    this.ctx.progresso.pontos += valor;
    this.ctx.hud.pontos(this.pontos);
    if (posicaoMundo) {
      this.ctx.hud.popup(`+${valor}`, "popup-pontos", posicaoMundo);
      if (comCombo && this.combo >= 2) this.ctx.hud.popup(`COMBO x${this.combo}`, "popup-combo", posicaoMundo, 40);
    }
    return valor;
  }

  quebrarCombo() {
    this.combo = 0;
    this.ctx.hud.combo(0);
  }

  ganharAtp(quantidade, posicaoMundo) {
    this.atpGanho += quantidade;
    this.ctx.progresso.atp += quantidade;
    this.ctx.hud.atp(this.ctx.progresso.atp);
    if (posicaoMundo) this.ctx.hud.popup(`+${quantidade} ATP`, "popup-atp", posicaoMundo, -30);
  }

  // --- Power-ups de tempo/velocidade --------------------------------------

  congelarTempo(segundos) {
    this._congelado = Math.max(this._congelado, segundos);
  }

  ativarTurbo(segundos) {
    this._turbo = Math.max(this._turbo, segundos);
  }

  // --- Orbes de ATP ------------------------------------------------------

  // Cada fase devolve um ponto válido do chão para soltar orbes.
  posicaoAleatoria() {
    return null;
  }

  _atualizarOrbes(delta) {
    if (!this.usaOrbes) return;
    this._relogioOrbe += delta;
    if (this._relogioOrbe > INTERVALO_ORBE && this.orbes.length < MAX_ORBES) {
      this._relogioOrbe = 0;
      const posicao = this.posicaoAleatoria();
      if (posicao) {
        const orbe = new OrbeATP(posicao);
        this.orbes.push(orbe);
        this.grupo.add(orbe.grupo);
      }
    }

    const raioIma = this.ctx.progresso.tem("ima") ? 4.5 : 0;
    for (let i = this.orbes.length - 1; i >= 0; i--) {
      const orbe = this.orbes[i];
      if (orbe.atualizar(delta, this.ctx.jogador.posicao, raioIma)) {
        this.grupo.remove(orbe.grupo);
        this.orbes.splice(i, 1);
        this.ctx.faiscas.explodir(orbe.grupo.position, 0xffd24d, 10, 3);
        this.ctx.som.tocar("moeda");
        this.ganharAtp(3, orbe.grupo.position);
        this.pontuar(25);
      }
    }
  }

  // --- Ciclo de vida -----------------------------------------------------

  atualizar(delta) {
    if (!this.ativa) return;

    const turbo = this._turbo > 0 ? 1.5 : 1;
    this._turbo = Math.max(0, this._turbo - delta);
    this.ctx.jogador.multiplicadorVelocidade = this.ctx.progresso.multiplicadorVelocidade * turbo;

    this._atualizarOrbes(delta);

    if (!this.usaTempo) return;
    if (this._congelado > 0) {
      this._congelado -= delta;
    } else {
      this.tempoRestante -= delta;
    }
    this.ctx.hud.tempo(Math.max(0, this.tempoRestante), this.tempoTotal, this._congelado > 0);
    if (this.tempoRestante <= 0) this.terminar(false);
  }

  // Quantas estrelas a "métrica" da fase (proteínas, ciclos...) vale.
  calcularEstrelas(metrica) {
    const [uma, duas, tres] = this.info.estrelas;
    if (metrica >= tres) return 3;
    if (metrica >= duas) return 2;
    if (metrica >= uma) return 1;
    return 0;
  }

  // Encerra a fase e avisa o Jogo. derrota = acabaram as vidas.
  terminar(derrota) {
    if (!this.ativa) return;
    this.ativa = false;
    this.ctx.aoTerminar({
      derrota,
      faseId: this.info.id,
      pontos: this.pontos,
      comboMax: this.comboMax,
      atpGanho: this.atpGanho,
      estrelas: derrota ? 0 : this.calcularEstrelas(this.metrica()),
    });
  }

  metrica() {
    return 0;
  }

  // Ganchos opcionais das fases.
  acao() {
    return false;
  }

  tecla() {}

  clique() {}
}
