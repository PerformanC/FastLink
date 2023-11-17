import { EventEmitter } from 'node:events'
import net from 'node:net'
import http from 'node:http'

export type WebSocketOptions = {
  headers?: http.OutgoingHttpHeaders | undefined,
  timeout?: number
}

export type FrameOptions = {
  fin: boolean,
  opcode: number,
  len: number
}

export class WebSocket extends EventEmitter {
  private url: string
  private options: WebSocketOptions
  private socket: net.Socket | null

  connect(): void

  sendFrame(data: Uint8Array, options: FrameOptions): boolean

  close(code?: number, reason?: string): boolean
}