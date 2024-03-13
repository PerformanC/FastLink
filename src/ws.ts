import https from 'node:https'
import http from 'node:http'
import crypto from 'node:crypto'
import EventEmitter from 'node:events'
import { URL } from 'node:url'

import { WebSocketOptions, FrameOptions } from './wsTypes.js'

function parseFrameHeader(buffer: Buffer): FrameOptions {
  let startIndex = 2

  const opcode = buffer[0] & 0b00001111
  const fin = (buffer[0] & 0b10000000) === 0b10000000
  let payloadLength = buffer[1] & 0b01111111

  if (payloadLength === 126) {
    startIndex += 2
    payloadLength = buffer.readUInt16BE(2)
  } else if (payloadLength === 127) {
    const buf = buffer.subarray(startIndex, startIndex + 8)

    payloadLength = buf.readUInt32BE(0) * Math.pow(2, 32) + buf.readUInt32BE(4)
    startIndex += 8
  }

  buffer = buffer.subarray(startIndex, startIndex + payloadLength)

  return {
    opcode,
    fin,
    buffer,
    payloadLength
  }
}

class WebSocket extends EventEmitter {
  private url: string
  private options: WebSocketOptions
  private socket: net.Socket | null
  private continueInfo: {
    type: number,
    buffer: Buffer[]
  }

  constructor(url: string, options: WebSocketOptions) {
    super()

    this.url = url
    this.options = options
    this.socket = null
    this.continueInfo = {
      type: -1,
      buffer: []
    }

    this.connect()

    return this
  }

  connect(): void {
    const parsedUrl: URL = new URL(this.url)
    const isSecure: Boolean = parsedUrl.protocol === 'wss:'
    const agent: typeof https | typeof http = isSecure ? https : http
    const key = crypto.randomBytes(16).toString('base64')

    const request = agent.request((isSecure ? 'https://' : 'http://') + parsedUrl.hostname + parsedUrl.pathname + parsedUrl.search, {
      port: parsedUrl.port || (isSecure ? 443 : 80),
      timeout: this.options.timeout || 0,
      headers: {
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': 13,
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        ...(this.options?.headers || {})
      },
      method: 'GET'
    })

    request.on('error', (err) => {
      this.emit('error', err)
      this.emit('close')
    })

    request.on('upgrade', (res: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
      socket.setNoDelay()
      socket.setKeepAlive(true)

      if (head.length !== 0) socket.unshift(head)

      if (res.headers.upgrade.toLowerCase() !== 'websocket') {
        socket.destroy()

        return;
      }

      const digest = crypto.createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64')

      if (res.headers['sec-websocket-accept'] !== digest) {
        socket.destroy()

        return;
      }

      socket.on('data', (data: Buffer) => {
        const headers = parseFrameHeader(data)

        switch (headers.opcode) {
          case 0x0: {
            this.continueInfo.buffer.push(headers.buffer)

            if (headers.fin) {
              this.emit('message', Buffer.concat(this.continueInfo.buffer).toString())

              this.continueInfo = {
                type: -1,
                buffer: []
              }
            }

            break
          }
          case 0x1:
          case 0x2: {
            if (this.continueInfo.type !== -1 && this.continueInfo.type !== headers.opcode) {
              this.close(1002, 'Invalid continuation frame')
              this.cleanup()

              return;
            }

            if (!headers.fin) {
              this.continueInfo.type = headers.opcode
              this.continueInfo.buffer.push(headers.buffer)
            } else {
              this.emit('message', headers.opcode === 0x1 ? headers.buffer.toString('utf8') : headers.buffer)
            }

            break
          }
          case 0x8: {
            if (headers.buffer.length === 0) {
              this.emit('close', 1006, '')
            } else {
              const code = headers.buffer.readUInt16BE(0)
              const reason = headers.buffer.subarray(2).toString('utf-8')

              this.emit('close', code, reason)
            }

            socket.end()

            break
          }
          case 0x9: {
            const pong = Buffer.allocUnsafe(2)
            pong[0] = 0x8a
            pong[1] = 0x00

            this.socket.write(pong)

            break
          }
          case 0xA: {
            this.emit('pong')
          }
        }

        if (headers.buffer.length > headers.payloadLength)
          this.socket.unshift(headers.buffer)
      })

      socket.on('close', () => this.emit('close'))

      this.socket = socket

      this.emit('open', socket, res.headers)
    })

    request.end()
  }

  cleanup() {
    this.socket.destroy()
    this.socket = null

    this.continueInfo = {
      type: -1,
      buffer: []
    }

    return true
  }

  sendData(data: Buffer, options: any) {
    let payloadStartIndex = 2
    let payloadLength = options.len
    let mask = null

    if (options.mask) {
      mask = Buffer.allocUnsafe(4)

      while ((mask[0] | mask[1] | mask[2] | mask[3]) === 0)
        crypto.randomFillSync(mask, 0, 4)

      payloadStartIndex += 4
    }

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

    if (payloadLength === 126) {
      header.writeUInt16BE(options.len, 2)
    } else if (payloadLength === 127) {
      header[2] = header[3] = 0
      header.writeUIntBE(options.len, 4, 6)
    }

    if (options.mask) {
      header[1] |= 0x80
      header[payloadStartIndex - 4] = mask[0]
      header[payloadStartIndex - 3] = mask[1]
      header[payloadStartIndex - 2] = mask[2]
      header[payloadStartIndex - 1] = mask[3]

      for (let i = 0; i < options.len; i++) {
        data[i] = data[i] ^ mask[i & 3]
      }
    }

    this.socket.write(Buffer.concat([header, data]))

    return true
  }

  close(code?: number, reason?: string) {
    const data = Buffer.allocUnsafe(2 + Buffer.byteLength(reason || 'normal close'))
    data.writeUInt16BE(code || 1000)
    data.write(reason || 'normal close', 2)

    this.sendData(data, { len: data.length, fin: true, opcode: 0x8 })

    return true
  }
}

export default WebSocket