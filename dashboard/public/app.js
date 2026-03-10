function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(async function loadBotAvatar() {
    try {
        const res = await fetch('/api/bot-avatar');
        if (res.ok) {
            const data = await res.json();
            if (data.avatarUrl) {
                document.querySelectorAll('.login-avatar img, .sidebar-logo, .top-nav-logo').forEach(img => {
                    img.src = data.avatarUrl;
                });
            }
        }
    } catch (e) {}
})();

let currentGuild = null;
let currentSection = 'overview';
let currentEmbedType = 'ban';
let guildRoles = [];
let guildChannels = [];
let configData = null;
let userIsAdmin = true;
let currentTab = 'inicio';
let cachedUser = null;
let clockInterval = null;

async function api(url, options = {}) {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
    if (res.status === 401) { window.location.href = '/auth/discord'; return null; }
    if (res.status === 403) return null;
    return res.json();
}

function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    setTimeout(() => el.className = 'toast', 3000);
}

function animateValue(el, start, end, duration) {
    if (start === end) { el.textContent = end; return; }
    const range = end - start;
    const startTime = performance.now();
    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + range * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.top-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.top-tab[data-tab="${tab}"]`).classList.add('active');

    document.querySelectorAll('.page-container').forEach(p => p.style.display = 'none');
    document.getElementById(`page-${tab}`).style.display = '';

    if (tab === 'inicio') loadInicio();
    if (tab === 'perfil') loadPerfil();
}

async function init() {
    const user = await api('/api/user');
    if (!user || !user.authenticated) {
        document.getElementById('login-screen').style.display = '';
        document.getElementById('app-screen').style.cssText = 'display:none !important;';
        return;
    }
    cachedUser = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.cssText = '';

    const avatar = user.user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.user.id}/${user.user.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.user.discriminator || '0') % 5}.png`;
    document.getElementById('user-info').innerHTML = `<img src="${esc(avatar)}"><span>${esc(user.user.username)}</span>`;

    userIsAdmin = user.isDev || false;

    document.querySelectorAll('.top-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    const guilds = await api('/api/guilds');
    const selector = document.getElementById('guild-selector');
    if (!guilds || guilds.length === 0) {
        selector.innerHTML = '<div class="empty-state">Nenhum servidor disponivel</div>';
    } else {
        selector.innerHTML = guilds.map(g => `
            <div class="guild-item" onclick="selectGuild('${esc(g.id)}')" id="guild-${esc(g.id)}">
                <img src="${esc(g.icon) || 'https://cdn.discordapp.com/embed/avatars/0.png'}">
                <span>${esc(g.name)}</span>
            </div>
        `).join('');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
        });
    });

    document.getElementById('nav-menu').style.display = '';

    const adminSectionsInit = ['overview', 'roles', 'channels', 'cl', 'gpoints', 'viptests', 'store', 'autodelete', 'embeds'];
    document.querySelectorAll('.nav-link').forEach(link => {
        const section = link.dataset.section;
        if (adminSectionsInit.includes(section)) {
            link.parentElement.style.display = 'none';
        }
    });
    updateCategoryVisibility();

    switchTab('inicio');
}

function getClockText() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');

    const dias = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
    const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const dia = dias[now.getDay()];
    const dd = now.getDate();
    const mes = meses[now.getMonth()];

    return { time: `${h}:${m}`, date: `${dia}, ${dd} de ${mes}` };
}

function updateClock() {
    const { time, date } = getClockText();
    const clockEl = document.querySelector('.welcome-clock');
    const dateEl = document.querySelector('.welcome-date');
    if (clockEl) clockEl.textContent = time;
    if (dateEl) dateEl.textContent = date;
}

function getUserBadgesFromFlags(flags) {
    const badges = [];
    const flagMap = [
        { flag: 1 << 0, name: 'Staff', color: '#5865F2' },
        { flag: 1 << 1, name: 'Partner', color: '#5865F2' },
        { flag: 1 << 2, name: 'HypeSquad Events', color: '#F47B67' },
        { flag: 1 << 3, name: 'Bug Hunter Lv1', color: '#3BA55D' },
        { flag: 1 << 6, name: 'HypeSquad Bravery', color: '#9B59B6' },
        { flag: 1 << 7, name: 'HypeSquad Brilliance', color: '#E74C3C' },
        { flag: 1 << 8, name: 'HypeSquad Balance', color: '#2ECC71' },
        { flag: 1 << 9, name: 'Early Supporter', color: '#5865F2' },
        { flag: 1 << 14, name: 'Bug Hunter Lv2', color: '#F5AB2E' },
        { flag: 1 << 17, name: 'Verified Bot Dev', color: '#5865F2' },
        { flag: 1 << 22, name: 'Active Developer', color: '#248046' }
    ];
    for (const f of flagMap) {
        if ((flags & f.flag) === f.flag) badges.push(f);
    }
    return badges;
}

