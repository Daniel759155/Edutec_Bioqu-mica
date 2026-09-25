// Cena 3D da Jornada da Glicose (Figma: 07 · "Cena 3D — Glicólise (canvas)").
// Um cenário por etapa: vaso sanguíneo com hemácias, membrana com o
// transportador GLUT, glicólise (a glicose se divide em 2 piruvatos),
// ciclo de Krebs (anel girando), cadeia respiratória (elétrons pulando entre
// os complexos) e a ATP sintase girando como turbina.
// API: const cena = montarCenaJornada(el); cena.mostrarEtapa(i); cena.acerto(i); cena.erro(); cena.destruir();

import * as THREE from "three";
import { Palco3D, criarHalo, movimentoReduzido, suportaWebGL, mostrarFallback } from "./base.js";
import { montarMolecula, definicaoGlicose, definicaoATP } from "./moleculas.js";

const TEAL = 0x2ef2c4;
const CYAN = 0x38bdf8;
const VIOLETA = 0x8b5cf6;
const AMBER = 0xffb547;
const VERMELHO = 0xff5c7a;

const geoEsfera = new THREE.SphereGeometry(1, 24, 16);

function material(cor, opcoes = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: cor,
    emissive: cor,
    emissiveIntensity: 0.3,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
    ...opcoes,
  });
}

function esfera(cor, raio, halo = true) {
  const malha = new THREE.Mesh(geoEsfera, material(cor));
  malha.scale.setScalar(raio);
  if (halo) {
    const brilho = criarHalo(cor, 3);
    brilho.material.opacity = 0.3;
    malha.add(brilho);
  }
  return malha;
}

function glicose(escala = 0.72) {
  const molecula = montarMolecula(definicaoGlicose(), { halo: false });
  molecula.scale.setScalar(escala);
  return molecula;
}

// ---------------------------------------------------------------------------
// Cenários (cada um devolve { grupo, atualizar(dt, t), acerto() })
// ---------------------------------------------------------------------------

function cenarioCorrente() {
  const grupo = new THREE.Group();
  const mol = glicose();
  grupo.add(mol);

  // Hemácias: discos achatados vermelhos passando da esquerda para a direita.
  const hemacias = [];
  const matHemacia = material(VERMELHO, { emissiveIntensity: 0.15, transparent: true, opacity: 0.55 });
  for (let i = 0; i < 14; i++) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.32, 12, 28), matHemacia);
    h.position.set(-9 + Math.random() * 18, -4 + Math.random() * 8, -3 - Math.random() * 5);
    h.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    h.userData.vel = 1.2 + Math.random() * 1.6;
    grupo.add(h);
    hemacias.push(h);
  }
  let pressa = 1;
  return {
    grupo,
    atualizar(dt, t) {
      mol.rotation.y += dt * 0.5;
      mol.position.y = Math.sin(t * 1.6) * 0.15;
      hemacias.forEach((h) => {
        h.position.x += h.userData.vel * dt * pressa;
        h.rotation.x += dt * 0.6;
        if (h.position.x > 10) h.position.x = -10;
      });
      pressa += (1 - pressa) * dt;
    },
    acerto() {
      pressa = 5;
    },
  };
}

