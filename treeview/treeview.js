
function createHtmlStructure(obj) {
	const default_obj = {
		classes: [],
		id: null,
		innerText: "",
		children: [],
		name: null,
		events: {}
	}
	
	obj = {...default_obj, ...obj}

	if (obj.name == "#text") {
		return document.createTextNode(obj.innerText)
	}

	let node = document.createElement(obj.name)
	if (obj.id) {
		node.id = obj.id
	}
	node.innerText = obj.innerText
	if (Array.isArray(obj.classes)) {
		obj.classes.forEach(e => {node.classList.add(e)})
	}

	for (const [key, value] of Object.entries(obj)) {
		if (default_obj[key] !== undefined) {continue}

		node.setAttribute(key, value)
	}

	for (const [key, value] of Object.entries(obj.events)) {
		node[key] = value
	}

	obj.children.forEach(e => {
		let child = createHtmlStructure(e)
		node.appendChild(child)
	})

	return node
}

function loadNodeObject(node) {
	nodeResizeObserver.disconnect()
	container.textContent = "" // To remove all old nodes

	container.appendChild(node.createDom())

	Node.createLines()
	
	document.querySelectorAll(":not(#container) > .node > .node-head").forEach(e => nodeResizeObserver.observe(e))

	document.querySelectorAll(".node-head .dropdown").forEach(e => {
		e.querySelector("button.material-icons.icon-button").onclick = ev => ev.target.parentElement.classList.toggle('show')
		e.querySelectorAll("div > button[data-action]").forEach(btn => btn.onclick = nodeSettingClick)
	})

	// Add Tag Buttons & New Tag text fields
	document.querySelectorAll("#add-tag-button").forEach(e => {
		e.onclick = _ => {
			let textfield = createHtmlStructure({
				name: "input", type: "text", classes: ["node-tag", "tag-text-field"]
			})
			textfield.onblur = _ => {
				let node = Node.fromDom(textfield.closest(".node"))
				if (!node) {return}
			
				if (textfield.value != "") { node.addAttribute(textfield.value) }
			
				textfield.remove()
			}
			textfield.onkeydown = ev => {
				if (ev.key == "Escape") {
					textfield.remove()
				}
				else if (ev.code == "Enter") {
					textfield.blur() // Applies tag through onblur event
				}
			}
			e.closest("#tags").appendChild(textfield)
			textfield.focus()
		}
	})

	// Add Attribute Button
	document.querySelectorAll("#add-attr-button").forEach(e => {
		e.onclick = ev => {
			let table = ev.target.closest(".attribute-container").querySelector("#attributes-table")

			let tableRow = createHtmlStructure({name: "tr", children: [{name: "td"}]})
			table.appendChild(tableRow)

			let keyDataField = createHtmlStructure({name: "td"})
			let valueDataField = createHtmlStructure({name: "td"})
			tableRow.appendChild(keyDataField)
			tableRow.appendChild(valueDataField)
			let keyField = createHtmlStructure({name: "input", type: "text", classes: ["attr-text-field"]})
			let valueField = createHtmlStructure({name: "input", type: "text", classes: ["attr-text-field"]})
			keyDataField.appendChild(keyField)
			valueDataField.appendChild(valueField)

			keyField.onblur = ev => {
				// Focus was given to value, do nothing
				if (valueField.isSameNode(ev.relatedTarget)) {return}

				let node = Node.fromDom(keyField.closest(".node"))

				if (keyField.value != "") { node.addAttribute(keyField.value, valueField.value) }

				tableRow.remove()
			}
			keyField.onkeydown = ev => {
				if (ev.key == "Escape") {
					tableRow.remove()
				}
				else if (ev.code == "Enter") {
					valueField.focus()
				}
			}

			valueField.onblur = ev => {
				// Focus was given to key, do nothing
				if (keyField.isSameNode(ev.relatedTarget)) {return}

				let node = Node.fromDom(valueField.closest(".node"))

				if (keyField.value != "") { node.addAttribute(keyField.value, valueField.value) }

				tableRow.remove()
			}
			valueField.onkeydown = ev => {
				if (ev.key == "Escape") {
					tableRow.remove()
				}
				else if (ev.code == "Enter") {
					valueField.blur()
				}
			}

			keyField.focus()
		}
	})

	document.querySelectorAll("#title .edit-button").forEach(e => {
		e.onclick = ev => {
			let textnode = ev.target.closest(".node").querySelector("#title-name")

			let currValue = textnode.textContent

			let edit_field = createHtmlStructure({
				name: "input", type: "text", value: currValue, classes: ["name-text-field"],
				events: {
					onblur: ev => {				
						ev.target.replaceWith(createHtmlStructure({
							name: "span", id: "title-name", innerText: ev.target.value
						}))
					},
					onkeydown: ev => {
						if (ev.key == "Escape") {
							ev.target.replaceWith(createHtmlStructure({
								name: "span", id: "title-name", innerText: currValue
							}))
						}
						else if (ev.code == "Enter") {
							ev.target.blur() // Applies tag through onblur event
						}
					}
				}
			})

			textnode.replaceWith(edit_field)
			edit_field.focus()
			edit_field.select()
		}
	})

	document.querySelectorAll("#value .edit-button").forEach(e => {
		e.onclick = ev => {
			let textnode = ev.target.closest(".node").querySelector("#value-name")

			let currValue = textnode.textContent

			let edit_field = createHtmlStructure({
				name: "input", type: "text", value: currValue, classes: ["value-text-field"],
				events: {
					onblur: ev => {				
						let node = Node.fromDom(ev.target.closest(".node"))
						ev.target.replaceWith(createHtmlStructure({
							name: "span", id: "value-name", innerText: ev.target.value
						}))
						node.updateDom()
					},
					onkeydown: ev => {
						if (ev.key == "Escape") {
							ev.target.replaceWith(createHtmlStructure({
								name: "span", id: "value-name", innerText: currValue
							}))
						}
						else if (ev.code == "Enter") {
							ev.target.blur() // Applies tag through onblur event
						}
					}
				}
			})

			textnode.replaceWith(edit_field)
			edit_field.focus()
			edit_field.select()
		}
	})
}

