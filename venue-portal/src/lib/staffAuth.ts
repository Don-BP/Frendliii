// In-memory only — never persisted to localStorage or sessionStorage.
// Intentional: staff sessions should not survive page reloads.
let _token: string | null = null
let _venueId: string | null = null

export const staffAuth = {
  setSession(token: string, venueId: string) {
    _token = token
    _venueId = venueId
  },
  getToken(): string | null {
    return _token
  },
  getVenueId(): string | null {
    return _venueId
  },
  isAuthenticated(): boolean {
    return _token !== null
  },
  clear() {
    _token = null
    _venueId = null
  },
}

/**
 * Call a Supabase Edge Function as staff.
 * Returns { data } or throws if the response is 401 (session expired).
 * Callers must catch the 'StaffSessionExpired' error and redirect to PIN entry.
 */
export async function staffFetch(
  url: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const token = staffAuth.getToken()
  if (!token) throw new StaffSessionExpiredError()

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (res.status === 401) {
    staffAuth.clear()
    throw new StaffSessionExpiredError()
  }

  return res.json()
}

export class StaffSessionExpiredError extends Error {
  constructor() { super('StaffSessionExpired') }
}
