import { InternalNodeOptions } from '../../index.d'
import { ReadyData } from './ready.d'
import Event from 'node:events'

function ready(Event: Event, payload: any, node: string, Nodes: InternalNodeOptions): InternalNodeOptions {
  Nodes[node].sessionId = payload.sessionId
  Nodes[node].connected = true

  Event.emit('debug', `[FastLink] ${node} is ready`)

  Event.emit('ready', { node: Nodes[node], payload: payload as ReadyData })

  return Nodes
}

export default ready