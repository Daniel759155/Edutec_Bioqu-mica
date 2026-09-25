// Orquestra o jogo: cena 3D, jogador, fases e o fluxo entre as telas, na
// ordem do mapa de telas do design:
// Menu → Fase 1 → Concluída → Quiz → Loja → Fase 2 → (…) → Fase 3 → (…) → Chefão → Tela final

import * as THREE from "three";
import { Cena } from "./core/Cena.js";
import { CameraSeguidora } from "./core/CameraSeguidora.js";
import { Renderizador } from "./core/Renderizador.js";
import { Entrada } from "./core/Entrada.js";
import { Som } from "./core/Som.js";
import { Jogador } from "./entidades/Jogador.js";
import { BolhasCitoplasma } from "./efeitos/Particulas.js";
import { Faiscas } from "./efeitos/Faiscas.js";
import { UI } from "./ui/UI.js";
import { HUD, formatarNumero } from "./ui/HUD.js";
import { Progresso, UPGRADES } from "./Progresso.js";
import { CONFIG } from "./utils/Config.js";
import { ler, gravar } from "./utils/Armazenamento.js";
import { FASES, DADOS_CIENTIFICOS, QUIZ, sortear, embaralhar } from "./dados/Conteudo.js";
import { Fase1Ribossomo } from "./fases/Fase1Ribossomo.js";
import { Fase2Mitocondria } from "./fases/Fase2Mitocondria.js";
import { Fase3Laboratorio } from "./fases/Fase3Laboratorio.js";
import { FaseChefao } from "./fases/FaseChefao.js";

const CLASSES_FASE = [Fase1Ribossomo, Fase2Mitocondria, Fase3Laboratorio, FaseChefao];
const RECOMPENSA_QUIZ = 30;

export class Jogo {
  constructor() {
    CONFIG.qualidade = ler("qualidade", "alta");

    this.som = new Som();
    this.ui = new UI(this.som);
    this.progresso = new Progresso();
    this.cena = new Cena();
    this.cameraSeguidora = new CameraSeguidora();
    this.renderizador = new Renderizador(document.getElementById("app"), this.cena.scene, this.cameraSeguidora.camera);
    this.hud = new HUD(this.cameraSeguidora);
    this.entrada = new Entrada();
    this.entrada.bloqueada = true;
    this.entrada.mostrarControlesDeToque();

    this.jogador = new Jogador();
    this.cena.adicionar(this.jogador.grupo);
    this.bolhas = new BolhasCitoplasma();
    this.cena.adicionar(this.bolhas.pontos);
    this.faiscas = new Faiscas(this.cena.scene);

    this.estado = "menu"; // menu | intro | jogando | pausa | telas
    this.fase = null;
    this.indiceFase = 0;
    this._relogio = new THREE.Clock();

    this.contexto = {
      cena: this.cena,
      jogador: this.jogador,
      camera: this.cameraSeguidora,
      hud: this.hud,
      som: this.som,
      progresso: this.progresso,
      entrada: this.entrada,
      faiscas: this.faiscas,
      aoTerminar: (resultado) => this._aoTerminarFase(resultado),
    };

    this._configurarMenu();
    this._configurarEventos();

    // As fontes entram nas texturas dos rótulos 3D: espera carregarem antes de tirar a tela de carregamento.
    const fontes = document.fonts ? document.fonts.ready : Promise.resolve();
    fontes.then(() => requestAnimationFrame(() => this.ui.esconderCarregamento()));

    this._loop();
  }

  // --- Menu --------------------------------------------------------------

  _configurarMenu() {
    this.ui.atualizarRecorde(this.progresso.recorde);
    this.ui.definirQualidade(CONFIG.qualidade);
    this.ui.definirSom(this.som.mudo);

    this.ui.aoTrocarQualidade((valor) => this._definirQualidade(valor));
    this.ui.aoAlternarSom(() => this.ui.definirSom(this.som.alternarMudo()));
    this.ui.aoJogar(() => this._novaPartida());
    this.ui.aoAbrirModal({
      comoJogar: () => this.ui.abrirModal("COMO JOGAR", this._htmlComoJogar()),
      ranking: () => this.ui.abrirModal("RANKING", this._htmlRanking()),
      configuracoes: () => this._abrirConfiguracoes(),
    });

    // Links da página do jogo no site: index.html#ranking / #como-jogar abrem o modal.
    if (location.hash === "#ranking") this.ui.abrirModal("RANKING", this._htmlRanking());
    else if (location.hash === "#como-jogar") this.ui.abrirModal("COMO JOGAR", this._htmlComoJogar());
  }

  _definirQualidade(valor) {
    CONFIG.qualidade = valor;
    gravar("qualidade", valor);
    this.renderizador.aplicarQualidade();
    this.ui.definirQualidade(valor);
  }