function cenarioMembrana() {
  const grupo = new THREE.Group();
  // Bicamada: duas fileiras de "cabeças" de fosfolipídios (esferas) + caudas.
  const matCabeca = material(VIOLETA, { emissiveIntensity: 0.25 });
  const matCauda = new THREE.MeshStandardMaterial({ color: 0x56657e, roughness: 0.6 });
  const geoCauda = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6);
  for (let y = -4.5; y <= 4.5; y += 0.55) {
    if (Math.abs(y) < 0.9) continue; // espaço do canal GLUT
    [-1, 1].forEach((lado) => {
      const cabeca = new THREE.Mesh(geoEsfera, matCabeca);
      cabeca.scale.setScalar(0.26);
      cabeca.position.set(lado * 1.2, y, 0);
      grupo.add(cabeca);
      const cauda = new THREE.Mesh(geoCauda, matCauda);
      cauda.rotation.z = Math.PI / 2;
      cauda.position.set(lado * 0.6, y, 0);
      grupo.add(cauda);
    });
  }
  // Transportador GLUT: tubo teal atravessando a membrana.
  const canal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 3, 24, 1, true),
    material(TEAL, { transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  canal.rotation.z = Math.PI / 2;
  grupo.add(canal);

  const mol = glicose(0.45);
  mol.position.x = -4;
  grupo.add(mol);
  let alvoX = -4;
  return {
    grupo,
    atualizar(dt, t) {
      mol.rotation.y += dt * 0.8;
      mol.position.x += (alvoX - mol.position.x) * Math.min(1, dt * 1.5);
      mol.position.y = alvoX > 0 ? 0 : Math.sin(t * 1.4) * 0.3;
      grupo.rotation.y = Math.sin(t * 0.3) * 0.35;
    },
    acerto() {
      alvoX = 4;
    },
  };
}

function cenarioGlicolise() {
  const grupo = new THREE.Group();
  const mol = glicose();
  grupo.add(mol);
  const piruvatos = [esfera(CYAN, 0.6), esfera(CYAN, 0.6)];
  piruvatos.forEach((p) => {
    p.visible = false;
    grupo.add(p);
  });
  const faiscas = criarFaiscas(TEAL);
  grupo.add(faiscas.pontos);
  let dividida = false;
  let progresso = 0;
  return {
    grupo,
    atualizar(dt, t) {
      faiscas.atualizar(dt);
      if (!dividida) {
        mol.rotation.y += dt * 0.5;
        mol.position.y = Math.sin(t * 1.6) * 0.15;
        return;
      }
      progresso = Math.min(1, progresso + dt * 1.2);
      const s = 1 - progresso;
      mol.scale.setScalar(0.72 * Math.max(0.001, s));
      piruvatos[0].position.set(-3.6 * progresso, -1.4 * progresso, 0);
      piruvatos[1].position.set(3.6 * progresso, -1.4 * progresso, 0);
      piruvatos.forEach((p) => (p.position.y += Math.sin(t * 2 + p.position.x) * 0.1));
    },
    acerto() {
      dividida = true;
      piruvatos.forEach((p) => (p.visible = true));
      faiscas.explodir(new THREE.Vector3(0, 0, 0));
    },
  };
}

function cenarioKrebs() {
  const grupo = new THREE.Group();
  const anel = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.12, 16, 80),
    material(VIOLETA, { emissiveIntensity: 0.5 })
  );
  grupo.add(anel);
  // 8 intermediários do ciclo girando no anel.
  const cores = [TEAL, CYAN, VIOLETA, TEAL, CYAN, VIOLETA, TEAL, AMBER];
  const intermediarios = cores.map((cor, i) => {
    const e = esfera(cor, i === 7 ? 0.42 : 0.32);
    e.userData.angulo = (i / cores.length) * Math.PI * 2;
    grupo.add(e);
    return e;
  });
  const acetil = esfera(AMBER, 0.45);
  acetil.position.set(-5, 2.5, 0);
  grupo.add(acetil);
  const co2 = criarFaiscas(0xeaf2ff);
  grupo.add(co2.pontos);
  let velocidade = 0.4;
  return {
    grupo,
    atualizar(dt, t) {
      co2.atualizar(dt);
      intermediarios.forEach((e) => {
        e.userData.angulo += dt * velocidade;
        e.position.set(Math.cos(e.userData.angulo) * 2.6, Math.sin(e.userData.angulo) * 2.6, 0);
      });
      velocidade += (0.4 - velocidade) * dt * 0.6;
      grupo.rotation.x = -0.5 + Math.sin(t * 0.4) * 0.1;
      acetil.position.lerp(new THREE.Vector3(-2.6, 0, 0), dt * 0.8);
    },
    acerto() {
      velocidade = 6;
      co2.explodir(new THREE.Vector3(2.6, 0, 0));
      co2.explodir(new THREE.Vector3(-2.6, 0, 0));
    },
  };
}

