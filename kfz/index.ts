
import { Settings, I18N, translatePage, registerServiceWorker, sanitizeHTML, Item, Datasource, PlateData, generateAddToTable, FoundItems } from "./common.js"

await Settings.init()
await I18N.init()
registerServiceWorker()
translatePage()

if (Settings.get("bottom-search")) {
    document.getElementById('list')!.classList.add("bottom")
}


const KEY_LIST = Settings.get("key-list")
const KEY_ORDER = Settings.get("key-order")
const MARKUP_KEYS: Set<string> = new Set(Settings.get("key-markup"))

const EXCLUDE_KEYS = [
	"licenseNumber"
]

function formatDataValue(value: any, allowHTML = false): string {
	if (Array.isArray(value)) {
		return value.map(e => formatDataValue(e, allowHTML)).join('\n')
	}

    if (value === null || value === undefined) {
        return ""
    }

    if (value instanceof Date) {
        return value.toLocaleString()
    }

    if (!allowHTML) {
        return value.toString()
    }
    else {
        value = (value.toString() as string).replace(/&(.)/g, '<em>$1</em>')
        return sanitizeHTML(value, ['b', 'i', 'em'])
    }
}

function getPlateFragment(data: Item, keys: string[], appendMissing: boolean): DocumentFragment {
	const plate_template = document.getElementById('plate-template') as HTMLTemplateElement
	const nodes = plate_template.content.cloneNode(true) as DocumentFragment
	nodes.querySelector('.license-number')!.textContent = data.key

	if (appendMissing) {
		const missingDataKeys = Array.from(data.info.keys()).filter(e => !EXCLUDE_KEYS.includes(e) && !keys.includes(e))
		keys = keys.concat(missingDataKeys)
	}

	const dataTable = nodes.querySelector<HTMLTableElement>('table')!
    const addToTable = generateAddToTable(dataTable)

	keys.forEach(key => {
        const valueIsHtml = MARKUP_KEYS.has(key)
        if (data.info.has(key)) {
            addToTable(key, formatDataValue(data.info.get(key), valueIsHtml), valueIsHtml)
        }
        else if (key in data) {
            addToTable(key, formatDataValue(data[key], valueIsHtml), valueIsHtml)
        }
	})
	return nodes
}

await Datasource.loadAll()

const ITEMS = new Map(Datasource.list.flatMap(datasource => {
    return [...datasource.items.values()].map(v => [v.id, v])
}))

ITEMS.forEach(e => {
	const li = document.createElement('li')
	const a = document.createElement('a')
	a.href = `#${e.id}`
	a.append(getPlateFragment(e, KEY_LIST, false))
	li.append(a)
    li.dataset.id = e.id
	document.getElementById('plate-list')?.appendChild(li)

    const element = document.getElementById('plate-list')!.lastElementChild as HTMLElement
	e.element = element
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

    ITEMS.forEach(e => {
        const [matches, score] = e.searchScore(query)
        e.element.style.display = matches ? '' : 'none'
        e.element.style.order = (-score).toString()
    })
}, 50))

function displayLocationHash() {
	const item = ITEMS.get(window.location.hash.substring(1))

	if (item) {
		// valid plate index ; show detail page
		document.getElementById('list')!.style.display = 'none'
		document.getElementById('detail')!.style.display = ''

		const detail_main = document.querySelector<HTMLElement>('#detail .plate-item')
		const selected_detail = getPlateFragment(item, KEY_ORDER, true)
        if (detail_main) {
            detail_main.replaceChildren(selected_detail)
            if (item.seen) {
                detail_main.dataset.seen = ''
            }
            else {
                delete detail_main.dataset.seen
            }
        }
	}
	else {
		// no/invalid id ; show list
		document.getElementById('list')!.style.display = ''
		document.getElementById('detail')!.style.display = 'none'
	}
}

function updateSeenList() {
    document.querySelectorAll<HTMLElement>('#plate-list > li').forEach(e => {
        const item = ITEMS.get(e.dataset.id ?? '')
        if (!item) { return }
        if (item.seen) {
            e.dataset.seen = ''
        }
        else {
            delete e.dataset.seen
        }
    })
}

document.getElementById('seen')?.addEventListener('click', _ => {
    const item = ITEMS.get(window.location.hash.substring(1))
    if (!item) { return }

    const itemId = item.id
    
    if (FoundItems.items.has(itemId)) {
        FoundItems.items.delete(itemId)
    }
    else {
        FoundItems.items.set(itemId, new Date())
    }
    FoundItems.save()
    displayLocationHash()
    updateSeenList()
})

window.addEventListener('hashchange', displayLocationHash)
displayLocationHash()
updateSeenList()

