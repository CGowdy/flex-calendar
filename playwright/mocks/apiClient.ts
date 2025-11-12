export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

// Minimal stub used only during component tests' build to satisfy imports.
// Component tests should not call real network in CT; e2e covers that.
export async function apiFetch<T>(_path: string, _init: RequestInit = {}): Promise<T> {
  throw new ApiError(501, 'apiFetch is mocked in component tests')
}


