/**
 * @file index.js
 * @author PerformanC <performancorg@gmail.com>
 */

import {
  ConfigData,
  ConfigOptions,
  InternalNodeData,
  NodeOptions,
  InternalPlayerData,
  InternalVoiceData,
  ConnectOptions,
  LoadTrackData,
  LoadShortData,
  LoadPlaylistData,
  LoadAlbumData,
  LoadArtistData,
  LoadShowData,
  LoadPodcastData,
  LoadStationData,
  LoadSearchData,
  LoadEmptyData,
  LoadErrorData,
  LyricsSData,
  LyricsMData,
  UpdatePlayerOptions,
  UpdatePlayerData,
  ExternalPlayerData,
  ExternalPlayersData,
  NodeInfoData,
  RequestStatsData,
  RouterPlannerStatusData
} from './indexTypes'
import { RequestOptions } from './src/utilsTypes.js'
import { TrackData } from './src/events/track/trackTypes.js'

import event from 'node:events'

import events from './src/events.js'
import utils from './src/utils.js'
import PWSL from './src/ws.js'

let Config: ConfigData = {}
let Nodes: InternalNodeData = {}
let Players: InternalPlayerData = {}
const vcsData: InternalVoiceData = {}

const Event = new event()

/**
 * Connects node's WebSocket server for communication.
 *
 * @param nodes An array of node objects containing connection details.
 * @param config Configuration object containing botId, shards, queue, and debug options.
 * @throws Error If nodes or config is not provided or not in the expected format.
 * @returns Event emitter for listening to LavaLink events.
 */
function connectNodes(nodes: Array<NodeOptions>, config: ConfigOptions) {
  Config = config

  nodes.forEach((node) => {
    Nodes[node.hostname] = {
      ...node,
      connected: false,
      sessionId: null
    }

    let ws: PWSL = new PWSL(`ws${node.secure ? 's' : ''}://${node.hostname}${node.port ? `:${node.port}` : ''}/v4/websocket`, {
      headers: {
        Authorization: node.password,
        'Num-Shards': config.shards,
        'User-Id': config.botId,
        'Client-Name': 'FastLink/2.4.1 (https://github.com/PerformanC/FastLink/tree/ts)'
      }
    })

    ws.on('open', () => events.open(Event, node.hostname))

    ws.on('message', (data: string) => {
      const tmp = events.message(Event, data, node.hostname, Config, Nodes, Players)

      Nodes = tmp.Nodes
      Players = tmp.Players
    })

    ws.on('close', async () => {
      const tmp = await events.close(Event, ws, node, Config, Nodes, Players)

      Nodes = tmp.Nodes
      Players = tmp.Players
      ws = tmp.ws
    })

    ws.on('error', (err: Error) => events.error(Event, err, node.hostname))
  })

  return Event
}

/**
 * Checks if any node is connected.
 *
 * @returns The boolean if any node is connected or not.
 */
function anyNodeAvailable(): boolean {
  return Object.values(Nodes).filter((node: InternalNodeData) => node?.connected).length === 0 ? false : true
}

function getRecommendedNode(): InternalNodeData {
  const nodes = Object.values(Nodes).filter((node: InternalNodeData) => node.connected)

  if (nodes.length === 0) throw new Error('No node connected.')
  
  return nodes.sort((a, b) => (a.stats.systemLoad / a.stats.cores) * 100 - (b.stats.systemLoad / b.stats.cores) * 100)[0] as InternalNodeData
}

/**
 * Represents a player for an audio streaming service.
 *
 * @class Player
 */
class Player {
  private guildId: string | number
  private node: string

  /**
   * Constructs a Player object.
   *
   * @param guildId The ID of the guild that will be associated with the player.
   * @throws Error If the guildId is not provided, or if they are of invalid type.
   */
  constructor(guildId: string | number) {
    this.guildId = guildId
    this.node = Players[this.guildId]?.node
  }

  /**
   * Creates a player for the guild.
   *
   * @throws Error If a player already exists for the guild.
   */
  createPlayer(): void {
    if (Players[this.guildId])
      throw new Error('Player already exists. Use playerCreated() to check if a player exists.')

    const node: string = getRecommendedNode().hostname as string

    Players[this.guildId] = {
      connected: false,
      playing: false,
      paused: false,
      volume: null,
      node,
      loop: null,
      guildWs: null
    }

    if (Config.queue) Players[this.guildId].queue = []
    else Players[this.guildId].track = null

    if (node) this.node = node
  }

