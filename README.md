# Fastlink

[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/5944/badge)](https://bestpractices.coreinfrastructure.org/projects/5944) [![Discord Server](https://img.shields.io/discord/1036045973039890522?color=5865F2&logo=discord&logoColor=white)](https://discord.gg/uPveNfTuCJ) [![FastLink package size](https://packagephobia.now.sh/badge?p=@performanc/fastlink)](https://packagephobia.now.sh/result?p=@performanc/fastlink)

## About

FastLink is a NodeJs Lavalink client, with a low-level representation of the Lavalink API, with a simple and easy-to-use API.

Able to be installed in most NodeJs versions, and with low memory usage, FastLink is a good choice for your Discord bot.

## Minimum requirements

- NodeJs 13 or higher (ES6 requirements)
- Lavalink v4.0.0 or higher

## Recommended requirements

- NodeJs 18 or higher
- NodeLink

## Installation

You can install FastLink through npm:

```bash
$ npm i @performanc/fastlink
```

And that's it, you'll be able to use FastLink in your project.

## Example

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

const events = FastLink.node.connectNodes([{
  hostname: '127.0.0.1',
  secure: false,
  password: 'youshallnotpass',
  port: 2333
}], {
  botId: 'Your bot Id here',
  shards: 1,
  queue: true
})

const prefix = '!'

events.on('debug', console.log)

client.on('messageCreate', async (message) => {
  if (message.content.startsWith(prefix + 'decodetrack')) {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() == false) {
      message.channel.send('No player found.')

      return;
    }

    let track = await player.decodeTrack(message.content.replace(prefix + 'decodetrack ', ''))

    message.channel.send(JSON.stringify(track, null, 2))

    return;
  }

  if (message.content.startsWith(prefix + 'play')) {
    if (!message.member.voice.channel) {
      message.channel.send('You must be in a voice channel.')

      return;
    }

    if (!FastLink.node.anyNodeAvailable()) {
      message.channel.send('There aren\'t nodes connected.')

      return;
    }

    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() == false) player.createPlayer()

    player.connect(message.member.voice.channel.id.toString(), { mute: false, deaf: true }, (guildId, payload) => {
      client.guilds.cache.get(guildId).shard.send(payload)
    })

    const music = message.content.replace(prefix + 'play ', '')
    const track = await player.loadTrack((music.startsWith('https://') ? '' : 'ytsearch:') + music)

    if (track.loadType == 'error') {
      message.channel.send('Something went wrong. ' + track.data.message)

      return;
    }

    if (track.loadType == 'empty') {
      message.channel.send('No matches found.')

      return;
    }

    if (track.loadType == 'playlist') {
      player.update({ encodedTracks: track.data.tracks.map((track) => track.encoded) })

      message.channel.send(`Added ${track.data.tracks.length} songs to the queue, and playing ${track.data.tracks[0].info.title}.`)

      return;
    }

    if (track.loadType == 'track' || track.loadType == 'short') {
      player.update({ encodedTrack: track.data.encoded, })

      message.channel.send(`Playing ${track.data.info.title} from ${track.data.info.sourceName} from url search.`)

      return;
    }

    if (track.loadType == 'search') {
      player.update({ encodedTrack: track.data[0].encoded })

      message.channel.send(`Playing ${track.data[0].info.title} from ${track.data[0].info.sourceName} from search.`)

      return;
    }
  }

  if (message.content.startsWith(prefix + 'volume')) {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() == false) {
      message.channel.send('No player found.')

      return;
    }

    player.update({
      volume: parseInt(message.content.replace(prefix + 'volume ', ''))
    })

    message.channel.send(`Volume set to ${message.content.replace(prefix + 'volume ', '')}`)

    return;
  }

  if (message.content.startsWith(prefix + 'pause')) {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() == false) {
      message.channel.send('No player found.')

      return;
    }

    player.update({ paused: true })

    message.channel.send('Paused.')

    return;
  }

  if (message.content.startsWith(prefix + 'resume')) {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() == false) {
      message.channel.send('No player found.')

      return;
    }

    player.update({ paused: false })

    message.channel.send('Resumed.')

    return;
  }

  if (message.content.startsWith(prefix + 'skip')) {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() == false) {
      message.channel.send('No player found.')

      return;
    }

    const skip = player.skipTrack()

    if (skip) message.channel.send('Skipped the current track.')
    else message.channel.send('Could not skip the current track.')

    return;
  }

  if (message.content.startsWith(prefix + 'stop')) {
    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() == false) {
      message.channel.send('No player found.')

      return;
    }

    player.update({ encodedTrack: null })

    message.channel.send('Stopped the player.')

    return;
  }
})

client.on('raw', (data) => FastLink.other.handleRaw(data))

client.login('Your bot token here')
```

## Documentation

We have a documentation for FastLink, you can find it [here](https://performanc.github.io/FastLinkDocs/). If you have any issue with it, please report it on GitHub Issues.

## Support

In case of any issue using it (except bugs, that should be reported on GitHub Issues), you are free to ask on PerformanC's [Discord server](https://discord.gg/uPveNfTuCJ).

## License

FastLink is licensed under PerformanC's custom license, which is a modified version of the MIT license. You can find it [here](README.md)

The license is made to protect PerformanC's software(s) and to prevent people from stealing our code. You are free to use FastLink in your projects, but you are not allowed to get any part of the code without our permission. You are also not allowed to remove the license from the project.
