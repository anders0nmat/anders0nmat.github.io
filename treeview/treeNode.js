function getRandomId() {
	function getFourHex() {
		return Math.trunc(Math.random() * 0x1000).toString(16).toLowerCase()
	}

	return getFourHex() + getFourHex() + "-" + getFourHex() + "-" + getFourHex() + getFourHex() + getFourHex()
}

class TreeNode {
	static supportedTypes = new Set([
		// "application/xml",
		// "text/xml",
		// "application/json",
	])

	static TreeNodeType = {
		unnamedObject: "{",
		unnamedArray: "[",
		namedArray: "<",
		text: '"',
		other: "?",
	}

	static nodeMap = {}

	static sort_by_key = (a, b) => {
		if (a[0] < b[0]) {return -1}
		if (a[0] > b[0]) {return  1}
		return 0
	}

	_id = null /* Links this class with a DOM element */
	_name = null /* Depending on type, this is the name of the object or the name this object is registered as */
	_type = null
	_value = null
	_tags = Set()
	_attributes = {}
	_parent = null
	_children = []

	constructor(properties = {
		name: null,
		type: null,
		value: null,
		tags: [],
		attributes: {},
		children: [],
	}) {
		do { this.generateId() } while (TreeNode.nodeMap[this.id] !== undefined)
		this._name = properties.name
		this._type = properties.type
		this._value = properties.value
		this._tags = properties.tags
		this._attributes = properties.attributes
		this._children = properties.children

		TreeNode.nodeMap[this.id] = this
	}

	get id() { return this._id }
	get name() { return this._name }
	get type() { return this._type }
	get value() { return this._value }
	get tags() { return this._tags }
	get attributes() { return this._attributes }
	get parent() { return this._parent }
	get children() { return this._children }

	set name(newValue) {
		this._name = newValue
		this.updateDom()
	}

	set type(newValue) {
		this._type = newValue
		this.updateDom()
	}

	set value(newValue) {
		this._value = newValue
		this.updateDom()
	}

	set tags(newValue) {
		this._tags = newValue
		this.updateDom()
	}

	set attributes(newValue) {
		this._attributes = newValue
		this.updateDom()
	}

	generateId() { this._id = getRandomId() }

