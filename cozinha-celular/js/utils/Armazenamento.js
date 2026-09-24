// Acesso seguro ao localStorage: em aba anônima ou com o armazenamento
// bloqueado, o jogo continua funcionando (só não lembra de nada).

const PREFIXO = "codigo-celular:";

export function ler(chave, padrao) {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    return bruto === null ? padrao : JSON.parse(bruto);
  } catch (erro) {
    return padrao;
  }
}

export function gravar(chave, valor) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch (erro) {
    // Sem armazenamento disponível: ignora.
  }
}
