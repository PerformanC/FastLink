import Event from 'node:events'

import { InternalNodeData } from '../../indexTypes.js'
import { StatsData } from './statsTypes.js'

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