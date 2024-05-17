# Fastlink

[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/5944/badge)](https://bestpractices.coreinfrastructure.org/projects/5944) [![Discord Server](https://img.shields.io/discord/1036045973039890522?color=5865F2&logo=discord&logoColor=white)](https://discord.gg/uPveNfTuCJ) [![FastLink package size](https://packagephobia.now.sh/badge?p=@performanc/fastlink)](https://packagephobia.now.sh/result?p=@performanc/fastlink)

## About

FastLink is a low-level [Node.js](https://nodejs.org) [FrequenC](https://github.com/PerformanC/FrequenC) client, with a simple and easy-to-use API. It is made to be fast and lightweight.

> [!WARNING]
> FrequenC is experimental, so does FastLink. FrequenC is limited to few features and may break at any time. Use it at your own risk.

## Installation

FastLink is both available on [npm](https://npmjs.com) and GitHub Packages. Here's how to install it from npm:

```bash
$ npm i @performanc/fastlink
```

## Usage

### Minimum requirements

- Node.js 14 or higher
- FrequenC

### Recommended requirements

- Node.js 18 or higher
- FrequenC built from source

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
const botName = 'Your bot name here'
const token = 'Your bot token here'

const events = FastLink.node.connectNodes([{
  hostname: '127.0.0.1',
  secure: false,
  password: 'youshallnotpass',
  port: 2333
}], {
  botId,
  botName
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

  if (commandName === 'search') {
    if (!FastLink.node.anyNodeAvailable()) {
      message.channel.send('There aren\'t nodes connected.')

      return;
    }

    const player = new FastLink.player.Player(message.guild.id)

    if (player.playerCreated() === false) player.createPlayer()

    const track = await player.loadTrack((args.startsWith('https://') ? '' : 'ytsearch:') + args)

    /*
      {
        loadType: 'error',
        data: 'Something went wrong...'
      }
    */
    if (track.loadType === 'error') {
      message.channel.send(`Something went wrong. ${track.data}}`)

      return;
    }

    /*
      {
        loadType: 'empty'
      }
    */
    if (track.loadType === 'empty') {
      message.channel.send('No matches found.')

      return;
    }

    /*
      {
        loadType: 'playlist',
        data: {
          tracks: [
            {
              encoded: 'encoded',
              info: {
                ...
              }
            }
          ]
        }
      }
    */
    if (track.loadType === 'playlist') {
      message.channel.send(`Found ${track.data.tracks.length} tracks.`)

      return;
    }

    /*
      {
        loadType: 'track',
        data: {
          encoded: 'encoded',
          info: {
            ...
          }
        }
      }
    */
    if (track.loadType === 'track') {
      message.channel.send(`Found ${track.data.info.title} from ${track.data.info.sourceName} from url search.`)

      return;
    }

    /*
      {
        loadType: 'search',
        data: [
          {
            encoded: 'encoded',
            info: {
              ...
            }
          }
        ]
      }
    */
    if (track.loadType === 'search') {
      message.channel.send(`Found ${track.data[0].info.title} from ${track.data[0].info.sourceName} from search.`)

      return;
    }
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
