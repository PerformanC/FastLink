/**
 * @file index.js
 * @author PerformanC <performancorg@gmail.com>
 */

import event from 'node:events'

import events from './src/events.js'
import utils from './src/utils.js'
import Pws from '@performanc/pwsl-mini'

let Config = {}
let Nodes = {}
let Players = {}
let vcsData = {}

const Event = new event()

/**
 * Connects node's WebSocket server for communication.
 *
 * @param nodes An array of node objects containing connection details.
 * @param config Configuration object containing botId, shards, queue, and debug options.
 * @throws Error If nodes or config is not provided or not in the expected format.
 * @returns Event emitter for listening to LavaLink events.
 */
function connectNodes(nodes, config) {
  if (!nodes) throw new Error('No nodes provided.')
  if (typeof nodes !== 'object') throw new Error('Nodes must be an array.')

  if (!config) throw new Error('No config provided.')
  if (typeof config !== 'object') throw new Error('Config must be an object.')

  if (!config.botId) throw new Error('No botId provided.')
  if (typeof config.botId !== 'string') throw new Error('BotId must be a string.')

  if (!config.shards) throw new Error('No shards provided.')
  if (typeof config.shards !== 'number') throw new Error('Shards must be a number.')

  if (config.queue && typeof config.queue !== 'boolean') throw new Error('Queue must be a boolean.')

  Config = {
    botId: config.botId,
    shards: config.shards,
    queue: config.queue ?? false
  }

  nodes.forEach((node) => {
    if (!node.hostname) throw new Error('No hostname provided.')
    if (typeof node.hostname !== 'string') throw new Error('Hostname must be a string.')

    if (!node.password) throw new Error('No password provided.')
    if (typeof node.password !== 'string') throw new Error('Password must be a string.')

    if (typeof node.secure !== 'boolean') throw new Error('Secure must be a boolean.')

    if (!node.port) node.port = 2333

    Nodes[node.hostname] = {
      ...node,
      connected: false,
      sessionId: null
    }

    let ws = new Pws(`ws${node.secure ? 's' : ''}://${node.hostname}${node.port ? `:${node.port}` : ''}/v4/websocket`, {
      headers: {
        Authorization: node.password,
        'Num-Shards': config.shards,
        'User-Id': config.botId,
        'Client-Name': 'FastLink/3.0.0 (https://github.com/PerformanC/FastLink)'
      }
    })

    ws.on('open', () => events.open(Event, node.hostname))

    ws.on('message', (data) => {
      const tmp = events.message(Event, data, node.hostname, Config, Nodes, Players)

      Nodes = tmp.Nodes
      Players = tmp.Players
    })

    ws.on('close', async () => {
      const tmp = await events.close(Event, ws, node, Config, Nodes, Players, vcsData)

      Nodes = tmp.Nodes
      Players = tmp.Players
      ws = tmp.ws
      vcsData = tmp.vcsData
    })

    ws.on('error', (err) => events.error(Event, err, node.hostname))
  })

  return Event
}

/**
 * Checks if any node is connected.
 *
 * @returns The boolean if any node is connected or not.
 */
function anyNodeAvailable() {
  return Object.values(Nodes).filter((node) => node?.connected).length === 0 ? false : true
}

function getRecommendedNode() {
  const nodes = Object.values(Nodes).filter((node) => node?.connected)

  if (nodes.length === 0) {
    Event.emit('debug', 'No node ready to use')

    return false
  }
  
  return nodes.sort((a, b) => (a.stats.systemLoad / a.stats.cores) * 100 - (b.stats.systemLoad / b.stats.cores) * 100)[0]
}

/**
 * Represents a player for an audio streaming service.
 *
 * @class Player
 */
class Player {
  /**
   * Constructs a Player object.
   *
   * @param guildId The ID of the guild that will be associated with the player.
   * @throws Error If the guildId is not provided, or if they are of invalid type.
   */
  constructor(guildId) {  
    if (!guildId) throw new Error('No guildId provided.')
    if (typeof guildId !== 'string') throw new Error('GuildId must be a string.')

    this.guildId = guildId
  }

  /**
   * The local player information.
   * 
   * @returns The player local information.
   */
  get info() {
    return Players[this.guildId]
  }

  /**
   * The node tied to the player.
   * 
   * @returns The node tied to the player.
   */
  get node() {
    return Players[this.guildId]?.node
  }

  /**
   * Whether the player is connected or not.
   * 
   * @returns The boolean if the player exists or not.
   */
  get isCreated() {
    return Players[this.guildId] ? true : false
  }

