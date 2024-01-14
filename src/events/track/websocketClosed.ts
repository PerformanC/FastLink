import Event from 'node:events'

import { InternalNodeData, InternalPlayerData } from '../../../indexTypes.js'
import { WebsocketClosedData } from './websocketClosedTypes.js'

function websocketClosed(Event: Event, payload: any, node: string, Nodes: InternalNodeData, Players: InternalPlayerData): InternalPlayerData {
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