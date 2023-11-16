import utils from '../../utils.js'

function trackEnd(Event, payload, node, config, Nodes, Players) {
  Event.emit('debug', `[FastLink] ${node} has ended a track`)

  const player = Players[payload.guildId]

  if (!player) return console.log(`[FastLink] Received TrackEndEvent from ${node} but no player was found`)

  if (config.queue && payload.reason != 'replaced') {
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

  Event.emit('trackEnd', { node: Nodes[node], guildId: payload.guildId, player, track: payload.track  })

  return Players
}

export default trackEnd