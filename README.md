# Fastlink

[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/5944/badge)](https://bestpractices.coreinfrastructure.org/projects/5944) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/70e85894a5574ed4a227fa0072f07fe1)](https://www.codacy.com/gh/ThePedroo/FastLink/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ThePedroo/FastLink&amp;utm_campaign=Badge_Grade) [![Discord Server](https://img.shields.io/discord/948014684630560768?color=5865F2&logo=discord&logoColor=white)](https://discord.gg/ut6qxsgtME) [![FastLink package size](https://packagephobia.now.sh/badge?p=fastlink)](https://packagephobia.now.sh/result?p=fastlink)

## About

Fastlink is a NodeJs Lavalink client, with a low-level representation of the Lavalink API, with a simple and easy-to-use API.

Able to be installed in most NodeJs versions, and with low memory usage, FastLink is a good choice for your Discord bot.

## Recommendations

- NodeJs 16.6.0 or higher
- [NodeLink](https://github.com/PerformanC/NodeLink) for performance, Lavalink for filters and stability.

## Installation

You can install FastLink through npm:

```bash
$ npm i PerformanC/FastLink
```

And that's it, you'll be able to use FastLink in your project.

## Example

```js
import FastLink from 'fastlink'

const events = Lavalink.node.connectNodes([{
  hostname: '127.0.0.1',
  secure: false,
  password: 'youshallnotpass',
  port: 2333
}], {
  botId: 'Your bot Id here',
  shards: 1,
  queue: true,
  debug: true,
  opt: 'quality'
})

client.on('messageCreate', async (message) => {
  if (message.content.startsWith(prefix + 'decodetrack')) {
    const node = Lavalink.player.createPlayer(message.guild.id)

    const player = new Lavalink.player.Player(node, message.guild.id)

    let track = await player.decodeTrack(message.content.replace(prefix + 'decodetrack ', ''))

    return message.channel.send(JSON.stringify(track, null, 2))
  }
  if (message.content.startsWith(prefix + 'play')) {
    if (!message.member.voice.channel) return message.channel.send('You need to be in a voice channel to use this command.')

    const node = Lavalink.player.createPlayer(message.guild.id)

    const player = new Lavalink.player.Player(node, message.guild.id)

    player.connect(message.member.voice.channel.id.toString(), (guildId, payload) => {
      client.guilds.cache.get(guildId).shard.send(payload)
    })

    let track = await player.loadTrack((message.content.replace(prefix + 'play ', '').startsWith('https://') ? '' : 'ytsearch:') + message.content.replace(prefix + 'play ', ''))

    if (track.loadType == 'error') 
      return message.channel.send('Something went wrong. ' + track.data.message)

    if (track.loadType == 'empty')
      return message.channel.send('No matches found.')

    if (track.loadType == 'playlist') {
      player.update({ encodedTracks: track.data.tracks.map((track) => track.encoded) })

      return message.channel.send(`Added ${track.data.tracks.length} songs to the queue, and playing ${track.data.tracks[0].info.title}.`)
    }

    if (track.loadType == 'track') {
      player.update({ encodedTrack: track.data.encoded, })

      return message.channel.send(`Playing ${track.data.info.title} from ${track.data.info.sourceName} from url search.`)
    }

    if (track.loadType == 'search') {
      player.update({ encodedTrack: track.data[0].encoded })

      return message.channel.send(`Playing ${track.data[0].info.title} from ${track.data[0].info.sourceName} from search.`)
    }

    if (track.loadType == 'short') {
      player.update({ encodedTrack: track.data.encoded, })

      return message.channel.send(`Playing ${track.data.info.title} from ${track.data.info.sourceName} from shorts.`)
    }
  }
  // volume
  if (message.content.startsWith(prefix + 'volume')) {
    const player = Lavalink.player.getPlayer(message.guild.id)

    if (!player) return message.channel.send('No player found.')

    Lavalink.player.update(player, message.guild.id, {
      volume: parseInt(message.content.replace(prefix + 'volume ', ''))
    })
  }

  //pause
  if (message.content.startsWith(prefix + 'pause')) {
    const node = Lavalink.player.getPlayer(message.guild.id)

    if (!node) return message.channel.send('No player found.')

    const player = new Lavalink.player.Player(node, message.guild.id)

    player.update({ paused: true })
  }

  //resume
  if (message.content.startsWith(prefix + 'resume')) {
    const node = Lavalink.player.getPlayer(message.guild.id)

    if (!node) return message.channel.send('No player found.')

    const player = new Lavalink.player.Player(node, message.guild.id)

    player.update({ paused: false })
  }

  if (message.content.startsWith(prefix + 'skip')) {
    const node = Lavalink.player.getPlayer(message.guild.id)

    if (!node) return message.channel.send('No player found.')

    const player = new Lavalink.player.Player(node, message.guild.id)

    const skip = player.skipTrack()

    if (skip.skipped) return message.channel.send('Skipped the current track.')
    if (!skip.skipped) return message.channel.send('Could not skip the current track.')
  }

  //stop
  if (message.content.startsWith(prefix + 'stop')) {
    const node = Lavalink.player.getPlayer(message.guild.id)

    if (!node) return message.channel.send('No player found.')

    const player = new Lavalink.player.Player(node, message.guild.id)

    player.update({ encodedTrack: null })
  }
})

client.on('raw', (data) => Lavalink.other.handleRaw(data))

client.login('Your bot token here')
```

## Documentation

For now, we still don't have a documentation, but you can easily use the code above as a reference, and use Lavalink docs as a reference, since we don't have high-level methods, and we use the same function names as the Lavalink API.

## Support

In case of any issue using it (except bugs, that should be reported on GitHub Issues), you are free to ask on PerformanC's [Discord server](https://discord.gg/uPveNfTuCJ).