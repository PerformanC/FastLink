function playerUpdate(Event, payload, node, config, Nodes) {
  if (config.debug) console.log(`[FastLink] ${node} has updated a player`)

  Event.emit('playerUpdate', { node: Nodes[node], payload })

  return
}

export default playerUpdate