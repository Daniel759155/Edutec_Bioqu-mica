// Fase 1 — Ribossomo: os pedidos chegam como proteínas a montar (sequências
// de códons de RNAm). O jogador lê o códon atual, busca o aminoácido certo
// na estação e entrega no ribossomo, na ordem, até o códon de parada.

import * as THREE from "three";
import { FaseBase } from "./FaseBase.js";
import { EstacaoAminoacido } from "../entidades/EstacaoAminoacido.js";
import { Ribossomo } from "../entidades/Ribossomo.js";
import { FitaRNAm } from "../entidades/FitaRNAm.js";
import { criarMaterialCitoplasma } from "../efeitos/ShaderCitoplasma.js";
import { criarRotulo } from "../utils/RotuloTexto.js";
import { CORES } from "../utils/Config.js";
import { sortear } from "../dados/Conteudo.js";
import {
  AMINOACIDOS_FASE1,
  CODONS_SENTIDO_FASE1,
  CODONS_PARADA,
  CODON_INICIO,
  aminoacidoDoCodon,
} from "../dados/CodigoGenetico.js";

const RAIO_ARENA = 10.2;
const RAIO_ESTACOES = 7.2;
const PONTOS_AMINOACIDO = 50;
const TIPOS_POWERUP = ["nad", "mg"];

export class Fase1Ribossomo extends FaseBase {
  constructor(ctx, info) {
    super(ctx, info);
    this.duracao = 90;
  }

