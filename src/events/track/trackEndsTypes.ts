import { PlayerData, NodeData } from '../../../indexTypes.js'
import { PartialTrackData } from './trackTypes.js'

export type TrackEndData = {
  node: NodeData,
  guildId: string,
  player: PlayerData,
  track: PartialTrackData,
  reason?: string
}

export type TrackExceptionData = {
  node: NodeData,
  guildId: string,
  player: PlayerData,
  track: PartialTrackData,
  exception?: {
    message?: string,
    severity: 'common' | 'suspicous' | 'fault'
    cause: string
  }
}

export type TrackStuckData = {
  node: NodeData,
  guildId: string,
  player: PlayerData,
  track: PartialTrackData,
  thresholdMs?: number
}