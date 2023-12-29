export type StatsData = {
  players: number,
  playingPlayers: number,
  uptime: number,
  memory: {
    reservable: number,
    used: number,
    free: number,
    allocated: number
  },
  cpu: {
    cores: number,
    systemLoad: number,
    lavalinkLoad: number
  },
  frameStats?: {
    sent: number,
    nulled: number,
    deficit: number
  }
}