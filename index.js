require('dotenv').config();
const { Client, Intents, MessageEmbed } = require('discord.js');
const fs = require('fs');
const SQLite = require('better-sqlite3');
const { default: axios } = require('axios');
const express = require('express');
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ],
    allowedMentions: {
        parse: [],
        repliedUser: false
    }
});
const app = express();
const db = new SQLite('eew.db');
const eewTable = db.prepare('SELECT count(*) FROM sqlite_master WHERE type=\'table\' AND name = \'eews\';').get();
if (!eewTable['count(*)']) {
    db.prepare('CREATE TABLE eews (id TEXT PRIMARY KEY);').run();
    db.prepare('CREATE UNIQUE INDEX idx_eews_id ON eews (id);').run();
    db.pragma('synchronous = 1');
    db.pragma('journal_mode = wal');
}
const channelId = '888014129120567316';

// app.listen(8000);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity('?eewhelp');

    // 緊急地震速報など
    setInterval(async () => {
        const rawData = await axios.get('https://api.p2pquake.net/v2/history?codes=551&limit=1');
        for (const data of rawData.data) {
            if (db.prepare('SELECT * FROM eews WHERE id = ?;').get(data.id)) continue;
            db.prepare('INSERT INTO eews VALUES (?);').run(data.id);
            switch (data.code) {
                case 551:
                    console.log('地震情報');
                    console.log(data);
                    notifyEEW(data);
                    break;
                case 552:
                    console.log('津波予報');
                    console.log(data);
                    break;
                case 554:
                    console.log('緊急地震速報');
                    console.log(data);
                    break;
                case 561:
                    console.log('地震感知');
                    console.log(data);
                    break;
                case 9611:
                    console.log('地震感知 解析結果');
                    console.log(data);

                    break;
                default:
                    break;
            }
        }
    }, 1000);
});

async function notifyEEW(data) {
    console.log(data.earthquake);
    if (data.earthquake.maxScale < 30 && data.earthquake.hypocenter.magnitude < 3.5) return;
    let i = 0;
    const embed = new MessageEmbed();
    embed.setTitle('地震情報')
        .setDescription(`${data.earthquake.time}に${data.earthquake.hypocenter.name}で地震がありました\n\n\n${data.issue.source}が${data.issue.time}に発表しました`)
        .addField('最大震度', parserScale(data.earthquake.maxScale))
        .addField('津波', parserTunami(data.earthquake.domesticTsunami))
        .addField('震源の深さ', parserDepth(data.earthquake.hypocenter.depth))
        .addField('マグニチュード', parserMagnitude(data.earthquake.hypocenter.magnitude))
        .addField('緯度', parserTude(data.earthquake.hypocenter.latitude))
        .addField('経度', parserTude(data.earthquake.hypocenter.longitude))
        .setColor('RANDOM')
        .setTimestamp();

    /*
for (const point of data.points) {
    i++;
    embed.addField(`${point.pref} ${point.addr}`, `震度 ${parserScale(point.scale)}`);
    if (i >= 25) break;
}
*/

    client.channels.cache.get(channelId).send({
        embeds: [
            embed
        ]
    })
}

function parserTunami(tunami) {
    switch (tunami) {
        case 'None':
            return 'なし';
        case 'Checking':
            return '調査中';
        case 'NonEffective':
            return '若干の海面変動が予想されますが、被害の心配はありません';
        case 'Watch':
            return '津波注意報';
        case 'Warning':
            return '津波予報有り';
        case 'WarningNearby':
            return '震源の近傍で津波の可能性があります、震源から近いところに住んでる方は注意してください';
        case 'NonEffectiveNearby':
            return '震源の近傍で小さな津波の可能性がありますが、被害の心配はありません';
        case 'WarningPacific':
            return '太平洋で津波の可能性があります、注意してください';
        case 'WarningPacificWide':
            return '太平洋の広域で津波の可能性があります、注意してください';
        case 'WarningIndian':
            return 'インド洋で津波の可能性があります';
        case 'WarningIndianWide':
            return 'インド洋の広域で津波の可能性があります';
        case 'Potential':
            return '一般にこの規模では津波の可能性があります、注意してください';
        default:
            return '不明';
    }
}

function parserScale(scale) {
    switch (scale) {
        case -1:
            return '不明または発表なし';
        case 10:
            return '震度1';
        case 20:
            return '震度2';
        case 30:
            return '震度3';
        case 40:
            return '震度4';
        case 45:
            return '震度5弱';
        case 46:
            return '震度5弱以上と推定';
        case 50:
            return '震度5強';
        case 55:
            return '震度6弱';
        case 60:
            return '震度6強';
        case 70:
            return '震度7';
    }
}

function parserMagnitude(magnitude) {
    if (magnitude === -1) return '震源情報が未発表です';
    return magnitude.toString();
}

function parserDepth(depth) {
    switch (depth) {
        case -1:
            return '震源情報が未発表です';
        case 0:
            return 'ごく浅い';
        default:
            return depth.toString();
    }
}

function parserTude(tude) {
    if (tude === -200) return '震源情報が未発表です';
    return tude.toString();
}

process.on('unhandledRejection', (reason) => {
    console.error(reason);
});

client.login()
    .catch(err => {
        console.error(err);
        process.exit(-1);
    });