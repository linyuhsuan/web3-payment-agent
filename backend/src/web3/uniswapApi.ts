const UNISWAP_API_BASE = "https://trade-api.gateway.uniswap.org/v1";

function buildHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.UNISWAP_API_KEY) h["x-api-key"] = process.env.UNISWAP_API_KEY;
  return h;
}

export async function uniswapPost(path: "/quote" | "/swap", body: unknown): Promise<unknown> {
  const res = await fetch(`${UNISWAP_API_BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(text), { status: res.status, body: text });
  }
  return res.json();
}
