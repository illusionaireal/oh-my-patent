var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/xmlchars/xml/1.0/ed5.js
var require_ed5 = __commonJS({
  "node_modules/xmlchars/xml/1.0/ed5.js"(exports) {
    "use strict";
    /**
     * Character classes and associated utilities for the 5th edition of XML 1.0.
     *
     * @author Louis-Dominique Dubeau
     * @license MIT
     * @copyright Louis-Dominique Dubeau
     */
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "	\n\r -퟿-�𐀀-􏿿";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= SPACE && c <= 55295 || c === NL || c === CR || c === TAB || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  }
});

// node_modules/xmlchars/xml/1.1/ed2.js
var require_ed2 = __commonJS({
  "node_modules/xmlchars/xml/1.1/ed2.js"(exports) {
    "use strict";
    /**
     * Character classes and associated utilities for the 2nd edition of XML 1.1.
     *
     * @author Louis-Dominique Dubeau
     * @license MIT
     * @copyright Louis-Dominique Dubeau
     */
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CHAR = "-퟿-�𐀀-􏿿";
    exports.RESTRICTED_CHAR = "-\b\v\f---";
    exports.S = " 	\r\n";
    exports.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
    exports.RESTRICTED_CHAR_RE = new RegExp("^[" + exports.RESTRICTED_CHAR + "]$", "u");
    exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
    exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
    exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
    exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
    exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    exports.S_LIST = [SPACE, NL, CR, TAB];
    function isChar(c) {
      return c >= 1 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isChar = isChar;
    function isRestrictedChar(c) {
      return c >= 1 && c <= 8 || c === 11 || c === 12 || c >= 14 && c <= 31 || c >= 127 && c <= 132 || c >= 134 && c <= 159;
    }
    exports.isRestrictedChar = isRestrictedChar;
    function isCharAndNotRestricted(c) {
      return c === 9 || c === 10 || c === 13 || c > 31 && c < 127 || c === 133 || c > 159 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
    }
    exports.isCharAndNotRestricted = isCharAndNotRestricted;
    function isS(c) {
      return c === SPACE || c === NL || c === CR || c === TAB;
    }
    exports.isS = isS;
    function isNameStartChar(c) {
      return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNameStartChar = isNameStartChar;
    function isNameChar(c) {
      return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
    }
    exports.isNameChar = isNameChar;
  }
});

// node_modules/xmlchars/xmlns/1.0/ed3.js
var require_ed3 = __commonJS({
  "node_modules/xmlchars/xmlns/1.0/ed3.js"(exports) {
    "use strict";
    /**
     * Character class utilities for XML NS 1.0 edition 3.
     *
     * @author Louis-Dominique Dubeau
     * @license MIT
     * @copyright Louis-Dominique Dubeau
     */
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NC_NAME_START_CHAR = "A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
    exports.NC_NAME_CHAR = "-" + exports.NC_NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
    exports.NC_NAME_START_CHAR_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "]$", "u");
    exports.NC_NAME_CHAR_RE = new RegExp("^[" + exports.NC_NAME_CHAR + "]$", "u");
    exports.NC_NAME_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "][" + exports.NC_NAME_CHAR + "]*$", "u");
    function isNCNameStartChar(c) {
      return c >= 65 && c <= 90 || c === 95 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
    }
    exports.isNCNameStartChar = isNCNameStartChar;
    function isNCNameChar(c) {
      return isNCNameStartChar(c) || (c === 45 || c === 46 || c >= 48 && c <= 57 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256);
    }
    exports.isNCNameChar = isNCNameChar;
  }
});

