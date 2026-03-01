import utils from '../../utils.js'

function trackEnds(Event, payload, node, config, Nodes, Players) {
  const name = payload.type === 'TrackEndEvent' ? 'trackEnd' : (payload.type === 'TrackExceptionEvent' ? 'trackException' : 'trackStuck')

  const player = Players[payload.guildId]

  if (!player) {
    Event.emit('debug', `Received ${name} from ${node} but no player was found`)

    return Players
  } else {
    Event.emit('debug', `${node} has received a ${name}`)
  }

  if (config.queue && name !== 'trackException' && [ 'finished', 'loadFailed' ].includes(payload.reason)) {
    switch (player.loop) {
      case 'track': {
        /* INFO: avoid removing current track from queue */

        break
      }
      case 'queue': {
        player.queue.push(player.queue.shift())

        break
      }
      default: {
        player.queue.shift()

        break
      }
    }

    if (player.queue.length !== 0) {
      utils.makeNodeRequest(Nodes, node, `/v4/sessions/${Nodes[node].sessionId}/players/${payload.guildId}`, {
        body: {
          track: {
            encoded: player.queue[0]
          }
        },
        method: 'PATCH'
      })
    }
  } else player.track = null

  player.playing = false

  Event.emit(name, {
    node: Nodes[node],
    guildId: payload.guildId,
    player,
    track: payload.track,
    reason: payload.reason,
    exception: payload.exception,
    thresholdMs: payload.thresholdMs
  })

  return Players
}

export default trackEnds