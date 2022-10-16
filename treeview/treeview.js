
function createHtmlStructure(obj) {
	const default_obj = {
		classes: [],
		id: null,
		innerText: "",
		children: [],
		name: null,
	}
	
	obj = {...default_obj, ...obj}

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

	obj.children.forEach(e => {
		let child = createHtmlStructure(e)
		node.appendChild(child)
	})

	return node
}


class LineManager {
	static svgNS = "http://www.w3.org/2000/svg"

	static makeLine(topLeft, topWidth, bottomLeft, bottomWidth) {
		let line = document.createElementNS(LineManager.svgNS, "line")
		
		line.setAttributeNS(null, "x1", topLeft + topWidth / 2)
		line.setAttributeNS(null, "y1", "0")
		line.setAttributeNS(null, "x2", bottomLeft + bottomWidth / 2)
		line.setAttributeNS(null, "y2", "100%")
	
		return line
	}

	static createLineElement(line1, line2) {
		let svg = document.createElementNS(LineManager.svgNS, "svg")
	
		svg.style.position = "absolute"
	
		let {x: left1, y: top1, width: width1} = line1
		let {x: left2, y: top2, width: width2} = line2
	
		let topmost = Math.min(top1, top2)
		let leftmost = Math.min(left1, left2)
	
		let maxheight = Math.abs(top1, top2)
		let maxwidth = Math.max(left1 + width1, left2 + width2) - leftmost
		
		/*
		Box is defined by point (leftmost, topmost) and size (maxwidth, maxheight)
		*/
	
		// let lineoff_top = -leftmost + (top1 < top2 ? left1 + width1 / 2 : left2 + width2 / 2)
		// let lineoff_bottom = -leftmost + (top1 > top2 ? left1 + width1 / 2 : left2 + width2 / 2)
	
		svg.style.top = topmost + "px"
		svg.style.left = leftmost + "px"
		svg.style.height = maxheight + "px"
		svg.style.width = maxwidth + "px"
	
		let top_left = top1 < top2 ? left1 : left2
		let top_width = top1 < top2 ? width1 : width2
		let bottom_left = top1 > top2 ? left1 : left2
		let bottom_width = top1 > top2 ? width1 : width2
	
		svg.appendChild(LineManager.makeLine(top_left - leftmost, top_width, bottom_left - leftmost, bottom_width))
	
		svg.classList.add("node-connection")
	
		return svg
	}
	
	static createLineToParent(child) {
		if (child.matches(".node")) {
			child = child.querySelector(".node-head")
		}
	
		if (child.offsetParent === null) {return} // This child is hidden (display: none)
	
		let head_width = child.offsetParent.previousElementSibling.scrollWidth
		let container_center = child.offsetParent.scrollWidth / 2
	
		let projected_left = container_center - head_width / 2
	
		return LineManager.createLineElement(
			{x: child.offsetLeft, y: child.offsetTop, width: child.scrollWidth},
			{x: projected_left, y: 0, width: head_width}
		)
	}
	
	static createLine(nodeHead) {
		if (nodeHead.previousElementSibling?.nodeName == "svg") {
			nodeHead.parentElement.removeChild(nodeHead.previousElementSibling)
		}
		let line = LineManager.createLineToParent(nodeHead)
	
		if (line) {
			nodeHead.insertAdjacentElement("beforebegin", line)
		}
	}
	
	static createLines() {
		document.querySelectorAll(":not(#container) > .node > .node-head").forEach(LineManager.createLine)
	}
	
	static updateParentLines(child) {
	
		if (child.matches(".node-head, .node-children")) {
			child = child.parentElement
		}
	
		if (child.matches("#container > .node")) {return}
	
		/*
		<element class="node">
			<element class="node-head">
			<element class="node-children">
				<child>
				...
				<element class="node">
		*/
	
		Array.from(child.parentElement.children).reverse().forEach(e => LineManager.createLine(e.querySelector(".node-head")))
	
		if (child.matches(".node > .node-children > .node")) {
			LineManager.updateParentLines(child.parentElement.parentElement)
		}
	}
}

class Node {

	static supportedTypes = new Set([
		"application/xml",
		"text/xml",
		"application/json",
	])

	static NodeType = {
		unnamedObject: "{",
		unnamedArray: "[",
		namedObject: "<",
		text: '"',
		other: "?"
	}

