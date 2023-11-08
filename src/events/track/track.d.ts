export type PartialTrackData = {
  identifier: string,
  isSeekable: boolean,
  author: string,
  length: number,
  isStream: boolean,
  position: number,
  title: string,
  uri: string,
  sourceName: string
}

export type TrackData = {
  encoded: string,
  info: PartialTrackData,
  pluginInfo: Object
}
