export async function normalizeResponse(res: Response): Promise<{ data: unknown; status: number }> {
  const text = await res.text().catch(() => "");
  let data = {};
  
  try {
    if (text) data = JSON.parse(text);
  } catch {
    data = { detail: text || "Invalid JSON response" };
  }
  
  return { data, status: res.status };
}
