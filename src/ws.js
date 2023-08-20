import net from 'node:net'
import { URL } from 'node:url'
import crypto from 'node:crypto'
import EventEmitter from 'node:events'
import { constants } from 'node:buffer'

class WebSocket extends EventEmitter {
  constructor(url, options) {
    super()

    this.url = url
    this.options = options
    this.socket = null

    this.connect()

    return this
  }

  send(data) {
    const frame = createFrame(data)

    this.events.emit('send', frame)

    this.events.socket.write(frame)
  }

  connect() {
    const parsedUrl = new URL(this.url)
    const agent = parsedUrl.protocol === 'wss:' ? tls : net
    
    this.socket = agent.connect({
      host: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'wss:' ? 443 : 80)
    })

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
  
    this.socket.on('connect', () => {
      this.socket.write(headers.join('\r\n') + '\r\n\r\n')
  
      this.emit('connect', this.socket)
    })
  
    this.socket.on('data', (data) => {
      console.log(`[PWS] Received data from ${parsedUrl.hostname}`)
  
      const response = data.toString().split('\r\n')

      if (response[0].startsWith('HTTP/1.1')) {
        const parsedResponse = response[0].split(' ')
        const statusCode = Number(parsedResponse[1])
        const statusMessage = parsedResponse[2]

        if (statusCode >= 400 || statusCode >= 500) {
          this.emit('error', new Error(`${statusCode} ${statusMessage}`))
  
          return;
        }

        if (statusCode == 101) {
          const message = response[response.length - 1]

          if (message != '') {
            const frameHeader = parseFrameHeader(message)
  
            this.emit('error', new Error(message.slice(frameHeader.payloadStartIndex)))
    
            return;
          }
  
          this.emit('open', this.socket)
    
          return;
        }
      }

      const frameHeader = parseFrameHeader(data)
      const payload = data.slice(frameHeader.payloadStartIndex)
  
      this.emit('message', payload)
    })
  
    this.socket.on('close', () => this.emit('close', this.socket))

    this.socket.on('end', () => this.emit('close', this.socket))
  
    this.socket.on('error', (error) => this.emit('error', error))

    this.socket.on('timeout', () => this.emit('timeout', this.socket))
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

    const target = Buffer.allocUnsafe(payloadStartIndex)

    target[0] = options.fin ? options.opcode | 0x80 : options.opcode
    target[1] = payloadLength

    if (payloadLength == 126) {
      target.writeUInt16BE(options.len, 2)
    } else if (payloadLength == 127) {
      target[2] = target[3] = 0
      target.writeUIntBE(options.len, 4, 6)
    }

    if (!this.socket.write(Buffer.concat([target, data]))) {
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