export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '/api'

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers ?? {})

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(resolveUrl(path), {
    ...init,
    headers,
  })

  if (!response.ok) {
    let details: unknown
    try {
      details = await response.json()
    } catch {
      details = await response.text()
    }

    throw new ApiError(
      response.status,
      response.statusText || 'Request failed',
      details
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

