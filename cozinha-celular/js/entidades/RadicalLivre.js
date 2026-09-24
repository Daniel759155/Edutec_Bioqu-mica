// Radical livre: esfera espinhosa vermelho-rosada com um olho de fenda
// laranja e um "elétron desemparelhado" orbitando. Usado no tamanho grande
// (o chefão) e em versões pequenas (lacaios que perseguem a enzima).

import * as THREE from "three";
import { criarRotulo } from "../utils/RotuloTexto.js";

// Distribui pontos quase uniformes na esfera (espiral de Fibonacci).
function pontosNaEsfera(quantidade) {
  const pontos = [];
  const angulo = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < quantidade; i++) {
    const y = 1 - (i / (quantidade - 1)) * 2;
    const raio = Math.sqrt(1 - y * y);
    pontos.push(new THREE.Vector3(Math.cos(angulo * i) * raio, y, Math.sin(angulo * i) * raio));
  }
  return pontos;
}

export class RadicalLivre {
  constructor({ raio = 1.8, espinhos = 28, comEletron = false } = {}) {
    this.raio = raio;
    this.grupo = new THREE.Group();
    this.corpo = new THREE.Group();
    this.grupo.add(this.corpo);
    this._relogio = Math.random() * 10;

    this.materialNucleo = new THREE.MeshPhysicalMaterial({
      color: 0xff4f7a,
      emissive: 0xd0104a,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      clearcoat: 1,
    });
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(raio, 36, 28), this.materialNucleo);
    nucleo.castShadow = true;
    this.corpo.add(nucleo);

    const materialEspinho = new THREE.MeshStandardMaterial({ color: 0xff2e63, emissive: 0xc0103a, emissiveIntensity: 0.6, roughness: 0.4 });
    const geometriaEspinho = new THREE.ConeGeometry(raio * 0.22, raio * 0.75, 8);
    pontosNaEsfera(espinhos).forEach((direcao) => {
      const espinho = new THREE.Mesh(geometriaEspinho, materialEspinho);
      espinho.position.copy(direcao).multiplyScalar(raio * 1.12);
      espinho.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao);
      this.corpo.add(espinho);
    });

    // Olho: fenda escura com íris laranja, sempre virado para o alvo.
    this.olho = new THREE.Group();
    const esclera = new THREE.Mesh(new THREE.SphereGeometry(raio * 0.42, 24, 16), new THREE.MeshStandardMaterial({ color: 0x1a0010, roughness: 0.3 }));
    esclera.scale.set(1.35, 0.62, 0.35);
    this.olho.add(esclera);
    const iris = new THREE.Mesh(new THREE.CapsuleGeometry(raio * 0.1, raio * 0.28, 6, 12), new THREE.MeshBasicMaterial({ color: 0xff9a3d }));
    iris.position.z = raio * 0.12;
    this.olho.add(iris);
    this.olho.position.z = raio * 0.92;
    this.pivoOlho = new THREE.Group();
    this.pivoOlho.add(this.olho);
    this.grupo.add(this.pivoOlho);

    // Reflexo especular.
    const reflexo = new THREE.Mesh(new THREE.SphereGeometry(raio * 0.25, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
    reflexo.scale.set(1.6, 0.6, 0.5);
    reflexo.position.set(-raio * 0.45, raio * 0.6, raio * 0.55);
    this.grupo.add(reflexo);

    if (comEletron) {
      this.eletron = new THREE.Group();
      const bolinha = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe14d }));
      bolinha.position.x = raio * 1.9;
      const rotulo = criarRotulo(["elétron desemparelhado"], "#ffe9a0", { largura: 3.2, fonte: 30 });
      rotulo.position.set(raio * 1.9, 0.55, 0);
      this.eletron.add(bolinha, rotulo);
      this.grupo.add(this.eletron);

      // Escudo que mostra qual antioxidante funciona agora.
      this.escudo = new THREE.Mesh(
        new THREE.SphereGeometry(raio * 1.75, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0xff9a3d, transparent: true, opacity: 0.1, depthWrite: false })
      );
      this.grupo.add(this.escudo);
    }
    this._piscar = 0;
  }

  olharPara(ponto) {
    const alvo = ponto.clone();
    alvo.y = this.grupo.position.y;
    this.pivoOlho.lookAt(alvo);
  }

  // Pisca em branco quando leva dano.
  atingido() {
    this._piscar = 0.15;
  }

  definirCorEscudo(cor) {
    if (this.escudo) this.escudo.material.color.setHex(cor);
  }

  atualizar(delta) {
    this._relogio += delta;
    this.corpo.rotation.y += delta * 0.6;
    this.corpo.rotation.x = Math.sin(this._relogio * 0.7) * 0.2;
    const pulso = 1 + Math.sin(this._relogio * 4) * 0.03;
    this.corpo.scale.setScalar(pulso);
    if (this.eletron) this.eletron.rotation.y += delta * 1.4;
    if (this.escudo) this.escudo.material.opacity = 0.08 + Math.sin(this._relogio * 3) * 0.04;

    this._piscar = Math.max(0, this._piscar - delta);
    this.materialNucleo.emissive.setHex(this._piscar > 0 ? 0xffffff : 0xd0104a);
  }
}
