// Código genético padrão (tabela de códons de RNAm -> aminoácido), correto e
// completo, usado pela Fase 1 (Ribossomo) e reaproveitável pelo quiz depois.

export const CODIGO_GENETICO = {
  UUU: "Phe", UUC: "Phe", UUA: "Leu", UUG: "Leu",
  CUU: "Leu", CUC: "Leu", CUA: "Leu", CUG: "Leu",
  AUU: "Ile", AUC: "Ile", AUA: "Ile", AUG: "Met",
  GUU: "Val", GUC: "Val", GUA: "Val", GUG: "Val",
  UCU: "Ser", UCC: "Ser", UCA: "Ser", UCG: "Ser",
  CCU: "Pro", CCC: "Pro", CCA: "Pro", CCG: "Pro",
  ACU: "Thr", ACC: "Thr", ACA: "Thr", ACG: "Thr",
  GCU: "Ala", GCC: "Ala", GCA: "Ala", GCG: "Ala",
  UAU: "Tyr", UAC: "Tyr", UAA: "Stop", UAG: "Stop",
  CAU: "His", CAC: "His", CAA: "Gln", CAG: "Gln",
  AAU: "Asn", AAC: "Asn", AAA: "Lys", AAG: "Lys",
  GAU: "Asp", GAC: "Asp", GAA: "Glu", GAG: "Glu",
  UGU: "Cys", UGC: "Cys", UGA: "Stop", UGG: "Trp",
  CGU: "Arg", CGC: "Arg", CGA: "Arg", CGG: "Arg",
  AGU: "Ser", AGC: "Ser", AGA: "Arg", AGG: "Arg",
  GGU: "Gly", GGC: "Gly", GGA: "Gly", GGG: "Gly",
};

export const CODONS_PARADA = ["UAA", "UAG", "UGA"];
export const CODON_INICIO = "AUG";

// Aminoácidos jogáveis da Fase 1 (um subconjunto do código genético, para
// caber na cena). Cores seguem a paleta das estações no design.
export const AMINOACIDOS_FASE1 = {
  Met: { sigla: "Met", nome: "Metionina", cor: 0x4dff9a },
  Phe: { sigla: "Phe", nome: "Fenilalanina", cor: 0xffd24d },
  Gly: { sigla: "Gly", nome: "Glicina", cor: 0x4dc3ff },
  Ala: { sigla: "Ala", nome: "Alanina", cor: 0xff8a5c },
  Leu: { sigla: "Leu", nome: "Leucina", cor: 0xff6fd8 },
  Ser: { sigla: "Ser", nome: "Serina", cor: 0xc9a7ff },
};

// Todos os códons (sinônimos incluídos) que codificam os aminoácidos jogáveis,
// menos o de início: é daqui que saem os "recheios" de cada pedido.
export const CODONS_SENTIDO_FASE1 = Object.keys(CODIGO_GENETICO).filter((codon) => {
  const aminoacido = CODIGO_GENETICO[codon];
  return aminoacido !== "Met" && aminoacido in AMINOACIDOS_FASE1;
});

export function aminoacidoDoCodon(codon) {
  return CODIGO_GENETICO[codon];
}
