const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// ============================================
//   CONFIGURATION — PALITAN MO ITO
// ============================================
const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,         // Bot token mo
  CLIENT_ID: process.env.CLIENT_ID,         // Application ID mo
  LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID, // Channel ID kung saan mag-popost
  MIN_VALUE: 100,                            // Minimum M/s (default: 100M/s)
};

// ============================================
//   RARITY COLORS & EMOJIS
// ============================================
const RARITY = {
  'Normal':   { color: 0xb5bac1, emoji: '⚪' },
  'Uncommon': { color: 0x57f287, emoji: '🟢' },
  'Rare':     { color: 0x3498db, emoji: '🔵' },
  'Epic':     { color: 0x9b59b6, emoji: '🟣' },
  'Legendary':{ color: 0xff9900, emoji: '🟠' },
  'Gold':     { color: 0xf1c40f, emoji: '🌟' },
  'Divine':   { color: 0x00b0f4, emoji: '💎' },
  'Mythic':   { color: 0xff0000, emoji: '🔴' },
};

// ============================================
//   SLASH COMMANDS
// ============================================
const commands = [
  new SlashCommandBuilder()
    .setName('log')
    .setDescription('I-log ang isang brainrot find')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Pangalan ng brainrot').setRequired(true))
    .addNumberOption(opt =>
      opt.setName('value').setDescription('Value sa M/s (e.g. 265.6)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('rarity').setDescription('Rarity ng brainrot').setRequired(true)
        .addChoices(
          { name: '⚪ Normal', value: 'Normal' },
          { name: '🟢 Uncommon', value: 'Uncommon' },
          { name: '🔵 Rare', value: 'Rare' },
          { name: '🟣 Epic', value: 'Epic' },
          { name: '🟠 Legendary', value: 'Legendary' },
          { name: '🌟 Gold', value: 'Gold' },
          { name: '💎 Divine', value: 'Divine' },
          { name: '🔴 Mythic', value: 'Mythic' },
        ))
    .addIntegerOption(opt =>
      opt.setName('seed').setDescription('Server seed number').setRequired(false))
    .addStringOption(opt =>
      opt.setName('server').setDescription('Server link o ID').setRequired(false)),

  new SlashCommandBuilder()
    .setName('setthreshold')
    .setDescription('I-set ang minimum value para mag-post (default: 100M/s)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addNumberOption(opt =>
      opt.setName('value').setDescription('Minimum M/s value').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('I-set ang log channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel para sa logs').setRequired(true)),

  new SlashCommandBuilder()
    .setName('threshold')
    .setDescription('Tingnan ang kasalukuyang minimum value threshold'),
];

// ============================================
//   BOT CLIENT
// ============================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Per-guild settings (in-memory, pwedeng palitan ng database)
const guildSettings = new Map();

function getSettings(guildId) {
  if (!guildSettings.has(guildId)) {
    guildSettings.set(guildId, {
      minValue: CONFIG.MIN_VALUE,
      logChannelId: CONFIG.LOG_CHANNEL_ID,
    });
  }
  return guildSettings.get(guildId);
}

// ============================================
//   READY
// ============================================
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(Routes.applicationCommands(CONFIG.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
});

// ============================================
//   INTERACTION HANDLER
// ============================================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const settings = getSettings(interaction.guildId);

  // /log
  if (interaction.commandName === 'log') {
    const name    = interaction.options.getString('name');
    const value   = interaction.options.getNumber('value');
    const rarity  = interaction.options.getString('rarity');
    const seed    = interaction.options.getInteger('seed') ?? Math.floor(Math.random() * 20);
    const server  = interaction.options.getString('server') ?? 'discord.gg/nexorahub';

    // Value threshold check
    if (value < settings.minValue) {
      return interaction.reply({
        content: `❌ **Too low!** Minimum value ay **${settings.minValue}M/s**. Yung find mo ay ${value}M/s lang.`,
        ephemeral: true,
      });
    }

    const rarityData = RARITY[rarity] ?? RARITY['Normal'];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const embed = new EmbedBuilder()
      .setColor(rarityData.color)
      .setTitle(`${rarityData.emoji} ${name} ($${value}M/s)`)
      .setDescription(`**Brainrots** 🦅`)
      .addFields(
        { name: '📦 Item', value: `\`1x [${rarity}] ${name} : $${value}M/s\``, inline: false },
        { name: '🔗 Server', value: server, inline: true },
        { name: '🌱 Seed', value: `${seed}`, inline: true },
        { name: '⏰ Time', value: `Today at ${timeStr}`, inline: true },
      )
      .setFooter({ text: 'AUTO JOINER 100M • Steal a Brainrot' })
      .setTimestamp();

    // Post sa log channel
    const logChannelId = settings.logChannelId;
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }
    }

    return interaction.reply({
      content: `✅ **Logged!** ${rarityData.emoji} **${name}** ($${value}M/s) — posted sa <#${logChannelId}>`,
      ephemeral: true,
    });
  }

  // /setthreshold
  if (interaction.commandName === 'setthreshold') {
    const val = interaction.options.getNumber('value');
    settings.minValue = val;
    return interaction.reply({
      content: `✅ Minimum value threshold set to **${val}M/s**!`,
      ephemeral: true,
    });
  }

  // /setchannel
  if (interaction.commandName === 'setchannel') {
    const channel = interaction.options.getChannel('channel');
    settings.logChannelId = channel.id;
    return interaction.reply({
      content: `✅ Log channel set to ${channel}!`,
      ephemeral: true,
    });
  }

  // /threshold
  if (interaction.commandName === 'threshold') {
    return interaction.reply({
      content: `📊 Kasalukuyang minimum value threshold: **${settings.minValue}M/s**`,
      ephemeral: true,
    });
  }
});

// ============================================
//   LOGIN
// ============================================
client.login(CONFIG.TOKEN);
