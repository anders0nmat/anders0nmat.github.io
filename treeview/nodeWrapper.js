
const sort_by_key = (a, b) => {
	if (a[0] < b[0]) {return -1}
	if (a[0] > b[0]) {return  1}
	return 0
}

const svgNS = "http://www.w3.org/2000/svg"

class Node {

	static supportedTypes = new Set([
		"application/xml",
		"text/xml",
		"application/json",
	])

	static TreeNodeType = {
		unnamedObject: "{",
		namedObject: "<",
		unnamedArray: "[",
		text: '"',
		other: "?",
	}

	static layout = () => "vertical"

	static ondeleteattribute = null
	static ondeletetag = null

	_dom_object = null /* Always guaranteed to be null or a .node DOM object */

	_name = null
	_type = null
	_value = null
	_tags = []
	_attributes = {}

	_children = []


	get _head() { return this._dom_object?.querySelector(".node-head") }

	get name() {
		return this._head?.querySelector("#title-name").textContent ?? this._name
		if (this._dom_object) {
			return this._head.querySelector("#title-name").textContent
		}
		else {
			return this._name
		}
	}

	set name(newValue) {
		if (this._dom_object) {
			this._head.querySelector("#title-name").textContent = newValue
		}
		else {
			this._name = newValue
		}
	}

	get type() {
		return this._head?.querySelector("#title-type").textContent ?? this._type
		if (this._dom_object) {
			return this._head.querySelector("#title-type").textContent
		}
		else {
			return this._type
		}
	}

	set type(newValue) {
		if (this._dom_object) {
			this._head.querySelector("#title-tyle").textContent = newValue
		}
		else {
			this._type = newValue
		}
	}

	get value() {
		return this._head?.querySelector("#value-name").textContent ?? this._value
		if (this._dom_object) {
			return this._head.querySelector("#value-name").textContent
		}
		else {
			return this._value
		}
	}

	set value(newValue) {
		if (this._dom_object) {
			this._head.querySelector("#value-name").textContent = newValue

			this.updateDom()
		}
		else {
			this._value = newValue
		}
	}

	get tags() {
		if (this._dom_object) {
			return Array.from(this._head.querySelectorAll("#tags > span")).map(e => e.textContent)
		}
		else {
			return this._tags
		}
	}

	set tags(newValue) {
		if (this._dom_object) {
			let tags_container = this._head.querySelector("#tags")
			tags_container.textContent = "" // Delete all children

			newValue.forEach(e => {
				tags_container.appendChild(createHtmlStructure({
					name: "span", classes: ["node-tag"], innerText: e
				}))
			})

			this.updateDom()
		}
		else {
			this._tags = newValue
		}
	}

	get attributes() {
		if (this._dom_object) {
			return Array.from(this._head.querySelectorAll("#attributes-table .attr-key"))
				.map(e => [e.textContent, e.nextElementSibling.textContent])
				.reduce((prev, e) => {
					prev[e[0]] = e[1]
					return prev
				}, {})
		}
		else {
			return this._attributes
		}
	}

	set attributes(newValue) {
		if (this._dom_object) {
			let table = this._head.querySelector("#attributes-table")
			table.textContent = "" // Delete children
			Object.entries(newValue)
				.sort((a, b) => sort_by_key(a[0], b[0]))
				.forEach(([k, v]) => {
					table.appendChild(createHtmlStructure({name: "tr", children: [
						{name: "td", classes: ["attr-key"], innerText: k},
						{name: "td", classes: ["attr-value"], innerText: v},
					]}))
				})

			this.updateDom()
		}
		else {
			this._attributes = newValue
		}
	}

	addAttribute(name, value = undefined) {
		if (value === undefined) {
			if (this._dom_object) {
				let tags_container = this._head.querySelector("#tags")
				
				tags_container.appendChild(createHtmlStructure(Node.createTagStructure(name)))
	
				this.updateDom()
			}
			else {
				this._tags.push(name)
			}
		}
		else {
			if (this._dom_object) {
				let table = this._head.querySelector("#attributes-table")
				
				table.appendChild(createHtmlStructure(Node.createAttributeStructure(name, value)))

				this.updateDom()
			}
			else {
				this._attributes[name] = value
			}
		}
	}

