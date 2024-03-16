# Fastlink

[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/5944/badge)](https://bestpractices.coreinfrastructure.org/projects/5944) [![Discord Server](https://img.shields.io/discord/1036045973039890522?color=5865F2&logo=discord&logoColor=white)](https://discord.gg/uPveNfTuCJ) [![FastLink package size](https://packagephobia.now.sh/badge?p=@performanc/fastlink)](https://packagephobia.now.sh/result?p=@performanc/fastlink)

## About

FastLink is a low-level [Node.js](https://nodejs.org) Lavalink client, with a simple and easy-to-use API. It is made to be fast and lightweight.

## Installation

FastLink is both available on [npm](https://npmjs.com) and GitHub Packages. Here's how to install it from npm:

```bash
$ npm i @performanc/fastlink
```

## Usage

### Minimum requirements

- Node.js 14 or higher
- Lavalink v4

### Recommended requirements

- Node.js 18 or higher
- NodeLink

### Example

```js
import FastLink from '@performanc/fastlink'
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

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const commandName = message.content.split(' ')[0].toLowerCase().substring(prefix.length)
  const args = message.content.split(' ').slice(1).join(' ')

  if (commandName === 'decodetrack') {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) {
      message.channel.send('No player found.')

      return;
    }

    const track = await player.decodeTrack(args)

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

    if ([ 'playlist', 'album', 'station', 'show', 'podcast', 'artist' ].includes(track.loadType)) {
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

    message.channel.send(`Volume set to ${parseInt(args)}`)

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

## Support & Feedback

If you have any questions, or only want to give a feedback, about FastLink or any other PerformanC project, join [our Discord server](https://discord.gg/uPveNfTuCJ).

## License

FastLink is licensed under [BSD 2-Clause License](LICENSE). You can read more about it on [Open Source Initiative](https://opensource.org/licenses/BSD-2-Clause).
