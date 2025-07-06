
export {}

async function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) { return }

	try {
		const registration = await navigator.serviceWorker.register('./serviceworker.js', {
			scope: "/kfz"
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
registerServiceWorker()

async function fetchJson(url: RequestInfo | URL): Promise<any> {
	const result = await fetch(url)
	return await result.json()
}

function readListDefault(key: string, defaultList: string[]): string[] {
	const storage = window.localStorage
	const storedList = JSON.parse(storage.getItem(key) ?? '{}')

	if (!Array.isArray(storedList)) {
		return defaultList
	}
	return storedList
}


interface PlateData {
	licenseNumber: string
	[key: string]: any
}

interface KeyTranslation {
	[key: string]: string
}

interface Translations {
	[lang: string]: KeyTranslation
}

const TRANSLATIONS: Translations = await fetchJson('/kfz/i18n.json')
const DEFAULT_KEY_SETTINGS = await fetchJson('/kfz/default_keys.json')
const KEY_LIST: string[] = readListDefault('key-list', DEFAULT_KEY_SETTINGS['key-list'])
const KEY_ORDER: string[] = readListDefault('key-order', DEFAULT_KEY_SETTINGS['key-order'])

const EXCLUDE_KEYS = [
	"licenseNumber"
]

function formatDataValue(value: any): string {
	if (Array.isArray(value)) {
		return value.map(formatDataValue).join('\n')
	}
	return value.toString()
}

function getPlateFragment(data: PlateData, keys: string[], translation: KeyTranslation, appendMissing: boolean): DocumentFragment {
	const plate_template = document.getElementById('plate-template') as HTMLTemplateElement
	const nodes = plate_template.content.cloneNode(true) as DocumentFragment
	nodes.querySelector('.license-number')!.textContent = data.licenseNumber

	if (appendMissing) {
		const missingDataKeys = Object.keys(data).filter(e => !EXCLUDE_KEYS.includes(e) && !keys.includes(e))
		keys = keys.concat(missingDataKeys)
	}

	const dataTable = nodes.querySelector<HTMLTableElement>('table')!
	keys.forEach(key => {
		if (!(key in data)) { return }
		const tr = document.createElement('tr')
		const name = document.createElement('td')
		const value = document.createElement('td')
		name.textContent = translation[key] ?? key

		value.textContent = formatDataValue(data[key])
		tr.append(name, value)
		dataTable.append(tr)
	})
	return nodes
}

const DATA = await fetchJson('/kfz/data.json')

const search_space: [string, HTMLElement][] = DATA.map((e, idx) => {
	const li = document.createElement('li')
	const a = document.createElement('a')
	a.href = `#${idx}`
	a.append(getPlateFragment(e, KEY_LIST, TRANSLATIONS['de'], false))
	li.append(a)
	document.getElementById('plate-list')?.appendChild(li)

	return [e.licenseNumber.toLocaleLowerCase(), document.getElementById('plate-list')!.lastElementChild as HTMLElement]
})

function debounce<Args extends any[], F extends (...args: Args) => any>(func: F, wait: number, immediate: boolean = false) {
    var timeout: ReturnType<typeof setTimeout> | null
    return function(this: ThisParameterType<F>, ...args: Parameters<F>) {
		var context = this
        var later = function() {
            timeout = null
            if (!immediate) func.apply(context, args)
        }
        var callNow = immediate && !timeout
        clearTimeout(timeout ?? undefined)
        timeout = setTimeout(later, wait)
        if (callNow) func.apply(context, args)
    }
}

document.getElementById('license-number')?.addEventListener('input', debounce(_ => {
	const query = (document.getElementById('license-number') as HTMLInputElement).value.toLowerCase()
	
	search_space.forEach(([key, value]) => {
		value.style.display = key.includes(query) ? '' : 'none'
	})
}, 50))

function displayLocationHash() {
	const plateId = parseInt(window.location.hash.substring(1))

	if (plateId >= 0 && plateId < DATA.length) {
		// valid plate index ; show detail page
		document.getElementById('list')!.style.display = 'none'
		document.getElementById('detail')!.style.display = ''

		const detail_main = document.querySelector<HTMLElement>('#detail .plate-item')
		const selected_detail = getPlateFragment(DATA[plateId], KEY_ORDER, TRANSLATIONS['de'], true)
		detail_main?.replaceChildren(selected_detail)
	}
	else {
		// no/invalid id ; show list
		document.getElementById('list')!.style.display = ''
		document.getElementById('detail')!.style.display = 'none'
	}
}

window.addEventListener('hashchange', displayLocationHash)
displayLocationHash()