	removeAttribute(name) {
		if (this._dom_object) {
			let tags_container = this._head.querySelector("#tags")
			
			Array.from(tags_container.children).forEach(e => {
				if (e.textContent == name) {
					tags_container.removeChild(e)
				}
			})


			let table = this._head.querySelector("#attributes-table")
			
			Array.from(table.querySelectorAll("tr")).forEach(e => {
				if (e.querySelector(".attr-key").textContent == name) {
					e.parentElement.removeChild(e)
				}
			})

			this.updateDom()
		}
		else {
			this._tags.splice(this._tags.find(name) ?? this._tags.length, 1)
			delete this._attributes[name]
		}
	}

	get children() {
		if (this._dom_object) {
			return Array.from(this._dom_object.querySelector(".node-children").children)
				.map(e => Node.fromDom(e))
		}
		else {
			return this._children
		}
	}

	// There might be a bug here with holding dom elements that are removed
	set children(newValue) {
		if (this._dom_object) {
			let children_container = this._dom_object.querySelector(".node-children")
			// let oldChildren = Array.from(children_container.children)

			children_container.textContent = "" // Delete children
			newValue.forEach(e => {
				children_container.appendChild(e)
			})
		}
		else {
			this._children = newValue
		}
	}

	appendChild(newChild) {
		if (this._dom_object) {
			this._dom_object.querySelector(".node-children")
				.appendChild(newChild.createDom())
		}
		else {
			this._children.push(newChild)
		}
	}

	removeChild(child) {
		if (this._dom_object) {
			if (child._dom_object) {
				this._dom_object.querySelector(".node-children")
					.removeChild(child._dom_object)
			}
		}
		else {
			this._children.splice(this._children.find(newChild) ?? this._children.length, 1)
		}
	}

	get parent() {
		if (this._dom_object) {return Node.fromDom(this._dom_object.parentElement.closest(".node"))}
	}

	get classList() {
		if (this._dom_object) {return this._dom_object.classList}
	}