  /**
   * Verifies if a player exists for the guild.
   * 
   * @returns The boolean if the player exists or not.
   */
  playerCreated(): boolean {
    return Players[this.guildId] ? true : false
  }

  /**
   * Connects to a voice channel.
   *
   * @param voiceId The ID of the voice channel to connect to.
   * @param options Options for the connection, deaf or mute.
   * @param sendPayload A function for sending payload data.
   * @throws Error If the voiceId or sendPayload is not provided, or if they are of invalid type.
   */
  connect(voiceId: string | number, options: ConnectOptions, sendPayload: Function): void {  
    Players[this.guildId].connected = !!voiceId
  
    sendPayload(this.guildId, {
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: voiceId,
        self_mute: options.mute || false,
        self_deaf: options.deaf || false
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
  loadTrack(search: string): Promise<LoadTrackData | LoadShortData | LoadPlaylistData | LoadAlbumData | LoadArtistData | LoadShowData | LoadPodcastData | LoadStationData | LoadSearchData | LoadEmptyData | LoadErrorData> {  
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
  loadLyrics(track: string, lang: string): Promise<LyricsSData | LyricsMData> {
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
  update(body: UpdatePlayerOptions, noReplace?: boolean): Promise<UpdatePlayerData> | void {
    if (body.track?.encoded && Config.queue) {
      Players[this.guildId].queue.push(body.track.encoded)

      if (Players[this.guildId].queue.length !== 1 && Object.keys(body).length !== 1)
        delete body.track.encoded

      if (Players[this.guildId].queue.length !== 1 && Object.keys(body).length === 1)
        return;
    } else if (body.track?.encoded === null) Players[this.guildId].queue = []
  
    if (body.tracks?.encodeds) {
      if (!Config.queue)
        throw new Error('Queue is disabled.')
  
      if (Players[this.guildId].queue.length === 0) {
        Players[this.guildId].queue = body.tracks.encodeds

        delete body.tracks
  
        this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
          body: {
            ...body,
            track: {
              ...body.track,
              encoded: Players[this.guildId].queue[0]
            }
          },
          method: 'PATCH'
        })
      } else Players[this.guildId].queue.push(...body.tracks.encodeds)
  
      return;
    }

    if (body.paused !== undefined) {
      Players[this.guildId].playing = !body.paused
      Players[this.guildId].paused = body.paused
    }
  
    this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}?noReplace=${noReplace !== true ? false : true}`, {
      body,
      method: 'PATCH'
    })
  }

  /**
   * Destroys the player.
   */
  destroy(): void {
    Players[this.guildId] = null
  
    this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Gets the queue of tracks.
   *
   * @return The queue of tracks.
   * @throws Error If the queue is disabled.
   */
  getQueue(): Array<string> {
    if (!Config.queue) throw new Error('Queue is disabled.')
  
    return Players[this.guildId].queue
  }

  /**
   * Skips the currently playing track.
   *
   * @return The queue of tracks, or null if there is no queue.
   * @throws Error If the queue is disabled
   */
  skipTrack(): Array<string> | false {
    if (!Config.queue) throw new Error('Queue is disabled.')

    if (Players[this.guildId].queue.length === 1)
      return false

    Players[this.guildId].queue.shift()
  
    this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
      body: {
        track: {
          encoded: Players[this.guildId].queue[0]
        }
      },
      method: 'PATCH'
    })
  
    return Players[this.guildId].queue
  }

  /**
   * Sets the loop state of the player.
   *
   * @param loop The loop state to set.
   * @return The loop state of the player.
   */
  loop(loop: 'track' | 'queue' | null): 'track' | 'queue' | null {
    if (!Config.queue) throw new Error('Queue is disabled.')

    return Players[this.guildId].loop = loop
  }

  /**
   * Shuffles the queue of tracks.
   * 
   * @return The shuffled queue of tracks, or false if there are less than 3 tracks in the queue.
   * @throws Error If the queue is disabled.
   */
  shuffle(): Array<string> | false {
    if (!Config.queue) throw new Error('Queue is disabled.')

    if (Players[this.guildId].queue.length < 3)
      return false

    Players[this.guildId].queue.forEach((_, i) => {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = Players[this.guildId].queue[i]
      Players[this.guildId].queue[i] = Players[this.guildId].queue[j]
      Players[this.guildId].queue[j] = temp
    })

    return Players[this.guildId].queue
  }

  /**
   * Decodes a track.
   *
   * @param track The array to decode.
   * @throws Error If a track is not provided or if track is not a string.
   * @return A Promise that resolves to the decoded data.
   */
  decodeTrack(track: string): Promise<TrackData> {
    return this.makeRequest(`/decodetrack?encodedTrack=${track}`, {
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
  decodeTracks(tracks: Array<string>): Promise<Array<TrackData>> {
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

    Players[this.guildId].guildWs = new PWSL(`ws://${Nodes[this.node].hostname}${Nodes[this.node].port ? `:${Nodes[this.node].port}` : ''}/connection/data`, {
      headers: {
        Authorization: Nodes[this.node].password,
        'user-id': Config.botId,
        'guild-id': this.guildId,
        'Client-Name': 'FastLink/2.4.1 (https://github.com/PerformanC/FastLink/tree/ts)'
      }
    })
    .on('open', () => {
      voiceEvents.emit('open')
    })
    .on('message', (data) => {
      data = JSON.parse(data)

      if (data.type === 'startSpeakingEvent') {
        voiceEvents.emit('startSpeaking', data.data)
      }

      if (data.type === 'endSpeakingEvent') {
        voiceEvents.emit('endSpeaking', data.data)
      }
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
    const guildWs = Players[this.guildId].guildWs

    if (!guildWs) return false

    guildWs.close()
    Players[this.guildId].guildWs = null

    return true
  }

  makeRequest(path: string, options: RequestOptions): Promise<any> {
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
function updateSession(node: string, data: any): void {
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
function getPlayer(guildId: string, node: string): Promise<ExternalPlayerData> {
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
function getPlayers(node: string): Promise<ExternalPlayersData> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/sessions', { method: 'GET' })
}

/**
 * Retrieves the info for a given node.
 *
 * @param node The node to retrieve info from.
 * @throws Error If no node is provided or if node is not a string.
 * @return A Promise that resolves to the retrieved info data.
 */
function getInfo(node: string): Promise<NodeInfoData> {
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
function getStats(node: string): Promise<RequestStatsData> {
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
function getVersion(node: string): Promise<string> {
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
function getRouterPlannerStatus(node: string): Promise<RouterPlannerStatusData> {
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
function unmarkFailedAddress(node: string, address: string): Promise<void> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

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
function unmarkAllFailedAddresses(node: string): Promise<void> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/routerplanner/free/all', { method: 'GET' })
}

/**
 * Handles raw data received from an external source.
 *
 * @param data The raw data from Discord to handle.
 * @throws Error If data is not provided or if data is not an object.
 */
function handleRaw(data: any): void {
  switch (data.t) {
    case 'VOICE_SERVER_UPDATE': {
      if (!vcsData[data.d.guild_id]) return;

      const player = new Player(data.d.guild_id)

      if (!player.playerCreated()) return;

      player.update({
        voice: {
          token: data.d.token,
          endpoint: data.d.endpoint,
          sessionId: vcsData[data.d.guild_id].sessionId
        }
      })

      vcsData[data.d.guild_id].server = {
        token: data.d.token,
        endpoint: data.d.endpoint
      }

      break
    }

    case 'VOICE_STATE_UPDATE': {
      if (data.d.member.user.id !== Config.botId) return;

      vcsData[data.d.guild_id] = {
        ...vcsData[data.d.guild_id],
        sessionId: data.d.session_id
      }

      if (vcsData[data.d.guild_id].server) {
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

      break
    }

    case 'GUILD_CREATE': {
      data.d.voice_states.forEach((state: any) => {
        if (state.user_id !== Config.botId) return;

        vcsData[data.d.id] = {
          ...vcsData[data.d.id],
          sessionId: state.session_id
        }
      })
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
    getPlayer,
    getPlayers
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
  }
}
