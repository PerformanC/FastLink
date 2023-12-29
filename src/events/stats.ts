import { InternalNodeData } from '../../indexTypes'
import { StatsData } from './statsTypes'
import Event from 'node:events'

function stats(Event: Event, payload: any, node: string, Nodes: InternalNodeData): InternalNodeData {
  Event.emit('debug', `[FastLink] Received stats from ${node}`)

  Nodes[node].stats = {
    cores: payload.cpu.cores,
    systemLoad: payload.cpu.systemLoad
  }

  Event.emit('stats', { node: Nodes[node], payload: payload as StatsData })

  return Nodes
}

export default stats