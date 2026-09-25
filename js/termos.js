// Página Termos de Uso e Política de Privacidade (Figma: 13 · Termos).
// Sumário fixo que destaca a seção visível (IntersectionObserver), rolagem
// suave ao clicar e barra de progresso de leitura no topo da página.

progressoDeLeitura();
sumarioAtivo();

function progressoDeLeitura() {
  const barra = document.querySelector("[data-progresso-leitura]");
  if (!barra) return;
  let agendado = false;
  const atualizar = () => {
    agendado = false;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const lido = total > 0 ? Math.min(1, window.scrollY / total) : 0;
    barra.style.setProperty("--leitura", lido.toFixed(4));
  };
  window.addEventListener(
    "scroll",
    () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(atualizar);
    },
    { passive: true }
  );
  window.addEventListener("resize", atualizar);
  atualizar();
}

function sumarioAtivo() {
  const links = [...document.querySelectorAll("[data-sumario] .sumario__lista a")];
  const clausulas = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if (!clausulas.length) return;

  const ativar = (id) => {
    links.forEach((a) => {
      const ativo = a.hash === `#${id}`;
      a.classList.toggle("ativo", ativo);
      if (ativo) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
    clausulas.forEach((c) => c.classList.toggle("em-foco", c.id === id));
  };

  // A cláusula "ativa" é a que cruza uma faixa perto do topo da tela.
  const visiveis = new Set();
  const io = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => (e.isIntersecting ? visiveis.add(e.target) : visiveis.delete(e.target)));
      const primeira = clausulas.find((c) => visiveis.has(c));
      if (primeira) ativar(primeira.id);
    },
    { rootMargin: "-20% 0px -65% 0px" }
  );
  clausulas.forEach((c) => io.observe(c));
  ativar(clausulas[0].id);

  // Clique: marca na hora (a rolagem suave vem do scroll-behavior do CSS).
  links.forEach((a) => a.addEventListener("click", () => ativar(a.hash.slice(1))));
}
