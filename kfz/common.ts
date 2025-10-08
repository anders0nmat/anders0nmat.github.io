
export class Settings {
    static defaultUrl = '/kfz/default_settings.json'
    static default: Map<string, any>
    static storage = window.localStorage

    static async init() {
        const rsp = await fetch(this.defaultUrl)
        const rsp_json = await rsp.json()
        Settings.default = new Map(Object.entries(rsp_json))
    }
    
    static has(key: string): boolean {
        return this.storage.getItem(key) !== null
    }
    static exists(key: string): boolean {
        return this.storage.getItem(key) !== null || this.default.has(key)
    }
    static get(key: string): any {
        const storageItem = this.storage.getItem(key)
        return storageItem !== null ? JSON.parse(storageItem) : this.default.get(key)
    }
    static set(key: string, value: any) {
        this.storage.setItem(key, JSON.stringify(value))
    }
    static delete(key: string) {
        this.storage.removeItem(key)
    }
}


export class I18N {
    static url = '/kfz/i18n.json'
    static default: Map<string, string>
    static current: Map<string, string>
    static get(key: string): string {
        return this.current.get(key) ?? this.default.get(key) ?? key
    }

    static async init() {
        const rsp = await fetch(this.url)
        const rsp_json = await rsp.json()
        I18N.default = new Map(Object.entries(rsp_json["en"] ?? {}))
        I18N.current = new Map(Object.entries(rsp_json[Settings.get("lang")] ?? {}))
    }
}

export function translatePage() {
    document.querySelectorAll<HTMLElement>("[translate]").forEach(e => {
        let translateKey = e.getAttribute("translate")!
        if (!translateKey) {
            translateKey = e.textContent!.trim()
        }
        e.textContent = I18N.get(translateKey)
    })

    document.querySelectorAll<HTMLElement>("[translate-attr]").forEach(e => {
        const attr = e.getAttribute("translate-attr")!
        const translateKey = e.getAttribute("translate-attr-key") ?? e.getAttribute(attr)!
        e.setAttribute(attr, I18N.get(translateKey))
    })
}

export async function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) { return }

	try {
		const registration = await navigator.serviceWorker.register('./serviceworker.js', {
			scope: "./"
		})

		if (registration.installing) {
			console.log('[Service worker] installing...')
		}
		else if (registration.waiting) {
			console.log('[Service worker] installed!')
		}
		else if (registration.active) {
			console.log('[Service worker] active')
		}
	} catch (error) {
		console.error('[Service worker]', error)
	}
}

export function sanitizeHTML(html: string, allowedTags: string[], allowedAttributes: string[] = []): string {
    const parser = new DOMParser()
    const body = parser.parseFromString(html, "text/html").body

    const allowedAttrs = new Set(allowedAttributes)

    body.querySelectorAll(`:not(${allowedTags.join(", ")})`).forEach(e => e.remove())
    body.querySelectorAll('*').forEach(e => {
        [...e.attributes].forEach(attr => {
            if (allowedAttrs.has(attr.name)) { return }
            e.removeAttribute(attr.name)
        })
    })
    return body.innerHTML
}

export class FoundItems {
    static items = new Map<string, Date>(FoundItems.load())

    static load(): [string, Date][] {
        const storage = window.localStorage
        const storedList = JSON.parse(storage.getItem('found-items') ?? '{}')

        return Object.entries(storedList).map(([id, date]: [string, string]) => [id, new Date(date)])
    }

    static save() {
        const storage = window.localStorage
        const jsonList = JSON.stringify(Object.fromEntries(this.items.entries()))
        storage.setItem('found-items', jsonList)
    }

    static has(key: string): boolean {
        return this.items.has(key)
    }

    static get(key: string): Date | undefined {
        return this.items.get(key)
    }

    static set(key: string, value: Date, autoSave=true) {
        this.items.set(key, value)
        if (autoSave) { this.save() }
    }

    static delete(key: string) {
        this.items.delete(key)
    }
}

export class Datasource {
    static list: Datasource[] = []
    static datasouceIdent = "$META"
    static datasourceSetting = "datasources"

    url: URL
    name: string
    description: string
    id: string

    items: Map<string, Item>

    constructor(url: URL) {
        const fileName = url.pathname.split('/').pop()?.split('.').shift() ?? 'unknown'

        this.url = url
        this.name = fileName
        this.description = ''
        this.id = fileName
        this.items = new Map<string, Item>()
    }

    setInfo(item: Item) {
        this.name = item.info.get("name") ?? this.name
        this.description = item.info.get("description") ?? this.description
        this.id = item.info.get("id") ?? this.id
    }

    static async fromURL(url: URL): Promise<Datasource> {
        const datasource = new Datasource(url)
        
        const rsp = await fetch(url)
        const json = await rsp.json() as PlateData[]
        json.forEach(e => {
            const item = new Item(e, datasource)
            datasource.items.set(item.key, item)
        })

        if (datasource.items.has(Datasource.datasouceIdent)) {
            datasource.setInfo(datasource.items.get(Datasource.datasouceIdent)!)
            datasource.items.delete(Datasource.datasouceIdent)
        }

        return datasource
    }

    static async loadAll() {
        const datasources: string[] = Settings.get("datasources")
        this.list = await Promise.all(datasources.map(async url => Datasource.fromURL(new URL(url, location.href))))
    }
}

export interface PlateData {
	licenseNumber: string | string[]
	[key: string]: any
}

export class Item {
    datasource: Datasource
    keys: string[]
    info: Map<string, any>
    element: HTMLElement

    constructor(plate: PlateData, source: Datasource) {
        this.datasource = source
        this.keys = Array.isArray(plate.licenseNumber) ? plate.licenseNumber : [plate.licenseNumber]
        this.info = new Map(Object.entries(plate))
    }

    get key(): string {
        return this.keys[0]
    }

    get id(): string {
        return `${this.datasource.id}-${this.key}`.toLowerCase()
    }

    get source(): string {
        return `${this.datasource.name} (${this.datasource.url})`
    }

    get seen(): Date | null {
        return FoundItems.items.get(this.id) ?? null
    }

    searchScore(query: string): [boolean, number] {
        const terms = query.split(' ')
        const scores: [boolean, number][] = terms.map(term => {
            if (term.includes(':')) {
                const [termKey, termValue] = term.split(':')

                if (termKey == 'seen' && termValue) {
                    const val = {
                        'true': true,
                        'yes': true,
                        '1': true,
                    }[termValue] ?? false
                    return [val == (this.seen != null), 0]
                }
            }
            else {
                const max = Math.max(0, ...this.keys.map(e => {
                    if (e.toLowerCase() == term) {
                        return 2
                    }
                    else if (e.toLowerCase().includes(term)) {
                        return 1
                    }
                    return 0
                }))
                return [max > 0, max]
            }

            return [true, 0]
        })

        if (scores.every(e => e[0])) {
            return [true, Math.max(0, ...scores.map(e => e[1]))]
        }
        return [false, 0]
    }
}

export function generateAddToTable(table: HTMLElement): (key: string, value: string, html?: boolean)=>void {
    return (key: string, value: string, html=false) => {
        const tr = document.createElement('tr')
        const name = document.createElement('td')
        const content = document.createElement('td')

        name.textContent = I18N.get(key)
        if (html) {
            content.innerHTML = value
        }
        else {
            content.textContent = value
        }

        tr.append(name, content)
        table.append(tr)
    }
}