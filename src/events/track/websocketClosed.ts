import { InternalNodeOptions, InternalPlayerOptions } from '../../../index.d'
import { WebsocketClosedData } from './websocketClosed.d'
import Event from 'node:events'

function websocketClosed(Event: Event, payload: any, node: string, Nodes: InternalNodeOptions, Players: InternalPlayerOptions): InternalPlayerOptions {
  Event.emit('debug', `[FastLink] ${node} has received a WebsocketClosed`)

  if (!Players[payload.guildId]) {
    console.log(`[FastLink] Received WebsocketClosed from ${node} but no player was found`)

    return Players
  }

  delete Players[payload.guildId]
 
  Event.emit('websocketClosed', { node: Nodes[node], guildId: payload.guildId as string, payload: payload as WebsocketClosedData })
 
  return Players
}

export default websocketClosed