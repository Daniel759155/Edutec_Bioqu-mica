// Chefão — Ataque dos Radicais Livres: o Radical Livre Supremo solta lacaios
// e rajadas enquanto a enzima atira antioxidantes. Ele alterna entre a fase
// aquosa (vulnerável à Vitamina C, hidrossolúvel) e a fase lipídica
// (vulnerável à Vitamina E, lipossolúvel, que protege as membranas).

import * as THREE from "three";
import { FaseBase, descartar } from "./FaseBase.js";
import { RadicalLivre } from "../entidades/RadicalLivre.js";
import { criarRotulo } from "../utils/RotuloTexto.js";

const RAIO_ARENA = 14;
const VIDA_CHEFE = 100;
const TROCA_FASE = 9;
const VITAMINAS = {
  C: { cor: 0xff9a3d, nome: "VITAMINA C", faseNome: "fase aquosa" },
  E: { cor: 0xffe14d, nome: "VITAMINA E", faseNome: "fase lipídica" },
};

export class FaseChefao extends FaseBase {
  constructor(ctx, info) {
    super(ctx, info);
    this.usaTempo = false;
    this.usaOrbes = false;
  }

  construir() {
    const chao = new THREE.Mesh(
      new THREE.CircleGeometry(RAIO_ARENA + 1, 96),
      new THREE.MeshStandardMaterial({ color: 0x2a0618, emissive: 0x1a020c, emissiveIntensity: 0.8, roughness: 0.6 })
    );
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    this.grupo.add(chao);

    const borda = new THREE.Mesh(
      new THREE.TorusGeometry(RAIO_ARENA + 0.6, 0.12, 8, 128),
      new THREE.MeshBasicMaterial({ color: 0xff2e63, transparent: true, opacity: 0.7 })
    );
    borda.rotation.x = Math.PI / 2;
    borda.position.y = 0.1;
    this.grupo.add(borda);

    this.chefe = new RadicalLivre({ raio: 2.1, espinhos: 34, comEletron: true });
    this.grupo.add(this.chefe.grupo);

    this.miraAuxiliar = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
    this.raycaster = new THREE.Raycaster();
  }

  desmontar() {
    this.ctx.jogador.grupo.visible = true;
    super.desmontar();
  }

  preparar() {
    super.preparar();
    this.vidaChefe = VIDA_CHEFE;
    this.municao = { C: 18, E: 9 };
    this.vitamina = "C";
    this.fraqueza = "C";
    this._relogioFase = 0;
    this._relogioLacaio = 1.5;
    this._relogioRajada = 5;
    this._relogioMunicao = 4;
    this._recarga = 0;
    this._invulneravel = 0;
    this._chaperonaUsada = false;
    this._angulo = 0;
    this._vencido = false;
    this.lacaios = [];
    this.projeteis = [];
    this.estilhacos = [];
    this.pacotes = [];

    this.chefe.grupo.visible = true;
    this.chefe.grupo.scale.setScalar(1);
    this.chefe.grupo.position.set(0, 2.6, -5);
    this.chefe.definirCorEscudo(VITAMINAS.C.cor);

    const jogador = this.ctx.jogador;
    jogador.teleportar(0, 7);
    jogador.limitar = (pos, raio) => {
      const limite = RAIO_ARENA - raio;
      const d = Math.hypot(pos.x, pos.z);
      if (d > limite) {
        pos.x *= limite / d;
        pos.z *= limite / d;
      }
    };
    this.ctx.camera.enquadrar({ deslocamento: new THREE.Vector3(0, 9.5, 10.5), alturaOlhar: 1 });
    this._atualizarHud();
  }

  _atualizarHud() {
    this.ctx.hud.chefe({
      vida: this.vidaChefe / VIDA_CHEFE,
      municao: this.municao,
      vitamina: this.vitamina,
      fraqueza: VITAMINAS[this.fraqueza],
      letraFraqueza: this.fraqueza,
    });
  }

  // --- Entrada -----------------------------------------------------------

  tecla(e) {
    if (!this.ativa) return;
    if (e.key === "1") this._selecionar("C");
    if (e.key === "2") this._selecionar("E");
    if (e.key === "j" || e.key === "J") this._atirarAutomatico();
  }

  acao() {
    if (!this.ativa) return false;
    this._atirarAutomatico();
    return true;
  }

