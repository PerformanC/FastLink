function ready(Event, payload, node, Nodes) {
  Nodes[node].sessionId = payload.session_id
  Nodes[node].connected = true

  Event.emit('debug', `[FastLink] ${node} is ready`)

  Event.emit('ready', { node: Nodes[node], payload })

  return Nodes
}

export default ready