// Thin wrapper around Exa's REST search API. Never throws — callers (the
// agent loop) just want a string back, even if search is unavailable.

interface ExaResult {
  title?: string;
  url?: string;
  text?: string;
  snippet?: string;
}

interface ExaResponse {
  results?: ExaResult[];
}

export async function exaSearch(query: string): Promise<string> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return `Search is unavailable (no EXA_API_KEY configured) for query: "${query}"`;
  }

  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: 3,
        contents: { text: true },
      }),
    });

    if (!res.ok) {
      return `Search is unavailable (Exa API error ${res.status}) for query: "${query}"`;
    }

    const data = (await res.json()) as ExaResponse;
    const results = data.results ?? [];
    if (results.length === 0) {
      return `No search results found for: "${query}"`;
    }

    return results
      .map((r, i) => {
        const title = r.title ?? "(untitled)";
        const url = r.url ?? "";
        const snippet = (r.text ?? r.snippet ?? "").slice(0, 300).replace(/\s+/g, " ").trim();
        return `${i + 1}. ${title} (${url})${snippet ? ` — ${snippet}` : ""}`;
      })
      .join("\n");
  } catch (err) {
    return `Search is unavailable (${String(err)}) for query: "${query}"`;
  }
}
