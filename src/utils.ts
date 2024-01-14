import http, { IncomingMessage } from 'node:http'
import https from 'node:https'
import zlib from 'node:zlib'

import { InternalNodeData } from '../indexTypes'
import { RequestOptions } from './utilsTypes'

async function makeNodeRequest(Nodes: InternalNodeData, node: string, endpoint: string, options: RequestOptions): Promise<any> {
  return new Promise(async (resolve) => {
    let data = ''

    const agent = Nodes[node].secure ? https : http
    const req: http.ClientRequest = agent.request(`http${Nodes[node].secure ? 's' : ''}://${Nodes[node].hostname}${endpoint}`, {
      method: options.method,
      headers: {
        'Accept-Encoding': 'br, gzip, deflate',
        'User-Agent': 'FastLink.ts',
        'Content-Type': 'application/json',
        'Authorization': Nodes[node].password,
      },
      port: Nodes[node].port || (Nodes[node].secure ? 443 : 80),
    }, (res: IncomingMessage) => {
      const headers = res.headers
      let connection: zlib.Inflate | zlib.BrotliDecompress | zlib.Gunzip | IncomingMessage | null = null

      switch (headers['content-encoding']) {
        case 'deflate': {
          connection = zlib.createInflate()
          break
        }
        case 'br': {
          connection = zlib.createBrotliDecompress()
          break
        }
        case 'gzip': {
          connection = zlib.createGunzip()
          break
        }
      }

      if (connection) {
        res.pipe(connection as zlib.Inflate | zlib.BrotliDecompress | zlib.Gunzip)
      } else {
        connection = res
      }

      connection.on('data', (chunk) => (data += chunk))

      connection.on('end', () => {
        if (headers['content-type'] === 'application/json')
          resolve(JSON.parse(data))
        else
          resolve(data)
      })
    })

    req.on('error', (error: Error) => {
      console.log(`[FastLink] Failed sending HTTP request: ${error}`)
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