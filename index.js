const fs = require('fs');
const path = require('path');
const {
    Client,
    Collection,
    GatewayIntentBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder 
} = require('discord.js');
const { token, clientId } = require('./config/bot');
let ticketConfig = require('./config/ticketconfig.json');
let dropdownConfig = require('./config/dropdownConfig.json');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { createTranscript } = require('discord-html-transcripts');

// Discord Client mit allen nötigen Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

const controlCommand = require('./commands/control');
controlCommand.registerEvents(client);


// Slash Commands laden
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);
let isChecking = false;

// Bot-Start und Slash-Kommandos registrieren
client.once('ready', async () => {
    try {
        console.log('🔄 Registriere globale Slash-Kommandos...');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        console.log('✅ Globale Slash-Kommandos registriert.');
        setInterval(() => checkEmbed(client), 30000);
    } catch (error) {
        console.error('❌ Fehler bei der Registrierung:', error);
    }
    console.log(`🟢 Eingeloggt als ${client.user.tag}!`);
});

// Interaktionen verarbeiten
client.on('interactionCreate', async interaction => {
    reloadDropdownConfig();

    try {
        // Slash Commands
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction);
        } else if (interaction.isButton()) {
            await handleButtonInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
            await handleModalInteraction(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenuInteraction(interaction);
        }

    } catch (error) {
        console.error("❌ Fehler bei der Interaktion:", error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❗ Ein Fehler ist aufgetreten.', flags: 64 });
        } else {
            await interaction.reply({ content: '❗ Ein Fehler ist aufgetreten.', flags: 64 });
        }
    }
});

// Button-Interaktionen
async function handleButtonInteraction(interaction) {
    if (interaction.customId === 'edit_embed') {
        const embedModal = new ModalBuilder()
            .setCustomId('modal_edit_embed')
            .setTitle('🛠️ Embed Einstellungen')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('embed_title')
                        .setLabel('Embed Titel')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('embed_description')
                        .setLabel('Embed Beschreibung')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('embed_color')
                        .setLabel('Embed Farbe (Hex)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('#FFFFFF')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('embed_channel_transcript')
                        .setLabel('Channel-ID & Transcript-ID (mit ; trennen)')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('123456789012345678 ; 987654321098765432')
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('embed_imageUrl')
                        .setLabel('Embed Bild-URL')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('https://example.com/image.png')
                        .setRequired(false)
                )
            );

        await interaction.showModal(embedModal);

    } else if (interaction.customId === 'edit_modal') {
        const modalOptions = dropdownConfig.dropdownOptions.map(option => ({
            label: option.modalName,
            description: option.description,
            value: option.value  // Dieser Wert muss mit dem Switch-Case übereinstimmen
        }));
        
        const modalDropdown = new StringSelectMenuBuilder()
            .setCustomId('select_modal')
            .setPlaceholder('🔽 Wähle ein Modal')
            .addOptions([
                ...modalOptions,
                { label: '➕ Neues Modal erstellen', description: 'Erstelle ein neues Modal', value: 'create_modal' },
                { label: '❌ Modal löschen', description: 'Lösche ein bestehendes Modal', value: 'delete_modal' }
            ]);
        
        const dropdownRow = new ActionRowBuilder().addComponents(modalDropdown);
        await interaction.reply({ content: '⚙️ Wähle ein Modal:', components: [dropdownRow], flags: 64 });
    } 
}




