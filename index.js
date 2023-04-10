import event from 'events'

import wsEvents from './src/wsEvents.js'
import utils from './src/utils.js'

import WebSocket from 'ws'

let Config = {}
let Nodes = {}
let Players = {}
let sessionIds = {}

const Event = new event()

function connectNodes(nodes, config) {
  if (!nodes) throw new Error('No nodes provided.')
  if (typeof nodes != 'object') throw new Error('Nodes must be an array.')

  if (!config) throw new Error('No config provided.')
  if (typeof config != 'object') throw new Error('Config must be an object.')

  if (!config.debug) throw new Error('No debug provided.')
  if (typeof config.debug != 'boolean') throw new Error('Debug must be a boolean.')

  if (!config.botId) throw new Error('No botId provided.')
  if (typeof config.botId != 'string') throw new Error('BotId must be a string.')

  if (!config.shards) throw new Error('No shards provided.')
  if (typeof config.shards != 'number') throw new Error('Shards must be a number.')

  if (config.queue)
    if (typeof config.queue != 'boolean') throw new Error('Queue must be a boolean.')

  Config = {
    botId: config.botId,
    shards: config.shards,
    queue: config.queue || false
  }

  utils.forEach(config, nodes, (node) => {
    if (!node.hostname) throw new Error('No hostname provided.')
    if (typeof node.hostname != 'string') throw new Error('Hostname must be a string.')

    if (!node.password) throw new Error('No password provided.')
    if (typeof node.password != 'string') throw new Error('Password must be a string.')

    if (typeof node.secure != 'boolean') throw new Error('Secure must be a boolean.')

    if (!node.port) node.port = node.secure ? 443 : 2333

    Nodes[node.hostname] = {
      ...node,
      connected: false,
      sessionId: null
    }

    let ws = new WebSocket(`ws${node.secure ? 's' : ''}://${node.hostname}:${node.port}/v4/websocket`, {
      headers: {
        Authorization: node.password,
        'Num-Shards': config.shards,
        'User-Id': config.botId,
        'Client-Name': 'FastLink'
      }
    })

    ws.on('open', () => Nodes = wsEvents.open(node.hostname, config, Nodes))

    ws.on('message', (data) => {
      let temp = wsEvents.message(Event, data, node.hostname, config, Nodes, Players)
      Nodes = temp.Nodes
      Players = temp.Players
    })

    ws.on('close', () => {
      let temp = wsEvents.close(Event, ws, node, config, Nodes, Players)
      Nodes = temp.Nodes
      Players = temp.Players
      ws = temp.ws
    })

    ws.on('error', (err) => Nodes = wsEvents.error(err, node.hostname, config, Nodes))
  })

  return Event
}

function getRecommendedNode() {
  let node = Object.values(Nodes).filter((node) => node.connected).sort((a, b) => (a.stats.systemLoad / a.stats.cores) * 100 - (b.stats.systemLoad / b.stats.cores) * 100)[0]

  if (!node) throw new Error('No nodes connected.')

  return node
}

function createPlayer(guildId) {
  if (!guildId) throw new Error('No guildId provided.')
  if (typeof guildId != 'string') throw new Error('GuildId must be a string.')

  if (Players[guildId]) return Players[guildId].node

  const node = getRecommendedNode().hostname

  Players[guildId] = {
    playing: false,
    volume: null,
    node,
  }

  if (Config.queue) Players[guildId].queue = []
  else Players[guildId].track = null

  return node
}

function getPlayer(guildId) {
  if (!guildId) throw new Error('No guildId provided.')
  if (typeof guildId != 'string') throw new Error('GuildId must be a string.')

  if (!Players[guildId]) return null

  return Players[guildId].node
}

class Player {
  constructor(node, guildId) {
    if (!node) throw new Error('No node provided.')
    if (typeof node != 'string') throw new Error('Node must be a string.')
  
    console.log('abc', node, Nodes)
    if (!Nodes[node]) throw new Error('Node does not exist.')
  
    if (!guildId) throw new Error('No guildId provided.')
    if (typeof guildId != 'string') throw new Error('GuildId must be a string.')

    this.node = node
    this.guildId = guildId
  }

