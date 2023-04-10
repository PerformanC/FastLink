function stats(Event, payload, node, config, Nodes) {
  if (config.debug) console.log(`[FastLink] Received stats from ${node}`)

  Nodes[node].stats = {
    cores: payload.cpu.cores,
    systemLoad: payload.cpu.systemLoad
  }

  Event.emit('stats', { node: Nodes[node], payload })

  return Nodes
}

export default stats