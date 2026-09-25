// Componente "3D / Glicose C6H12O6" (Figma 303:234) e visualizador genérico
// de moléculas. A molécula flutua (±10px, ciclo de 4s), gira devagar, pode
// ser arrastada com o mouse (OrbitControls sem zoom e sem pan) e, ao passar
// o mouse num átomo, mostra o tooltip "C · Carbono" + o papel do átomo.
// Uso: <div data-3d="glicose" data-fallback="assets/3d/glicose.svg"></div>
//      data-arrastavel="false" desliga o arraste (ex.: glicose do hero).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Palco3D, distanciaParaCaber, movimentoReduzido } from "./base.js";
import { montarMolecula, definicaoGlicose } from "./moleculas.js";

const AMPLITUDE_FLUTUAR = 0.12; // ≈ 10px na tela
const PERIODO_FLUTUAR = 4; // segundos
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.8;

export class VisualizadorMolecula {
  // opcoes: { arrastavel, autoRotacao, distancia, tooltip }
  // Sem "distancia", a câmera enquadra a molécula inteira automaticamente.
  constructor(container, { arrastavel = true, autoRotacao = true, distancia = 0, tooltip = true } = {}) {
    this.palco = new Palco3D(container, { fov: 40 });
    this.container = container;
    this.distanciaFixa = distancia;
    this.zoom = 1; // >1 aproxima
    this._zoomAtual = 1;
    this._escalaEntrada = 1; // animação de troca de molécula
    this.flutuar = new THREE.Group(); // sobe e desce
    this.palco.scene.add(this.flutuar);
    this.objeto = null;
    this.autoRotacao = autoRotacao && !movimentoReduzido;
    this.palco.aoRedimensionar = () => this._enquadrar();

    if (arrastavel) {
      container.classList.add("palco-3d--arrastavel");
      this.controles = new OrbitControls(this.palco.camera, this.palco.renderer.domElement);
      this.controles.enableZoom = false;
      this.controles.enablePan = false;
      this.controles.enableDamping = true;
      this.controles.dampingFactor = 0.08;
      this.controles.rotateSpeed = 0.7;
      // Com movimento reduzido não há animação contínua: renderiza ao arrastar.
      this.controles.addEventListener("change", () => this.palco.renderizar());
    }

    if (tooltip) this._criarTooltip();
    this.palco.aoAtualizar((delta, tempo) => this._atualizar(delta, tempo));
  }

  // Mostra uma molécula a partir da definição { atomos, ligacoes }.
  mostrar(definicao) {
    return this.mostrarObjeto(montarMolecula(definicao));
  }

  // Mostra qualquer THREE.Object3D. Os meshes em objeto.userData.atomos
  // (com userData { elemento, nome, papel }) respondem ao tooltip.
  mostrarObjeto(objeto) {
    if (this.objeto) this.flutuar.remove(this.objeto);
    this.objeto = objeto;
    this.flutuar.add(objeto);
    this._escalaEntrada = movimentoReduzido ? 1 : 0.6;
    this._enquadrar();
    this.palco.renderizar();
    return objeto;
  }

  // Botões ＋ / －: multiplica o zoom (limitado).
  aproximar(fator) {
    this.zoom = THREE.MathUtils.clamp(this.zoom * fator, ZOOM_MIN, ZOOM_MAX);
    if (movimentoReduzido) {
      this._zoomAtual = this.zoom;
      this._enquadrar();
      this.palco.renderizar();
    }
  }

  // Como a molécula gira em todos os eixos, enquadra a esfera que a envolve.
  _enquadrar() {
    if (!this.objeto) return;
    const escala = this.objeto.scale.x;
    this.objeto.scale.setScalar(1);
    const raio = new THREE.Box3().setFromObject(this.objeto).getBoundingSphere(new THREE.Sphere()).radius + 0.3;
    this.objeto.scale.setScalar(escala);
    const distancia = this.distanciaFixa || distanciaParaCaber(this.palco.camera, raio * 2, raio * 2 + 0.3, 0, 1.05);
    this.palco.camera.position.setLength(distancia / this._zoomAtual);
    if (this.controles) this.controles.update();
  }

  _atualizar(delta, tempo) {
    if (!this.objeto) return;
    if (!movimentoReduzido) {
      this.flutuar.position.y = Math.sin((tempo / PERIODO_FLUTUAR) * Math.PI * 2) * AMPLITUDE_FLUTUAR;
      // Entrada da molécula: escala 0.6 → 1 com desaceleração.
      if (this._escalaEntrada < 1) {
        this._escalaEntrada += (1 - this._escalaEntrada) * Math.min(1, delta * 7);
        if (1 - this._escalaEntrada < 0.002) this._escalaEntrada = 1;
        this.objeto.scale.setScalar(this._escalaEntrada);
      }
      // Zoom suave até o valor pedido pelos botões.
      if (Math.abs(this._zoomAtual - this.zoom) > 0.001) {
        this._zoomAtual += (this.zoom - this._zoomAtual) * Math.min(1, delta * 6);
        this._enquadrar();
      }
    }
    if (this.autoRotacao) this.objeto.rotation.y += delta * 0.35;
    if (this.controles) this.controles.update();
  }

  // --- Tooltip do átomo sob o mouse (Raycaster) ---------------------------
  _criarTooltip() {
    this.tooltip = document.createElement("div");
    this.tooltip.className = "tooltip-3d";
    this.tooltip.setAttribute("role", "status");
    this.container.appendChild(this.tooltip);

    const raycaster = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2();
    const canvas = this.palco.renderer.domElement;

    canvas.addEventListener("pointermove", (e) => {
      const atomos = this.objeto?.userData.atomos;
      if (!atomos) return;
      const r = canvas.getBoundingClientRect();
      ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ponteiro, this.palco.camera);
      const [acerto] = raycaster.intersectObjects(atomos, false);
      if (acerto) {
        const { elemento, nome, papel } = acerto.object.userData;
        this.tooltip.innerHTML = `<strong>${elemento} · ${nome}</strong>${papel ? `<span>${papel}</span>` : ""}`;
        this.tooltip.style.left = `${e.clientX - r.left}px`;
        this.tooltip.style.top = `${e.clientY - r.top}px`;
        this.tooltip.classList.add("visivel");
      } else {
        this.tooltip.classList.remove("visivel");
      }
    });
    canvas.addEventListener("pointerleave", () => this.tooltip.classList.remove("visivel"));
  }
}

export function montar(container) {
  const arrastavel = container.dataset.arrastavel !== "false";
  const visualizador = new VisualizadorMolecula(container, {
    arrastavel,
    tooltip: arrastavel,
    distancia: Number(container.dataset.distancia) || 0,
  });
  visualizador.mostrar(definicaoGlicose());
  return visualizador;
}
