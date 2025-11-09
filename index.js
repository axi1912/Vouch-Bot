require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, PermissionFlagsBits } = require('discord.js');
const db = require('./Data/db-mongo');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Contador de vouches por usuario (se puede mejorar con base de datos)
const vouchCounts = new Map();

// Definir comandos slash
const commands = [
    {
        name: 'setup-vouch',
        description: 'Setup the vouch panel'
    },
    {
        name: 'vouch',
        description: 'Leave a vouch/review',
        options: [
            {
                name: 'user',
                description: 'User you want to vouch for',
                type: 6, // USER type
                required: true
            },
            {
                name: 'rating',
                description: 'Rating (1-5 stars)',
                type: 4, // INTEGER type
                required: true,
                choices: [
                    { name: '⭐ 1 Star', value: 1 },
                    { name: '⭐⭐ 2 Stars', value: 2 },
                    { name: '⭐⭐⭐ 3 Stars', value: 3 },
                    { name: '⭐⭐⭐⭐ 4 Stars', value: 4 },
                    { name: '⭐⭐⭐⭐⭐ 5 Stars', value: 5 }
                ]
            },
            {
                name: 'reason',
                description: 'Reason for your vouch',
                type: 3, // STRING type
                required: true
            },
            {
                name: 'image',
                description: 'Image URL (optional screenshot/proof)',
                type: 3, // STRING type
                required: false
            }
        ]
    },
    {
        name: 'vouches',
        description: 'Check total vouches for a user',
        options: [
            {
                name: 'user',
                description: 'User to check vouches for',
                type: 6, // USER type
                required: false
            }
        ]
    }
];

