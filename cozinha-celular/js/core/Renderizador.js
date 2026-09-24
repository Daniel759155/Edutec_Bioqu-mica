// Cria o WebGLRenderer e a cadeia de pós-processamento (EffectComposer).
// Centraliza tudo que depende da qualidade gráfica escolhida no menu.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CONFIG } from "../utils/Config.js";

export class Renderizador {
  constructor(container, cena, camera) {
    this.cena = cena;
    this.camera = camera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = CONFIG.preset.sombras;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.passeRender = new RenderPass(cena, camera);
    this.composer.addPass(this.passeRender);

    this.passeBloom = new UnrealBloomPass(new THREE.Vector2(1, 1), CONFIG.preset.bloomForca, CONFIG.preset.bloomRaio, 0.82);
    this.composer.addPass(this.passeBloom);

    this.composer.addPass(new OutputPass());

    this.aplicarQualidade();
    this.redimensionar();

    window.addEventListener("resize", () => this.redimensionar());
  }

  // Reaplica os parâmetros do preset atual (chamado ao trocar a qualidade no menu).
  aplicarQualidade() {
    const preset = CONFIG.preset;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, preset.limitePixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = preset.sombras;
    this.passeBloom.strength = preset.bloomForca;
    this.passeBloom.radius = preset.bloomRaio;
  }

  redimensionar() {
    const largura = window.innerWidth;
    const altura = window.innerHeight;
    this.camera.aspect = largura / altura;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(largura, altura);
    this.composer.setSize(largura, altura);
  }

  renderizar() {
    this.composer.render();
  }
}
