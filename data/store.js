const { isJidBroadcast, isJidGroup, isJidNewsletter } = require('hunter-baileys');
const fs = require('fs/promises')
const path = require('path')
const { DATABASE } = require('../lib/database');
const storeDir = path.join(process.cwd(), 'store');

// ============ IN-MEMORY CACHE ============
const cache = {
    contacts: null,
    messages: null,
    messageCounts: null,
    metadata: null,
};

let writeQueue = {};
let writeTimers = {};

function scheduleWrite(file, data) {
    cache[file] = data;
    if (writeTimers[file]) clearTimeout(writeTimers[file]);
    writeTimers[file] = setTimeout(async () => {
        try {
            const filePath = path.join(storeDir, file);
            await fs.mkdir(storeDir, { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        } catch (e) {}
        delete writeTimers[file];
    }, 500);
}

const readJSON = async (file) => {
    if (cache[file] !== null && cache[file] !== undefined) return cache[file];
    try {
        const filePath = path.join(storeDir, file);
        const data = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(data);
        cache[file] = parsed;
        return parsed;
    } catch {
        cache[file] = [];
        return [];
    }
};

const writeJSON = async (file, data) => {
    scheduleWrite(file, data);
};

const saveContact = async (jid, name) => {
    if (!jid || !name || isJidGroup(jid) || isJidBroadcast(jid) || isJidNewsletter(jid)) return;
    const contacts = await readJSON('contact.json');
    const index = contacts.findIndex((contact) => contact.jid === jid);
    if (index > -1) {
        if (contacts[index].name === name) return;
        contacts[index].name = name;
    } else {
        contacts.push({ jid, name });
    }
    await writeJSON('contact.json', contacts);
};

const getContacts = async () => {
    try {
        return await readJSON('contact.json');
    } catch (error) {
        return [];
    }
};

const saveMessage = async (message) => {
    const jid = message.key.remoteJid;
    const id = message.key.id;
    if (!id || !jid || !message) return;
    if (message.pushName) await saveContact(message.sender || jid, message.pushName);
    const messages = await readJSON('message.json');
    const index = messages.findIndex((msg) => msg.id === id && msg.jid === jid);
    const timestamp = message.messageTimestamp ? message.messageTimestamp * 1000 : Date.now();
    if (index > -1) {
        messages[index].message = message;
        messages[index].timestamp = timestamp;
    } else {
        messages.push({ id, jid, message, timestamp });
        // Keep only the last 2000 messages to avoid unbounded growth
        if (messages.length > 2000) messages.splice(0, messages.length - 2000);
    }
    await writeJSON('message.json', messages);
};

// Fix: accept both (id) and (jid, id) call signatures
const loadMessage = async (jidOrId, msgId) => {
    const id = msgId || jidOrId;
    if (!id) return null;
    const messages = await readJSON('message.json');
    const found = messages.find((msg) => msg.id === id);
    return found ? found.message : null;
};

const getName = async (jid) => {
    const contacts = await readJSON('contact.json');
    const contact = contacts.find((contact) => contact.jid === jid);
    return contact ? contact.name : jid.split('@')[0].replace(/_/g, ' ');
};

const saveGroupMetadata = async (jid, client) => {
    if (!isJidGroup(jid)) return;
    const groupMetadata = await client.groupMetadata(jid);
    const metadata = {
        jid: groupMetadata.id,
        subject: groupMetadata.subject,
        subjectOwner: groupMetadata.subjectOwner,
        subjectTime: groupMetadata.subjectTime
            ? new Date(groupMetadata.subjectTime * 1000).toISOString()
            : null,
        size: groupMetadata.size,
        creation: groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toISOString() : null,
        owner: groupMetadata.owner,
        desc: groupMetadata.desc,
        descId: groupMetadata.descId,
        linkedParent: groupMetadata.linkedParent,
        restrict: groupMetadata.restrict,
        announce: groupMetadata.announce,
        isCommunity: groupMetadata.isCommunity,
        isCommunityAnnounce: groupMetadata.isCommunityAnnounce,
        joinApprovalMode: groupMetadata.joinApprovalMode,
        memberAddMode: groupMetadata.memberAddMode,
        ephemeralDuration: groupMetadata.ephemeralDuration,
    };

    const metadataList = await readJSON('metadata.json');
    const index = metadataList.findIndex((meta) => meta.jid === jid);
    if (index > -1) {
        metadataList[index] = metadata;
    } else {
        metadataList.push(metadata);
    }
    await writeJSON('metadata.json', metadataList);

    const participants = groupMetadata.participants.map((participant) => ({
        jid,
        participantId: participant.id,
        admin: participant.admin,
    }));
    await writeJSON(`${jid}_participants.json`, participants);
};

const getGroupMetadata = async (jid) => {
    if (!isJidGroup(jid)) return null;
    const metadataList = await readJSON('metadata.json');
    const metadata = metadataList.find((meta) => meta.jid === jid);
    if (!metadata) return null;

    const participants = await readJSON(`${jid}_participants.json`);
    return { ...metadata, participants };
};

const saveMessageCount = async (message) => {
    if (!message) return;
    const jid = message.key.remoteJid;
    const sender = message.key.participant || message.sender;
    if (!jid || !sender || !isJidGroup(jid)) return;

    const messageCounts = await readJSON('message_count.json');
    const index = messageCounts.findIndex((record) => record.jid === jid && record.sender === sender);

    if (index > -1) {
        messageCounts[index].count += 1;
    } else {
        messageCounts.push({ jid, sender, count: 1 });
    }

    await writeJSON('message_count.json', messageCounts);
};

const getInactiveGroupMembers = async (jid) => {
    if (!isJidGroup(jid)) return [];
    const groupMetadata = await getGroupMetadata(jid);
    if (!groupMetadata) return [];

    const messageCounts = await readJSON('message_count.json');
    const inactiveMembers = groupMetadata.participants.filter((participant) => {
        const record = messageCounts.find((msg) => msg.jid === jid && msg.sender === participant.id);
        return !record || record.count === 0;
    });

    return inactiveMembers.map((member) => member.id);
};

const getGroupMembersMessageCount = async (jid) => {
    if (!isJidGroup(jid)) return [];
    const messageCounts = await readJSON('message_count.json');
    const groupCounts = messageCounts
        .filter((record) => record.jid === jid && record.count > 0)
        .sort((a, b) => b.count - a.count);

    return Promise.all(
        groupCounts.map(async (record) => ({
            sender: record.sender,
            name: await getName(record.sender),
            messageCount: record.count,
        }))
    );
};

const getChatSummary = async () => {
    const messages = await readJSON('message.json');
    const distinctJids = [...new Set(messages.map((msg) => msg.jid))];

    const summaries = await Promise.all(
        distinctJids.map(async (jid) => {
            const chatMessages = messages.filter((msg) => msg.jid === jid);
            const messageCount = chatMessages.length;
            const lastMessage = chatMessages.sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            )[0];
            const chatName = isJidGroup(jid) ? jid : await getName(jid);

            return {
                jid,
                name: chatName,
                messageCount,
                lastMessageTimestamp: lastMessage ? lastMessage.timestamp : null,
            };
        })
    );

    return summaries.sort(
        (a, b) => new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp)
    );
};

const saveMessageV1 = saveMessage;
const saveMessageV2 = (message) => {
    return Promise.all([saveMessageV1(message), saveMessageCount(message)]);
};

module.exports = {
    saveContact,
    loadMessage,
    getName,
    getChatSummary,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    getInactiveGroupMembers,
    getGroupMembersMessageCount,
    saveMessage: saveMessageV2,
};
