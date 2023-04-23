import http from 'http'
import https from 'https'
import zlib from 'zlib'

function makeRequest(url, options) {
  return new Promise(async (resolve, reject) => {
    let compression, data = ''

    let agent = https.request
    if (url.startsWith('http://')) agent = http.request

    const req = agent(url, {
      method: options.method,
      headers: {
        'Accept-Encoding': 'br, gzip, deflate',
        'User-Agent': 'FastLink',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      if (options.retrieveHeaders) {
        req.destroy()

        return resolve(res.headers)
      }

      switch (res.headers['content-encoding']) {
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

      res.on('end', () => resolve(JSON.parse(data.toString())))
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
  makeRequest
}