  /**
   * Queue of the player
   * 
   * @returns The queue of the player.
   */
  get queue() {
    if (!Config.queue) throw new Error('Queue is disabled.')

    return Players[this.guildId]?.queue
  }

  /**
   * Creates a player for the guild.
   *
   * @return The boolean if the player was created or not.
   * @throws Error If a player already exists for the guild.
   */
  createPlayer() {
    if (Players[this.guildId])
      throw new Error('Player already exists. Check playerCreated to see if a player exists.')

    const node = getRecommendedNode()
    if (!node) return false

    Players[this.guildId] = {
      connected: false,
      playing: false,
      paused: false,
      volume: 100,
      node: node.hostname,
      loop: null,
      listenerWs: null,
      data: null
    }

    if (Config.queue) Players[this.guildId].queue = []
    else Players[this.guildId].track = null

    return true
  }

  /**
   * Connects to a voice channel.
   *
   * @param voiceId The ID of the voice channel to connect to.
   * @param options Options for the connection, deaf or mute.
   * @param sendPayload A function for sending payload data.
   * @throws Error If the voiceId or sendPayload is not provided, or if its type is invalid.
   */
  connect(voiceId, options, sendPayload) {  
    if (!voiceId) throw new Error('No voiceId provided.')
    if (typeof voiceId !== 'string') throw new Error('VoiceId must be a string.')

    if (!options) options = {}
    if (typeof options !== 'object') throw new Error('Options must be an object.')

    if (!sendPayload) throw new Error('No sendPayload provided.')
    if (typeof sendPayload !== 'function') throw new Error('SendPayload must be a function.')

    Players[this.guildId].connected = true
  
    sendPayload(this.guildId, {
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: voiceId,
        self_mute: options.mute ?? false,
        self_deaf: options.deaf ?? false
      }
    })
  }

  /**
   * Disconnects from a voice channel.
   *
   * @param sendPayload A function for sending payload data.
   * @throws Error If the sendPayload is not provided or if it is not a function.
   */
  disconnect(sendPayload) {  
    if (!sendPayload) throw new Error('No sendPayload provided.')
    if (typeof sendPayload !== 'function') throw new Error('SendPayload must be a function.')

    Players[this.guildId].connected = false
  
    sendPayload(this.guildId, {
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: null,
        self_mute: false,
        self_deaf: false
      }
    })
  }

  /**
   * Loads a track.
   *
   * @param search The search query for the track.
   * @return The loaded track data.
   * @throws Error If the search is not provided or is of invalid type.
   */
  loadTrack(search) {  
    if (!search) throw new Error('No search provided.')
    if (typeof search !== 'string') throw new Error('Search must be a string.')
  
    return this.makeRequest(`/loadtracks?identifier=${encodeURIComponent(search)}`, {
      method: 'GET'
    })
  }

  /**
   * Loads lyrics for a given track.
   * 
   * @param track The track to load lyrics for.
   * @param lang The language to load lyrics for. Optional.
   * @throws Error If the track is not provided or is of invalid type.
   * @return A Promise that resolves to the loaded lyrics data.
   */
  loadLyrics(track, lang) {  
    if (!track) throw new Error('No track provided.')
    if (typeof track !== 'string') throw new Error('Track must be a string.')

    if (lang && typeof lang != 'string') throw new Error('Lang must be a string.')

    return this.makeRequest(`/loadlyrics?encodedTrack=${encodeURIComponent(track)}${lang ? `&language=${lang}`: ''}`, {
      method: 'GET'
    })
  }

  /**
   * Updates the player state.
   *
   * @param body The body of the update request.
   * @param noReplace Flag to specify whether to replace the existing track or not. Optional.
   * @throws Error If the body is not provided or is of invalid type.
   */
  update(body, noReplace = false) {  
    if (!body) throw new Error('No body provided.')
    if (typeof body !== 'object') throw new Error('Body must be an object.')
  
    return this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}?noReplace=${noReplace !== true ? false : true}`, {
      body,
      method: 'PATCH'
    })
  }

  /**
   * Decodes a track.
   *
   * @param track The array to decode.
   * @throws Error If a track is not provided or if track is not a string.
   * @return A Promise that resolves to the decoded data.
   */
  decodeTrack(track) {  
    if (!track) throw new Error('No track provided.')
    if (typeof track !== 'string') throw new Error('Track must be a string.')
  
    return this.makeRequest(`/decodetrack?encodedTrack=${encodeURIComponent(track)}`, {
      method: 'GET'
    })
  }
  
  /**
   * Decodes an array of tracks.
   *
   * @param tracks The array of tracks to decode.
   * @throws Error If no tracks are provided or if tracks is not an array.
   * @return A Promise that resolves to the decoded data.
   */
  decodeTracks(tracks) {  
    if (!tracks) throw new Error('No tracks provided.')
    if (typeof tracks !== 'object') throw new Error('Tracks must be an array.')
  
    return this.makeRequest(`/decodetracks`, {
      body: tracks,
      method: 'POST'
    })
  }

  /**
   * Listens to the voice channel. NodeLink only.
   * 
   * @returns An event emitter for listening to voice events. open, startSpeaking, endSpeaking, close, error
   */
  listen() {
    const voiceEvents = new event()

    Players[this.guildId].listenerWs = new Pws(`ws://${Nodes[this.node].hostname}${Nodes[this.node].port ? `:${Nodes[this.node].port}` : ''}/connection/data`, {
      headers: {
        Authorization: Nodes[this.node].password,
        'user-id': Config.botId,
        'guild-id': this.guildId,
        'Client-Name': 'FastLink/3.0.0 (https://github.com/PerformanC/FastLink)'
      }
    })
    .on('open', () => {
      voiceEvents.emit('open')
    })
    .on('message', (data) => {
      data = JSON.parse(data)

      if (data.type == 'startSpeakingEvent') voiceEvents.emit('startSpeaking', data.data)
      if (data.type == 'endSpeakingEvent') voiceEvents.emit('endSpeaking', data.data)
    })
    .on('close', () => {
      voiceEvents.emit('close')
    })
    .on('error', (err) => {
      voiceEvents.emit('error', err)
    })

    return voiceEvents
  }

  /**
   * Stops listening to the voice channel.
   * 
   * @returns The boolean if the player is connected or not.
   */
  stopListen() {
    const listenerWs = Players[this.guildId].listenerWs

    if (!listenerWs) return false

    listenerWs.close()
    Players[this.guildId].listenerWs = null

    return true
  }

  /**
   * Skips the currently playing track.
   *
   * @return The queue of tracks, or null if there is no queue.
   * @throws Error If the queue is disabled
   */
  skipTrack() {  
    if (!Config.queue) throw new Error('Queue is disabled.')

    if (Players[this.guildId].queue.length === 1)
      return false

    Players[this.guildId].queue.shift()

    this.update({
      track: {
        encoded: Players[this.guildId].queue[0]
      }
    })
  
    return Players[this.guildId].queue
  }

  /**
   * Sets the loop state of the player.
   *
   * @param loop The loop state to set.
   * @return The loop state of the player.
   */
  loop(loop) {
    if (!Config.queue) throw new Error('Queue is disabled.')

    if (![ 'track', 'queue', null ].includes(loop))
      throw new Error('Loop must be track, queue, or null.')

    return Players[this.guildId].loop = loop
  }

  /**
   * Destroys the player.
   */
  destroy() {  
    this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
      method: 'DELETE'
    })
  
    delete Players[this.guildId]
  }

  /**
   * Sets additional data for the player.
   * 
   * @param data The data to set.
   */
  setData(data) {
    Players[this.guildId].data = data
  }

  makeRequest(path, options) {
    return utils.makeNodeRequest(Nodes, this.node, `/v4${path}`, options)
  }
}

