function playerUpdate(Event, payload, node, Nodes) {
  Event.emit('debug', `${node} has updated a player state`)

  Event.emit('playerUpdate', {
    node: Nodes[node],
    payload
  })

  return;
}

export default playerUpdate