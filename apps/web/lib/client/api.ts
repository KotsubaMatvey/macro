const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').trim().replace(/\/+$/, '')
 
interface JsonBody { 
 detail?: string 
 [key: string]: any 
} 
 
async function parseJson(response: Response) { 
 let raw: unknown = null 
 try { 
  raw = await response.json() 
 } catch (error) { 
  console.error('JSON parse failed', response.url, error) 
  raw = null 
 } 
 let body: JsonBody = {} 
 if (raw) { 
  if (typeof raw === 'object') body = raw as JsonBody 
 } 
 if (!response.ok) { 
  if (typeof body.detail === 'string') throw new Error(body.detail) 
  throw new Error('Request failed: ' + String(response.status)) 
 } 
 if (raw === null) throw new Error('Invalid JSON response') 
 return body 
}

export async function postJson(path: string, payload: unknown) { 
 const options = { 
  method: 'POST', 
  credentials: 'include' as const, 
  headers: { 'Content-Type': 'application/json' }, 
  body: JSON.stringify(payload), 
 } 
 try { 
  const response = await fetch(path, options) 
  if (response.status === 404) { 
   if (path.startsWith('/api/')) { 
    try { 
     const fallback = await fetch(API_URL + path, options) 
     return parseJson(fallback) 
    } catch (error) { 
     console.error('Fallback request failed', path, error) 
     throw new Error('Network request failed') 
    } 
   } 
  } 
  return parseJson(response) 
 } catch (error) { 
  console.error('POST request failed', path, error) 
  if (error instanceof Error) throw error 
  throw new Error('Network request failed') 
 } 
}