	createDom() {
		if (this._dom_object) {return this._dom_object}

		let attribute_list = Object.entries(this._attributes).sort(sort_by_key).map(e => Node.createAttributeStructure(e[0], e[1]))
		let tag_list = this._tags.sort(sort_by_key).map(Node.createTagStructure)
		let children_list = this._children.map(e => e.createDom())

		let status_classes = []
		if (Object.keys(this.attributes).length == 0) {status_classes.push("no-attributes")}
		if (!this.value) {status_classes.push("no-value")}
		if (this.tags.length == 0) {status_classes.push("no-tags")}

		let action_buttons = [
			{name: "button", "data-action": "hide-self", innerText: "Hide"},
			{name: "button", "data-action": "hide-siblings", innerText: "Hide Siblings"},
			{name: "button", "data-action": "hide-children", innerText: "Hide Children"},
			{name: "button", "data-action": "show-siblings", innerText: "Show Siblings"},
			{name: "button", "data-action": "show-children", innerText: "Show Children"},
		]

		let node = createHtmlStructure({name: "div", classes: ["node"], children: [
			{name: "div", classes: ["node-head", ...status_classes], children: [
				{name: "div", id: "title", children: [
					{name: "button", classes: ["edit-button", "material-icons", "icon-button"], innerText: "edit"},
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
						{name: "table", id: "attributes-table", children: attribute_list},
						{name: "button", id: "add-attr-button", classes: ["edit-button", "icon-button", "material-icons"], innerText: "add"}
					]},
				]},
				{name: "div", classes: ["no-value-label"], innerText: "No Value"},
				{name: "div", id: "value", children: [
					{name: "button", classes: ["edit-button", "material-icons", "icon-button"], innerText: "edit"},
					{name: "span", classes: ["value-label"], innerText: 'Value:'},
					{name: "span", id: "value-name", innerText: this.value ?? ""}
				]},
				{name: "div", id: "tags", children: [
					{name: "button", id: "add-tag-button", classes: [
						"node-tag", "edit-button", "material-icons", "icon-button"],
						innerText: "add"
					},
					...tag_list
				]}
			]},
			{name: "div", classes: ["node-children"]},
		]})

		let child_container = node.querySelector(".node-children")
		children_list.forEach(e => child_container.appendChild(e))

		return node
	}

	updateDom() {
		if (!this._dom_object) {return}

		let head = this._head
		head.classList.toggle("no-attributes", Object.keys(this.attributes).length == 0)
		head.classList.toggle("no-value", !this.value)
		head.classList.toggle("no-tags", this.tags.length == 0)
	}

	static makeLine(offset1, length1, offset2, length2, mode) {
		let line = document.createElementNS(svgNS, "line")
		
		if (mode == "vertical") {
			let topLeft = offset1,
				topWidth = length1,
				bottomLeft = offset2,
				bottomWidth = length2
			line.setAttributeNS(null, "x1", topLeft + topWidth / 2)
			line.setAttributeNS(null, "y1", "0")
			line.setAttributeNS(null, "x2", bottomLeft + bottomWidth / 2)
			line.setAttributeNS(null, "y2", "100%")
		}
		else if (mode == "horizontal") {
			line.setAttributeNS(null, "x1", "0")
			line.setAttributeNS(null, "y1", offset1 + length1 / 2)
			line.setAttributeNS(null, "x2", "100%")
			line.setAttributeNS(null, "y2", offset2 + length2 / 2)
		}
	
		return line
	}

	static createLineElement(line1, line2, mode) {
		let svg = document.createElementNS(svgNS, "svg")
	
		svg.style.position = "absolute"
	
		let {x: left1, y: top1, length: length1} = line1
		let {x: left2, y: top2, length: length2} = line2
	
		let topmost = Math.min(top1, top2)
		let leftmost = Math.min(left1, left2)
	
		let maxheight = 0
		let maxwidth = 0

		if (mode == "vertical") {
			maxheight = Math.abs(top1, top2)
			maxwidth = Math.max(left1 + length1, left2 + length2) - leftmost
		} else if (mode == "horizontal") {
			maxheight = Math.max(top1 + length1, top2 + length2) - topmost
			maxwidth = Math.abs(left1, left2)
		}

		/*
		Box is defined by point (leftmost, topmost) and size (maxwidth, maxheight)
		*/
	
		// let lineoff_top = -leftmost + (top1 < top2 ? left1 + width1 / 2 : left2 + width2 / 2)
		// let lineoff_bottom = -leftmost + (top1 > top2 ? left1 + width1 / 2 : left2 + width2 / 2)
	
		svg.style.top = topmost + "px"
		svg.style.left = leftmost + "px"
		svg.style.height = maxheight + "px"
		svg.style.width = maxwidth + "px"
	
		let offset1 = 0
		let size1 = 0
		let offset2 = 0
		let size2 = 0
		let originmost = 0

		if (mode == "vertical") {
			offset1 = top1 < top2 ? left1 : left2
			size1 = top1 < top2 ? length1 : length2
			offset2 = top1 > top2 ? left1 : left2
			size2 = top1 > top2 ? length1 : length2
			originmost = leftmost
		}
		else if (mode == "horizontal") {
			offset1 = left1 < left2 ? top1 : top2
			size1 = left1 < left2 ? length1 : length2
			offset2 = left1 > left2 ? top1 : top2
			size2 = left1 > left2 ? length1 : length2
			originmost = topmost
		}		
	
		svg.appendChild(Node.makeLine(offset1 - originmost, size1, offset2 - originmost, size2, mode))
	
		svg.classList.add("node-connection")
	
		return svg
	}

	static createLine(child, mode) {
		if (child.previousElementSibling?.nodeName == "svg") {
			child.parentElement.removeChild(child.previousElementSibling)
		}

		if (child.matches(".node")) {
			child = child.querySelector(".node-head")
		}
	
		if (child.offsetParent === null) {return} // This child is hidden (display: none)
	
		let head_length = 0
		let container_center = 0
		let projected_left = 0
		let projected_top = 0
		let childLength = 0
		if (mode == "vertical") {
			head_length = child.offsetParent.previousElementSibling.scrollWidth
			container_center = child.offsetParent.scrollWidth / 2
			projected_left = container_center - head_length / 2
			childLength = child.scrollWidth
		}
		else if (mode == "horizontal") {
			head_length = child.offsetParent.previousElementSibling.scrollHeight
			container_center = child.offsetParent.scrollHeight / 2
			projected_top = container_center - head_length / 2
			childLength = child.scrollHeight
		}

		child.insertAdjacentElement("beforebegin", Node.createLineElement(
			{x: child.offsetLeft, y: child.offsetTop, length: childLength},
			{x: projected_left, y: projected_top, length: head_length},
			mode
		))
	}

	static createLines() {
		document.querySelectorAll(":not(#container) > .node > .node-head").forEach(e => Node.createLine(e, Node.layout()))
	}

	updateLines() {
		if (!this._dom_object) {return}
	
		this.children.reverse()
			.forEach(e => Node.createLine(e._head, Node.layout()))
		
		this.parent?.updateLines()
	}

	static createAttributeStructure(name, value) {
		let val_type = []

		if (value === null) {
			val_type = ["attr-value-null"]
		}
		else if (typeof value === "number" || value instanceof Number) {
			val_type = ["attr-value-number"]
		}
		else if (typeof value === "boolean" || value instanceof Boolean) {
			val_type = ["attr-value-bool"]
		}

		return {name: "tr", children: [
			{name: "td", classes: ["edit-button"], children: [
				{
					name: "button",
					classes: ["icon-button", "material-icons"],
					innerText: "close",
					events: { onclick: Node.ondeleteattribute }
				}
			]},
			{name: "td", classes: ["attr-key"], innerText: name},
			{name: "td", classes: ["attr-value", ...val_type], innerText: String(value)},
		]}
	}

	static createTagStructure(name) {
		return {name: "span", classes: ["node-tag"], children: [
			{
				name: "button",
				classes: ["edit-button", "material-icons", "icon-button"],
				innerText: "close",
				events: { onclick: Node.ondeletetag }
			},
			{name: "#text", innerText: name}
		]}
	}


	/* ----- Parsing ----- */

	static fromDom(dom) {
		if (!dom || !dom.matches || !dom.matches(".node")) { return }

		let result = new Node()
		result._dom_object = dom
		return result
	}

	static fromObject(obj) {
		if (typeof obj === "string" || obj instanceof String) {
			obj = JSON.parse(jsonString)
		}

		let result = new Node()

		if (Array.isArray(obj)) { result._type = this.TreeNodeType.unnamedArray }
		else if (typeof obj == "object") { result._type = this.TreeNodeType.unnamedObject }
		else { result._type = this.TreeNodeType.other }

		for (const [key, value] of Object.entries(obj)) {
			if (typeof value == "object" && value != null) {
				let childNode = Node.fromObject(value)
				if (childNode) {
					childNode._name = key
					result._children.push(childNode)
				}
			}
			else if (value === "") {
				result._tags.push(key)
			}
			else {
				result._attributes[key] = value
			}
		}

		result._children.sort((a, b) => sort_by_key(a.name, b.name))

		return result
	}

	static fromTree(tree) {
		if (typeof tree === "string" || tree instanceof String) {
			let parser = new DOMParser()
			tree = parser.parseFromString(xmlString, "text/xml")
		}

		let result = new Node()

		if (tree.nodeName == "#text") { result._type = Node.TreeNodeType.text }
		else if (!tree.nodeName.startsWith("#")) { result._type = Node.TreeNodeType.namedObject }
		else { result._type = Node.TreeNodeType.other }

		if (result.type == Node.TreeNodeType.text) {
			if (!tree.nodeValue || tree.nodeValue.trim() == "") { return }

			result._value = tree.nodeValue.trim()
			result._name = ""

		}
		else {
			result._name = tree.nodeName
			
			let attributes = Array.from(tree.attributes).map(e => [e.name, e.value])

			result._attributes = attributes.filter(e => e[1] != "")
				.reduce((prev, e) => {
					prev[e[0]] = e[1]
					return prev
				}, {})

			result._tags = attributes.filter(([k, v]) => v == "").map(e => e[0])

			let children = Array.from(tree.childNodes).map(e => Node.fromTree(e)).filter(e => e)
			
			if (children.length != 0 && children.every(e => e.type == Node.TreeNodeType.text)) {
				let value = children.reduce((prev, e, idx) => {return prev + (idx == 0 ? "" : " ") + e.value}, "")
				children[0]._value = value
				children = [children[0]]
			}
			
			if (!result.value && children.length == 1 && children[0].type == Node.TreeNodeType.text) {
				result._value = children[0].value
				children = []
			}
			result._children = children
		}
		return result
	}
}
