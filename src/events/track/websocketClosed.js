function websocketClosed(Event, payload, node, Nodes, Players) {
  Event.emit('debug', `[FastLink] ${node} has closed a websocket`)

  if (!Players[payload.guildId]) return console.log(`[FastLink] Received WebsocketClosedEvent from ${node} but no player was found`)

  Players[payload.guildId] = null
 
  Event.emit('websocketClosed', { node: Nodes[node], guildId: payload.guildId, payload })
 
  return Players
}

export default websocketClosed