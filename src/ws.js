import net from 'node:net'
import { URL } from 'node:url'
import crypto from 'node:crypto'
import EventEmitter from 'node:events'

class WebSocket extends EventEmitter {
  constructor(url, options) {
    super()

    this.url = url
    this.options = options

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
    
    const socket = agent.connect({
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
  
    socket.on('connect', () => {
      socket.write(headers.join('\r\n') + '\r\n\r\n')
  
      this.emit('connect', socket)
    })
  
    socket.on('data', (data) => {
      console.log(`[PWS] Received data from ${parsedUrl.hostname}`)
  
      const response = data.toString().split('\r\n')
  
      if (response[0] == 'HTTP/1.1 101 Switching Protocols') {
        const message = response[response.length - 1]

        if (message != '') {
          const frameHeader = parseFrameHeader(message)

          this.emit('error', new Error(message.slice(frameHeader.payloadStartIndex)))
  
          return;
        }

        this.emit('open', socket)
  
        return;
      }
  
      if (response[0] == 'HTTP/1.1 400 Bad Request') {
        this.emit('error', new Error('Bad request'))
  
        return;
      }
  
      const frameHeader = parseFrameHeader(data)
      const payload = data.slice(frameHeader.payloadStartIndex)
  
      this.emit('message', payload)
    })
  
    socket.on('close', () => this.emit('close', socket))
  
    socket.on('error', (error) => this.emit('error', error))

    socket.on('timeout', () => this.emit('timeout', socket))
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