// node_modules/saxes/saxes.js
var require_saxes = __commonJS({
  "node_modules/saxes/saxes.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SaxesParser = exports.EVENTS = void 0;
    var ed5 = require_ed5();
    var ed2 = require_ed2();
    var NSed3 = require_ed3();
    var isS = ed5.isS;
    var isChar10 = ed5.isChar;
    var isNameStartChar = ed5.isNameStartChar;
    var isNameChar = ed5.isNameChar;
    var S_LIST = ed5.S_LIST;
    var NAME_RE = ed5.NAME_RE;
    var isChar11 = ed2.isChar;
    var isNCNameStartChar = NSed3.isNCNameStartChar;
    var isNCNameChar = NSed3.isNCNameChar;
    var NC_NAME_RE = NSed3.NC_NAME_RE;
    var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
    var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
    var rootNS = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      __proto__: null,
      xml: XML_NAMESPACE,
      xmlns: XMLNS_NAMESPACE
    };
    var XML_ENTITIES = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      __proto__: null,
      amp: "&",
      gt: ">",
      lt: "<",
      quot: '"',
      apos: "'"
    };
    var EOC = -1;
    var NL_LIKE = -2;
    var S_BEGIN = 0;
    var S_BEGIN_WHITESPACE = 1;
    var S_DOCTYPE = 2;
    var S_DOCTYPE_QUOTE = 3;
    var S_DTD = 4;
    var S_DTD_QUOTED = 5;
    var S_DTD_OPEN_WAKA = 6;
    var S_DTD_OPEN_WAKA_BANG = 7;
    var S_DTD_COMMENT = 8;
    var S_DTD_COMMENT_ENDING = 9;
    var S_DTD_COMMENT_ENDED = 10;
    var S_DTD_PI = 11;
    var S_DTD_PI_ENDING = 12;
    var S_TEXT = 13;
    var S_ENTITY = 14;
    var S_OPEN_WAKA = 15;
    var S_OPEN_WAKA_BANG = 16;
    var S_COMMENT = 17;
    var S_COMMENT_ENDING = 18;
    var S_COMMENT_ENDED = 19;
    var S_CDATA = 20;
    var S_CDATA_ENDING = 21;
    var S_CDATA_ENDING_2 = 22;
    var S_PI_FIRST_CHAR = 23;
    var S_PI_REST = 24;
    var S_PI_BODY = 25;
    var S_PI_ENDING = 26;
    var S_XML_DECL_NAME_START = 27;
    var S_XML_DECL_NAME = 28;
    var S_XML_DECL_EQ = 29;
    var S_XML_DECL_VALUE_START = 30;
    var S_XML_DECL_VALUE = 31;
    var S_XML_DECL_SEPARATOR = 32;
    var S_XML_DECL_ENDING = 33;
    var S_OPEN_TAG = 34;
    var S_OPEN_TAG_SLASH = 35;
    var S_ATTRIB = 36;
    var S_ATTRIB_NAME = 37;
    var S_ATTRIB_NAME_SAW_WHITE = 38;
    var S_ATTRIB_VALUE = 39;
    var S_ATTRIB_VALUE_QUOTED = 40;
    var S_ATTRIB_VALUE_CLOSED = 41;
    var S_ATTRIB_VALUE_UNQUOTED = 42;
    var S_CLOSE_TAG = 43;
    var S_CLOSE_TAG_SAW_WHITE = 44;
    var TAB = 9;
    var NL = 10;
    var CR = 13;
    var SPACE = 32;
    var BANG = 33;
    var DQUOTE = 34;
    var AMP = 38;
    var SQUOTE = 39;
    var MINUS = 45;
    var FORWARD_SLASH = 47;
    var SEMICOLON = 59;
    var LESS = 60;
    var EQUAL = 61;
    var GREATER = 62;
    var QUESTION = 63;
    var OPEN_BRACKET = 91;
    var CLOSE_BRACKET = 93;
    var NEL = 133;
    var LS = 8232;
    var isQuote = (c) => c === DQUOTE || c === SQUOTE;
    var QUOTES = [DQUOTE, SQUOTE];
    var DOCTYPE_TERMINATOR = [...QUOTES, OPEN_BRACKET, GREATER];
    var DTD_TERMINATOR = [...QUOTES, LESS, CLOSE_BRACKET];
    var XML_DECL_NAME_TERMINATOR = [EQUAL, QUESTION, ...S_LIST];
    var ATTRIB_VALUE_UNQUOTED_TERMINATOR = [...S_LIST, GREATER, AMP, LESS];
    function nsPairCheck(parser, prefix, uri) {
      switch (prefix) {
        case "xml":
          if (uri !== XML_NAMESPACE) {
            parser.fail(`xml prefix must be bound to ${XML_NAMESPACE}.`);
          }
          break;
        case "xmlns":
          if (uri !== XMLNS_NAMESPACE) {
            parser.fail(`xmlns prefix must be bound to ${XMLNS_NAMESPACE}.`);
          }
          break;
        default:
      }
      switch (uri) {
        case XMLNS_NAMESPACE:
          parser.fail(prefix === "" ? `the default namespace may not be set to ${uri}.` : `may not assign a prefix (even "xmlns") to the URI ${XMLNS_NAMESPACE}.`);
          break;
        case XML_NAMESPACE:
          switch (prefix) {
            case "xml":
              break;
            case "":
              parser.fail(`the default namespace may not be set to ${uri}.`);
              break;
            default:
              parser.fail("may not assign the xml namespace to another prefix.");
          }
          break;
        default:
      }
    }
    function nsMappingCheck(parser, mapping) {
      for (const local of Object.keys(mapping)) {
        nsPairCheck(parser, local, mapping[local]);
      }
    }
    var isNCName = (name) => NC_NAME_RE.test(name);
    var isName = (name) => NAME_RE.test(name);
    var FORBIDDEN_START = 0;
    var FORBIDDEN_BRACKET = 1;
    var FORBIDDEN_BRACKET_BRACKET = 2;
    exports.EVENTS = [
      "xmldecl",
      "text",
      "processinginstruction",
      "doctype",
      "comment",
      "opentagstart",
      "attribute",
      "opentag",
      "closetag",
      "cdata",
      "error",
      "end",
      "ready"
    ];
    var EVENT_NAME_TO_HANDLER_NAME = {
      xmldecl: "xmldeclHandler",
      text: "textHandler",
      processinginstruction: "piHandler",
      doctype: "doctypeHandler",
      comment: "commentHandler",
      opentagstart: "openTagStartHandler",
      attribute: "attributeHandler",
      opentag: "openTagHandler",
      closetag: "closeTagHandler",
      cdata: "cdataHandler",
      error: "errorHandler",
      end: "endHandler",
      ready: "readyHandler"
    };
    var SaxesParser2 = class {
      /**
       * @param opt The parser options.
       */
      constructor(opt) {
        this.opt = opt !== null && opt !== void 0 ? opt : {};
        this.fragmentOpt = !!this.opt.fragment;
        const xmlnsOpt = this.xmlnsOpt = !!this.opt.xmlns;
        this.trackPosition = this.opt.position !== false;
        this.fileName = this.opt.fileName;
        if (xmlnsOpt) {
          this.nameStartCheck = isNCNameStartChar;
          this.nameCheck = isNCNameChar;
          this.isName = isNCName;
          this.processAttribs = this.processAttribsNS;
          this.pushAttrib = this.pushAttribNS;
          this.ns = Object.assign({ __proto__: null }, rootNS);
          const additional = this.opt.additionalNamespaces;
          if (additional != null) {
            nsMappingCheck(this, additional);
            Object.assign(this.ns, additional);
          }
        } else {
          this.nameStartCheck = isNameStartChar;
          this.nameCheck = isNameChar;
          this.isName = isName;
          this.processAttribs = this.processAttribsPlain;
          this.pushAttrib = this.pushAttribPlain;
        }
        this.stateTable = [
          /* eslint-disable @typescript-eslint/unbound-method */
          this.sBegin,
          this.sBeginWhitespace,
          this.sDoctype,
          this.sDoctypeQuote,
          this.sDTD,
          this.sDTDQuoted,
          this.sDTDOpenWaka,
          this.sDTDOpenWakaBang,
          this.sDTDComment,
          this.sDTDCommentEnding,
          this.sDTDCommentEnded,
          this.sDTDPI,
          this.sDTDPIEnding,
          this.sText,
          this.sEntity,
          this.sOpenWaka,
          this.sOpenWakaBang,
          this.sComment,
          this.sCommentEnding,
          this.sCommentEnded,
          this.sCData,
          this.sCDataEnding,
          this.sCDataEnding2,
          this.sPIFirstChar,
          this.sPIRest,
          this.sPIBody,
          this.sPIEnding,
          this.sXMLDeclNameStart,
          this.sXMLDeclName,
          this.sXMLDeclEq,
          this.sXMLDeclValueStart,
          this.sXMLDeclValue,
          this.sXMLDeclSeparator,
          this.sXMLDeclEnding,
          this.sOpenTag,
          this.sOpenTagSlash,
          this.sAttrib,
          this.sAttribName,
          this.sAttribNameSawWhite,
          this.sAttribValue,
          this.sAttribValueQuoted,
          this.sAttribValueClosed,
          this.sAttribValueUnquoted,
          this.sCloseTag,
          this.sCloseTagSawWhite
          /* eslint-enable @typescript-eslint/unbound-method */
        ];
        this._init();
      }
      /**
       * Indicates whether or not the parser is closed. If ``true``, wait for
       * the ``ready`` event to write again.
       */
      get closed() {
        return this._closed;
      }
      _init() {
        var _a;
        this.openWakaBang = "";
        this.text = "";
        this.name = "";
        this.piTarget = "";
        this.entity = "";
        this.q = null;
        this.tags = [];
        this.tag = null;
        this.topNS = null;
        this.chunk = "";
        this.chunkPosition = 0;
        this.i = 0;
        this.prevI = 0;
        this.carriedFromPrevious = void 0;
        this.forbiddenState = FORBIDDEN_START;
        this.attribList = [];
        const { fragmentOpt } = this;
        this.state = fragmentOpt ? S_TEXT : S_BEGIN;
        this.reportedTextBeforeRoot = this.reportedTextAfterRoot = this.closedRoot = this.sawRoot = fragmentOpt;
        this.xmlDeclPossible = !fragmentOpt;
        this.xmlDeclExpects = ["version"];
        this.entityReturnState = void 0;
        let { defaultXMLVersion } = this.opt;
        if (defaultXMLVersion === void 0) {
          if (this.opt.forceXMLVersion === true) {
            throw new Error("forceXMLVersion set but defaultXMLVersion is not set");
          }
          defaultXMLVersion = "1.0";
        }
        this.setXMLVersion(defaultXMLVersion);
        this.positionAtNewLine = 0;
        this.doctype = false;
        this._closed = false;
        this.xmlDecl = {
          version: void 0,
          encoding: void 0,
          standalone: void 0
        };
        this.line = 1;
        this.column = 0;
        this.ENTITIES = Object.create(XML_ENTITIES);
        (_a = this.readyHandler) === null || _a === void 0 ? void 0 : _a.call(this);
      }
      /**
       * The stream position the parser is currently looking at. This field is
       * zero-based.
       *
       * This field is not based on counting Unicode characters but is to be
       * interpreted as a plain index into a JavaScript string.
       */
      get position() {
        return this.chunkPosition + this.i;
      }
      /**
       * The column number of the next character to be read by the parser.  *
       * This field is zero-based. (The first column in a line is 0.)
       *
       * This field reports the index at which the next character would be in the
       * line if the line were represented as a JavaScript string.  Note that this
       * *can* be different to a count based on the number of *Unicode characters*
       * due to how JavaScript handles astral plane characters.
       *
       * See [[column]] for a number that corresponds to a count of Unicode
       * characters.
       */
      get columnIndex() {
        return this.position - this.positionAtNewLine;
      }
      /**
       * Set an event listener on an event. The parser supports one handler per
       * event type. If you try to set an event handler over an existing handler,
       * the old handler is silently overwritten.
       *
       * @param name The event to listen to.
       *
       * @param handler The handler to set.
       */
      on(name, handler) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = handler;
      }
      /**
       * Unset an event handler.
       *
       * @parma name The event to stop listening to.
       */
      off(name) {
        this[EVENT_NAME_TO_HANDLER_NAME[name]] = void 0;
      }
      /**
       * Make an error object. The error object will have a message that contains
       * the ``fileName`` option passed at the creation of the parser. If position
       * tracking was turned on, it will also have line and column number
       * information.
       *
       * @param message The message describing the error to report.
       *
       * @returns An error object with a properly formatted message.
       */
      makeError(message) {
        var _a;
        let msg = (_a = this.fileName) !== null && _a !== void 0 ? _a : "";
        if (this.trackPosition) {
          if (msg.length > 0) {
            msg += ":";
          }
          msg += `${this.line}:${this.column}`;
        }
        if (msg.length > 0) {
          msg += ": ";
        }
        return new Error(msg + message);
      }
      /**
       * Report a parsing error. This method is made public so that client code may
       * check for issues that are outside the scope of this project and can report
       * errors.
       *
       * @param message The error to report.
       *
       * @returns this
       */
      fail(message) {
        const err = this.makeError(message);
        const handler = this.errorHandler;
        if (handler === void 0) {
          throw err;
        } else {
          handler(err);
        }
        return this;
      }
      /**
       * Write a XML data to the parser.
       *
       * @param chunk The XML data to write.
       *
       * @returns this
       */
      // We do need object for the type here. Yes, it often causes problems
      // but not in this case.
      write(chunk) {
        if (this.closed) {
          return this.fail("cannot write after close; assign an onready handler.");
        }
        let end = false;
        if (chunk === null) {
          end = true;
          chunk = "";
        } else if (typeof chunk === "object") {
          chunk = chunk.toString();
        }
        if (this.carriedFromPrevious !== void 0) {
          chunk = `${this.carriedFromPrevious}${chunk}`;
          this.carriedFromPrevious = void 0;
        }
        let limit = chunk.length;
        const lastCode = chunk.charCodeAt(limit - 1);
        if (!end && // A trailing CR or surrogate must be carried over to the next
        // chunk.
        (lastCode === CR || lastCode >= 55296 && lastCode <= 56319)) {
          this.carriedFromPrevious = chunk[limit - 1];
          limit--;
          chunk = chunk.slice(0, limit);
        }
        const { stateTable } = this;
        this.chunk = chunk;
        this.i = 0;
        while (this.i < limit) {
          stateTable[this.state].call(this);
        }
        this.chunkPosition += limit;
        return end ? this.end() : this;
      }
      /**
       * Close the current stream. Perform final well-formedness checks and reset
       * the parser tstate.
       *
       * @returns this
       */
      close() {
        return this.write(null);
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.0.
       *
       * @returns The character read.
       */
      getCode10() {
        const { chunk, i } = this;
        this.prevI = i;
        this.i = i + 1;
        if (i >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i);
        this.column++;
        if (code < 55296) {
          if (code >= SPACE || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR:
              if (chunk.charCodeAt(i + 1) === NL) {
                this.i = i + 2;
              }
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
        this.i = i + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Get a single code point out of the current chunk. This updates the current
       * position if we do position tracking.
       *
       * This is the algorithm to use for XML 1.1.
       *
       * @returns {number} The character read.
       */
      getCode11() {
        const { chunk, i } = this;
        this.prevI = i;
        this.i = i + 1;
        if (i >= chunk.length) {
          return EOC;
        }
        const code = chunk.charCodeAt(i);
        this.column++;
        if (code < 55296) {
          if (code > 31 && code < 127 || code > 159 && code !== LS || code === TAB) {
            return code;
          }
          switch (code) {
            case NL:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL;
            case CR: {
              const next = chunk.charCodeAt(i + 1);
              if (next === NL || next === NEL) {
                this.i = i + 2;
              }
            }
            /* yes, fall through */
            case NEL:
            // 0x85
            case LS:
              this.line++;
              this.column = 0;
              this.positionAtNewLine = this.position;
              return NL_LIKE;
            default:
              this.fail("disallowed character.");
              return code;
          }
        }
        if (code > 56319) {
          if (!(code >= 57344 && code <= 65533)) {
            this.fail("disallowed character.");
          }
          return code;
        }
        const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
        this.i = i + 2;
        if (final > 1114111) {
          this.fail("disallowed character.");
        }
        return final;
      }
      /**
       * Like ``getCode`` but with the return value normalized so that ``NL`` is
       * returned for ``NL_LIKE``.
       */
      getCodeNorm() {
        const c = this.getCode();
        return c === NL_LIKE ? NL : c;
      }
      unget() {
        this.i = this.prevI;
        this.column--;
      }
      /**
       * Capture characters into a buffer until encountering one of a set of
       * characters.
       *
       * @param chars An array of codepoints. Encountering a character in the array
       * ends the capture. (``chars`` may safely contain ``NL``.)
       *
       * @return The character code that made the capture end, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureTo(chars) {
        let { i: start } = this;
        const { chunk } = this;
        while (true) {
          const c = this.getCode();
          const isNLLike = c === NL_LIKE;
          const final = isNLLike ? NL : c;
          if (final === EOC || chars.includes(final)) {
            this.text += chunk.slice(start, this.prevI);
            return final;
          }
          if (isNLLike) {
            this.text += `${chunk.slice(start, this.prevI)}
`;
            start = this.i;
          }
        }
      }
      /**
       * Capture characters into a buffer until encountering a character.
       *
       * @param char The codepoint that ends the capture. **NOTE ``char`` MAY NOT
       * CONTAIN ``NL``.** Passing ``NL`` will result in buggy behavior.
       *
       * @return ``true`` if we ran into the character. Otherwise, we ran into the
       * end of the current chunk.
       */
      captureToChar(char) {
        let { i: start } = this;
        const { chunk } = this;
        while (true) {
          let c = this.getCode();
          switch (c) {
            case NL_LIKE:
              this.text += `${chunk.slice(start, this.prevI)}
`;
              start = this.i;
              c = NL;
              break;
            case EOC:
              this.text += chunk.slice(start);
              return false;
            default:
          }
          if (c === char) {
            this.text += chunk.slice(start, this.prevI);
            return true;
          }
        }
      }
      /**
       * Capture characters that satisfy ``isNameChar`` into the ``name`` field of
       * this parser.
       *
       * @return The character code that made the test fail, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      captureNameChars() {
        const { chunk, i: start } = this;
        while (true) {
          const c = this.getCode();
          if (c === EOC) {
            this.name += chunk.slice(start);
            return EOC;
          }
          if (!isNameChar(c)) {
            this.name += chunk.slice(start, this.prevI);
            return c === NL_LIKE ? NL : c;
          }
        }
      }
      /**
       * Skip white spaces.
       *
       * @return The character that ended the skip, or ``EOC`` if we hit
       * the end of the chunk. The return value cannot be NL_LIKE: NL is returned
       * instead.
       */
      skipSpaces() {
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC || !isS(c)) {
            return c;
          }
        }
      }
      setXMLVersion(version) {
        this.currentXMLVersion = version;
        if (version === "1.0") {
          this.isChar = isChar10;
          this.getCode = this.getCode10;
        } else {
          this.isChar = isChar11;
          this.getCode = this.getCode11;
        }
      }
      // STATE ENGINE METHODS
      // This needs to be a state separate from S_BEGIN_WHITESPACE because we want
      // to be sure never to come back to this state later.
      sBegin() {
        if (this.chunk.charCodeAt(0) === 65279) {
          this.i++;
          this.column++;
        }
        this.state = S_BEGIN_WHITESPACE;
      }
      sBeginWhitespace() {
        const iBefore = this.i;
        const c = this.skipSpaces();
        if (this.prevI !== iBefore) {
          this.xmlDeclPossible = false;
        }
        switch (c) {
          case LESS:
            this.state = S_OPEN_WAKA;
            if (this.text.length !== 0) {
              throw new Error("no-empty text at start");
            }
            break;
          case EOC:
            break;
          default:
            this.unget();
            this.state = S_TEXT;
            this.xmlDeclPossible = false;
        }
      }
      sDoctype() {
        var _a;
        const c = this.captureTo(DOCTYPE_TERMINATOR);
        switch (c) {
          case GREATER: {
            (_a = this.doctypeHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            this.doctype = true;
            break;
          }
          case EOC:
            break;
          default:
            this.text += String.fromCodePoint(c);
            if (c === OPEN_BRACKET) {
              this.state = S_DTD;
            } else if (isQuote(c)) {
              this.state = S_DOCTYPE_QUOTE;
              this.q = c;
            }
        }
      }
      sDoctypeQuote() {
        const q = this.q;
        if (this.captureToChar(q)) {
          this.text += String.fromCodePoint(q);
          this.q = null;
          this.state = S_DOCTYPE;
        }
      }
      sDTD() {
        const c = this.captureTo(DTD_TERMINATOR);
        if (c === EOC) {
          return;
        }
        this.text += String.fromCodePoint(c);
        if (c === CLOSE_BRACKET) {
          this.state = S_DOCTYPE;
        } else if (c === LESS) {
          this.state = S_DTD_OPEN_WAKA;
        } else if (isQuote(c)) {
          this.state = S_DTD_QUOTED;
          this.q = c;
        }
      }
      sDTDQuoted() {
        const q = this.q;
        if (this.captureToChar(q)) {
          this.text += String.fromCodePoint(q);
          this.state = S_DTD;
          this.q = null;
        }
      }
      sDTDOpenWaka() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        switch (c) {
          case BANG:
            this.state = S_DTD_OPEN_WAKA_BANG;
            this.openWakaBang = "";
            break;
          case QUESTION:
            this.state = S_DTD_PI;
            break;
          default:
            this.state = S_DTD;
        }
      }
      sDTDOpenWakaBang() {
        const char = String.fromCodePoint(this.getCodeNorm());
        const owb = this.openWakaBang += char;
        this.text += char;
        if (owb !== "-") {
          this.state = owb === "--" ? S_DTD_COMMENT : S_DTD;
          this.openWakaBang = "";
        }
      }
      sDTDComment() {
        if (this.captureToChar(MINUS)) {
          this.text += "-";
          this.state = S_DTD_COMMENT_ENDING;
        }
      }
      sDTDCommentEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        this.state = c === MINUS ? S_DTD_COMMENT_ENDED : S_DTD_COMMENT;
      }
      sDTDCommentEnded() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        } else {
          this.fail("malformed comment.");
          this.state = S_DTD_COMMENT;
        }
      }
      sDTDPI() {
        if (this.captureToChar(QUESTION)) {
          this.text += "?";
          this.state = S_DTD_PI_ENDING;
        }
      }
      sDTDPIEnding() {
        const c = this.getCodeNorm();
        this.text += String.fromCodePoint(c);
        if (c === GREATER) {
          this.state = S_DTD;
        }
      }
      sText() {
        if (this.tags.length !== 0) {
          this.handleTextInRoot();
        } else {
          this.handleTextOutsideRoot();
        }
      }
      sEntity() {
        let { i: start } = this;
        const { chunk } = this;
        loop:
          while (true) {
            switch (this.getCode()) {
              case NL_LIKE:
                this.entity += `${chunk.slice(start, this.prevI)}
`;
                start = this.i;
                break;
              case SEMICOLON: {
                const { entityReturnState } = this;
                const entity = this.entity + chunk.slice(start, this.prevI);
                this.state = entityReturnState;
                let parsed;
                if (entity === "") {
                  this.fail("empty entity name.");
                  parsed = "&;";
                } else {
                  parsed = this.parseEntity(entity);
                  this.entity = "";
                }
                if (entityReturnState !== S_TEXT || this.textHandler !== void 0) {
                  this.text += parsed;
                }
                break loop;
              }
              case EOC:
                this.entity += chunk.slice(start);
                break loop;
              default:
            }
          }
      }
      sOpenWaka() {
        const c = this.getCode();
        if (isNameStartChar(c)) {
          this.state = S_OPEN_TAG;
          this.unget();
          this.xmlDeclPossible = false;
        } else {
          switch (c) {
            case FORWARD_SLASH:
              this.state = S_CLOSE_TAG;
              this.xmlDeclPossible = false;
              break;
            case BANG:
              this.state = S_OPEN_WAKA_BANG;
              this.openWakaBang = "";
              this.xmlDeclPossible = false;
              break;
            case QUESTION:
              this.state = S_PI_FIRST_CHAR;
              break;
            default:
              this.fail("disallowed character in tag name");
              this.state = S_TEXT;
              this.xmlDeclPossible = false;
          }
        }
      }
      sOpenWakaBang() {
        this.openWakaBang += String.fromCodePoint(this.getCodeNorm());
        switch (this.openWakaBang) {
          case "[CDATA[":
            if (!this.sawRoot && !this.reportedTextBeforeRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextBeforeRoot = true;
            }
            if (this.closedRoot && !this.reportedTextAfterRoot) {
              this.fail("text data outside of root node.");
              this.reportedTextAfterRoot = true;
            }
            this.state = S_CDATA;
            this.openWakaBang = "";
            break;
          case "--":
            this.state = S_COMMENT;
            this.openWakaBang = "";
            break;
          case "DOCTYPE":
            this.state = S_DOCTYPE;
            if (this.doctype || this.sawRoot) {
              this.fail("inappropriately located doctype declaration.");
            }
            this.openWakaBang = "";
            break;
          default:
            if (this.openWakaBang.length >= 7) {
              this.fail("incorrect syntax.");
            }
        }
      }
      sComment() {
        if (this.captureToChar(MINUS)) {
          this.state = S_COMMENT_ENDING;
        }
      }
      sCommentEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === MINUS) {
          this.state = S_COMMENT_ENDED;
          (_a = this.commentHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
          this.text = "";
        } else {
          this.text += `-${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        }
      }
      sCommentEnded() {
        const c = this.getCodeNorm();
        if (c !== GREATER) {
          this.fail("malformed comment.");
          this.text += `--${String.fromCodePoint(c)}`;
          this.state = S_COMMENT;
        } else {
          this.state = S_TEXT;
        }
      }
      sCData() {
        if (this.captureToChar(CLOSE_BRACKET)) {
          this.state = S_CDATA_ENDING;
        }
      }
      sCDataEnding() {
        const c = this.getCodeNorm();
        if (c === CLOSE_BRACKET) {
          this.state = S_CDATA_ENDING_2;
        } else {
          this.text += `]${String.fromCodePoint(c)}`;
          this.state = S_CDATA;
        }
      }
      sCDataEnding2() {
        var _a;
        const c = this.getCodeNorm();
        switch (c) {
          case GREATER: {
            (_a = this.cdataHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.text);
            this.text = "";
            this.state = S_TEXT;
            break;
          }
          case CLOSE_BRACKET:
            this.text += "]";
            break;
          default:
            this.text += `]]${String.fromCodePoint(c)}`;
            this.state = S_CDATA;
        }
      }
      // We need this separate state to check the first character fo the pi target
      // with this.nameStartCheck which allows less characters than this.nameCheck.
      sPIFirstChar() {
        const c = this.getCodeNorm();
        if (this.nameStartCheck(c)) {
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        } else if (c === QUESTION || isS(c)) {
          this.fail("processing instruction without a target.");
          this.state = c === QUESTION ? S_PI_ENDING : S_PI_BODY;
        } else {
          this.fail("disallowed character in processing instruction name.");
          this.piTarget += String.fromCodePoint(c);
          this.state = S_PI_REST;
        }
      }
      sPIRest() {
        const { chunk, i: start } = this;
        while (true) {
          const c = this.getCodeNorm();
          if (c === EOC) {
            this.piTarget += chunk.slice(start);
            return;
          }
          if (!this.nameCheck(c)) {
            this.piTarget += chunk.slice(start, this.prevI);
            const isQuestion = c === QUESTION;
            if (isQuestion || isS(c)) {
              if (this.piTarget === "xml") {
                if (!this.xmlDeclPossible) {
                  this.fail("an XML declaration must be at the start of the document.");
                }
                this.state = isQuestion ? S_XML_DECL_ENDING : S_XML_DECL_NAME_START;
              } else {
                this.state = isQuestion ? S_PI_ENDING : S_PI_BODY;
              }
            } else {
              this.fail("disallowed character in processing instruction name.");
              this.piTarget += String.fromCodePoint(c);
            }
            break;
          }
        }
      }
      sPIBody() {
        if (this.text.length === 0) {
          const c = this.getCodeNorm();
          if (c === QUESTION) {
            this.state = S_PI_ENDING;
          } else if (!isS(c)) {
            this.text = String.fromCodePoint(c);
          }
        } else if (this.captureToChar(QUESTION)) {
          this.state = S_PI_ENDING;
        }
      }
      sPIEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          const { piTarget } = this;
          if (piTarget.toLowerCase() === "xml") {
            this.fail("the XML declaration must appear at the start of the document.");
          }
          (_a = this.piHandler) === null || _a === void 0 ? void 0 : _a.call(this, {
            target: piTarget,
            body: this.text
          });
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else if (c === QUESTION) {
          this.text += "?";
        } else {
          this.text += `?${String.fromCodePoint(c)}`;
          this.state = S_PI_BODY;
        }
        this.xmlDeclPossible = false;
      }
      sXMLDeclNameStart() {
        const c = this.skipSpaces();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (c !== EOC) {
          this.state = S_XML_DECL_NAME;
          this.name = String.fromCodePoint(c);
        }
      }
      sXMLDeclName() {
        const c = this.captureTo(XML_DECL_NAME_TERMINATOR);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.name += this.text;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (!(isS(c) || c === EQUAL)) {
          return;
        }
        this.name += this.text;
        this.text = "";
        if (!this.xmlDeclExpects.includes(this.name)) {
          switch (this.name.length) {
            case 0:
              this.fail("did not expect any more name/value pairs.");
              break;
            case 1:
              this.fail(`expected the name ${this.xmlDeclExpects[0]}.`);
              break;
            default:
              this.fail(`expected one of ${this.xmlDeclExpects.join(", ")}`);
          }
        }
        this.state = c === EQUAL ? S_XML_DECL_VALUE_START : S_XML_DECL_EQ;
      }
      sXMLDeclEq() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (c !== EQUAL) {
          this.fail("value required.");
        }
        this.state = S_XML_DECL_VALUE_START;
      }
      sXMLDeclValueStart() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (isS(c)) {
          return;
        }
        if (!isQuote(c)) {
          this.fail("value must be quoted.");
          this.q = SPACE;
        } else {
          this.q = c;
        }
        this.state = S_XML_DECL_VALUE;
      }
      sXMLDeclValue() {
        const c = this.captureTo([this.q, QUESTION]);
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          this.text = "";
          this.fail("XML declaration is incomplete.");
          return;
        }
        if (c === EOC) {
          return;
        }
        const value = this.text;
        this.text = "";
        switch (this.name) {
          case "version": {
            this.xmlDeclExpects = ["encoding", "standalone"];
            const version = value;
            this.xmlDecl.version = version;
            if (!/^1\.[0-9]+$/.test(version)) {
              this.fail("version number must match /^1\\.[0-9]+$/.");
            } else if (!this.opt.forceXMLVersion) {
              this.setXMLVersion(version);
            }
            break;
          }
          case "encoding":
            if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value)) {
              this.fail("encoding value must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/.");
            }
            this.xmlDeclExpects = ["standalone"];
            this.xmlDecl.encoding = value;
            break;
          case "standalone":
            if (value !== "yes" && value !== "no") {
              this.fail('standalone value must match "yes" or "no".');
            }
            this.xmlDeclExpects = [];
            this.xmlDecl.standalone = value;
            break;
          default:
        }
        this.name = "";
        this.state = S_XML_DECL_SEPARATOR;
      }
      sXMLDeclSeparator() {
        const c = this.getCodeNorm();
        if (c === QUESTION) {
          this.state = S_XML_DECL_ENDING;
          return;
        }
        if (!isS(c)) {
          this.fail("whitespace required.");
          this.unget();
        }
        this.state = S_XML_DECL_NAME_START;
      }
      sXMLDeclEnding() {
        var _a;
        const c = this.getCodeNorm();
        if (c === GREATER) {
          if (this.piTarget !== "xml") {
            this.fail("processing instructions are not allowed before root.");
          } else if (this.name !== "version" && this.xmlDeclExpects.includes("version")) {
            this.fail("XML declaration must contain a version.");
          }
          (_a = this.xmldeclHandler) === null || _a === void 0 ? void 0 : _a.call(this, this.xmlDecl);
          this.name = "";
          this.piTarget = this.text = "";
          this.state = S_TEXT;
        } else {
          this.fail("The character ? is disallowed anywhere in XML declarations.");
        }
        this.xmlDeclPossible = false;
      }
      sOpenTag() {
        var _a;
        const c = this.captureNameChars();
        if (c === EOC) {
          return;
        }
        const tag = this.tag = {
          name: this.name,
          attributes: /* @__PURE__ */ Object.create(null)
        };
        this.name = "";
        if (this.xmlnsOpt) {
          this.topNS = tag.ns = /* @__PURE__ */ Object.create(null);
        }
        (_a = this.openTagStartHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        this.sawRoot = true;
        if (!this.fragmentOpt && this.closedRoot) {
          this.fail("documents may contain only one root.");
        }
        switch (c) {
          case GREATER:
            this.openTag();
            break;
          case FORWARD_SLASH:
            this.state = S_OPEN_TAG_SLASH;
            break;
          default:
            if (!isS(c)) {
              this.fail("disallowed character in tag name.");
            }
            this.state = S_ATTRIB;
        }
      }
      sOpenTagSlash() {
        if (this.getCode() === GREATER) {
          this.openSelfClosingTag();
        } else {
          this.fail("forward-slash in opening tag not followed by >.");
          this.state = S_ATTRIB;
        }
      }
      sAttrib() {
        const c = this.skipSpaces();
        if (c === EOC) {
          return;
        }
        if (isNameStartChar(c)) {
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribName() {
        const c = this.captureNameChars();
        if (c === EQUAL) {
          this.state = S_ATTRIB_VALUE;
        } else if (isS(c)) {
          this.state = S_ATTRIB_NAME_SAW_WHITE;
        } else if (c === GREATER) {
          this.fail("attribute without value.");
          this.pushAttrib(this.name, this.name);
          this.name = this.text = "";
          this.openTag();
        } else if (c !== EOC) {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribNameSawWhite() {
        const c = this.skipSpaces();
        switch (c) {
          case EOC:
            return;
          case EQUAL:
            this.state = S_ATTRIB_VALUE;
            break;
          default:
            this.fail("attribute without value.");
            this.text = "";
            this.name = "";
            if (c === GREATER) {
              this.openTag();
            } else if (isNameStartChar(c)) {
              this.unget();
              this.state = S_ATTRIB_NAME;
            } else {
              this.fail("disallowed character in attribute name.");
              this.state = S_ATTRIB;
            }
        }
      }
      sAttribValue() {
        const c = this.getCodeNorm();
        if (isQuote(c)) {
          this.q = c;
          this.state = S_ATTRIB_VALUE_QUOTED;
        } else if (!isS(c)) {
          this.fail("unquoted attribute value.");
          this.state = S_ATTRIB_VALUE_UNQUOTED;
          this.unget();
        }
      }
      sAttribValueQuoted() {
        const { q, chunk } = this;
        let { i: start } = this;
        while (true) {
          switch (this.getCode()) {
            case q:
              this.pushAttrib(this.name, this.text + chunk.slice(start, this.prevI));
              this.name = this.text = "";
              this.q = null;
              this.state = S_ATTRIB_VALUE_CLOSED;
              return;
            case AMP:
              this.text += chunk.slice(start, this.prevI);
              this.state = S_ENTITY;
              this.entityReturnState = S_ATTRIB_VALUE_QUOTED;
              return;
            case NL:
            case NL_LIKE:
            case TAB:
              this.text += `${chunk.slice(start, this.prevI)} `;
              start = this.i;
              break;
            case LESS:
              this.text += chunk.slice(start, this.prevI);
              this.fail("disallowed character.");
              return;
            case EOC:
              this.text += chunk.slice(start);
              return;
            default:
          }
        }
      }
      sAttribValueClosed() {
        const c = this.getCodeNorm();
        if (isS(c)) {
          this.state = S_ATTRIB;
        } else if (c === GREATER) {
          this.openTag();
        } else if (c === FORWARD_SLASH) {
          this.state = S_OPEN_TAG_SLASH;
        } else if (isNameStartChar(c)) {
          this.fail("no whitespace between attributes.");
          this.unget();
          this.state = S_ATTRIB_NAME;
        } else {
          this.fail("disallowed character in attribute name.");
        }
      }
      sAttribValueUnquoted() {
        const c = this.captureTo(ATTRIB_VALUE_UNQUOTED_TERMINATOR);
        switch (c) {
          case AMP:
            this.state = S_ENTITY;
            this.entityReturnState = S_ATTRIB_VALUE_UNQUOTED;
            break;
          case LESS:
            this.fail("disallowed character.");
            break;
          case EOC:
            break;
          default:
            if (this.text.includes("]]>")) {
              this.fail('the string "]]>" is disallowed in char data.');
            }
            this.pushAttrib(this.name, this.text);
            this.name = this.text = "";
            if (c === GREATER) {
              this.openTag();
            } else {
              this.state = S_ATTRIB;
            }
        }
      }
      sCloseTag() {
        const c = this.captureNameChars();
        if (c === GREATER) {
          this.closeTag();
        } else if (isS(c)) {
          this.state = S_CLOSE_TAG_SAW_WHITE;
        } else if (c !== EOC) {
          this.fail("disallowed character in closing tag.");
        }
      }
      sCloseTagSawWhite() {
        switch (this.skipSpaces()) {
          case GREATER:
            this.closeTag();
            break;
          case EOC:
            break;
          default:
            this.fail("disallowed character in closing tag.");
        }
      }
      // END OF STATE ENGINE METHODS
      handleTextInRoot() {
        let { i: start, forbiddenState } = this;
        const { chunk, textHandler: handler } = this;
        scanLoop:
          while (true) {
            switch (this.getCode()) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start, this.prevI);
                }
                forbiddenState = FORBIDDEN_START;
                break scanLoop;
              case CLOSE_BRACKET:
                switch (forbiddenState) {
                  case FORBIDDEN_START:
                    forbiddenState = FORBIDDEN_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET:
                    forbiddenState = FORBIDDEN_BRACKET_BRACKET;
                    break;
                  case FORBIDDEN_BRACKET_BRACKET:
                    break;
                  default:
                    throw new Error("impossible state");
                }
                break;
              case GREATER:
                if (forbiddenState === FORBIDDEN_BRACKET_BRACKET) {
                  this.fail('the string "]]>" is disallowed in char data.');
                }
                forbiddenState = FORBIDDEN_START;
                break;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start, this.prevI)}
`;
                }
                start = this.i;
                forbiddenState = FORBIDDEN_START;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start);
                }
                break scanLoop;
              default:
                forbiddenState = FORBIDDEN_START;
            }
          }
        this.forbiddenState = forbiddenState;
      }
      handleTextOutsideRoot() {
        let { i: start } = this;
        const { chunk, textHandler: handler } = this;
        let nonSpace = false;
        outRootLoop:
          while (true) {
            const code = this.getCode();
            switch (code) {
              case LESS: {
                this.state = S_OPEN_WAKA;
                if (handler !== void 0) {
                  const { text } = this;
                  const slice = chunk.slice(start, this.prevI);
                  if (text.length !== 0) {
                    handler(text + slice);
                    this.text = "";
                  } else if (slice.length !== 0) {
                    handler(slice);
                  }
                }
                break outRootLoop;
              }
              case AMP:
                this.state = S_ENTITY;
                this.entityReturnState = S_TEXT;
                if (handler !== void 0) {
                  this.text += chunk.slice(start, this.prevI);
                }
                nonSpace = true;
                break outRootLoop;
              case NL_LIKE:
                if (handler !== void 0) {
                  this.text += `${chunk.slice(start, this.prevI)}
`;
                }
                start = this.i;
                break;
              case EOC:
                if (handler !== void 0) {
                  this.text += chunk.slice(start);
                }
                break outRootLoop;
              default:
                if (!isS(code)) {
                  nonSpace = true;
                }
            }
          }
        if (!nonSpace) {
          return;
        }
        if (!this.sawRoot && !this.reportedTextBeforeRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextBeforeRoot = true;
        }
        if (this.closedRoot && !this.reportedTextAfterRoot) {
          this.fail("text data outside of root node.");
          this.reportedTextAfterRoot = true;
        }
      }
      pushAttribNS(name, value) {
        var _a;
        const { prefix, local } = this.qname(name);
        const attr = { name, prefix, local, value };
        this.attribList.push(attr);
        (_a = this.attributeHandler) === null || _a === void 0 ? void 0 : _a.call(this, attr);
        if (prefix === "xmlns") {
          const trimmed = value.trim();
          if (this.currentXMLVersion === "1.0" && trimmed === "") {
            this.fail("invalid attempt to undefine prefix in XML 1.0");
          }
          this.topNS[local] = trimmed;
          nsPairCheck(this, local, trimmed);
        } else if (name === "xmlns") {
          const trimmed = value.trim();
          this.topNS[""] = trimmed;
          nsPairCheck(this, "", trimmed);
        }
      }
      pushAttribPlain(name, value) {
        var _a;
        const attr = { name, value };
        this.attribList.push(attr);
        (_a = this.attributeHandler) === null || _a === void 0 ? void 0 : _a.call(this, attr);
      }
      /**
       * End parsing. This performs final well-formedness checks and resets the
       * parser to a clean state.
       *
       * @returns this
       */
      end() {
        var _a, _b;
        if (!this.sawRoot) {
          this.fail("document must contain a root element.");
        }
        const { tags } = this;
        while (tags.length > 0) {
          const tag = tags.pop();
          this.fail(`unclosed tag: ${tag.name}`);
        }
        if (this.state !== S_BEGIN && this.state !== S_TEXT) {
          this.fail("unexpected end.");
        }
        const { text } = this;
        if (text.length !== 0) {
          (_a = this.textHandler) === null || _a === void 0 ? void 0 : _a.call(this, text);
          this.text = "";
        }
        this._closed = true;
        (_b = this.endHandler) === null || _b === void 0 ? void 0 : _b.call(this);
        this._init();
        return this;
      }
      /**
       * Resolve a namespace prefix.
       *
       * @param prefix The prefix to resolve.
       *
       * @returns The namespace URI or ``undefined`` if the prefix is not defined.
       */
      resolve(prefix) {
        var _a, _b;
        let uri = this.topNS[prefix];
        if (uri !== void 0) {
          return uri;
        }
        const { tags } = this;
        for (let index = tags.length - 1; index >= 0; index--) {
          uri = tags[index].ns[prefix];
          if (uri !== void 0) {
            return uri;
          }
        }
        uri = this.ns[prefix];
        if (uri !== void 0) {
          return uri;
        }
        return (_b = (_a = this.opt).resolvePrefix) === null || _b === void 0 ? void 0 : _b.call(_a, prefix);
      }
      /**
       * Parse a qname into its prefix and local name parts.
       *
       * @param name The name to parse
       *
       * @returns
       */
      qname(name) {
        const colon = name.indexOf(":");
        if (colon === -1) {
          return { prefix: "", local: name };
        }
        const local = name.slice(colon + 1);
        const prefix = name.slice(0, colon);
        if (prefix === "" || local === "" || local.includes(":")) {
          this.fail(`malformed name: ${name}.`);
        }
        return { prefix, local };
      }
      processAttribsNS() {
        var _a;
        const { attribList } = this;
        const tag = this.tag;
        {
          const { prefix, local } = this.qname(tag.name);
          tag.prefix = prefix;
          tag.local = local;
          const uri = tag.uri = (_a = this.resolve(prefix)) !== null && _a !== void 0 ? _a : "";
          if (prefix !== "") {
            if (prefix === "xmlns") {
              this.fail('tags may not have "xmlns" as prefix.');
            }
            if (uri === "") {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              tag.uri = prefix;
            }
          }
        }
        if (attribList.length === 0) {
          return;
        }
        const { attributes } = tag;
        const seen = /* @__PURE__ */ new Set();
        for (const attr of attribList) {
          const { name, prefix, local } = attr;
          let uri;
          let eqname;
          if (prefix === "") {
            uri = name === "xmlns" ? XMLNS_NAMESPACE : "";
            eqname = name;
          } else {
            uri = this.resolve(prefix);
            if (uri === void 0) {
              this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
              uri = prefix;
            }
            eqname = `{${uri}}${local}`;
          }
          if (seen.has(eqname)) {
            this.fail(`duplicate attribute: ${eqname}.`);
          }
          seen.add(eqname);
          attr.uri = uri;
          attributes[name] = attr;
        }
        this.attribList = [];
      }
      processAttribsPlain() {
        const { attribList } = this;
        const attributes = this.tag.attributes;
        for (const { name, value } of attribList) {
          if (attributes[name] !== void 0) {
            this.fail(`duplicate attribute: ${name}.`);
          }
          attributes[name] = value;
        }
        this.attribList = [];
      }
      /**
       * Handle a complete open tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onopentag``.
       */
      openTag() {
        var _a;
        this.processAttribs();
        const { tags } = this;
        const tag = this.tag;
        tag.isSelfClosing = false;
        (_a = this.openTagHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        tags.push(tag);
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete self-closing tag. This parser code calls this once it has
       * seen the whole tag. This method checks for well-formeness and then emits
       * ``onopentag`` and ``onclosetag``.
       */
      openSelfClosingTag() {
        var _a, _b, _c;
        this.processAttribs();
        const { tags } = this;
        const tag = this.tag;
        tag.isSelfClosing = true;
        (_a = this.openTagHandler) === null || _a === void 0 ? void 0 : _a.call(this, tag);
        (_b = this.closeTagHandler) === null || _b === void 0 ? void 0 : _b.call(this, tag);
        const top = this.tag = (_c = tags[tags.length - 1]) !== null && _c !== void 0 ? _c : null;
        if (top === null) {
          this.closedRoot = true;
        }
        this.state = S_TEXT;
        this.name = "";
      }
      /**
       * Handle a complete close tag. This parser code calls this once it has seen
       * the whole tag. This method checks for well-formeness and then emits
       * ``onclosetag``.
       */
      closeTag() {
        const { tags, name } = this;
        this.state = S_TEXT;
        this.name = "";
        if (name === "") {
          this.fail("weird empty close tag.");
          this.text += "</>";
          return;
        }
        const handler = this.closeTagHandler;
        let l = tags.length;
        while (l-- > 0) {
          const tag = this.tag = tags.pop();
          this.topNS = tag.ns;
          handler === null || handler === void 0 ? void 0 : handler(tag);
          if (tag.name === name) {
            break;
          }
          this.fail("unexpected close tag.");
        }
        if (l === 0) {
          this.closedRoot = true;
        } else if (l < 0) {
          this.fail(`unmatched closing tag: ${name}.`);
          this.text += `</${name}>`;
        }
      }
      /**
       * Resolves an entity. Makes any necessary well-formedness checks.
       *
       * @param entity The entity to resolve.
       *
       * @returns The parsed entity.
       */
      parseEntity(entity) {
        if (entity[0] !== "#") {
          const defined = this.ENTITIES[entity];
          if (defined !== void 0) {
            return defined;
          }
          this.fail(this.isName(entity) ? "undefined entity." : "disallowed character in entity name.");
          return `&${entity};`;
        }
        let num = NaN;
        if (entity[1] === "x" && /^#x[0-9a-f]+$/i.test(entity)) {
          num = parseInt(entity.slice(2), 16);
        } else if (/^#[0-9]+$/.test(entity)) {
          num = parseInt(entity.slice(1), 10);
        }
        if (!this.isChar(num)) {
          this.fail("malformed character entity.");
          return `&${entity};`;
        }
        return String.fromCodePoint(num);
      }
    };
    exports.SaxesParser = SaxesParser2;
  }
});