  // Clique: atira na direção do ponto do chão sob o cursor.
  clique(ndc) {
    if (!this.ativa) return;
    this.raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.ctx.camera.camera);
    const ponto = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.miraAuxiliar, ponto)) this._atirar(ponto);
  }

  _selecionar(letra) {
    this.vitamina = letra;
    this.ctx.som.tocar("clique");
    this._atualizarHud();
  }

  // J / espaço / botão de toque: mira no inimigo mais próximo (lacaio ou chefe).
  _atirarAutomatico() {
    const origem = this.ctx.jogador.posicao;
    let alvo = this.chefe.grupo.position;
    let menor = Infinity;
    this.lacaios.forEach((l) => {
      const d = l.grupo.position.distanceTo(origem);
      if (d < 7 && d < menor) {
        menor = d;
        alvo = l.grupo.position;
      }
    });
    this._atirar(alvo);
  }

  _atirar(alvo) {
    if (this._recarga > 0) return;
    const letra = this.vitamina;
    const origemJogador = this.ctx.jogador.posicao.clone().setY(0.9);
    if (this.municao[letra] <= 0) {
      this.ctx.hud.popup(`Sem ${VITAMINAS[letra].nome}!`, "popup-erro", origemJogador.clone().setY(2.2));
      this.ctx.som.tocar("erro");
      this._recarga = 0.4;
      return;
    }
    this.municao[letra] -= 1;
    this._recarga = 0.22;
    this.ctx.jogador.olharPara(alvo);

    const direcao = alvo.clone().setY(0.9).sub(origemJogador);
    direcao.y = (alvo.y - 0.9) * 0.4;
    direcao.normalize();

    const projetil = new THREE.Group();
    const cor = VITAMINAS[letra].cor;
    const esfera = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 18, 14),
      new THREE.MeshPhysicalMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.7, roughness: 0.2, clearcoat: 1 })
    );
    projetil.add(esfera);
    const rotulo = criarRotulo([letra], "#4a1a00", { largura: 0.9, fonte: 70, titulo: true, brilho: false });
    projetil.add(rotulo);
    projetil.position.copy(origemJogador).addScaledVector(direcao, 0.8);
    projetil.userData = { velocidade: direcao.multiplyScalar(17), vida: 1.4, letra };
    this.grupo.add(projetil);
    this.projeteis.push(projetil);

    this.ctx.som.tocar("tiro");
    this._atualizarHud();
  }

  // --- Dano ao jogador ---------------------------------------------------

  _ferirJogador(origem) {
    if (this._invulneravel > 0) return;
    const jogador = this.ctx.jogador;
    this._invulneravel = 1.6;
    this.ctx.camera.tremer(0.3, 0.35);
    this.ctx.som.tocar("dano");

    // Empurrão para longe da origem do golpe.
    const empurrao = jogador.posicao.clone().sub(origem).setY(0).normalize().multiplyScalar(2.2);
    jogador.posicao.add(empurrao);

    if (this.ctx.progresso.tem("chaperona") && !this._chaperonaUsada) {
      this._chaperonaUsada = true;
      this.ctx.hud.popup("CHAPERONA PROTEGEU!", "popup-powerup", jogador.posicao.clone().setY(2.2));
      return;
    }
    this.quebrarCombo();
    const restantes = this.ctx.progresso.perderVida();
    this.ctx.hud.vidas(restantes, this.ctx.progresso.vidasMax);
    this.ctx.hud.flashDano();
    if (restantes <= 0) this.terminar(true);
  }

  // --- Loop --------------------------------------------------------------

  atualizar(delta) {
    this.chefe.atualizar(delta);
    this.lacaios.forEach((l) => l.atualizar(delta));

    if (this.ativa && !this._vencido) {
      this._recarga = Math.max(0, this._recarga - delta);
      this._invulneravel = Math.max(0, this._invulneravel - delta);
      this.ctx.jogador.grupo.visible = this._invulneravel <= 0 || Math.floor(this._invulneravel * 12) % 2 === 0;

      this._moverChefe(delta);
      this._alternarFraqueza(delta);
      this._gerarAmeacas(delta);
      this._moverLacaios(delta);
      this._moverEstilhacos(delta);
      this._moverProjeteis(delta);
      this._atualizarPacotes(delta);
    }

    super.atualizar(delta);
  }

  _moverChefe(delta) {
    this._angulo += delta * 0.28;
    const chefe = this.chefe.grupo;
    chefe.position.x = Math.sin(this._angulo) * 5.5;
    chefe.position.z = -3 + Math.cos(this._angulo * 1.3) * 3.5;
    chefe.position.y = 2.6 + Math.sin(this._angulo * 3) * 0.3;
    this.chefe.olharPara(this.ctx.jogador.posicao);

    const distancia = Math.hypot(chefe.position.x - this.ctx.jogador.posicao.x, chefe.position.z - this.ctx.jogador.posicao.z);
    if (distancia < this.chefe.raio + 0.9) this._ferirJogador(chefe.position);
  }

  _alternarFraqueza(delta) {
    this._relogioFase += delta;
    if (this._relogioFase < TROCA_FASE) return;
    this._relogioFase = 0;
    this.fraqueza = this.fraqueza === "C" ? "E" : "C";
    const info = VITAMINAS[this.fraqueza];
    this.chefe.definirCorEscudo(info.cor);
    this.ctx.hud.popup(`${info.faseNome.toUpperCase()} → ${info.nome}`, "popup-aviso", this.chefe.grupo.position.clone().setY(5.4));
    this.ctx.som.tocar("alerta");
    this._atualizarHud();
  }

  _gerarAmeacas(delta) {
    const furia = 1 - this.vidaChefe / VIDA_CHEFE; // fica mais agressivo conforme perde vida

    this._relogioLacaio -= delta;
    if (this._relogioLacaio <= 0 && this.lacaios.length < 6) {
      this._relogioLacaio = 2.8 - furia * 1.2;
      const lacaio = new RadicalLivre({ raio: 0.42, espinhos: 14 });
      lacaio.grupo.position.copy(this.chefe.grupo.position).setY(0.8);
      lacaio.velocidade = 2.2 + furia * 1.4;
      this.grupo.add(lacaio.grupo);
      this.lacaios.push(lacaio);
    }

    this._relogioRajada -= delta;
    if (this._relogioRajada <= 0) {
      this._relogioRajada = 7 - furia * 2.5;
      const quantidade = 10;
      for (let i = 0; i < quantidade; i++) {
        const angulo = (i / quantidade) * Math.PI * 2 + Math.random() * 0.3;
        const estilhaco = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.22, 0),
          new THREE.MeshBasicMaterial({ color: 0xff2e63 })
        );
        estilhaco.position.copy(this.chefe.grupo.position).setY(0.8);
        estilhaco.userData = { velocidade: new THREE.Vector3(Math.cos(angulo), 0, Math.sin(angulo)).multiplyScalar(5), vida: 3.5 };
        this.grupo.add(estilhaco);
        this.estilhacos.push(estilhaco);
      }
    }

    this._relogioMunicao -= delta;
    if (this._relogioMunicao <= 0 && this.pacotes.length < 2) {
      this._relogioMunicao = 5;
      // A vitamina que funciona agora aparece com mais frequência.
      const letra = Math.random() < 0.65 ? this.fraqueza : this.fraqueza === "C" ? "E" : "C";
      const pacote = new THREE.Group();
      const capsula = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 0.4, 6, 14),
        new THREE.MeshPhysicalMaterial({ color: VITAMINAS[letra].cor, emissive: VITAMINAS[letra].cor, emissiveIntensity: 0.6, clearcoat: 1 })
      );
      capsula.rotation.z = Math.PI / 2;
      pacote.add(capsula);
      const rotulo = criarRotulo([`+${letra}`], "#ffffff", { largura: 1.1, fonte: 50, titulo: true });
      rotulo.position.y = 0.7;
      pacote.add(rotulo);
      const angulo = Math.random() * Math.PI * 2;
      const raio = 3 + Math.random() * 8;
      pacote.position.set(Math.cos(angulo) * raio, 0.7, Math.sin(angulo) * raio);
      pacote.userData = { letra };
      this.grupo.add(pacote);
      this.pacotes.push(pacote);
    }
  }

  _moverLacaios(delta) {
    const jogador = this.ctx.jogador.posicao;
    this.lacaios.forEach((lacaio) => {
      const pos = lacaio.grupo.position;
      const direcao = new THREE.Vector3(jogador.x - pos.x, 0, jogador.z - pos.z);
      const distancia = direcao.length();
      if (distancia > 0.01) pos.addScaledVector(direcao.normalize(), lacaio.velocidade * delta);
      pos.y = 0.8 + Math.sin(performance.now() / 200 + pos.x) * 0.1;
      lacaio.olharPara(jogador);
      if (distancia < 0.62 + 0.5) this._ferirJogador(pos);
    });
  }

  _moverEstilhacos(delta) {
    const jogador = this.ctx.jogador.posicao;
    for (let i = this.estilhacos.length - 1; i >= 0; i--) {
      const e = this.estilhacos[i];
      e.userData.vida -= delta;
      e.position.addScaledVector(e.userData.velocidade, delta);
      e.rotation.x += delta * 6;
      e.rotation.y += delta * 4;
      const acertou = Math.hypot(e.position.x - jogador.x, e.position.z - jogador.z) < 0.8;
      if (acertou) this._ferirJogador(e.position);
      if (acertou || e.userData.vida <= 0 || Math.hypot(e.position.x, e.position.z) > RAIO_ARENA) {
        this.grupo.remove(e);
        descartar(e);
        this.estilhacos.splice(i, 1);
      }
    }
  }

  _moverProjeteis(delta) {
    for (let i = this.projeteis.length - 1; i >= 0; i--) {
      const p = this.projeteis[i];
      const dados = p.userData;
      dados.vida -= delta;
      p.position.addScaledVector(dados.velocidade, delta);

      let removido = dados.vida <= 0;

      // Lacaios morrem com qualquer antioxidante.
      if (!removido) {
        const indice = this.lacaios.findIndex((l) => l.grupo.position.distanceTo(p.position) < 0.95);
        if (indice !== -1) {
          const [lacaio] = this.lacaios.splice(indice, 1);
          this.ctx.faiscas.explodir(lacaio.grupo.position, 0xff4f7a, 14, 4);
          this.grupo.remove(lacaio.grupo);
          descartar(lacaio.grupo);
          this.pontuar(60, lacaio.grupo.position.clone().setY(1.8), { comCombo: true });
          this.ctx.som.tocar("acerto");
          removido = true;
        }
      }

      // Chefe: dano cheio com a vitamina certa para a fase atual.
      if (!removido && p.position.distanceTo(this.chefe.grupo.position) < this.chefe.raio + 0.5) {
        const eficaz = dados.letra === this.fraqueza;
        this.vidaChefe = Math.max(0, this.vidaChefe - (eficaz ? 4 : 1));
        this.chefe.atingido();
        this.ctx.faiscas.explodir(p.position, VITAMINAS[dados.letra].cor, eficaz ? 18 : 6, eficaz ? 5 : 2);
        this.ctx.som.tocar("acerto");
        const acima = this.chefe.grupo.position.clone().add(new THREE.Vector3(1.5, 2.6, 0));
        if (eficaz) {
          this.pontuar(80, null, { comCombo: true });
          this.ctx.hud.popup("NEUTRALIZADO", "popup-neutralizado", acima);
        } else {
          this.pontuar(20);
          this.ctx.hud.popup("pouco efeito…", "popup-aviso", acima);
        }
        this._atualizarHud();
        if (this.vidaChefe <= 0) this._vencer();
        removido = true;
      }

      if (removido) {
        this.grupo.remove(p);
        descartar(p);
        this.projeteis.splice(i, 1);
      }
    }
  }

  _atualizarPacotes(delta) {
    const jogador = this.ctx.jogador.posicao;
    for (let i = this.pacotes.length - 1; i >= 0; i--) {
      const pacote = this.pacotes[i];
      pacote.rotation.y += delta * 2;
      if (Math.hypot(pacote.position.x - jogador.x, pacote.position.z - jogador.z) < 1.1) {
        const letra = pacote.userData.letra;
        const quantidade = letra === "C" ? 8 : 5;
        this.municao[letra] += quantidade;
        this.ctx.hud.popup(`+${quantidade} ${VITAMINAS[letra].nome}`, "popup-powerup", pacote.position.clone().setY(2));
        this.ctx.som.tocar("powerup");
        this.grupo.remove(pacote);
        descartar(pacote);
        this.pacotes.splice(i, 1);
        this._atualizarHud();
      }
    }
  }

  _vencer() {
    this._vencido = true;
    const posicao = this.chefe.grupo.position.clone();
    this.pontuar(2000 + this.ctx.progresso.vidas * 500, posicao.clone().setY(5));
    this.ctx.faiscas.explodir(posicao, 0xff4f7a, 60, 9);
    this.ctx.faiscas.explodir(posicao, 0xffe14d, 40, 7);
    this.ctx.camera.tremer(0.4, 0.6);
    this.ctx.som.tocar("vitoria");
    this.ctx.jogador.comemorar();
    this.ctx.jogador.grupo.visible = true;
    this.chefe.grupo.visible = false;
    this.lacaios.forEach((l) => {
      this.ctx.faiscas.explodir(l.grupo.position, 0xff4f7a, 8, 3);
      this.grupo.remove(l.grupo);
      descartar(l.grupo);
    });
    this.lacaios = [];
    this.estilhacos.forEach((e) => this.grupo.remove(e));
    this.estilhacos = [];
    setTimeout(() => this.terminar(false), 1800);
  }

  calcularEstrelas() {
    return Math.min(3, Math.max(1, this.ctx.progresso.vidas));
  }

  metrica() {
    return 1;
  }
}