function loadJsonObject(obj) {
	loadNodeObject(Node.fromObject(obj))
}

function loadXmlObject(obj) {
	loadNodeObject(Node.fromTree(obj.activeElement))
}

function loadJsonString(jsonString) {
	let jsonObj = JSON.parse(jsonString)
	loadJsonObject(jsonObj)
}

function loadXmlString(xmlString) {
	let parser = new DOMParser()
	let xmlObj = parser.parseFromString(xmlString, "text/xml")

	loadXmlObject(xmlObj)
}

function selectFile(file) {
	if (Array.isArray(file)) {
		file = file.find(e => Node.supportedTypes.has(e.type))
	}

	let reader = new FileReader()
	reader.onload = () => {
		if (file.type == "application/xml" || file.type == "text/xml") {
			loadXmlString(reader.result)
		}
		else if (file.type == "application/json") {
			loadJsonString(reader.result)
		}
		else {
			alert(`Unknown file\nmime-type:${file.type}`)
			return
		}

		let filename = document.getElementById("active-file-name")
		let filetype = document.getElementById("active-file-type")

		filename.textContent = file.name
		filetype.textContent = file.type
	}
	reader.readAsText(file)
}

function nodeSettingClick(ev) {
	let elem = ev.target
	let action = elem.getAttribute("data-action")

	elem.closest(".dropdown").classList.remove("show")
	if (!action) {return}

	let elemNode = Node.fromDom(elem.closest(".node"))
	let parentNode = elemNode.parent

	switch (action) {
		case "hide-self":
			if (!parentNode) {break}
			elemNode.classList.add("hidden")
			parentNode.updateLines()

			parentNode.classList.add("filter-active")
			break;
		case "hide-siblings":
			if (!parentNode) {break}
			parentNode.children.forEach(e => {if (!elemNode._dom_object.isSameNode(e._dom_object)) {e.classList.add("hidden")}})
			parentNode.updateLines()

			parentNode.classList.add("filter-active")
			break;
		case "hide-children":
			Array.from(elemNode.children).forEach(e => e.classList.add("hidden"))
			parentNode.updateLines()

			elemNode.classList.add("filter-active")
			break;
		case "show-siblings":
			Array.from(parentNode.children).forEach(e => e.classList.remove("hidden"))
			parentNode.updateLines()

			parentNode.classList.remove("filter-active")
			break;
		case "show-children":
			Array.from(elemNode.children).forEach(e => e.classList.remove("hidden"))
			parentNode.updateLines()

			elemNode.classList.remove("filter-active")
			break;
		default: break;
	}
}

