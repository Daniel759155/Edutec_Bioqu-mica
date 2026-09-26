// Shader personalizado (GLSL) do "chão" de citoplasma: uma superfície líquida
// que ondula suavemente e brilha como um gel orgânico vivo.

import * as THREE from "three";

const VERTEX_SHADER = /* glsl */ `
  uniform float uTempo;
  varying vec2 vUv;
  varying float vOnda;

  void main() {
    vUv = uv;
    vec3 posicao = position;

    float onda = sin(posicao.x * 0.6 + uTempo * 1.1) * 0.18
               + cos(posicao.y * 0.5 - uTempo * 0.8) * 0.18;
    posicao.z += onda;
    vOnda = onda;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(posicao, 1.0);
  }
`;

// Gradiente radial do Figma ("Chão – citoplasma"): centro azul translúcido
// que se dissolve no fundo escuro, com faixas suaves que ondulam.
const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uCorBase;
  uniform vec3 uCorBrilho;
  uniform float uTempo;
  varying vec2 vUv;
  varying float vOnda;

  void main() {
    float d = distance(vUv, vec2(0.5)) * 2.0;
    vec3 cor = mix(uCorBrilho, uCorBase, smoothstep(0.0, 0.7, d));
    float alfa = mix(0.55, 0.35, smoothstep(0.0, 0.7, d)) * (1.0 - smoothstep(0.7, 1.0, d));

    float faixas = sin((vUv.x + vUv.y) * 12.0 + uTempo * 0.6) * 0.5 + 0.5;
    cor += (faixas * 0.05 + vOnda * 0.12) * uCorBrilho;

    gl_FragColor = vec4(cor, alfa);
  }
`;

export function criarMaterialCitoplasma(corBase, corBrilho) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTempo: { value: 0 },
      uCorBase: { value: new THREE.Color(corBase) },
      uCorBrilho: { value: new THREE.Color(corBrilho) },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
}
