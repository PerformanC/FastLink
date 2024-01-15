import Event from 'node:events'

import utils from '../../utils.js'
import { ConfigData, InternalNodeData, InternalPlayerData } from '../../../indexTypes.js'
import { TrackEndData, TrackExceptionData, TrackStuckData } from './trackEndsTypes.js'

function trackEnd(Event: Event, payload: any, node: string, config: ConfigData, Nodes: InternalNodeData, Players: InternalPlayerData): InternalPlayerData {
  const name = payload.type === 'TrackEndEvent' ? 'trackEnd' : (payload.type === 'TrackExceptionEvent' ? 'trackException' : 'trackStuck')

  Event.emit('debug', `[FastLink] ${node} has received a ${name}`)

  const player = Players[payload.guildId]

  if (!player) {
    console.log(`[FastLink] Received ${name} from ${node} but no player was found`)

    return Players
  }

  if (name !== 'trackException' && config.queue && ['finished', 'loadFailed'].includes(payload.reason)) {
    player.queue.shift()

    if (player.queue.length !== 0) {
      utils.makeNodeRequest(Nodes, node, `/v4/sessions/${Nodes[node].sessionId}/players/${payload.guildId}`, {
        body: {
          track: {
            encoded: player.queue[0]
          }
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