// Modal-Interaktionen
async function handleModalInteraction(interaction) {
    if (interaction.customId === 'modal_edit_embed') {
        const newTitle = interaction.fields.getTextInputValue('embed_title');
        const newDescription = interaction.fields.getTextInputValue('embed_description');
        const newColor = interaction.fields.getTextInputValue('embed_color');
        const channelAndTranscript = interaction.fields.getTextInputValue('embed_channel_transcript');
        const newImageUrl = interaction.fields.getTextInputValue('embed_imageUrl');

        // Channel-ID und Transcript-ID aufteilen
        const [newChannelId, newTranscriptId] = channelAndTranscript.split(';').map(value => value.trim());

        // Werte in der Config speichern
        ticketConfig.title = newTitle;
        ticketConfig.description = newDescription;
        ticketConfig.color = newColor;
        ticketConfig.channelId = newChannelId;

        // Transcript-ID speichern, falls vorhanden
        if (newTranscriptId) {
            ticketConfig.transcript = newTranscriptId;
        }

        // Bild-URL speichern, falls vorhanden
        if (newImageUrl) {
            ticketConfig.image = { url: newImageUrl };
        } else {
            ticketConfig.image = null;
        }

        fs.writeFileSync('./config/ticketconfig.json', JSON.stringify(ticketConfig, null, 4));

        await interaction.reply({ content: '✅ Embed-, Channel- und Bild-Einstellungen aktualisiert!', flags: 64 });

    } else if (interaction.customId === 'delete_modal_submit') {
        const modalNameToDelete = interaction.fields.getTextInputValue('modal_name_to_delete').trim().toLowerCase();
        const modalIndex = dropdownConfig.dropdownOptions.findIndex(option => option.modalName.toLowerCase() === modalNameToDelete);

        if (modalIndex !== -1) {
            dropdownConfig.dropdownOptions.splice(modalIndex, 1);
            fs.writeFileSync('./config/dropdownConfig.json', JSON.stringify(dropdownConfig, null, 4));
            await interaction.reply({ content: `✅ Modal '${modalNameToDelete}' wurde erfolgreich gelöscht.`, flags: 64 });
        } else {
            await interaction.reply({ content: `❗ Modal '${modalNameToDelete}' nicht gefunden.`, flags: 64 });
        }
    } else if (interaction.customId === 'create_modal_submit') {
        const label = interaction.fields.getTextInputValue('modal_label');
        const description = interaction.fields.getTextInputValue('modal_description');
        const category = interaction.fields.getTextInputValue('modal_category');

        const newModal = {
            label: label,
            description: description,
            value: label.toLowerCase().replace(/\s+/g, '_'),
            category: category,
            modalName: `${label.replace(/\s+/g, '')}Modal`
        };

        dropdownConfig.dropdownOptions.push(newModal);
        fs.writeFileSync('./config/dropdownConfig.json', JSON.stringify(dropdownConfig, null, 4));
        await interaction.reply({ content: `✅ Neues Modal '${label}' erstellt.`, flags: 64 });
    } else if (interaction.customId.startsWith('edit_modal_submit')) {
        // Ursprünglichen Value aus der CustomID auslesen
        const originalValue = interaction.customId.replace('edit_modal_submit_', '');
    
        // Neue Eingaben aus dem Modal auslesen
        const editedLabel = interaction.fields.getTextInputValue('edit_modal_label').trim();
        const editedDescription = interaction.fields.getTextInputValue('edit_modal_description').trim();
        const editedCategory = interaction.fields.getTextInputValue('edit_modal_category').trim();
    
        // Suche nach dem Modal anhand des ursprünglichen Values
        const modalIndexToEdit = dropdownConfig.dropdownOptions.findIndex(modal => modal.value === originalValue);
    
        if (modalIndexToEdit !== -1) {
            // Änderungen speichern
            dropdownConfig.dropdownOptions[modalIndexToEdit].label = editedLabel;
            dropdownConfig.dropdownOptions[modalIndexToEdit].description = editedDescription;
            dropdownConfig.dropdownOptions[modalIndexToEdit].category = editedCategory;
            dropdownConfig.dropdownOptions[modalIndexToEdit].modalName = `${editedLabel.replace(/\s+/g, '')}Modal`;
            dropdownConfig.dropdownOptions[modalIndexToEdit].value = editedLabel.toLowerCase().replace(/\s+/g, '_');
    
            // Änderungen in der Config speichern
            fs.writeFileSync('./config/dropdownConfig.json', JSON.stringify(dropdownConfig, null, 4));
    
            await interaction.reply({ content: `✅ Modal **${editedLabel}** wurde erfolgreich bearbeitet.`, flags: 64 });
        } else {
            await interaction.reply({ content: `❗ Das ursprüngliche Modal wurde nicht gefunden.`, flags: 64 });
        }
    }    
}

async function handleSelectMenuInteraction(interaction) {
    if (interaction.customId === 'select_modal') {
        const selectedValue = interaction.values[0];  // Auswahl aus dem Dropdown

        switch (selectedValue) {
            case 'create_modal':
                const createModal = new ModalBuilder()
                    .setCustomId('create_modal_submit')
                    .setTitle('Neues Modal erstellen')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('modal_label')
                                .setLabel('Label')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('modal_description')
                                .setLabel('Beschreibung')
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('modal_category')
                                .setLabel('Kategorie ID')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('1328613417854173286')
                        )
                    );
                await interaction.showModal(createModal);
                break;

            case 'delete_modal':
                const deleteModal = new ModalBuilder()
                    .setCustomId('delete_modal_submit')
                    .setTitle('Modal löschen')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('modal_name_to_delete')
                                .setLabel('Name des Modals, das gelöscht werden soll')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                                .setPlaceholder('Gib den Namen des Modals ein')
                        )
                    );
                await interaction.showModal(deleteModal);
                break;

            // 🔥 Neuer Case für das Bearbeiten
            default:
                const modalToEdit = dropdownConfig.dropdownOptions.find(modal => modal.value === interaction.values[0]);

                if (modalToEdit) {
                    const editModal = new ModalBuilder()
                        .setCustomId(`edit_modal_submit_${modalToEdit.value}`)  // Ursprünglichen Wert im CustomID speichern
                        .setTitle(`Modal bearbeiten: ${modalToEdit.label}`)
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('edit_modal_label')
                                    .setLabel('Label')
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(modalToEdit.label)
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('edit_modal_description')
                                    .setLabel('Beschreibung')
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setValue(modalToEdit.description)
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('edit_modal_category')
                                    .setLabel('Kategorie ID')
                                    .setStyle(TextInputStyle.Short)
                                    .setValue(modalToEdit.category)
                                    .setRequired(true)
                            )
                        );
                
                    await interaction.showModal(editModal);
                } else {
                    await interaction.reply({ content: '❗ Das ausgewählte Modal wurde nicht gefunden.', flags: 64 });
                }
                break;
        }
    }
}

