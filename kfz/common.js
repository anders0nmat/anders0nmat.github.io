export class Settings {
    static defaultUrl = '/kfz/default_settings.json';
    static default;
    static storage = window.localStorage;
    static async init() {
        const rsp = await fetch(this.defaultUrl);
        const rsp_json = await rsp.json();
        Settings.default = new Map(Object.entries(rsp_json));
    }
    static has(key) {
        return this.storage.getItem(key) !== null;
    }
    static exists(key) {
        return this.storage.getItem(key) !== null || this.default.has(key);
    }
    static get(key) {
        const storageItem = this.storage.getItem(key);
        return storageItem !== null ? JSON.parse(storageItem) : this.default.get(key);
    }
    static set(key, value) {
        this.storage.setItem(key, JSON.stringify(value));
    }
    static delete(key) {
        this.storage.removeItem(key);
    }
}
export class I18N {
    static url = '/kfz/i18n.json';
    static default;
    static current;
    static get(key) {
        return this.current.get(key) ?? this.default.get(key) ?? key;
    }
    static async init() {
        const rsp = await fetch(this.url);
        const rsp_json = await rsp.json();
        I18N.default = new Map(Object.entries(rsp_json["en"] ?? {}));
        I18N.current = new Map(Object.entries(rsp_json[Settings.get("lang")] ?? {}));
    }
}
export function translatePage() {
    document.querySelectorAll("[translate]").forEach(e => {
        let translateKey = e.getAttribute("translate");
        if (!translateKey) {
            translateKey = e.textContent.trim();
        }
        e.textContent = I18N.get(translateKey);
    });
    document.querySelectorAll("[translate-attr]").forEach(e => {
        const attr = e.getAttribute("translate-attr");
        const translateKey = e.getAttribute("translate-attr-key") ?? e.getAttribute(attr);
        e.setAttribute(attr, I18N.get(translateKey));
    });
}
export async function registerServiceWorker() {
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
export function sanitizeHTML(html, allowedTags, allowedAttributes = []) {
    const parser = new DOMParser();
    const body = parser.parseFromString(html, "text/html").body;
    const allowedAttrs = new Set(allowedAttributes);
    body.querySelectorAll(`:not(${allowedTags.join(", ")})`).forEach(e => e.remove());
    body.querySelectorAll('*').forEach(e => {
        [...e.attributes].forEach(attr => {
            if (allowedAttrs.has(attr.name)) {
                return;
            }
            e.removeAttribute(attr.name);
        });
    });
    return body.innerHTML;
}
export class FoundItems {
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
    static has(key) {
        return this.items.has(key);
    }
    static get(key) {
        return this.items.get(key);
    }
    static set(key, value, autoSave = true) {
        this.items.set(key, value);
        if (autoSave) {
            this.save();
        }
    }
    static delete(key) {
        this.items.delete(key);
    }
}
export class Datasource {
    static list = [];
    static datasouceIdent = "$META";
    static datasourceSetting = "datasources";
    url;
    name;
    description;
    id;
    items;
    constructor(url) {
        const fileName = url.pathname.split('/').pop()?.split('.').shift() ?? 'unknown';
        this.url = url;
        this.name = fileName;
        this.description = '';
        this.id = fileName;
        this.items = new Map();
    }
    setInfo(item) {
        this.name = item.info.get("name") ?? this.name;
        this.description = item.info.get("description") ?? this.description;
        this.id = item.info.get("id") ?? this.id;
    }
    static async fromURL(url) {
        const datasource = new Datasource(url);
        const rsp = await fetch(url);
        const json = await rsp.json();
        json.forEach(e => {
            const item = new Item(e, datasource);
            datasource.items.set(item.key, item);
        });
        if (datasource.items.has(Datasource.datasouceIdent)) {
            datasource.setInfo(datasource.items.get(Datasource.datasouceIdent));
            datasource.items.delete(Datasource.datasouceIdent);
        }
        return datasource;
    }
    static async loadAll() {
        const datasources = Settings.get("datasources");
        this.list = await Promise.all(datasources.map(async (url) => Datasource.fromURL(new URL(url, location.href))));
    }
}
export class Item {
    datasource;
    keys;
    info;
    element;
    constructor(plate, source) {
        this.datasource = source;
        this.keys = Array.isArray(plate.licenseNumber) ? plate.licenseNumber : [plate.licenseNumber];
        this.info = new Map(Object.entries(plate));
    }
    get key() {
        return this.keys[0];
    }
    get id() {
        return `${this.datasource.id}-${this.key}`.toLowerCase();
    }
    get source() {
        return `${this.datasource.name} (${this.datasource.url})`;
    }
    get seen() {
        return FoundItems.items.get(this.id) ?? null;
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
export function generateAddToTable(table) {
    return (key, value, html = false) => {
        const tr = document.createElement('tr');
        const name = document.createElement('td');
        const content = document.createElement('td');
        name.textContent = I18N.get(key);
        if (html) {
            content.innerHTML = value;
        }
        else {
            content.textContent = value;
        }
        tr.append(name, content);
        table.append(tr);
    };
}
