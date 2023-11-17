import utils from '../../utils.js'

import { ConfigOptions, InternalNodeOptions, InternalPlayerOptions } from '../../../index.d'
import { PartialTrackData } from './track.js'
import Event from 'node:events'

function trackEnd(Event: Event, payload: any, node: string, config: ConfigOptions, Nodes: InternalNodeOptions, Players: InternalPlayerOptions): InternalPlayerOptions {
  Event.emit('debug', `[FastLink] ${node} has ended a track`)

  const player = Players[payload.guildId]

  if (!player) {
    console.log(`[FastLink] Received TrackEndEvent from ${node} but no player was found`)

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

  Event.emit('trackEnd', { node: Nodes[node], guildId: payload.guildId as string, player, track: payload.track as PartialTrackData })

  return Players
}

export default trackEnd