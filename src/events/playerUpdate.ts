import { InternalNodeOptions } from '../../index.d'
import { PlayerUpdateData } from './playerUpdate.d'
import Event from 'events'

function playerUpdate(Event: Event, payload: any, node: string, Nodes: InternalNodeOptions): void {
  Event.emit('debug', `[FastLink] ${node} has updated a player`)

  Event.emit('playerUpdate', { node: Nodes[node], payload: payload as PlayerUpdateData })
}

export default playerUpdate