import ready from './events/ready.js'
import playerUpdate from './events/playerUpdate.js'
import stats from './events/stats.js'
import trackStart from './events/track/trackStart.js'
import trackEnd from './events/track/trackEnd.js'
import trackException from './events/track/trackException.js'
import trackStuck from './events/track/trackStuck.js'
import websocketClosed from './events/track/websocketClosed.js'

function open(Event, node) {
  Event.emit('debug', `[FastLink] Connected to ${node}`)
}

function message(Event, data, node, config, Nodes, Players) {
  const payload = JSON.parse(data)

  Event.emit('raw', payload)

  switch (payload.op) {
    case 'ready': {
      Nodes = ready(Event, payload, node, Nodes, Players)

      break
    }

    case 'playerUpdate': {
      playerUpdate(Event, payload, node, Nodes)

      break
    }

    case 'stats': {
      Nodes = stats(Event, payload, node, Nodes, Players)

      break
    }

    case 'event': {
      switch (payload.type) {
        case 'TrackStartEvent': {
          Players = trackStart(Event, payload, node, config, Nodes, Players)
        
          break
        }

        case 'TrackEndEvent': {
          Players = trackEnd(Event, payload, node, config, Nodes, Players)

          break
        }

        case 'TrackExceptionEvent': {
          Players = trackException(Event, payload, node, config, Nodes, Players)

          break
        }

        case 'TrackStuckEvent': {
          Players = trackStuck(Event, payload, node, config, Nodes, Players)

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

async function close(Event, ws, node, config, Nodes, Players) {
  Event.emit('debug', `[FastLink] Disconnected from ${node.hostname}`)

  ws.removeAllListeners()

  Nodes[node.hostname] = null

  Object.keys(Players).forEach((key) => {
    if (Players[key].node == node.hostname)
      delete Players[key]
  })

  const index = await import('../index.js')

  setTimeout(() => {
    index.default.node.connectNodes([ node ], config)
  }, 5000)

  return { Nodes, Players, ws }
}

function error(Event, err, node) {
  Event.emit('debug', `[FastLink] Error from ${node}: ${err}`)
}

export default {
  open,
  message,
  close,
  error
}