  _htmlComoJogar() {
    const fases = FASES.map(
      (f) => `<li><strong>${f.rotulo}</strong><span>${f.objetivo}</span><em>${f.controles}</em></li>`
    ).join("");
    return `<p>Você é uma enzima em missão dentro da célula. Complete as fases, responda ao mini quiz e gaste o ATP em upgrades.</p><ol class="lista-fases">${fases}</ol><p class="modal-nota">ESC ou P pausa o jogo a qualquer momento.</p>`;
  }

  _htmlRanking() {
    const ranking = this.progresso.ranking;
    if (ranking.length === 0) return `<p class="modal-vazio">Nenhuma partida registrada ainda. Jogue para entrar no ranking!</p>`;
    const linhas = ranking
      .map((item, i) => {
        const data = new Date(item.data).toLocaleDateString("pt-BR");
        return `<li><b>${i + 1}º</b><strong>${formatarNumero(item.pontos)} pts</strong><span>${data}</span></li>`;
      })
      .join("");
    return `<ol class="lista-ranking">${linhas}</ol>`;
  }

  _abrirConfiguracoes() {
    const opcoes = ["baixa", "media", "alta"]
      .map((q) => `<button type="button" class="opcao-qualidade${q === CONFIG.qualidade ? " ativa" : ""}" data-config-qualidade="${q}">${q === "media" ? "Média" : q[0].toUpperCase() + q.slice(1)}</button>`)
      .join("");
    this.ui.abrirModal(
      "CONFIGURAÇÕES",
      `<div class="config-linha"><span>Gráficos</span><div class="config-opcoes">${opcoes}</div></div>
       <div class="config-linha"><span>Som</span><button type="button" class="opcao-qualidade${this.som.mudo ? "" : " ativa"}" data-config-som>${this.som.mudo ? "Desligado" : "Ligado"}</button></div>
       <div class="config-linha"><span>Recorde e ranking</span><button type="button" class="opcao-qualidade" data-config-apagar>Apagar</button></div>`
    );
    const conteudo = document.getElementById("modal-conteudo");
    conteudo.querySelectorAll("[data-config-qualidade]").forEach((botao) =>
      botao.addEventListener("click", () => {
        this._definirQualidade(botao.dataset.configQualidade);
        this._abrirConfiguracoes();
      })
    );
    conteudo.querySelector("[data-config-som]").addEventListener("click", () => {
      this.ui.definirSom(this.som.alternarMudo());
      this._abrirConfiguracoes();
    });
    conteudo.querySelector("[data-config-apagar]").addEventListener("click", (e) => {
      this.progresso.recorde = 0;
      this.progresso.ranking = [];
      gravar("recorde", 0);
      gravar("ranking", []);
      this.ui.atualizarRecorde(0);
      e.currentTarget.textContent = "Apagado ✔";
      e.currentTarget.disabled = true;
    });
  }

  // --- Eventos globais ---------------------------------------------------