  connect(voiceId, sendPayload) {  
    if (!voiceId) throw new Error('No voiceId provided.')
    if (typeof voiceId != 'string') throw new Error('VoiceId must be a string.')
  
    if (!sendPayload) throw new Error('No sendPayload provided.')
    if (typeof sendPayload != 'function') throw new Error('SendPayload must be a function.')
  
    sendPayload(this.guildId, {
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: voiceId,
        self_mute: false,
        self_deaf: false
      }
    })
  }

  async loadTrack(search) {  
    if (!search) throw new Error('No search provided.')
    if (typeof search != 'string') throw new Error('Search must be a string.')
  
    const data = await utils.makeRequest(`http${Nodes[this.node].secure ? 's' : ''}://${Nodes[this.node].hostname}:${Nodes[this.node].port}/v4/loadtracks?identifier=${encodeURI(search)}`, {
      headers: {
        Authorization: Nodes[this.node].password
      },
      port: Nodes[this.node].port,
      method: 'GET'
    })
  
    return data
  }

  async update(body, noReplace) {  
    if (!body) throw new Error('No body provided.')
    if (typeof body != 'object') throw new Error('Body must be an object.')
  
    if (body.encodedTrack && Config.queue) {
      if (Players[this.guildId].queue.length == 0)
        Players[this.guildId].queue = [ body.encodedTrack ]
      else {
        Players[this.guildId].queue.push(body.encodedTrack)
  
        return;
      }
    } else if (body.encodedTrack !== undefined) {
      Players[this.guildId].queue = []
    }
  
    if (body.encodedTracks) {
      if (!Config.queue) throw new Error('Queue is disabled. (Config.queue = false)')
  
      if (Players[this.guildId].queue.length == 0) {
        Players[this.guildId].queue = body.encodedTracks
  
        utils.makeRequest(`http${Nodes[this.node].secure ? 's' : ''}://${Nodes[this.node].hostname}:${Nodes[this.node].port}/v4/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
          headers: {
            Authorization: Nodes[this.node].password
          },
          body: { encodedTrack: body.encodedTracks[0] },
          port: Nodes[this.node].port,
          method: 'PATCH'
        })
      } else utils.forEach(Config, body.encodedTracks, (track) => Players[this.guildId].queue.push(track))
  
      return;
    }
  
    utils.makeRequest(`http${Nodes[this.node].secure ? 's' : ''}://${Nodes[this.node].hostname}:${Nodes[this.node].port}/v4/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}?noReplace=${noReplace !== true ? false : true}`, {
      headers: {
        Authorization: Nodes[this.node].password
      },
      body,
      port: Nodes[this.node].port,
      method: 'PATCH'
    })
  }

  destroy() {  
    Nodes[this.node].players[this.guildId] = null
  
    utils.makeRequest(`http${Nodes[this.node].secure ? 's' : ''}://${Nodes[this.node].hostname}:${Nodes[this.node].port}/v4/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
      headers: {
        Authorization: Nodes[this.node].password
      },
      port: Nodes[this.node].port,
      method: 'DELETE'
    })
  }

  updateSession(data) {  
    if (!data) throw new Error('No data provided.')
    if (typeof data != 'object') throw new Error('Data must be an object.')
  
    utils.makeRequest(`http${Nodes[this.node].secure ? 's' : ''}://${Nodes[this.node].hostname}:${Nodes[this.node].port}/v4/sessions/${Nodes[this.node].sessionId}`, {
      headers: {
        Authorization: Nodes[this.node].password
      },
      body: data,
      port: Nodes[this.node].port,
      method: 'PATCH'
    })
  }

  getQueue() {  
    if (!Config.queue) throw new Error('Queue is disabled. (Config.queue = false)')
  
    return Players[this.guildId].queue
  }

  skipTrack() {  
    if (!Config.queue) throw new Error('Queue is disabled. (Config.queue = false)')
  
    if (Players[this.guildId].queue.length > 0) {
      Players[this.guildId].queue.shift()
  
      this.updatePlayer({ encodedTrack: Players[this.guildId].queue[0] })
  
      return { skipped: true, queue: Players[this.guildId].queue, track: Players[this.guildId].queue[0] }
    }
  
    return { skipped: false, queue: [], track: null, error: 'No tracks in queue.' }
  }

  async decodeTrack(track) {  
    if (!track) throw new Error('No track provided.')
    if (typeof track != 'string') throw new Error('Track must be a string.')
  
    const data = await utils.makeRequest(`http${Nodes[this.node].secure ? 's' : ''}://${Nodes[this.node].hostname}:${Nodes[this.node].port}/v4/decodetrack?encodedTrack=${track}`, {
      headers: {
        Authorization: Nodes[this.node].password
      },
      port: Nodes[this.node].port,
      method: 'GET'
    })
  
    return data
  }
  
  async decodeTracks(tracks) {  
    if (!tracks) throw new Error('No tracks provided.')
    if (typeof tracks != 'object') throw new Error('Tracks must be an array.')
  
    const data = await utils.makeRequest(`http${Nodes[this.node].secure ? 's' : ''}://${Nodes[this.node].hostname}:${Nodes[this.node].port}/v4/decodetracks`, {
      headers: {
        Authorization: Nodes[this.node].password
      },
      body: tracks,
      port: Nodes[this.node].port,
      method: 'POST'
    })
  
    return data
  }
}