	constructor() {
		this._name = undefined
		this.tags = []
		this.type = "?"
		this.attributes = []
		this.children = []
		this.value = undefined
	}

	get name() {
		return this._name ?? "root"
	}

	static fromObject(obj) {
		let result = new Node()

		if (Array.isArray(obj)) {
			result.type = this.NodeType.unnamedArray
		}
		else if (typeof obj == "object") {
			result.type = this.NodeType.unnamedObject
		}
		else {
			result.type = this.NodeType.other
		}

		const splitObject = obj => {
			let attributes = []
			let children = []
			let tags = []
			for (const [key, value] of Object.entries(obj)) {
				if (typeof value == "object" && value != null) {
					children.push({key: key, value: value})
				}
				else if (value === "") {
					tags.push(key)
				}
				else {
					attributes.push({key: key, value: value})
				}
			}
		
			let sort_by_key = (a, b) => {
				if (a.key < b.key) { return -1 }
				if (a.key > b.key) { return 1 }
				return 0
			}
		
			attributes.sort(sort_by_key)
			children.sort(sort_by_key)
			return {attributes: attributes, children: children, tags: tags}
		}

		let {attributes, children, tags} = splitObject(obj)

		result.attributes = attributes
		result.children = children.map( e => {
			let child = Node.fromObject(e.value)
			if (child) {
				child._name = e.key
				return child
			}
		}).filter(e => e)
		result.tags = tags

		return result
	}

	static fromDom(tree) {
		let result = new Node()

		if (tree.nodeName == "#text") {
			result.type = this.NodeType.text
		}
		else if (!tree.nodeName.startsWith("#")) {
			result.type = this.NodeType.namedObject
		}
		else {
			result.type = this.NodeType.other
		}

		if (result.type == this.NodeType.text) {
			// If empty text node, abort
			if (!tree.nodeValue || tree.nodeValue.trim() == "") {
				return
			}

			result.value = tree.nodeValue
			result._name = ""

			return result
		}

		result._name = tree.nodeName

		let sort_by_key = (a, b) => {
			if (a.key < b.key) { return -1 }
			if (a.key > b.key) { return 1 }
			return 0
		}

		let attributes = []

		for (let idx = 0; idx < tree.attributes.length; idx++) {
			attributes.push({
				key: tree.attributes[idx].name,
				value: tree.attributes[idx].value
			})
		}
		attributes.sort(sort_by_key)

		let tags = attributes.filter(e => e.value == "").map(e => e.key)
		attributes = attributes.filter(e => e.value != "")

		let children = []
		tree.childNodes.forEach(e => {
			let child = Node.fromDom(e)
			if (child) {
				children.push(child)
			}
		})

		result.attributes = attributes
		result.tags = tags
		result.children = children

		return result
	}

	createNodeStructure() {
		let attributes = this.attributes.map(e => {
			return {name: "tr", children: [
				{name: "td", innerText: e.key},
				{name: "td", innerText: String(e.value)},
			]}
		})
	
		let children = this.children.map(e => e.createNodeStructure())
	
		let tags = this.tags.map(e => {
			return {name: "span", classes: ["node-tag"], innerText: e}
		})

		let status_classes = []
		if (attributes.length == 0) {status_classes.push("no-attributes")}
		if (!this.value) {status_classes.push("no-value")}
		if (tags.length == 0) {status_classes.push("no-tags")}

		let action_buttons = [
			{name: "button", "data-action": "hide-self", innerText: "Hide"},
			{name: "button", "data-action": "hide-siblings", innerText: "Hide Siblings"},
			{name: "button", "data-action": "hide-children", innerText: "Hide Children"},
			{name: "button", "data-action": "show-siblings", innerText: "Show Siblings"},
			{name: "button", "data-action": "show-children", innerText: "Show Children"},
		]
		
	
		return {name: "div", classes: ["node"], children: [
			{name: "div", classes: ["node-head", ...status_classes], children: [
				{name: "div", id: "title", children: [
					{name: "span", id: "title-type", innerText: this.type},
					{name: "span", id: "title-name", innerText: this.name},
					{name: "div", classes: ["dropdown"], children: [
						{name: "button", id: "filter-button", classes: ["material-icons", "icon-button"], innerText: "visibility"},
						{name: "div", children: action_buttons}
					]}
				]},
				{name: "div", classes: ["no-attributes-label"], innerText: "No Attributes"},
				{name: "details", classes: ["attributes"], children: [
					{name: "summary", innerText: "Attributes"},
					{name: "div", classes: ["attribute-container"], children: [
						{name: "table", id: "attributes-table", children: attributes}
					]}
				]},
				{name: "div", classes: ["no-value-label"], innerText: "No Value"},
				{name: "div", id: "value", children: [
					{name: "span", id: "value-type", innerText: 'str'},
					{name: "span", classes: ["value-label"], innerText: 'Value:'},
					{name: "span", id: "value-name", innerText: this.value ?? "No Value"}
				]},
				{name: "div", id: "tags", children: tags}
			]},
			{name: "div", classes: ["node-children"], children: children}
		]}
	}
}