async function loadInicio() {
    if (!cachedUser) return;
    const user = cachedUser.user;

    const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator || '0') % 5}.png`;

    const { time, date } = getClockText();

    document.getElementById('welcome-card').innerHTML = `
        <div class="welcome-left">
            <img src="${esc(avatar)}" class="welcome-avatar">
            <div class="welcome-text">
                <h2>Bem-vindo, ${esc(user.global_name || user.username)}</h2>
                <p>@${esc(user.username)}</p>
            </div>
        </div>
        <div class="welcome-right">
            <div class="welcome-clock">${esc(time)}</div>
            <div class="welcome-date">${esc(date)}</div>
        </div>
    `;

    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(updateClock, 30000);

    const stats = await api('/api/user-stats');
    if (!stats) return;

    const createdDate = new Date(stats.createdAt);
    const createdStr = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
    const daysSince = Math.floor((Date.now() - stats.createdAt) / (1000 * 60 * 60 * 24));

    document.getElementById('inicio-stats').innerHTML = `
        <div class="inicio-stat-card">
            <div class="inicio-stat-label">Total Points</div>
            <div class="inicio-stat-value" data-target="${stats.totalPoints}">0</div>
            <div class="inicio-stat-sub">Em todos os servidores</div>
        </div>
        <div class="inicio-stat-card">
            <div class="inicio-stat-label">Conta Criada</div>
            <div class="inicio-stat-value" style="font-size:1.1rem;">${esc(createdStr)}</div>
            <div class="inicio-stat-sub">${daysSince} dias atras</div>
        </div>
        <div class="inicio-stat-card">
            <div class="inicio-stat-label">Boosts Ativos</div>
            <div class="inicio-stat-value" data-target="${stats.boostInfo.length}">0</div>
            <div class="inicio-stat-sub">${stats.boostInfo.length === 1 ? '1 servidor' : stats.boostInfo.length + ' servidores'}</div>
        </div>
    `;

    document.querySelectorAll('.inicio-stat-value[data-target]').forEach((el, i) => {
        const target = parseInt(el.dataset.target) || 0;
        setTimeout(() => animateValue(el, 0, target, 800), i * 100);
    });

    const userBadges = getUserBadgesFromFlags(stats.userFlags);
    const badgesSection = document.getElementById('inicio-badges-section');
    const badgesContainer = document.getElementById('badges-showcase');

    if (userBadges.length > 0) {
        badgesSection.style.display = '';
        badgesContainer.innerHTML = userBadges.map(b =>
            `<div class="badge-item"><span class="badge-dot" style="background:${b.color}"></span>${esc(b.name)}</div>`
        ).join('');
    } else {
        badgesSection.style.display = 'none';
    }

    const boostSection = document.getElementById('inicio-boost-section');
    const boostList = document.getElementById('boost-list');

    if (stats.boostInfo.length > 0) {
        boostSection.style.display = '';
        boostList.innerHTML = stats.boostInfo.map(b => {
            const since = new Date(b.since);
            const days = Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
            return `
                <div class="boost-item">
                    <img src="${esc(b.guildIcon) || 'https://cdn.discordapp.com/embed/avatars/0.png'}" class="boost-item-icon">
                    <div class="boost-item-info">
                        <div class="boost-item-name">${esc(b.guildName)}</div>
                        <div class="boost-item-since">Boostando ha ${days} dias</div>
                    </div>
                </div>`;
        }).join('');
    } else {
        boostSection.style.display = 'none';
    }
}

async function loadPerfil() {
    const grid = document.getElementById('perfil-grid');
    grid.innerHTML = '<div class="empty-state">Carregando perfis...</div>';

    const profiles = await api('/api/user-profiles');
    if (!profiles || profiles.length === 0) {
        grid.innerHTML = '<div class="empty-state">Nenhum perfil encontrado nos servidores compartilhados.</div>';
        return;
    }

    grid.innerHTML = profiles.map(p => `
        <div class="perfil-card-wrapper">
            <img src="data:image/png;base64,${p.card}" class="perfil-card-img" alt="${esc(p.guildName)}">
            <div class="perfil-card-label">${esc(p.guildName)}</div>
        </div>
    `).join('');
}

async function selectGuild(guildId) {
    currentGuild = guildId;
    document.querySelectorAll('.guild-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`guild-${guildId}`).classList.add('active');
    document.getElementById('nav-menu').style.display = '';
    document.getElementById('no-guild').style.display = 'none';

    const [roles, channels, config] = await Promise.all([
        api(`/api/guild/${guildId}/roles`),
        api(`/api/guild/${guildId}/channels`),
        api(`/api/config/${guildId}`)
    ]);
    guildRoles = roles || [];
    guildChannels = channels || [];
    configData = config;

    userIsAdmin = config && config.userRole === 'admin';

    const adminSections = ['overview', 'roles', 'channels', 'cl', 'gpoints', 'viptests', 'store', 'autodelete'];
    document.querySelectorAll('.nav-link').forEach(link => {
        const section = link.dataset.section;
        if (section === 'embeds') {
            link.parentElement.style.display = '';
        } else if (adminSections.includes(section)) {
            link.parentElement.style.display = userIsAdmin ? '' : 'none';
        }
    });
    updateCategoryVisibility();

    if (userIsAdmin) {
        populateRoles();
        populateChannels();
        populateCL();
        populateGPoints();
        populateAutoDelete();
        showSection('overview');
    } else {
        showSection('embeds');
    }
}

function updateCategoryVisibility() {
    document.querySelectorAll('.nav-category').forEach(cat => {
        const category = cat.dataset.category;
        const items = document.querySelectorAll(`li[data-category="${category}"]:not(.nav-category)`);
        const anyVisible = Array.from(items).some(li => li.style.display !== 'none');
        cat.style.display = anyVisible ? '' : 'none';
    });
}

function showSection(section) {
    currentSection = section;
    document.querySelectorAll('.section').forEach(el => {
        el.style.display = 'none';
        el.style.animation = 'none';
    });
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) {
        sectionEl.style.display = '';
        sectionEl.style.animation = 'fadeInUp 0.35s ease-out';
    }
    const navEl = document.querySelector(`[data-section="${section}"]`);
    if (navEl) navEl.classList.add('active');

    if (section === 'overview' && userIsAdmin) loadOverview();
    if (section === 'embeds') loadEmbeds();
    if (section === 'viptests' && userIsAdmin) loadVipTests();
    if (section === 'store' && userIsAdmin) loadStore();
}

async function loadServersCarousel() {
    const carousel = document.getElementById('servers-carousel');
    if (!carousel) return;

    try {
        const res = await fetch('/api/bot-guilds');
        const guilds = await res.json();

        if (!guilds || guilds.length === 0) {
            carousel.innerHTML = '<div class="carousel-empty">Nenhum servidor encontrado</div>';
            return;
        }

        const cardsHtml = guilds.map(g => {
            const icon = g.icon || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const initial = g.name ? g.name.charAt(0).toUpperCase() : '?';
            return `
                <div class="carousel-card">
                    <div class="carousel-card-icon">
                        <img src="${esc(icon)}" alt="${esc(g.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                        <div class="carousel-card-initial" style="display:none">${esc(initial)}</div>
                    </div>
                    <div class="carousel-card-name">${esc(g.name)}</div>
                    <div class="carousel-card-members">${g.memberCount} membros</div>
                </div>`;
        }).join('');

        carousel.innerHTML = cardsHtml;
    } catch (e) {
        carousel.innerHTML = '<div class="carousel-empty">Erro ao carregar servidores</div>';
    }
}

async function loadOverview() {
    if (!currentGuild) return;
    const stats = await api(`/api/stats/${currentGuild}`);
    if (!stats) return;
    document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card"><div class="value" data-target="${stats.members}">0</div><div class="label">Membros</div></div>
        <div class="stat-card"><div class="value" data-target="${stats.bans}">0</div><div class="label">Bans Totais</div></div>
        <div class="stat-card"><div class="value" data-target="${stats.mutes}">0</div><div class="label">Mutes Totais</div></div>
        <div class="stat-card"><div class="value" data-target="${stats.emojis}">0</div><div class="label">Emojis</div></div>
        <div class="stat-card"><div class="value" data-target="${stats.totalGpoints}">0</div><div class="label">Points Total</div></div>
    `;
    document.querySelectorAll('.stat-card .value').forEach((el, i) => {
        const target = parseInt(el.dataset.target) || 0;
        setTimeout(() => animateValue(el, 0, target, 800), i * 100);
    });
}

