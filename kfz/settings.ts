export {}

async function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) { return }

	try {
		const registration = await navigator.serviceWorker.register('/kfz/serviceworker.js', {
			scope: "/kfz/"
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

const DEFAULT_KEY_SETTINGS = await fetchJson('/kfz/default_keys.json')
const STORAGE = window.localStorage

function loadValues() {
	const objectToValue = value => {
		if (Array.isArray(value)) {
			return value.join('\n')
		}
		else {
			return value
		}
	}

	Object.keys(DEFAULT_KEY_SETTINGS).forEach(key => {
		const element = document.getElementById(key)
		if (element === null) { return }

		if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
			const storedValue = STORAGE.getItem(key)

			if (storedValue !== null) {
				element.value = objectToValue(JSON.parse(storedValue))
			}

			element.placeholder = objectToValue(DEFAULT_KEY_SETTINGS[element.id])
		}
	})
}

function saveValues(key?: string) {
	const saveValue = key => {
		const element = document.getElementById(key)
		if (element === null) { return }

		if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
			if (element.value === "") {
				STORAGE.removeItem(key)
			}
			else if (element instanceof HTMLTextAreaElement) {
				const valueLines = element.value.split('\n')
				STORAGE.setItem(key, JSON.stringify(valueLines))
			}
			else {
				STORAGE.setItem(key, JSON.stringify(element.value))
			}
		}
	}

	if (key) {
		saveValue(key)
	}
	else {
		Object.keys(DEFAULT_KEY_SETTINGS).forEach(saveValue)
	}
}


loadValues()
Object.keys(DEFAULT_KEY_SETTINGS).forEach(key => {
	const element = document.getElementById(key)
	if (element === null) { return }

	element.addEventListener("change", _ => saveValues(element.id))
})

