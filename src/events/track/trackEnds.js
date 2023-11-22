import utils from '../../utils.js'

function trackEnds(Event, payload, node, config, Nodes, Players) {
  const name = payload.type == 'TrackEndEvent' ? 'trackEnd' : (payload.type == 'TrackExceptionEvent' ? 'trackException' : 'trackStuck')

  Event.emit('debug', `[FastLink] ${node} has received a ${name}`)

  const player = Players[payload.guildId]

  if (!player)
    return console.log(`[FastLink] Received ${name} from ${node} but no player was found`)

  if (name != 'trackException' && config.queue && ['replaced', 'loadFailed'].includes(payload.reason)) {
    player.queue.shift()

    if (player.queue.length != 0) {
      utils.makeNodeRequest(Nodes, node, `/v4/sessions/${Nodes[node].sessionId}/players/${payload.guildId}`, {
        body: {
          encodedTrack: player.queue[0]
        },
        method: 'PATCH'
      })
    }
  } else player.track = null

  player.playing = false
  player.volume = null

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