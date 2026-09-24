// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio): cada
// som é uma sequência curta de notas com timbre e envelope próprios.

import { ler, gravar } from "../utils/Armazenamento.js";

// [frequência Hz, duração s, atraso s] por nota.
const SONS = {
  clique: { onda: "triangle", volume: 0.18, notas: [[660, 0.06, 0]] },
  pegar: { onda: "sine", volume: 0.25, notas: [[520, 0.08, 0], [780, 0.1, 0.06]] },
  entregar: { onda: "triangle", volume: 0.25, notas: [[660, 0.08, 0], [880, 0.08, 0.07], [1175, 0.12, 0.14]] },
  combo: { onda: "square", volume: 0.12, notas: [[880, 0.07, 0], [1175, 0.07, 0.06], [1568, 0.14, 0.12]] },
  erro: { onda: "sawtooth", volume: 0.14, notas: [[220, 0.14, 0], [165, 0.2, 0.12]] },
  proteina: { onda: "triangle", volume: 0.25, notas: [[523, 0.1, 0], [659, 0.1, 0.1], [784, 0.1, 0.2], [1047, 0.25, 0.3]] },
  powerup: { onda: "sine", volume: 0.25, notas: [[440, 0.08, 0], [660, 0.08, 0.05], [990, 0.16, 0.1]] },
  moeda: { onda: "square", volume: 0.08, notas: [[1320, 0.05, 0], [1760, 0.08, 0.05]] },
  dano: { onda: "sawtooth", volume: 0.2, notas: [[180, 0.25, 0], [110, 0.3, 0.1]] },
  tiro: { onda: "triangle", volume: 0.12, notas: [[900, 0.05, 0], [600, 0.06, 0.03]] },
  acerto: { onda: "square", volume: 0.08, notas: [[330, 0.06, 0], [247, 0.08, 0.04]] },
  alerta: { onda: "square", volume: 0.07, notas: [[740, 0.1, 0], [740, 0.1, 0.18]] },
  vitoria: { onda: "triangle", volume: 0.25, notas: [[523, 0.12, 0], [659, 0.12, 0.12], [784, 0.12, 0.24], [1047, 0.18, 0.36], [1319, 0.35, 0.5]] },
  derrota: { onda: "sawtooth", volume: 0.15, notas: [[392, 0.2, 0], [330, 0.2, 0.2], [262, 0.45, 0.4]] },
};

export class Som {
  constructor() {
    this.mudo = ler("mudo", false);
    this._ctx = null;
  }

  // O navegador só libera áudio depois de um gesto do usuário.
  _contexto() {
    if (!this._ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this._ctx = new Ctx();
    }
    if (this._ctx.state === "suspended") this._ctx.resume();
    return this._ctx;
  }

  tocar(nome) {
    if (this.mudo) return;
    const som = SONS[nome];
    const ctx = this._contexto();
    if (!som || !ctx) return;

    const agora = ctx.currentTime;
    som.notas.forEach(([freq, duracao, atraso]) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = som.onda;
      osc.frequency.setValueAtTime(freq, agora + atraso);
      ganho.gain.setValueAtTime(0.0001, agora + atraso);
      ganho.gain.exponentialRampToValueAtTime(som.volume, agora + atraso + 0.01);
      ganho.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + duracao);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(agora + atraso);
      osc.stop(agora + atraso + duracao + 0.02);
    });
  }

  alternarMudo() {
    this.mudo = !this.mudo;
    gravar("mudo", this.mudo);
    return this.mudo;
  }
}
