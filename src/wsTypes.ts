import http from 'node:http'

export type WebSocketOptions = {
  headers?: http.OutgoingHttpHeaders | undefined,
  timeout?: number
}

export type FrameOptions = {
  opcode: number,
  fin: boolean,
  buffer: Buffer,
  payloadLength: number
}
