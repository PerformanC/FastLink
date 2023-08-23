import net from 'node:net'
import tls from 'node:tls'
import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'
import EventEmitter from 'node:events'
import { URL } from 'node:url'

class WebSocket extends EventEmitter {
  constructor(url, options) {
    super()

    this.url = url
    this.options = options
    this.socket = null

    this.connect()

    return this
  }

  connect() {
    const parsedUrl = new URL(this.url)
    const isSecure = parsedUrl.protocol === 'wss:'
    const agent = isSecure ? https : http

    this.socket = agent.request((isSecure ? 'https://' : 'http://') + parsedUrl.hostname + parsedUrl.pathname, {
      port: parsedUrl.port || (isSecure ? 443 : 80),
      timeout: this.options.timeout || 5000,
      createConnection: (options) => {
        if (isSecure) {
          options.path = undefined

          if (!options.servername && options.servername != '')
            options.servername = net.isIP(options.host) ? '' : options.host

          return tls.connect(options)
        } else {
          options.path = options.socketPath

          return net.connect(options)
        }
      },
      headers: {
        'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
        'Sec-WebSocket-Version': 13,
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        ...(this.options.headers || {})
      },
      method: 'GET'
    })

    this.socket.on('error', (err) => {
      this.emit('error', err)
    })

    this.socket.on('upgrade', (res, socket, head) => {
      if (res.statusCode != 101) {
        this.emit('error', new Error(`${res.statusCode} ${res.statusMessage}`))

        return;
      }
      
      socket.on('data', (data) => {
        const frameHeader = parseFrameHeader(data)
        const payload = data.subarray(frameHeader.payloadStartIndex)

        this.emit('message', payload.toString())
      })

      socket.on('error', (err) => {
        console.error('WebSocket error:', err);
        this.emit('error', err);
      })

      this.emit('open', socket)
    })

    this.socket.on('socket', (req) => {
      req.on('close', () => this.emit('close'))

      req.on('end', () => this.emit('end'))
    
      req.on('timeout', () => this.emit('timeout'))

      req.on(isSecure ? 'secureConnect' : 'connect', () => {
        const headers = [
          `GET ${parsedUrl.pathname}${parsedUrl.search} HTTP/1.1`,
          `Host: ${parsedUrl.host}`,
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}`,
          'Sec-WebSocket-Version: 13'
        ]

        if (this.options.headers) {
          Object.keys(this.options.headers).forEach((key) => {
            headers.push(`${key}: ${this.options.headers[key]}`)
          })
        }

        req.write(headers.join('\r\n') + '\r\n\r\n')
      })
    })
  }

  sendFrame(data, options) {
    let payloadStartIndex = 2
    let payloadLength = options.len

    if (options.len >= 65536) {
      payloadStartIndex += 8
      payloadLength = 127
    } else if (options.len > 125) {
      payloadStartIndex += 2
      payloadLength = 126
    }

    const header = Buffer.allocUnsafe(payloadStartIndex)
    header[0] = options.fin ? options.opcode | 0x80 : options.opcode
    header[1] = payloadLength

    if (payloadLength == 126) {
      header.writeUInt16BE(options.len, 2)
    } else if (payloadLength == 127) {
      header[2] = header[3] = 0
      header.writeUIntBE(options.len, 4, 6)
    }

    if (!this.socket.write(Buffer.concat([header, data]))) {
      this.socket.end()

      return false
    }

    return true
  }

  close() {
    if (this.socket.destroyed || !this.socket.writable) return false

    this.sendFrame(Buffer.alloc(0), { len: 0, fin: true, opcode: 0x08 })

    this.socket.end()

    this.emit('close', this.socket)

    return true
  }
}

function parseFrameHeader(data) {
  const fin = !!(data[0] & 0b10000000)
  let payloadStartIndex = 2

  const opcode = data[0] & 0b00001111

  if (opcode == 0x0) payloadStartIndex += 2

  const isMasked = !!(data[1] & 0b10000000)
  let payloadLength = data[1] & 0b01111111

  if (payloadLength == 126) {
    payloadStartIndex += 2
    payloadLength = data.readUInt16BE(2)
  } else if (payloadLength == 127) {
    payloadStartIndex += 8
    payloadLength = data.readBigUInt64BE(2)
  }

  let maskingKey = null

  if (isMasked) {
    maskingKey = data.slice(payloadStartIndex, payloadStartIndex + 4)
    payloadStartIndex += 4
  }

  return {
    fin,
    opcode,
    payloadLength,
    isMasked,
    maskingKey,
    payloadStartIndex
  }
}

export default WebSocket