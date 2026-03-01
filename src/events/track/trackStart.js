function trackStart(Event, payload, node, config, Nodes, Players) {
  const player = Players[payload.guildId]

  if (!player) {
    Event.emit('debug', `${node} has started a track but no player was found`)

    return Players
  } else {
    Event.emit('debug', `${node} has started a track`)
  }

  if (!config.queue) player.track = payload.track
  player.playing = true

  Event.emit('trackStart', {
    node: Nodes[node],
    guildId: payload.guildId,
    player,
    track: payload.track
  })

  return Players
}

export default trackStart