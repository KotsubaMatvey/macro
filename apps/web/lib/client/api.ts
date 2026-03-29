const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function postJson(path: string, payload: unknown) {
  const response = await fetch(API_URL + path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  let data: any = {}
  try {
    data = await response.json()
  } catch {}
  if (!response.ok) throw new Error(data.detail ?? 'Request failed')
  return data
}