// Embed-Überprüfung
async function checkEmbed(client) {
    if (isChecking) return;
    isChecking = true;

    try {
        const channel = await client.channels.fetch(ticketConfig.channelId);
        const message = await channel.messages.fetch(ticketConfig.ticketEmbedId);
    } catch (error) {
        console.log("❗ Embed fehlt, neues wird gesendet.");
        const channel = await client.channels.fetch(ticketConfig.channelId);
        await sendNewEmbed(channel);
    } finally {
        isChecking = false;
    }
}

// Neues Embed senden
async function sendNewEmbed(channel) {
    const embed = {
        color: parseInt(ticketConfig.color.replace("#", ""), 16),
        title: ticketConfig.title,
        description: ticketConfig.description,
        footer: { text: ticketConfig.footer },
        image: ticketConfig.image ? { url: ticketConfig.image.url } : undefined  
    };

    const dropdownMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_dropdown')
        .setPlaceholder('Bitte auswählen')
        .addOptions(dropdownConfig.dropdownOptions.map(option => ({
            label: option.label,
            description: option.description,
            value: option.value
        })));

    const actionRow = new ActionRowBuilder().addComponents(dropdownMenu);

    const sentMessage = await channel.send({ embeds: [embed], components: [actionRow] });
    ticketConfig.ticketEmbedId = sentMessage.id;
    saveTicketConfig(ticketConfig);
    console.log("✅ Embed gesendet.");
}

// Config speichern
function saveTicketConfig(config) {
    fs.writeFileSync('./config/ticketconfig.json', JSON.stringify(config, null, 4));
}

// Dropdown-Konfiguration neu laden
function reloadDropdownConfig() {
    delete require.cache[require.resolve('./config/dropdownConfig.json')];
    dropdownConfig = require('./config/dropdownConfig.json');
}


