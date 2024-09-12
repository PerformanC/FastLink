function websocketClosed(Event, payload, node, Nodes, Players) {
  if (!Players[payload.guildId]) {
    Event.emit('debug', `${node} has received a WebsocketClosed but no player was found`)

    return Players
  } else {
    Event.emit('debug', `${node} has received a WebsocketClosed`)
  }

  Players[payload.guildId].playing = false

  Event.emit('websocketClosed', {
    node: Nodes[node],
    guildId: payload.guildId,
    payload
  })
 
  return Players
}

export default websocketClosed