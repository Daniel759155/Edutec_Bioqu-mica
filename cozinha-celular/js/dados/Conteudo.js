// Conteúdo educativo do jogo: metadados de cada fase, "dados científicos"
// mostrados ao concluir uma fase e o banco de perguntas do mini quiz.
// Tudo revisado para bater com o que se ensina no ensino médio.

export const FASES = [
  {
    id: "ribossomo",
    rotulo: "FASE 1 · RIBOSSOMO",
    titulo: "Ribossomo",
    objetivo:
      "Leia os códons do RNAm, busque o aminoácido certo em cada estação e entregue no ribossomo, na ordem. No códon de parada, finalize a proteína.",
    controles: "WASD mover · ESPAÇO pegar/entregar · 1/2/3 power-ups",
    estrelas: [1, 3, 5], // proteínas completas para 1, 2 e 3 estrelas
  },
  {
    id: "mitocondria",
    rotulo: "FASE 2 · MITOCÔNDRIA",
    titulo: "Mitocôndria",
    objetivo:
      "Faça a respiração celular: quebre o combustível (glicose, ácido graxo ou aminoácido — muda a cada ciclo), passe pelo Ciclo de Krebs, entregue o NADH no complexo I ou o FADH₂ no complexo II e gire a ATP sintase. Fuja dos radicais livres e dos jatos de prótons!",
    controles: "WASD mover · ESPAÇO interagir com a estação",
    estrelas: [1, 3, 5], // ciclos completos
  },
  {
    id: "laboratorio",
    rotulo: "FASE 3 · LABORATÓRIO DE ENZIMAS",
    titulo: "Laboratório de Enzimas",
    objetivo:
      "Mantenha a temperatura entre 35 e 40 °C e o pH entre 6 e 8 para a enzima catalisar os substratos. Fora da faixa, ela perde a forma (desnatura)!",
    controles: "W/S temperatura · A/D pH · ou arraste os controles",
    estrelas: [4, 9, 14], // substratos catalisados
  },
  {
    id: "chefao",
    rotulo: "CHEFÃO · RADICAIS LIVRES",
    titulo: "Ataque dos Radicais Livres",
    objetivo:
      "O Radical Livre Supremo quer oxidar a célula! Neutralize-o com antioxidantes: Vitamina C na fase aquosa e Vitamina E na fase lipídica.",
    controles: "WASD mover · CLIQUE/J atirar · 1 Vitamina C · 2 Vitamina E",
    estrelas: [1, 1, 1],
  },
];

export const DADOS_CIENTIFICOS = {
  ribossomo: [
    "O códon AUG, além de codificar a metionina, é o sinal de início da tradução: é por ele que o ribossomo começa a montar quase todas as proteínas.",
    "O código genético é degenerado: vários códons diferentes codificam o mesmo aminoácido. A leucina, por exemplo, tem seis códons.",
    "Os códons UAA, UAG e UGA não codificam aminoácidos. Eles sinalizam o fim da tradução e liberam a proteína pronta.",
    "Quem leva cada aminoácido até o ribossomo é o RNA transportador (RNAt), que reconhece o códon pelo seu anticódon.",
  ],
  mitocondria: [
    "Uma única molécula de glicose pode render cerca de 30 a 32 ATP quando passa por glicólise, Ciclo de Krebs e cadeia respiratória.",
    "A glicólise acontece no citoplasma e não precisa de oxigênio. Já o Ciclo de Krebs ocorre na matriz mitocondrial.",
    "O oxigênio é o aceptor final de elétrons da cadeia respiratória: sem ele, a produção de ATP na mitocôndria para.",
    "A ATP sintase funciona como uma turbina molecular: o fluxo de prótons faz uma parte dela girar e isso monta o ATP.",
  ],
  laboratorio: [
    "Enzimas humanas costumam funcionar melhor perto de 37 °C. Acima de ~40 °C, muitas começam a desnaturar e perdem a forma do sítio ativo.",
    "Cada enzima tem um pH ótimo: a pepsina do estômago prefere pH ≈ 2, enquanto a tripsina do intestino prefere pH ≈ 8.",
    "Enzimas são catalisadores: aceleram as reações sem serem consumidas, e podem ser reutilizadas milhares de vezes por segundo.",
    "No frio a enzima não desnatura, mas as moléculas se movem menos e a reação fica bem mais lenta.",
  ],
  chefao: [
    "Radicais livres têm um elétron desemparelhado e roubam elétrons de outras moléculas, danificando membranas, proteínas e DNA.",
  ],
};

