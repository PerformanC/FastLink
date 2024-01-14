# Fastlink

[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/5944/badge)](https://bestpractices.coreinfrastructure.org/projects/5944) [![Discord Server](https://img.shields.io/discord/1036045973039890522?color=5865F2&logo=discord&logoColor=white)](https://discord.gg/uPveNfTuCJ) [![FastLink.ts package size](https://packagephobia.now.sh/badge?p=@performanc/fastlink.ts)](https://packagephobia.now.sh/result?p=@performanc/fastlink.ts)

## About

FastLink.ts is a low-level [Node.js](https://nodejs.org) Lavalink client, written in TypeScript, with a simple and easy-to-use API. It is made to be fast and lightweight.

**OBS**: This is the TypeScript branch of FastLink, it diverges internally, but API usage is the same.

### Minimum requirements

- Node.js 14 or higher
- Lavalink v4

### Recommended requirements

- Node.js 18 or higher
- NodeLink

## Installation

FastLink.ts is only available on [npm](https://npmjs.com). Here's how to install it:

```bash
$ npm i @performanc/fastlink.ts
```

## Example

```ts
import fs from 'node:fs'

import FastLink from '@performanc/fastlink.ts'
import Discord from 'discord.js'

const client = new Discord.Client({
  partials: [
    Discord.Partials.Channel
  ],
  intents: [
    Discord.IntentsBitField.Flags.Guilds,
    Discord.IntentsBitField.Flags.MessageContent,
    Discord.IntentsBitField.Flags.GuildMessages,
    Discord.IntentsBitField.Flags.GuildVoiceStates
  ]
})

const prefix = '!'
const botId = 'Your bot Id here'
const token = 'Your bot token here'

const events = FastLink.node.connectNodes([{
  hostname: '127.0.0.1',
  secure: false,
  password: 'youshallnotpass',
  port: 2333
}], {
  botId,
  shards: 1,
  queue: true
})

events.on('debug', console.log)

client.on('messageCreate', async (message: Discord.Message): Promise<void> => {
  if (message.author.bot) return;

  const commandName = message.content.split(' ')[0].toLowerCase().substring(prefix.length)
  const args = message.content.split(' ').slice(1).join(' ')

  if (commandName === 'decodetrack') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    let track = await player.decodeTrack(args)

    message.channel.send(JSON.stringify(track, null, 2))

    return;
  }

  if (commandName === 'record') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    const voiceEvents = player.listen()

    voiceEvents.on('endSpeaking', (voice) => {
      const base64Voice = voice.data
      const buffer = Buffer.from(base64Voice, 'base64')

      const previousVoice = fs.readFileSync(`./voice-${message.author.id}.ogg`) || null
      fs.writeFileSync(`./voice-${message.author.id}.ogg`, previousVoice ? Buffer.concat([previousVoice, buffer]) : buffer)
    })

    message.channel.send('Started recording. Be aware: This will record everything you say in the voice channel, even if the bot is deaf. Server deaf the bot if you don\'t want to be recorded by any chances.')
  }

  if (commandName === 'stoprecord') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    player.stopListen()

    message.channel.send('Stopped recording.')
  }

  if (commandName === 'play') {
    if (!message.member.voice.channel) {
      message.channel.send('You must be in a voice channel.')

      return;
    }

    if (!FastLink.node.anyNodeAvailable()) {
      message.channel.send('There aren\'t nodes connected.')

      return;
    }

    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) player.createPlayer()

    player.connect(message.member.voice.channel.id.toString(), { mute: false, deaf: true }, (guildId, payload) => {
      client.guilds.cache.get(guildId).shard.send(payload)
    })

    const track = await player.loadTrack((args.startsWith('https://') ? '' : 'ytsearch:') + args)

    if (track.loadType === 'error') {
      message.channel.send('Something went wrong. ' + track.data.message)

      return;
    }

    if (track.loadType === 'empty') {
      message.channel.send('No matches found.')

      return;
    }

    if ([ 'playlist', 'album', 'station' ].includes(track.loadType)) {
      player.update({
        tracks: {
          encodeds: track.data.tracks.map((track) => track.encoded)
        }
      })

      message.channel.send(`Added ${track.data.tracks.length} songs to the queue, and playing ${track.data.tracks[0].info.title}.`)

      return;
    }

    if ([ 'track', 'short' ].includes(track.loadType)) {
      player.update({
        track: {
          encoded: track.data.encoded
        }
      })

      message.channel.send(`Playing ${track.data.info.title} from ${track.data.info.sourceName} from url search.`)

      return;
    }

    if (track.loadType === 'search') {
      player.update({
        track: {
          encoded: track.data[0].encoded
        }
      })

      message.channel.send(`Playing ${track.data[0].info.title} from ${track.data[0].info.sourceName} from search.`)

      return;
    }
  }

  if (commandName === 'volume') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    player.update({
      volume: parseInt(args)
    })

    message.channel.send(`Volume set to ${args}`)

    return;
  }

  if (commandName === 'pause') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    player.update({ paused: true })

    message.channel.send('Paused.')

    return;
  }

  if (commandName === 'resume') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    player.update({ paused: false })

    message.channel.send('Resumed.')

    return;
  }

  if (commandName === 'skip') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    const skip = player.skipTrack()

    if (skip) message.channel.send('Skipped the current track.')
    else message.channel.send('Could not skip the current track.')

    return;
  }

  if (commandName === 'stop') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    player.update({
      track: {
        encoded: null
      }
    })

    message.channel.send('Stopped the player.')

    return;
  }
})

client.on('raw', (data) => FastLink.other.handleRaw(data))

client.login(token)
```

## Documentation

We have a [documentation for FastLink](https://performanc.github.io/FastLinkDocs/). If you have any issue with it, please report it on GitHub Issues.

## Support

In case of any issue using it (except bugs, that should be reported on GitHub Issues), you are free to ask on PerformanC's [Discord server](https://discord.gg/uPveNfTuCJ).

## License

FastLink is licensed under PerformanC's License, which is a modified version of the MIT License, focusing on the protection of the source code and the rights of the PerformanC team over the source code.
