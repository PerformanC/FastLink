import { InternalNodeData } from '../../indexTypes'
import { ReadyData } from './readyTypes'
import Event from 'node:events'

function ready(Event: Event, payload: any, node: string, Nodes: InternalNodeData): InternalNodeData {
  Nodes[node].sessionId = payload.sessionId
  Nodes[node].connected = true

  Event.emit('debug', `[FastLink] ${node} is ready`)

  Event.emit('ready', { node: Nodes[node], payload: payload as ReadyData })

  return Nodes
}

export default ready