// src/runtime/skill-entry.ts
import { readFileSync as readFileSync6 } from "node:fs";

// src/runtime/operations.ts
import { existsSync as existsSync4, readFileSync as readFileSync5, readdirSync as readdirSync2, mkdtempSync, mkdirSync as mkdirSync3, writeFileSync as writeFileSync3, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as join6, resolve as resolve4, win32, posix } from "node:path";

// src/skills/jurisdiction.ts
var JurisdictionCode = /* @__PURE__ */ ((JurisdictionCode3) => {
  JurisdictionCode3["CN"] = "CN";
  JurisdictionCode3["US"] = "US";
  JurisdictionCode3["PCT"] = "PCT";
  return JurisdictionCode3;
})(JurisdictionCode || {});
var SUPPORTED_JURISDICTIONS = Object.values(JurisdictionCode);
function isValidJurisdiction(code) {
  return SUPPORTED_JURISDICTIONS.includes(code);
}

// src/core/workflow-stages.ts
var WorkflowStage = /* @__PURE__ */ ((WorkflowStage2) => {
  WorkflowStage2["INIT"] = "INIT";
  WorkflowStage2["RESEARCH"] = "RESEARCH";
  WorkflowStage2["BRAINSTORM_R1"] = "BRAINSTORM_R1";
  WorkflowStage2["BRAINSTORM_R2"] = "BRAINSTORM_R2";
  WorkflowStage2["DRAFT"] = "DRAFT";
  WorkflowStage2["DIAGRAM_DRAFT"] = "DIAGRAM_DRAFT";
  WorkflowStage2["QA_LOOP"] = "QA_LOOP";
  WorkflowStage2["FINAL_REVIEW"] = "FINAL_REVIEW";
  WorkflowStage2["DIAGRAM_FINAL"] = "DIAGRAM_FINAL";
  WorkflowStage2["DONE"] = "DONE";
  return WorkflowStage2;
})(WorkflowStage || {});
var WORKFLOW_STAGE_ORDER = Object.values(WorkflowStage);
var WORKFLOW_STAGE_NAMES = WORKFLOW_STAGE_ORDER;
function isValidStage(value) {
  return typeof value === "string" && WORKFLOW_STAGE_NAMES.includes(value);
}
function toWorkflowStage(value) {
  return WORKFLOW_STAGE_ORDER.find((stage) => stage === value);
}