function loadNodeObject(node) {
	nodeResizeObserver.disconnect()
	container.textContent = "" // To remove all old nodes

	container.appendChild(createHtmlStructure(node.createNodeStructure()))

	LineManager.createLines()
	
	document.querySelectorAll(":not(#container) > .node > .node-head").forEach(e => {
		nodeResizeObserver.observe(e)
	})

	document.querySelectorAll(".node-head .dropdown").forEach(e => {
		e.querySelector("button.material-icons.icon-button").onclick = (ev) => {
			ev.target.parentElement.classList.toggle('show')
		}

		e.querySelectorAll("div > button[data-action]").forEach(btn => {
			btn.onclick = nodeSettingClick
		})
	})
}

function loadJsonObject(obj) {
	loadNodeObject(Node.fromObject(obj))
}

function loadXmlObject(obj) {
	loadNodeObject(Node.fromDom(obj.firstElementChild))
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

	let elemNode = elem.closest(".node")
	let parentNode = elemNode.parentElement.closest(".node")

	switch (action) {
		case "hide-self":
			if (!parentNode) {break}
			elemNode.classList.add("hidden")
			LineManager.updateParentLines(elemNode)

			parentNode.classList.add("filter-active")
			break;
		case "hide-siblings":
			if (!parentNode) {break}
			Array.from(parentNode.querySelector(".node-children").children).forEach(e => {
				if (elemNode.isSameNode(e)) {return}
				
				e.classList.add("hidden")
			})
			LineManager.updateParentLines(elemNode)

			parentNode.classList.add("filter-active")
			break;
		case "hide-children":
			Array.from(elemNode.querySelector(".node-children").children).forEach(e => {
				e.classList.add("hidden")
			})
			LineManager.updateParentLines(elemNode)

			elemNode.classList.add("filter-active")
			break;
		case "show-siblings": 
			Array.from(parentNode.querySelector(".node-children").children).forEach(e => {				
				e.classList.remove("hidden")
			})
			LineManager.updateParentLines(elemNode)

			parentNode.classList.remove("filter-active")
			break;
		case "show-children":
			Array.from(elemNode.querySelector(".node-children").children).forEach(e => {
				e.classList.remove("hidden")
			})
			LineManager.updateParentLines(elemNode)

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
			btn.textContent = "brightness_2"
			break
		case 2:
			document.body.classList.remove("light-theme")
			document.body.classList.remove("dark-theme")
			btn.textContent = "brightness_4"
			break
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

	let files = []

	if (ev.dataTransfer.items) {
		[...ev.dataTransfer.items].forEach(e => {
			if (e.kind == "file") {
				files.push(e.getAsFile())
			}
		})
	}

	if (!files || files.lenght == 0) {return}

	let file = files.find(e => Node.supportedTypes.has(e.type))

	if (!file) {return}

	selectFile(file)
}

/* Variables */
let container = document.getElementById("container")
let settingsContainer = document.getElementById("settings")

let nodeResizeObserver = new ResizeObserver(entries => entries.forEach(e => LineManager.updateParentLines(e.target)))

let show_settings = visible => settingsContainer.classList.toggle("show", visible)

/* Assignments */

document.ondragover = dragover_handler
document.ondragend = () => document.body.classList.remove("drag")
document.ondragleave = () => document.body.classList.remove("drag")
document.ondrop = drop_handler

document.querySelectorAll("label.custom-checkbox[data-container-class]").forEach(e => {
	e.querySelector("input[type='checkbox']").onchange = (ev) => document.getElementById("container").classList.toggle(e.getAttribute("data-container-class"), ev.target.checked)
})

document.getElementById("active-file").onchange = (ev) => selectFile([...ev.target.files])
