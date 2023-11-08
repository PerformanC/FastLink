import { ConfigOptions, InternalNodeOptions, InternalPlayerOptions } from '../../../index.d'
import { PartialTrackData } from './track.d'
import Event from 'events'

function trackStart(Event: Event, payload: any, node: string, config: ConfigOptions, Nodes: InternalNodeOptions, Players: InternalPlayerOptions): InternalPlayerOptions {
  Event.emit('debug', `[FastLink] ${node} has started a track`)

  const player = Players[payload.guildId]

  if (!player) {
    console.log(`[FastLink] Received TrackStartEvent from ${node} but no player was found`)

    return Players
  }

  if (!config.queue) player.track = payload.track
  player.playing = true
  player.volume = 100

  Event.emit('trackStart', { node: Nodes[node], guildId: payload.guildId as string, player, track: payload.track as PartialTrackData })

  return Players
}

export default trackStart