// src/core/state.ts
function createInitialState(input) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    project: {
      path: input.projectPath,
      topic: input.topic,
      topic_slug: input.topicSlug,
      created_at: now,
      jurisdiction: input.jurisdiction
    },
    current_stage: "INIT",
    // 阶段清单由 WorkflowStage 枚举派生（REQ-039），不再手工列举。
    stages: Object.fromEntries(
      WORKFLOW_STAGE_ORDER.map((stage) => [stage, { status: "pending" }])
    ),
    innovation_candidates: [],
    selected_innovation: null,
    qa_rounds_completed: 0,
    last_modified: now
  };
}
function validateState(state) {
  const errors = [];
  if (typeof state !== "object" || state === null) {
    return { valid: false, errors: ["State must be an object"] };
  }
  const s = state;
  if (s.schema_version !== void 0 && s.schema_version !== 1) errors.push("Unsupported schema_version");
  if (s.schema_version === 1 && (!Number.isSafeInteger(s.revision) || s.revision < 0)) errors.push("Invalid revision");
  if (s.schema_version === 1 && s.project?.path !== ".") errors.push("Versioned project.path must be relative root");
  if (s.schema_version === 1) {
    if (!s.stages || typeof s.stages !== "object" || Array.isArray(s.stages)) errors.push("Versioned stages must be a record");
    else for (const stage of WORKFLOW_STAGE_ORDER) {
      const value = s.stages[stage];
      if (!value || !["pending", "completed"].includes(value.status)) errors.push(`Invalid stage record: ${stage}`);
      if (value?.artifacts !== void 0 && (!Array.isArray(value.artifacts) || !value.artifacts.every((v) => typeof v === "string" && !/^[\/\\]|:|\\|(^|\/)\.\.(\/|$)/.test(v)))) errors.push(`Invalid relative artifacts: ${stage}`);
    }
  }
  if (!s.project || typeof s.project !== "object") {
    errors.push("Missing or invalid project field");
  } else {
    const p = s.project;
    if (!p.path || typeof p.path !== "string") {
      errors.push("Missing or invalid project.path");
    }
    if (!p.topic || typeof p.topic !== "string") {
      errors.push("Missing or invalid project.topic");
    }
    if (!p.topic_slug || typeof p.topic_slug !== "string") {
      errors.push("Missing or invalid project.topic_slug");
    }
    if (!p.jurisdiction || !isValidJurisdiction(p.jurisdiction)) {
      errors.push(
        `Invalid jurisdiction: ${p.jurisdiction} (supported: ${SUPPORTED_JURISDICTIONS.join(", ")})`
      );
    }
  }
  if (!isValidStage(s.current_stage)) {
    errors.push(`Invalid current_stage: ${String(s.current_stage)}`);
  }
  if (!s.stages || typeof s.stages !== "object") {
    errors.push("Missing or invalid stages field");
  }
  if (typeof s.qa_rounds_completed !== "number" || !Number.isInteger(s.qa_rounds_completed) || s.qa_rounds_completed < 0) {
    errors.push(`Invalid qa_rounds_completed: ${String(s.qa_rounds_completed)} (must be a non-negative integer)`);
  }
  if (!Array.isArray(s.innovation_candidates)) {
    errors.push("Missing or invalid innovation_candidates field (must be an array)");
  }
  if (!s.last_modified || typeof s.last_modified !== "string") {
    errors.push("Missing or invalid last_modified");
  }
  return { valid: errors.length === 0, errors };
}

