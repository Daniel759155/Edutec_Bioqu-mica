// Checagem de WebGL e imagem de fallback — sem depender do Three.js, para
// funcionar mesmo se a CDN estiver fora do ar.

// Testa se dá para criar um contexto WebGL (alguns PCs da escola bloqueiam).
export function suportaWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

// Coloca a imagem de fallback (SVG do Figma, em data-fallback) no lugar do canvas.
export function mostrarFallback(container) {
  const src = container.dataset.fallback;
  if (!src || container.querySelector(".palco-3d__fallback")) return;
  container.classList.add("palco-3d");
  const img = document.createElement("img");
  img.className = "palco-3d__fallback";
  img.src = src;
  img.alt = container.dataset.fallbackAlt || "";
  container.appendChild(img);
}
