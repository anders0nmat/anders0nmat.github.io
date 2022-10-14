
function createHtmlStructure(obj) {
	const default_obj = {
		classes: [],
		id: undefined,
		innerText: "",
		children: []
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

	obj.children.forEach(e => {
		let child = createHtmlStructure(e)
		node.appendChild(child)
	})

	return node
}

function splitObject(obj) {
	let attributes = []
	let children = []
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value == "object" && value != null) {
			children.push({key: key, value: value})
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
	return {attributes: attributes, children: children}
}

function createNodeStructureFromObj(obj) {
	
	/*
	obj = {
		attributes: [{string, value}],
	 	children: [{string, obj}],
	 	name: string | int
	 	type: string
	}
	*/
	console.log("object is", obj)
	let attributes = obj.attributes.map(e => {
		return {name: "tr", children: [
			{name: "td", innerText: e.key},
			{name: "td", innerText: String(e.value)},
		]}
	})

	let children = obj.children.map(e => {
		/*let {attributes, children} = splitObject(e.value)
		return createNodeStructureFromObj({
			attributes: attributes,
			children: children,
			name: e.key,
			type: Array.isArray(e.value) ? "[" : "{"
		})*/
		return createNodeStructureFromObj(e)
	})

	let tags = obj.tags.map(e => {
		return {name: "span", classes: ["node-tag"], innerText: e}
	})

	return {name: "div", classes: ["node"], children: [
		{name: "div", classes: ["node-head"], children: [
			{name: "div", id: "title", children: [
				{name: "span", id: "title-type", innerText: obj.type},
				{name: "span", id: "title-name", innerText: obj.name}
			]},
			{name: "details", children: [
				{name: "summary", innerText: "Attributes"},
				{name: "table", id: "attributes", children: [
					...attributes
				]}
			]},
			{name: "div", id: "value", children: [
				{name: "span", id: "value-type", innerText: '"'},
				{name: "span", innerText: 'Value:'},
				{name: "span", id: "value-name", innerText: 'No Value'}
			]},
			{name: "div", id: "tags", children: [
				...tags
			]}
		]},
		{name: "div", classes: ["node-children"], children: [
			...children
		]}
	]}
}

class Node {

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

	// static splitObject(obj) {
	// 	let attributes = []
	// 	let children = []
	// 	let tags = []
	// 	for (const [key, value] of Object.entries(obj)) {
	// 		if (typeof value == "object" && value != null) {
	// 			children.push({key: key, value: value})
	// 		}
	// 		else if (value === "") {
	// 			tags.push(key)
	// 		}
	// 		else {
	// 			attributes.push({key: key, value: value})
	// 		}
	// 	}
	
	// 	let sort_by_key = (a, b) => {
	// 		if (a.key < b.key) { return -1 }
	// 		if (a.key > b.key) { return 1 }
	// 		return 0
	// 	}
	
	// 	attributes.sort(sort_by_key)
	// 	children.sort(sort_by_key)
	// 	return {attributes: attributes, children: children, tags: tags}
	// }

	static fromObject(obj) {
		let result = new Node()

		if (Array.isArray(obj)) {
			result.type = "["
		}
		else if (typeof obj == "object") {
			result.type = "{"
		}
		else {
			result.type = "?"
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
			result.type = "abc"
		}
		else if (!tree.nodeName.startsWith("#")) {
			result.type = "<"
		}
		else {
			result.type = "?"
		}

		if (result.type == "abc") {
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
	
		return {name: "div", classes: ["node"], children: [
			{name: "div", classes: ["node-head"], children: [
				{name: "div", id: "title", children: [
					{name: "span", id: "title-type", innerText: this.type},
					{name: "span", id: "title-name", innerText: this.name}
				]},
				{name: "details", children: [
					{name: "summary", innerText: "Attributes"},
					{name: "table", id: "attributes", children: [
						...attributes
					]}
				]},
				{name: "div", id: "value", children: [
					{name: "span", id: "value-type", innerText: 'str'},
					{name: "span", innerText: 'Value:'},
					{name: "span", id: "value-name", innerText: this.value ?? "No Value"}
				]},
				{name: "div", id: "tags", children: [
					...tags
				]}
			]},
			{name: "div", classes: ["node-children"], children: [
				...children
			]}
		]}
	}
}


function loadJsonObject(obj) {
	let container = document.getElementById("container")
	container.textContent = "" // To remove all old nodes

	let objectNode = Node.fromObject(obj)
	let node = createHtmlStructure(objectNode.createNodeStructure())
	container.appendChild(node)
}

function loadXmlObject(obj) {
	let container = document.getElementById("container")
	container.textContent = "" // To remove all old nodes

	let objectNode = Node.fromDom(obj.firstElementChild)
	let node = createHtmlStructure(objectNode.createNodeStructure())
	container.appendChild(node)

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


let fileUpload = document.getElementById("fileUpload")
fileUpload.onchange = e => {
	let [file] = fileUpload.files
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
		}
	}
	reader.readAsText(file)
}
