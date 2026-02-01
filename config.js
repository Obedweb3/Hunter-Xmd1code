const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "HUNTER-XMD:~eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiRUNMOElPYklFVEdaNWhMa0hXRjlaV3Bhc1JJUHMzdkJJcklGU2xsR1YxVT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiTkJ3MWh4Sko5QkRvQnJnZnM5bXdSMXRzTDlBSjFUL3lZNC9ocEtqdk1qTT0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJFRFdBR1lFd29hcDExTnJ2VWpLS1lZcVcwV0ErQzJSY1A5aUFNTXNzcm1vPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiIxUEFHZmFWc1kwblFKekkxT2ZUdXR5dm9hTDhGbUp4eUpsaGlESGZiOTJvPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IlVCeW5Ec3pvakNXdTVxbGNiQWVhT2RCS3gycGo1NTNkTEd6c0h0aFNtMDQ9In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IldaVVcyS2J4eE1pVzlHWnpjODNoQ3ZJa09FSmhNWnJTQURLNjVmMUVraFU9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiU0VNRUNBbzdsc0R4TVNoUGYxeW94WnZYN1RuOXRvZUNUdnJVTS80ZEExZz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiZTVsaEc3UDdmaHgzcEJXTDZZZ3JMZWFacEdWd3BFRjNrQVU3K3ZaR3VqND0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6ImFmUVduc1g4cVAxT3FRaDduSk96ckEvQjVYWmdGNk5pWnNtNGVadGdMNWRkbWI3M1QwbXM3dVRMOWc4OEJialdjMWJLSzlnTHRFNmUxb1RvNDNRSWl3PT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MTY5LCJhZHZTZWNyZXRLZXkiOiJDZFREbzgzQVRIajZ6MDV2RXB5bVFlVXFxSnRYZ003Qk5YemVrQi9Yak1zPSIsInByb2Nlc3NlZEhpc3RvcnlNZXNzYWdlcyI6W10sIm5leHRQcmVLZXlJZCI6ODEzLCJmaXJzdFVudXBsb2FkZWRQcmVLZXlJZCI6ODEzLCJhY2NvdW50U3luY0NvdW50ZXIiOjAsImFjY291bnRTZXR0aW5ncyI6eyJ1bmFyY2hpdmVDaGF0cyI6ZmFsc2V9LCJyZWdpc3RlcmVkIjp0cnVlLCJwYWlyaW5nQ29kZSI6IllVUFJBREVWIiwibWUiOnsiaWQiOiIyNTQ3ODc4OTIxODM6NDdAcy53aGF0c2FwcC5uZXQiLCJsaWQiOiIxNDIwMDUxNDEyODI5MDk6NDdAbGlkIn0sImFjY291bnQiOnsiZGV0YWlscyI6IkNOenB3K1lIRUxmTi9Nc0dHQUVnQUNnQSIsImFjY291bnRTaWduYXR1cmVLZXkiOiJmRG44aXZCNHp5S1RTSFVPZ0tjMHpWUVRJS0F2YUpTL1RmMEs3eHE1L2xJPSIsImFjY291bnRTaWduYXR1cmUiOiJFMUpOVlJUeVA0Wk1Ec09QenFxbXovYU9KbEZIaXNTNTZuakJQdithODlxZkFpRlZwVEc1K1djd3dZMmt6YmxBZmo1SGRCWURYdFQrUVFxZ2M1TklBdz09IiwiZGV2aWNlU2lnbmF0dXJlIjoiSlJtUldaWnJ5ZkM4dXBTWWUrVVpidGNZZmt1amJPM0xUNnRlYXV1MEVhNEw1MExLSWdNVjRZVmtqVHFTaHJwRUwwWUpvaC9acHFJRGxEMktEaVJKaGc9PSJ9LCJzaWduYWxJZGVudGl0aWVzIjpbeyJpZGVudGlmaWVyIjp7Im5hbWUiOiIyNTQ3ODc4OTIxODM6NDdAcy53aGF0c2FwcC5uZXQiLCJkZXZpY2VJZCI6MH0sImlkZW50aWZpZXJLZXkiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJCWHc1L0lyd2VNOGlrMGgxRG9Dbk5NMVVFeUNnTDJpVXYwMzlDdThhdWY1UyJ9fV0sInBsYXRmb3JtIjoiYW5kcm9pZCIsInJvdXRpbmdJbmZvIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQ0FJSUJRZ04ifSwibGFzdEFjY291bnRTeW5jVGltZXN0YW1wIjoxNzY5OTQwNjc4LCJsYXN0UHJvcEhhc2giOiJQV2s1QiJ9",
// add your Session Id 
AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || "true",
// make true or false status auto seen
AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
// make true if you want auto reply on status 
AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || "true",
// make true if you want auto reply on status 
AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "*SEEN YOUR STATUS BY 𝐇𝐔𝐍𝐓𝐄𝐑 𝐗𝐌𝐃 PRO✔*",
// set the auto reply massage on status reply  
WELCOME: process.env.WELCOME || "true",
// true if want welcome and goodbye msg in groups    
ADMIN_EVENTS: process.env.ADMIN_EVENTS || "false",
// make true to know who dismiss or promoted a member in group
ANTI_LINK: process.env.ANTI_LINK || "true",
// make anti link true,false for groups 
MENTION_REPLY: process.env.MENTION_REPLY || "false",
// make true if want auto voice reply if someone menetion you 
MENU_IMAGE_URL: process.env.MENU_IMAGE_URL || "https://files.catbox.moe/k05k5r.jpg",
// add custom menu and mention reply image url
PREFIX: process.env.PREFIX || ".",
// add your prifix for bot   
BOT_NAME: process.env.BOT_NAME || "𝐇𝐔𝐍𝐓𝐄𝐑 𝐗𝐌𝐃 PRO",
// add bot namw here for menu
STICKER_NAME: process.env.STICKER_NAME || "𝐇𝐔𝐍𝐓𝐄𝐑 𝐗𝐌𝐃 PRO",
// type sticker pack name 
CUSTOM_REACT: process.env.CUSTOM_REACT || "false",
// make this true for custum emoji react    
CUSTOM_REACT_EMOJIS: process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍",
// chose custom react emojis by yourself 
DELETE_LINKS: process.env.DELETE_LINKS || "true",
// automatic delete links witho remove member 
OWNER_NUMBER: process.env.OWNER_NUMBER || "254701082940",
// add your bot owner number
OWNER_NAME: process.env.OWNER_NAME || "ObedTechX",
// add bot owner name
DESCRIPTION: process.env.DESCRIPTION || "*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴏʙᴇᴅᴛᴇᴄʜ*",
// add bot owner name    
ALIVE_IMG: process.env.ALIVE_IMG || "https://files.catbox.moe/k05k5r.jpg",
// add img for alive msg
LIVE_MSG: process.env.LIVE_MSG || "> Zinda Hun Yar *𝐇𝐔𝐍𝐓𝐄𝐑 𝐗𝐌𝐃 PRO*⚡",
// add alive msg here 
READ_MESSAGE: process.env.READ_MESSAGE || "false",
// Turn true or false for automatic read msgs
AUTO_REACT: process.env.AUTO_REACT || "true",
// make this true or false for auto react on all msgs
ANTI_BAD: process.env.ANTI_BAD || "true",
// false or true for anti bad words  
MODE: process.env.MODE || "public",
// make bot public-private-inbox-group 
ANTI_LINK_KICK: process.env.ANTI_LINK_KICK || "true",
// make anti link true,false for groups 
AUTO_VOICE: process.env.AUTO_VOICE || "false",
// make true for send automatic voices
AUTO_STICKER: process.env.AUTO_STICKER || "false",
// make true for automatic stickers 
AUTO_REPLY: process.env.AUTO_REPLY || "false",
// make true or false automatic text reply 
ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || "true",
// maks true for always online 
PUBLIC_MODE: process.env.PUBLIC_MODE || "true",
// make false if want private mod
AUTO_TYPING: process.env.AUTO_TYPING || "false",
// true for automatic show typing   
READ_CMD: process.env.READ_CMD || "false",
// true if want mark commands as read 
DEV: process.env.DEV || "254787892183",
//replace with your whatsapp number        
ANTI_VV: process.env.ANTI_VV || "true",
// true for anti once view 
ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "log", 
// change it to 'same' if you want to resend deleted message in same chat 
AUTO_RECORDING: process.env.AUTO_RECORDING || "true"
// make it true for auto recoding 
};
