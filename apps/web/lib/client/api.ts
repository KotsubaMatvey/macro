export async function postJson(path: string, payload: unknown) {
 // Use the web origin so auth/session cookies remain stable for the Next app.
 const response = await fetch(path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
 let data: any = {}
 try {
 data = await response.json()
 } catch {}
 if (!response.ok) throw new Error(data.detail ?? 'Request failed')
 return data
}
