class m {
  position = 0;
  line = 1;
  column = 1;
  xml = "";
  parse(e) {
    this.xml = e, this.position = 0, this.line = 1, this.column = 1;
    const t = [];
    try {
      for (this.skipWhitespace(), this.peek(0, 5) === "<?xml" && (this.skipDeclaration(), this.skipWhitespace()); this.position < this.xml.length && this.current() === "<"; )
        if (this.peek() === "!")
          this.skipComment(), this.skipWhitespace();
        else if (this.peek() === "?")
          this.skipProcessingInstruction(), this.skipWhitespace();
        else
          break;
      return { node: this.parseElement(), errors: t };
    } catch (s) {
      return t.push({
        line: this.line,
        column: this.column,
        message: s instanceof Error ? s.message : "Unknown parsing error",
        code: "PARSE_ERROR"
      }), { node: null, errors: t };
    }
  }
  parseElement() {
    if (this.current() !== "<")
      throw new Error(`Expected '<' but found '${this.current()}'`);
    if (this.advance(), this.current() === "/")
      throw new Error("Unexpected end tag");
    const e = this.parseName(), t = this.parseAttributes();
    if (this.skipWhitespace(), this.current() === "/" && this.peek() === ">")
      return this.advance(), this.advance(), { name: e, attributes: t, children: [] };
    if (this.current() !== ">")
      throw new Error(`Expected '>' but found '${this.current()}'`);
    return this.advance(), this.parseElementContent(e, t);
  }
  parseElementContent(e, t) {
    const s = [];
    let r = "";
    for (this.skipWhitespace(), this.skipComment(); this.position < this.xml.length; ) {
      if (this.current() === "<") {
        if (this.peek() === "/")
          break;
        r.trim() && (s.push({
          name: "#text",
          attributes: {},
          children: [],
          text: r.trim()
        }), r = ""), s.push(this.parseElement());
        continue;
      }
      r += this.current(), this.advance();
    }
    return this.parseEndTag(e), this.buildElementNode(e, t, s, r);
  }
  parseEndTag(e) {
    if (this.current() === "<" && this.peek() === "/") {
      this.advance(), this.advance();
      const t = this.parseName();
      if (t !== e)
        throw new Error(
          `End tag '${t}' does not match start tag '${e}'`
        );
      if (this.skipWhitespace(), this.current() !== ">")
        throw new Error("Expected '>' in end tag");
      this.advance();
    }
  }
  buildElementNode(e, t, s, r) {
    const i = { name: e, attributes: t, children: s };
    return r.trim() && s.length === 0 && (i.text = r.trim()), i;
  }
  parseAttributes() {
    const e = {};
    for (; this.position < this.xml.length && (this.skipWhitespace(), !(this.current() === ">" || this.current() === "/" || this.current() === "?")); ) {
      const t = this.parseName();
      if (this.skipWhitespace(), this.current() !== "=")
        throw new Error(`Expected '=' after attribute name '${t}'`);
      this.advance(), this.skipWhitespace();
      const s = this.parseAttributeValue();
      e[t] = s;
    }
    return e;
  }
  parseAttributeValue() {
    const e = this.current();
    if (e !== '"' && e !== "'")
      throw new Error(`Expected quote but found '${e}'`);
    this.advance();
    let t = "";
    for (; this.position < this.xml.length && this.current() !== e; )
      this.current() === "&" ? t += this.parseEntity() : (t += this.current(), this.advance());
    if (this.current() !== e)
      throw new Error("Unterminated attribute value");
    return this.advance(), t;
  }
  parseName() {
    let e = "";
    const t = this.current();
    if (!this.isNameStartChar(t))
      throw new Error(`Invalid name start character: '${t}'`);
    for (; this.position < this.xml.length; ) {
      const s = this.current();
      if (this.isNameChar(s))
        e += s, this.advance();
      else
        break;
    }
    if (!e)
      throw new Error("Expected element name");
    return e;
  }
  isNameStartChar(e) {
    return e ? /[a-zA-Z_]/.test(e) || e.charCodeAt(0) >= 192 && e.charCodeAt(0) <= 214 || e.charCodeAt(0) >= 216 && e.charCodeAt(0) <= 246 || e.charCodeAt(0) >= 248 : !1;
  }
  parseEntity() {
    if (this.current() !== "&")
      throw new Error("Expected entity");
    this.advance();
    let e = "";
    for (; this.position < this.xml.length && this.current() !== ";"; )
      e += this.current(), this.advance();
    if (this.current() !== ";")
      throw new Error("Unterminated entity");
    switch (this.advance(), e) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      case "apos":
        return "'";
      default:
        if (e.startsWith("#")) {
          const t = e.startsWith("#x") ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
          return String.fromCharCode(t);
        }
        return `&${e};`;
    }
  }
  skipDeclaration() {
    for (; this.position < this.xml.length && !(this.current() === "?" && this.peek() === ">"); )
      this.advance();
    this.current() === "?" && this.advance(), this.current() === ">" && this.advance();
  }
  skipComment() {
    this.peek(0, 4) === "<!--" ? this.skipXmlComment() : this.peek(0, 9) === "<!DOCTYPE" && this.skipDoctype();
  }
  skipXmlComment() {
    for (this.position += 4; this.position < this.xml.length - 2; ) {
      if (this.xml.substring(this.position, this.position + 3) === "-->") {
        this.position += 3;
        break;
      }
      this.advance();
    }
  }
  skipDoctype() {
    let e = 0;
    for (; this.position < this.xml.length; ) {
      if (this.current() === "<")
        e++;
      else if (this.current() === ">" && (e--, e === 0)) {
        this.advance();
        break;
      }
      this.advance();
    }
  }
  skipProcessingInstruction() {
    for (; this.position < this.xml.length - 1; ) {
      if (this.current() === "?" && this.peek() === ">") {
        this.advance(), this.advance();
        break;
      }
      this.advance();
    }
  }
  skipWhitespace() {
    for (; this.position < this.xml.length && this.isWhitespace(this.current()); )
      this.advance();
  }
  isWhitespace(e) {
    return e === " " || e === "	" || e === `
` || e === "\r";
  }
  isNameChar(e) {
    return e ? /[a-zA-Z0-9_:.-]/.test(e) || e.charCodeAt(0) >= 192 && e.charCodeAt(0) <= 214 || e.charCodeAt(0) >= 216 && e.charCodeAt(0) <= 246 || e.charCodeAt(0) >= 248 : !1;
  }
  current() {
    return this.xml[this.position] || "";
  }
  peek(e = 1, t = 1) {
    return t === 1 ? this.xml[this.position + e] || "" : this.xml.substring(
      this.position + e,
      this.position + e + t
    ) || "";
  }
  advance() {
    this.position < this.xml.length && (this.xml[this.position] === `
` ? (this.line++, this.column = 1) : this.column++, this.position++);
  }
}
class p {
  xmlParser = new m();
  parseSchema(e) {
    const { node: t, errors: s } = this.xmlParser.parse(e);
    if (s.length > 0 || !t)
      return { schema: null, errors: s };
    try {
      return { schema: this.buildSchema(t), errors: [] };
    } catch (r) {
      return s.push({
        line: 1,
        column: 1,
        message: r instanceof Error ? r.message : "Schema parsing error",
        code: "SCHEMA_ERROR"
      }), { schema: null, errors: s };
    }
  }
  buildSchema(e) {
    if (e.name !== "schema" && !e.name.endsWith(":schema"))
      throw new Error("Root element must be schema");
    const t = {
      targetNamespace: e.attributes.targetNamespace,
      elements: {},
      complexTypes: {},
      simpleTypes: {},
      namespaces: {}
    };
    for (const [s, r] of Object.entries(e.attributes))
      if (s.startsWith("xmlns:")) {
        const i = s.substring(6);
        t.namespaces[i] = r;
      } else s === "xmlns" && (t.namespaces[""] = r);
    for (const s of e.children)
      switch (this.getLocalName(s.name)) {
        case "element":
          const i = this.parseElement(s);
          t.elements[i.name] = i;
          break;
        case "complexType":
          const n = this.parseComplexType(s);
          t.complexTypes[n.name] = n;
          break;
        case "simpleType":
          const a = this.parseSimpleType(s);
          t.simpleTypes[a.name] = a;
          break;
      }
    return t;
  }
  parseElement(e) {
    const t = {
      name: e.attributes.name || "",
      type: e.attributes.type || "string",
      minOccurs: parseInt(e.attributes.minOccurs || "1"),
      maxOccurs: e.attributes.maxOccurs === "unbounded" ? "unbounded" : parseInt(e.attributes.maxOccurs || "1"),
      attributes: [],
      children: [],
      namespace: e.namespace
    };
    for (const s of e.children)
      switch (this.getLocalName(s.name)) {
        case "complexType":
          this.parseComplexType(s), t.type = `#inline-${t.name}`;
          break;
        case "simpleType":
          const i = this.parseSimpleType(s);
          t.type = `#inline-${t.name}`, t.restrictions = i.restrictions;
          break;
      }
    return t;
  }
  parseComplexType(e) {
    const t = {
      name: e.attributes.name || "",
      compositor: "",
      elements: [],
      attributes: []
    };
    let s = e.children;
    s.length === 1 && this.getLocalName(s[0].children[0].name) === "choice" && (s = s[0].children);
    for (const r of s) {
      const i = this.getLocalName(r.name);
      switch (i) {
        case "sequence":
        case "choice":
        case "all":
          t.compositor = i;
          for (const o of r.children)
            this.getLocalName(o.name) === "element" && t.elements.push(this.parseElement(o));
          break;
        case "attribute":
          t.attributes.push(this.parseAttribute(r));
          break;
        case "simpleContent":
          const n = r.children.find(
            (o) => this.getLocalName(o.name) === "extension"
          ), a = n?.children.find(
            (o) => this.getLocalName(o.name) === "attribute"
          );
          a && t.attributes.push(this.parseAttribute(a)), t.baseType = n?.attributes.base;
          break;
      }
    }
    return t;
  }
  parseSimpleType(e) {
    const t = {
      name: e.attributes.name || "",
      baseType: "string",
      restrictions: []
    };
    for (const s of e.children)
      if (this.getLocalName(s.name) === "restriction") {
        t.baseType = s.attributes.base || "string";
        for (const i of s.children) {
          const n = this.getLocalName(i.name), a = i.attributes.value;
          if (a !== void 0) {
            const o = {
              type: n,
              value: isNaN(Number(a)) ? a : Number(a)
            };
            t.restrictions.push(o);
          }
        }
      }
    return t;
  }
  parseAttribute(e) {
    return {
      name: e.attributes.name || "",
      type: e.attributes.type || "string",
      use: e.attributes.use || "optional",
      defaultValue: e.attributes.default,
      fixedValue: e.attributes.fixed
    };
  }
  getLocalName(e) {
    const t = e.indexOf(":");
    return t === -1 ? e : e.substring(t + 1);
  }
}
class d {
  schema;
  errors = [];
  constructor(e) {
    this.schema = e;
  }
  getLocalType(e) {
    const t = e.indexOf(":");
    return t === -1 ? e : e.substring(t + 1);
  }
  validate(e) {
    this.errors = [];
    const t = this.schema.elements[e.name];
    return t ? (this.validateElement(e, t, 1, 1), this.errors) : (this.addError(
      1,
      1,
      `Root element '${e.name}' not found in schema`,
      "ELEMENT_NOT_FOUND"
    ), this.errors);
  }
  validateElement(e, t, s, r) {
    if (e.name !== t.name) {
      this.addError(
        s,
        r,
        `Expected element '${t.name}' but found '${e.name}'`,
        "ELEMENT_MISMATCH"
      );
      return;
    }
    this.validateAttributes(e, t, s, r), this.getLocalType(t.type), this.isBuiltInType(t.type) ? this.validateSimpleContent(e, t, s, r) : this.schema.complexTypes[t.type] ? this.validateComplexContent(
      e,
      this.schema.complexTypes[t.type],
      s,
      r
    ) : this.schema.simpleTypes[t.type] ? this.validateSimpleTypeContent(
      e,
      this.schema.simpleTypes[t.type],
      s,
      r
    ) : t.type.startsWith("#inline-") && this.validateInlineContent(e, t, s, r);
  }
  validateAttributes(e, t, s, r) {
    const i = this.schema.complexTypes[t.type];
    if (i) {
      for (const n of i.attributes)
        n.use === "required" && !e.attributes[n.name] && this.addError(
          s,
          r,
          `Required attribute '${n.name}' is missing`,
          "MISSING_REQUIRED_ATTRIBUTE"
        );
      for (const [n, a] of Object.entries(e.attributes)) {
        if (n === "xmlns") {
          console.warn(
            '[AKAR] proper handle element XML namespace switching by attribute "xmlns".'
          );
          continue;
        }
        const o = i.attributes.find((c) => c.name === n);
        if (!o) {
          this.addError(
            s,
            r,
            `Attribute '${n}' is not allowed`,
            "UNEXPECTED_ATTRIBUTE"
          );
          continue;
        }
        o.fixedValue && a !== o.fixedValue && this.addError(
          s,
          r,
          `Attribute '${n}' must have value '${o.fixedValue}'`,
          "FIXED_VALUE_VIOLATION"
        ), this.validateSimpleValue(a, o.type) || this.addError(
          s,
          r,
          `Invalid value '${a}' for attribute '${n}' of type '${o.type}'`,
          "INVALID_ATTRIBUTE_VALUE"
        );
      }
    }
  }
  validateSimpleContent(e, t, s, r) {
    if (e.children.length > 0 && e.children.some((n) => n.name !== "#text")) {
      this.addError(
        s,
        r,
        `Element '${e.name}' should contain simple content but has child elements`,
        "INVALID_CONTENT"
      );
      return;
    }
    const i = e.text || e.children.find((n) => n.name === "#text")?.text || ".ts";
    this.validateSimpleValue(i, t.type) || this.addError(
      s,
      r,
      `Invalid value '${i}' for element '${e.name}' of type '${t.type}'`,
      "INVALID_ELEMENT_VALUE"
    ), t.restrictions && this.validateRestrictions(
      i,
      t.restrictions,
      s,
      r,
      e.name
    );
  }
  validateSimpleTypeContent(e, t, s, r) {
    const i = e.text || e.children.find((n) => n.name === "#text")?.text || "";
    this.validateSimpleValue(i, t.baseType) || this.addError(
      s,
      r,
      `Invalid value '${i}' for base type '${t.baseType}'`,
      "INVALID_SIMPLE_TYPE_VALUE"
    ), this.validateRestrictions(
      i,
      t.restrictions,
      s,
      r,
      e.name
    );
  }
  validateComplexContent(e, t, s, r) {
    const i = e.children.filter(
      (n) => n.name !== "#text"
    );
    for (const n of t.elements) {
      const a = i.filter(
        (o) => o.name === n.name
      );
      a.length < n.minOccurs && this.addError(
        s,
        r,
        `Element '${n.name}' occurs ${a.length} times but minimum is ${n.minOccurs}`,
        "MIN_OCCURS_VIOLATION"
      ), n.maxOccurs !== "unbounded" && a.length > n.maxOccurs && this.addError(
        s,
        r,
        `Element '${n.name}' occurs ${a.length} times but maximum is ${n.maxOccurs}`,
        "MAX_OCCURS_VIOLATION"
      );
      for (const o of a)
        this.validateElement(o, n, s, r);
    }
    for (const n of i)
      t.elements.some((a) => a.name === n.name) || this.addError(
        s,
        r,
        `Unexpected element '${n.name}'`,
        "UNEXPECTED_ELEMENT"
      );
  }
  validateInlineContent(e, t, s, r) {
    if (t.restrictions) {
      const i = e.text || e.children.find((n) => n.name === "#text")?.text || "";
      this.validateRestrictions(
        i,
        t.restrictions,
        s,
        r,
        e.name
      );
    }
  }
  validateRestrictions(e, t, s, r, i) {
    for (const n of t)
      switch (n.type) {
        case "minLength":
          e.length < Number(n.value) && this.addError(
            s,
            r,
            `Value '${e}' in element '${i}' is too short. Minimum length is ${n.value}`,
            "MIN_LENGTH_VIOLATION"
          );
          break;
        case "maxLength":
          e.length > Number(n.value) && this.addError(
            s,
            r,
            `Value '${e}' in element '${i}' is too long. Maximum length is ${n.value}`,
            "MAX_LENGTH_VIOLATION"
          );
          break;
        case "pattern":
          new RegExp(String(n.value)).test(e) || this.addError(
            s,
            r,
            `Value '${e}' in element '${i}' does not match pattern '${n.value}'`,
            "PATTERN_VIOLATION"
          );
          break;
        case "enumeration":
          break;
        case "minInclusive":
          Number(e) < Number(n.value) && this.addError(
            s,
            r,
            `Value '${e}' in element '${i}' is below minimum ${n.value}`,
            "MIN_INCLUSIVE_VIOLATION"
          );
          break;
        case "maxInclusive":
          Number(e) > Number(n.value) && this.addError(
            s,
            r,
            `Value '${e}' in element '${i}' is above maximum ${n.value}`,
            "MAX_INCLUSIVE_VIOLATION"
          );
          break;
      }
  }
  validateSimpleValue(e, t) {
    switch (t) {
      case "string":
        return !0;
      case "int":
      case "integer":
        return /^-?\d+$/.test(e);
      case "decimal":
      case "float":
      case "double":
        return /^-?\d*\.?\d+$/.test(e);
      case "boolean":
        return e === "true" || e === "false" || e === "1" || e === "0";
      case "date":
        return /^\d{4}-\d{2}-\d{2}$/.test(e);
      case "dateTime":
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(
          e
        );
      case "time":
        return /^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(e);
      default:
        return !0;
    }
  }
  isBuiltInType(e) {
    return [
      "string",
      "int",
      "integer",
      "decimal",
      "float",
      "double",
      "boolean",
      "date",
      "dateTime",
      "time",
      "base64Binary",
      "hexBinary"
    ].includes(e);
  }
  addError(e, t, s, r) {
    this.errors.push({ line: e, column: t, message: s, code: r });
  }
}
class f {
  options;
  constructor(e = {}) {
    this.options = {
      preserveAttributes: e.preserveAttributes ?? !0,
      attributePrefix: e.attributePrefix ?? "@",
      textKey: e.textKey ?? "#text",
      ignoreNamespaces: e.ignoreNamespaces ?? !1
    };
  }
  convert(e) {
    return this.nodeToJson(e);
  }
  nodeToJson(e) {
    const t = {};
    if (this.options.ignoreNamespaces ? this.getLocalName(e.name) : e.name, e.text !== void 0 && e.children.length === 0 && Object.keys(e.attributes).length === 0)
      return this.convertValue(e.text);
    if (this.options.preserveAttributes && Object.keys(e.attributes).length > 0)
      for (const [r, i] of Object.entries(e.attributes)) {
        const n = this.options.ignoreNamespaces ? this.getLocalName(r) : r;
        t[this.options.attributePrefix + n] = this.convertValue(i);
      }
    e.text !== void 0 && (t[this.options.textKey] = this.convertValue(e.text));
    const s = {};
    for (const r of e.children) {
      if (r.name === "#text") {
        r.text !== void 0 && (t[this.options.textKey] = this.convertValue(r.text));
        continue;
      }
      const i = this.options.ignoreNamespaces ? this.getLocalName(r.name) : r.name, n = this.nodeToJson(r);
      s[i] || (s[i] = []), s[i].push(n);
    }
    for (const [r, i] of Object.entries(s))
      i.length === 1 ? t[r] = i[0] : t[r] = i;
    return Object.keys(t).length === 1 && t[this.options.textKey] !== void 0 ? t[this.options.textKey] : Object.keys(t).length === 0 && e.text !== void 0 ? this.convertValue(e.text) : t;
  }
  convertValue(e) {
    if (e === "true") return !0;
    if (e === "false") return !1;
    if (e === "null") return null;
    if (/^-?\d+$/.test(e)) {
      const t = parseInt(e, 10);
      if (t.toString() === e) return t;
    }
    if (/^-?\d*\.?\d+$/.test(e)) {
      const t = parseFloat(e);
      if (!isNaN(t) && t.toString() === e) return t;
    }
    return e;
  }
  getLocalName(e) {
    const t = e.indexOf(":");
    return t === -1 ? e : e.substring(t + 1);
  }
}
class b {
  options;
  constructor(e = {}) {
    this.options = {
      attributePrefix: e.attributePrefix ?? "@",
      textKey: e.textKey ?? "#text",
      rootElement: e.rootElement ?? "root",
      declaration: e.declaration ?? !0,
      indent: e.indent ?? "  "
    };
  }
  convert(e, t) {
    let s = "";
    this.options.declaration && (s += `<?xml version="1.0" encoding="UTF-8"?>
`);
    const r = t || this.options.rootElement;
    return s += this.objectToXml(e, r, 0), s;
  }
  objectToXml(e, t, s) {
    const r = this.options.indent.repeat(s);
    return this.isPrimitive(e) ? `${r}<${t}>${this.escapeXml(String(e))}</${t}>
` : Array.isArray(e) ? this.arrayToXml(e, t, s) : this.complexObjectToXml(e, t, s);
  }
  arrayToXml(e, t, s) {
    let r = "";
    for (const i of e)
      r += this.objectToXml(i, t, s);
    return r;
  }
  complexObjectToXml(e, t, s) {
    const r = this.options.indent.repeat(s), i = this.processObjectProperties(e, s);
    let n = `${r}<${t}${i.attributes}>`;
    return this.addElementContent(n, i, t, r);
  }
  processObjectProperties(e, t) {
    let s = "", r = "";
    const i = [];
    let n = !1;
    for (const [a, o] of Object.entries(e))
      if (a.startsWith(this.options.attributePrefix)) {
        const c = a.substring(this.options.attributePrefix.length);
        s += ` ${c}="${this.escapeXml(String(o))}"`, n = !0;
      } else a === this.options.textKey ? r = String(o) : this.addChildElements(o, a, t, i);
    return { attributes: s, textContent: r, childElements: i, hasAttributes: n };
  }
  addChildElements(e, t, s, r) {
    if (Array.isArray(e))
      for (const i of e)
        r.push(this.objectToXml(i, t, s + 1));
    else
      r.push(this.objectToXml(e, t, s + 1));
  }
  addElementContent(e, t, s, r) {
    const { textContent: i, childElements: n, hasAttributes: a } = t, o = r + this.options.indent;
    if (i && n.length === 0)
      return e + this.escapeXml(i) + `</${s}>
`;
    if (n.length > 0) {
      e += `
`, i && (e += `${o}${this.escapeXml(i)}
`);
      for (const c of n)
        e += c;
      return e + `${r}</${s}>
`;
    }
    return a ? e.substring(0, e.length - 1) + `/>
` : e.replace(">", `/>
`);
  }
  isPrimitive(e) {
    return e === null || typeof e == "string" || typeof e == "number" || typeof e == "boolean";
  }
  escapeXml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
}
class g {
  schema;
  options;
  errors = [];
  constructor(e, t = {}) {
    this.schema = e, this.options = {
      rootElement: t.rootElement ?? "",
      declaration: t.declaration ?? !0,
      indent: t.indent ?? "  ",
      softUpperBound: t.softUpperBound ?? 3,
      genMode: t.genMode ?? "NORMAL",
      customValues: t.customValues ?? {},
      elementGenerators: t.elementGenerators ?? {},
      typeGenerators: t.typeGenerators ?? {},
      patternGenerators: t.patternGenerators ?? {}
    };
  }
  generate() {
    let e = "";
    this.options.declaration && (e += `<?xml version="1.0" encoding="UTF-8"?>
`);
    const t = Object.entries(this.schema.elements)[0][1];
    return e += this.generateXml(t, ""), e;
  }
  generateXml(e, t) {
    const s = (t.match(/\//g) || []).length;
    if (e.minOccurs === 0 && this.options.genMode != "MAXIMAL")
      return "";
    let r = "";
    const i = this.options.indent.repeat(s), n = this.getLocalType(e.type), a = this.schema.complexTypes[n];
    if (a)
      return r += this.complexTypesGenerateXml(
        a,
        e.name,
        t,
        s
      ), r;
    const o = this.escapeXml(
      this.generateXmlValue(e.name, n, t)
    );
    return r += `${i}<${e.name}>${o}</${e.name}>`, r;
  }
  generateXmlValue(e, t, s) {
    let r = this.customValue(e, s);
    if (!r) {
      const i = this.options.elementGenerators[e];
      i && (r = i());
    }
    if (!r) {
      const i = this.options.typeGenerators[t];
      i && (r = i());
    }
    return r || (this.isBuiltInType(t) ? r = this.generateSimpleValue(t) : this.schema.simpleTypes[t] ? r = this.simpleTypeGenXml(
      this.schema.simpleTypes[t]
    ) : r = `[TODO] ${e}, type=${t}`), r;
  }
  customValue(e, t) {
    const s = t + "/" + e;
    for (const [r, i] of Object.entries(this.options.customValues))
      if (s.endsWith(r))
        return i;
    return "";
  }
  choose(e, t) {
    const s = t + "/" + e;
    for (const r of Object.keys(this.options.customValues)) {
      if (s.endsWith(r))
        return !0;
      let i = r.length - 1;
      for (; ; ) {
        let n = r.lastIndexOf("/", i);
        if (n === -1)
          break;
        let a = r.substring(0, n);
        if (s.endsWith(a))
          return !0;
        i = n - 1;
      }
    }
    return !1;
  }
  complexTypesGenerateXml(e, t, s, r) {
    const i = this.options.indent.repeat(r);
    let n = `${i}<${t}`;
    const a = this.generateAttributes(e.attributes);
    a && (n += " " + a), r === 0 && this.options.declaration && this.schema.targetNamespace && (n = `${n} xmlns="${this.schema.targetNamespace}"`);
    const o = [];
    if (e.compositor === "choice") {
      let c;
      for (const l of e.elements) {
        if (this.choose(l.name, s + "/" + t)) {
          c = l;
          break;
        }
        if (this.customValue(l.name, s + "/" + t)) {
          c = l;
          break;
        }
      }
      c || (c = e.elements[Math.floor(Math.random() * e.elements.length)]), o.push(this.generateXml(c, s + "/" + t));
    } else if (e.compositor === "sequence")
      for (const c of e.elements) {
        let l = typeof c.maxOccurs == "number" ? c.maxOccurs : this.options.softUpperBound;
        for (; l > 0; ) {
          const u = this.generateXml(c, s + "/" + t);
          u && o.push(u), l--;
        }
      }
    else
      e.baseType && o.push(this.generateXmlValue("", e.baseType, ""));
    return o.length > 0 ? (n += ">", n += `
` + o.join(`
`), n += `
${i}</${t}>`) : n += " />", n;
  }
  patternCharsetMap(e) {
    const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", s = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".toLocaleLowerCase(), r = "0123456789", i = t + r, n = t + s + r;
    e = String(e);
    const a = e.indexOf("{");
    switch (a !== -1 && (e = e.substring(0, a)), String(e)) {
      case "[A-Z0-9]":
        return i;
      case "[A-Za-z0-9]":
      case "[A-Z0-9a-z]":
        return n;
      default:
        return n;
    }
  }
  simpleTypeGenXml(e) {
    const t = e.restrictions.filter((i) => i.type === "enumeration").map((i) => i.value);
    if (t.length > 0)
      return String(
        t[Math.floor(Math.random() * t.length)]
      );
    let s = Number(
      e.restrictions.find((i) => i.type === "minLength")?.value
    ), r = Number(
      e.restrictions.find((i) => i.type === "maxLength")?.value
    );
    switch (this.getLocalType(e.baseType)) {
      case "string":
        const i = e.restrictions.find((c) => c.type === "pattern")?.value || "";
        if (!s && !r && i) {
          const c = String(i).match(/\{(\d+),?(\d+)?\}/);
          c && (c[2] ? (s = Number(c[1]), r = Number(c[2])) : s = r = Number(c[1]));
        }
        if (!s)
          return "";
        const n = this.patternCharsetMap(i);
        let a = r === -1 ? 23 : Math.floor(Math.random() * (r - s) + s);
        const o = [];
        for (; a--; )
          o.push(n[Math.floor(Math.random() * n.length)]);
        return o.join("");
      // "text-text-text";
      case "int":
      case "integer":
        return "9999999999999999";
      case "decimal":
      case "float":
      case "double":
        return "99999.01";
      case "boolean":
        return "true";
      case "date":
        return "2025-12-16";
      case "dateTime":
        return "2025-12-16T11:11:11.888";
      case "time":
        return "00:00:01Z";
      default:
        return `UNKNOWN baseType=${e.baseType}`;
    }
  }
  generateAttributes(e) {
    const t = [];
    for (const s of e)
      if (s.use === "required") {
        const r = this.getLocalType(s.type), i = this.escapeXml(
          this.generateXmlValue("", r, "")
        );
        t.push(`${s.name}="${i}"`);
      }
    return t.join(" ");
  }
  getLocalType(e) {
    const t = e.indexOf(":");
    return t === -1 ? e : e.substring(t + 1);
  }
  generateSimpleValue(e) {
    switch (e) {
      case "string":
        return "text-text-text";
      case "int":
      case "integer":
        return "9999999999999999";
      case "decimal":
      case "float":
      case "double":
        return "99999.01";
      case "boolean":
        return "true";
      case "date":
        return "2025-12-16";
      case "dateTime":
        return "2025-12-16T11:11:11.888";
      case "time":
        return "00:00:01Z";
      default:
        return `UNKNOWN type=${e}`;
    }
  }
  isBuiltInType(e) {
    return [
      "string",
      "int",
      "integer",
      "decimal",
      "float",
      "double",
      "boolean",
      "date",
      "dateTime",
      "time",
      "base64Binary",
      "hexBinary"
    ].includes(this.getLocalType(e));
  }
  escapeXml(e) {
    return typeof e != "string" ? e : e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
}
var x = /* @__PURE__ */ ((h) => (h.Sequence = "sequence", h.Choice = "choice", h.All = "all", h))(x || {});
class y {
  xmlParser = new m();
  xsdParser = new p();
  schema = null;
  validator = null;
  /**
   * Load and parse an XSD schema
   * @param xsdContent The XSD schema content as string
   * @returns Array of validation errors if any
   */
  loadSchema(e) {
    const { schema: t, errors: s } = this.xsdParser.parseSchema(e);
    return t && s.length === 0 && (this.schema = t, this.validator = new d(t)), s;
  }
  /**
   * Validate XML against the loaded schema
   * @param xmlContent The XML content to validate
   * @returns Array of validation errors with line numbers
   */
  validateXml(e) {
    if (!this.schema || !this.validator)
      return [
        {
          line: 1,
          column: 1,
          message: "No schema loaded. Call loadSchema() first.",
          code: "NO_SCHEMA"
        }
      ];
    const { node: t, errors: s } = this.xmlParser.parse(e);
    return s.length > 0 ? s : t ? this.validator.validate(t) : [
      {
        line: 1,
        column: 1,
        message: "Failed to parse XML",
        code: "PARSE_FAILED"
      }
    ];
  }
  /**
   * Parse XML to JSON object
   * @param xmlContent The XML content to parse
   * @param options Options for XML to JSON conversion
   * @returns Parsed JSON object or null if parsing failed
   */
  xmlToJson(e, t) {
    const { node: s, errors: r } = this.xmlParser.parse(e);
    if (r.length > 0 || !s)
      return { success: !1, errors: r };
    try {
      return {
        success: !0,
        data: new f(t).convert(s),
        errors: []
      };
    } catch (i) {
      return {
        success: !1,
        errors: [
          {
            line: 1,
            column: 1,
            message: i instanceof Error ? i.message : "Conversion error",
            code: "CONVERSION_ERROR"
          }
        ]
      };
    }
  }
  /**
   * Convert JSON object to XML string
   * @param jsonData The JSON data to convert
   * @param rootElement The root element name (optional)
   * @param options Options for JSON to XML conversion
   * @returns XML string representation
   */
  jsonToXml(e, t, s) {
    return new b(s).convert(e, t);
  }
  /**
   * Generate XML string from XSD Schema
   * @param options Options for XSD generate XML
   * @returns XML string representation
   */
  xsdGenXml(e) {
    return !this.schema || !this.validator ? [
      {
        line: 1,
        column: 1,
        message: "No schema loaded. Call loadSchema() first.",
        code: "NO_SCHEMA"
      }
    ] : new g(this.schema, e).generate();
  }
  /**
   * Parse XML without validation (schema-free parsing)
   * @param xmlContent The XML content to parse
   * @returns Parsed XML node structure
   */
  parseXml(e) {
    return this.xmlParser.parse(e);
  }
  /**
   * Get the currently loaded schema
   * @returns The loaded XSD schema or null
   */
  getSchema() {
    return this.schema;
  }
  /**
   * Check if a schema is currently loaded
   * @returns True if a schema is loaded
   */
  hasSchema() {
    return this.schema !== null;
  }
}
export {
  x as Compositors,
  b as JsonToXmlConverter,
  y as XmlHelper,
  m as XmlParser,
  f as XmlToJsonConverter,
  d as XmlValidator,
  p as XsdParser
};
