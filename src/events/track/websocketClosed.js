function websocketClosed(Event, payload, node, Nodes, Players) {
  Event.emit('debug', `[FastLink] ${node} has received a WebsocketClosed`)

  if (!Players[payload.guildId]) {
    console.log(`[FastLink] Received WebsocketClosed from ${node} but no player was found`)

    return Players
  }

  delete Players[payload.guildId]
 
  Event.emit('websocketClosed', { node: Nodes[node], guildId: payload.guildId, payload })
 
  return Players
}

export default websocketClosed