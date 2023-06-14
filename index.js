const { GatewayIntentBits, Client, Partials } = require('discord.js');
const { config } = require('dotenv');
config();
const Replicate = require('replicate');
const mongoose = require('mongoose');
const Tokens = require('./coins.js');

const replicate = new Replicate({
  auth: process.env.API_TOKEN,
});

mongoose.connect(process.env.MONGO_URL, {}).then(() => {
  console.log('Connected to MongoDB.');
});

const {
  Guilds,
  GuildMessages,
  GuildMessageReactions,
  MessageContent,
  GuildMembers,
  GuildModeration,
} = GatewayIntentBits;
const { User, GuildMember, ThreadMember, Reaction, Message } = Partials;

const client = new Client({
  intents: [
    Guilds,
    GuildMessages,
    GuildMessageReactions,
    MessageContent,
    GuildMembers,
    GuildModeration,
  ],
  partials: [User, GuildMember, ThreadMember, Reaction, Message],
  allowedMentions: { parse: ['users'] },
});

const prefix = '!';

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(prefix)) return;
  if (message.author.bot) return;
  if (message.inGuild() === false) return;

  const args = message.content.slice(prefix.length).split(/ +/);

  if (message.content.startsWith(`${prefix}imagine`)) {
    try {
      const prompt = args.splice(1).join(' ');
      if (!prompt) {
        return message.reply('No prompt provided.');
      } else {
        let user = await Tokens.findOne({
          User: message.author.id,
        });
        if (!user) {
          message.reply(`You have no account, Creating an account...`);
          await Tokens.create({
            User: message.author.id,
            Tokens: 10000,
          });
          return;
        } else if (user) {
          if (user.Tokens <= 0) {
            return message.reply({
              content:
                'No remaining tokens. Please purchase some or wait for the monthly refresh.',
            });
          }
          await Tokens.findOneAndUpdate(
            {
              User: message.author.id,
            },
            {
              $inc: { Tokens: -500 },
            },
          );
          const model =
            'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf';
          const input = { prompt: prompt };
          const output = await replicate.run(model, { input });
          console.log(output);
          message.channel.send({
            content: `${output}`,
          });
          message.channel.send({
            content: `**__Remaining Tokens: ${user.Tokens}__**`,
          });
        }
      }
    } catch (err) {
      return console.log(err);
    }
  } else if (message.content.startsWith(`${prefix}help`)) {
    try {
      message.channel.send({
        content:
          '# Help Command\n**__Available Commands: `!imagine`, `!settings`, `!tokens [buy || remaining]`, `!chat`__**\n### Message from developer: I may make this better if I want to lol.',
      });
    } catch (err) {
      return console.log(err);
    }
  } else if (message.content.startsWith(`${prefix}tokens`)) {
    try {
      let choices = ['buy', 'remaining'];
      if(!args[0]) return;
      if (args[0] !==  "buy" || "remaining") {
        return message.reply(`Available choices: buy, remaining`);
      } else {
        if (args[0] === 'buy') {
          return message.reply(
            `Purchase tokens at [some link here]!\n# every donation helps!`,
          );
        } else {
          const user = Tokens.findOne({ User: message.author.id });
          if (user) {
            return message.reply(user.Tokens);
          } else {
            message.reply(`You have no account, Creating an account...`);
            await Tokens.create({
              User: message.author.id,
              Tokens: 10000,
            });
            return;
          }
        }
      }
    } catch (err) {
      return console.log(err);
    }
  }
});

const token = process.env.TOKEN;
client.login(token);