function cenarioCadeia() {
  const grupo = new THREE.Group();
  // Membrana interna: faixa horizontal.
  const membrana = new THREE.Mesh(
    new THREE.BoxGeometry(11, 1.2, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x1e2a40, transparent: true, opacity: 0.8, roughness: 0.7 })
  );
  grupo.add(membrana);
  // Complexos I–IV (cilindros violeta) atravessando a membrana.
  const xs = [-4, -1.5, 1, 3.5];
  xs.forEach((x, i) => {
    const complexo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 2.2, 20),
      material(i === 3 ? TEAL : VIOLETA, { emissiveIntensity: 0.35 })
    );
    complexo.position.x = x;
    grupo.add(complexo);
  });
  // Elétrons (amber) pulando de complexo em complexo.
  const eletrons = [0, 0.33, 0.66].map((fase) => {
    const e = esfera(AMBER, 0.18);
    e.userData.fase = fase;
    grupo.add(e);
    return e;
  });
  // Prótons (cyan) bombeados para cima.
  const protons = Array.from({ length: 10 }, () => {
    const p = esfera(CYAN, 0.1, false);
    p.position.set(xs[Math.floor(Math.random() * 3)], 0, 0);
    p.userData.vel = 0.6 + Math.random();
    grupo.add(p);
    return p;
  });
  let velocidade = 0.25;
  return {
    grupo,
    atualizar(dt, t) {
      eletrons.forEach((e) => {
        e.userData.fase = (e.userData.fase + dt * velocidade) % 1;
        const pos = e.userData.fase * (xs.length - 1);
        const i = Math.floor(pos);
        const f = pos - i;
        e.position.set(THREE.MathUtils.lerp(xs[i], xs[i + 1] ?? xs[i], f), -0.9 + Math.sin(f * Math.PI) * 0.5, 1.4);
      });
      protons.forEach((p) => {
        p.position.y += p.userData.vel * dt * velocidade * 4;
        if (p.position.y > 3.5) p.position.set(xs[Math.floor(Math.random() * 3)], 0.6, (Math.random() - 0.5) * 1.5);
      });
      velocidade += (0.25 - velocidade) * dt * 0.5;
      grupo.rotation.x = 0.35 + Math.sin(t * 0.3) * 0.05;
      grupo.rotation.y = Math.sin(t * 0.25) * 0.25;
    },
    acerto() {
      velocidade = 1.4;
    },
  };
}

function cenarioATP() {
  const grupo = new THREE.Group();
  // ATP sintase: base na membrana + haste + "cabeça" que gira.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.9, 12), material(VIOLETA, { emissiveIntensity: 0.3 }));
  base.position.y = -2.2;
  grupo.add(base);
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 10), material(0x8da2c0, { emissiveIntensity: 0.1 }));
  haste.position.y = -1;
  grupo.add(haste);
  const cabeca = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const lobo = esfera(i % 2 ? TEAL : CYAN, 0.45, false);
    const a = (i / 6) * Math.PI * 2;
    lobo.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
    cabeca.add(lobo);
  }
  cabeca.position.y = 0.3;
  grupo.add(cabeca);

  const atp = montarMolecula(definicaoATP(), { halo: false });
  atp.scale.setScalar(0.34);
  atp.position.set(3, 1.2, 0);
  grupo.add(atp);
  const faiscas = criarFaiscas(AMBER);
  grupo.add(faiscas.pontos);
  let giro = 1;
  return {
    grupo,
    atualizar(dt, t) {
      faiscas.atualizar(dt);
      cabeca.rotation.y += dt * giro;
      base.rotation.y += dt * giro * 1.3;
      giro += (1 - giro) * dt * 0.5;
      atp.rotation.y += dt * 0.6;
      atp.position.y = 1.2 + Math.sin(t * 1.5) * 0.2;
    },
    acerto() {
      giro = 14;
      faiscas.explodir(new THREE.Vector3(0, 0.3, 0));
      faiscas.explodir(new THREE.Vector3(3, 1.2, 0));
    },
  };
}

