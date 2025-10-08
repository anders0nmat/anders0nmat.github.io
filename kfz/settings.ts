import { Settings, I18N, translatePage } from "./common.js"

async function registerServiceWorker() {
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
registerServiceWorker()

await Settings.init()
await I18N.init()

translatePage()

function loadValues() {
	const objectToValue = value => {
		if (Array.isArray(value)) {
			return value.join('\n')
		}
		else {
			return value
		}
	}

    [...Settings.default.keys()].forEach(key => {
		const element = document.getElementById(key)
		if (element === null) { return }

        if (element instanceof HTMLInputElement && element.type == "checkbox") {
            element.checked = Settings.get(key)
        }
		else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.value = Settings.has(key) ? objectToValue(Settings.get(key)) : ''
            element.placeholder = objectToValue(Settings.default.get(key))
		}
    })
}

function saveValues(key?: string) {
	const saveValue = key => {
		const element = document.getElementById(key)
		if (element === null) { return }
   
        if (element instanceof HTMLTextAreaElement) {
            if (element.value === "") {
                Settings.delete(key)
            }
            else {
                const valueLines = element.value.split('\n')
                Settings.set(key, valueLines)
            }
        }
		else if (element instanceof HTMLInputElement) {
            if (element.type == "checkbox") {
                Settings.set(key, element.checked)
            }
			else if (element.value === "") {
                Settings.delete(key)
			}
			else {
                Settings.set(key, element.value)
			}
		}
	}

	if (key) {
		saveValue(key)
	}
	else {
        [...Settings.default.keys()].forEach(saveValue)
	}
}


loadValues();
[...Settings.default.keys()].forEach(key => {
	const element = document.getElementById(key)
	if (element === null) { return }

	element.addEventListener("change", _ => saveValues(element.id))
})

