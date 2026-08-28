const fetch = require('node-fetch'); // wait node 22 has global fetch
require('dotenv').config({ path: '.env.local' });

(async () => {
  const baseUrl = process.env.ONEDOC_BASE_URL;
  const authHash = process.env.ONEDOC_AUTH_HASH;
  const hash = 'CF4594800B07A90726AD6C6D';
  const url = `${baseUrl}/processos-administrativos/${hash}/despachos?pagina=1`;
  const res = await fetch(url, {
    headers: { "X-Auth-Hash": authHash },
  });
  const json = await res.json();
  const processo = json.data?.[0]?.emissoes?.[0];
  if(processo) {
    const movs = processo.movimentacoes || [];
    movs.forEach((m, idx) => {
      if(m.conteudo) {
        console.log(`\n\n--- Movimentacao ${idx} ---`);
        console.log(m.conteudo.substring(0, 500));
        if (m.conteudo.includes('href') || m.conteudo.includes('processo') || m.conteudo.includes('hash')) {
          console.log("-> TEM LINK AQUI");
        }
      }
    });
  } else {
    console.log("Nao encontrado");
  }
})();
