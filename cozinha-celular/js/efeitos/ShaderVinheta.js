// Passe final de "lente": escurece as bordas (vinheta) e dá uma leve
// correção de cor (contraste + saturação), para a cena parecer filmada.

export const ShaderVinheta = {
  uniforms: {
    tDiffuse: { value: null },
    forca: { value: 0.45 },
    suavidade: { value: 0.55 },
    saturacao: { value: 1.08 },
    contraste: { value: 1.04 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float forca;
    uniform float suavidade;
    uniform float saturacao;
    uniform float contraste;
    varying vec2 vUv;

    void main() {
      vec4 cor = texture2D(tDiffuse, vUv);

      float luma = dot(cor.rgb, vec3(0.2126, 0.7152, 0.0722));
      cor.rgb = mix(vec3(luma), cor.rgb, saturacao);
      cor.rgb = (cor.rgb - 0.18) * contraste + 0.18;

      float distancia = length(vUv - 0.5) * 1.414;
      float vinheta = smoothstep(1.0, 1.0 - suavidade, distancia);
      cor.rgb *= mix(1.0 - forca, 1.0, vinheta);

      gl_FragColor = vec4(max(cor.rgb, 0.0), cor.a);
    }
  `,
};
