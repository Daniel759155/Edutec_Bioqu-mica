// Base compartilhada das cenas 3D do site (Three.js via importmap).
// Cada cena usa um Palco3D: ele cria o renderizador, ajusta o tamanho ao
// contêiner, só anima quando está visível na tela e pausa quando a aba
// fica escondida. Se o navegador não tiver WebGL, mostra a imagem de fallback.

import * as THREE from "three";

export const ehMobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
export const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { suportaWebGL, mostrarFallback } from "./suporte.js";

export class Palco3D {
  // opcoes: { fov, posicaoCamera, luzes }
  constructor(container, { fov = 40, posicaoCamera = [0, 0, 12], luzes = true } = {}) {
    this.container = container;
    this.container.classList.add("palco-3d");
    this._atualizacoes = [];
    this._visivel = false;
    this._rodando = false;
    this._relogio = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ehMobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x000000, 0); // fundo transparente: a página aparece por trás
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    this.camera.position.set(...posicaoCamera);

    if (luzes) this._criarLuzes();
    this._observarTamanho();
    this._observarVisibilidade();
  }

  // Luz padrão do "laboratório noturno": ambiente fria + luzes teal e violeta.
  _criarLuzes() {
    this.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x0b1220, 0.9));
    const chave = new THREE.DirectionalLight(0xffffff, 1.6);
    chave.position.set(4, 6, 8);
    this.scene.add(chave);
    const luzTeal = new THREE.PointLight(0x2ef2c4, 40, 30);
    luzTeal.position.set(-6, 3, 5);
    this.scene.add(luzTeal);
    const luzVioleta = new THREE.PointLight(0x8b5cf6, 40, 30);
    luzVioleta.position.set(6, -3, 4);
    this.scene.add(luzVioleta);
  }

  _observarTamanho() {
    const ajustar = () => {
      const { clientWidth: largura, clientHeight: altura } = this.container;
      if (!largura || !altura) return;
      this.camera.aspect = largura / altura;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(largura, altura, false);
      if (this.aoRedimensionar) this.aoRedimensionar(this.camera.aspect);
      this.renderizar();
    };
    this._resize = new ResizeObserver(ajustar);
    this._resize.observe(this.container);
    ajustar();
  }

  // Só gasta GPU quando a cena está na tela e a aba está ativa.
  _observarVisibilidade() {
    this._io = new IntersectionObserver(
      ([entrada]) => {
        this._visivel = entrada.isIntersecting;
        this._decidirLoop();
      },
      { rootMargin: "100px" }
    );
    this._io.observe(this.container);
    this._aoMudarAba = () => this._decidirLoop();
    document.addEventListener("visibilitychange", this._aoMudarAba);
  }

  _decidirLoop() {
    const deveRodar = this._visivel && !document.hidden;
    if (deveRodar && !this._rodando) {
      this._rodando = true;
      this._relogio.getDelta(); // descarta o tempo parado
      this._loop();
    } else if (!deveRodar) {
      this._rodando = false;
    }
  }

  _loop() {
    if (!this._rodando) return;
    requestAnimationFrame(() => this._loop());
    const delta = Math.min(this._relogio.getDelta(), 0.05);
    const tempo = this._relogio.elapsedTime;
    this._atualizacoes.forEach((fn) => fn(delta, tempo));
    this.renderizar();
  }

  // Registra uma função chamada a cada quadro: fn(delta, tempoTotal).
  aoAtualizar(fn) {
    this._atualizacoes.push(fn);
  }

  renderizar() {
    this.renderer.render(this.scene, this.camera);
  }

  destruir() {
    this._rodando = false;
    this._io.disconnect();
    this._resize.disconnect();
    document.removeEventListener("visibilitychange", this._aoMudarAba);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

// Distância da câmera para um objeto de largura × altura (e profundidade)
// caber inteiro na tela, com uma folga. Usada no enquadramento automático.
export function distanciaParaCaber(camera, largura, altura, profundidade = 0, folga = 1.1) {
  const meioV = THREE.MathUtils.degToRad(camera.fov / 2);
  const meioH = Math.atan(Math.tan(meioV) * camera.aspect);
  const dist = Math.max(altura / 2 / Math.tan(meioV), largura / 2 / Math.tan(meioH));
  return dist * folga + profundidade / 2;
}

// Halo de brilho (sprite aditivo) que imita um bloom leve em volta das esferas.
// Funciona com o canvas transparente, onde o UnrealBloomPass apagaria o fundo.
let _texturaHalo = null;
export function criarHalo(cor, tamanho) {
  if (!_texturaHalo) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    _texturaHalo = new THREE.CanvasTexture(canvas);
    _texturaHalo.colorSpace = THREE.SRGBColorSpace;
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: _texturaHalo,
      color: cor,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sprite.scale.setScalar(tamanho);
  return sprite;
}

// Posição do mouse normalizada (-1..1) em relação à janela, compartilhada.
export const mouse = { x: 0, y: 0 };
window.addEventListener(
  "pointermove",
  (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  },
  { passive: true }
);