	createDom() {

		let attribute_list = Object.entries(this._attributes).sort(sort_by_key).map(e => {
			return {name: "tr", children: [
					{name: "td", innerText: e[0]},
					{name: "td", innerText: e[1]},
				]}
		})

		let tag_list = Array(this._tags).sort(sort_by_key).map(e => {
			return {name: "span", classes: ["node-tag"], innerText: e}
		})

		let children_list = this._children.map(e => e.createDom())

		let status_classes = []
		if (attribute_list.length == 0) {status_classes.push("no-attributes")}
		if (!this.value) {status_classes.push("no-value")}
		if (tag_list.length == 0) {status_classes.push("no-tags")}

		let action_buttons = [
			{name: "button", "data-action": "hide-self", innerText: "Hide"},
			{name: "button", "data-action": "hide-siblings", innerText: "Hide Siblings"},
			{name: "button", "data-action": "hide-children", innerText: "Hide Children"},
			{name: "button", "data-action": "show-siblings", innerText: "Show Siblings"},
			{name: "button", "data-action": "show-children", innerText: "Show Children"},
			{name: "button", "data-action": "mark-optional", innerText: "Mark Optional"},
		]

		let node = createHtmlStructure({name: "div", classes: ["node"], "data-id": this.id, children: [
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
						{name: "table", id: "attributes-table", children: attribute_list}
					]}
				]},
				{name: "div", classes: ["no-value-label"], innerText: "No Value"},
				{name: "div", id: "value", children: [
					{name: "span", id: "value-type", innerText: 'str'},
					{name: "span", classes: ["value-label"], innerText: 'Value:'},
					{name: "span", id: "value-name", innerText: this.value ?? "No Value"}
				]},
				{name: "div", id: "tags", children: tag_list}
			]},
			{name: "div", classes: ["node-children"]}
		]})

		let child_container = node.querySelector(".node-children")
		children_list.forEach(e => {
			child_container.appendChild(e)
		})

		return node
	}

	updateDom() {
		let domNode = document.querySelector(`.node[data-id="${this.id}"]`)
		if (!domNode) {return}

		let domHead = document.querySelector(".node-head")
		if (!domHead) {return}

		domHead.querySelector("#title-type").textContent = this.type
		domHead.querySelector("#title-name").textContent = this.name

		let attribute_list = Object.entries(this._attributes).sort(sort_by_key).map(e => {
			return createHtmlStructure({
				name: "tr", children: [
					{name: "td", innerText: e[0]},
					{name: "td", innerText: e[1]},
				]
			})
		})

		let tag_list = Array(this._tags).sort(sort_by_key).map(e => {
			return createHtmlStructure({name: "span", classes: ["node-tag"], innerText: e})
		})

		let status_classes = []
		if (attribute_list.length == 0) {status_classes.push("no-attributes")}
		if (!this.value) {status_classes.push("no-value")}
		if (tag_list.length == 0) {status_classes.push("no-tags")}

		let table = domHead.querySelector("#attributes-table") 
		table.textContent = "" // Delete children
		attribute_list.forEach(e => table.appendChild(e))

		domHead.querySelector("#value-name").textContent = this.value ?? ""

		let tags = domHead.querySelector("#tags")
		tags.textContent = "" // Delete children
		tag_list.forEach(e => tags.appendChild(e))

		let domChildContainer = domNode.querySelector(".node-children")
		let domChilds = Array.from(domChildContainer?.children).reduce((prev, e) => {
			prev[e.getAttribute("data-id")] = e
		}, {})

		domNode.querySelector(".node-children").textContent = "" // Delete children
		
		// [ "id1", "id3", "id2", "id5", "id6"]
		// [ "id1", "id2", "id3", "id4", "id5"]

		this._children.forEach(e => {
			if (domChilds[e.id] != undefined) {
				domChildContainer.appendChild(domChilds[e])
			}
			else {
				domChildContainer.appendChild(e.createDom())
			}
		})

		this.updateLines()
	}

	updateLines() {

		if (parent) {this.parent.updateLines()}
	}

	appendChild(childNode) {
		this._children.push(childNode)
		childNode._parent = this
	}

	removeChild(childNode) {
		this._children = this._children.filter(e => e !== childNode)
		delete nodeMap[childNode.id]
	}

	static fromObject(obj) {
		let result = new TreeNode()

		if (Array.isArray(obj)) { result._type = this.TreeNodeType.unnamedArray }
		else if (typeof obj == "object") { result._type = this.TreeNodeType.unnamedObject }
		else { result._type = this.TreeNodeType.other }

		for (const [key, value] of Object.entries(obj)) {
			if (typeof value == "object" && value != null) {
				let childNode = TreeNode.fromObject(value)
				if (childNode) {
					childNode._name = key
					childNode._parent = result
					result._children.push(childNode)
				}
			}
			else if (value === "") {
				this._tags.add(key)
			}
			else {
				attributes[key] = value
			}
		}

		result._children.sort((a, b) => this.sort_by_key(a.name, b.name))

		return result
	}

	// TODO : In Value Collapsing, remove deleted nodes from nodeMap
	static fromDom(tree) {
		let result = new TreeNode()

		if (tree.nodeName == "#text") { result._type = this.TreeNodeType.text }
		else if (!tree.nodeName.startsWith("#")) { result._type = this.TreeNodeType.namedObject }
		else { result._type = this.TreeNodeType.other }

		if (result.type == this.TreeNodeType.text) {
			if (!tree.nodeValue || tree.nodeValue.trim() == "") { return }

			result._value = tree.nodeValue.trim()
			result._name = ""

		}
		else {
			result._name = tree.nodeName
			
			let attributes = Array.from(tree.attributes).map(e => [e.name, e.value])

			result._attributes = attributes.filter(([k, v]) => v != "").reduce((prev, e) => {
				prev[e[0]] = e[1]
			}, {})

			result._tags = attributes.filter(([k, v]) => v == "").map(e => e[0])

			result._children = Array.from(tree.childNodes).map(e => TreeNode.fromDom(e)).filter(e => e)

			if (result._children.length != 0 && result._children.every(e => e.type == this.NodeType.text)) {
				let value = result._children.reduce((prev, e, idx) => {return prev + (idx == 0 ? "" : " ") + e.value}, "")
				result._children[0]._value = value
				result._children = [result._children[0]]
			}

			if (!result.value && result._children.length == 1 && result._children[0].type == this.NodeType.text) {
				result._value = children[0].value
				children = []
			}
		}
		return result
	}
}