client.once('ready', async () => {
    // Conectar a MongoDB
    await db.connectDB();
    await db.initStats();

    
    
    console.log

        console.log(`✅ Vouch Bot connected as ${client.user.tag}`);
    
    // Establecer estado de actividad
    client.user.setPresence({
        activities: [{ name: 'Reviews & Testimonials', type: 3 }], // Type 3 = WATCHING
        status: 'idle' // Idle (amarillo)
    });
    
    // Registrar comandos slash
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('📝 Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash commands registered successfully');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

// Función para crear el panel de vouches
async function setupVouchPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#FF1493')
        .setTitle('✨ LEAVE A VOUCH')
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━')
        .setThumbnail('https://cdn.discordapp.com/attachments/1309783318031503384/1436578775121920100/fau_get_2.gif')
        .addFields(
            {
                name: '\n💬 How to Leave a Vouch',
                value: 'Use the `/vouch` command to leave a review!\n\n**Example:**\n`/vouch user:@Username rating:5 reason:Bought Boost Tool all worked flawlessly`\n\n**With Screenshot:**\n`/vouch user:@Username rating:5 reason:Great service! image:https://i.imgur.com/example.png`',
                inline: false
            },
            {
                name: '\n📊 Check Vouches',
                value: 'Use `/vouches` to see total vouches for any user.\n\n**Example:**\n`/vouches user:@Username`',
                inline: false
            },
            {
                name: '\n⭐ Rating System',
                value: '**1 Star** ⭐ - Poor\n**2 Stars** ⭐⭐ - Below Average\n**3 Stars** ⭐⭐⭐ - Average\n**4 Stars** ⭐⭐⭐⭐ - Good\n**5 Stars** ⭐⭐⭐⭐⭐ - Excellent',
                inline: false
            },
            {
                name: '\n📸 Adding Screenshots',
                value: 'You can add a screenshot/proof by providing an image URL in the `image` field.\nSupported: Direct image links (imgur, discord CDN, etc.)',
                inline: false
            },
            {
                name: '\n✨ Why Vouch?',
                value: 'Help build trust in our community by sharing your experience with other members!',
                inline: false
            }
        )
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1436578775121920100/fau_get_2.gif')
        .setFooter({ text: '⭐ Vouch System • Build Trust' })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

// Función para obtener estrellas visuales
function getStars(rating) {
    const fullStar = '⭐';
    const emptyStar = '☆';
    return fullStar.repeat(rating) + emptyStar.repeat(5 - rating);
}

// Manejo de interacciones
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.replied || interaction.deferred) {
            return;
        }

        // Comandos slash
        if (interaction.isChatInputCommand()) {
            // Setup panel de vouches
            if (interaction.commandName === 'setup-vouch') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Only administrators can use this command.', 
                        ephemeral: true 
                    });
                }
                
                await interaction.reply({ content: '⏳ Creating vouch panel...', ephemeral: true });
                await setupVouchPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Vouch panel created successfully!' });
            }

            // Comando para dejar vouch
            if (interaction.commandName === 'vouch') {
                const targetUser = interaction.options.getUser('user');
                const rating = interaction.options.getInteger('rating');
                const reason = interaction.options.getString('reason');
                const imageUrl = interaction.options.getString('image');

                // Verificar que no se haga vouch a sí mismo
                if (targetUser.id === interaction.user.id) {
                    return interaction.reply({ 
                        content: '❌ You cannot vouch for yourself!', 
                        ephemeral: true 
                    });
                }

                // Verificar que el reason no sea muy corto
                if (reason.length < 10) {
                    return interaction.reply({ 
                        content: '❌ Your reason must be at least 10 characters long.', 
                        ephemeral: true 
                    });
                }

                // Incrementar contador de vouches
                const currentCount = vouchCounts.get(targetUser.id) || 0;
                const newCount = currentCount + 1;
                vouchCounts.set(targetUser.id, newCount);

                // Guardar vouch en base de datos
                db.addVouch({
                    id: Date.now(),
                    fromUserId: interaction.user.id,
                    fromUsername: interaction.user.tag,
                    toUserId: targetUser.id,
                    toUsername: targetUser.tag,
                    stars: rating,
                    comment: reason,
                    imageUrl: imageUrl,
                    createdAt: new Date().toISOString()
                });

                // Calcular tiempo hace cuánto
                const timestamp = Math.floor(Date.now() / 1000);

                // Crear embed del vouch con diseño mejorado
                const vouchEmbed = new EmbedBuilder()
                    .setColor('#FF1493') // Color rosa/magenta similar a la imagen
                    .setTitle('✨ New Vouch Recorded!')
                    .setAuthor({
                        name: `Vouch for ${targetUser.username}`,
                        iconURL: targetUser.displayAvatarURL()
                    })
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setDescription(`**Vouch**\n\n� **Seller:**\n${targetUser} (${targetUser.username})\n\n⭐ **Rating:**\n${getStars(rating)}\n\n💬 **Reason:**\n${reason}`)
                    .addFields(
                        {
                            name: '\n**User Information**',
                            value: `👤 **Vouched By:**\n${interaction.user} (${interaction.user.username})\n\n🆔 **UserID:**\n${interaction.user.id}\n\n⏰ **Timestamp:**\n<t:${timestamp}:R>\n\n🔢 **Vouch Nº** ${newCount}`,
                            inline: false
                        }
                    )
                    .setFooter({ 
                        text: `${interaction.guild.name.toUpperCase()} VOUCHES`,
                        iconURL: interaction.guild.iconURL()
                    })
                    .setTimestamp();

                // Agregar imagen si se proporcionó
                if (imageUrl) {
                    try {
                        // Validar que sea una URL válida
                        new URL(imageUrl);
                        vouchEmbed.setImage(imageUrl);
                    } catch (error) {
                        // Si no es una URL válida, ignorar
                        console.log('Invalid image URL provided');
                    }
                }

                // Enviar al canal de vouches
                if (process.env.VOUCH_CHANNEL_ID) {
                    try {
                        const vouchChannel = await interaction.guild.channels.fetch(process.env.VOUCH_CHANNEL_ID);
                        
                        await vouchChannel.send({ 
                            content: `${targetUser}`, 
                            embeds: [vouchEmbed]
                        });
                        
                        await interaction.reply({ 
                            content: `✅ Vouch submitted successfully for ${targetUser}!`, 
                            ephemeral: true 
                        });
                    } catch (error) {
                        console.error('Error sending vouch:', error);
                        await interaction.reply({ 
                            content: '❌ Could not send vouch. Please make sure the vouch channel is configured.', 
                            ephemeral: true 
                        });
                    }
                } else {
                    await interaction.reply({ 
                        content: '❌ Vouch channel not configured. Please contact an administrator.', 
                        ephemeral: true 
                    });
                }
            }

            // Comando para ver vouches
            if (interaction.commandName === 'vouches') {
                const targetUser = interaction.options.getUser('user') || interaction.user;
                const vouchCount = vouchCounts.get(targetUser.id) || 0;

                const statsEmbed = new EmbedBuilder()
                    .setColor('#00D9A3')
                    .setTitle('📊 Vouch Statistics')
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { 
                            name: '👤 User', 
                            value: `${targetUser}`, 
                            inline: true 
                        },
                        { 
                            name: '⭐ Total Vouches', 
                            value: `${vouchCount}`, 
                            inline: true 
                        }
                    )
                    .setFooter({ text: `User ID: ${targetUser.id}` })
                    .setTimestamp();

                await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
            }
        }
    } catch (error) {
        console.error('Error in interaction:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
            }
        } catch (err) {
            console.error('Error responding to error:', err);
        }
    }
});

// Manejo de errores
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Iniciar el bot
client.login(process.env.DISCORD_TOKEN);

