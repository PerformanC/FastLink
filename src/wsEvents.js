import nodeEvents from './nodeEvents.js'

import WebSocket from 'ws'

function open(node, config, Nodes) {
  if (config.debug) console.log(`[FastLink] Connected to ${node}`)

  return Nodes
}

function message(Event, data, node, config, Nodes, Players) {
  const payload = JSON.parse(data)

  Event.emit('raw', payload)

  return nodeEvents.handle(Event, payload, node, config, Nodes, Players)
}

function close(Event, ws, node, config, Nodes, Players) {
  if (config.debug) console.log(`[FastLink] Disconnected from ${node.hostname}`)

  Nodes[node.hostname].connected = false

  setTimeout(() => {
    ws = new WebSocket(`ws${node.secure ? 's' : ''}://${node.hostname}:${node.port}/v4/websocket`, {
      headers: {
        Authorization: node.password,
        'Num-Shards': config.shards,
        'User-Id': config.botId,
        'Client-Name': 'PerformanC-FastLink'
      }
    })
  }, 5000)

  return { Nodes, Players, ws }
}

function error(err, node, config, Nodes) {
  if (config.debug) console.log(`[FastLink] Error from ${node}: ${err}`)

  return Nodes
}

export default {
  open,
  message,
  close,
  error
}