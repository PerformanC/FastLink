import { ConfigOptions, InternalNodeOptions, InternalPlayerOptions } from '../../../index.d'
import { PartialTrackData } from './track.d'
import Event from 'events'

function trackStuck(Event: Event, payload: any, node: string, config: ConfigOptions, Nodes: InternalNodeOptions, Players: InternalPlayerOptions): InternalPlayerOptions {
  Event.emit('debug', `[FastLink] ${node} has received a track stuck event`)

  const player = Players[payload.guildId]

  if (!player) {
    console.log(`[FastLink] Received TrackStuckEvent from ${node} but no player was found`)

    return Players
  }

  if (config.queue) player.queue = []
  else player.track = null
  player.playing = false
  player.volume = null

  Event.emit('trackStuck', { node: Nodes[node], guildId: payload.guildId as string, player, track: payload.track as PartialTrackData })

  return Players
}

export default trackStuck