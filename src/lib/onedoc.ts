"use server";

export async function get1DocProcesses() {
  const baseUrl = process.env.ONEDOC_BASE_URL;
  const apiKey = process.env.ONEDOC_API_KEY;

  if (!baseUrl || !apiKey) {
    console.warn("Chaves da 1Doc não configuradas no .env.local.");
    return [];
  }

  try {
    const response = await fetch(`${baseUrl}/processos-administrativos`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Desabilita o cache agressivo para garantir leitura em tempo real
      cache: "no-store", 
    });

    if (!response.ok) {
      console.error(`Erro na API 1Doc: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    // Assumindo que a resposta venha em 'data' ou seja o próprio array.
    // O mapeamento exato dos campos deve ser alinhado com o payload real da 1Doc.
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("Erro ao conectar com a API 1Doc:", error);
    return [];
  }
}

export async function get1DocProcessDetails(id: string) {
  const baseUrl = process.env.ONEDOC_BASE_URL;
  const apiKey = process.env.ONEDOC_API_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/processos-administrativos/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store", 
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data || data || null;
  } catch (error) {
    console.error("Erro ao buscar detalhes no 1Doc:", error);
    return null;
  }
}
