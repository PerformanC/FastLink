function trackStart(Event, payload, node, config, Nodes, Players) {
  Event.emit('debug', `[FastLink] ${node} has started a track`)

  const player = Players[payload.guildId]

  if (!player) {
    console.log(`[FastLink] Received TrackStartEvent from ${node} but no player was found`)

    return Players
  }

  if (!config.queue) player.track = payload.track
  player.playing = true
  player.volume = 100

  Event.emit('trackStart', { node: Nodes[node], guildId: payload.guildId, player, track: payload.track })

  return Players
}

export default trackStart