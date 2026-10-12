// The JSON body of an API answer, or an Error with the server's `detail` text.
export async function answer<T>(response: Response, what: string): Promise<T> {
  if (!response.ok) {
    let detail = `${what} failed: ${response.status}`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      // not JSON: keep the status text
    }
    throw new Error(detail)
  }
  return response.json()
}