  _configurarEventos() {
    this.entrada.aoAcionar(() => {
      if (this.estado !== "jogando" || !this.fase) return;
      const tratou = this.fase.acao();
      if (!tratou && this.fase.jogadorControlavel) this.jogador.pular();
    });

    this.entrada.aoTecla((e) => this._tecla(e));
    this.entrada.aoClicar(this.renderizador.renderer.domElement, (ndc) => {
      if (this.estado === "jogando" && this.fase) this.fase.clique(ndc);
    });

    this.ui.aoBotaoPausa(() => this._pausar());
    this.ui.aoPausa({
      continuar: () => this._retomar(),
      reiniciar: () => {
        this.ui.esconder("pausa");
        this._iniciarFase(this.indiceFase);
      },
      menu: () => {
        this.ui.esconder("pausa");
        this._voltarAoMenu();
      },
    });

    window.addEventListener("resize", () => this.cameraSeguidora.redimensionar());
    // Perdeu o foco (trocou de aba): pausa para não perder vidas sem ver.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.estado === "jogando") this._pausar();
    });
  }

  _tecla(e) {
    const tecla = e.key;

    if (this.ui.telaAberta("modal")) {
      if (tecla === "Escape") this.ui.fecharModal();
      return;
    }

    switch (this.estado) {
      case "jogando":
        if (tecla === "Escape" || tecla === "p" || tecla === "P") this._pausar();
        else this.fase.tecla(e);
        break;
      case "pausa":
        if (tecla === "Escape" || tecla === "p" || tecla === "P") this._retomar();
        break;
      case "intro":
        if (tecla === "Enter") this.ui.confirmarIntro();
        break;
      case "telas":
        if (this.ui.telaAberta("loja") && tecla === "Enter") this.ui.continuarLoja();
        if (this.ui.telaAberta("quiz")) {
          const mapa = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
          const indice = mapa[tecla.toLowerCase()];
          if (indice !== undefined) this.ui.responderQuiz(indice);
        }
        break;
      case "menu":
        if (tecla === "Enter" && this.ui.telaAberta("menu")) this._novaPartida();
        break;
    }
  }

  // --- Fluxo da partida --------------------------------------------------

  _novaPartida() {
    this.progresso.novaPartida();
    this.ui.esconder("menu");
    this._iniciarFase(0);
  }

  _iniciarFase(indice) {
    if (this.fase) this.fase.desmontar();
    this.indiceFase = indice;
    const info = FASES[indice];
    this.fase = new CLASSES_FASE[indice](this.contexto, info);
    this.fase.montar();
    this.cena.aplicarTema(info.id);

    this.hud.configurar(info);
    this.hud.atp(this.progresso.atp);
    this.hud.vidas(this.progresso.vidas, this.progresso.vidasMax);
    this.fase.preparar();
    this.cameraSeguidora.posicionarImediato(this.jogador.grupo.position);
    this.hud.mostrar();

    this.estado = "intro";
    this.entrada.bloqueada = true;
    this.entrada.soltarTudo();
    this.ui.mostrarIntro(info, () => {
      this.estado = "jogando";
      this.entrada.bloqueada = false;
      this.fase.iniciar();
    });
  }

  _aoTerminarFase(resultado) {
    this.estado = "telas";
    this.entrada.bloqueada = true;
    this.entrada.soltarTudo();

    if (resultado.derrota) {
      this.som.tocar("derrota");
      setTimeout(() => this._mostrarFinal(false), 900);
      return;
    }

    const ultima = this.indiceFase === FASES.length - 1;
    if (ultima) {
      this._mostrarFinal(true);
      return;
    }

    this.som.tocar("vitoria");
    this.hud.esconder();
    const dado = sortear(DADOS_CIENTIFICOS[resultado.faseId]);
    this.ui.mostrarConcluida(resultado, dado, () => this._mostrarQuiz(resultado.faseId));
  }

  _mostrarQuiz(faseId) {
    const perguntas = embaralhar(QUIZ[faseId]).slice(0, 3);
    this.ui.mostrarQuiz(perguntas, {
      recompensa: RECOMPENSA_QUIZ,
      aoAcertar: () => {
        this.progresso.atp += RECOMPENSA_QUIZ;
      },
      aoFim: () => this._mostrarLoja(),
    });
  }

  _mostrarLoja() {
    this.ui.mostrarLoja(this.progresso, UPGRADES, {
      aoComprar: (upgrade) => {
        const comprou = this.progresso.comprar(upgrade);
        this.som.tocar(comprou ? "powerup" : "erro");
        return comprou;
      },
      aoContinuar: () => this._iniciarFase(this.indiceFase + 1),
    });
  }

  _mostrarFinal(vitoria) {
    this.hud.esconder();
    const novoRecorde = this.progresso.registrarFim();
    this.ui.atualizarRecorde(this.progresso.recorde);
    this.ui.mostrarFinal(
      {
        vitoria,
        pontos: this.progresso.pontos,
        recorde: this.progresso.recorde,
        novoRecorde,
        upgrades: this.progresso.upgrades.size,
      },
      {
        aoJogarNovamente: () => this._novaPartida(),
        aoMenu: () => this._voltarAoMenu(),
      }
    );
  }

  _pausar() {
    if (this.estado !== "jogando") return;
    this.estado = "pausa";
    this.entrada.bloqueada = true;
    this.entrada.soltarTudo();
    this.ui.mostrar("pausa");
  }

  _retomar() {
    if (this.estado !== "pausa") return;
    this.ui.esconder("pausa");
    this.estado = "jogando";
    this.entrada.bloqueada = false;
    this._relogio.getDelta(); // descarta o tempo parado
  }

  _voltarAoMenu() {
    if (this.fase) {
      this.fase.desmontar();
      this.fase = null;
    }
    this.hud.esconder();
    this.estado = "menu";
    this.entrada.bloqueada = true;
    this.ui.atualizarRecorde(this.progresso.recorde);
    this.ui.mostrar("menu");
  }

  // --- Loop --------------------------------------------------------------

  _loop() {
    requestAnimationFrame(() => this._loop());
    const delta = Math.min(this._relogio.getDelta(), 0.05);

    // No menu a tela cobre o canvas: não precisa desenhar a cena.
    if (this.estado === "menu" || !this.fase) return;

    if (this.estado === "jogando") {
      if (this.fase.jogadorControlavel) this.jogador.mover(this.entrada, delta);
      this.fase.atualizar(delta);
    } else if (this.estado !== "pausa") {
      // Intro e telas: a cena continua "viva" ao fundo, mas o tempo não corre.
      this.fase.atualizar(0);
    }

    if (this.estado !== "pausa") {
      this.jogador.atualizar(delta);
      this.cena.atualizar(delta);
      this.bolhas.atualizar(delta);
      this.faiscas.atualizar(delta);
      this.cameraSeguidora.seguir(this.jogador.grupo.position, delta);
    }

    this.renderizador.renderizar();
  }
}
