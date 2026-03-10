const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const vipTestsFile = path.join(dataDir, 'vipTests.json');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadVipTests(guildId) {
    try {
        if (fs.existsSync(vipTestsFile)) {
            const data = JSON.parse(fs.readFileSync(vipTestsFile, 'utf8'));
            return (data[guildId] && data[guildId].tests) || [];
        }
    } catch (error) {
        console.error('Erro ao carregar VIP Tests:', error);
    }
    return [];
}

function saveVipTests(guildId, tests) {
    try {
        let data = {};
        if (fs.existsSync(vipTestsFile)) {
            data = JSON.parse(fs.readFileSync(vipTestsFile, 'utf8'));
        }
        data[guildId] = { tests };
        fs.writeFileSync(vipTestsFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar VIP Tests:', error);
    }
}

function parseTime(str) {
    if (!str || typeof str !== 'string') return null;
    const match = str.trim().match(/^(\d+)\s*(m|min|h|hour|d|day|s|sec)s?$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case 's':
        case 'sec':
            return value * 1000;
        case 'm':
        case 'min':
            return value * 60 * 1000;
        case 'h':
        case 'hour':
            return value * 60 * 60 * 1000;
        case 'd':
        case 'day':
            return value * 24 * 60 * 60 * 1000;
        default:
            return null;
    }
}

module.exports = {
    loadVipTests,
    saveVipTests,
    parseTime
};