/**
 * Updates the session data for the node.
 *
 * @param node The node to update session data for.
 * @param data The session data to update.
 * @throws Error If the data is not provided or is of invalid type.
 */
function updateSession(node, data) {  
  if (!data) throw new Error('No data provided.')
  if (typeof data !== 'object') throw new Error('Data must be an object.')

  utils.makeNodeRequest(Nodes, node, `/v4/sessions/${Nodes[node].sessionId}`, {
    body: data,
    method: 'PATCH'
  })
}

/**
 * Retrieves the player for a given guild.
 * 
 * @param guildId The guild to retrieve player from.
 * @param node The node to retrieve player from.
 * 
 * @throws Error If no guildId is provided or if guildId is not a string.
 * @throws Error If no node is provided or if node is not a string.
 * @throws Error If player does not exist.
 * 
 * @returns A Promise that resolves to the retrieved player data.
 */
function getPlayer(guildId, node) {
  if (!guildId) throw new Error('No guildId provided.')
  if (typeof guildId !== 'string') throw new Error('GuildId must be a string.')

  if (!node) throw new Error('No node provided.')
  if (typeof node !== 'string') throw new Error('Node must be a string.')

  if (!Players[guildId]) throw new Error('Player does not exist.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, `/v4/sessions/${Nodes[node].sessionId}/players/${guildId}`, { method: 'GET' })
}

/**
 * Retrieves the players for a given node.
 *
 * @param node The node to retrieve players from.
 * @throws Error If no node is provided or if node is not a string.
 * @return A Promise that resolves to the retrieved player data.
 */
function getPlayers(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node !== 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/sessions', { method: 'GET' })
}

/**
 * Retrieves all local players.
 * 
 * @returns The local players.
 */
function getAllLocalPlayers() {
  return Players
}

/**
 * Retrieves the info for a given node.
 *
 * @param node The node to retrieve info from.
 * @throws Error If no node is provided or if node is not a string.
 * @return A Promise that resolves to the retrieved info data.
 */
function getInfo(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node !== 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/info', { method: 'GET' })
}

/**
 * Retrieves the stats for a given node.
 *
 * @param node The node to retrieve stats from.
 * @throws Error If no node is provided or if node is not a string.
 * @return A Promise that resolves to the retrieved stats data.
 */
function getStats(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node !== 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/stats', { method: 'GET' })
}

/**
 * Retrieves the version for a given node.
 *
 * @param node The node to retrieve version from.
 * @throws Error If no node is provided or if node is not a string.
 * @return A Promise that resolves to the retrieved version data.
 */
function getVersion(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node !== 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/version', { method: 'GET' })
}

/**
 * Retrieves the router planner status for a given node.
 * 
 * @param node The node to retrieve router planner status from.
 * @throws Error If no node is provided or if node is not a string.
 * @return A Promise that resolves to the retrieved router planner status data.
 */
function getRouterPlannerStatus(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node !== 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/routerplanner/status', { method: 'GET' })
}

/**
 * Unmarks a failed address for a given node.
 * 
 * @param node The node to unmark failed address from.
 * @param address The address to unmark.
 * @throws Error If no node is provided or if node is not a string.
 * @returns A Promise that resolves when the request is complete.
 */
function unmarkFailedAddress(node, address) {
  if (!node) throw new Error('No node provided.')
  if (typeof node !== 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  if (!address) throw new Error('No address provided.')
  if (typeof address !== 'string') throw new Error('Address must be a string.')

  return utils.makeNodeRequest(Nodes, node, `/v4/routerplanner/free/address?address=${encodeURIComponent(address)}`, {
    method: 'GET',
    body: { address }
  })
}

/**
 * Unmarks all failed addresses for a given node.
 * 
 * @param node The node to unmark failed addresses from.
 * @throws Error If no node is provided or if node is not a string.
 * @returns A Promise that resolves when the request is complete.
 */
function unmarkAllFailedAddresses(node) {
  if (!node) throw new Error('No node provided.')
  if (typeof node !== 'string') throw new Error('Node must be a string.')

  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/routerplanner/free/all', { method: 'GET' })
}

/**
 * Handles raw data received from an external source.
 *
 * @param data The raw data from Discord to handle.
 * @throws Error If data is not provided or if data is not an object.
 */
function handleRaw(data) {
  function _sendInfo() {
    const player = new Player(data.d.guild_id)

    if (!player.playerCreated()) return;

    player.update({
      voice: {
        token: vcsData[data.d.guild_id].server.token,
        endpoint: vcsData[data.d.guild_id].server.endpoint,
        sessionId: vcsData[data.d.guild_id].sessionId
      }
    })
  }

  switch (data.t) {
    case 'VOICE_SERVER_UPDATE': {
      if (!vcsData[data.d.guild_id]) {
        Event.emit('debug', 'Voice server update received from Discord, but no data from "voice state update" found. This is only possible if the provided botId is incorrect.')

        return;
      }

      if (vcsData[data.d.guild_id].server?.endpoint === data.d.endpoint) return;

      vcsData[data.d.guild_id].server = {
        token: data.d.token,
        endpoint: data.d.endpoint
      }

      _sendInfo()

      break
    }

    case 'VOICE_STATE_UPDATE': {
      if (data.d.member.user.id !== Config.botId) return;

      if (data.d.channel_id === null) return delete vcsData[data.d.guild_id]

      if (vcsData[data.d.guild_id]?.sessionId === data.d.session_id) return;

      vcsData[data.d.guild_id] = {
        ...vcsData[data.d.guild_id],
        sessionId: data.d.session_id
      }

      if (vcsData[data.d.guild_id].server) _sendInfo()

      break
    }
  }
}

export default {
  node: {
    updateSession,
    connectNodes,
    anyNodeAvailable
  },
  player: {
    Player,
    getPlayers,
    getPlayer,
    getAllLocalPlayers
  },
  routerPlanner: {
    getRouterPlannerStatus,
    unmarkFailedAddress,
    unmarkAllFailedAddresses
  },
  other: {
    getInfo,
    getStats,
    getVersion,
    handleRaw
  },
  type: 'LavaLink v4'
}
