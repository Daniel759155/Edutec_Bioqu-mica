// Conquistas do Fluxo (Figma: 06 · Jogos — Fluxo → "Suas conquistas").
// Ficam salvas no localStorage do navegador. Uma medalha recém-desbloqueada
// ganha animação de "pop" + brilho girando na próxima vez que aparecer.

const CHAVE = "fluxo_conquistas_v1";
const CHAVE_VISTAS = "fluxo_conquistas_vistas_v1";

export const CONQUISTAS = [
  { id: "primeiro-atp", icone: "⚡", nome: "Primeiro ATP", dica: "Ganhe seu primeiro ATP em qualquer modo." },
  { id: "mestre", icone: "🧬", nome: "Mestre do DNA", dica: "Acerte as 6 etapas da Jornada de primeira." },
  { id: "krebs", icone: "🔥", nome: "Krebs sem erros", dica: "Acerte a etapa do Ciclo de Krebs sem errar." },
  { id: "mapa-rapido", icone: "🗺️", nome: "Mapa em < 2 min", dica: "Termine a Aventura no Mapa em menos de 2 minutos." },
  { id: "atp-max", icone: "🏆", nome: "36 ATP", dica: "Termine a Jornada com todos os 36 ATP." },
];

function ler(chave) {
  try {
    return JSON.parse(localStorage.getItem(chave)) || {};
  } catch {
    return {};
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem localStorage (aba privada): a conquista vale só nesta visita */
  }
}

export function conquistadas() {
  return ler(CHAVE);
}

// Desbloqueia e avisa a página (evento "fluxo:conquista"). Devolve true se for nova.
export function desbloquear(id) {
  const lista = ler(CHAVE);
  if (lista[id]) return false;
  lista[id] = Date.now();
  gravar(CHAVE, lista);
  const conquista = CONQUISTAS.find((c) => c.id === id);
  if (conquista) window.dispatchEvent(new CustomEvent("fluxo:conquista", { detail: conquista }));
  return true;
}

// Ids já desbloqueados que o jogador ainda não viu na grade de medalhas.
export function novasNaoVistas() {
  const vistas = ler(CHAVE_VISTAS);
  return Object.keys(ler(CHAVE)).filter((id) => !vistas[id]);
}

export function marcarVistas() {
  const vistas = ler(CHAVE_VISTAS);
  Object.keys(ler(CHAVE)).forEach((id) => (vistas[id] = true));
  gravar(CHAVE_VISTAS, vistas);
}
