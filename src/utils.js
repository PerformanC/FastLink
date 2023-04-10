import http from 'http'
import https from 'https'

function makeRequest(url, options) {
  return new Promise((resolve) => {
    let req, data = ''

    options.headers['User-Agent'] = 'FastLink'

    let request = https.request
    if (url.startsWith('http://')) request = http.request

    req = request(url, { port: options.port, method: options.method || 'GET', headers: options.headers }, (res) => {
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          let json = JSON.parse(data)
          resolve(json)
        } catch (err) {
          resolve(data)
        }
      })
    })

    req.on('error', (error) => {
      console.error(error)
      throw new Error('Error while sending a request to Lavalink.')
    })

    if (options.body) req.end(JSON.stringify(options.body))
    else req.end()
  })
}

function forEach(config, obj, callback) {
  if (config.opt == 'performance')
    obj.forEach(callback)
  else {
    for (let i = 0; i < obj.length; i++) {
      callback(obj[i], i)
    }
  }
}

export default {
  makeRequest,
  forEach
}