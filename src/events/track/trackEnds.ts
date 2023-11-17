import utils from '../../utils.js'

import { ConfigData, InternalNodeData, InternalPlayerData } from '../../../index.d'
import { TrackEndData, TrackExceptionData, TrackStuckData } from './trackEnds.d'
import Event from 'node:events'

function trackEnd(Event: Event, payload: any, node: string, config: ConfigData, Nodes: InternalNodeData, Players: InternalPlayerData): InternalPlayerData {
  const name = payload.type == 'TrackEndEvent' ? 'trackEnd' : (payload.type == 'TrackExceptionEvent' ? 'trackException' : 'trackStuck')

  Event.emit('debug', `[FastLink] ${node} has received a ${name}`)

  const player = Players[payload.guildId]

  if (!player) {
    console.log(`[FastLink] Received ${name} from ${node} but no player was found`)

    return Players
  }

  if (config.queue && payload.reason != 'replaced') {
    player.queue.shift()

    if (player.queue.length != 0) {
      utils.makeNodeRequest(Nodes, node, `/v4/sessions/${Nodes[node].sessionId}/players/${payload.guildId}`, {
        body: {
          encodedTrack: player.queue[0]
        },
        method: 'PATCH'
      })
    }
  } else player.track = null

  player.playing = false
  player.volume = null

  Event.emit(name, {
    node: Nodes[node],
    guildId: payload.guildId,
    player,
    track: payload.track,
    reason: payload.reason,
    exception: payload.exception,
    thresholdMs: payload.thresholdMs
  } as TrackEndData | TrackExceptionData | TrackStuckData)

  return Players
}

export default trackEnd