const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events
} = require('discord.js');
const ticketConfig = require('../config/ticketconfig.json');
const dropdownConfig = require('../config/dropdownConfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('control')
        .setDescription('⚙️ Öffnet das Kontrollpanel für das Ticket'),
        

    async execute(interaction) {
        const channel = interaction.channel;

        // ✅ Überprüfen, ob der Command im Ticket-Channel genutzt wird
        const isTicketCategory = dropdownConfig.dropdownOptions.some(option => option.category === channel.parentId);

        if (!isTicketCategory) {
            return await interaction.reply({
                content: '❗ Dieser Befehl kann nur in einem Ticket-Channel verwendet werden.',
                flags: 64
            });
        }

        // 📌 Embed für das Control Panel
        const controlEmbed = new EmbedBuilder()
            .setColor(parseInt(ticketConfig.color.replace("#", ""), 16))
            .setTitle('🛠️ Ticket Control Panel')
            .setDescription('Nutze die folgenden Optionen, um dieses Ticket zu verwalten.');

        // 🖊️ Button zum Umbenennen
        const renameButton = new ButtonBuilder()
            .setCustomId('rename_ticket')
            .setLabel('📝 Ticket umbenennen')
            .setStyle(ButtonStyle.Primary);

        // ❌ Button zum Anfragen des Schließens
        const closeRequestButton = new ButtonBuilder()
            .setCustomId('close_request')
            .setLabel('🛑 Ticket schließen')
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder().addComponents(renameButton, closeRequestButton);

        // 📥 Embed und Buttons senden
        await interaction.reply({
            embeds: [controlEmbed],
            components: [actionRow],
            flags: 64
        });
    },

    // 🔘 Registrierung aller Interaktionen
    registerEvents(client) {
        // 🖊️ Modal-Interaktion für das Umbenennen
        client.on(Events.InteractionCreate, async interaction => {
            if (interaction.isModalSubmit() && interaction.customId === 'modal_rename_ticket') {
                const newTicketName = interaction.fields.getTextInputValue('new_ticket_name').trim();

                try {
                    await interaction.channel.setName(newTicketName);
                    await interaction.reply({ content: `✅ Der Ticket-Channel wurde in **${newTicketName}** umbenannt.`, flags: 64 });
                } catch (error) {
                    console.error('❌ Fehler beim Umbenennen:', error);
                    await interaction.reply({ content: '❌ Fehler beim Umbenennen des Tickets.', flags: 64 });
                }
            }
        });

        // 🔘 Button-Interaktionen
        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isButton()) return;

            const channel = interaction.channel;

            // 🖊️ Umbenennen des Tickets
            if (interaction.customId === 'rename_ticket') {
                const renameModal = new ModalBuilder()
                    .setCustomId('modal_rename_ticket')
                    .setTitle('📝 Ticket umbenennen')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('new_ticket_name')
                                .setLabel('Neuer Ticket-Name')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Neuer Name')
                                .setRequired(true)
                        )
                    );
                await interaction.showModal(renameModal);
            }

            // ❌ Close Request → Embed mit Close und Cancel Button
            else if (interaction.customId === 'close_request') {
                const ticketUserId = channel.topic?.match(/\d{17,19}/)?.[0] || interaction.user.id;

                const closeRequestEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('⚠️ Ticket-Schließung angefragt')
                    .setDescription(`❗ **<@${ticketUserId}>**, jemand möchte dieses Ticket schließen.\n\nBestätige mit dem **Close**-Button oder brich mit **Cancel** ab.`);

                const closeButton = new ButtonBuilder()
                    .setCustomId(`close_ticket_${channel.id}`)
                    .setLabel('✅ Close')
                    .setStyle(ButtonStyle.Danger);

                const cancelButton = new ButtonBuilder()
                    .setCustomId('cancel_close_request')
                    .setLabel('❌ Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const actionRow = new ActionRowBuilder().addComponents(closeButton, cancelButton);

                const message = await channel.send({
                    content: `<@${ticketUserId}>`,  // 👤 Ping den Ticket-Ersteller
                    embeds: [closeRequestEmbed],
                    components: [actionRow]
                });

                this.pendingCloseMessageId = message.id;
            }

            // ❌ Cancel Button → Löscht die Close-Request-Embed
            else if (interaction.customId === 'cancel_close_request') {
                try {
                    const messageToDelete = await interaction.channel.messages.fetch(this.pendingCloseMessageId);
                    if (messageToDelete) await messageToDelete.delete();

                    await interaction.reply({ content: '✅ Die Anfrage zum Schließen des Tickets wurde abgebrochen.', flags: 64 });
                } catch (error) {
                    console.error('❌ Fehler beim Löschen der Nachricht:', error);
                    await interaction.reply({ content: '❌ Fehler beim Abbrechen der Anfrage.', flags: 64 });
                }
            }

            // ✅ Ticket schließen (über den bereits vorhandenen Button)
            else if (interaction.customId.startsWith('close_ticket_')) {
                const channelId = interaction.customId.split('_')[2];
                try {
                    const ticketChannel = await interaction.guild.channels.fetch(channelId);

                } catch (error) {
                    console.error('❌ Fehler beim Schließen des Tickets:', error);
                    await interaction.reply({ content: '❌ Fehler beim Schließen des Tickets.', flags: 64 });
                }
            }
        });
    }
};
