// Estado de uma partida (pontos, ATP, vidas, upgrades comprados) e o que
// persiste entre partidas (recorde e ranking), guardado no localStorage.

import { ler, gravar } from "./utils/Armazenamento.js";

export const UPGRADES = [
  { id: "spd", sigla: "SPD", nome: "Turbo Catalítico", descricao: "+25% velocidade", custo: 120, cor: "info", icone: "assets/ui/loja-spd.svg" },
  { id: "tempo", sigla: "+15s", nome: "Tempo Extra", descricao: "+15 s por fase", custo: 150, cor: "sucesso", icone: "assets/ui/loja-tempo.svg" },
  { id: "maos", sigla: "x2", nome: "Duas Mãos", descricao: "Carrega 2 moléculas", custo: 300, cor: "laranja", icone: "assets/ui/loja-maos.svg" },
  { id: "chaperona", sigla: "SHD", nome: "Chaperona", descricao: "Protege 1x da desnaturação", custo: 200, cor: "lilas", icone: "assets/ui/loja-chaperona.svg" },
  { id: "vida", sigla: "HP+", nome: "Membrana Forte", descricao: "+1 vida", custo: 250, cor: "rosa", icone: "assets/ui/loja-vida.svg" },
  { id: "ima", sigla: "MAG", nome: "Imã de ATP", descricao: "Atrai ATP próximo", custo: 180, cor: "ouro", icone: "assets/ui/loja-ima.svg" },
];

const VIDAS_INICIAIS = 3;
const TAMANHO_RANKING = 5;

export class Progresso {
  constructor() {
    this.recorde = ler("recorde", 0);
    this.ranking = ler("ranking", []);
    this.novaPartida();
  }

  novaPartida() {
    this.pontos = 0;
    this.atp = 0;
    this.vidasMax = VIDAS_INICIAIS;
    this.vidas = VIDAS_INICIAIS;
    this.upgrades = new Set();
  }

  tem(idUpgrade) {
    return this.upgrades.has(idUpgrade);
  }

  comprar(upgrade) {
    if (this.tem(upgrade.id) || this.atp < upgrade.custo) return false;
    this.atp -= upgrade.custo;
    this.upgrades.add(upgrade.id);
    if (upgrade.id === "vida") {
      this.vidasMax += 1;
      this.vidas += 1;
    }
    return true;
  }

  get multiplicadorVelocidade() {
    return this.tem("spd") ? 1.25 : 1;
  }

  get tempoExtra() {
    return this.tem("tempo") ? 15 : 0;
  }

  get capacidadeCarga() {
    return this.tem("maos") ? 2 : 1;
  }

  // Tira uma vida e devolve quantas sobraram.
  perderVida() {
    this.vidas = Math.max(0, this.vidas - 1);
    return this.vidas;
  }

  // Fecha a partida: atualiza recorde e ranking. Devolve true se bateu o recorde.
  registrarFim() {
    const bateuRecorde = this.pontos > this.recorde;
    if (bateuRecorde) {
      this.recorde = this.pontos;
      gravar("recorde", this.recorde);
    }
    if (this.pontos > 0) {
      this.ranking.push({ pontos: this.pontos, data: new Date().toISOString() });
      this.ranking.sort((a, b) => b.pontos - a.pontos);
      this.ranking = this.ranking.slice(0, TAMANHO_RANKING);
      gravar("ranking", this.ranking);
    }
    return bateuRecorde;
  }
}