  construir() {
    // Plataforma de citoplasma com borda brilhante.
    const chao = new THREE.Mesh(new THREE.CircleGeometry(11, 96), criarMaterialCitoplasma(0x0e2a52, CORES.info));
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    this.grupo.add(chao);
    this.chao = chao;

    const borda = new THREE.Mesh(
      new THREE.TorusGeometry(11, 0.06, 8, 128),
      new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.8 })
    );
    borda.rotation.x = Math.PI / 2;
    borda.position.y = 0.05;
    this.grupo.add(borda);

    this.ribossomo = new Ribossomo(new THREE.Vector3(0, 0, -1.2));
    this.grupo.add(this.ribossomo.grupo);

    this.fita = new FitaRNAm();
    this.fita.grupo.position.z = -0.15;
    this.grupo.add(this.fita.grupo);

    this.estacoes = Object.values(AMINOACIDOS_FASE1).map((aminoacido, i, lista) => {
      const angulo = (i / lista.length) * Math.PI * 2 + Math.PI / 6;
      const posicao = new THREE.Vector3(Math.cos(angulo) * RAIO_ESTACOES, 0, Math.sin(angulo) * RAIO_ESTACOES);
      const estacao = new EstacaoAminoacido(aminoacido, posicao);
      this.grupo.add(estacao.grupo);
      return estacao;
    });

    // Moléculas carregadas flutuam sobre a enzima (fica no grupo do jogador).
    this.indicador = new THREE.Group();
    this.indicador.position.set(0.55, 0.85, 0);
    this.ctx.jogador.grupo.add(this.indicador);
  }

  desmontar() {
    this.ctx.jogador.grupo.remove(this.indicador);
    super.desmontar();
  }

  preparar() {
    super.preparar();
    this.proteinas = 0;
    this.carregando = [];
    this._letraPedido = 0;
    this.pedidos = [this._gerarPedido(), this._gerarPedido()];
    this.powerups = { nad: 1, mg: 1, extra: null };
    this.ribossomo.limparCadeia();
    this._atualizarIndicador();

    const jogador = this.ctx.jogador;
    jogador.teleportar(0, 4.6);
    jogador.limitar = (pos, raio) => {
      const limite = RAIO_ARENA - raio;
      const distancia = Math.hypot(pos.x, pos.z);
      if (distancia > limite) {
        pos.x *= limite / distancia;
        pos.z *= limite / distancia;
      }
      // Não deixa atravessar o ribossomo.
      const rx = pos.x - this.ribossomo.posicao.x;
      const rz = pos.z - this.ribossomo.posicao.z;
      const dr = Math.hypot(rx, rz);
      const minimo = 1.5 + raio;
      if (dr < minimo && dr > 0.001) {
        pos.x = this.ribossomo.posicao.x + (rx / dr) * minimo;
        pos.z = this.ribossomo.posicao.z + (rz / dr) * minimo;
      }
    };
    // Olha um pouco mais alto que o padrão para a fita de RNAm não ficar sob o cronômetro.
    this.ctx.camera.enquadrar({ alturaOlhar: 1.4 });
    this._mostrarPedidoAtual();
    this.ctx.hud.powerups(this.powerups);
  }

  posicaoAleatoria() {
    const angulo = Math.random() * Math.PI * 2;
    const raio = 3 + Math.random() * 5;
    return new THREE.Vector3(Math.cos(angulo) * raio, 0.7, Math.sin(angulo) * raio);
  }

  // --- Pedidos -----------------------------------------------------------

  _gerarPedido() {
    const tamanho = 1 + Math.floor(Math.random() * 3); // 1 a 3 aminoácidos entre o início e a parada
    const codons = [CODON_INICIO];
    for (let i = 0; i < tamanho; i++) codons.push(sortear(CODONS_SENTIDO_FASE1));
    codons.push(sortear(CODONS_PARADA));
    const nome = `Proteína ${String.fromCharCode(65 + (this._letraPedido++ % 26))}`;
    return { nome, codons, indice: 0, recompensa: 100 * (tamanho + 1) };
  }

  get pedido() {
    return this.pedidos[0];
  }

  _codonAtual() {
    return this.pedido.codons[this.pedido.indice];
  }

  _ehParada(codon) {
    return CODONS_PARADA.includes(codon);
  }

  _rotulosDoPedido(pedido) {
    return pedido.codons.map((c) => (this._ehParada(c) ? "STOP" : aminoacidoDoCodon(c)));
  }

  _mostrarPedidoAtual() {
    this.fita.montar(this.pedido.codons, this._rotulosDoPedido(this.pedido));
    this._atualizarProgresso();
  }

  _atualizarProgresso() {
    this.fita.marcarProgresso(this.pedido.indice);
    this.ctx.hud.pedidos(this.pedidos);
  }

  // --- Carga sobre a enzima ---------------------------------------------

  _atualizarIndicador() {
    this.indicador.children.slice().forEach((filho) => {
      this.indicador.remove(filho);
      filho.traverse((o) => o.material && o.material.dispose());
    });
    this.carregando.forEach((item, i) => {
      const esfera = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 16),
        new THREE.MeshPhysicalMaterial({ color: item.cor, emissive: item.cor, emissiveIntensity: 0.6, roughness: 0.15, clearcoat: 1 })
      );
      esfera.position.set(i * 0.5, 0, 0);
      const rotulo = criarRotulo([item.sigla], "#ffffff", { largura: 0.8, fonte: 36, fundo: "rgba(27,16,51,0.85)", brilho: false });
      rotulo.position.y = 0.36;
      esfera.add(rotulo);
      this.indicador.add(esfera);
    });
  }

  // --- Ações -------------------------------------------------------------

  acao() {
    if (!this.ativa) return false;

    if (this.ribossomo.dentroDoAlcance(this.ctx.jogador.posicao)) {
      this._entregar();
      return true;
    }
    const estacao = this.estacoes.find((e) => e.dentroDoAlcance(this.ctx.jogador.posicao));
    if (estacao) {
      this._pegar(estacao);
      return true;
    }
    return false;
  }

  _pegar(estacao) {
    const posicao = estacao.grupo.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    if (this.carregando.length >= this.ctx.progresso.capacidadeCarga) {
      this.ctx.hud.popup("Mãos cheias!", "popup-aviso", posicao);
      return;
    }
    this.carregando.push({ sigla: estacao.sigla, cor: estacao.cor });
    this._atualizarIndicador();
    this.ctx.som.tocar("pegar");
  }

  _entregar() {
    const codon = this._codonAtual();
    const posicaoPopup = this.ribossomo.posicao.clone().add(new THREE.Vector3(1.8, 3.4, 0));

    if (this._ehParada(codon)) {
      this._finalizarProteina(posicaoPopup);
      return;
    }

    const aminoacido = aminoacidoDoCodon(codon);
    if (this.carregando.length === 0) {
      this.ctx.hud.popup(`${codon} → busque ${aminoacido}`, "popup-aviso", posicaoPopup);
      return;
    }

    const indice = this.carregando.findIndex((item) => item.sigla === aminoacido);
    if (indice === -1) {
      // Errou: o códon pedia outro aminoácido. Mostra a "dica" e derruba a carga.
      this.carregando = [];
      this._atualizarIndicador();
      this.quebrarCombo();
      this.ctx.jogador.ficarTonta();
      this.ctx.camera.tremer(0.15, 0.25);
      this.ctx.som.tocar("erro");
      this.ctx.hud.popup(`${codon} = ${aminoacido}`, "popup-erro", posicaoPopup);
      return;
    }

    const [item] = this.carregando.splice(indice, 1);
    this._atualizarIndicador();
    this.ribossomo.adicionarAminoacido(item.cor, item.sigla);
    this.pedido.indice += 1;
    this.pontuar(PONTOS_AMINOACIDO, posicaoPopup, { comCombo: true });
    this.ganharAtp(5);
    this.ctx.som.tocar(this.combo >= 3 ? "combo" : "entregar");
    this.ctx.faiscas.explodir(this.ribossomo.posicao.clone().add(new THREE.Vector3(0, 2.4, 1)), item.cor, 12, 3);
    this._atualizarProgresso();
  }

  _finalizarProteina(posicaoPopup) {
    const pedido = this.pedido;
    this.proteinas += 1;
    this.pontuar(pedido.recompensa, posicaoPopup);
    this.ganharAtp(15, posicaoPopup.clone().add(new THREE.Vector3(0, -0.8, 0)));
    this.ctx.jogador.comemorar();
    this.ctx.som.tocar("proteina");
    this.ctx.faiscas.explodir(this.ribossomo.posicao.clone().add(new THREE.Vector3(0, 3, 0)), 0x4dff9a, 24, 5);

    // Cada proteína pronta rende um power-up surpresa no slot 3.
    if (!this.powerups.extra) {
      this.powerups.extra = sortear(TIPOS_POWERUP);
      this.ctx.hud.powerups(this.powerups);
    }

    this.pedidos.shift();
    this.pedidos.push(this._gerarPedido());
    this.ribossomo.finalizarProteina();
    this._mostrarPedidoAtual();
  }

  // --- Power-ups (teclas 1, 2 e 3) ---------------------------------------

  tecla(e) {
    if (!this.ativa) return;
    if (e.key === "1") this._usarPowerup("nad", "nad");
    if (e.key === "2") this._usarPowerup("mg", "mg");
    if (e.key === "3" && this.powerups.extra) this._usarPowerup("extra", this.powerups.extra);
  }

  _usarPowerup(slot, tipo) {
    if (slot === "extra") this.powerups.extra = null;
    else if (this.powerups[slot] > 0) this.powerups[slot] -= 1;
    else return;

    const posicao = this.ctx.jogador.posicao.clone().add(new THREE.Vector3(0, 1.8, 0));
    if (tipo === "nad") {
      this.ativarTurbo(6);
      this.ctx.hud.popup("NAD⁺ · TURBO!", "popup-powerup", posicao);
    } else {
      this.congelarTempo(5);
      this.ctx.hud.popup("Mg²⁺ · TEMPO CONGELADO", "popup-powerup", posicao);
    }
    this.ctx.som.tocar("powerup");
    this.ctx.hud.powerups(this.powerups);
  }

  // --- Loop --------------------------------------------------------------

  atualizar(delta) {
    const codon = this.pedido ? this._codonAtual() : null;
    const alvo = codon && !this._ehParada(codon) ? aminoacidoDoCodon(codon) : null;
    this.estacoes.forEach((estacao) => {
      estacao.destacar(this.ativa && estacao.sigla === alvo);
      estacao.atualizar(delta);
    });
    this.ribossomo.marcarPronta(Boolean(codon) && this._ehParada(codon));
    this.ribossomo.atualizar(delta);
    this.fita.atualizar(delta);
    if (this.chao) this.chao.material.uniforms.uTempo.value += delta;

    super.atualizar(delta);
  }

  metrica() {
    return this.proteinas;
  }
}
