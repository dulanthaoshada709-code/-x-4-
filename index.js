const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const { Boom } = require('@hapi/boom');
const { MongoClient } = require('mongodb');
const fs = require('fs-extra');
const pino = require('pino');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 7860;

// Configurations
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dulantha:dulantha123@cluster0.fbg34sx.mongodb.net/movieRequestDB';
const DB_NAME = process.env.DB_NAME || 'movieRequestDB';
const GROUP_JID = process.env.GROUP_JID || '120363405578577620@g.us';
const SESSION_ID = process.env.SESSION_ID || 'eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiTVBmbmpSRVJMY0hrcm9DdWl4bjVGKytGMnRJeFpEeFl6eHpnQWFyOEFIRT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiejNSU0d1K1gzazgvOTFqcXNlUGcwNkVoVDJPcjM0WG56Tk1wSmF3WjJ3MD0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiI2Ri9aSUxqUG1VZHl5NDc5T3RFcmdLc2U1am8vbndEdllNYzVPV3ZROVdjPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJ4SHVSa0NPbzdqL3pqcW0wc2xaK1l4SWJLNFduN0UwK0R1MngyTS84emtFPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IjhNakovWUFLK2NheCtwVmNTdHpHdFJuYm9FWjNwbjRUYVZaelJ1WVE3ME09In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6InpJaHpFM1hoekYzWTNDV2pYRmRESVJodU1zZURsRmIyYWFHQmxmc0gwME09In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoib0ZaZktVSlNQTjVETmptNmdQanNTQW9CK0JxVmhER0Izb2cyaXEzR2Ywaz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiRm9IK2xwUXZJOHMyYTBXTmhpOVA3ZnFqTThvZjYvcHRkYzBYbU5zL1prZz0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IjdwZmNiOTRSS1NlbjVhV2pGSk9IKzR5c0w4TkJGLzdjQ1VjazlRU3BScHBNeldJRkRMNENtNVFRMS9VaFFsTXI0UEo3NE1XY1pVKzYyUk9ERENEL0RRPT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6NzQsImFkdlNlY3JldEtleSI6Ikh1bER1enF6a3hRZC9rL0NFbFVwaktUdHRJRldRNDZHQTFMQStoTTYzZFk9IiwicHJvY2Vzc2VkSGlzdG9yeU1lc3NhZ2VzIjpbXSwibmV4dFByZUtleUlkIjo4MTMsImZpcnN0VW51cGxvYWRlZFByZUtleUlkIjo4MTMsImFjY291bnRTeW5jQ291bnRlciI6MCwiYWNjb3VudFNldHRpbmdzIjp7InVuYXJjaGl2ZUNoYXRzIjpmYWxzZX0sInJlZ2lzdGVyZWQiOnRydWUsInBhaXJpbmdDb2RlIjoiWUFTSVlBTUQiLCJtZSI6eyJpZCI6Ijk0NzI3NTAzNTYxOjZAcy53aGF0c2FwcC5uZXQiLCJuYW1lIjoiRHVsYW50aGEiLCJsaWQiOiIzMTIyNTA4MzMzMDc5Mzo2QGxpZCJ9LCJhY2NvdW50Ijp7ImRldGFpbHMiOiJDS3Z6dVlvR0VJbU1tTThHR0FVZ0FDZ0EiLCJhY2NvdW50U2lnbmF0dXJlS2V5Ijoid0JLbEkyN3FWaWdxUUl5NTkwZmtJZzZxV2I3SHVPa2wxeXdVU2hjbFcyWT0iLCJhY2NvdW50U2lnbmF0dXJlIjoicU5WcmpIODhoL28xcFQzZWNsQVAwY3hkUjR5OXVtMjVIU3B1dzBSbXFlQjNvQXdvclRvK1J6ZnJZSjRoSGR0S2NkMGJiOTV1UkdodTZ4Z1VHM01HQlE9PSIsImRldmljZVNpZ25hdHVyZSI6ImJnL1Q0UTM1ZXkyTVVZRVFwbHNQTzdoVGlIQVNWU0NtQllFTGpwRE5rN2NMNHFKTjVVWjFxQ3RhNTViQnRzVkNvSUJwVnUvNzhJN2FoamxJS3ZCNkJBPT0ifSwic2lnbmFsSWRlbnRpdGllcyI6W3siaWRlbnRpZmllciI6eyJuYW1lIjoiMzEyMjUwODMzMzA3OTM6NkBsaWQiLCJkZXZpY2VJZCI6MH0sImlkZW50aWZpZXJLZXkiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJCY0FTcFNOdTZsWW9La0NNdWZkSDVDSU9xbG0reDdqcEpkY3NGRW9YSlZ0bSJ9fV0sInBsYXRmb3JtIjoic21iYSIsInJvdXRpbmdJbmZvIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQ0FrSUNBZ0QifSwibGFzdEFjY291bnRTeW5jVGltZXN0YW1wIjoxNzc2NjgyNTE0fQ==';

let sock;
let mongoClient;
const sentRequests = new Set();

async function connectMongo() {
    if (!mongoClient) {
        mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
        console.log('✅ MongoDB Connected');
    }
    return mongoClient.db(DB_NAME).collection('requests');
}

async function checkAndSendNewRequests() {
    if (!sock || sock.ws.readyState !== 1) return;
    try {
        const col = await connectMongo();
        const newRequests = await col.find({ status: 'pending' }).toArray();
        
        for (const req of newRequests) {
            if (sentRequests.has(req.id)) continue;
            
            const message = `🆕 *NEW MOVIE REQUEST*\n\n🎬 *Movie:* ${req.movieName}\n📺 *Quality:* ${req.quality}\n👤 *User:* ${req.userName}\n\n*Reply 1 for COMPLETED*`;
            await sock.sendMessage(GROUP_JID, { text: message });
            sentRequests.add(req.id);
            console.log(`📤 Sent: ${req.movieName}`);
        }
    } catch (e) {
        console.error('❌ DB Error:', e.message);
    }
}

async function startBot() {
    try {
        const sessionPath = path.join(__dirname, 'session');
        await fs.ensureDir(sessionPath);

        if (SESSION_ID) {
            // YASIYA-MD= කොටස ඉවත් කර පිරිසිදු කරගනී
            const cleanID = SESSION_ID.includes('=') ? SESSION_ID.split('=')[1] : SESSION_ID;
            const decoded = Buffer.from(cleanID.trim(), 'base64').toString('utf-8');
            await fs.writeFile(path.join(sessionPath, 'creds.json'), decoded);
            console.log('✅ Session Credentials Loaded');
        }

        const { state, saveCreds } = await useMultiFileAuthState('session');

        sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Dulantha-Bot', 'Chrome', '1.0.0']
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log('✅ WhatsApp Connected!');
                setInterval(checkAndSendNewRequests, 30000);
            }
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom) ? 
                    lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
                if (shouldReconnect) startBot();
            }
        });
    } catch (error) {
        console.error('❌ Bot Error:', error);
        setTimeout(startBot, 5000);
    }
}

app.get('/', (req, res) => res.send('Bot is Running! ✅'));
app.listen(PORT, () => {
    console.log(`🌐 Server started on port ${PORT}`);
    startBot();
});
