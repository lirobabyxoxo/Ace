const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const dataDir = path.join(__dirname, '..', 'data');
const painelConfigFile = path.join(dataDir, 'painelConfig.json');
const staffConfigFile = path.join(dataDir, 'staffConfig.json');
const clConfigFile = path.join(dataDir, 'clConfig.json');
const gpointsFile = path.join(dataDir, 'gpoints.json');
const gpointsConfigFile = path.join(dataDir, 'gpointsConfig.json');
const vipTestsFile = path.join(dataDir, 'vipTests.json');
const serverStatsFile = path.join(dataDir, 'server_stats.json');
const gstoreFile = path.join(dataDir, 'gstore.json');

function readJSON(file, fallback = {}) {
    try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
    return fallback;
}
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function createDashboard(discordClient) {
    const app = express();
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json());
    app.use(session({
        secret: process.env.SESSION_SECRET || 'ace-dashboard-secret-' + Date.now(),
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 24 * 60 * 60 * 1000 }
    }));
    app.use(express.static(path.join(__dirname, 'public')));

    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;
    const DEV_ID = '1427437680504864870';

    function getRedirectUri(req) {
        if (process.env.DASHBOARD_REDIRECT_URI) return process.env.DASHBOARD_REDIRECT_URI;
        const host = req.get('host') || process.env.REPLIT_DEV_DOMAIN;
        const protocol = req.get('x-forwarded-proto') || 'https';
        return `${protocol}://${host}/callback`;
    }

    app.get('/health', (req, res) => res.status(200).send('OK'));

    app.get('/api/bot-avatar', (req, res) => {
        if (discordClient.user) {
            res.json({ avatarUrl: discordClient.user.displayAvatarURL({ size: 128, extension: 'png', forceStatic: false }) });
        } else {
            res.json({ avatarUrl: '/favicon.png' });
        }
    });

    function requireAuth(req, res, next) {
        if (!req.session.user) return res.status(401).json({ error: 'Não autenticado' });
        next();
    }

    function isStaffMember(userId) {
        const data = readJSON(staffConfigFile);
        return (data.staff || []).includes(userId);
    }

    async function requireGuildAccess(req, res, next) {
        if (!req.session.user) return res.status(401).json({ error: 'Não autenticado' });
        const guildId = req.params.guildId;
        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
        if (req.session.user.id === DEV_ID) { req.isAdmin = true; return next(); }
        let member = guild.members.cache.get(req.session.user.id);
        if (!member) {
            try { member = await guild.members.fetch(req.session.user.id); } catch (e) {}
        }
        if (!member) return res.status(403).json({ error: 'Você não está neste servidor' });
        if (member.permissions.has('Administrator') || guild.ownerId === req.session.user.id) {
            req.isAdmin = true;
            return next();
        }
        if (isStaffMember(req.session.user.id)) {
            req.isAdmin = false;
            req.isStaff = true;
            return next();
        }
        return res.status(403).json({ error: 'Sem permissão' });
    }

    app.get('/auth/discord', (req, res) => {
        const redirectUri = getRedirectUri(req);
        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'identify guilds'
        });
        res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
    });

    app.get('/callback', async (req, res) => {
        const { code } = req.query;
        if (!code) return res.redirect('/');
        try {
            const redirectUri = getRedirectUri(req);
            const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri
            }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

            const { access_token } = tokenRes.data;
            const userRes = await axios.get('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            req.session.user = userRes.data;
            req.session.userGuilds = guildsRes.data;
            req.session.accessToken = access_token;
            res.redirect('/');
        } catch (e) {
            console.error('OAuth2 error:', e.response?.data || e.message);
            res.redirect('/?error=auth_failed');
        }
    });

    app.get('/auth/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/');
    });

    app.get('/api/user', (req, res) => {
        if (!req.session.user) return res.json({ authenticated: false });
        const staff = isStaffMember(req.session.user.id);
        const dev = req.session.user.id === DEV_ID;
        res.json({ authenticated: true, user: req.session.user, isStaff: staff || dev, isDev: dev });
    });

    app.get('/api/bot-guilds', (req, res) => {
        const guilds = discordClient.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ extension: 'png', size: 64, forceStatic: false }) || null,
            memberCount: g.memberCount
        }));
        guilds.sort((a, b) => b.memberCount - a.memberCount);
        res.json(guilds);
    });

    app.get('/api/guilds', requireAuth, (req, res) => {
        const botGuilds = discordClient.guilds.cache;
        const userGuilds = req.session.userGuilds || [];
        const userIsStaff = isStaffMember(req.session.user.id);
        const manageable = userGuilds.filter(ug => {
            if (!botGuilds.has(ug.id)) return false;
            if (req.session.user.id === DEV_ID) return true;
            if ((ug.permissions & 0x8) === 0x8 || ug.owner) return true;
            if (userIsStaff) return true;
            return false;
        }).map(ug => {
            const bg = botGuilds.get(ug.id);
            return {
                id: ug.id,
                name: bg.name,
                icon: bg.iconURL({ dynamic: true, size: 64 }),
                memberCount: bg.memberCount
            };
        });
        res.json(manageable);
    });

    app.get('/api/guild/:guildId/info', requireAuth, requireGuildAccess, (req, res) => {
        const guild = discordClient.guilds.cache.get(req.params.guildId);
        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 128 }),
            memberCount: guild.memberCount,
            ownerId: guild.ownerId
        });
    });

    app.get('/api/guild/:guildId/roles', requireAuth, requireGuildAccess, (req, res) => {
        const guild = discordClient.guilds.cache.get(req.params.guildId);
        const roles = guild.roles.cache
            .filter(r => r.name !== '@everyone' && !r.managed)
            .sort((a, b) => b.position - a.position)
            .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }));
        res.json(roles);
    });

    app.get('/api/guild/:guildId/channels', requireAuth, requireGuildAccess, (req, res) => {
        const guild = discordClient.guilds.cache.get(req.params.guildId);
        const channels = guild.channels.cache
            .filter(c => c.isTextBased())
            .sort((a, b) => a.position - b.position)
            .map(c => ({ id: c.id, name: c.name, type: c.type }));
        res.json(channels);
    });

    app.get('/api/config/:guildId', requireAuth, requireGuildAccess, (req, res) => {
        const guildId = req.params.guildId;
        const userRole = req.isAdmin ? 'admin' : 'staff';

        if (!req.isAdmin) {
            return res.json({ config: {}, stats: {}, serverStats: {}, userRole });
        }

        const painelData = readJSON(painelConfigFile);
        const clData = readJSON(clConfigFile);
        const gpointsConfigData = readJSON(gpointsConfigFile);
        const statsData = readJSON(serverStatsFile);

        const gpDefaults = { enabled: true, pointsPerMinuteCall: 1, pointsPerMessage: 1, messageCooldown: 30, countCallsEnabled: true };
        const defaults = {
            roles: { moderador: null, admin: null },
            channels: { logsGeral: null, logsVoz: null, logsModeracao: null, autoDelete: null, cl: null, mute: null, ban: null },
            autoDeleteTime: 0
        };
        const config = { ...defaults, ...(painelData[guildId] || {}) };
        config.roles = { ...defaults.roles, ...(config.roles || {}) };
        config.channels = { ...defaults.channels, ...(config.channels || {}) };
        config.gpoints = { ...gpDefaults, ...(gpointsConfigData[guildId] || {}) };
        config.cl = clData[guildId] || { allowedRoles: [], triggerMessage: null, limit: 100 };

        let stats = { bans: 0, mutes: 0 };
        const staffData = readJSON(staffConfigFile);
        Object.values(staffData).forEach(s => {
            if (s.stats) { stats.bans += (s.stats.bans || 0); stats.mutes += (s.stats.mutes || 0); }
        });

        let totalGpoints = 0;
        const gpData = readJSON(gpointsFile);
        const guildGP = gpData[guildId] || {};
        Object.values(guildGP).forEach(u => { totalGpoints += (u.gpoints || 0); });

        res.json({ config, stats: { ...stats, totalGpoints }, serverStats: statsData[guildId] || {}, userRole });
    });

    function requireAdmin(req, res, next) {
        if (!req.isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores' });
        next();
    }

    app.put('/api/config/:guildId/roles', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(painelConfigFile);
        if (!data[req.params.guildId]) data[req.params.guildId] = {};
        data[req.params.guildId].roles = req.body;
        writeJSON(painelConfigFile, data);
        res.json({ success: true });
    });

    app.put('/api/config/:guildId/channels', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(painelConfigFile);
        if (!data[req.params.guildId]) data[req.params.guildId] = {};
        data[req.params.guildId].channels = req.body;
        writeJSON(painelConfigFile, data);
        res.json({ success: true });
    });

    app.put('/api/config/:guildId/cl', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(clConfigFile);
        data[req.params.guildId] = req.body;
        writeJSON(clConfigFile, data);
        res.json({ success: true });
    });

    app.put('/api/config/:guildId/gpoints', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(gpointsConfigFile);
        data[req.params.guildId] = req.body;
        writeJSON(gpointsConfigFile, data);
        res.json({ success: true });
    });

    app.put('/api/config/:guildId/autodelete', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(painelConfigFile);
        if (!data[req.params.guildId]) data[req.params.guildId] = {};
        data[req.params.guildId].autoDeleteTime = req.body.time;
        writeJSON(painelConfigFile, data);
        res.json({ success: true });
    });

    app.get('/api/config/:guildId/staff/:staffId', requireAuth, requireGuildAccess, (req, res) => {
        if (!req.isAdmin && req.session.user.id !== req.params.staffId) {
            return res.status(403).json({ error: 'Você só pode acessar sua própria configuração' });
        }
        const data = readJSON(staffConfigFile);
        const staffConfig = data[req.params.staffId] || {
            ban: { title: 'Usuário Banido', description: 'O usuário foi banido.', color: '#ff0000', image: null },
            mute: { title: 'Usuário Mutado', description: 'O usuário foi mutado.', color: '#ff6600', image: null },
            stats: { bans: 0, mutes: 0, unbans: 0 }
        };
        res.json(staffConfig);
    });

    app.put('/api/config/:guildId/staff/:staffId/:type', requireAuth, requireGuildAccess, (req, res) => {
        if (!req.isAdmin && req.session.user.id !== req.params.staffId) {
            return res.status(403).json({ error: 'Você só pode editar sua própria configuração' });
        }
        const data = readJSON(staffConfigFile);
        if (!data[req.params.staffId]) data[req.params.staffId] = {
            ban: { title: 'Usuário Banido', description: 'O usuário foi banido.', color: '#ff0000', image: null },
            mute: { title: 'Usuário Mutado', description: 'O usuário foi mutado.', color: '#ff6600', image: null },
            stats: { bans: 0, mutes: 0, unbans: 0 }
        };
        data[req.params.staffId][req.params.type] = { ...data[req.params.staffId][req.params.type], ...req.body };
        writeJSON(staffConfigFile, data);
        res.json({ success: true });
    });

    app.get('/api/config/:guildId/viptests', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(vipTestsFile);
        res.json(data[req.params.guildId] || { tests: [] });
    });

    app.delete('/api/config/:guildId/viptests/:testId', requireAuth, requireGuildAccess, requireAdmin, async (req, res) => {
        const data = readJSON(vipTestsFile);
        const guildData = data[req.params.guildId] || { tests: [] };
        const testIndex = guildData.tests.findIndex(t => t.id === req.params.testId);
        if (testIndex === -1) return res.status(404).json({ error: 'Teste não encontrado' });
        const test = guildData.tests[testIndex];
        try {
            const guild = discordClient.guilds.cache.get(req.params.guildId);
            if (guild && test.testRoleId) {
                const role = guild.roles.cache.get(test.testRoleId);
                if (role) await role.delete('VIP Test removido via dashboard');
            }
        } catch (e) {}
        guildData.tests.splice(testIndex, 1);
        data[req.params.guildId] = guildData;
        writeJSON(vipTestsFile, data);
        res.json({ success: true });
    });

    app.get('/api/config/:guildId/store', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(gstoreFile, { items: [] });
        res.json(data);
    });

    app.post('/api/config/:guildId/store', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const { type, name, description, price, value } = req.body;
        if (!type || !name || !price || !value) return res.status(400).json({ error: 'Campos obrigatorios' });
        const data = readJSON(gstoreFile, { items: [] });
        if (!data.items) data.items = [];
        const item = {
            id: `${type}_${Date.now()}`,
            type,
            name,
            description: description || '',
            price: parseInt(price),
            value,
            active: true
        };
        data.items.push(item);
        writeJSON(gstoreFile, data);
        res.json({ success: true, item });
    });

    app.put('/api/config/:guildId/store/:itemId/toggle', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(gstoreFile, { items: [] });
        const item = (data.items || []).find(i => i.id === req.params.itemId);
        if (!item) return res.status(404).json({ error: 'Item nao encontrado' });
        item.active = !item.active;
        writeJSON(gstoreFile, data);
        res.json({ success: true });
    });

    app.delete('/api/config/:guildId/store/:itemId', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const data = readJSON(gstoreFile, { items: [] });
        const idx = (data.items || []).findIndex(i => i.id === req.params.itemId);
        if (idx === -1) return res.status(404).json({ error: 'Item nao encontrado' });
        data.items.splice(idx, 1);
        writeJSON(gstoreFile, data);
        res.json({ success: true });
    });

    app.get('/api/stats/:guildId', requireAuth, requireGuildAccess, requireAdmin, (req, res) => {
        const guild = discordClient.guilds.cache.get(req.params.guildId);
        const statsData = readJSON(serverStatsFile);
        const staffData = readJSON(staffConfigFile);
        const gpData = readJSON(gpointsFile);
        let stats = { bans: 0, mutes: 0, totalGpoints: 0, emojis: guild.emojis.cache.size, members: guild.memberCount };
        Object.values(staffData).forEach(s => { if (s.stats) { stats.bans += (s.stats.bans || 0); stats.mutes += (s.stats.mutes || 0); } });
        const guildGP = gpData[req.params.guildId] || {};
        Object.values(guildGP).forEach(u => { stats.totalGpoints += (u.gpoints || 0); });
        res.json({ ...stats, serverStats: statsData[req.params.guildId] || {} });
    });

    app.get('/api/user-stats', requireAuth, async (req, res) => {
        const userId = req.session.user.id;
        const gpData = readJSON(gpointsFile);
        const userGuilds = req.session.userGuilds || [];

        let totalPoints = 0;
        const boostInfo = [];

        for (const ug of userGuilds) {
            const guild = discordClient.guilds.cache.get(ug.id);
            if (!guild) continue;

            const guildGP = gpData[ug.id] || {};
            if (guildGP[userId]) {
                totalPoints += (guildGP[userId].gpoints || 0);
            }

            try {
                let member = guild.members.cache.get(userId);
                if (!member) member = await guild.members.fetch(userId).catch(() => null);
                if (member && member.premiumSince) {
                    boostInfo.push({
                        guildName: guild.name,
                        guildIcon: guild.iconURL({ extension: 'png', size: 64 }) || null,
                        since: member.premiumSince.toISOString()
                    });
                }
            } catch (e) {}
        }

        const userFlags = req.session.user.public_flags || req.session.user.flags || 0;

        const createdTimestamp = Number(BigInt(userId) >> 22n) + 1420070400000;

        res.json({
            totalPoints,
            boostInfo,
            userFlags,
            createdAt: createdTimestamp
        });
    });

    app.get('/api/user-profiles', requireAuth, async (req, res) => {
        const userId = req.session.user.id;
        const userGuilds = req.session.userGuilds || [];
        const gpData = readJSON(gpointsFile);
        const { generateProfileCard } = require('../utils/profileCard.cjs');

        const profiles = [];
        let count = 0;

        for (const ug of userGuilds) {
            if (count >= 10) break;
            const guild = discordClient.guilds.cache.get(ug.id);
            if (!guild) continue;

            let member = guild.members.cache.get(userId);
            if (!member) {
                try { member = await guild.members.fetch(userId); } catch (e) { continue; }
            }
            if (!member) continue;

            const userData = gpData[ug.id]?.[userId] || { gpoints: 0, voiceTimeSeconds: 0, messageCount: 0, equipped: {} };
            const equipped = userData.equipped || {};
            const totalSeconds = userData.voiceTimeSeconds || 0;
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);

            const guildScores = gpData[ug.id] || {};
            const sortedUsers = Object.keys(guildScores).sort((a, b) => (guildScores[b].gpoints || 0) - (guildScores[a].gpoints || 0));
            const rank = sortedUsers.indexOf(userId) + 1 || 'N/A';

            const avatarURL = member.displayAvatarURL({ extension: 'png', size: 256 });
            const displayName = member.displayName;

            let activity = null;
            if (member.presence && member.presence.activities && member.presence.activities.length > 0) {
                for (const act of member.presence.activities) {
                    if (act.type === 4) continue;
                    activity = { name: act.name, type: act.type, details: act.details || null, state: act.state || null, largeImageURL: act.assets?.largeImageURL?.({ size: 128 }) || null };
                    break;
                }
            }

            let marriageInfo = null;
            try {
                const marriagesFile = path.join(dataDir, 'marriages.json');
                if (fs.existsSync(marriagesFile)) {
                    const marriages = JSON.parse(fs.readFileSync(marriagesFile, 'utf8'));
                    for (const key in marriages) {
                        const m = marriages[key];
                        if (m.status === 'casado' && (m.user1 === userId || m.user2 === userId)) {
                            const partnerId = m.user1 === userId ? m.user2 : m.user1;
                            const diffTime = Date.now() - new Date(m.date).getTime();
                            const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            const mHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            let partnerName = partnerId;
                            try {
                                const partnerUser = await discordClient.users.fetch(partnerId).catch(() => null);
                                if (partnerUser) partnerName = partnerUser.displayName || partnerUser.username;
                            } catch (e) {}
                            marriageInfo = { partnerName, days, hours: mHours };
                            break;
                        }
                    }
                }
            } catch (e) {}

            let bfInfo = null;
            try {
                const bfFile = path.join(dataDir, 'bestfriends.json');
                if (fs.existsSync(bfFile)) {
                    const bestfriends = JSON.parse(fs.readFileSync(bfFile, 'utf8'));
                    for (const key in bestfriends) {
                        const b = bestfriends[key];
                        if (b.status === 'bf' && (b.user1 === userId || b.user2 === userId)) {
                            const bfPartnerId = b.user1 === userId ? b.user2 : b.user1;
                            const bfDays = Math.floor((Date.now() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24));
                            let bfPartnerName = bfPartnerId;
                            try {
                                const bfUser = await discordClient.users.fetch(bfPartnerId).catch(() => null);
                                if (bfUser) bfPartnerName = bfUser.displayName || bfUser.username;
                            } catch (e) {}
                            bfInfo = { partnerName: bfPartnerName, days: bfDays };
                            break;
                        }
                    }
                }
            } catch (e) {}

            try {
                const cardBuffer = await generateProfileCard({
                    username: member.user.username,
                    displayName: displayName,
                    avatarURL: avatarURL,
                    bannerURL: equipped.banner || null,
                    profileColor: equipped.color || '#FF6B00',
                    points: userData.gpoints || 0,
                    voiceTime: `${hours}h ${minutes}m`,
                    messageCount: userData.messageCount || 0,
                    rank: rank,
                    marriageInfo: marriageInfo,
                    selo: equipped.selo || null,
                    badges: [],
                    activity: activity,
                    aboutMe: userData.aboutMe || null,
                    molduraURL: equipped.moldura || null,
                    bfInfo: bfInfo
                });

                profiles.push({
                    guildName: guild.name,
                    guildIcon: guild.iconURL({ extension: 'png', size: 64 }) || null,
                    card: cardBuffer.toString('base64')
                });
                count++;
            } catch (e) {
                console.error('Profile card generation error for guild', guild.name, e.message);
            }
        }

        res.json(profiles);
    });

    const PORT = process.env.DASHBOARD_PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Dashboard rodando na porta ${PORT}`);
    });

    return app;
}

module.exports = { createDashboard };