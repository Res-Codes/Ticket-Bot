const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Zeigt die aktuelle Konfiguration der Ticket-Einstellungen.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),  // Nur Admins!

    async execute(interaction) {
        // ✅ Überprüfen, ob der Benutzer Administrator ist
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return await interaction.reply({
                content: '❌ Du hast keine Berechtigung, diesen Befehl auszuführen.',
                ephemeral: true  // Nur für den Benutzer sichtbar
            });
        }

        const ticketConfig = require('../config/ticketconfig.json');
        const dropdownConfig = require('../config/dropdownConfig.json');
        const color = parseInt(ticketConfig.color.replace("#", ""), 16);

        const dropdownDetails = dropdownConfig.dropdownOptions.map(option =>
            `**Modal Name:** ${option.modalName}\n**Beschreibung:** ${option.description}`
        ).join('\n\n');

        const configEmbed = {
            color: color,
            title: '📋 Ticket-System Konfiguration',
            description: 'Hier sind die aktuellen Einstellungen für das Ticket-System:',
            fields: [
                { name: '📂 **Channel ID**', value: ticketConfig.channelId, inline: true },
                { name: '📂 **Transcript ID**', value: ticketConfig.transcript, inline: true },
                { name: '📝 **Ticket Embed ID**', value: ticketConfig.ticketEmbedId || 'Nicht gesetzt', inline: true },
                { name: '🎨 **Farbe**', value: ticketConfig.color, inline: false },
                { name: '🏷️ **Titel**', value: ticketConfig.title, inline: false },
                { name: '🖊️ **Beschreibung**', value: ticketConfig.description, inline: false },
                { name: '📎 **Footer**', value: ticketConfig.footer, inline: false },
                { 
                    name: '🔽 __**Dropdown-Menü Optionen**__',
                    value: dropdownDetails || 'Keine Dropdown-Optionen gefunden.',
                    inline: false
                }
            ]
        };

        // Button für Modal-Einstellungen
        const modalButton = new ButtonBuilder()
            .setCustomId('edit_modal')
            .setLabel('📂 Modal Einstellungen')
            .setStyle(ButtonStyle.Secondary);
        
        // Button für Embed-Einstellungen
        const embedButton = new ButtonBuilder()
            .setCustomId('edit_embed')
            .setLabel('🛠️ Embed Einstellungen')
            .setStyle(ButtonStyle.Secondary);

        // ActionRow für die Buttons
        const actionRow = new ActionRowBuilder().addComponents(modalButton, embedButton);

        await interaction.reply({ embeds: [configEmbed], components: [actionRow] });
    }
};
