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
  UpdatePlayerOptions,
  UpdatePlayerData,
  PlayersData,
  NodeInfoData,
  RequestStatsData,
  RouterPlannerStatusData
} from './index.d'
import { RequestOptions } from './src/utils.d'
import { TrackData } from './src/events/track/track.d'

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
 * @param {Array} An array of node objects containing connection details.
 * @param {Object} Configuration object containing botId, shards, queue, and debug options.
 * @throws {Error} If nodes or config is not provided or not in the expected format.
 * @returns {Object} Event object representing the WebSocket event handlers.
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
        'Client-Name': 'FastLink'
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
 * @returns {boolean} The boolean if any node is connected or not.
 */
function anyNodeAvailable(): boolean {
  return Object.values(Nodes).filter((node: InternalNodeData) => node?.connected).length == 0 ? false : true
}

function getRecommendedNode(): InternalNodeData {
  const nodes = Object.values(Nodes).filter((node: InternalNodeData) => node.connected)

  if (nodes.length == 0) throw new Error('No node connected.')
  
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
   * @param {string} The ID of the guild that will be associated with the player.
   * @throws {Error} If the guildId is not provided, or if they are of invalid type.
   */
  constructor(guildId: string | number) {
    this.guildId = guildId
    this.node = Players[this.guildId]?.node
  }

  /**
   * Creates a player for the specified guildId.
   *
   * @param {string} The ID of the guild for which the player is being created.
   * @throws {Error} If guildId is not provided or not a string.
   * @returns {string} The hostname of the recommended node for the player.
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
      node: node,
    }

    if (Config.queue) Players[this.guildId].queue = []
    else Players[this.guildId].track = null

    if (node) this.node = node
  }

  /**
   * Verifies if a player exists for the specified guildId.
   * 
   * @param {string} The ID of the guild for which the player is being retrieved.
   * @returns {boolean} The boolean if the player exists or not.
   */
  playerCreated(): boolean {
    return Players[this.guildId] ? true : false
  }

  /**
   * Connects to a voice channel.
   *
   * @param {string} The ID of the voice channel to connect to.
   * @param {Object} Options for the connection, deaf or mute.
   * @param {Function} A function for sending payload data.
   * @throws {Error} If the voiceId or sendPayload is not provided, or if they are of invalid type.
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
   * @param {string} The search query for the track.
   * @return {TrackData} The loaded track data.
   * @throws {Error} If the search is not provided or is of invalid type.
   */
  loadTrack(search: string): Promise<LoadTrackData | LoadShortData | LoadPlaylistData | LoadAlbumData | LoadArtistData | LoadShowData | LoadPodcastData | LoadStationData | LoadSearchData | LoadEmptyData | LoadErrorData> {  
    return this.makeRequest(`/loadtracks?identifier=${encodeURIComponent(search)}`, {
      method: 'GET'
    })
  }

  /**
   * Loads captions for a given track.
   * 
   * @param {string} The track to load captions for.
   * @param {string?} The language to load captions for.
   * @throws {Error} If the track is not provided or is of invalid type.
   * @return {Promise} A Promise that resolves to the loaded captions data.
   */
  // Misses typing, unstable endpoint.
  loadCaptions(track: string, lang: string) {
    return this.makeRequest(`/loadcaptions?encodedTrack=${encodeURIComponent(track)}${lang ? `&language=${lang}`: ''}`, {
      method: 'GET'
    })
  }

  /**
   * Updates the player state.
   *
   * @param {Object} body The body of the update request.
   * @param {boolean} Optional flag to specify whether to replace the existing track or not.
   * @throws {Error} If the body is not provided or is of invalid type.
   */
  update(body: UpdatePlayerOptions, noReplace?: boolean): Promise<UpdatePlayerData> | void {
    if (body.encodedTrack && Config.queue) {
      Players[this.guildId].queue.push(body.encodedTrack)

      if (Players[this.guildId].queue.length != 1) return;
    } else if (body.encodedTrack !== undefined) Players[this.guildId].queue = []
  
    if (body.encodedTracks) {
      if (!Config.queue)
        throw new Error('Queue is disabled.')
  
      if (Players[this.guildId].queue.length == 0) {
        Players[this.guildId].queue = body.encodedTracks
  
        this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
          body: { encodedTrack: body.encodedTracks[0] },
          method: 'PATCH'
        })
      } else body.encodedTracks.forEach((track: string) => Players[this.guildId].queue.push(track))
  
      return;
    }

    if (body.paused !== undefined) {
      Players[this.guildId].playing = !body.paused
      Players[this.guildId].paused = body.paused
    }
  
    return this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}?noReplace=${noReplace !== true ? false : true}`, {
      body,
      method: 'PATCH'
    })
  }

  /**
   * Destroys the player.
   *
   * @throws {None}
   */
  destroy(): void {
    Players[this.guildId] = null
  
    this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Updates the session data for the player.
   *
   * @param {Object} The session data to update.
   * @throws {Error} If the data is not provided or is of invalid type.
   */
  updateSession(data: Object): void {
    this.makeRequest(`/sessions/${Nodes[this.node].sessionId}`, {
      body: data,
      method: 'PATCH'
    })
  }

  /**
   * Gets the queue of tracks.
   *
   * @return {Array<string>} The queue of tracks.
   * @throws {Error} If the queue is disabled.
   */
  getQueue(): Array<string> {
    if (!Config.queue) throw new Error('Queue is disabled.')
  
    return Players[this.guildId].queue
  }

  /**
   * Skips the currently playing track.
   *
   * @return {Array<string> | null} The queue of tracks.
   * @throws {Error} If the queue is disabled
   */
  skipTrack(): Array<string> | null {
    if (!Config.queue) throw new Error('Queue is disabled.')

    if (Players[this.guildId].queue.length == 1)
      return null

    Players[this.guildId].queue.shift()
  
    this.makeRequest(`/sessions/${Nodes[this.node].sessionId}/players/${this.guildId}`, {
      body: { encodedTrack: Players[this.guildId].queue[0] },
      method: 'PATCH'
    })
  
    return Players[this.guildId].queue
  }

  /**
   * Decodes a track.
   *
   * @param {string} The array to decode.
   * @throws {Error} If a track is not provided or if track is not a string.
   * @return {Promise} A Promise that resolves to the decoded data.
   */
  decodeTrack(track: string): Promise<TrackData> {
    return this.makeRequest(`/decodetrack?encodedTrack=${track}`, {
      method: 'GET'
    })
  }
  
  /**
   * Decodes an array of tracks.
   *
   * @param {Array} The array of tracks to decode.
   * @throws {Error} If no tracks are provided or if tracks is not an array.
   * @return {Promise} A Promise that resolves to the decoded data.
   */
  decodeTracks(tracks: Array<string>): Promise<Array<TrackData>> {
    return this.makeRequest(`/decodetracks`, {
      body: tracks,
      method: 'POST'
    })
  }

  makeRequest(path: string, options: RequestOptions): Promise<any> {
    return utils.makeNodeRequest(Nodes, this.node, `/v4${path}`, options)
  }
}

/**
 * Retrieves the players for a given node.
 *
 * @param {string} The node to retrieve players from.
 * @throws {Error} If no node is provided or if node is not a string.
 * @return {Promise} A Promise that resolves to the retrieved player data.
 */
function getPlayers(node: string): Promise<PlayersData> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/sessions', { method: 'GET' })
}

/**
 * Retrieves the info for a given node.
 *
 * @param {string} The node to retrieve info from.
 * @throws {Error} If no node is provided or if node is not a string.
 * @return {Promise} A Promise that resolves to the retrieved info data.
 */
function getInfo(node: string): Promise<NodeInfoData> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/info', { method: 'GET' })
}

/**
 * Retrieves the stats for a given node.
 *
 * @param {string} The node to retrieve stats from.
 * @throws {Error} If no node is provided or if node is not a string.
 * @return {Promise} A Promise that resolves to the retrieved stats data.
 */
function getStats(node: string): Promise<RequestStatsData> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/stats', { method: 'GET' })
}

/**
 * Retrieves the version for a given node.
 *
 * @param {string} The node to retrieve version from.
 * @throws {Error} If no node is provided or if node is not a string.
 * @return {Promise} A Promise that resolves to the retrieved version data.
 */
function getVersion(node: string): Promise<string> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/version', { method: 'GET' })
}

/**
 * Retrieves the router planner status for a given node.
 * 
 * @param {string} The node to retrieve router planner status from.
 * @throws {Error} If no node is provided or if node is not a string.
 * @return {Promise} A Promise that resolves to the retrieved router planner status data.
 */
function getRouterPlannerStatus(node: string): Promise<RouterPlannerStatusData> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/routerplanner/status', { method: 'GET' })
}

/**
 * Unmarks a failed address for a given node.
 * 
 * @param {string} The node to unmark failed address from.
 * @param {string} The address to unmark.
 * @throws {Error} If no node is provided or if node is not a string.
 * @returns {Promise} A Promise that resolves when the request is complete.
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
 * @param {string} The node to unmark failed addresses from.
 * @throws {Error} If no node is provided or if node is not a string.
 * @returns {Promise} A Promise that resolves when the request is complete.
 */
function unmarkAllFailedAddresses(node: string): Promise<void> {
  if (!Nodes[node]) throw new Error('Node does not exist.')

  return utils.makeNodeRequest(Nodes, node, '/v4/routerplanner/free/all', { method: 'GET' })
}

/**
 * Handles raw data received from an external source.
 *
 * @param {Object} The raw data to handle.
 * @throws {Error} If data is not provided or if data is not an object.
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
      if (data.d.member.user.id != Config.botId) return;

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
        if (state.user_id != Config.botId) return;

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
    connectNodes,
    anyNodeAvailable
  },
  player: {
    Player,
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
