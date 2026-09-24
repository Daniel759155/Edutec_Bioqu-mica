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

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uCorBase;
  uniform vec3 uCorBrilho;
  uniform float uTempo;
  varying vec2 vUv;
  varying float vOnda;

  void main() {
    float faixas = sin((vUv.x + vUv.y) * 12.0 + uTempo * 0.6) * 0.5 + 0.5;
    vec3 cor = mix(uCorBase, uCorBrilho, faixas * 0.25 + vOnda * 0.6 + 0.2);

    float vinheta = smoothstep(1.05, 0.15, distance(vUv, vec2(0.5)));
    cor *= vinheta;

    gl_FragColor = vec4(cor, 1.0);
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
  });
}