function roleOption(id, selected) {
    const opt = `<option value="">Nenhum</option>` + guildRoles.map(r =>
        `<option value="${r.id}" ${r.id === selected ? 'selected' : ''}>${esc(r.name)}</option>`
    ).join('');
    return opt;
}

function channelOption(selected) {
    return `<option value="">Nenhum</option>` + guildChannels.map(c =>
        `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>#${esc(c.name)}</option>`
    ).join('');
}

function populateRoles() {
    if (!configData) return;
    const r = configData.config.roles || {};
    document.getElementById('role-moderador').innerHTML = roleOption('role-moderador', r.moderador);
    document.getElementById('role-admin').innerHTML = roleOption('role-admin', r.admin);
}

function populateChannels() {
    if (!configData) return;
    const c = configData.config.channels || {};
    const labels = {
        logsGeral: 'Logs Gerais', logsVoz: 'Logs de Voz', logsModeracao: 'Logs de Moderacao',
        autoDelete: 'Auto-Delete', cl: 'CL', mute: 'Mute', ban: 'Ban'
    };
    const grid = document.getElementById('channels-grid');
    grid.innerHTML = Object.entries(labels).map(([key, label]) => `
        <div class="form-group">
            <label>${esc(label)}</label>
            <select id="channel-${key}" class="form-select">${channelOption(c[key])}</select>
        </div>
    `).join('');
}

