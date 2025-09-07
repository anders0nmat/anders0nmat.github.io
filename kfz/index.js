async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        return;
    }
    try {
        const registration = await navigator.serviceWorker.register('./serviceworker.js', {
            scope: "./"
        });
        if (registration.installing) {
            console.log('[Service worker] installing...');
        }
        else if (registration.waiting) {
            console.log('[Service worker] installed!');
        }
        else if (registration.active) {
            console.log('[Service worker] active');
        }
    }
    catch (error) {
        console.error('[Service worker]', error);
    }
}
registerServiceWorker();
async function fetchJson(url) {
    const result = await fetch(url);
    return await result.json();
}
function readListDefault(key, defaultList) {
    const storage = window.localStorage;
    const storedList = JSON.parse(storage.getItem(key) ?? '{}');
    if (!Array.isArray(storedList)) {
        return defaultList;
    }
    return storedList;
}
class FoundItems {
    static items = new Map(FoundItems.load());
    static load() {
        const storage = window.localStorage;
        const storedList = JSON.parse(storage.getItem('found-items') ?? '{}');
        return Object.entries(storedList).map(([id, date]) => [id, new Date(date)]);
    }
    static save() {
        const storage = window.localStorage;
        const jsonList = JSON.stringify(Object.fromEntries(this.items.entries()));
        storage.setItem('found-items', jsonList);
    }
}
class Item {
    source;
    keys;
    info;
    element;
    seen;
    constructor(plate, source) {
        this.source = source;
        this.keys = Array.isArray(plate.licenseNumber) ? plate.licenseNumber : [plate.licenseNumber];
        this.info = new Map(Object.entries(plate));
        this.seen = FoundItems.items.get(this.id) ?? null;
    }
    get key() {
        return this.keys[0];
    }
    get id() {
        return `${this.source}-${this.key}`.toLowerCase();
    }
    searchScore(query) {
        const terms = query.split(' ');
        const scores = terms.map(term => {
            if (term.includes(':')) {
                const [termKey, termValue] = term.split(':');
                if (termKey == 'seen' && termValue) {
                    const val = {
                        'true': true,
                        'yes': true,
                        '1': true,
                    }[termValue] ?? false;
                    return [val == (this.seen != null), 0];
                }
            }
            else {
                const max = Math.max(0, ...this.keys.map(e => {
                    if (e.toLowerCase() == term) {
                        return 2;
                    }
                    else if (e.toLowerCase().includes(term)) {
                        return 1;
                    }
                    return 0;
                }));
                return [max > 0, max];
            }
            return [true, 0];
        });
        if (scores.every(e => e[0])) {
            return [true, Math.max(0, ...scores.map(e => e[1]))];
        }
        return [false, 0];
    }
}
const TRANSLATIONS = await fetchJson('/kfz/i18n.json');
const DEFAULT_SETTINGS = await fetchJson('/kfz/default_settings.json');
const KEY_LIST = readListDefault('key-list', DEFAULT_SETTINGS['key-list']);
const KEY_ORDER = readListDefault('key-order', DEFAULT_SETTINGS['key-order']);
const MARKUP_KEYS = readListDefault('key-markup', DEFAULT_SETTINGS['key-markup']);
const EXCLUDE_KEYS = [
    "licenseNumber"
];
function formatDataValue(value, allowHTML = false) {
    if (Array.isArray(value)) {
        return value.map(e => formatDataValue(e, allowHTML)).join('\n');
    }
    if (value === null || value === undefined) {
        return "";
    }
    if (value instanceof Date) {
        return value.toLocaleString();
    }
    if (!allowHTML) {
        return value.toString();
    }
    else {
        value = value.toString().replace(/&(.)/g, '<em>$1</em>');
        const parser = new DOMParser();
        const body = parser.parseFromString(value, "text/html").body;
        body.querySelectorAll(':not(b, i, em)').forEach(e => e.remove());
        body.querySelectorAll('*').forEach(e => [...e.attributes].forEach(attr => e.removeAttribute(attr.name)));
        return body.innerHTML;
    }
}
function getPlateFragment(data, keys, translation, appendMissing) {
    const plate_template = document.getElementById('plate-template');
    const nodes = plate_template.content.cloneNode(true);
    nodes.querySelector('.license-number').textContent = data.key;
    if (appendMissing) {
        const missingDataKeys = Array.from(data.info.keys()).filter(e => !EXCLUDE_KEYS.includes(e) && !keys.includes(e));
        keys = keys.concat(missingDataKeys);
    }
    const dataTable = nodes.querySelector('table');
    const appendTable = (key, value) => {
        const tr = document.createElement('tr');
        const name = document.createElement('td');
        const val = document.createElement('td');
        name.textContent = translation[key] ?? key;
        if (MARKUP_KEYS.includes(key)) {
            val.innerHTML = formatDataValue(value, true);
        }
        else {
            val.textContent = formatDataValue(value);
        }
        tr.append(name, val);
        dataTable.append(tr);
    };
    keys.forEach(key => {
        if (data.info.has(key)) {
            appendTable(key, data.info.get(key));
        }
        else if (key in data) {
            appendTable(key, data[key]);
        }
    });
    return nodes;
}
const DATA_SOURCES = readListDefault('datasources', DEFAULT_SETTINGS['datasources']);
const _ITEMS = (await Promise.all(DATA_SOURCES.map(async (url) => {
    const source = new URL(url, location.href).pathname.split('/').pop()?.split('.').shift() ?? 'unknown';
    try {
        const json = await fetchJson(url);
        return json.map(e => {
            const item = new Item(e, source);
            return [item.id, item];
        });
    }
    catch {
        return [];
    }
}))).flat();
const ITEMS = new Map(_ITEMS);
ITEMS.forEach(e => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${e.id}`;
    a.append(getPlateFragment(e, KEY_LIST, TRANSLATIONS['de'], false));
    li.append(a);
    li.dataset.id = e.id;
    document.getElementById('plate-list')?.appendChild(li);
    const element = document.getElementById('plate-list').lastElementChild;
    e.element = element;
});
function debounce(func, wait, immediate = false) {
    var timeout;
    return function (...args) {
        var context = this;
        var later = function () {
            timeout = null;
            if (!immediate)
                func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout ?? undefined);
        timeout = setTimeout(later, wait);
        if (callNow)
            func.apply(context, args);
    };
}
document.getElementById('license-number')?.addEventListener('input', debounce(_ => {
    const query = document.getElementById('license-number').value.toLowerCase();
    ITEMS.forEach(e => {
        const [matches, score] = e.searchScore(query);
        e.element.style.display = matches ? '' : 'none';
        e.element.style.order = (-score).toString();
    });
}, 50));
function displayLocationHash() {
    const item = ITEMS.get(window.location.hash.substring(1));
    if (item) {
        // valid plate index ; show detail page
        document.getElementById('list').style.display = 'none';
        document.getElementById('detail').style.display = '';
        const detail_main = document.querySelector('#detail .plate-item');
        const selected_detail = getPlateFragment(item, KEY_ORDER, TRANSLATIONS['de'], true);
        detail_main?.replaceChildren(selected_detail);
    }
    else {
        // no/invalid id ; show list
        document.getElementById('list').style.display = '';
        document.getElementById('detail').style.display = 'none';
    }
}
function updateSeenList() {
    document.querySelectorAll('#plate-list > li').forEach(e => {
        const item = ITEMS.get(e.dataset.id ?? '');
        if (!item) {
            return;
        }
        e.dataset.seen = (item.seen != null).toString();
    });
}
document.getElementById('seen')?.addEventListener('click', _ => {
    const item = ITEMS.get(window.location.hash.substring(1));
    if (!item) {
        return;
    }
    const itemId = item.id;
    if (FoundItems.items.has(itemId)) {
        FoundItems.items.delete(itemId);
        item.seen = null;
    }
    else {
        const now = new Date();
        FoundItems.items.set(itemId, now);
        item.seen = now;
    }
    FoundItems.save();
    displayLocationHash();
    updateSeenList();
});
window.addEventListener('hashchange', displayLocationHash);
displayLocationHash();
updateSeenList();
export {};
