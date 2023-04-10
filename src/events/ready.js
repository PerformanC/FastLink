function ready(Event, payload, node, config, Nodes) {
  Nodes[node].sessionId = payload.sessionId
  Nodes[node].connected = true

  if (config.debug) console.log(`[FastLink] ${node} is ready`)

  Event.emit('ready', { node: Nodes[node], payload })

  return Nodes
}

export default ready