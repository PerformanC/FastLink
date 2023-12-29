export type PlayerUpdateData = {
  guildId: string,
  state: {
    time: number,
    position: number,
    connected: boolean,
    ping: number
  }
}