function populateCL() {
    if (!configData) return;
    const cl = configData.config.cl || {};
    document.getElementById('cl-trigger').value = cl.triggerMessage || '';
    document.getElementById('cl-limit').value = cl.limit || 100;
    const rolesSelect = document.getElementById('cl-roles');
    rolesSelect.innerHTML = guildRoles.map(r =>
        `<option value="${r.id}" ${(cl.allowedRoles || []).includes(r.id) ? 'selected' : ''}>${esc(r.name)}</option>`
    ).join('');
}

function populateGPoints() {
    if (!configData) return;
    const gp = configData.config.gpoints || {};
    document.getElementById('gpoints-enabled').checked = gp.enabled !== false;
    document.getElementById('gpoints-calls').checked = gp.countCallsEnabled !== false;
    document.getElementById('gpoints-perminute').value = gp.pointsPerMinuteCall || 1;
    document.getElementById('gpoints-permsg').value = gp.pointsPerMessage || 1;
    document.getElementById('gpoints-cooldown').value = gp.messageCooldown || 30;
}

function populateAutoDelete() {
    if (!configData) return;
    document.getElementById('autodelete-time').value = configData.config.autoDeleteTime || 0;
}

async function saveRoles() {
    const data = {
        moderador: document.getElementById('role-moderador').value || null,
        admin: document.getElementById('role-admin').value || null
    };
    const res = await api(`/api/config/${currentGuild}/roles`, { method: 'PUT', body: JSON.stringify(data) });
    if (res?.success) toast('Cargos salvos!', 'success');
    else toast('Erro ao salvar', 'error');
}

async function saveChannels() {
    const keys = ['logsGeral', 'logsVoz', 'logsModeracao', 'autoDelete', 'cl', 'mute', 'ban'];
    const data = {};
    keys.forEach(k => { data[k] = document.getElementById(`channel-${k}`)?.value || null; });
    const res = await api(`/api/config/${currentGuild}/channels`, { method: 'PUT', body: JSON.stringify(data) });
    if (res?.success) toast('Canais salvos!', 'success');
    else toast('Erro ao salvar', 'error');
}

async function saveCL() {
    const rolesSelect = document.getElementById('cl-roles');
    const selectedRoles = Array.from(rolesSelect.selectedOptions).map(o => o.value);
    const data = {
        triggerMessage: document.getElementById('cl-trigger').value || null,
        limit: parseInt(document.getElementById('cl-limit').value) || 100,
        allowedRoles: selectedRoles
    };
    const res = await api(`/api/config/${currentGuild}/cl`, { method: 'PUT', body: JSON.stringify(data) });
    if (res?.success) toast('CL salvo!', 'success');
    else toast('Erro ao salvar', 'error');
}

