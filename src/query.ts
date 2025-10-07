import * as client from '@actions/http-client'

export async function queryIndex(
  index: string,
  packageName: string
): Promise<string[] | null> {
  // Return list of versions; null on network / JSON errors.
  const http = new client.HttpClient('pypi-versions-action', [], {
    allowRetries: true,
    maxRetries: 3
  })
  const url = `${index}/${packageName}`
  const headers = { Accept: 'application/vnd.pypi.simple.v1+json' }
  try {
    const resp = await http.get(url, headers)
    if (resp.message.statusCode === 404) {
      return []
    }
    if (resp.message.statusCode && resp.message.statusCode >= 400) {
      throw new Error(
        `${index}: HTTP ${resp.message.statusCode} - treated as unavailable`
      )
    }
    const payload = await resp.readBody()
    const data = JSON.parse(payload)
    const versions: Set<string> = new Set<string>()
    for (const file of data.files) {
      const name: string = file.filename
      let ver = name.replace(`${packageName.replace(/-/g, '_')}-`, '')
      ver = ver.split('-', 3)[0].replace('.tar.gz', '').replace('.zip', '')
      versions.add(ver)
    }
    return new Array(...versions).sort()
  } catch (e: unknown) {
    const eObj = e as Error
    throw new Error(`${index}: ${eObj.message} - treated as unavailable`)
  }
}