// src/core/project-store.ts
import { createHash, randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { closeSync, existsSync, fsyncSync, mkdirSync as mkdirSync2, openSync, readFileSync, readdirSync, unlinkSync as unlinkSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname2, resolve as resolve2 } from "node:path";

// src/core/atomic-write.ts
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from "fs";
import { dirname } from "path";
import { randomBytes } from "crypto";
function tempPathFor(filePath) {
  return `${filePath}.${process.pid}.${Date.now()}.${randomBytes(8).toString("hex")}.tmp`;
}
function atomicWriteFileSync(filePath, content, options = {}) {
  if (options.mkdir !== false) {
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const tempPath = tempPathFor(filePath);
  const rename = options.rename ?? renameSync;
  try {
    writeFileSync(tempPath, content, { encoding: "utf-8", flag: "wx", mode: options.mode, flush: options.flush });
    rename(tempPath, filePath);
  } catch (error) {
    try {
      if (tempPath !== filePath) unlinkSync(tempPath);
    } catch {
    }
    throw error;
  }
}
async function atomicWriteFile(filePath, content, options = {}) {
  atomicWriteFileSync(filePath, content, options);
}

// src/core/path-safety.ts
import * as path from "path";
import { lstatSync } from "node:fs";
function ensureUnlinkedPath(baseDir, targetPath) {
  ensureInside(baseDir, targetPath);
  const root = path.resolve(baseDir);
  const parts = path.relative(root, path.resolve(targetPath)).split(path.sep).filter(Boolean);
  let current = root;
  for (let index = 0; index <= parts.length; index++) {
    if (index > 0) current = path.join(current, parts[index - 1]);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new Error(`Linked destination blocked: ${current}`);
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      break;
    }
  }
}
function isSafeRelPath(relPath) {
  if (!relPath || typeof relPath !== "string") return false;
  if (path.isAbsolute(relPath)) return false;
  if (relPath.startsWith("/") || relPath.startsWith("\\")) return false;
  const segments = relPath.split(/[\\/]/);
  if (segments.includes("..")) return false;
  if (/^[a-zA-Z]:/.test(relPath)) return false;
  return true;
}
function ensureInside(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  if (resolvedBase === resolvedTarget) {
    return;
  }
  const relative2 = path.relative(resolvedBase, resolvedTarget);
  if (path.isAbsolute(relative2)) {
    throw new Error(`Path traversal blocked: ${targetPath} escapes ${baseDir}`);
  }
  if (relative2.split(/[\\/]/).includes("..")) {
    throw new Error(`Path traversal blocked: ${targetPath} escapes ${baseDir}`);
  }
  if (relative2 === ".." || relative2.startsWith(".." + path.sep) || relative2.startsWith("../") || relative2.startsWith("..\\")) {
    throw new Error(`Path traversal blocked: ${targetPath} escapes ${baseDir}`);
  }
}

// src/core/project-store.ts
var ProjectError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
};
var digest = (data) => createHash("sha256").update(data).digest("hex");
var json = (value) => JSON.stringify(value, null, 2) + "\n";
function projectFile(root, relative2) {
  if (!isSafeRelPath(relative2) || relative2.includes(":") || relative2.includes("\\") || relative2.split("/").some((p) => !p || p === "." || /[. ]$/.test(p))) {
    throw new ProjectError("INVALID_INPUT", `Unsafe project path: ${relative2}`);
  }
  const file = resolve2(root, relative2);
  ensureUnlinkedPath(root, file);
  return file;
}
function readOrNull(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
function durableWrite(file, value) {
  atomicWriteFileSync(file, value, { flush: true });
}
function inspectProject(root) {
  const text = readOrNull(projectFile(root, ".patent/state.json"));
  const directory = projectFile(root, ".patent/transactions");
  const recoveryRequired = existsSync(directory) && readdirSync(directory).some((id) => {
    const file = projectFile(root, `.patent/transactions/${id}/journal.json`);
    const journal = readOrNull(file);
    return journal !== null && JSON.parse(journal).status === "prepared";
  });
  return { state: text === null ? null : JSON.parse(text), state_digest: text === null ? null : digest(text), coordination: { locked: existsSync(projectFile(root, ".patent/write.lock")), recovery_required: recoveryRequired } };
}
function requireCurrentState(state) {
  if (!state) throw new ProjectError("MISSING_FILE", "Project state is absent");
  if (state.schema_version !== 1) throw new ProjectError("INVALID_STATE", "Explicit migration required; future schemas are read-only");
  const result = validateState(state);
  if (!result.valid) throw new ProjectError("INVALID_STATE", result.errors.join("; "));
}
var ProjectStore = class {
  constructor(root) {
    this.root = resolve2(root);
  }
  lockPath() {
    return projectFile(this.root, ".patent/write.lock");
  }
  lock() {
    const file = this.lockPath();
    mkdirSync2(dirname2(file), { recursive: true });
    const lock = { token: randomUUID(), pid: process.pid, host: hostname(), acquired_at: (/* @__PURE__ */ new Date()).toISOString() };
    try {
      const fd = openSync(file, "wx", 384);
      try {
        writeFileSync2(fd, json(lock));
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    } catch (error) {
      if (error.code === "EEXIST") throw new ProjectError("LOCKED", "Project is locked; inspect owner before explicit recovery");
      throw error;
    }
    return lock;
  }
  unlock(lock) {
    const file = this.lockPath();
    if (JSON.parse(readFileSync(file, "utf8")).token !== lock.token) throw new ProjectError("LOCKED", "Lock owner changed");
    unlinkSync2(file);
  }
  /** No age-based recovery. PID reuse intentionally fails closed. */
  recoverLock(token) {
    const file = this.lockPath();
    const owner = JSON.parse(readFileSync(file, "utf8"));
    if (owner.token !== token || owner.host !== hostname()) throw new ProjectError("LOCKED", "Owner token/host mismatch");
    try {
      process.kill(owner.pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") {
        if (JSON.parse(readFileSync(file, "utf8")).token !== token) throw new ProjectError("LOCKED", "Owner changed");
        unlinkSync2(file);
        return;
      }
      throw new ProjectError("LOCKED", "Cannot verify owner is dead");
    }
    throw new ProjectError("LOCKED", "Owner is still alive");
  }
  apply(files) {
    for (const name of Object.keys(files).sort((a, b) => Number(a === ".patent/state.json") - Number(b === ".patent/state.json") || a.localeCompare(b))) {
      const file = projectFile(this.root, name);
      const value = files[name];
      if (value === null) {
        if (existsSync(file)) unlinkSync2(file);
      } else durableWrite(file, value);
    }
  }
  recoverPending() {
    const directory = projectFile(this.root, ".patent/transactions");
    if (!existsSync(directory)) return;
    for (const id of readdirSync(directory).sort()) {
      const file = projectFile(this.root, `.patent/transactions/${id}/journal.json`);
      const text = readOrNull(file);
      if (text === null) continue;
      const journal = JSON.parse(text);
      if (journal.status !== "prepared") continue;
      for (const name of Object.keys(journal.after)) {
        const value = readOrNull(projectFile(this.root, name));
        if (value !== journal.before[name] && value !== journal.after[name]) throw new ProjectError("RECOVERY_REQUIRED", `External modification prevents recovery: ${name}`);
      }
      this.apply(journal.before);
      journal.status = "rolled_back";
      durableWrite(file, json(journal));
    }
  }
  /** Build the complete plan under the same exclusive lock as validation/commit. */
  async mutate(request, build, options = {}) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(request.operation_id)) throw new ProjectError("INVALID_INPUT", "Invalid operation_id");
    if (!request.expected || !(request.expected.revision === null || Number.isSafeInteger(request.expected.revision) && request.expected.revision >= 0)) throw new ProjectError("INVALID_INPUT", "Expected revision required");
    const requestDigest = digest(JSON.stringify(request));
    const lock = this.lock();
    try {
      this.recoverPending();
      const journalPath = projectFile(this.root, `.patent/transactions/${request.operation_id}/journal.json`);
      const prior = readOrNull(journalPath);
      if (prior) {
        const journal2 = JSON.parse(prior);
        if (journal2.request_digest !== requestDigest) throw new ProjectError("CONFLICT", "Operation ID already used with different input");
        if (journal2.status === "committed") return journal2.data;
      }
      const current = inspectProject(this.root);
      if (current.state && current.state.schema_version !== void 0 && current.state.schema_version !== 1) throw new ProjectError("INVALID_STATE", "Unknown schema is read-only");
      if (current.state && !options.migrate) requireCurrentState(current.state);
      const revision = current.state ? current.state.revision ?? 0 : null;
      if (revision !== request.expected.revision || request.expected.state_digest !== void 0 && current.state_digest !== request.expected.state_digest) throw new ProjectError("CONFLICT", "Project changed since inspection");
      for (const [name, expected] of Object.entries(request.expected.inputs ?? {})) {
        const file = projectFile(this.root, name);
        if (!existsSync(file) || digest(readFileSync(file)) !== expected) throw new ProjectError("CONFLICT", `Input changed: ${name}`);
      }
      const plan = await build(current.state);
      const stateText = plan.files[".patent/state.json"];
      if (!stateText) throw new ProjectError("INVALID_STATE", "Every mutation must commit its revision");
      const next = JSON.parse(stateText);
      next.schema_version = 1;
      next.revision = (revision ?? -1) + 1;
      next.project.path = ".";
      next.last_modified = (/* @__PURE__ */ new Date()).toISOString();
      requireCurrentState(next);
      plan.files[".patent/state.json"] = json(next);
      const before = /* @__PURE__ */ Object.create(null);
      for (const name of Object.keys(plan.files)) {
        if (name.startsWith(".patent/transactions/") || name === ".patent/write.lock") throw new ProjectError("INVALID_INPUT", "Reserved transaction path");
        before[name] = readOrNull(projectFile(this.root, name));
      }
      const data = { result: plan.data, revision: next.revision, state_digest: digest(plan.files[".patent/state.json"]) };
      const journal = { request_digest: requestDigest, status: "prepared", before, after: plan.files, data };
      options.fault?.("before_prepare");
      durableWrite(journalPath, json(journal));
      options.fault?.("after_prepare");
      this.apply(plan.files);
      options.fault?.("after_apply");
      journal.status = "committed";
      durableWrite(journalPath, json(journal));
      options.fault?.("after_commit");
      return data;
    } finally {
      this.unlock(lock);
    }
  }
};

// src/core/workflow.ts
var VALID_TRANSITIONS = {
  ["INIT" /* INIT */]: ["RESEARCH" /* RESEARCH */],
  ["RESEARCH" /* RESEARCH */]: ["BRAINSTORM_R1" /* BRAINSTORM_R1 */],
  ["BRAINSTORM_R1" /* BRAINSTORM_R1 */]: ["BRAINSTORM_R2" /* BRAINSTORM_R2 */, "RESEARCH" /* RESEARCH */],
  ["BRAINSTORM_R2" /* BRAINSTORM_R2 */]: ["DRAFT" /* DRAFT */],
  ["DRAFT" /* DRAFT */]: ["DIAGRAM_DRAFT" /* DIAGRAM_DRAFT */],
  ["DIAGRAM_DRAFT" /* DIAGRAM_DRAFT */]: ["QA_LOOP" /* QA_LOOP */],
  ["QA_LOOP" /* QA_LOOP */]: ["FINAL_REVIEW" /* FINAL_REVIEW */, "DRAFT" /* DRAFT */],
  ["FINAL_REVIEW" /* FINAL_REVIEW */]: ["DIAGRAM_FINAL" /* DIAGRAM_FINAL */, "QA_LOOP" /* QA_LOOP */],
  ["DIAGRAM_FINAL" /* DIAGRAM_FINAL */]: ["DONE" /* DONE */],
  ["DONE" /* DONE */]: []
};
var WorkflowMachine = class _WorkflowMachine {
  constructor() {
    this.current = "INIT" /* INIT */;
    this.completed = /* @__PURE__ */ new Set();
  }
  get currentStage() {
    return this.current;
  }
  canTransition(target) {
    return VALID_TRANSITIONS[this.current].includes(target);
  }
  transition(target) {
    if (!this.canTransition(target)) {
      throw new Error(
        `Invalid transition from ${this.current} to ${target}`
      );
    }
    this.completed.add(this.current);
    this.current = target;
    if (this.completed.has(target)) {
      this.completed.delete(target);
    }
  }
  isCompleted(stage) {
    return this.completed.has(stage);
  }
  static fromState(state) {
    const current = toWorkflowStage(state.current_stage);
    if (!current) {
      throw new Error(`Invalid current_stage: ${state.current_stage}`);
    }
    const machine = new _WorkflowMachine();
    machine.current = current;
    for (const stage of WORKFLOW_STAGE_ORDER) {
      const stageState = state.stages[stage];
      if (stageState && stageState.status === "completed") {
        machine.completed.add(stage);
      }
    }
    return machine;
  }
  toState() {
    const stages = {};
    for (const stage of WORKFLOW_STAGE_ORDER) {
      stages[stage] = {
        status: this.completed.has(stage) ? "completed" : "pending"
      };
    }
    return { current_stage: this.current, stages };
  }
};

