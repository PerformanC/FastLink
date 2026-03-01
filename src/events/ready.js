function ready(Event, payload, node, Nodes) {
  Event.emit('debug', `${node} is ready`)

  Nodes[node].sessionId = payload.sessionId
  Nodes[node].connected = true

  Event.emit('ready', { node: Nodes[node], payload })

  return Nodes
}

export default ready