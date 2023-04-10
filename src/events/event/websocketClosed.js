function websocketClosed(Event, payload, node, config, Nodes, Players) {
  if (config.debug) console.log(`[FastLink] ${node} has closed a websocket`)

  let player = Players[payload.guildId]

  if (!player) return console.log(`[FastLink] Received WebsocketClosedEvent from ${node} but no player was found`)

  player = null
 
  Event.emit('websocketClosed', { node: Nodes[node], guildId: payload.guildId, payload })
 
  return Players
}

export default websocketClosed