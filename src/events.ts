import ready from './events/ready'
import playerUpdate from './events/playerUpdate'
import stats from './events/stats'
import trackStart from './events/track/trackStart'
import trackEnds from './events/track/trackEnds'
import websocketClosed from './events/track/websocketClosed'

import { ConfigData, ConfigOptions, InternalNodeData, InternalPlayerData, NodeOptions } from '../indexTypes'
import PWSL from './ws'
import Event from 'node:events'

function open(Event: Event, node: string) {
  Event.emit('debug', `[FastLink] Connected to ${node}`)
}

function message(Event: Event, data: string, node: string, config: ConfigData, Nodes: InternalNodeData, Players: InternalPlayerData): { Nodes: InternalNodeData, Players: InternalPlayerData } {
  const payload: any = JSON.parse(data)

  Event.emit('raw', payload)

  switch (payload.op) {
    case 'ready': {
      Nodes = ready(Event, payload, node, Nodes)

      break
    }

    case 'playerUpdate': {
      playerUpdate(Event, payload, node, Nodes)

      break
    }

    case 'stats': {
      Nodes = stats(Event, payload, node, Nodes)

      break
    }

    case 'event': {
      switch (payload.type) {
        case 'TrackStartEvent': {
          Players = trackStart(Event, payload, node, config, Nodes, Players)
        
          break
        }

        case 'TrackEndEvent':
        case 'TrackExceptionEvent':
        case 'TrackStuckEvent': {
          Players = trackEnds(Event, payload, node, config, Nodes, Players)

          break
        }

        case 'WebSocketClosedEvent': {
          Players = websocketClosed(Event, payload, node, Nodes, Players)

          break
        }
      }
    }
  }

  return { Nodes, Players }
}

async function close(Event: Event, ws: PWSL, node: NodeOptions, config: ConfigData, Nodes: InternalNodeData, Players: InternalPlayerData): Promise<{ Nodes: InternalNodeData, Players: InternalPlayerData, ws: PWSL }> {
  Event.emit('debug', `[FastLink] Disconnected from ${node.hostname}`)

  ws.removeAllListeners()

  delete Nodes[node.hostname]

  Object.keys(Players).forEach((key) => {
    if (Players[key].node === node.hostname)
      delete Players[key]
  })

  const index = await import('../index.js')

  setTimeout(() => {
    index.default.node.connectNodes([ node ], config as ConfigOptions)
  }, 5000)

  return { Nodes, Players, ws }
}

function error(Event: Event, err: Error, node: string) {
  Event.emit('debug', `[FastLink] Error from ${node}: ${err}`)
}

export default {
  open,
  message,
  close,
  error
}