// src/core/project-config.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
var DEFAULT_PROJECT_CONFIG = {
  jurisdiction: "CN",
  projectDir: "projects",
  outputLanguage: "auto",
  figures: { preferredBackend: "auto" },
  remoteTools: false
};
function effectiveConfig(workspace, project, options) {
  const config = structuredClone(DEFAULT_PROJECT_CONFIG);
  const layers = [];
  for (const file of [workspace ? projectFile(workspace, ".oh-my-patent/config.json") : void 0, projectFile(project, ".patent/config.json")]) if (file && existsSync2(file)) layers.push(JSON.parse(readFileSync2(file, "utf8")));
  layers.push(Object.fromEntries(Object.entries(options).filter(([key]) => Object.prototype.hasOwnProperty.call(DEFAULT_PROJECT_CONFIG, key))));
  for (const layer of layers) {
    if (!layer || typeof layer !== "object" || Array.isArray(layer)) throw new ProjectError("INVALID_INPUT", "Configuration must be an object");
    for (const [key, value] of Object.entries(layer)) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_PROJECT_CONFIG, key)) throw new ProjectError("INVALID_INPUT", `Unknown configuration: ${key}`);
      if (key === "jurisdiction" && !["CN", "US", "PCT"].includes(value)) throw new ProjectError("INVALID_INPUT", "Invalid jurisdiction");
      if (key === "outputLanguage" && !["auto", "zh", "en"].includes(value)) throw new ProjectError("INVALID_INPUT", "Invalid outputLanguage");
      if (key === "remoteTools" && value !== false) throw new ProjectError("INVALID_INPUT", "Configuration cannot enable content disclosure");
      if (key === "projectDir" && (typeof value !== "string" || !value.trim() || /^[a-zA-Z]:|^[\/\\]|(^|[\/\\])\.\.([\/\\]|$)/.test(value))) throw new ProjectError("INVALID_INPUT", "projectDir must be workspace-relative");
      if (key === "figures") {
        if (!value || typeof value !== "object" || Object.keys(value).some((k) => k !== "preferredBackend") || !["auto", "svg", "imagegen", "mermaid", "plantuml"].includes(value.preferredBackend)) throw new ProjectError("INVALID_INPUT", "Invalid figure preference");
        config.figures = { preferredBackend: value.preferredBackend };
      } else Object.assign(config, { [key]: value });
    }
  }
  return config;
}

// src/core/brainstorm-path.ts
function generatePathId(now = Date.now()) {
  return `path-${now}-${Math.random().toString(36).slice(2, 8)}`;
}
function createInitialPath(projectId, topic) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const pathId = generatePathId();
  return {
    id: pathId,
    projectId,
    topic,
    createdAt: now,
    status: "active",
    nodes: [],
    edges: [],
    currentNodeId: "",
    finalDecision: void 0
  };
}
function createInitialNode(round) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: `round-${round}`,
    round,
    agentOutputs: [],
    innovations: [],
    scores: [],
    decision: {
      action: "ITERATE",
      reason: "初始节点",
      recommendations: []
    },
    timestamp: now
  };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function isValidTransformation(value) {
  if (!isRecord(value)) return false;
  return ["refine", "merge", "split", "pivot"].includes(value.type) && typeof value.description === "string" && Array.isArray(value.changes);
}
function isValidBrainstormEdge(value) {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.fromNodeId === "string" && typeof value.toNodeId === "string" && isValidTransformation(value.transformation);
}
function isValidInnovationSnapshot(value) {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.title === "string" && typeof value.problem === "string" && isStringArray(value.coreSolution) && isStringArray(value.differences) && ["active", "merged", "abandoned"].includes(value.status) && (value.mergedInto === void 0 || typeof value.mergedInto === "string") && (value.archiveReason === void 0 || typeof value.archiveReason === "string") && (value.archivedAt === void 0 || typeof value.archivedAt === "string");
}
function isValidInnovationScore(value) {
  if (!isRecord(value)) return false;
  return typeof value.innovationId === "string" && Number.isFinite(value.novelty) && Number.isFinite(value.creativity) && Number.isFinite(value.practicality) && Number.isFinite(value.businessValue) && Number.isFinite(value.weightedScore);
}
function isValidRoundDecision(value) {
  if (!isRecord(value)) return false;
  return ["ITERATE", "PASS_TO_DRAFT", "FORCE_PASS"].includes(value.action) && typeof value.reason === "string" && isStringArray(value.recommendations);
}
function isValidBrainstormPath(data) {
  if (typeof data !== "object" || data === null) return false;
  const path4 = data;
  return typeof path4.id === "string" && typeof path4.projectId === "string" && typeof path4.topic === "string" && typeof path4.createdAt === "string" && ["active", "completed", "abandoned"].includes(path4.status) && Array.isArray(path4.nodes) && path4.nodes.every((nodeId) => typeof nodeId === "string") && Array.isArray(path4.edges) && path4.edges.every((edge) => isValidBrainstormEdge(edge)) && typeof path4.currentNodeId === "string" && (path4.finalDecision === void 0 || isRecord(path4.finalDecision));
}
function isValidBrainstormNode(data) {
  if (typeof data !== "object" || data === null) return false;
  const node = data;
  return typeof node.id === "string" && typeof node.round === "number" && Number.isSafeInteger(node.round) && node.round >= 1 && node.id === `round-${node.round}` && Array.isArray(node.agentOutputs) && node.agentOutputs.every((item) => isRecord(item) && typeof item.agentId === "string" && typeof item.outputFile === "string" && typeof item.summary === "string" && isStringArray(item.keyPoints)) && Array.isArray(node.innovations) && node.innovations.every((item) => isValidInnovationSnapshot(item)) && Array.isArray(node.scores) && node.scores.every((item) => isValidInnovationScore(item)) && isValidRoundDecision(node.decision) && typeof node.timestamp === "string";
}

// src/core/path-persistence.ts
import { promises as fs } from "fs";
import * as path2 from "path";

// src/core/legacy-write-guard.ts
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "node:fs";
import { join as join3, dirname as dirname3, resolve as resolve3 } from "node:path";
function assertLegacyWriter(root) {
  const file = join3(root, ".patent/state.json");
  if (existsSync3(join3(root, ".patent/write.lock"))) throw new ProjectError("LOCKED", "Project is being written");
  if (existsSync3(file) && JSON.parse(readFileSync3(file, "utf8")).schema_version !== void 0) throw new ProjectError("INVALID_STATE", "Versioned projects require the Skill runtime JSON interface (oh-my-patent runtime --input request.json)");
}

// src/core/path-constants.ts
var BRAINSTORM_DIR = ".brainstorm";
var PATH_FILE = "path.json";
var NODES_DIR = "nodes";
var SNAPSHOTS_DIR = "snapshots";
var BRANCHES_DIR = "branches";
var BRANCH_INDEX_FILE = "index.json";