client.on('interactionCreate', async interaction => {
    // Überprüfen, ob die Interaktion innerhalb einer Gilde stattfindet
    if (!interaction.guild) {
        console.log("Die Interaktion erfolgte außerhalb eines Gildenkontexts.");
        return;  // Frühzeitige Rückkehr, um den Rest des Codes nicht auszuführen
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_dropdown') {
        const selected = interaction.values[0];
        const selectedOption = dropdownConfig.dropdownOptions.find(opt => opt.value === selected);
    
        if (selectedOption) {
            let categoryId = selectedOption.category;
    
            try {
                let categoryChannel = await interaction.guild.channels.fetch(categoryId);
                if (!categoryChannel) {
                    console.log(`❌ Kategorie mit der ID ${categoryId} existiert nicht. Erstelle eine neue Kategorie...`);
                    categoryChannel = await interaction.guild.channels.create({
                        name: `${selectedOption.modalName} Category`,
                        type: 4, // Korrekt: 4 = GUILD_CATEGORY
                    });
                    console.log(`✅ Neue Kategorie erstellt: ${categoryChannel.name}`);
                    selectedOption.category = categoryChannel.id;
                    fs.writeFileSync('./config/dropdownConfig.json', JSON.stringify(dropdownConfig, null, 4));
                }
    
                // 🛠️ Channel mit angepassten Berechtigungen erstellen
// 🛠️ Channel mit angepassten Berechtigungen erstellen
const newChannel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: 0, // 0 = Textkanal
    parent: categoryChannel.id,
    topic: `Ticket für ${selectedOption.modalName} | Ersteller: ${interaction.user.id}`,  // ➡️ User-ID im Topic
    permissionOverwrites: [
        {
            id: interaction.guild.id, // @everyone
            deny: ['ViewChannel']
        },
        {
            id: interaction.user.id, // Ticket-Ersteller
            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
        },
        {
            id: interaction.client.user.id, // Bot
            allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ManageMessages']
        }
    ]
});

    
                // ❌ Close Button für das Ticket
                const closeButton = new ButtonBuilder()
                    .setCustomId(`close_ticket_${newChannel.id}`)
                    .setLabel('Ticket schließen')
                    .setStyle(ButtonStyle.Danger);
    
                const row = new ActionRowBuilder().addComponents(closeButton);
    
                // 📩 Embed für das Ticket
                const embed = new EmbedBuilder()
                    .setColor(parseInt(ticketConfig.color.replace("#", ""), 16))
                    .setTitle("📨 Willkommen im Res-Codes-Support!")
                    .setDescription(":flag_us: **ENGLISH**\nWelcome to Res-Codes-Support! We are here to help you.\n\n" +
                                    ":flag_de: **GERMAN**\nHerzlich willkommen beim Res-Codes-Support! Wir helfen dir gerne weiter.\n\n" +
                                    `👤 | User: <@${interaction.user.id}>`)
                    .setFooter({ text: `Ticket erstellt von ${interaction.user.tag}` })
                    .setImage(ticketConfig.image ? ticketConfig.image.url : null);
    
                await newChannel.send({ embeds: [embed], components: [row] });
    
                // ✅ Bestätigung an den User
                await interaction.reply({
                    content: `✅ Dein Ticket wurde in <#${newChannel.id}> erstellt.`,
                    flags: 64
                });
    
            } catch (error) {
                console.error('❌ Fehler bei der Kanal-Erstellung:', error);
                await interaction.reply({
                    content: '❌ Es gab ein Problem bei der Erstellung des Kanals. Bitte versuche es später erneut.',
                    flags: 64
                });
            }
        } else {
            await interaction.reply({
                content: '❌ Unbekannte Auswahl. Bitte wähle eine gültige Option aus dem Dropdown.',
                flags: 64
            });
        }
    
    } else if (interaction.customId && interaction.customId.startsWith('close_ticket')) {
        const channelId = interaction.customId.split('_')[2];
        const channel = await interaction.guild.channels.fetch(channelId);
    
        // 🔍 Ticket-Ersteller aus dem Channel-Topic ermitteln
        const ticketOwnerId = channel.topic?.match(/\d{17,19}/)?.[0];
        if (!ticketOwnerId) {
            console.error("❌ Ticket-Ersteller konnte nicht ermittelt werden.");
            return await interaction.reply({ content: "❌ Fehler: Der Ticket-Ersteller konnte nicht ermittelt werden.", flags: 64 });
        }
        
        const ticketOwner = await interaction.guild.members.fetch(ticketOwnerId);        
    
        const closeEmbed = new EmbedBuilder()
            .setColor(parseInt(ticketConfig.color.replace("#", ""), 16))
            .setTitle(`Dein Ticket bei Res-Codes Bots Requests wurde geschlossen.`)
            .addFields(
                { name: '〢Ticket', value: channel.name, inline: false },
                { name: '〢Closed', value: new Date().toLocaleString("de-DE"), inline: false },
                { name: '〢Geschlossen von', value: `${interaction.user.tag}`, inline: false }
            );
    
        try {
            // 📂 Sicherstellen, dass der 'transcripts'-Ordner existiert
            const transcriptDir = path.join(__dirname, 'transcripts');
            if (!fs.existsSync(transcriptDir)) {
                fs.mkdirSync(transcriptDir);
            }
    
            // 📝 Transcript erstellen
            const transcript = await createTranscript(channel, {
                limit: -1,
                returnType: 'attachment',
                poweredBy: false,
                saveImages: true,
                footerText: "Exported {number} message{s}"
            });
    
            // 🎯 Transcript-Channel aus der ticketConfig laden
            const transcriptChannelId = ticketConfig.transcript;
            const transcriptChannel = await interaction.guild.channels.fetch(transcriptChannelId);
    
            // 📂 Transcript im festgelegten Channel hochladen
            const sentMessage = await transcriptChannel.send({
                content: `📄 Transcript für Ticket ${channel.name}`,
                files: [transcript]
            });
    
            // 📎 Download-Link für das Transcript
            const downloadURL = sentMessage.attachments.first().url;
    
            // 📥 Download-Button erstellen
            const downloadButton = new ButtonBuilder()
                .setLabel('📥 Transcript herunterladen')
                .setStyle(ButtonStyle.Link)
                .setURL(downloadURL);
    
            const actionRow = new ActionRowBuilder().addComponents(downloadButton);
    
            // 📬 Embed und Button an den Ticket-Ersteller senden
            await ticketOwner.send({
                embeds: [closeEmbed],
                components: [actionRow]
            });
    
        } catch (error) {
            console.error("❌ Fehler beim Erstellen des Transkripts:", error);
            await interaction.reply({ content: "❌ Fehler: Das Transkript konnte nicht erstellt werden.", flags: 64 });
        }
    
        // 🗑️ Ticket-Channel löschen
        await channel.delete();
    }    
});

client.login(token);