async function getPlayers(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node != 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  const data = await utils.makeRequest(`http${Nodes[node].secure ? 's' : ''}://${Nodes[node].hostname}:${Nodes[node].port}/v4/sessions/${Nodes[node].sessionId}/players`,{
    headers: {
      Authorization: Nodes[node].password
    },
    port: Nodes[node].port,
    method: 'GET'
  })

  return data
}

async function getInfo(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node != 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  const data = await utils.makeRequest(`http${Nodes[node].secure ? 's' : ''}://${Nodes[node].hostname}:${Nodes[node].port}/v4/info`, {
    headers: {
      Authorization: Nodes[node].password
    },
    port: Nodes[node].port,
    method: 'GET'
  })

  return data
}

async function getStats(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node != 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  const data = await utils.makeRequest(`http${Nodes[node].secure ? 's' : ''}://${Nodes[node].hostname}:${Nodes[node].port}/v4/stats`, {
    headers: {
      Authorization: Nodes[node].password
    },
    port: Nodes[node].port,
    method: 'GET'
  })

  return data
}

async function getVersion(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node != 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  const data = await utils.makeRequest(`http${Nodes[node].secure ? 's' : ''}://${Nodes[node].hostname}:${Nodes[node].port}/version`, {
    headers: {
      Authorization: Nodes[node].password
    },
    port: Nodes[node].port,
    method: 'GET'
  })

  return data
}

function handleRaw(data) {
  switch (data.t) {
    case 'VOICE_SERVER_UPDATE': {
      if (!sessionIds[data.d.guild_id]) return;

      const player = new Player(Players[data.d.guild_id].node, data.d.guild_id)

      player.update({
        voice: {
          token: data.d.token,
          endpoint: data.d.endpoint,
          sessionId: sessionIds[data.d.guild_id]
        }
      })

      delete sessionIds[data.d.guild_id]

      break
    }

    case 'VOICE_STATE_UPDATE': {
      if (data.d.member.user.id == Config.botId)
        sessionIds[data.d.guild_id] = data.d.session_id

      break
    }
  }
}

export default {
  node: {
    connectNodes
  },
  player: {
    createPlayer,
    getPlayer,
    Player,
    getPlayers
  },
  other: {
    getInfo,
    getStats,
    getVersion,
    handleRaw
  }
}