async function saveGPoints() {
    const data = {
        enabled: document.getElementById('gpoints-enabled').checked,
        countCallsEnabled: document.getElementById('gpoints-calls').checked,
        pointsPerMinuteCall: parseInt(document.getElementById('gpoints-perminute').value) || 1,
        pointsPerMessage: parseInt(document.getElementById('gpoints-permsg').value) || 1,
        messageCooldown: parseInt(document.getElementById('gpoints-cooldown').value) || 30
    };
    const res = await api(`/api/config/${currentGuild}/gpoints`, { method: 'PUT', body: JSON.stringify(data) });
    if (res?.success) toast('Points salvo!', 'success');
    else toast('Erro ao salvar', 'error');
}

async function saveAutoDelete() {
    const time = parseInt(document.getElementById('autodelete-time').value) || 0;
    const res = await api(`/api/config/${currentGuild}/autodelete`, { method: 'PUT', body: JSON.stringify({ time }) });
    if (res?.success) toast('Auto-Delete salvo!', 'success');
    else toast('Erro ao salvar', 'error');
}

async function saveEmbed() {
    const user = await api('/api/user');
    if (!user) return;
    const data = {
        title: document.getElementById('embed-title').value,
        description: document.getElementById('embed-description').value,
        color: document.getElementById('embed-color').value,
        image: document.getElementById('embed-image').value || null
    };
    const res = await api(`/api/config/${currentGuild}/staff/${user.user.id}/${currentEmbedType}`, { method: 'PUT', body: JSON.stringify(data) });
    if (res?.success) toast('Embed salva!', 'success');
    else toast('Erro ao salvar', 'error');
}

function switchEmbedTab(type) {
    currentEmbedType = type;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    loadEmbeds();
}

