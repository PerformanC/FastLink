function trackStuck(Event, payload, node, config, Nodes, Players) {
  Event.emit('debug', `[FastLink] ${node} has received a track stuck event`)

  const player = Players[payload.guildId]

  if (!player) return console.log(`[FastLink] Received TrackStuckEvent from ${node} but no player was found`)

  if (config.queue) player.queue = []
  else player.track = null
  player.playing = false
  player.volume = null

  Event.emit('trackStuck', { node: Nodes[node], guildId: payload.guildId, player, track: payload.track })

  return Players
}

export default trackStuck