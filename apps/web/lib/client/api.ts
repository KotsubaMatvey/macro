const API_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:8000'

export async function postJson<T = { [key: string]: any }>(path: string, payload: unknown): Promise<T> {
 const response = await fetch(API_URL + path, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
 const body = await response.json().catch(function () { return null }) as ({ detail?: string } & T) | null
 if (!response.ok) throw new Error(body && body.detail ? body.detail : 'Request failed')
 return (body ? body : ({} as T)) as T
}
