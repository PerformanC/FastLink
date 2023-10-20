import http from 'http'
import https from 'https'
import zlib from 'zlib'

async function makeNodeRequest(Nodes, node, endpoint, options) {
  return new Promise(async (resolve, reject) => {
    let data = ''

    const agent = Nodes[node].secure ? https : http
    const req = agent.request(`http${Nodes[node].secure ? 's' : ''}://${Nodes[node].hostname}${endpoint}`, {
      method: options.method,
      headers: {
        'Accept-Encoding': 'br, gzip, deflate',
        'User-Agent': 'FastLink',
        'Content-Type': 'application/json',
        'Authorization': Nodes[node].password,
      },
      port: Nodes[node].port || (Nodes[node].secure ? 443 : 80),
    }, (res) => {
      const headers = res.headers
      let compression;

      if (options.retrieveHeaders) {
        req.destroy()

        return resolve(headers)
      }

      switch (headers['content-encoding']) {
        case 'deflate': {
          compression = zlib.createInflate()
          break
        }
        case 'br': {
          compression = zlib.createBrotliDecompress()
          break
        }
        case 'gzip': {
          compression = zlib.createGunzip()
          break
        }
      }

      if (compression) {
        res.pipe(compression)
        res = compression
      }

      res.on('data', (chunk) => (data += chunk))

      res.on('end', () => {
        if (headers['content-type'] == 'application/json')
          resolve(JSON.parse(data))
        else
          resolve(data)
      })
    })

    req.on('error', (error) => {
      console.log(`[FastLink] Failed sending HTTP request: ${error}`)

      reject()
    })

    if (options.body) {
      req.write(JSON.stringify(options.body), () => {
        req.end()
      })
    } else req.end()
  })
}

export default {
  makeNodeRequest
}