// Perguntas do mini quiz: 3 são sorteadas por fase.
export const QUIZ = {
  ribossomo: [
    {
      pergunta: "Qual códon inicia a tradução na maioria das proteínas?",
      opcoes: ["UAA", "AUG", "GGC", "UGA"],
      correta: 1,
      explicacao: "AUG codifica a metionina e marca o início da tradução.",
    },
    {
      pergunta: "Onde acontece a tradução (síntese de proteínas)?",
      opcoes: ["No núcleo", "No lisossomo", "No ribossomo", "Na membrana plasmática"],
      correta: 2,
      explicacao: "O ribossomo lê o RNAm e liga os aminoácidos na ordem certa.",
    },
    {
      pergunta: "O que é um códon?",
      opcoes: ["Um trio de bases do RNAm", "Um tipo de proteína", "Uma enzima do núcleo", "Um aminoácido essencial"],
      correta: 0,
      explicacao: "Cada códon é uma sequência de 3 nucleotídeos que corresponde a um aminoácido ou a um sinal de parada.",
    },
    {
      pergunta: "Qual destes é um códon de parada?",
      opcoes: ["AUG", "UUU", "UAG", "GCU"],
      correta: 2,
      explicacao: "UAA, UAG e UGA são os três códons de parada.",
    },
    {
      pergunta: "Qual molécula leva os aminoácidos até o ribossomo?",
      opcoes: ["RNA mensageiro", "RNA transportador", "DNA polimerase", "ATP sintase"],
      correta: 1,
      explicacao: "O RNAt carrega o aminoácido e reconhece o códon pelo anticódon.",
    },
  ],
  mitocondria: [
    {
      pergunta: "Onde ocorre o Ciclo de Krebs na célula eucariótica?",
      opcoes: ["No citoplasma", "Na matriz mitocondrial", "No núcleo", "No ribossomo"],
      correta: 1,
      explicacao: "O Ciclo de Krebs acontece na matriz, a parte mais interna da mitocôndria.",
    },
    {
      pergunta: "Em que parte da célula ocorre a glicólise?",
      opcoes: ["Na matriz mitocondrial", "Nas cristas mitocondriais", "No citoplasma", "No complexo golgiense"],
      correta: 2,
      explicacao: "A glicólise quebra a glicose em piruvato ainda no citoplasma.",
    },
    {
      pergunta: "Qual é o aceptor final de elétrons da cadeia respiratória?",
      opcoes: ["Gás carbônico", "Oxigênio", "Glicose", "Água"],
      correta: 1,
      explicacao: "O O₂ recebe os elétrons no fim da cadeia e forma água.",
    },
    {
      pergunta: "Qual enzima produz a maior parte do ATP na mitocôndria?",
      opcoes: ["ATP sintase", "Amilase", "Pepsina", "Helicase"],
      correta: 0,
      explicacao: "O fluxo de prótons faz a ATP sintase girar e montar ATP.",
    },
    {
      pergunta: "O que a glicólise produz a partir de uma glicose?",
      opcoes: ["2 piruvatos", "6 CO₂", "1 aminoácido", "2 NAD⁺ apenas"],
      correta: 0,
      explicacao: "A glicose (6 carbonos) é quebrada em 2 piruvatos (3 carbonos cada), com saldo de 2 ATP.",
    },
  ],
  laboratorio: [
    {
      pergunta: "O que acontece com uma enzima humana a 60 °C?",
      opcoes: ["Fica mais rápida para sempre", "Desnatura e perde a forma", "Vira um carboidrato", "Nada muda"],
      correta: 1,
      explicacao: "O calor excessivo quebra ligações que mantêm a forma da enzima, e o sítio ativo deixa de encaixar o substrato.",
    },
    {
      pergunta: "Como se chama a região da enzima onde o substrato se encaixa?",
      opcoes: ["Sítio ativo", "Códon", "Crista", "Núcleo"],
      correta: 0,
      explicacao: "O substrato se liga ao sítio ativo, que tem forma complementar a ele.",
    },
    {
      pergunta: "O que as enzimas fazem com a energia de ativação de uma reação?",
      opcoes: ["Aumentam", "Diminuem", "Não alteram", "Transformam em calor"],
      correta: 1,
      explicacao: "Enzimas diminuem a energia de ativação, e por isso a reação acontece mais rápido.",
    },
    {
      pergunta: "Uma enzima do estômago (pepsina) funciona melhor em qual pH?",
      opcoes: ["pH ≈ 2", "pH ≈ 7", "pH ≈ 10", "pH ≈ 14"],
      correta: 0,
      explicacao: "O suco gástrico é muito ácido, e a pepsina é adaptada a um pH ≈ 2.",
    },
    {
      pergunta: "A maioria das enzimas é formada por qual tipo de molécula?",
      opcoes: ["Lipídios", "Proteínas", "Carboidratos", "Sais minerais"],
      correta: 1,
      explicacao: "A maioria das enzimas é proteína, e por isso é sensível a temperatura e pH.",
    },
  ],
};

export function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

export function embaralhar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