function toggle_color_theme() {
	let btn = document.getElementById("color-theme-toggle")

	let currentState = 
		document.body.classList.contains("light-theme") +
		2 * document.body.classList.contains("dark-theme")
	// 0 = UserDefault
	// 1 = Light
	// 2 = Dark
	// 3 = Illegal, default to 0

	switch (currentState) {
		case 0:
			document.body.classList.add("light-theme")
			document.body.classList.remove("dark-theme")
			btn.textContent = "brightness_7"
			break
		case 1:
			document.body.classList.remove("light-theme")
			document.body.classList.add("dark-theme")
			btn.textContent = "brightness_3"
			break
		case 2:
			document.body.classList.remove("light-theme")
			document.body.classList.remove("dark-theme")
			btn.textContent = "brightness_4"
			break
	}
}

function toggle_layout(ev) {
	if (ev.target.checked && ev.target.value == "horizontal") {
		container.classList.add("horizontal")
		Node.createLines()
	}
	else {
		container.classList.remove("horizontal")
		Node.createLines()
	}
}

function dragover_handler(ev) {
	ev.preventDefault()

	document.querySelector("body").classList.add("drag")

	let status_icon = document.querySelector("#drag-overlay .material-icons")
	let information = document.querySelector("#drag-overlay #drop-information")

	let files = []

	if (ev.dataTransfer.items) {
		files = [...ev.dataTransfer.items].filter(e => e.kind == "file")
	}

	if (!files || files.length == 0) {
		status_icon.textContent = "error_outline"
		information.textContent = "Only files can be processed"
	}
	else if (files.length > 1) {
		status_icon.textContent = "info_outline"
		information.textContent = "Only one file at a time can be viewed"
	}
	else if (!Node.supportedTypes.has(files[0].type)) {
		status_icon.textContent = "error_outline"
		information.textContent = "Only files of type XML or JSON are supported"
	}
}

function drop_handler(ev) {
	ev.preventDefault()
	document.querySelector("body").classList.remove("drag")
	if (!ev.dataTransfer.items) {return}

	let files = [...ev.dataTransfer.items].filter(e => e.kind == "file").map(e => e.getAsFile())

	if (!files || files.lenght == 0) {return}

	let file = files.find(e => Node.supportedTypes.has(e.type))

	if (!file) {return}

	selectFile(file)
}

/* Variables */
let container = document.getElementById("container")
let settingsContainer = document.getElementById("settings")

let nodeResizeObserver = new ResizeObserver(entries => entries.forEach(e => Node.fromDom(e.target.closest(".node"))?.parent?.updateLines()))

let show_settings = visible => settingsContainer.classList.toggle("show", visible)

/* Assignments */

Node.layout = () => (container.classList.contains("horizontal") ? "horizontal" : "vertical")

document.ondragover = dragover_handler
document.ondragend = () => document.body.classList.remove("drag")
document.ondragleave = () => document.body.classList.remove("drag")
document.ondrop = drop_handler

document.querySelectorAll("label.custom-checkbox[data-container-class]").forEach(e => {
	e.querySelector("input[type='checkbox']").onchange = (ev) => document.getElementById("container").classList.toggle(e.getAttribute("data-container-class"), ev.target.checked)
})

document.querySelectorAll('input[type="radio"][name="orientation"]').forEach(e => {
	e.onclick = toggle_layout
})

document.getElementById("active-file").onchange = (ev) => selectFile([...ev.target.files])

Node.ondeletetag = ev => {
	let node = Node.fromDom(ev.target.closest(".node"))
	ev.target.closest(".node-tag").remove()
	node.updateDom()
}

Node.ondeleteattribute = ev => {
	let node = Node.fromDom(ev.target.closest(".node"))
	ev.target.closest("tr").remove()
	node.updateDom()
}