async function loadEmbeds() {
    if (!currentGuild) return;
    const user = await api('/api/user');
    if (!user) return;
    const staffData = await api(`/api/config/${currentGuild}/staff/${user.user.id}`);
    if (!staffData) return;
    const embed = staffData[currentEmbedType] || {};
    document.getElementById('embed-title').value = embed.title || '';
    document.getElementById('embed-description').value = embed.description || '';
    document.getElementById('embed-color').value = embed.color || '#ff0000';
    document.getElementById('embed-color-picker').value = embed.color || '#ff0000';
    document.getElementById('embed-image').value = embed.image || '';
    updateEmbedPreview();

    document.getElementById('embed-color-picker').onchange = function() {
        document.getElementById('embed-color').value = this.value;
        updateEmbedPreview();
    };
    document.getElementById('embed-color').oninput = function() {
        if (/^#[0-9a-f]{6}$/i.test(this.value)) document.getElementById('embed-color-picker').value = this.value;
        updateEmbedPreview();
    };
    ['embed-title', 'embed-description', 'embed-image'].forEach(id => {
        document.getElementById(id).oninput = updateEmbedPreview;
    });
}

function updateEmbedPreview() {
    const title = document.getElementById('embed-title').value || 'Sem titulo';
    const desc = document.getElementById('embed-description').value || '';
    const color = document.getElementById('embed-color').value || '#ff0000';
    const image = document.getElementById('embed-image').value;
    const preview = document.getElementById('embed-preview');
    preview.style.borderLeftColor = color;
    preview.innerHTML = `<h4>${esc(title)}</h4><p>${esc(desc)}</p>${image ? `<img src="${esc(image)}" onerror="this.style.display='none'">` : ''}`;
}

async function loadVipTests() {
    if (!currentGuild) return;
    const data = await api(`/api/config/${currentGuild}/viptests`);
    const list = document.getElementById('viptests-list');
    if (!data || !data.tests || data.tests.length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhum teste VIP configurado. Use o comando !painel no Discord para criar.</div>';
        return;
    }
    list.innerHTML = data.tests.map(t => `
        <div class="viptest-item">
            <div class="info">
                <div class="name">${esc(t.testRoleName)}</div>
                <div class="meta">Custo: ${esc(String(t.cost))} Points | Duracao: ${esc(formatDuration(t.duration))}</div>
            </div>
            <button class="btn btn-danger btn-small" onclick="deleteVipTest('${esc(t.id)}')">Excluir</button>
        </div>
    `).join('');
}

function formatDuration(ms) {
    if (ms >= 86400000) return Math.round(ms / 86400000) + 'd';
    if (ms >= 3600000) return Math.round(ms / 3600000) + 'h';
    return Math.round(ms / 60000) + 'm';
}

async function deleteVipTest(testId) {
    if (!confirm('Tem certeza que deseja excluir este teste VIP?')) return;
    const res = await api(`/api/config/${currentGuild}/viptests/${testId}`, { method: 'DELETE' });
    if (res?.success) { toast('Teste VIP excluido!', 'success'); loadVipTests(); }
    else toast('Erro ao excluir', 'error');
}

async function loadStore() {
    if (!currentGuild) return;
    const data = await api(`/api/config/${currentGuild}/store`);
    const list = document.getElementById('store-items-list');
    if (!data || !data.items || data.items.length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhum item cadastrado.</div>';
        return;
    }
    list.innerHTML = data.items.map(item => {
        const typeLabels = { cor: 'Cor', banner: 'Banner', selo: 'Selo', moldura: 'Moldura' };
        const statusClass = item.active !== false ? 'store-status-active' : 'store-status-inactive';
        const statusText = item.active !== false ? 'Ativo' : 'Inativo';
        const preview = item.type === 'cor' ? `<span class="store-color-preview" style="background:${esc(item.value)}"></span>` : '';
        return `
            <div class="store-item">
                <div class="store-item-info">
                    <div class="store-item-name">${preview}${esc(item.name)}</div>
                    <div class="store-item-meta">${esc(typeLabels[item.type] || item.type)} | ${item.price} Points | <span class="${statusClass}">${statusText}</span></div>
                    <div class="store-item-id">ID: ${esc(item.id)}</div>
                </div>
                <div class="store-item-actions">
                    <button class="btn btn-small" style="background:var(--accent-dim);color:#fff;" onclick="toggleStoreItem('${esc(item.id)}')">${item.active !== false ? 'Desativar' : 'Ativar'}</button>
                    <button class="btn btn-danger btn-small" onclick="deleteStoreItem('${esc(item.id)}')">Excluir</button>
                </div>
            </div>`;
    }).join('');
}

async function addStoreItem() {
    if (!currentGuild) return;
    const type = document.getElementById('store-item-type').value;
    const name = document.getElementById('store-item-name').value.trim();
    const description = document.getElementById('store-item-desc').value.trim();
    const price = parseInt(document.getElementById('store-item-price').value);
    const value = document.getElementById('store-item-value').value.trim();

    if (!name || !price || !value) {
        toast('Preencha todos os campos', 'error');
        return;
    }

    const res = await api(`/api/config/${currentGuild}/store`, {
        method: 'POST',
        body: JSON.stringify({ type, name, description, price, value })
    });

    if (res?.success) {
        toast('Item adicionado!', 'success');
        document.getElementById('store-item-name').value = '';
        document.getElementById('store-item-desc').value = '';
        document.getElementById('store-item-price').value = '';
        document.getElementById('store-item-value').value = '';
        loadStore();
    } else {
        toast('Erro ao adicionar item', 'error');
    }
}

async function toggleStoreItem(itemId) {
    if (!currentGuild) return;
    const res = await api(`/api/config/${currentGuild}/store/${itemId}/toggle`, { method: 'PUT' });
    if (res?.success) { toast('Status alterado!', 'success'); loadStore(); }
    else toast('Erro ao alterar status', 'error');
}

async function deleteStoreItem(itemId) {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    const res = await api(`/api/config/${currentGuild}/store/${itemId}`, { method: 'DELETE' });
    if (res?.success) { toast('Item excluido!', 'success'); loadStore(); }
    else toast('Erro ao excluir', 'error');
}

(function setupStoreTypeSwitch() {
    const typeSelect = document.getElementById('store-item-type');
    const colorPicker = document.getElementById('store-item-color-picker');
    const valueInput = document.getElementById('store-item-value');
    if (!typeSelect) return;

    function updatePlaceholder() {
        const type = typeSelect.value;
        if (type === 'cor') {
            colorPicker.style.display = '';
            valueInput.placeholder = '#FF0000';
        } else if (type === 'banner' || type === 'moldura') {
            colorPicker.style.display = 'none';
            valueInput.placeholder = type === 'moldura' ? 'URL da imagem da moldura (PNG transparente)' : 'https://url-da-imagem.png';
        } else {
            colorPicker.style.display = 'none';
            valueInput.placeholder = 'Emoji do selo';
        }
    }

    typeSelect.addEventListener('change', updatePlaceholder);
    if (colorPicker) {
        colorPicker.addEventListener('change', function() {
            valueInput.value = this.value;
        });
    }
    updatePlaceholder();
})();

loadServersCarousel();
init();
