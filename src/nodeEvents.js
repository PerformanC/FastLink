import ready from './events/ready.js'
import playerUpdate from './events/playerUpdate.js'
import stats from './events/stats.js'
import trackStart from './events/event/trackStart.js'
import trackEnd from './events/event/trackEnd.js'
import trackException from './events/event/trackException.js'
import trackStuck from './events/event/trackStuck.js'
import websocketClosed from './events/event/websocketClosed.js'

function handle(Event, payload, node, config, Nodes, Players) {
  let temp = { Nodes, Players }

  switch (payload.op) {
    case 'ready': {
      temp.Nodes = ready(Event, payload, node, config, Nodes, Players)

      break
    }

    case 'playerUpdate': {
      playerUpdate(Event, payload, node, config, Nodes)

      break
    }

    case 'stats': {
      temp.Nodes = stats(Event, payload, node, config, Nodes, Players)

      break
    }

    case 'event': {
      switch (payload.type) {
        case 'TrackStartEvent': {
          temp.Players = trackStart(Event, payload, node, config, Nodes, Players)
        
          break
        }

        case 'TrackEndEvent': {
          temp.Players = trackEnd(Event, payload, node, config, Nodes, Players)

          break
        }

        case 'TrackExceptionEvent': {
          temp.Players = trackException(Event, payload, node, config, Nodes, Players)

          break
        }

        case 'TrackStuckEvent': {
          temp.Players = trackStuck(Event, payload, node, config, Nodes, Players)

          break
        }

        case 'WebSocketClosedEvent': {
          temp.Players = websocketClosed(Event, payload, node, config, Nodes, Players)

          break
        }
      }
    }
  }

  return temp
}

export default { handle }