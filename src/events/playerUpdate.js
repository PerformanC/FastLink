function playerUpdate(Event, payload, node, Nodes) {
  Event.emit('debug', `[FastLink] ${node} has updated a player`)

  Event.emit('playerUpdate', { node: Nodes[node], payload })

  return;
}

export default playerUpdate