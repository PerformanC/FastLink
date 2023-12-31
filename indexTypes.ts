import { TrackData } from './src/events/track/trackTypes'

export type ConfigData = {
  botId?: string,
  shards?: number,
  queue?: boolean
}

export type ConfigOptions = {
  botId: string,
  shards: number,
  queue: boolean
}

export type NodeOptions = {
  hostname: string,
  password: string,
  secure: boolean,
  port: number
}

export type NodeData = {
  hostname?: string,
  password?: string,
  secure?: boolean,
  port?: number,
  connected?: boolean,
  sessionId?: string | null,
  stats?: {
    systemLoad: number,
    cores: number
  }
  players?: InternalPlayerData
}

export type InternalNodeData = {
  [key: string]: NodeData
}

export type PlayerData = {
  connected: boolean,
  playing: boolean,
  paused: boolean,
  volume: number,
  node: string,
  queue?: Array<string>,
  track?: string
}

export type InternalPlayerData = {
  [key: string]: PlayerData | null
}

export type InternalVoiceData = [{
  [key: string]: {
    server: {
      sessionId: string,
      endpoint: string,
    },
    token: string
  }
}] | {}

export type ConnectOptions = {
  deaf: boolean,
  mute: boolean
}

export type LoadTrackData = {
  loadType: 'track',
  data: TrackData
}

export type LoadShortData = {
  loadType: 'short',
  data: TrackData
}

export type LoadPlaylistData = {
  loadType: 'playlist',
  data: {
    info: {
      name: string,
      selectedTrack: number
    },
    tracks: Array<TrackData>
  }
}

export type LoadAlbumData = {
  loadType: 'album',
  data: {
    info: {
      name: string,
      selectedTrack: number
    },
    tracks: Array<TrackData>
  }
}

export type LoadArtistData = {
  loadType: 'artist',
  data: {
    info: {
      name: string,
      artworkUrl: string
    },
    tracks: Array<TrackData>
  }
}

export type LoadShowData = {
  loadType: 'show',
  data: {
    info: {
      name: string,
      selectedTrack: number
    },
    tracks: Array<TrackData>
  }
}

export type LoadPodcastData = {
  loadType: 'podcast',
  data: {
    info: {
      name: string,
      selectedTrack: number
    },
    tracks: Array<TrackData>
  }
}

export type LoadStationData = {
  loadType: 'station',
  data: {
    info: {
      name: string,
      selectedTrack: number
    },
    tracks: Array<TrackData>
  }
}

export type LoadSearchData = {
  loadType: 'search',
  data: Array<TrackData>
}

export type LoadEmptyData = {
  loadType: 'empty',
  data: {}
}

export type LoadErrorData = {
  loadType: 'error',
  data: {
    message: string,
    severity: 'common' | 'suspicious' | 'fault',
    cause: string
  }
}

type FiltersData = {
  volume?: number,
  equalizer?: Array<{
    band: number,
    gain: number
  }>,
  karaoke?: {
    level: number,
    monoLevel: number,
    filterBand: number,
    filterWidth: number
  },
  timescale?: {
    speed: number,
    pitch: number,
    rate: number
  },
  tremolo?: {
    frequency: number,
    depth: number
  },
  vibrato?: {
    frequency: number,
    depth: number
  },
  rotation?: {
    rotationHz: number
  },
  distortion?: {
    sinOffset: number,
    sinScale: number,
    cosOffset: number,
    cosScale: number,
    tanOffset: number,
    tanScale: number,
    offset: number,
    scale: number
  },
  channelMix?: {
    leftToLeft: number,
    leftToRight: number,
    rightToLeft: number,
    rightToRight: number
  },
  lowPass?: {
    smoothing: number
  },
  pluginFilters?: {
    [key: string]: any
  }
}

type VoiceData = {
  token: string,
  endpoint: string,
  sessionId: string
}

export type LyricsSData = {
  type: 'lyricsSingle',
  data: {
    name: string,
    data: string,
    rtl: boolean
  }
}

export type LyricsMData = {
  type: 'lyricsMultiple',
  data: Array<{
    name: string,
    data: string,
    rtl: boolean
  }>
}

export type UpdatePlayerData = {
  track?: {
    encoded?: string | null,
    userData?: any
  }
  identifier?: string,
  position?: number,
  endTime?: number | null,
  volume?: number,
  paused?: boolean,
  filters?: FiltersData
  voice?: VoiceData
}

export type UpdatePlayerOptions = UpdatePlayerData & {
  tracks?: {
    encodeds?: Array<string> | null,
    userData?: any
  }
}

export type PlayersData = {
  [key: string]: {
    guildId: string,
    track: TrackData,
    volume: number,
    paused: boolean,
    state: {
      time: number,
      position: number,
      connected: boolean,
      ping: number
    },
    voice: VoiceData,
    filters: FiltersData
  }
}

export type NodeInfoData = {
  version: {
    semver: string,
    major: number,
    minor: number,
    patch: number,
    preRelease: string | null,
    build: string | null
  },
  buildTime: number,
  git: {
    branch: string,
    commit: string,
    commitTime: number
  },
  jvm: string,
  lavaplayer: string,
  sourceManagers: Array<string>,
  filters: Array<string>,
  plugins: Array<{
    name: string,
    version: string
  }>
}

export type RequestStatsData = {
  players: number,
  playingPlayers: number,
  uptime: number,
  memory: {
    free: number,
    used: number,
    allocated: number,
    reservable: number
  },
  cpu: {
    cores: number,
    systemLoad: number,
    lavalinkLoad: number
  }
}

export type RouterPlannerStatusData = {
  class: 'RotatingIpRoutePlanner' | 'NanoIpRoutePlanner' | 'RotatingNanoIpRoutePlanner' | 'BalancingIpRoutePlanner' | null,
  details: {
    ipBlock: {
      type: 'Inet4Address' | 'Inet6Address',
      size: string
    },
    failingAddresses: Array<{
      failingAddress: string,
      failingTimestamp: number,
      failingTime: string
    }>,
    rotateIndex?: string,
    ipIndex?: string,
    currentAddress?: string,
    currentAddressIndex?: string,
    blockIndex?: string
  } | null
}