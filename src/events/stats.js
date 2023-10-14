function stats(Event, payload, node, Nodes) {
  Event.emit('debug', `[FastLink] Received stats from ${node}`)

  Nodes[node].stats = {
    cores: payload.cpu.cores,
    systemLoad: payload.cpu.systemLoad
  }

  Event.emit('stats', { node: Nodes[node], payload })

  return Nodes
}

export default stats