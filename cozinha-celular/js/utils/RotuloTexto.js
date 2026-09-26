// Cria rótulos de texto flutuantes em 3D (sprites com textura desenhada em
// canvas): nomes das estações, letras do RNAm, "pílulas" sobre a enzima.
// Sem imagens externas: tudo desenhado por código, com as fontes do jogo.

import * as THREE from "three";

const FONTE_TITULO = '"Montserrat", "Segoe UI", sans-serif';
const FONTE_TEXTO = '"Inter", "Segoe UI", sans-serif';

function tracarRetanguloArredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// linhas: [texto principal, texto secundário opcional]
// opcoes: largura (em unidades do mundo), fonte (px da 1ª linha), fundo (cor da pílula), titulo (usa Montserrat)
export function criarRotulo(linhas, corDestaque = "#ffffff", opcoes = {}) {
  const { largura = 1.6, fonte = 58, fundo = null, titulo = false, brilho = true } = opcoes;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const familia = titulo ? FONTE_TITULO : FONTE_TEXTO;
  const peso = titulo ? 900 : 700;
  const temSegunda = Boolean(linhas[1]);
  const yPrincipal = temSegunda ? canvas.height * 0.38 : canvas.height * 0.5;

  // Reduz a fonte quando o texto não cabe no canvas (evita rótulos cortados).
  const larguraUtil = canvas.width - 24;
  const ajustarFonte = (texto, pesoFonte, tamanho, familiaFonte) => {
    ctx.font = `${pesoFonte} ${tamanho}px ${familiaFonte}`;
    const medida = ctx.measureText(texto).width;
    if (medida > larguraUtil) {
      ctx.font = `${pesoFonte} ${Math.floor((tamanho * larguraUtil) / medida)}px ${familiaFonte}`;
    }
  };

  ajustarFonte(linhas[0], peso, fonte * 2, familia);
  if (fundo) {
    const larguraTexto = ctx.measureText(linhas[0]).width;
    const alturaPilula = fonte * 2 * 1.35;
    const w = Math.min(canvas.width - 8, larguraTexto + fonte * 1.6);
    ctx.fillStyle = fundo;
    tracarRetanguloArredondado(ctx, (canvas.width - w) / 2, yPrincipal - alturaPilula / 2, w, alturaPilula, alturaPilula / 2);
    ctx.fill();
  }

  ctx.fillStyle = corDestaque;
  if (brilho) {
    ctx.shadowColor = corDestaque;
    ctx.shadowBlur = 18;
  }
  ctx.fillText(linhas[0], canvas.width / 2, yPrincipal);

  if (temSegunda) {
    ajustarFonte(linhas[1], 600, fonte, FONTE_TEXTO);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
    ctx.fillText(linhas[1], canvas.width / 2, canvas.height * 0.74);
  }

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: textura, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(largura, largura / 2, 1);
  return sprite;
}