// src/core/path-persistence.ts
async function initBrainstormDirectory(projectPath) {
  assertLegacyWriter(projectPath);
  const brainstormPath = path2.join(projectPath, BRAINSTORM_DIR);
  const nodesPath = path2.join(brainstormPath, NODES_DIR);
  const snapshotsPath = path2.join(brainstormPath, SNAPSHOTS_DIR);
  await fs.mkdir(nodesPath, { recursive: true });
  await fs.mkdir(snapshotsPath, { recursive: true });
}
async function savePath(brainstormPath, projectPath) {
  const filePath = path2.join(projectPath, BRAINSTORM_DIR, PATH_FILE);
  await initBrainstormDirectory(projectPath);
  const content = JSON.stringify(brainstormPath, null, 2);
  await atomicWriteFile(filePath, content, { mkdir: false });
}
async function loadPath(projectPath) {
  const filePath = path2.join(projectPath, BRAINSTORM_DIR, PATH_FILE);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    if (!isValidBrainstormPath(data)) {
      throw new Error("Invalid BrainstormPath data structure");
    }
    return data;
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
async function saveNode(node, projectPath) {
  assertLegacyWriter(projectPath);
  if (!isValidBrainstormNode(node)) throw new Error("Invalid BrainstormNode data structure");
  const nodesDir = path2.join(projectPath, BRAINSTORM_DIR, NODES_DIR);
  const filePath = path2.join(nodesDir, `round-${node.round}.json`);
  await fs.mkdir(nodesDir, { recursive: true });
  const content = JSON.stringify(node, null, 2);
  await atomicWriteFile(filePath, content, { mkdir: false });
}
async function loadNode(projectPath, nodeId) {
  const match = nodeId.match(/^round-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid node ID format: ${nodeId}. Expected format: round-N`);
  }
  const round = match[1];
  const filePath = path2.join(projectPath, BRAINSTORM_DIR, NODES_DIR, `round-${round}.json`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    if (!isValidBrainstormNode(data)) {
      throw new Error("Invalid BrainstormNode data structure");
    }
    return data;
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
async function saveInnovationSnapshot(snapshots, projectPath, round) {
  assertLegacyWriter(projectPath);
  const snapshotsDir = path2.join(projectPath, BRAINSTORM_DIR, SNAPSHOTS_DIR);
  const filePath = path2.join(snapshotsDir, `round-${round}-innovations.json`);
  await fs.mkdir(snapshotsDir, { recursive: true });
  const content = JSON.stringify(snapshots, null, 2);
  await atomicWriteFile(filePath, content, { mkdir: false });
}
async function loadInnovationSnapshot(projectPath, round) {
  const filePath = path2.join(
    projectPath,
    BRAINSTORM_DIR,
    SNAPSHOTS_DIR,
    `round-${round}-innovations.json`
  );
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error("Invalid InnovationSnapshot data: expected array");
    }
    return data;
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

// src/commands/path-branch.ts
import { promises as fs2 } from "fs";
import * as path3 from "path";
var BRANCH_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
var PATH_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
var MAX_PATH_ID_LENGTH = 128;
var MAX_BRANCH_ID_LENGTH = 160;
function isValidBranchId(branchId) {
  return typeof branchId === "string" && branchId.length > 0 && branchId.length <= MAX_BRANCH_ID_LENGTH && BRANCH_ID_PATTERN.test(branchId);
}
function isValidPathId(pathId) {
  return typeof pathId === "string" && pathId.length > 0 && pathId.length <= MAX_PATH_ID_LENGTH && PATH_ID_PATTERN.test(pathId);
}
function assertValidBranchId(branchId) {
  if (!isValidBranchId(branchId)) {
    throw new Error(`Invalid branchId: ${branchId}. Must match ${BRANCH_ID_PATTERN.source}, 1-${MAX_BRANCH_ID_LENGTH} chars`);
  }
}
function assertValidPathId(pathId) {
  if (!isValidPathId(pathId)) {
    throw new Error(`Invalid pathId: ${pathId}. Must match ${PATH_ID_PATTERN.source}, 1-${MAX_PATH_ID_LENGTH} chars`);
  }
}
function getBranchesDir(projectPath) {
  return path3.join(projectPath, BRAINSTORM_DIR, BRANCHES_DIR);
}
function getBranchIndexPath(projectPath) {
  return path3.join(getBranchesDir(projectPath), BRANCH_INDEX_FILE);
}
function getBranchFilePath(projectPath, branchId) {
  assertValidBranchId(branchId);
  const filePath = path3.join(getBranchesDir(projectPath), `${branchId}.json`);
  ensureInside(getBranchesDir(projectPath), filePath);
  return filePath;
}
async function initBranchDirectory(projectPath) {
  assertLegacyWriter(projectPath);
  const branchesDir = getBranchesDir(projectPath);
  await fs2.mkdir(branchesDir, { recursive: true });
}
async function loadBranchIndex(projectPath) {
  const indexPath = getBranchIndexPath(projectPath);
  try {
    const content = await fs2.readFile(indexPath, "utf-8");
    const data = JSON.parse(content);
    if (!data || !Array.isArray(data.branches) || !Number.isSafeInteger(data.lastBranchNumber) || data.lastBranchNumber < 0 || !data.branches.every((branch) => branch && isValidBranchId(branch.branchId) && isValidPathId(branch.parentPathId) && typeof branch.branchPointNodeId === "string" && /^round-\d+$/.test(branch.branchPointNodeId) && typeof branch.branchReason === "string" && typeof branch.createdAt === "string" && ["active", "completed", "abandoned"].includes(branch.status))) {
      throw new Error("Invalid branch index data structure");
    }
    return {
      branches: data.branches,
      lastBranchNumber: data.lastBranchNumber
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { branches: [], lastBranchNumber: 0 };
    }
    throw error;
  }
}
async function saveBranchIndex(projectPath, index) {
  await initBranchDirectory(projectPath);
  const indexPath = getBranchIndexPath(projectPath);
  const content = JSON.stringify(index, null, 2);
  await atomicWriteFile(indexPath, content);
}
async function saveBranchPath(projectPath, branchId, branchPath) {
  assertValidBranchId(branchId);
  await initBranchDirectory(projectPath);
  const filePath = getBranchFilePath(projectPath, branchId);
  const content = JSON.stringify(branchPath, null, 2);
  await atomicWriteFile(filePath, content);
}
function generateBranchId(originalPathId, branchNumber) {
  assertValidPathId(originalPathId);
  return `${originalPathId}-branch-${branchNumber}`;
}
async function createBranchFromNode(projectPath, nodeId, branchReason) {
  const originalPath = await loadPath(projectPath);
  if (!originalPath) {
    throw new Error(`No path found in project: ${projectPath}`);
  }
  const nodeIndex = originalPath.nodes.indexOf(nodeId);
  if (nodeIndex === -1) {
    throw new Error(`Node ${nodeId} not found in path`);
  }
  await initBranchDirectory(projectPath);
  const index = await loadBranchIndex(projectPath);
  const branchNumber = index.lastBranchNumber + 1;
  if (!Number.isSafeInteger(branchNumber)) throw new Error("Branch counter exhausted");
  const branchId = generateBranchId(originalPath.id, branchNumber);
  assertValidBranchId(branchId);
  const branchRoot = path3.join(getBranchesDir(projectPath), branchId);
  ensureInside(getBranchesDir(projectPath), branchRoot);
  try {
    await fs2.lstat(getBranchFilePath(projectPath, branchId));
    throw new Error(`Branch ${branchId} already exists`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await fs2.mkdir(branchRoot);
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(`Branch ${branchId} already exists`);
    }
    throw error;
  }
  const nodesToCopy = originalPath.nodes.slice(0, nodeIndex + 1);
  const branchPath = {
    id: branchId,
    projectId: originalPath.projectId,
    topic: originalPath.topic,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "active",
    nodes: nodesToCopy,
    edges: originalPath.edges.filter(
      (edge) => nodesToCopy.includes(edge.fromNodeId) && nodesToCopy.includes(edge.toNodeId)
    ),
    currentNodeId: nodeId
  };
  try {
    for (const copiedNodeId of nodesToCopy) {
      const node = await loadNode(projectPath, copiedNodeId);
      if (!node) throw new Error(`Source node ${copiedNodeId} not found`);
      if (node) {
        const branchNodesDir = path3.join(getBranchesDir(projectPath), branchId, BRAINSTORM_DIR, "nodes");
        ensureInside(getBranchesDir(projectPath), branchNodesDir);
        await fs2.mkdir(branchNodesDir, { recursive: true });
        const nodeFilePath = path3.join(branchNodesDir, `round-${node.round}.json`);
        const nodeContent = JSON.stringify(node, null, 2);
        await atomicWriteFile(nodeFilePath, nodeContent);
        const snapshot = await loadInnovationSnapshot(projectPath, node.round);
        if (snapshot) {
          const branchSnapshotsDir = path3.join(
            getBranchesDir(projectPath),
            branchId,
            BRAINSTORM_DIR,
            "snapshots"
          );
          await fs2.mkdir(branchSnapshotsDir, { recursive: true });
          const snapshotFilePath = path3.join(branchSnapshotsDir, `round-${node.round}-innovations.json`);
          await atomicWriteFile(snapshotFilePath, JSON.stringify(snapshot, null, 2));
        }
      }
    }
    await saveBranchPath(projectPath, branchId, branchPath);
    const branchInfo = {
      branchId,
      parentPathId: originalPath.id,
      branchPointNodeId: nodeId,
      branchReason,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "active"
    };
    index.branches.push(branchInfo);
    index.lastBranchNumber = branchNumber;
    await saveBranchIndex(projectPath, index);
  } catch (error) {
    try {
      const branchNodesDir = path3.join(getBranchesDir(projectPath), branchId);
      ensureInside(getBranchesDir(projectPath), branchNodesDir);
      await fs2.rm(branchNodesDir, { recursive: true, force: true });
    } catch {
    }
    try {
      const filePath = getBranchFilePath(projectPath, branchId);
      await fs2.unlink(filePath);
    } catch {
    }
    throw error;
  }
  return {
    branchId,
    parentPathId: originalPath.id,
    branchPointNodeId: nodeId,
    branchReason,
    message: `Successfully created branch ${branchId} from node ${nodeId}`
  };
}

// src/commands/path-restore.ts
async function restoreInnovation(projectPath, nodeId, innovationId) {
  const node = await loadNode(projectPath, nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  const innovation = node.innovations.find((i) => i.id === innovationId);
  if (!innovation) {
    throw new Error(`Innovation not found: ${innovationId} in node ${nodeId}`);
  }
  const previousStatus = innovation.status;
  if (previousStatus !== "abandoned") {
    throw new Error(
      `Cannot restore innovation ${innovationId}: current status is '${previousStatus}', not 'abandoned'`
    );
  }
  innovation.status = "active";
  if (innovation.mergedInto) {
    delete innovation.mergedInto;
  }
  delete innovation.archiveReason;
  delete innovation.archivedAt;
  await saveNode(node, projectPath);
  return {
    innovationId,
    nodeId,
    previousStatus,
    newStatus: "active",
    message: `Innovation ${innovationId} has been restored from 'abandoned' to 'active'`
  };
}

// src/core/figures.ts
var import_saxes = __toESM(require_saxes(), 1);
import { readFileSync as readFileSync4 } from "node:fs";
var ID = /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/;
var validId = (value) => typeof value === "string" && ID.test(value);
function exactKeys(value, names) {
  return Object.keys(value).every((name) => names.includes(name));
}
function validateFigureSpec(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ProjectError("INVALID_INPUT", "Figure spec must be an object");
  const s = input;
  const strings = (v) => Array.isArray(v) && v.every((x) => typeof x === "string" && x.trim().length > 0);
  if (!exactKeys(s, ["schema_version", "figure_id", "purpose", "main_sections", "parts", "connections", "required_features", "forbidden_structures", "layout_constraints", "language", "backend", "formats", "review_criteria", "optional"]) || s.schema_version !== 1 || !validId(s.figure_id) || typeof s.purpose !== "string" || !s.purpose.trim() || !["en", "zh"].includes(s.language) || !["svg", "imagegen", "mermaid", "plantuml"].includes(s.backend) || typeof s.optional !== "boolean") throw new ProjectError("INVALID_INPUT", "Invalid figure identity, version, language or backend");
  for (const key of ["main_sections", "required_features", "forbidden_structures", "layout_constraints", "formats", "review_criteria"]) if (!strings(s[key])) throw new ProjectError("INVALID_INPUT", `Invalid ${key}`);
  if (!s.main_sections.length || !s.review_criteria.length || !s.formats.length || !s.required_features.length || !s.formats.every((f) => ["svg", "png", "jpg", "webp"].includes(f))) throw new ProjectError("INVALID_INPUT", "Sections, features, formats and review criteria required");
  if (!Array.isArray(s.parts) || s.parts.length > 1e3 || !s.parts.every((p) => p && validId(p.id) && exactKeys(p, ["id", "number", "label"]) && typeof p.number === "string" && /^\d+[a-z]?$/.test(p.number) && typeof p.label === "string" && p.label.trim())) throw new ProjectError("INVALID_INPUT", "Invalid stable parts");
  if (new Set(s.parts.map((p) => p.id)).size !== s.parts.length || new Set(s.parts.map((p) => p.number)).size !== s.parts.length) throw new ProjectError("INVALID_INPUT", "Duplicate part ID or number");
  const ids = new Set(s.parts.map((p) => p.id));
  if (!Array.isArray(s.connections) || s.connections.length > 4e3 || !s.connections.every((c) => c && exactKeys(c, ["from", "to", "label"]) && ids.has(c.from) && ids.has(c.to) && typeof c.label === "string")) throw new ProjectError("INVALID_INPUT", "Connection references unknown part");
  return s;
}
var ELEMENTS = /* @__PURE__ */ new Set(["svg", "g", "rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text", "tspan", "title", "desc"]);
var ATTRIBUTES = /* @__PURE__ */ new Set(["xmlns", "viewBox", "width", "height", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "fill-rule", "opacity", "fill-opacity", "stroke-opacity", "font-size", "font-family", "font-weight", "text-anchor", "dominant-baseline", "dx", "dy", "transform", "id", "role", "aria-label"]);
function validateSvg(source) {
  if (Buffer.byteLength(source) > 1024 * 1024 || /<!|<\?/.test(source)) throw new ProjectError("INVALID_INPUT", "SVG exceeds limit or contains declarations/entities/instructions");
  const parser = new import_saxes.SaxesParser({ xmlns: true });
  let depth = 0, count = 0;
  const ids = /* @__PURE__ */ new Set();
  parser.on("error", (error) => {
    throw new ProjectError("INVALID_INPUT", `Malformed SVG: ${error.message}`);
  });
  parser.on("opentag", (tag) => {
    count++;
    depth++;
    if (count > 1e4 || depth > 32 || !ELEMENTS.has(tag.name) || tag.uri !== "http://www.w3.org/2000/svg" || count === 1 && tag.name !== "svg" || count > 1 && tag.name === "svg") throw new ProjectError("INVALID_INPUT", "SVG element/namespace/depth not permitted");
    for (const attr of Object.values(tag.attributes)) {
      const { name, value } = attr;
      if (!ATTRIBUTES.has(name) || value.length > 1e5 || /\\|\/\*|\*\/|[\u0000-\u001f\u007f]/.test(value) || /url\s*\(|[<>]|(?:https?:|data:|javascript:|file:|\/\/)/i.test(value) && name !== "xmlns") throw new ProjectError("INVALID_INPUT", `SVG attribute not permitted: ${name}`);
      if (name === "xmlns" && value !== "http://www.w3.org/2000/svg") throw new ProjectError("INVALID_INPUT", "Invalid SVG namespace");
      if (["fill", "stroke"].includes(name) && !/^(?:none|black|white|currentColor|#[0-9a-fA-F]{3,8})$/.test(value)) throw new ProjectError("INVALID_INPUT", "Only simple SVG paint is allowed");
      if (name === "font-family" && !["sans-serif", "serif", "monospace"].includes(value)) throw new ProjectError("INVALID_INPUT", "Only generic local font families allowed");
      if (name === "id") {
        if (!ID.test(value) || ids.has(value)) throw new ProjectError("INVALID_INPUT", "Invalid/duplicate SVG ID");
        ids.add(value);
      }
    }
  });
  parser.on("closetag", () => {
    depth--;
  });
  parser.write(source).close();
  if (!count || depth) throw new ProjectError("INVALID_INPUT", "Incomplete SVG");
  return { valid: true, elements: count, digest: digest(source) };
}
function inspectFigure(root, id) {
  if (!ID.test(id)) throw new ProjectError("INVALID_INPUT", "Invalid figure ID");
  const base = `figures/${id}`;
  const spec = readFileSync4(projectFile(root, `${base}/figure-spec.json`), "utf8");
  validateFigureSpec(JSON.parse(spec));
  const p = JSON.parse(readFileSync4(projectFile(root, `${base}/provenance.json`), "utf8"));
  const current = digest(spec) === p.spec_digest && digest(readFileSync4(projectFile(root, p.result_path))) === p.result_digest && digest(readFileSync4(projectFile(root, "MAIN.md"))) === p.main_digest && (!p.source_path || digest(readFileSync4(projectFile(root, p.source_path))) === p.source_digest);
  return { ...p, review: current ? p.review : { ...p.review, status: "pending" }, review_current: current };
}

// src/runtime/operations.ts
function string(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new ProjectError("INVALID_INPUT", `${name} must be a non-empty string`);
  return value;
}
function readJson(root, name) {
  return JSON.parse(readFileSync5(projectFile(root, name), "utf8"));
}
function tree(root, relative2) {
  const result = /* @__PURE__ */ Object.create(null);
  const dir = projectFile(root, relative2);
  if (!existsSync4(dir)) return result;
  for (const entry of readdirSync2(dir, { withFileTypes: true })) {
    const name = `${relative2}/${entry.name}`;
    projectFile(root, name);
    if (entry.isDirectory()) Object.assign(result, tree(root, name));
    else result[name] = readFileSync5(projectFile(root, name), "utf8");
  }
  return result;
}
async function stagePath(root, operation) {
  const before = tree(root, ".brainstorm");
  const staging = mkdtempSync(join6(tmpdir(), "omp-stage-"));
  try {
    for (const [name, content] of Object.entries(before)) {
      const file = projectFile(staging, name);
      mkdirSync3(resolve4(file, ".."), { recursive: true });
      writeFileSync3(file, content);
    }
    const data = await operation(staging);
    const after = tree(staging, ".brainstorm");
    const files = {};
    for (const name of /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])) if (before[name] !== after[name]) files[name] = after[name] ?? null;
    return { data, files };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
function migrateArtifact(name, oldRoot, root) {
  const pathApi = /^[A-Za-z]:|^\\\\/.test(oldRoot) ? win32 : posix;
  const relative2 = (pathApi.isAbsolute(name) ? pathApi.relative(oldRoot, name) : name).replace(/\\/g, "/");
  if (!existsSync4(projectFile(root, relative2))) throw new ProjectError("MISSING_FILE", `Resolve legacy artifact before migration: ${relative2}`);
  return relative2;
}
function migratePathFiles(state, root) {
  const files = {};
  for (const [name, before] of Object.entries(tree(root, ".brainstorm"))) {
    if (!name.endsWith(".json")) continue;
    const document = JSON.parse(before);
    let changed = false;
    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "outputFile") {
          const path4 = migrateArtifact(string(child, "outputFile"), state.project.path, root);
          if (path4 !== child) {
            value[key] = path4;
            changed = true;
          }
        } else visit(child);
      }
    };
    visit(document);
    if (changed) files[name] = json(document);
  }
  return files;
}
function migrate(state, root) {
  const validation = validateState(state);
  if (!validation.valid || state.schema_version !== void 0) throw new ProjectError("INVALID_STATE", "Only valid legacy state can migrate");
  const next = structuredClone(state);
  const oldRoot = next.project.path;
  for (const stage of Object.values(next.stages)) {
    stage.artifacts = stage.artifacts?.map((name) => migrateArtifact(name, oldRoot, root));
  }
  next.schema_version = 1;
  next.revision = 1;
  next.project.path = ".";
  return next;
}
async function runOperation(request) {
  if (request?.interface_version !== 1) throw new ProjectError("INVALID_INPUT", "interface_version must be 1");
  if (request.params !== void 0 && (!request.params || typeof request.params !== "object" || Array.isArray(request.params))) throw new ProjectError("INVALID_INPUT", "params must be an object");
  if (request.operation === "version" || request.operation === "doctor") return {
    interface_version: 1,
    state_schema: 1,
    node: process.versions.node,
    node_supported: Number(process.versions.node.split(".")[0]) >= 22,
    egress_enforcement: "runtime_only",
    host_egress_enforcement: "instruction_only",
    filesystem: "local-only",
    directory_fsync: false,
    imagegen: "host-owned-unverified"
  };
  const root = resolve4(string(request.project, "project"));
  const params = request.params ?? {};
  if (request.operation === "project.inspect") return inspectProject(root);
  if (["project.validate", "workflow.inspect", "figure.inspect", "path.query"].includes(request.operation)) {
    const inspected = inspectProject(root);
    const coordination = inspected.coordination;
    if (coordination.locked || coordination.recovery_required) throw new ProjectError("RECOVERY_REQUIRED", "Inspect owner/recover the interrupted transaction before reading formal artifacts");
    requireCurrentState(inspected.state);
  }
  if (request.operation === "project.validate" || request.operation === "workflow.inspect") {
    const current = inspectProject(root);
    requireCurrentState(current.state);
    return current;
  }
  if (request.operation === "figure.validateSpec") return validateFigureSpec(params.spec);
  if (request.operation === "figure.validateSvg") return validateSvg(readFileSync5(projectFile(root, string(params.path, "path")), "utf8"));
  if (request.operation === "figure.inspect") return inspectFigure(root, string(params.figure_id, "figure_id"));
  if (request.operation === "path.query") return { path: await loadPath(root), files: tree(root, ".brainstorm") };
  if (request.operation === "project.migrate" && params.dry_run === true) {
    const current = inspectProject(root);
    if (!current.state) throw new ProjectError("MISSING_FILE", "State missing");
    return { proposed: migrate(current.state, root), path_files: Object.keys(migratePathFiles(current.state, root)), state_digest: current.state_digest, writes: false };
  }
  if (request.operation === "project.recoverLock") {
    new ProjectStore(root).recoverLock(string(params.owner_token, "owner_token"));
    return { recovered: true };
  }
  const operations = ["project.create", "project.migrate", "workflow.advance", "path.record", "path.branch", "path.restore", "figure.register"];
  if (!operations.includes(request.operation)) throw new ProjectError("UNKNOWN_OPERATION", `Unknown operation: ${request.operation}`);
  const mutation = { ...request, operation_id: string(request.operation_id, "operation_id"), expected: request.expected };
  return new ProjectStore(root).mutate(mutation, async (current) => {
    if (request.operation === "project.create") {
      if (current || request.expected?.revision !== null) throw new ProjectError("CONFLICT", "Creation requires absent state");
      const topic = string(params.topic, "topic");
      const slug = string(params.topic_slug, "topic_slug");
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(slug)) throw new ProjectError("INVALID_INPUT", "Invalid topic_slug");
      const config = effectiveConfig(typeof params.workspace === "string" ? resolve4(params.workspace) : void 0, root, params);
      const jurisdiction = config.jurisdiction;
      const state = createInitialState({ topic, topicSlug: slug, jurisdiction, projectPath: "." });
      const files2 = {
        ".patent/state.json": json(state),
        ".brainstorm/path.json": json(createInitialPath(slug, topic)),
        ".patent/config.json": json(config),
        "MAIN.md": `# ${topic}

Technical drafting assistance, not legal advice. Have a qualified patent professional review before reliance or filing.

Evidence and technical details pending.
`
      };
      for (const name of Object.keys(files2)) if (name !== ".patent/config.json" && existsSync4(projectFile(root, name))) throw new ProjectError("CONFLICT", `Creation would replace existing ${name}`);
      return { files: files2, data: { created: true } };
    }
    if (request.operation === "project.migrate") {
      if (!current) throw new ProjectError("MISSING_FILE", "State missing");
      if (!request.expected?.state_digest) throw new ProjectError("INVALID_INPUT", "Migration requires the inspected state digest");
      const state = migrate(current, root);
      const paths = migratePathFiles(current, root);
      const backups = Object.fromEntries(Object.keys(paths).map((name) => [`.patent/backups/${request.operation_id}/${name}`, readFileSync5(projectFile(root, name), "utf8")]));
      return { files: { ...paths, ...backups, ".patent/state.json": json(state), [`.patent/backups/${request.operation_id}-legacy-state.json`]: readFileSync5(projectFile(root, ".patent/state.json"), "utf8") }, data: { migrated: true, path_files: Object.keys(paths) } };
    }
    requireCurrentState(current);
    const files = {};
    let data;
    if (request.operation === "workflow.advance") {
      const target = string(params.target, "target");
      const artifacts = params.artifacts;
      if (!Array.isArray(artifacts) || !artifacts.length || !artifacts.every((a) => typeof a === "string")) throw new ProjectError("INVALID_INPUT", "Saved stage artifacts required");
      for (const name of artifacts) {
        const file = projectFile(root, name);
        if (!existsSync4(file)) throw new ProjectError("MISSING_FILE", `Missing artifact: ${name}`);
        if (!request.expected?.inputs?.[name]) throw new ProjectError("INVALID_INPUT", "Each artifact needs an expected input digest");
      }
      if (["DRAFT" /* DRAFT */, "DONE" /* DONE */].includes(target) && params.human_decision !== true) throw new ProjectError("INVALID_STATE", "Human innovation selection/final acceptance required");
      if (target === "DONE" /* DONE */) {
        const entries = existsSync4(projectFile(root, "figures")) ? readdirSync2(projectFile(root, "figures"), { withFileTypes: true }).filter((x) => x.isDirectory()) : [];
        const omitted = params.omitted_figures ?? [];
        if (!Array.isArray(omitted) || !omitted.every((item) => item && typeof item.figure_id === "string" && typeof item.reason === "string" && item.reason.trim()) || new Set(omitted.map((item) => item.figure_id)).size !== omitted.length) throw new ProjectError("INVALID_INPUT", "Omissions require unique figure IDs and reasons");
        for (const item of omitted) if (!entries.some((entry) => entry.name === item.figure_id)) throw new ProjectError("INVALID_INPUT", "Cannot omit an unknown figure");
        if (!entries.length && params.figures_not_required !== true) throw new ProjectError("INVALID_STATE", "Explicitly record that no figures are required before final completion");
        for (const entry of entries) {
          if (omitted.some((item) => item.figure_id === entry.name)) {
            const path4 = `figures/${entry.name}/figure-spec.json`;
            if (!request.expected?.inputs?.[path4]) throw new ProjectError("INVALID_INPUT", "Omitted specification needs an expected input digest");
            if (!validateFigureSpec(readJson(root, path4)).optional) throw new ProjectError("INVALID_STATE", "Required figures cannot be omitted");
            continue;
          }
          const figure = inspectFigure(root, entry.name);
          if (!figure.review_current || figure.review.status !== "passed" || !figure.review.technical || !figure.review.visual) throw new ProjectError("INVALID_STATE", `Current technical/visual review required: ${entry.name}`);
        }
        files[`.patent/decisions/${request.operation_id}.json`] = json({ target, human_decision: true, figures_not_required: params.figures_not_required === true, omitted_figures: omitted, artifacts, recorded_at: (/* @__PURE__ */ new Date()).toISOString() });
      }
      const machine = WorkflowMachine.fromState(current);
      if (!Object.values(WorkflowStage).includes(target) || !machine.canTransition(target)) throw new ProjectError("INVALID_STATE", `Illegal transition: ${current.current_stage} -> ${target}`);
      const completed = current.current_stage;
      machine.transition(target);
      current.current_stage = target;
      current.stages[completed] = { status: "completed", timestamp: (/* @__PURE__ */ new Date()).toISOString(), artifacts };
      current.stages[target] = { status: "pending" };
      data = { current_stage: target };
    } else if (request.operation.startsWith("path.")) {
      const staged = await stagePath(root, async (temp) => {
        if (request.operation === "path.branch") return createBranchFromNode(temp, string(params.node_id, "node_id"), string(params.reason, "reason"));
        if (request.operation === "path.restore") {
          const nodeId = string(params.node_id, "node_id");
          const result = await restoreInnovation(temp, nodeId, string(params.innovation_id, "innovation_id"));
          const restored = await loadNode(temp, nodeId);
          if (!restored) throw new ProjectError("MISSING_FILE", "Restored node is missing");
          await saveInnovationSnapshot(restored.innovations, temp, restored.round);
          return result;
        }
        const path4 = await loadPath(temp);
        if (!path4) throw new ProjectError("MISSING_FILE", "Path missing");
        const node = { ...createInitialNode(path4.nodes.length + 1), ...params.node };
        if (!isValidBrainstormNode(node) || node.round !== path4.nodes.length + 1 || node.id !== `round-${node.round}`) throw new ProjectError("INVALID_INPUT", "Valid consecutive path node required");
        for (const output of node.agentOutputs) {
          if (!existsSync4(projectFile(root, output.outputFile)) || !request.expected?.inputs?.[output.outputFile]) throw new ProjectError("MISSING_FILE", "Actual role artifacts and expected input digests required");
        }
        if (path4.currentNodeId) path4.edges.push({ id: `edge-${path4.currentNodeId}-to-${node.id}`, fromNodeId: path4.currentNodeId, toNodeId: node.id, transformation: { type: "refine", description: `Round ${node.round - 1} -> Round ${node.round}`, changes: [] } });
        path4.nodes.push(node.id);
        path4.currentNodeId = node.id;
        await saveNode(node, temp);
        await saveInnovationSnapshot(node.innovations, temp, node.round);
        await savePath(path4, temp);
        return { node_id: node.id };
      });
      Object.assign(files, staged.files);
      data = staged.data;
    } else if (request.operation === "figure.register") {
      const specPath = string(params.spec_path, "spec_path");
      const specText = readFileSync5(projectFile(root, specPath), "utf8");
      const spec = validateFigureSpec(JSON.parse(specText));
      const base = `figures/${spec.figure_id}`;
      if (specPath !== `${base}/figure-spec.json`) throw new ProjectError("INVALID_INPUT", "Specification must be in its figure directory");
      const resultPath = string(params.result_path, "result_path");
      if (!resultPath.startsWith(`${base}/`)) throw new ProjectError("INVALID_INPUT", "Result must be in its figure directory");
      const extension = resultPath.split(".").pop();
      if (!spec.formats.includes(extension) || resultPath === specPath || ["provenance.json", "registered-spec.json"].some((name) => resultPath === `${base}/${name}`)) throw new ProjectError("INVALID_INPUT", "Result must use a declared image format");
      const result = readFileSync5(projectFile(root, resultPath));
      if (resultPath.endsWith(".svg")) validateSvg(result.toString("utf8"));
      else if (spec.backend === "svg") throw new ProjectError("INVALID_INPUT", "SVG backend requires SVG result");
      for (const name of [specPath, resultPath, "MAIN.md"]) if (!request.expected?.inputs?.[name]) throw new ProjectError("INVALID_INPUT", `Expected input digest required: ${name}`);
      const review = params.review;
      if (review && (!["pending", "passed", "failed"].includes(review.status) || !["model", "human"].includes(review.reviewer_type) || typeof review.reviewer !== "string" || !review.reviewer.trim() || !Array.isArray(review.findings) || !review.findings.every((f) => typeof f === "string") || typeof review.technical !== "boolean" || typeof review.visual !== "boolean" || review.status === "passed" && (!review.technical || !review.visual))) throw new ProjectError("INVALID_INPUT", "Invalid review");
      const priorPath = `${base}/provenance.json`;
      if (existsSync4(projectFile(root, priorPath))) {
        const snapshotPath = `${base}/registered-spec.json`;
        if (existsSync4(projectFile(root, snapshotPath))) {
          const old = validateFigureSpec(readJson(root, snapshotPath));
          for (const part of spec.parts) if (old.parts.some((p) => p.id === part.id && p.number !== part.number)) throw new ProjectError("INVALID_INPUT", "Existing part numbers must remain stable");
        }
      }
      const provenance = {
        figure_id: spec.figure_id,
        spec_digest: digest(specText),
        result_digest: digest(result),
        main_digest: digest(readFileSync5(projectFile(root, "MAIN.md"))),
        result_path: resultPath,
        backend: spec.backend,
        tool: string(params.tool, "tool"),
        generated_at: (/* @__PURE__ */ new Date()).toISOString(),
        review: review ?? { status: "pending", reviewer_type: "model", reviewer: "unreviewed", technical: false, visual: false, findings: [] }
      };
      if (spec.backend === "imagegen") {
        provenance.consent_reference = string(params.consent_reference, "consent_reference");
        provenance.disclosure_reference = string(params.disclosure_reference, "disclosure_reference");
        const payloadPath = string(params.payload_path, "payload_path");
        if (!provenance.consent_reference.startsWith(".patent/disclosures/consents/") || !provenance.disclosure_reference.startsWith(".patent/disclosures/events/")) throw new ProjectError("INVALID_INPUT", "Use saved consent and disclosure ledger references");
        for (const ref of [provenance.consent_reference, provenance.disclosure_reference, payloadPath]) if (!request.expected?.inputs?.[ref]) throw new ProjectError("INVALID_INPUT", "Disclosure evidence needs expected input digests");
        const consent = readJson(root, provenance.consent_reference);
        const event = readJson(root, provenance.disclosure_reference);
        const payloadDigest = digest(readFileSync5(projectFile(root, payloadPath)));
        if (!consent || !event || consent.content_digest !== payloadDigest || event.content_digest !== payloadDigest || consent.id !== event.consent_id || consent.operation_id !== event.operation_id || consent.tool !== provenance.tool || event.tool !== provenance.tool || consent.recipient !== event.recipient || consent.purpose !== event.purpose || !consent.approval_reference || consent.reuse !== "one_operation" || event.outcome !== "acknowledged" || !(Date.parse(String(event.time)) >= Date.parse(String(consent.approved_at))) || !(Date.parse(String(event.time)) <= Date.parse(String(consent.expires_at)))) throw new ProjectError("DISCLOSURE_DENIED", "Image generation requires matching approved payload and acknowledged disclosure evidence");
        const recipient = new URL(string(consent.recipient, "recipient"));
        if (!["https:", "http:"].includes(recipient.protocol) || recipient.username || recipient.password || recipient.search || recipient.hash) throw new ProjectError("INVALID_INPUT", "Invalid disclosure recipient");
        provenance.provider = string(params.provider, "provider");
      }
      if (typeof params.provider === "string") provenance.provider = params.provider;
      if (typeof params.model === "string") provenance.model = params.model;
      if (typeof params.source_path === "string") {
        if (!params.source_path.startsWith(`${base}/`) || !request.expected?.inputs?.[params.source_path]) throw new ProjectError("INVALID_INPUT", "Source must be in figure directory with expected digest");
        provenance.source_path = params.source_path;
        provenance.source_digest = digest(readFileSync5(projectFile(root, params.source_path)));
      }
      files[`${base}/provenance.json`] = json(provenance);
      files[`${base}/registered-spec.json`] = specText;
      data = provenance;
    }
    files[".patent/state.json"] = json(current);
    return { files, data };
  }, { migrate: request.operation === "project.migrate" });
}

// src/runtime/skill-entry.ts
try {
  if (Number(process.versions.node.split(".")[0]) < 22) throw new ProjectError("MISSING_CAPABILITY", "Node.js 22 or newer is required");
  const args = process.argv.slice(2);
  let request;
  if (args.length === 1 && ["--version", "--doctor"].includes(args[0])) request = { interface_version: 1, operation: args[0].slice(2) };
  else if (args.length === 0) request = JSON.parse(readFileSync6(0, "utf8").replace(/^\uFEFF/, ""));
  else if (args.length === 2 && args[0] === "--input") request = JSON.parse(readFileSync6(args[1], "utf8").replace(/^\uFEFF/, ""));
  else throw new ProjectError("INVALID_INPUT", "Use stdin, --input <JSON file>, --version or --doctor");
  const data = await runOperation(request);
  process.stdout.write(JSON.stringify({ ok: true, data, artifacts: [], warnings: [] }) + "\n");
} catch (error) {
  const code = error instanceof ProjectError ? error.code : error instanceof SyntaxError ? "INVALID_INPUT" : error.code === "ENOENT" ? "MISSING_FILE" : "INTERNAL_ERROR";
  const exit = ["CONFLICT", "LOCKED", "RECOVERY_REQUIRED"].includes(code) ? 3 : ["MISSING_FILE", "MISSING_CAPABILITY"].includes(code) ? 4 : ["DISCLOSURE_DENIED", "RENDER_FAILED"].includes(code) ? 5 : code === "INTERNAL_ERROR" ? 1 : 2;
  process.stdout.write(JSON.stringify({ ok: false, data: null, artifacts: [], warnings: [], error: { code, message: error instanceof Error ? error.message : String(error) } }) + "\n");
  process.exitCode = exit;
}
