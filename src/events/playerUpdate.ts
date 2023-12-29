import { InternalNodeData } from '../../indexTypes'
import { PlayerUpdateData } from './playerUpdateTypes'
import Event from 'node:events'

function playerUpdate(Event: Event, payload: any, node: string, Nodes: InternalNodeData): void {
  Event.emit('debug', `[FastLink] ${node} has updated a player`)

  Event.emit('playerUpdate', { node: Nodes[node], payload: payload as PlayerUpdateData })
}

export default playerUpdate