// Explosão de partículas (acerto): pontos aditivos que se espalham e somem.
function criarFaiscas(cor, quantidade = 90) {
  const posicoes = new Float32Array(quantidade * 3);
  const velocidades = Array.from({ length: quantidade }, () => new THREE.Vector3());
  const vidas = new Float32Array(quantidade);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(posicoes, 3));
  const pontos = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: cor, size: 0.14, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  pontos.frustumCulled = false;
  let proximo = 0;
  return {
    pontos,
    explodir(origem) {
      for (let n = 0; n < quantidade / 2; n++) {
        const i = proximo++ % quantidade;
        posicoes.set([origem.x, origem.y, origem.z], i * 3);
        velocidades[i].set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(2 + Math.random() * 4);
        vidas[i] = 1;
      }
      geo.attributes.position.needsUpdate = true;
    },
    atualizar(dt) {
      let ativo = false;
      for (let i = 0; i < quantidade; i++) {
        if (vidas[i] <= 0) {
          posicoes[i * 3 + 1] = 999; // fora da tela
          continue;
        }
        ativo = true;
        vidas[i] -= dt * 0.9;
        posicoes[i * 3] += velocidades[i].x * dt;
        posicoes[i * 3 + 1] += velocidades[i].y * dt;
        posicoes[i * 3 + 2] += velocidades[i].z * dt;
        velocidades[i].multiplyScalar(0.97);
      }
      pontos.material.opacity = ativo ? 0.9 : 0;
      geo.attributes.position.needsUpdate = true;
    },
  };
}

const CENARIOS = [cenarioCorrente, cenarioMembrana, cenarioGlicolise, cenarioKrebs, cenarioCadeia, cenarioATP];

export function montarCenaJornada(container) {
  if (!suportaWebGL()) {
    container.dataset.fallback = "assets/3d/glicose.svg";
    mostrarFallback(container);
    return null;
  }

  const palco = new Palco3D(container, { fov: 40, posicaoCamera: [0, 0, 13] });
  let atual = null;
  let saindo = []; // cenários antigos encolhendo até sumir
  let entrada = 1;
  let tremor = 0;

  palco.aoAtualizar((dt, t) => {
    if (atual) {
      atual.atualizar(movimentoReduzido ? 0 : dt, t);
      if (entrada < 1) {
        entrada = Math.min(1, entrada + dt * 2.5);
        atual.grupo.scale.setScalar(0.6 + 0.4 * entrada);
      }
    }
    saindo = saindo.filter((c) => {
      c.grupo.scale.multiplyScalar(0.85);
      if (c.grupo.scale.x >= 0.05 && !movimentoReduzido) return true;
      palco.scene.remove(c.grupo);
      return false;
    });
    // Tremor da câmera quando o jogador erra.
    if (tremor > 0) {
      tremor = Math.max(0, tremor - dt * 2.5);
      palco.camera.position.x = (Math.random() - 0.5) * tremor;
      palco.camera.position.y = (Math.random() - 0.5) * tremor;
    } else {
      palco.camera.position.x = palco.camera.position.y = 0;
    }
  });

  return {
    mostrarEtapa(indice) {
      if (atual) saindo.push(atual);
      atual = CENARIOS[indice]();
      palco.scene.add(atual.grupo);
      entrada = movimentoReduzido ? 1 : 0;
      atual.grupo.scale.setScalar(movimentoReduzido ? 1 : 0.6);
      palco.renderizar();
    },
    acerto() {
      atual?.acerto();
    },
    erro() {
      if (!movimentoReduzido) tremor = 0.6;
    },
    destruir() {
      palco.destruir();
    },
  };
}
