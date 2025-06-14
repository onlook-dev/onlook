var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// ../../../node_modules/lodash/isObject.js
var require_isObject = __commonJS((exports, module) => {
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == "object" || type == "function");
  }
  module.exports = isObject;
});

// ../../../node_modules/lodash/_freeGlobal.js
var require__freeGlobal = __commonJS((exports, module) => {
  var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
  module.exports = freeGlobal;
});

// ../../../node_modules/lodash/_root.js
var require__root = __commonJS((exports, module) => {
  var freeGlobal = require__freeGlobal();
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal || freeSelf || Function("return this")();
  module.exports = root;
});

// ../../../node_modules/lodash/now.js
var require_now = __commonJS((exports, module) => {
  var root = require__root();
  var now = function() {
    return root.Date.now();
  };
  module.exports = now;
});

// ../../../node_modules/lodash/_trimmedEndIndex.js
var require__trimmedEndIndex = __commonJS((exports, module) => {
  var reWhitespace = /\s/;
  function trimmedEndIndex(string) {
    var index = string.length;
    while (index-- && reWhitespace.test(string.charAt(index))) {}
    return index;
  }
  module.exports = trimmedEndIndex;
});

// ../../../node_modules/lodash/_baseTrim.js
var require__baseTrim = __commonJS((exports, module) => {
  var trimmedEndIndex = require__trimmedEndIndex();
  var reTrimStart = /^\s+/;
  function baseTrim(string) {
    return string ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, "") : string;
  }
  module.exports = baseTrim;
});

// ../../../node_modules/lodash/_Symbol.js
var require__Symbol = __commonJS((exports, module) => {
  var root = require__root();
  var Symbol2 = root.Symbol;
  module.exports = Symbol2;
});

// ../../../node_modules/lodash/_getRawTag.js
var require__getRawTag = __commonJS((exports, module) => {
  var Symbol2 = require__Symbol();
  var objectProto = Object.prototype;
  var hasOwnProperty2 = objectProto.hasOwnProperty;
  var nativeObjectToString = objectProto.toString;
  var symToStringTag = Symbol2 ? Symbol2.toStringTag : undefined;
  function getRawTag(value) {
    var isOwn = hasOwnProperty2.call(value, symToStringTag), tag = value[symToStringTag];
    try {
      value[symToStringTag] = undefined;
      var unmasked = true;
    } catch (e) {}
    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  module.exports = getRawTag;
});

// ../../../node_modules/lodash/_objectToString.js
var require__objectToString = __commonJS((exports, module) => {
  var objectProto = Object.prototype;
  var nativeObjectToString = objectProto.toString;
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }
  module.exports = objectToString;
});

// ../../../node_modules/lodash/_baseGetTag.js
var require__baseGetTag = __commonJS((exports, module) => {
  var Symbol2 = require__Symbol();
  var getRawTag = require__getRawTag();
  var objectToString = require__objectToString();
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var symToStringTag = Symbol2 ? Symbol2.toStringTag : undefined;
  function baseGetTag(value) {
    if (value == null) {
      return value === undefined ? undefinedTag : nullTag;
    }
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  module.exports = baseGetTag;
});

// ../../../node_modules/lodash/isObjectLike.js
var require_isObjectLike = __commonJS((exports, module) => {
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  module.exports = isObjectLike;
});

// ../../../node_modules/lodash/isSymbol.js
var require_isSymbol = __commonJS((exports, module) => {
  var baseGetTag = require__baseGetTag();
  var isObjectLike = require_isObjectLike();
  var symbolTag = "[object Symbol]";
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
  }
  module.exports = isSymbol;
});

// ../../../node_modules/lodash/toNumber.js
var require_toNumber = __commonJS((exports, module) => {
  var baseTrim = require__baseTrim();
  var isObject = require_isObject();
  var isSymbol = require_isSymbol();
  var NAN = 0 / 0;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var freeParseInt = parseInt;
  function toNumber(value) {
    if (typeof value == "number") {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject(other) ? other + "" : other;
    }
    if (typeof value != "string") {
      return value === 0 ? value : +value;
    }
    value = baseTrim(value);
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
  }
  module.exports = toNumber;
});

// ../../../node_modules/lodash/debounce.js
var require_debounce = __commonJS((exports, module) => {
  var isObject = require_isObject();
  var now = require_now();
  var toNumber = require_toNumber();
  var FUNC_ERROR_TEXT = "Expected a function";
  var nativeMax = Math.max;
  var nativeMin = Math.min;
  function debounce(func, wait, options) {
    var lastArgs, lastThis, maxWait, result, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
    if (typeof func != "function") {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = toNumber(wait) || 0;
    if (isObject(options)) {
      leading = !!options.leading;
      maxing = "maxWait" in options;
      maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
      trailing = "trailing" in options ? !!options.trailing : trailing;
    }
    function invokeFunc(time) {
      var args = lastArgs, thisArg = lastThis;
      lastArgs = lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }
    function leadingEdge(time) {
      lastInvokeTime = time;
      timerId = setTimeout(timerExpired, wait);
      return leading ? invokeFunc(time) : result;
    }
    function remainingWait(time) {
      var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
      return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
    }
    function shouldInvoke(time) {
      var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
      return lastCallTime === undefined || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
    }
    function timerExpired() {
      var time = now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      timerId = setTimeout(timerExpired, remainingWait(time));
    }
    function trailingEdge(time) {
      timerId = undefined;
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = undefined;
      return result;
    }
    function cancel() {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = undefined;
    }
    function flush() {
      return timerId === undefined ? result : trailingEdge(now());
    }
    function debounced() {
      var time = now(), isInvoking = shouldInvoke(time);
      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;
      if (isInvoking) {
        if (timerId === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          clearTimeout(timerId);
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === undefined) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }
  module.exports = debounce;
});

// ../../../node_modules/source-map-js/lib/base64.js
var require_base64 = __commonJS((exports) => {
  var intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
  exports.encode = function(number) {
    if (0 <= number && number < intToCharMap.length) {
      return intToCharMap[number];
    }
    throw new TypeError("Must be between 0 and 63: " + number);
  };
  exports.decode = function(charCode) {
    var bigA = 65;
    var bigZ = 90;
    var littleA = 97;
    var littleZ = 122;
    var zero = 48;
    var nine = 57;
    var plus = 43;
    var slash = 47;
    var littleOffset = 26;
    var numberOffset = 52;
    if (bigA <= charCode && charCode <= bigZ) {
      return charCode - bigA;
    }
    if (littleA <= charCode && charCode <= littleZ) {
      return charCode - littleA + littleOffset;
    }
    if (zero <= charCode && charCode <= nine) {
      return charCode - zero + numberOffset;
    }
    if (charCode == plus) {
      return 62;
    }
    if (charCode == slash) {
      return 63;
    }
    return -1;
  };
});

// ../../../node_modules/source-map-js/lib/base64-vlq.js
var require_base64_vlq = __commonJS((exports) => {
  var base64 = require_base64();
  var VLQ_BASE_SHIFT = 5;
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
  var VLQ_BASE_MASK = VLQ_BASE - 1;
  var VLQ_CONTINUATION_BIT = VLQ_BASE;
  function toVLQSigned(aValue) {
    return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
  }
  function fromVLQSigned(aValue) {
    var isNegative = (aValue & 1) === 1;
    var shifted = aValue >> 1;
    return isNegative ? -shifted : shifted;
  }
  exports.encode = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;
    var vlq = toVLQSigned(aValue);
    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64.encode(digit);
    } while (vlq > 0);
    return encoded;
  };
  exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
    var strLen = aStr.length;
    var result = 0;
    var shift = 0;
    var continuation, digit;
    do {
      if (aIndex >= strLen) {
        throw new Error("Expected more digits in base 64 VLQ value.");
      }
      digit = base64.decode(aStr.charCodeAt(aIndex++));
      if (digit === -1) {
        throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
      }
      continuation = !!(digit & VLQ_CONTINUATION_BIT);
      digit &= VLQ_BASE_MASK;
      result = result + (digit << shift);
      shift += VLQ_BASE_SHIFT;
    } while (continuation);
    aOutParam.value = fromVLQSigned(result);
    aOutParam.rest = aIndex;
  };
});

// ../../../node_modules/source-map-js/lib/util.js
var require_util = __commonJS((exports) => {
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    } else {
      throw new Error('"' + aName + '" is a required argument.');
    }
  }
  exports.getArg = getArg;
  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;
  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);
    if (!match) {
      return null;
    }
    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }
  exports.urlParse = urlParse;
  function urlGenerate(aParsedUrl) {
    var url = "";
    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ":";
    }
    url += "//";
    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + "@";
    }
    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }
    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port;
    }
    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }
    return url;
  }
  exports.urlGenerate = urlGenerate;
  var MAX_CACHED_INPUTS = 32;
  function lruMemoize(f) {
    var cache = [];
    return function(input) {
      for (var i = 0;i < cache.length; i++) {
        if (cache[i].input === input) {
          var temp = cache[0];
          cache[0] = cache[i];
          cache[i] = temp;
          return cache[0].result;
        }
      }
      var result = f(input);
      cache.unshift({
        input,
        result
      });
      if (cache.length > MAX_CACHED_INPUTS) {
        cache.pop();
      }
      return result;
    };
  }
  var normalize = lruMemoize(function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = exports.isAbsolute(path);
    var parts = [];
    var start = 0;
    var i = 0;
    while (true) {
      start = i;
      i = path.indexOf("/", start);
      if (i === -1) {
        parts.push(path.slice(start));
        break;
      } else {
        parts.push(path.slice(start, i));
        while (i < path.length && path[i] === "/") {
          i++;
        }
      }
    }
    for (var part, up = 0, i = parts.length - 1;i >= 0; i--) {
      part = parts[i];
      if (part === ".") {
        parts.splice(i, 1);
      } else if (part === "..") {
        up++;
      } else if (up > 0) {
        if (part === "") {
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }
    path = parts.join("/");
    if (path === "") {
      path = isAbsolute ? "/" : ".";
    }
    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
  });
  exports.normalize = normalize;
  function join(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }
    if (aPath === "") {
      aPath = ".";
    }
    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);
    if (aRootUrl) {
      aRoot = aRootUrl.path || "/";
    }
    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }
      return urlGenerate(aPathUrl);
    }
    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    }
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }
    var joined = aPath.charAt(0) === "/" ? aPath : normalize(aRoot.replace(/\/+$/, "") + "/" + aPath);
    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }
    return joined;
  }
  exports.join = join;
  exports.isAbsolute = function(aPath) {
    return aPath.charAt(0) === "/" || urlRegexp.test(aPath);
  };
  function relative(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }
    aRoot = aRoot.replace(/\/$/, "");
    var level = 0;
    while (aPath.indexOf(aRoot + "/") !== 0) {
      var index = aRoot.lastIndexOf("/");
      if (index < 0) {
        return aPath;
      }
      aRoot = aRoot.slice(0, index);
      if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
        return aPath;
      }
      ++level;
    }
    return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
  }
  exports.relative = relative;
  var supportsNullProto = function() {
    var obj = Object.create(null);
    return !("__proto__" in obj);
  }();
  function identity(s) {
    return s;
  }
  function toSetString(aStr) {
    if (isProtoString(aStr)) {
      return "$" + aStr;
    }
    return aStr;
  }
  exports.toSetString = supportsNullProto ? identity : toSetString;
  function fromSetString(aStr) {
    if (isProtoString(aStr)) {
      return aStr.slice(1);
    }
    return aStr;
  }
  exports.fromSetString = supportsNullProto ? identity : fromSetString;
  function isProtoString(s) {
    if (!s) {
      return false;
    }
    var length = s.length;
    if (length < 9) {
      return false;
    }
    if (s.charCodeAt(length - 1) !== 95 || s.charCodeAt(length - 2) !== 95 || s.charCodeAt(length - 3) !== 111 || s.charCodeAt(length - 4) !== 116 || s.charCodeAt(length - 5) !== 111 || s.charCodeAt(length - 6) !== 114 || s.charCodeAt(length - 7) !== 112 || s.charCodeAt(length - 8) !== 95 || s.charCodeAt(length - 9) !== 95) {
      return false;
    }
    for (var i = length - 10;i >= 0; i--) {
      if (s.charCodeAt(i) !== 36) {
        return false;
      }
    }
    return true;
  }
  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0 || onlyCompareOriginal) {
      return cmp;
    }
    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }
    return strcmp(mappingA.name, mappingB.name);
  }
  exports.compareByOriginalPositions = compareByOriginalPositions;
  function compareByOriginalPositionsNoSource(mappingA, mappingB, onlyCompareOriginal) {
    var cmp;
    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0 || onlyCompareOriginal) {
      return cmp;
    }
    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }
    return strcmp(mappingA.name, mappingB.name);
  }
  exports.compareByOriginalPositionsNoSource = compareByOriginalPositionsNoSource;
  function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0 || onlyCompareGenerated) {
      return cmp;
    }
    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }
    return strcmp(mappingA.name, mappingB.name);
  }
  exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;
  function compareByGeneratedPositionsDeflatedNoLine(mappingA, mappingB, onlyCompareGenerated) {
    var cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0 || onlyCompareGenerated) {
      return cmp;
    }
    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }
    return strcmp(mappingA.name, mappingB.name);
  }
  exports.compareByGeneratedPositionsDeflatedNoLine = compareByGeneratedPositionsDeflatedNoLine;
  function strcmp(aStr1, aStr2) {
    if (aStr1 === aStr2) {
      return 0;
    }
    if (aStr1 === null) {
      return 1;
    }
    if (aStr2 === null) {
      return -1;
    }
    if (aStr1 > aStr2) {
      return 1;
    }
    return -1;
  }
  function compareByGeneratedPositionsInflated(mappingA, mappingB) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }
    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }
    return strcmp(mappingA.name, mappingB.name);
  }
  exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;
  function parseSourceMapInput(str) {
    return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
  }
  exports.parseSourceMapInput = parseSourceMapInput;
  function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
    sourceURL = sourceURL || "";
    if (sourceRoot) {
      if (sourceRoot[sourceRoot.length - 1] !== "/" && sourceURL[0] !== "/") {
        sourceRoot += "/";
      }
      sourceURL = sourceRoot + sourceURL;
    }
    if (sourceMapURL) {
      var parsed = urlParse(sourceMapURL);
      if (!parsed) {
        throw new Error("sourceMapURL could not be parsed");
      }
      if (parsed.path) {
        var index = parsed.path.lastIndexOf("/");
        if (index >= 0) {
          parsed.path = parsed.path.substring(0, index + 1);
        }
      }
      sourceURL = join(urlGenerate(parsed), sourceURL);
    }
    return normalize(sourceURL);
  }
  exports.computeSourceURL = computeSourceURL;
});

// ../../../node_modules/source-map-js/lib/array-set.js
var require_array_set = __commonJS((exports) => {
  var util = require_util();
  var has = Object.prototype.hasOwnProperty;
  var hasNativeMap = typeof Map !== "undefined";
  function ArraySet() {
    this._array = [];
    this._set = hasNativeMap ? new Map : Object.create(null);
  }
  ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    var set = new ArraySet;
    for (var i = 0, len = aArray.length;i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };
  ArraySet.prototype.size = function ArraySet_size() {
    return hasNativeMap ? this._set.size : Object.getOwnPropertyNames(this._set).length;
  };
  ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    var sStr = hasNativeMap ? aStr : util.toSetString(aStr);
    var isDuplicate = hasNativeMap ? this.has(aStr) : has.call(this._set, sStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      if (hasNativeMap) {
        this._set.set(aStr, idx);
      } else {
        this._set[sStr] = idx;
      }
    }
  };
  ArraySet.prototype.has = function ArraySet_has(aStr) {
    if (hasNativeMap) {
      return this._set.has(aStr);
    } else {
      var sStr = util.toSetString(aStr);
      return has.call(this._set, sStr);
    }
  };
  ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
    if (hasNativeMap) {
      var idx = this._set.get(aStr);
      if (idx >= 0) {
        return idx;
      }
    } else {
      var sStr = util.toSetString(aStr);
      if (has.call(this._set, sStr)) {
        return this._set[sStr];
      }
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };
  ArraySet.prototype.at = function ArraySet_at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error("No element indexed by " + aIdx);
  };
  ArraySet.prototype.toArray = function ArraySet_toArray() {
    return this._array.slice();
  };
  exports.ArraySet = ArraySet;
});

// ../../../node_modules/source-map-js/lib/mapping-list.js
var require_mapping_list = __commonJS((exports) => {
  var util = require_util();
  function generatedPositionAfter(mappingA, mappingB) {
    var lineA = mappingA.generatedLine;
    var lineB = mappingB.generatedLine;
    var columnA = mappingA.generatedColumn;
    var columnB = mappingB.generatedColumn;
    return lineB > lineA || lineB == lineA && columnB >= columnA || util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
  }
  function MappingList() {
    this._array = [];
    this._sorted = true;
    this._last = { generatedLine: -1, generatedColumn: 0 };
  }
  MappingList.prototype.unsortedForEach = function MappingList_forEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };
  MappingList.prototype.add = function MappingList_add(aMapping) {
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  };
  MappingList.prototype.toArray = function MappingList_toArray() {
    if (!this._sorted) {
      this._array.sort(util.compareByGeneratedPositionsInflated);
      this._sorted = true;
    }
    return this._array;
  };
  exports.MappingList = MappingList;
});

// ../../../packages/penpal/src/child.ts
var PENPAL_CHILD_CHANNEL = "PENPAL_CHILD";
// script/index.ts
var import_debounce2 = __toESM(require_debounce(), 1);

// ../../../node_modules/penpal/dist/penpal.mjs
var PenpalError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "PenpalError";
    this.code = code;
  }
};
var PenpalError_default = PenpalError;
var serializeError = (error) => ({
  name: error.name,
  message: error.message,
  stack: error.stack,
  penpalCode: error instanceof PenpalError_default ? error.code : undefined
});
var deserializeError = ({
  name,
  message,
  stack,
  penpalCode
}) => {
  const deserializedError = penpalCode ? new PenpalError_default(penpalCode, message) : new Error(message);
  deserializedError.name = name;
  deserializedError.stack = stack;
  return deserializedError;
};
var brand = Symbol("Reply");
var Reply = class {
  value;
  transferables;
  #brand = brand;
  constructor(value, options) {
    this.value = value;
    this.transferables = options?.transferables;
  }
};
var Reply_default = Reply;
var namespace_default = "penpal";
var isObject = (value) => {
  return typeof value === "object" && value !== null;
};
var isFunction = (value) => {
  return typeof value === "function";
};
var isMessage = (data) => {
  return isObject(data) && data.namespace === namespace_default;
};
var isSynMessage = (message) => {
  return message.type === "SYN";
};
var isAck1Message = (message) => {
  return message.type === "ACK1";
};
var isAck2Message = (message) => {
  return message.type === "ACK2";
};
var isCallMessage = (message) => {
  return message.type === "CALL";
};
var isReplyMessage = (message) => {
  return message.type === "REPLY";
};
var isDestroyMessage = (message) => {
  return message.type === "DESTROY";
};
var extractMethodPathsFromMethods = (methods, currentPath = []) => {
  const methodPaths = [];
  for (const key of Object.keys(methods)) {
    const value = methods[key];
    if (isFunction(value)) {
      methodPaths.push([...currentPath, key]);
    } else if (isObject(value)) {
      methodPaths.push(...extractMethodPathsFromMethods(value, [...currentPath, key]));
    }
  }
  return methodPaths;
};
var getMethodAtMethodPath = (methodPath, methods) => {
  const result = methodPath.reduce((acc, pathSegment) => {
    return isObject(acc) ? acc[pathSegment] : undefined;
  }, methods);
  return isFunction(result) ? result : undefined;
};
var formatMethodPath = (methodPath) => {
  return methodPath.join(".");
};
var createErrorReplyMessage = (channel, callId, error) => ({
  namespace: namespace_default,
  channel,
  type: "REPLY",
  callId,
  isError: true,
  ...error instanceof Error ? { value: serializeError(error), isSerializedErrorInstance: true } : { value: error }
});
var connectCallHandler = (messenger, methods, channel, log) => {
  let isDestroyed = false;
  const handleMessage = async (message) => {
    if (isDestroyed) {
      return;
    }
    if (!isCallMessage(message)) {
      return;
    }
    log?.(`Received ${formatMethodPath(message.methodPath)}() call`, message);
    const { methodPath, args, id: callId } = message;
    let replyMessage;
    let transferables;
    try {
      const method = getMethodAtMethodPath(methodPath, methods);
      if (!method) {
        throw new PenpalError_default("METHOD_NOT_FOUND", `Method \`${formatMethodPath(methodPath)}\` is not found.`);
      }
      let value = await method(...args);
      if (value instanceof Reply_default) {
        transferables = value.transferables;
        value = await value.value;
      }
      replyMessage = {
        namespace: namespace_default,
        channel,
        type: "REPLY",
        callId,
        value
      };
    } catch (error) {
      replyMessage = createErrorReplyMessage(channel, callId, error);
    }
    if (isDestroyed) {
      return;
    }
    try {
      log?.(`Sending ${formatMethodPath(methodPath)}() reply`, replyMessage);
      messenger.sendMessage(replyMessage, transferables);
    } catch (error) {
      if (error.name === "DataCloneError") {
        replyMessage = createErrorReplyMessage(channel, callId, error);
        log?.(`Sending ${formatMethodPath(methodPath)}() reply`, replyMessage);
        messenger.sendMessage(replyMessage);
      }
      throw error;
    }
  };
  messenger.addMessageHandler(handleMessage);
  return () => {
    isDestroyed = true;
    messenger.removeMessageHandler(handleMessage);
  };
};
var connectCallHandler_default = connectCallHandler;
var generateId_default = crypto.randomUUID?.bind(crypto) ?? (() => new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-"));
var brand2 = Symbol("CallOptions");
var CallOptions = class {
  transferables;
  timeout;
  #brand = brand2;
  constructor(options) {
    this.transferables = options?.transferables;
    this.timeout = options?.timeout;
  }
};
var CallOptions_default = CallOptions;
var methodsToTreatAsNative = /* @__PURE__ */ new Set(["apply", "call", "bind"]);
var createRemoteProxy = (callback, log, path = []) => {
  return new Proxy(path.length ? () => {} : /* @__PURE__ */ Object.create(null), {
    get(target, prop) {
      if (prop === "then") {
        return;
      }
      if (path.length && methodsToTreatAsNative.has(prop)) {
        return Reflect.get(target, prop);
      }
      return createRemoteProxy(callback, log, [...path, prop]);
    },
    apply(target, _thisArg, args) {
      return callback(path, args);
    }
  });
};
var getDestroyedConnectionMethodCallError = (methodPath) => {
  return new PenpalError_default("CONNECTION_DESTROYED", `Method call ${formatMethodPath(methodPath)}() failed due to destroyed connection`);
};
var connectRemoteProxy = (messenger, channel, log) => {
  let isDestroyed = false;
  const replyHandlers = /* @__PURE__ */ new Map;
  const handleMessage = (message) => {
    if (!isReplyMessage(message)) {
      return;
    }
    const { callId, value, isError, isSerializedErrorInstance } = message;
    const replyHandler = replyHandlers.get(callId);
    if (!replyHandler) {
      return;
    }
    replyHandlers.delete(callId);
    log?.(`Received ${formatMethodPath(replyHandler.methodPath)}() call`, message);
    if (isError) {
      replyHandler.reject(isSerializedErrorInstance ? deserializeError(value) : value);
    } else {
      replyHandler.resolve(value);
    }
  };
  messenger.addMessageHandler(handleMessage);
  const remoteProxy = createRemoteProxy((methodPath, args) => {
    if (isDestroyed) {
      throw getDestroyedConnectionMethodCallError(methodPath);
    }
    const callId = generateId_default();
    const lastArg = args[args.length - 1];
    const lastArgIsOptions = lastArg instanceof CallOptions_default;
    const { timeout, transferables } = lastArgIsOptions ? lastArg : {};
    const argsWithoutOptions = lastArgIsOptions ? args.slice(0, -1) : args;
    return new Promise((resolve, reject) => {
      const timeoutId = timeout !== undefined ? window.setTimeout(() => {
        replyHandlers.delete(callId);
        reject(new PenpalError_default("METHOD_CALL_TIMEOUT", `Method call ${formatMethodPath(methodPath)}() timed out after ${timeout}ms`));
      }, timeout) : undefined;
      replyHandlers.set(callId, { methodPath, resolve, reject, timeoutId });
      try {
        const callMessage = {
          namespace: namespace_default,
          channel,
          type: "CALL",
          id: callId,
          methodPath,
          args: argsWithoutOptions
        };
        log?.(`Sending ${formatMethodPath(methodPath)}() call`, callMessage);
        messenger.sendMessage(callMessage, transferables);
      } catch (error) {
        reject(new PenpalError_default("TRANSMISSION_FAILED", error.message));
      }
    });
  }, log);
  const destroy = () => {
    isDestroyed = true;
    messenger.removeMessageHandler(handleMessage);
    for (const { methodPath, reject, timeoutId } of replyHandlers.values()) {
      clearTimeout(timeoutId);
      reject(getDestroyedConnectionMethodCallError(methodPath));
    }
    replyHandlers.clear();
  };
  return {
    remoteProxy,
    destroy
  };
};
var connectRemoteProxy_default = connectRemoteProxy;
var getPromiseWithResolvers = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve,
    reject
  };
};
var getPromiseWithResolvers_default = getPromiseWithResolvers;
var PenpalBugError = class extends Error {
  constructor(message) {
    super(`You've hit a bug in Penpal. Please file an issue with the following information: ${message}`);
  }
};
var PenpalBugError_default = PenpalBugError;
var DEPRECATED_PENPAL_PARTICIPANT_ID = "deprecated-penpal";
var isDeprecatedMessage = (data) => {
  return isObject(data) && "penpal" in data;
};
var upgradeMethodPath = (methodPath) => methodPath.split(".");
var downgradeMethodPath = (methodPath) => methodPath.join(".");
var getUnexpectedMessageError = (message) => {
  return new PenpalBugError_default(`Unexpected message to translate: ${JSON.stringify(message)}`);
};
var upgradeMessage = (message) => {
  if (message.penpal === "syn") {
    return {
      namespace: namespace_default,
      channel: undefined,
      type: "SYN",
      participantId: DEPRECATED_PENPAL_PARTICIPANT_ID
    };
  }
  if (message.penpal === "ack") {
    return {
      namespace: namespace_default,
      channel: undefined,
      type: "ACK2"
    };
  }
  if (message.penpal === "call") {
    return {
      namespace: namespace_default,
      channel: undefined,
      type: "CALL",
      id: message.id,
      methodPath: upgradeMethodPath(message.methodName),
      args: message.args
    };
  }
  if (message.penpal === "reply") {
    if (message.resolution === "fulfilled") {
      return {
        namespace: namespace_default,
        channel: undefined,
        type: "REPLY",
        callId: message.id,
        value: message.returnValue
      };
    } else {
      return {
        namespace: namespace_default,
        channel: undefined,
        type: "REPLY",
        callId: message.id,
        isError: true,
        ...message.returnValueIsError ? {
          value: message.returnValue,
          isSerializedErrorInstance: true
        } : {
          value: message.returnValue
        }
      };
    }
  }
  throw getUnexpectedMessageError(message);
};
var downgradeMessage = (message) => {
  if (isAck1Message(message)) {
    return {
      penpal: "synAck",
      methodNames: message.methodPaths.map(downgradeMethodPath)
    };
  }
  if (isCallMessage(message)) {
    return {
      penpal: "call",
      id: message.id,
      methodName: downgradeMethodPath(message.methodPath),
      args: message.args
    };
  }
  if (isReplyMessage(message)) {
    if (message.isError) {
      return {
        penpal: "reply",
        id: message.callId,
        resolution: "rejected",
        ...message.isSerializedErrorInstance ? {
          returnValue: message.value,
          returnValueIsError: true
        } : { returnValue: message.value }
      };
    } else {
      return {
        penpal: "reply",
        id: message.callId,
        resolution: "fulfilled",
        returnValue: message.value
      };
    }
  }
  throw getUnexpectedMessageError(message);
};
var shakeHands = ({
  messenger,
  methods,
  timeout,
  channel,
  log
}) => {
  const participantId = generateId_default();
  let remoteParticipantId;
  const destroyHandlers = [];
  let isComplete = false;
  const methodPaths = extractMethodPathsFromMethods(methods);
  const { promise, resolve, reject } = getPromiseWithResolvers_default();
  const timeoutId = timeout !== undefined ? setTimeout(() => {
    reject(new PenpalError_default("CONNECTION_TIMEOUT", `Connection timed out after ${timeout}ms`));
  }, timeout) : undefined;
  const destroy = () => {
    for (const destroyHandler of destroyHandlers) {
      destroyHandler();
    }
  };
  const connectCallHandlerAndMethodProxies = () => {
    if (isComplete) {
      return;
    }
    destroyHandlers.push(connectCallHandler_default(messenger, methods, channel, log));
    const { remoteProxy, destroy: destroyMethodProxies } = connectRemoteProxy_default(messenger, channel, log);
    destroyHandlers.push(destroyMethodProxies);
    clearTimeout(timeoutId);
    isComplete = true;
    resolve({
      remoteProxy,
      destroy
    });
  };
  const sendSynMessage = () => {
    const synMessage = {
      namespace: namespace_default,
      type: "SYN",
      channel,
      participantId
    };
    log?.(`Sending handshake SYN`, synMessage);
    try {
      messenger.sendMessage(synMessage);
    } catch (error) {
      reject(new PenpalError_default("TRANSMISSION_FAILED", error.message));
    }
  };
  const handleSynMessage = (message) => {
    log?.(`Received handshake SYN`, message);
    if (message.participantId === remoteParticipantId && remoteParticipantId !== DEPRECATED_PENPAL_PARTICIPANT_ID) {
      return;
    }
    remoteParticipantId = message.participantId;
    sendSynMessage();
    const isHandshakeLeader = participantId > remoteParticipantId || remoteParticipantId === DEPRECATED_PENPAL_PARTICIPANT_ID;
    if (!isHandshakeLeader) {
      return;
    }
    const ack1Message = {
      namespace: namespace_default,
      channel,
      type: "ACK1",
      methodPaths
    };
    log?.(`Sending handshake ACK1`, ack1Message);
    try {
      messenger.sendMessage(ack1Message);
    } catch (error) {
      reject(new PenpalError_default("TRANSMISSION_FAILED", error.message));
      return;
    }
  };
  const handleAck1Message = (message) => {
    log?.(`Received handshake ACK1`, message);
    const ack2Message = {
      namespace: namespace_default,
      channel,
      type: "ACK2"
    };
    log?.(`Sending handshake ACK2`, ack2Message);
    try {
      messenger.sendMessage(ack2Message);
    } catch (error) {
      reject(new PenpalError_default("TRANSMISSION_FAILED", error.message));
      return;
    }
    connectCallHandlerAndMethodProxies();
  };
  const handleAck2Message = (message) => {
    log?.(`Received handshake ACK2`, message);
    connectCallHandlerAndMethodProxies();
  };
  const handleMessage = (message) => {
    if (isSynMessage(message)) {
      handleSynMessage(message);
    }
    if (isAck1Message(message)) {
      handleAck1Message(message);
    }
    if (isAck2Message(message)) {
      handleAck2Message(message);
    }
  };
  messenger.addMessageHandler(handleMessage);
  destroyHandlers.push(() => messenger.removeMessageHandler(handleMessage));
  sendSynMessage();
  return promise;
};
var shakeHands_default = shakeHands;
var once = (fn) => {
  let isCalled = false;
  let result;
  return (...args) => {
    if (!isCalled) {
      isCalled = true;
      result = fn(...args);
    }
    return result;
  };
};
var once_default = once;
var usedMessengers = /* @__PURE__ */ new WeakSet;
var connect = ({
  messenger,
  methods = {},
  timeout,
  channel,
  log
}) => {
  if (!messenger) {
    throw new PenpalError_default("INVALID_ARGUMENT", "messenger must be defined");
  }
  if (usedMessengers.has(messenger)) {
    throw new PenpalError_default("INVALID_ARGUMENT", "A messenger can only be used for a single connection");
  }
  usedMessengers.add(messenger);
  const connectionDestroyedHandlers = [messenger.destroy];
  const destroyConnection = once_default((notifyOtherParticipant) => {
    if (notifyOtherParticipant) {
      const destroyMessage = {
        namespace: namespace_default,
        channel,
        type: "DESTROY"
      };
      try {
        messenger.sendMessage(destroyMessage);
      } catch (_) {}
    }
    for (const connectionDestroyedHandler of connectionDestroyedHandlers) {
      connectionDestroyedHandler();
    }
    log?.("Connection destroyed");
  });
  const validateReceivedMessage = (data) => {
    return isMessage(data) && data.channel === channel;
  };
  const promise = (async () => {
    try {
      messenger.initialize({ log, validateReceivedMessage });
      messenger.addMessageHandler((message) => {
        if (isDestroyMessage(message)) {
          destroyConnection(false);
        }
      });
      const { remoteProxy, destroy } = await shakeHands_default({
        messenger,
        methods,
        timeout,
        channel,
        log
      });
      connectionDestroyedHandlers.push(destroy);
      return remoteProxy;
    } catch (error) {
      destroyConnection(true);
      throw error;
    }
  })();
  return {
    promise,
    destroy: () => {
      destroyConnection(true);
    }
  };
};
var connect_default = connect;
var WindowMessenger = class {
  #remoteWindow;
  #allowedOrigins;
  #log;
  #validateReceivedMessage;
  #concreteRemoteOrigin;
  #messageCallbacks = /* @__PURE__ */ new Set;
  #port;
  #isChildUsingDeprecatedProtocol = false;
  constructor({ remoteWindow, allowedOrigins }) {
    if (!remoteWindow) {
      throw new PenpalError_default("INVALID_ARGUMENT", "remoteWindow must be defined");
    }
    this.#remoteWindow = remoteWindow;
    this.#allowedOrigins = allowedOrigins?.length ? allowedOrigins : [window.origin];
  }
  initialize = ({
    log,
    validateReceivedMessage
  }) => {
    this.#log = log;
    this.#validateReceivedMessage = validateReceivedMessage;
    window.addEventListener("message", this.#handleMessageFromRemoteWindow);
  };
  sendMessage = (message, transferables) => {
    if (isSynMessage(message)) {
      const originForSending = this.#getOriginForSendingMessage(message);
      this.#remoteWindow.postMessage(message, {
        targetOrigin: originForSending,
        transfer: transferables
      });
      return;
    }
    if (isAck1Message(message) || this.#isChildUsingDeprecatedProtocol) {
      const payload = this.#isChildUsingDeprecatedProtocol ? downgradeMessage(message) : message;
      const originForSending = this.#getOriginForSendingMessage(message);
      this.#remoteWindow.postMessage(payload, {
        targetOrigin: originForSending,
        transfer: transferables
      });
      return;
    }
    if (isAck2Message(message)) {
      const { port1, port2 } = new MessageChannel;
      this.#port = port1;
      port1.addEventListener("message", this.#handleMessageFromPort);
      port1.start();
      const transferablesToSend = [port2, ...transferables || []];
      const originForSending = this.#getOriginForSendingMessage(message);
      this.#remoteWindow.postMessage(message, {
        targetOrigin: originForSending,
        transfer: transferablesToSend
      });
      return;
    }
    if (this.#port) {
      this.#port.postMessage(message, {
        transfer: transferables
      });
      return;
    }
    throw new PenpalBugError_default("Port is undefined");
  };
  addMessageHandler = (callback) => {
    this.#messageCallbacks.add(callback);
  };
  removeMessageHandler = (callback) => {
    this.#messageCallbacks.delete(callback);
  };
  destroy = () => {
    window.removeEventListener("message", this.#handleMessageFromRemoteWindow);
    this.#destroyPort();
    this.#messageCallbacks.clear();
  };
  #isAllowedOrigin = (origin) => {
    return this.#allowedOrigins.some((allowedOrigin) => allowedOrigin instanceof RegExp ? allowedOrigin.test(origin) : allowedOrigin === origin || allowedOrigin === "*");
  };
  #getOriginForSendingMessage = (message) => {
    if (isSynMessage(message)) {
      return "*";
    }
    if (!this.#concreteRemoteOrigin) {
      throw new PenpalBugError_default("Concrete remote origin not set");
    }
    return this.#concreteRemoteOrigin === "null" && this.#allowedOrigins.includes("*") ? "*" : this.#concreteRemoteOrigin;
  };
  #destroyPort = () => {
    this.#port?.removeEventListener("message", this.#handleMessageFromPort);
    this.#port?.close();
    this.#port = undefined;
  };
  #handleMessageFromRemoteWindow = ({
    source,
    origin,
    ports,
    data
  }) => {
    if (source !== this.#remoteWindow) {
      return;
    }
    if (isDeprecatedMessage(data)) {
      this.#log?.("Please upgrade the child window to the latest version of Penpal.");
      this.#isChildUsingDeprecatedProtocol = true;
      data = upgradeMessage(data);
    }
    if (!this.#validateReceivedMessage?.(data)) {
      return;
    }
    if (!this.#isAllowedOrigin(origin)) {
      this.#log?.(`Received a message from origin \`${origin}\` which did not match allowed origins \`[${this.#allowedOrigins.join(", ")}]\``);
      return;
    }
    if (isSynMessage(data)) {
      this.#destroyPort();
      this.#concreteRemoteOrigin = origin;
    }
    if (isAck2Message(data) && !this.#isChildUsingDeprecatedProtocol) {
      this.#port = ports[0];
      if (!this.#port) {
        throw new PenpalBugError_default("No port received on ACK2");
      }
      this.#port.addEventListener("message", this.#handleMessageFromPort);
      this.#port.start();
    }
    for (const callback of this.#messageCallbacks) {
      callback(data);
    }
  };
  #handleMessageFromPort = ({ data }) => {
    if (!this.#validateReceivedMessage?.(data)) {
      return;
    }
    for (const callback of this.#messageCallbacks) {
      callback(data);
    }
  };
};
var WindowMessenger_default = WindowMessenger;
var WorkerMessenger = class {
  #worker;
  #validateReceivedMessage;
  #messageCallbacks = /* @__PURE__ */ new Set;
  #port;
  constructor({ worker }) {
    if (!worker) {
      throw new PenpalError_default("INVALID_ARGUMENT", "worker must be defined");
    }
    this.#worker = worker;
  }
  initialize = ({ validateReceivedMessage }) => {
    this.#validateReceivedMessage = validateReceivedMessage;
    this.#worker.addEventListener("message", this.#handleMessage);
  };
  sendMessage = (message, transferables) => {
    if (isSynMessage(message) || isAck1Message(message)) {
      this.#worker.postMessage(message, { transfer: transferables });
      return;
    }
    if (isAck2Message(message)) {
      const { port1, port2 } = new MessageChannel;
      this.#port = port1;
      port1.addEventListener("message", this.#handleMessage);
      port1.start();
      this.#worker.postMessage(message, {
        transfer: [port2, ...transferables || []]
      });
      return;
    }
    if (this.#port) {
      this.#port.postMessage(message, {
        transfer: transferables
      });
      return;
    }
    throw new PenpalBugError_default("Port is undefined");
  };
  addMessageHandler = (callback) => {
    this.#messageCallbacks.add(callback);
  };
  removeMessageHandler = (callback) => {
    this.#messageCallbacks.delete(callback);
  };
  destroy = () => {
    this.#worker.removeEventListener("message", this.#handleMessage);
    this.#destroyPort();
    this.#messageCallbacks.clear();
  };
  #destroyPort = () => {
    this.#port?.removeEventListener("message", this.#handleMessage);
    this.#port?.close();
    this.#port = undefined;
  };
  #handleMessage = ({ ports, data }) => {
    if (!this.#validateReceivedMessage?.(data)) {
      return;
    }
    if (isSynMessage(data)) {
      this.#destroyPort();
    }
    if (isAck2Message(data)) {
      this.#port = ports[0];
      if (!this.#port) {
        throw new PenpalBugError_default("No port received on ACK2");
      }
      this.#port.addEventListener("message", this.#handleMessage);
      this.#port.start();
    }
    for (const callback of this.#messageCallbacks) {
      callback(data);
    }
  };
};
var PortMessenger = class {
  #port;
  #validateReceivedMessage;
  #messageCallbacks = /* @__PURE__ */ new Set;
  constructor({ port }) {
    if (!port) {
      throw new PenpalError_default("INVALID_ARGUMENT", "port must be defined");
    }
    this.#port = port;
  }
  initialize = ({ validateReceivedMessage }) => {
    this.#validateReceivedMessage = validateReceivedMessage;
    this.#port.addEventListener("message", this.#handleMessage);
    this.#port.start();
  };
  sendMessage = (message, transferables) => {
    this.#port?.postMessage(message, {
      transfer: transferables
    });
  };
  addMessageHandler = (callback) => {
    this.#messageCallbacks.add(callback);
  };
  removeMessageHandler = (callback) => {
    this.#messageCallbacks.delete(callback);
  };
  destroy = () => {
    this.#port.removeEventListener("message", this.#handleMessage);
    this.#port.close();
    this.#messageCallbacks.clear();
  };
  #handleMessage = ({ data }) => {
    if (!this.#validateReceivedMessage?.(data)) {
      return;
    }
    for (const callback of this.#messageCallbacks) {
      callback(data);
    }
  };
};
// ../../../packages/constants/src/dom.ts
var DOM_IGNORE_TAGS = ["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT"];
var INLINE_ONLY_CONTAINERS = new Set([
  "a",
  "abbr",
  "area",
  "audio",
  "b",
  "bdi",
  "bdo",
  "br",
  "button",
  "canvas",
  "cite",
  "code",
  "data",
  "datalist",
  "del",
  "dfn",
  "em",
  "embed",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "li",
  "map",
  "mark",
  "meter",
  "noscript",
  "object",
  "output",
  "p",
  "picture",
  "progress",
  "q",
  "ruby",
  "s",
  "samp",
  "script",
  "select",
  "slot",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "svg",
  "template",
  "textarea",
  "time",
  "u",
  "var",
  "video",
  "wbr"
]);
// ../../../packages/constants/src/editor.ts
var DefaultSettings = {
  SCALE: 0.7,
  PAN_POSITION: { x: 175, y: 100 },
  URL: "http://localhost:3000/",
  FRAME_POSITION: { x: 0, y: 0 },
  FRAME_DIMENSION: { width: 1536, height: 960 },
  ASPECT_RATIO_LOCKED: false,
  DEVICE: "Custom:Custom",
  THEME: "system" /* System */,
  ORIENTATION: "Portrait" /* Portrait */,
  MIN_DIMENSIONS: { width: "280px", height: "360px" },
  COMMANDS: {
    run: "bun run dev",
    build: "bun run build",
    install: "bun install"
  },
  IMAGE_FOLDER: "public/images",
  IMAGE_DIMENSION: { width: "100px", height: "100px" },
  FONT_FOLDER: "public/fonts",
  FONT_CONFIG: "app/fonts.ts",
  TAILWIND_CONFIG: "tailwind.config.ts",
  CHAT_SETTINGS: {
    showSuggestions: true,
    autoApplyCode: true,
    expandCodeBlocks: true,
    showMiniChat: true
  },
  EDITOR_SETTINGS: {
    shouldWarnDelete: true,
    enableBunReplace: true,
    buildFlags: "--no-lint"
  }
};
// ../../../packages/constants/src/language.ts
var LANGUAGE_DISPLAY_NAMES = {
  ["en" /* English */]: "English",
  ["ja" /* Japanese */]: "日本語",
  ["zh" /* Chinese */]: "中文",
  ["ko" /* Korean */]: "한국어"
};
// script/api/dom.ts
var import_debounce = __toESM(require_debounce(), 1);

// script/helpers/dom.ts
function getHtmlElement(domId) {
  return document.querySelector(`[${"data-odid" /* DATA_ONLOOK_DOM_ID */}="${domId}"]`);
}
function getDomIdSelector(domId, escape = false) {
  const selector = `[${"data-odid" /* DATA_ONLOOK_DOM_ID */}="${domId}"]`;
  if (!escape) {
    return selector;
  }
  return escapeSelector(selector);
}
function escapeSelector(selector) {
  return CSS.escape(selector);
}
function isValidHtmlElement(element) {
  return element && element instanceof Node && element.nodeType === Node.ELEMENT_NODE && !DOM_IGNORE_TAGS.includes(element.tagName) && !element.hasAttribute("data-onlook-ignore" /* DATA_ONLOOK_IGNORE */) && element.style.display !== "none";
}

// ../../../node_modules/nanoid/non-secure/index.js
var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
var nanoid = (size = 21) => {
  let id = "";
  let i = size | 0;
  while (i--) {
    id += urlAlphabet[Math.random() * 64 | 0];
  }
  return id;
};

// script/helpers/ids.ts
function getOrAssignDomId(node) {
  let domId = node.getAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */);
  if (!domId) {
    domId = `odid-${nanoid()}`;
    node.setAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */, domId);
  }
  return domId;
}
function getOid(node) {
  return node.getAttribute("data-oid" /* DATA_ONLOOK_ID */);
}
function getInstanceId(node) {
  return node.getAttribute("data-oiid" /* DATA_ONLOOK_INSTANCE_ID */);
}

// script/api/state.ts
function setFrameId(frameId) {
  window._onlookFrameId = frameId;
}
function getFrameId() {
  const frameId = window._onlookFrameId;
  if (!frameId) {
    console.warn("Frame id not found");
    penpalParent?.getFrameId().then((id) => {
      setFrameId(id);
    });
    return "";
  }
  return frameId;
}

// script/api/dom.ts
var processDebounced = import_debounce.default(async (root) => {
  const frameId = await getFrameId();
  if (!frameId) {
    console.warn("frameView id not found, skipping dom processing");
    return false;
  }
  const layerMap = buildLayerTree(root);
  if (!layerMap) {
    console.warn("Error building layer tree, root element is null");
    return false;
  }
  const rootDomId = root.getAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */);
  if (!rootDomId) {
    console.warn("Root dom id not found");
    return false;
  }
  const rootNode = layerMap.get(rootDomId);
  if (!rootNode) {
    console.warn("Root node not found");
    return false;
  }
  return true;
}, 500);
function processDom(root = document.body) {
  if (!getFrameId()) {
    console.warn("frameView id not found, skipping dom processing");
    return false;
  }
  processDebounced(root);
  return true;
}
function buildLayerTree(root) {
  if (!isValidHtmlElement(root)) {
    return null;
  }
  const layerMap = new Map;
  const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => isValidHtmlElement(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
  });
  const rootLayerNode = processNode(root);
  rootLayerNode.children = [];
  layerMap.set(rootLayerNode.domId, rootLayerNode);
  let currentNode = treeWalker.nextNode();
  while (currentNode) {
    const layerNode = processNode(currentNode);
    layerNode.children = [];
    const parentElement = currentNode.parentElement;
    if (parentElement) {
      const parentDomId = parentElement.getAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */);
      if (parentDomId) {
        layerNode.parent = parentDomId;
        const parentNode = layerMap.get(parentDomId);
        if (parentNode && parentNode.children) {
          parentNode.children.push(layerNode.domId);
        }
      }
    }
    layerMap.set(layerNode.domId, layerNode);
    currentNode = treeWalker.nextNode();
  }
  return layerMap;
}
function processNode(node) {
  const domId = getOrAssignDomId(node);
  const oid = getOid(node);
  const instanceId = getInstanceId(node);
  const textContent = Array.from(node.childNodes).map((node2) => node2.nodeType === Node.TEXT_NODE ? node2.textContent : "").join(" ").trim().slice(0, 500);
  const style = window.getComputedStyle(node);
  const component = node.getAttribute("data-ocname" /* DATA_ONLOOK_COMPONENT_NAME */);
  const layerNode = {
    domId,
    oid: oid || null,
    instanceId: instanceId || null,
    textContent: textContent || "",
    tagName: node.tagName.toLowerCase(),
    isVisible: style.visibility !== "hidden",
    component: component || null,
    frameId: getFrameId(),
    children: null,
    parent: null,
    dynamicType: null,
    coreElementType: null
  };
  return layerNode;
}

// script/helpers/assert.ts
function assertNever(n) {
  throw new Error(`Expected \`never\`, found: ${JSON.stringify(n)}`);
}
// script/helpers/clone.ts
var jsonClone = (obj) => JSON.parse(JSON.stringify(obj));
// script/api/elements/style.ts
function getStyles(element) {
  const computed = getElComputedStyle(element);
  const inline = getInlineStyles(element);
  const stylesheet = getStylesheetStyles(element);
  const defined = {
    width: "auto",
    height: "auto",
    ...inline,
    ...stylesheet
  };
  return {
    defined,
    computed
  };
}
function getComputedStyleByDomId(domId) {
  const element = getHtmlElement(domId);
  if (!element) {
    return {};
  }
  return getElComputedStyle(element);
}
function getElComputedStyle(element) {
  const computedStyle = jsonClone(window.getComputedStyle(element));
  return computedStyle;
}
function getInlineStyles(element) {
  const styles = {};
  const inlineStyles = parseCssText(element.style.cssText);
  Object.entries(inlineStyles).forEach(([prop, value]) => {
    styles[prop] = value;
  });
  return styles;
}
function getStylesheetStyles(element) {
  const styles = {};
  const sheets = document.styleSheets;
  for (let i = 0;i < sheets.length; i++) {
    let rules;
    const sheet = sheets[i];
    try {
      if (!sheet) {
        console.warn("Sheet is undefined");
        continue;
      }
      rules = Array.from(sheet.cssRules) || sheet.rules;
    } catch (e) {
      console.warn("Can't read the css rules of: " + sheet?.href, e);
      continue;
    }
    for (let j = 0;j < rules.length; j++) {
      try {
        const rule = rules[j];
        if (rule && element.matches(rule.selectorText)) {
          const ruleStyles = parseCssText(rule.style.cssText);
          Object.entries(ruleStyles).forEach(([prop, value]) => styles[prop] = value);
        }
      } catch (e) {
        console.warn("Error", e);
      }
    }
  }
  return styles;
}
function parseCssText(cssText) {
  const styles = {};
  cssText.split(";").forEach((style) => {
    style = style.trim();
    if (!style) {
      return;
    }
    const [property, ...values] = style.split(":");
    styles[property?.trim() ?? ""] = values.join(":").trim();
  });
  return styles;
}

// script/api/elements/helpers.ts
var getDeepElement = (x, y) => {
  const el = document.elementFromPoint(x, y);
  if (!el) {
    return;
  }
  const crawlShadows = (node) => {
    if (node?.shadowRoot) {
      const potential = node.shadowRoot.elementFromPoint(x, y);
      if (potential == node) {
        return node;
      } else if (potential?.shadowRoot) {
        return crawlShadows(potential);
      } else {
        return potential || node;
      }
    } else {
      return node;
    }
  };
  const nested_shadow = crawlShadows(el);
  return nested_shadow || el;
};
var getDomElement = (el, getStyle) => {
  const parent2 = el.parentElement;
  const parentDomElement = parent2 ? {
    domId: parent2.getAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */),
    frameId: getFrameId(),
    oid: parent2.getAttribute("data-oid" /* DATA_ONLOOK_ID */),
    instanceId: parent2.getAttribute("data-oiid" /* DATA_ONLOOK_INSTANCE_ID */),
    rect: parent2.getBoundingClientRect()
  } : null;
  const rect = el.getBoundingClientRect();
  const styles = getStyle ? getStyles(el) : null;
  const domElement = {
    domId: el.getAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */),
    oid: el.getAttribute("data-oid" /* DATA_ONLOOK_ID */),
    frameId: getFrameId(),
    instanceId: el.getAttribute("data-oiid" /* DATA_ONLOOK_INSTANCE_ID */),
    rect,
    tagName: el.tagName,
    parent: parentDomElement,
    styles
  };
  return domElement;
};
function restoreElementStyle(el) {
  try {
    const saved = el.getAttribute("data-onlook-drag-saved-style" /* DATA_ONLOOK_DRAG_SAVED_STYLE */);
    if (saved) {
      const style = JSON.parse(saved);
      for (const key in style) {
        el.style[key] = style[key];
      }
    }
  } catch (e) {
    console.warn("Error restoring style", e);
  }
}
function getElementLocation(targetEl) {
  const parent2 = targetEl.parentElement;
  if (!parent2) {
    return;
  }
  const location = {
    type: "index",
    targetDomId: parent2.getAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */),
    targetOid: getInstanceId(parent2) || getOid(parent2) || null,
    index: Array.from(targetEl.parentElement?.children || []).indexOf(targetEl),
    originalIndex: Array.from(targetEl.parentElement?.children || []).indexOf(targetEl)
  };
  return location;
}
var getImmediateTextContent = (el) => {
  const stringArr = Array.from(el.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent);
  if (stringArr.length === 0) {
    return;
  }
  return stringArr.join("");
};

// script/api/elements/index.ts
var getElementByDomId = (domId, getStyle) => {
  const el = getHtmlElement(domId) || document.body;
  return getDomElement(el, getStyle);
};
var getElementAtLoc = (x, y, getStyle) => {
  const el = getDeepElement2(x, y) || document.body;
  return getDomElement(el, getStyle);
};
var getDeepElement2 = (x, y) => {
  const el = document.elementFromPoint(x, y);
  if (!el) {
    return;
  }
  const crawlShadows = (node) => {
    if (node?.shadowRoot) {
      const potential = node.shadowRoot.elementFromPoint(x, y);
      if (potential == node) {
        return node;
      } else if (potential?.shadowRoot) {
        return crawlShadows(potential);
      } else {
        return potential || node;
      }
    } else {
      return node;
    }
  };
  const nested_shadow = crawlShadows(el);
  return nested_shadow || el;
};
var updateElementInstance = (domId, instanceId, component) => {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("Failed to updateElementInstanceId: Element not found");
    return;
  }
  el.setAttribute("data-oiid" /* DATA_ONLOOK_INSTANCE_ID */, instanceId);
  el.setAttribute("data-ocname" /* DATA_ONLOOK_COMPONENT_NAME */, component);
};
var getParentElement = (domId) => {
  const el = getHtmlElement(domId);
  if (!el?.parentElement) {
    return null;
  }
  return getDomElement(el.parentElement, false);
};
var getChildrenCount = (domId) => {
  const el = getHtmlElement(domId);
  if (!el) {
    return 0;
  }
  return el.children.length;
};
var getOffsetParent = (domId) => {
  const el = getHtmlElement(domId);
  if (!el) {
    return null;
  }
  return getDomElement(el.offsetParent, false);
};

// script/api/elements/dom/group.ts
function groupElements(parent2, container, children) {
  const parentEl = getHtmlElement(parent2.domId);
  if (!parentEl) {
    console.warn("Failed to find parent element", parent2.domId);
    return null;
  }
  const containerEl = createContainerElement(container);
  const childrenMap = new Set(children.map((c) => c.domId));
  const childrenWithIndices = Array.from(parentEl.children).map((child2, index) => ({
    element: child2,
    index,
    domId: getOrAssignDomId(child2)
  })).filter(({ domId }) => childrenMap.has(domId));
  if (childrenWithIndices.length === 0) {
    console.warn("No valid children found to group");
    return null;
  }
  const insertIndex = Math.min(...childrenWithIndices.map((c) => c.index));
  parentEl.insertBefore(containerEl, parentEl.children[insertIndex] ?? null);
  childrenWithIndices.forEach(({ element }) => {
    const newElement = element.cloneNode(true);
    newElement.setAttribute("data-onlook-inserted" /* DATA_ONLOOK_INSERTED */, "true");
    containerEl.appendChild(newElement);
    element.style.display = "none";
    removeIdsFromChildElement(element);
  });
  return getDomElement(containerEl, true);
}
function ungroupElements(parent2, container) {
  const parentEl = getHtmlElement(parent2.domId);
  if (!parentEl) {
    console.warn("Failed to find parent element", parent2.domId);
    return null;
  }
  const containerEl = Array.from(parentEl.children).find((child2) => child2.getAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */) === container.domId);
  if (!containerEl) {
    console.warn("Failed to find container element", parent2.domId);
    return null;
  }
  Array.from(containerEl.children).forEach((child2) => {
    child2.setAttribute("data-onlook-inserted" /* DATA_ONLOOK_INSERTED */, "true");
    parentEl.insertBefore(child2, containerEl);
  });
  containerEl.style.display = "none";
  return getDomElement(parentEl, true);
}
function createContainerElement(target) {
  const containerEl = document.createElement(target.tagName);
  Object.entries(target.attributes).forEach(([key, value]) => {
    containerEl.setAttribute(key, value);
  });
  containerEl.setAttribute("data-onlook-inserted" /* DATA_ONLOOK_INSERTED */, "true");
  containerEl.setAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */, target.domId);
  containerEl.setAttribute("data-oid" /* DATA_ONLOOK_ID */, target.oid);
  return containerEl;
}
function removeIdsFromChildElement(el) {
  el.removeAttribute("data-odid" /* DATA_ONLOOK_DOM_ID */);
  el.removeAttribute("data-oid" /* DATA_ONLOOK_ID */);
  el.removeAttribute("data-onlook-inserted" /* DATA_ONLOOK_INSERTED */);
  const children = Array.from(el.children);
  if (children.length === 0) {
    return;
  }
  children.forEach((child2) => {
    removeIdsFromChildElement(child2);
  });
}

// script/api/elements/dom/helpers.ts
function getActionElement(domId) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("Element not found for domId:", domId);
    return null;
  }
  return getActionElementFromHtmlElement(el);
}
function getActionElementFromHtmlElement(el) {
  const attributes = Array.from(el.attributes).reduce((acc, attr) => {
    acc[attr.name] = attr.value;
    return acc;
  }, {});
  const oid = getInstanceId(el) || getOid(el) || null;
  if (!oid) {
    console.warn("Element has no oid");
    return null;
  }
  return {
    oid,
    domId: getOrAssignDomId(el),
    tagName: el.tagName.toLowerCase(),
    children: Array.from(el.children).map((child2) => getActionElementFromHtmlElement(child2)).filter(Boolean),
    attributes,
    textContent: getImmediateTextContent(el) || null,
    styles: {}
  };
}
function getActionLocation(domId) {
  const el = getHtmlElement(domId);
  if (!el) {
    throw new Error("Element not found for domId: " + domId);
  }
  const parent2 = el.parentElement;
  if (!parent2) {
    throw new Error("Inserted element has no parent");
  }
  const targetOid = getInstanceId(parent2) || getOid(parent2);
  if (!targetOid) {
    console.warn("Parent element has no oid");
    return null;
  }
  const targetDomId = getOrAssignDomId(parent2);
  const index = Array.from(parent2.children).indexOf(el);
  if (index === -1) {
    return {
      type: "append",
      targetDomId,
      targetOid
    };
  }
  return {
    type: "index",
    targetDomId,
    targetOid,
    index,
    originalIndex: index
  };
}
function getElementType(domId) {
  const el = document.querySelector(`[${"data-odid" /* DATA_ONLOOK_DOM_ID */}="${domId}"]`);
  if (!el) {
    console.warn("No element found", { domId });
    return { dynamicType: null, coreType: null };
  }
  const dynamicType = el.getAttribute("data-onlook-dynamic-type" /* DATA_ONLOOK_DYNAMIC_TYPE */) || null;
  const coreType = el.getAttribute("data-onlook-core-element-type" /* DATA_ONLOOK_CORE_ELEMENT_TYPE */) || null;
  return { dynamicType, coreType };
}
function setElementType(domId, dynamicType, coreElementType) {
  const el = document.querySelector(`[${"data-odid" /* DATA_ONLOOK_DOM_ID */}="${domId}"]`);
  if (el) {
    if (dynamicType) {
      el.setAttribute("data-onlook-dynamic-type" /* DATA_ONLOOK_DYNAMIC_TYPE */, dynamicType);
    }
    if (coreElementType) {
      el.setAttribute("data-onlook-core-element-type" /* DATA_ONLOOK_CORE_ELEMENT_TYPE */, coreElementType);
    }
  }
}
function getFirstOnlookElement() {
  const body = document.body;
  const firstElement = body.querySelector(`[${"data-oid" /* DATA_ONLOOK_ID */}]`);
  if (firstElement) {
    return getDomElement(firstElement, true);
  }
  return null;
}

// ../../../node_modules/css-tree/lib/tokenizer/types.js
var EOF = 0;
var Ident = 1;
var Function2 = 2;
var AtKeyword = 3;
var Hash = 4;
var String2 = 5;
var BadString = 6;
var Url = 7;
var BadUrl = 8;
var Delim = 9;
var Number2 = 10;
var Percentage = 11;
var Dimension = 12;
var WhiteSpace = 13;
var CDO = 14;
var CDC = 15;
var Colon = 16;
var Semicolon = 17;
var Comma = 18;
var LeftSquareBracket = 19;
var RightSquareBracket = 20;
var LeftParenthesis = 21;
var RightParenthesis = 22;
var LeftCurlyBracket = 23;
var RightCurlyBracket = 24;
var Comment = 25;

// ../../../node_modules/css-tree/lib/tokenizer/char-code-definitions.js
var EOF2 = 0;
function isDigit(code) {
  return code >= 48 && code <= 57;
}
function isHexDigit(code) {
  return isDigit(code) || code >= 65 && code <= 70 || code >= 97 && code <= 102;
}
function isUppercaseLetter(code) {
  return code >= 65 && code <= 90;
}
function isLowercaseLetter(code) {
  return code >= 97 && code <= 122;
}
function isLetter(code) {
  return isUppercaseLetter(code) || isLowercaseLetter(code);
}
function isNonAscii(code) {
  return code >= 128;
}
function isNameStart(code) {
  return isLetter(code) || isNonAscii(code) || code === 95;
}
function isName(code) {
  return isNameStart(code) || isDigit(code) || code === 45;
}
function isNonPrintable(code) {
  return code >= 0 && code <= 8 || code === 11 || code >= 14 && code <= 31 || code === 127;
}
function isNewline(code) {
  return code === 10 || code === 13 || code === 12;
}
function isWhiteSpace(code) {
  return isNewline(code) || code === 32 || code === 9;
}
function isValidEscape(first, second) {
  if (first !== 92) {
    return false;
  }
  if (isNewline(second) || second === EOF2) {
    return false;
  }
  return true;
}
function isIdentifierStart(first, second, third) {
  if (first === 45) {
    return isNameStart(second) || second === 45 || isValidEscape(second, third);
  }
  if (isNameStart(first)) {
    return true;
  }
  if (first === 92) {
    return isValidEscape(first, second);
  }
  return false;
}
function isNumberStart(first, second, third) {
  if (first === 43 || first === 45) {
    if (isDigit(second)) {
      return 2;
    }
    return second === 46 && isDigit(third) ? 3 : 0;
  }
  if (first === 46) {
    return isDigit(second) ? 2 : 0;
  }
  if (isDigit(first)) {
    return 1;
  }
  return 0;
}
function isBOM(code) {
  if (code === 65279) {
    return 1;
  }
  if (code === 65534) {
    return 1;
  }
  return 0;
}
var CATEGORY = new Array(128);
var EofCategory = 128;
var WhiteSpaceCategory = 130;
var DigitCategory = 131;
var NameStartCategory = 132;
var NonPrintableCategory = 133;
for (let i = 0;i < CATEGORY.length; i++) {
  CATEGORY[i] = isWhiteSpace(i) && WhiteSpaceCategory || isDigit(i) && DigitCategory || isNameStart(i) && NameStartCategory || isNonPrintable(i) && NonPrintableCategory || i || EofCategory;
}
function charCodeCategory(code) {
  return code < 128 ? CATEGORY[code] : NameStartCategory;
}

// ../../../node_modules/css-tree/lib/tokenizer/utils.js
function getCharCode(source, offset) {
  return offset < source.length ? source.charCodeAt(offset) : 0;
}
function getNewlineLength(source, offset, code) {
  if (code === 13 && getCharCode(source, offset + 1) === 10) {
    return 2;
  }
  return 1;
}
function cmpChar(testStr, offset, referenceCode) {
  let code = testStr.charCodeAt(offset);
  if (isUppercaseLetter(code)) {
    code = code | 32;
  }
  return code === referenceCode;
}
function cmpStr(testStr, start, end, referenceStr) {
  if (end - start !== referenceStr.length) {
    return false;
  }
  if (start < 0 || end > testStr.length) {
    return false;
  }
  for (let i = start;i < end; i++) {
    const referenceCode = referenceStr.charCodeAt(i - start);
    let testCode = testStr.charCodeAt(i);
    if (isUppercaseLetter(testCode)) {
      testCode = testCode | 32;
    }
    if (testCode !== referenceCode) {
      return false;
    }
  }
  return true;
}
function findWhiteSpaceStart(source, offset) {
  for (;offset >= 0; offset--) {
    if (!isWhiteSpace(source.charCodeAt(offset))) {
      break;
    }
  }
  return offset + 1;
}
function findWhiteSpaceEnd(source, offset) {
  for (;offset < source.length; offset++) {
    if (!isWhiteSpace(source.charCodeAt(offset))) {
      break;
    }
  }
  return offset;
}
function findDecimalNumberEnd(source, offset) {
  for (;offset < source.length; offset++) {
    if (!isDigit(source.charCodeAt(offset))) {
      break;
    }
  }
  return offset;
}
function consumeEscaped(source, offset) {
  offset += 2;
  if (isHexDigit(getCharCode(source, offset - 1))) {
    for (const maxOffset = Math.min(source.length, offset + 5);offset < maxOffset; offset++) {
      if (!isHexDigit(getCharCode(source, offset))) {
        break;
      }
    }
    const code = getCharCode(source, offset);
    if (isWhiteSpace(code)) {
      offset += getNewlineLength(source, offset, code);
    }
  }
  return offset;
}
function consumeName(source, offset) {
  for (;offset < source.length; offset++) {
    const code = source.charCodeAt(offset);
    if (isName(code)) {
      continue;
    }
    if (isValidEscape(code, getCharCode(source, offset + 1))) {
      offset = consumeEscaped(source, offset) - 1;
      continue;
    }
    break;
  }
  return offset;
}
function consumeNumber(source, offset) {
  let code = source.charCodeAt(offset);
  if (code === 43 || code === 45) {
    code = source.charCodeAt(offset += 1);
  }
  if (isDigit(code)) {
    offset = findDecimalNumberEnd(source, offset + 1);
    code = source.charCodeAt(offset);
  }
  if (code === 46 && isDigit(source.charCodeAt(offset + 1))) {
    offset += 2;
    offset = findDecimalNumberEnd(source, offset);
  }
  if (cmpChar(source, offset, 101)) {
    let sign = 0;
    code = source.charCodeAt(offset + 1);
    if (code === 45 || code === 43) {
      sign = 1;
      code = source.charCodeAt(offset + 2);
    }
    if (isDigit(code)) {
      offset = findDecimalNumberEnd(source, offset + 1 + sign + 1);
    }
  }
  return offset;
}
function consumeBadUrlRemnants(source, offset) {
  for (;offset < source.length; offset++) {
    const code = source.charCodeAt(offset);
    if (code === 41) {
      offset++;
      break;
    }
    if (isValidEscape(code, getCharCode(source, offset + 1))) {
      offset = consumeEscaped(source, offset);
    }
  }
  return offset;
}
function decodeEscaped(escaped) {
  if (escaped.length === 1 && !isHexDigit(escaped.charCodeAt(0))) {
    return escaped[0];
  }
  let code = parseInt(escaped, 16);
  if (code === 0 || code >= 55296 && code <= 57343 || code > 1114111) {
    code = 65533;
  }
  return String.fromCodePoint(code);
}
// ../../../node_modules/css-tree/lib/tokenizer/names.js
var names_default = [
  "EOF-token",
  "ident-token",
  "function-token",
  "at-keyword-token",
  "hash-token",
  "string-token",
  "bad-string-token",
  "url-token",
  "bad-url-token",
  "delim-token",
  "number-token",
  "percentage-token",
  "dimension-token",
  "whitespace-token",
  "CDO-token",
  "CDC-token",
  "colon-token",
  "semicolon-token",
  "comma-token",
  "[-token",
  "]-token",
  "(-token",
  ")-token",
  "{-token",
  "}-token",
  "comment-token"
];
// ../../../node_modules/css-tree/lib/tokenizer/adopt-buffer.js
var MIN_SIZE = 16 * 1024;
function adoptBuffer(buffer = null, size) {
  if (buffer === null || buffer.length < size) {
    return new Uint32Array(Math.max(size + 1024, MIN_SIZE));
  }
  return buffer;
}

// ../../../node_modules/css-tree/lib/tokenizer/OffsetToLocation.js
var N = 10;
var F = 12;
var R = 13;
function computeLinesAndColumns(host) {
  const source = host.source;
  const sourceLength = source.length;
  const startOffset = source.length > 0 ? isBOM(source.charCodeAt(0)) : 0;
  const lines = adoptBuffer(host.lines, sourceLength);
  const columns = adoptBuffer(host.columns, sourceLength);
  let line = host.startLine;
  let column = host.startColumn;
  for (let i = startOffset;i < sourceLength; i++) {
    const code = source.charCodeAt(i);
    lines[i] = line;
    columns[i] = column++;
    if (code === N || code === R || code === F) {
      if (code === R && i + 1 < sourceLength && source.charCodeAt(i + 1) === N) {
        i++;
        lines[i] = line;
        columns[i] = column;
      }
      line++;
      column = 1;
    }
  }
  lines[sourceLength] = line;
  columns[sourceLength] = column;
  host.lines = lines;
  host.columns = columns;
  host.computed = true;
}

class OffsetToLocation {
  constructor(source, startOffset, startLine, startColumn) {
    this.setSource(source, startOffset, startLine, startColumn);
    this.lines = null;
    this.columns = null;
  }
  setSource(source = "", startOffset = 0, startLine = 1, startColumn = 1) {
    this.source = source;
    this.startOffset = startOffset;
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.computed = false;
  }
  getLocation(offset, filename) {
    if (!this.computed) {
      computeLinesAndColumns(this);
    }
    return {
      source: filename,
      offset: this.startOffset + offset,
      line: this.lines[offset],
      column: this.columns[offset]
    };
  }
  getLocationRange(start, end, filename) {
    if (!this.computed) {
      computeLinesAndColumns(this);
    }
    return {
      source: filename,
      start: {
        offset: this.startOffset + start,
        line: this.lines[start],
        column: this.columns[start]
      },
      end: {
        offset: this.startOffset + end,
        line: this.lines[end],
        column: this.columns[end]
      }
    };
  }
}
// ../../../node_modules/css-tree/lib/tokenizer/TokenStream.js
var OFFSET_MASK = 16777215;
var TYPE_SHIFT = 24;
var balancePair = new Uint8Array(32);
balancePair[Function2] = RightParenthesis;
balancePair[LeftParenthesis] = RightParenthesis;
balancePair[LeftSquareBracket] = RightSquareBracket;
balancePair[LeftCurlyBracket] = RightCurlyBracket;
function isBlockOpenerToken(tokenType) {
  return balancePair[tokenType] !== 0;
}

class TokenStream {
  constructor(source, tokenize) {
    this.setSource(source, tokenize);
  }
  reset() {
    this.eof = false;
    this.tokenIndex = -1;
    this.tokenType = 0;
    this.tokenStart = this.firstCharOffset;
    this.tokenEnd = this.firstCharOffset;
  }
  setSource(source = "", tokenize = () => {}) {
    source = String(source || "");
    const sourceLength = source.length;
    const offsetAndType = adoptBuffer(this.offsetAndType, source.length + 1);
    const balance = adoptBuffer(this.balance, source.length + 1);
    let tokenCount = 0;
    let firstCharOffset = -1;
    let balanceCloseType = 0;
    let balanceStart = source.length;
    this.offsetAndType = null;
    this.balance = null;
    balance.fill(0);
    tokenize(source, (type, start, end) => {
      const index = tokenCount++;
      offsetAndType[index] = type << TYPE_SHIFT | end;
      if (firstCharOffset === -1) {
        firstCharOffset = start;
      }
      balance[index] = balanceStart;
      if (type === balanceCloseType) {
        const prevBalanceStart = balance[balanceStart];
        balance[balanceStart] = index;
        balanceStart = prevBalanceStart;
        balanceCloseType = balancePair[offsetAndType[prevBalanceStart] >> TYPE_SHIFT];
      } else if (isBlockOpenerToken(type)) {
        balanceStart = index;
        balanceCloseType = balancePair[type];
      }
    });
    offsetAndType[tokenCount] = EOF << TYPE_SHIFT | sourceLength;
    balance[tokenCount] = tokenCount;
    for (let i = 0;i < tokenCount; i++) {
      const balanceStart2 = balance[i];
      if (balanceStart2 <= i) {
        const balanceEnd = balance[balanceStart2];
        if (balanceEnd !== i) {
          balance[i] = balanceEnd;
        }
      } else if (balanceStart2 > tokenCount) {
        balance[i] = tokenCount;
      }
    }
    this.source = source;
    this.firstCharOffset = firstCharOffset === -1 ? 0 : firstCharOffset;
    this.tokenCount = tokenCount;
    this.offsetAndType = offsetAndType;
    this.balance = balance;
    this.reset();
    this.next();
  }
  lookupType(offset) {
    offset += this.tokenIndex;
    if (offset < this.tokenCount) {
      return this.offsetAndType[offset] >> TYPE_SHIFT;
    }
    return EOF;
  }
  lookupTypeNonSC(idx) {
    for (let offset = this.tokenIndex;offset < this.tokenCount; offset++) {
      const tokenType = this.offsetAndType[offset] >> TYPE_SHIFT;
      if (tokenType !== WhiteSpace && tokenType !== Comment) {
        if (idx-- === 0) {
          return tokenType;
        }
      }
    }
    return EOF;
  }
  lookupOffset(offset) {
    offset += this.tokenIndex;
    if (offset < this.tokenCount) {
      return this.offsetAndType[offset - 1] & OFFSET_MASK;
    }
    return this.source.length;
  }
  lookupOffsetNonSC(idx) {
    for (let offset = this.tokenIndex;offset < this.tokenCount; offset++) {
      const tokenType = this.offsetAndType[offset] >> TYPE_SHIFT;
      if (tokenType !== WhiteSpace && tokenType !== Comment) {
        if (idx-- === 0) {
          return offset - this.tokenIndex;
        }
      }
    }
    return EOF;
  }
  lookupValue(offset, referenceStr) {
    offset += this.tokenIndex;
    if (offset < this.tokenCount) {
      return cmpStr(this.source, this.offsetAndType[offset - 1] & OFFSET_MASK, this.offsetAndType[offset] & OFFSET_MASK, referenceStr);
    }
    return false;
  }
  getTokenStart(tokenIndex) {
    if (tokenIndex === this.tokenIndex) {
      return this.tokenStart;
    }
    if (tokenIndex > 0) {
      return tokenIndex < this.tokenCount ? this.offsetAndType[tokenIndex - 1] & OFFSET_MASK : this.offsetAndType[this.tokenCount] & OFFSET_MASK;
    }
    return this.firstCharOffset;
  }
  substrToCursor(start) {
    return this.source.substring(start, this.tokenStart);
  }
  isBalanceEdge(pos) {
    return this.balance[this.tokenIndex] < pos;
  }
  isDelim(code, offset) {
    if (offset) {
      return this.lookupType(offset) === Delim && this.source.charCodeAt(this.lookupOffset(offset)) === code;
    }
    return this.tokenType === Delim && this.source.charCodeAt(this.tokenStart) === code;
  }
  skip(tokenCount) {
    let next = this.tokenIndex + tokenCount;
    if (next < this.tokenCount) {
      this.tokenIndex = next;
      this.tokenStart = this.offsetAndType[next - 1] & OFFSET_MASK;
      next = this.offsetAndType[next];
      this.tokenType = next >> TYPE_SHIFT;
      this.tokenEnd = next & OFFSET_MASK;
    } else {
      this.tokenIndex = this.tokenCount;
      this.next();
    }
  }
  next() {
    let next = this.tokenIndex + 1;
    if (next < this.tokenCount) {
      this.tokenIndex = next;
      this.tokenStart = this.tokenEnd;
      next = this.offsetAndType[next];
      this.tokenType = next >> TYPE_SHIFT;
      this.tokenEnd = next & OFFSET_MASK;
    } else {
      this.eof = true;
      this.tokenIndex = this.tokenCount;
      this.tokenType = EOF;
      this.tokenStart = this.tokenEnd = this.source.length;
    }
  }
  skipSC() {
    while (this.tokenType === WhiteSpace || this.tokenType === Comment) {
      this.next();
    }
  }
  skipUntilBalanced(startToken, stopConsume) {
    let cursor = startToken;
    let balanceEnd = 0;
    let offset = 0;
    loop:
      for (;cursor < this.tokenCount; cursor++) {
        balanceEnd = this.balance[cursor];
        if (balanceEnd < startToken) {
          break loop;
        }
        offset = cursor > 0 ? this.offsetAndType[cursor - 1] & OFFSET_MASK : this.firstCharOffset;
        switch (stopConsume(this.source.charCodeAt(offset))) {
          case 1:
            break loop;
          case 2:
            cursor++;
            break loop;
          default:
            if (isBlockOpenerToken(this.offsetAndType[cursor] >> TYPE_SHIFT)) {
              cursor = balanceEnd;
            }
        }
      }
    this.skip(cursor - this.tokenIndex);
  }
  forEachToken(fn) {
    for (let i = 0, offset = this.firstCharOffset;i < this.tokenCount; i++) {
      const start = offset;
      const item = this.offsetAndType[i];
      const end = item & OFFSET_MASK;
      const type = item >> TYPE_SHIFT;
      offset = end;
      fn(type, start, end, i);
    }
  }
  dump() {
    const tokens = new Array(this.tokenCount);
    this.forEachToken((type, start, end, index) => {
      tokens[index] = {
        idx: index,
        type: names_default[type],
        chunk: this.source.substring(start, end),
        balance: this.balance[index]
      };
    });
    return tokens;
  }
}

// ../../../node_modules/css-tree/lib/tokenizer/index.js
function tokenize(source, onToken) {
  function getCharCode2(offset2) {
    return offset2 < sourceLength ? source.charCodeAt(offset2) : 0;
  }
  function consumeNumericToken() {
    offset = consumeNumber(source, offset);
    if (isIdentifierStart(getCharCode2(offset), getCharCode2(offset + 1), getCharCode2(offset + 2))) {
      type = Dimension;
      offset = consumeName(source, offset);
      return;
    }
    if (getCharCode2(offset) === 37) {
      type = Percentage;
      offset++;
      return;
    }
    type = Number2;
  }
  function consumeIdentLikeToken() {
    const nameStartOffset = offset;
    offset = consumeName(source, offset);
    if (cmpStr(source, nameStartOffset, offset, "url") && getCharCode2(offset) === 40) {
      offset = findWhiteSpaceEnd(source, offset + 1);
      if (getCharCode2(offset) === 34 || getCharCode2(offset) === 39) {
        type = Function2;
        offset = nameStartOffset + 4;
        return;
      }
      consumeUrlToken();
      return;
    }
    if (getCharCode2(offset) === 40) {
      type = Function2;
      offset++;
      return;
    }
    type = Ident;
  }
  function consumeStringToken(endingCodePoint) {
    if (!endingCodePoint) {
      endingCodePoint = getCharCode2(offset++);
    }
    type = String2;
    for (;offset < source.length; offset++) {
      const code = source.charCodeAt(offset);
      switch (charCodeCategory(code)) {
        case endingCodePoint:
          offset++;
          return;
        case WhiteSpaceCategory:
          if (isNewline(code)) {
            offset += getNewlineLength(source, offset, code);
            type = BadString;
            return;
          }
          break;
        case 92:
          if (offset === source.length - 1) {
            break;
          }
          const nextCode = getCharCode2(offset + 1);
          if (isNewline(nextCode)) {
            offset += getNewlineLength(source, offset + 1, nextCode);
          } else if (isValidEscape(code, nextCode)) {
            offset = consumeEscaped(source, offset) - 1;
          }
          break;
      }
    }
  }
  function consumeUrlToken() {
    type = Url;
    offset = findWhiteSpaceEnd(source, offset);
    for (;offset < source.length; offset++) {
      const code = source.charCodeAt(offset);
      switch (charCodeCategory(code)) {
        case 41:
          offset++;
          return;
        case WhiteSpaceCategory:
          offset = findWhiteSpaceEnd(source, offset);
          if (getCharCode2(offset) === 41 || offset >= source.length) {
            if (offset < source.length) {
              offset++;
            }
            return;
          }
          offset = consumeBadUrlRemnants(source, offset);
          type = BadUrl;
          return;
        case 34:
        case 39:
        case 40:
        case NonPrintableCategory:
          offset = consumeBadUrlRemnants(source, offset);
          type = BadUrl;
          return;
        case 92:
          if (isValidEscape(code, getCharCode2(offset + 1))) {
            offset = consumeEscaped(source, offset) - 1;
            break;
          }
          offset = consumeBadUrlRemnants(source, offset);
          type = BadUrl;
          return;
      }
    }
  }
  source = String(source || "");
  const sourceLength = source.length;
  let start = isBOM(getCharCode2(0));
  let offset = start;
  let type;
  while (offset < sourceLength) {
    const code = source.charCodeAt(offset);
    switch (charCodeCategory(code)) {
      case WhiteSpaceCategory:
        type = WhiteSpace;
        offset = findWhiteSpaceEnd(source, offset + 1);
        break;
      case 34:
        consumeStringToken();
        break;
      case 35:
        if (isName(getCharCode2(offset + 1)) || isValidEscape(getCharCode2(offset + 1), getCharCode2(offset + 2))) {
          type = Hash;
          offset = consumeName(source, offset + 1);
        } else {
          type = Delim;
          offset++;
        }
        break;
      case 39:
        consumeStringToken();
        break;
      case 40:
        type = LeftParenthesis;
        offset++;
        break;
      case 41:
        type = RightParenthesis;
        offset++;
        break;
      case 43:
        if (isNumberStart(code, getCharCode2(offset + 1), getCharCode2(offset + 2))) {
          consumeNumericToken();
        } else {
          type = Delim;
          offset++;
        }
        break;
      case 44:
        type = Comma;
        offset++;
        break;
      case 45:
        if (isNumberStart(code, getCharCode2(offset + 1), getCharCode2(offset + 2))) {
          consumeNumericToken();
        } else {
          if (getCharCode2(offset + 1) === 45 && getCharCode2(offset + 2) === 62) {
            type = CDC;
            offset = offset + 3;
          } else {
            if (isIdentifierStart(code, getCharCode2(offset + 1), getCharCode2(offset + 2))) {
              consumeIdentLikeToken();
            } else {
              type = Delim;
              offset++;
            }
          }
        }
        break;
      case 46:
        if (isNumberStart(code, getCharCode2(offset + 1), getCharCode2(offset + 2))) {
          consumeNumericToken();
        } else {
          type = Delim;
          offset++;
        }
        break;
      case 47:
        if (getCharCode2(offset + 1) === 42) {
          type = Comment;
          offset = source.indexOf("*/", offset + 2);
          offset = offset === -1 ? source.length : offset + 2;
        } else {
          type = Delim;
          offset++;
        }
        break;
      case 58:
        type = Colon;
        offset++;
        break;
      case 59:
        type = Semicolon;
        offset++;
        break;
      case 60:
        if (getCharCode2(offset + 1) === 33 && getCharCode2(offset + 2) === 45 && getCharCode2(offset + 3) === 45) {
          type = CDO;
          offset = offset + 4;
        } else {
          type = Delim;
          offset++;
        }
        break;
      case 64:
        if (isIdentifierStart(getCharCode2(offset + 1), getCharCode2(offset + 2), getCharCode2(offset + 3))) {
          type = AtKeyword;
          offset = consumeName(source, offset + 1);
        } else {
          type = Delim;
          offset++;
        }
        break;
      case 91:
        type = LeftSquareBracket;
        offset++;
        break;
      case 92:
        if (isValidEscape(code, getCharCode2(offset + 1))) {
          consumeIdentLikeToken();
        } else {
          type = Delim;
          offset++;
        }
        break;
      case 93:
        type = RightSquareBracket;
        offset++;
        break;
      case 123:
        type = LeftCurlyBracket;
        offset++;
        break;
      case 125:
        type = RightCurlyBracket;
        offset++;
        break;
      case DigitCategory:
        consumeNumericToken();
        break;
      case NameStartCategory:
        consumeIdentLikeToken();
        break;
      default:
        type = Delim;
        offset++;
    }
    onToken(type, start, start = offset);
  }
}

// ../../../node_modules/css-tree/lib/utils/List.js
var releasedCursors = null;

class List {
  static createItem(data) {
    return {
      prev: null,
      next: null,
      data
    };
  }
  constructor() {
    this.head = null;
    this.tail = null;
    this.cursor = null;
  }
  createItem(data) {
    return List.createItem(data);
  }
  allocateCursor(prev, next) {
    let cursor;
    if (releasedCursors !== null) {
      cursor = releasedCursors;
      releasedCursors = releasedCursors.cursor;
      cursor.prev = prev;
      cursor.next = next;
      cursor.cursor = this.cursor;
    } else {
      cursor = {
        prev,
        next,
        cursor: this.cursor
      };
    }
    this.cursor = cursor;
    return cursor;
  }
  releaseCursor() {
    const { cursor } = this;
    this.cursor = cursor.cursor;
    cursor.prev = null;
    cursor.next = null;
    cursor.cursor = releasedCursors;
    releasedCursors = cursor;
  }
  updateCursors(prevOld, prevNew, nextOld, nextNew) {
    let { cursor } = this;
    while (cursor !== null) {
      if (cursor.prev === prevOld) {
        cursor.prev = prevNew;
      }
      if (cursor.next === nextOld) {
        cursor.next = nextNew;
      }
      cursor = cursor.cursor;
    }
  }
  *[Symbol.iterator]() {
    for (let cursor = this.head;cursor !== null; cursor = cursor.next) {
      yield cursor.data;
    }
  }
  get size() {
    let size = 0;
    for (let cursor = this.head;cursor !== null; cursor = cursor.next) {
      size++;
    }
    return size;
  }
  get isEmpty() {
    return this.head === null;
  }
  get first() {
    return this.head && this.head.data;
  }
  get last() {
    return this.tail && this.tail.data;
  }
  fromArray(array) {
    let cursor = null;
    this.head = null;
    for (let data of array) {
      const item = List.createItem(data);
      if (cursor !== null) {
        cursor.next = item;
      } else {
        this.head = item;
      }
      item.prev = cursor;
      cursor = item;
    }
    this.tail = cursor;
    return this;
  }
  toArray() {
    return [...this];
  }
  toJSON() {
    return [...this];
  }
  forEach(fn, thisArg = this) {
    const cursor = this.allocateCursor(null, this.head);
    while (cursor.next !== null) {
      const item = cursor.next;
      cursor.next = item.next;
      fn.call(thisArg, item.data, item, this);
    }
    this.releaseCursor();
  }
  forEachRight(fn, thisArg = this) {
    const cursor = this.allocateCursor(this.tail, null);
    while (cursor.prev !== null) {
      const item = cursor.prev;
      cursor.prev = item.prev;
      fn.call(thisArg, item.data, item, this);
    }
    this.releaseCursor();
  }
  reduce(fn, initialValue, thisArg = this) {
    let cursor = this.allocateCursor(null, this.head);
    let acc = initialValue;
    let item;
    while (cursor.next !== null) {
      item = cursor.next;
      cursor.next = item.next;
      acc = fn.call(thisArg, acc, item.data, item, this);
    }
    this.releaseCursor();
    return acc;
  }
  reduceRight(fn, initialValue, thisArg = this) {
    let cursor = this.allocateCursor(this.tail, null);
    let acc = initialValue;
    let item;
    while (cursor.prev !== null) {
      item = cursor.prev;
      cursor.prev = item.prev;
      acc = fn.call(thisArg, acc, item.data, item, this);
    }
    this.releaseCursor();
    return acc;
  }
  some(fn, thisArg = this) {
    for (let cursor = this.head;cursor !== null; cursor = cursor.next) {
      if (fn.call(thisArg, cursor.data, cursor, this)) {
        return true;
      }
    }
    return false;
  }
  map(fn, thisArg = this) {
    const result = new List;
    for (let cursor = this.head;cursor !== null; cursor = cursor.next) {
      result.appendData(fn.call(thisArg, cursor.data, cursor, this));
    }
    return result;
  }
  filter(fn, thisArg = this) {
    const result = new List;
    for (let cursor = this.head;cursor !== null; cursor = cursor.next) {
      if (fn.call(thisArg, cursor.data, cursor, this)) {
        result.appendData(cursor.data);
      }
    }
    return result;
  }
  nextUntil(start, fn, thisArg = this) {
    if (start === null) {
      return;
    }
    const cursor = this.allocateCursor(null, start);
    while (cursor.next !== null) {
      const item = cursor.next;
      cursor.next = item.next;
      if (fn.call(thisArg, item.data, item, this)) {
        break;
      }
    }
    this.releaseCursor();
  }
  prevUntil(start, fn, thisArg = this) {
    if (start === null) {
      return;
    }
    const cursor = this.allocateCursor(start, null);
    while (cursor.prev !== null) {
      const item = cursor.prev;
      cursor.prev = item.prev;
      if (fn.call(thisArg, item.data, item, this)) {
        break;
      }
    }
    this.releaseCursor();
  }
  clear() {
    this.head = null;
    this.tail = null;
  }
  copy() {
    const result = new List;
    for (let data of this) {
      result.appendData(data);
    }
    return result;
  }
  prepend(item) {
    this.updateCursors(null, item, this.head, item);
    if (this.head !== null) {
      this.head.prev = item;
      item.next = this.head;
    } else {
      this.tail = item;
    }
    this.head = item;
    return this;
  }
  prependData(data) {
    return this.prepend(List.createItem(data));
  }
  append(item) {
    return this.insert(item);
  }
  appendData(data) {
    return this.insert(List.createItem(data));
  }
  insert(item, before = null) {
    if (before !== null) {
      this.updateCursors(before.prev, item, before, item);
      if (before.prev === null) {
        if (this.head !== before) {
          throw new Error("before doesn't belong to list");
        }
        this.head = item;
        before.prev = item;
        item.next = before;
        this.updateCursors(null, item);
      } else {
        before.prev.next = item;
        item.prev = before.prev;
        before.prev = item;
        item.next = before;
      }
    } else {
      this.updateCursors(this.tail, item, null, item);
      if (this.tail !== null) {
        this.tail.next = item;
        item.prev = this.tail;
      } else {
        this.head = item;
      }
      this.tail = item;
    }
    return this;
  }
  insertData(data, before) {
    return this.insert(List.createItem(data), before);
  }
  remove(item) {
    this.updateCursors(item, item.prev, item, item.next);
    if (item.prev !== null) {
      item.prev.next = item.next;
    } else {
      if (this.head !== item) {
        throw new Error("item doesn't belong to list");
      }
      this.head = item.next;
    }
    if (item.next !== null) {
      item.next.prev = item.prev;
    } else {
      if (this.tail !== item) {
        throw new Error("item doesn't belong to list");
      }
      this.tail = item.prev;
    }
    item.prev = null;
    item.next = null;
    return item;
  }
  push(data) {
    this.insert(List.createItem(data));
  }
  pop() {
    return this.tail !== null ? this.remove(this.tail) : null;
  }
  unshift(data) {
    this.prepend(List.createItem(data));
  }
  shift() {
    return this.head !== null ? this.remove(this.head) : null;
  }
  prependList(list) {
    return this.insertList(list, this.head);
  }
  appendList(list) {
    return this.insertList(list);
  }
  insertList(list, before) {
    if (list.head === null) {
      return this;
    }
    if (before !== undefined && before !== null) {
      this.updateCursors(before.prev, list.tail, before, list.head);
      if (before.prev !== null) {
        before.prev.next = list.head;
        list.head.prev = before.prev;
      } else {
        this.head = list.head;
      }
      before.prev = list.tail;
      list.tail.next = before;
    } else {
      this.updateCursors(this.tail, list.tail, null, list.head);
      if (this.tail !== null) {
        this.tail.next = list.head;
        list.head.prev = this.tail;
      } else {
        this.head = list.head;
      }
      this.tail = list.tail;
    }
    list.head = null;
    list.tail = null;
    return this;
  }
  replace(oldItem, newItemOrList) {
    if ("head" in newItemOrList) {
      this.insertList(newItemOrList, oldItem);
    } else {
      this.insert(newItemOrList, oldItem);
    }
    this.remove(oldItem);
  }
}

// ../../../node_modules/css-tree/lib/utils/create-custom-error.js
function createCustomError(name, message) {
  const error = Object.create(SyntaxError.prototype);
  const errorStack = new Error;
  return Object.assign(error, {
    name,
    message,
    get stack() {
      return (errorStack.stack || "").replace(/^(.+\n){1,3}/, `${name}: ${message}
`);
    }
  });
}

// ../../../node_modules/css-tree/lib/parser/SyntaxError.js
var MAX_LINE_LENGTH = 100;
var OFFSET_CORRECTION = 60;
var TAB_REPLACEMENT = "    ";
function sourceFragment({ source, line, column, baseLine, baseColumn }, extraLines) {
  function processLines(start, end) {
    return lines.slice(start, end).map((line2, idx) => String(start + idx + 1).padStart(maxNumLength) + " |" + line2).join(`
`);
  }
  const prelines = `
`.repeat(Math.max(baseLine - 1, 0));
  const precolumns = " ".repeat(Math.max(baseColumn - 1, 0));
  const lines = (prelines + precolumns + source).split(/\r\n?|\n|\f/);
  const startLine = Math.max(1, line - extraLines) - 1;
  const endLine = Math.min(line + extraLines, lines.length + 1);
  const maxNumLength = Math.max(4, String(endLine).length) + 1;
  let cutLeft = 0;
  column += (TAB_REPLACEMENT.length - 1) * (lines[line - 1].substr(0, column - 1).match(/\t/g) || []).length;
  if (column > MAX_LINE_LENGTH) {
    cutLeft = column - OFFSET_CORRECTION + 3;
    column = OFFSET_CORRECTION - 2;
  }
  for (let i = startLine;i <= endLine; i++) {
    if (i >= 0 && i < lines.length) {
      lines[i] = lines[i].replace(/\t/g, TAB_REPLACEMENT);
      lines[i] = (cutLeft > 0 && lines[i].length > cutLeft ? "…" : "") + lines[i].substr(cutLeft, MAX_LINE_LENGTH - 2) + (lines[i].length > cutLeft + MAX_LINE_LENGTH - 1 ? "…" : "");
    }
  }
  return [
    processLines(startLine, line),
    new Array(column + maxNumLength + 2).join("-") + "^",
    processLines(line, endLine)
  ].filter(Boolean).join(`
`).replace(/^(\s+\d+\s+\|\n)+/, "").replace(/\n(\s+\d+\s+\|)+$/, "");
}
function SyntaxError2(message, source, offset, line, column, baseLine = 1, baseColumn = 1) {
  const error = Object.assign(createCustomError("SyntaxError", message), {
    source,
    offset,
    line,
    column,
    sourceFragment(extraLines) {
      return sourceFragment({ source, line, column, baseLine, baseColumn }, isNaN(extraLines) ? 0 : extraLines);
    },
    get formattedMessage() {
      return `Parse error: ${message}
` + sourceFragment({ source, line, column, baseLine, baseColumn }, 2);
    }
  });
  return error;
}

// ../../../node_modules/css-tree/lib/parser/sequence.js
function readSequence(recognizer) {
  const children = this.createList();
  let space = false;
  const context = {
    recognizer
  };
  while (!this.eof) {
    switch (this.tokenType) {
      case Comment:
        this.next();
        continue;
      case WhiteSpace:
        space = true;
        this.next();
        continue;
    }
    let child2 = recognizer.getNode.call(this, context);
    if (child2 === undefined) {
      break;
    }
    if (space) {
      if (recognizer.onWhiteSpace) {
        recognizer.onWhiteSpace.call(this, child2, children, context);
      }
      space = false;
    }
    children.push(child2);
  }
  if (space && recognizer.onWhiteSpace) {
    recognizer.onWhiteSpace.call(this, null, children, context);
  }
  return children;
}

// ../../../node_modules/css-tree/lib/parser/create.js
var NOOP = () => {};
var EXCLAMATIONMARK = 33;
var NUMBERSIGN = 35;
var SEMICOLON = 59;
var LEFTCURLYBRACKET = 123;
var NULL = 0;
function createParseContext(name) {
  return function() {
    return this[name]();
  };
}
function fetchParseValues(dict) {
  const result = Object.create(null);
  for (const name of Object.keys(dict)) {
    const item = dict[name];
    const fn = item.parse || item;
    if (fn) {
      result[name] = fn;
    }
  }
  return result;
}
function processConfig(config) {
  const parseConfig = {
    context: Object.create(null),
    features: Object.assign(Object.create(null), config.features),
    scope: Object.assign(Object.create(null), config.scope),
    atrule: fetchParseValues(config.atrule),
    pseudo: fetchParseValues(config.pseudo),
    node: fetchParseValues(config.node)
  };
  for (const [name, context] of Object.entries(config.parseContext)) {
    switch (typeof context) {
      case "function":
        parseConfig.context[name] = context;
        break;
      case "string":
        parseConfig.context[name] = createParseContext(context);
        break;
    }
  }
  return {
    config: parseConfig,
    ...parseConfig,
    ...parseConfig.node
  };
}
function createParser(config) {
  let source = "";
  let filename = "<unknown>";
  let needPositions = false;
  let onParseError = NOOP;
  let onParseErrorThrow = false;
  const locationMap = new OffsetToLocation;
  const parser = Object.assign(new TokenStream, processConfig(config || {}), {
    parseAtrulePrelude: true,
    parseRulePrelude: true,
    parseValue: true,
    parseCustomProperty: false,
    readSequence,
    consumeUntilBalanceEnd: () => 0,
    consumeUntilLeftCurlyBracket(code) {
      return code === LEFTCURLYBRACKET ? 1 : 0;
    },
    consumeUntilLeftCurlyBracketOrSemicolon(code) {
      return code === LEFTCURLYBRACKET || code === SEMICOLON ? 1 : 0;
    },
    consumeUntilExclamationMarkOrSemicolon(code) {
      return code === EXCLAMATIONMARK || code === SEMICOLON ? 1 : 0;
    },
    consumeUntilSemicolonIncluded(code) {
      return code === SEMICOLON ? 2 : 0;
    },
    createList() {
      return new List;
    },
    createSingleNodeList(node) {
      return new List().appendData(node);
    },
    getFirstListNode(list) {
      return list && list.first;
    },
    getLastListNode(list) {
      return list && list.last;
    },
    parseWithFallback(consumer, fallback) {
      const startIndex = this.tokenIndex;
      try {
        return consumer.call(this);
      } catch (e) {
        if (onParseErrorThrow) {
          throw e;
        }
        this.skip(startIndex - this.tokenIndex);
        const fallbackNode = fallback.call(this);
        onParseErrorThrow = true;
        onParseError(e, fallbackNode);
        onParseErrorThrow = false;
        return fallbackNode;
      }
    },
    lookupNonWSType(offset) {
      let type;
      do {
        type = this.lookupType(offset++);
        if (type !== WhiteSpace && type !== Comment) {
          return type;
        }
      } while (type !== NULL);
      return NULL;
    },
    charCodeAt(offset) {
      return offset >= 0 && offset < source.length ? source.charCodeAt(offset) : 0;
    },
    substring(offsetStart, offsetEnd) {
      return source.substring(offsetStart, offsetEnd);
    },
    substrToCursor(start) {
      return this.source.substring(start, this.tokenStart);
    },
    cmpChar(offset, charCode) {
      return cmpChar(source, offset, charCode);
    },
    cmpStr(offsetStart, offsetEnd, str) {
      return cmpStr(source, offsetStart, offsetEnd, str);
    },
    consume(tokenType) {
      const start = this.tokenStart;
      this.eat(tokenType);
      return this.substrToCursor(start);
    },
    consumeFunctionName() {
      const name = source.substring(this.tokenStart, this.tokenEnd - 1);
      this.eat(Function2);
      return name;
    },
    consumeNumber(type) {
      const number = source.substring(this.tokenStart, consumeNumber(source, this.tokenStart));
      this.eat(type);
      return number;
    },
    eat(tokenType) {
      if (this.tokenType !== tokenType) {
        const tokenName = names_default[tokenType].slice(0, -6).replace(/-/g, " ").replace(/^./, (m) => m.toUpperCase());
        let message = `${/[[\](){}]/.test(tokenName) ? `"${tokenName}"` : tokenName} is expected`;
        let offset = this.tokenStart;
        switch (tokenType) {
          case Ident:
            if (this.tokenType === Function2 || this.tokenType === Url) {
              offset = this.tokenEnd - 1;
              message = "Identifier is expected but function found";
            } else {
              message = "Identifier is expected";
            }
            break;
          case Hash:
            if (this.isDelim(NUMBERSIGN)) {
              this.next();
              offset++;
              message = "Name is expected";
            }
            break;
          case Percentage:
            if (this.tokenType === Number2) {
              offset = this.tokenEnd;
              message = "Percent sign is expected";
            }
            break;
        }
        this.error(message, offset);
      }
      this.next();
    },
    eatIdent(name) {
      if (this.tokenType !== Ident || this.lookupValue(0, name) === false) {
        this.error(`Identifier "${name}" is expected`);
      }
      this.next();
    },
    eatDelim(code) {
      if (!this.isDelim(code)) {
        this.error(`Delim "${String.fromCharCode(code)}" is expected`);
      }
      this.next();
    },
    getLocation(start, end) {
      if (needPositions) {
        return locationMap.getLocationRange(start, end, filename);
      }
      return null;
    },
    getLocationFromList(list) {
      if (needPositions) {
        const head = this.getFirstListNode(list);
        const tail = this.getLastListNode(list);
        return locationMap.getLocationRange(head !== null ? head.loc.start.offset - locationMap.startOffset : this.tokenStart, tail !== null ? tail.loc.end.offset - locationMap.startOffset : this.tokenStart, filename);
      }
      return null;
    },
    error(message, offset) {
      const location = typeof offset !== "undefined" && offset < source.length ? locationMap.getLocation(offset) : this.eof ? locationMap.getLocation(findWhiteSpaceStart(source, source.length - 1)) : locationMap.getLocation(this.tokenStart);
      throw new SyntaxError2(message || "Unexpected input", source, location.offset, location.line, location.column, locationMap.startLine, locationMap.startColumn);
    }
  });
  const parse = function(source_, options) {
    source = source_;
    options = options || {};
    parser.setSource(source, tokenize);
    locationMap.setSource(source, options.offset, options.line, options.column);
    filename = options.filename || "<unknown>";
    needPositions = Boolean(options.positions);
    onParseError = typeof options.onParseError === "function" ? options.onParseError : NOOP;
    onParseErrorThrow = false;
    parser.parseAtrulePrelude = "parseAtrulePrelude" in options ? Boolean(options.parseAtrulePrelude) : true;
    parser.parseRulePrelude = "parseRulePrelude" in options ? Boolean(options.parseRulePrelude) : true;
    parser.parseValue = "parseValue" in options ? Boolean(options.parseValue) : true;
    parser.parseCustomProperty = "parseCustomProperty" in options ? Boolean(options.parseCustomProperty) : false;
    const { context = "default", onComment } = options;
    if (context in parser.context === false) {
      throw new Error("Unknown context `" + context + "`");
    }
    if (typeof onComment === "function") {
      parser.forEachToken((type, start, end) => {
        if (type === Comment) {
          const loc = parser.getLocation(start, end);
          const value = cmpStr(source, end - 2, end, "*/") ? source.slice(start + 2, end - 2) : source.slice(start + 2, end);
          onComment(value, loc);
        }
      });
    }
    const ast = parser.context[context].call(parser, options);
    if (!parser.eof) {
      parser.error();
    }
    return ast;
  };
  return Object.assign(parse, {
    SyntaxError: SyntaxError2,
    config: parser.config
  });
}

// ../../../node_modules/source-map-js/lib/source-map-generator.js
var base64VLQ = require_base64_vlq();
var util = require_util();
var ArraySet = require_array_set().ArraySet;
var MappingList = require_mapping_list().MappingList;
function SourceMapGenerator(aArgs) {
  if (!aArgs) {
    aArgs = {};
  }
  this._file = util.getArg(aArgs, "file", null);
  this._sourceRoot = util.getArg(aArgs, "sourceRoot", null);
  this._skipValidation = util.getArg(aArgs, "skipValidation", false);
  this._ignoreInvalidMapping = util.getArg(aArgs, "ignoreInvalidMapping", false);
  this._sources = new ArraySet;
  this._names = new ArraySet;
  this._mappings = new MappingList;
  this._sourcesContents = null;
}
SourceMapGenerator.prototype._version = 3;
SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer, generatorOps) {
  var sourceRoot = aSourceMapConsumer.sourceRoot;
  var generator = new SourceMapGenerator(Object.assign(generatorOps || {}, {
    file: aSourceMapConsumer.file,
    sourceRoot
  }));
  aSourceMapConsumer.eachMapping(function(mapping) {
    var newMapping = {
      generated: {
        line: mapping.generatedLine,
        column: mapping.generatedColumn
      }
    };
    if (mapping.source != null) {
      newMapping.source = mapping.source;
      if (sourceRoot != null) {
        newMapping.source = util.relative(sourceRoot, newMapping.source);
      }
      newMapping.original = {
        line: mapping.originalLine,
        column: mapping.originalColumn
      };
      if (mapping.name != null) {
        newMapping.name = mapping.name;
      }
    }
    generator.addMapping(newMapping);
  });
  aSourceMapConsumer.sources.forEach(function(sourceFile) {
    var sourceRelative = sourceFile;
    if (sourceRoot !== null) {
      sourceRelative = util.relative(sourceRoot, sourceFile);
    }
    if (!generator._sources.has(sourceRelative)) {
      generator._sources.add(sourceRelative);
    }
    var content = aSourceMapConsumer.sourceContentFor(sourceFile);
    if (content != null) {
      generator.setSourceContent(sourceFile, content);
    }
  });
  return generator;
};
SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
  var generated = util.getArg(aArgs, "generated");
  var original = util.getArg(aArgs, "original", null);
  var source = util.getArg(aArgs, "source", null);
  var name = util.getArg(aArgs, "name", null);
  if (!this._skipValidation) {
    if (this._validateMapping(generated, original, source, name) === false) {
      return;
    }
  }
  if (source != null) {
    source = String(source);
    if (!this._sources.has(source)) {
      this._sources.add(source);
    }
  }
  if (name != null) {
    name = String(name);
    if (!this._names.has(name)) {
      this._names.add(name);
    }
  }
  this._mappings.add({
    generatedLine: generated.line,
    generatedColumn: generated.column,
    originalLine: original != null && original.line,
    originalColumn: original != null && original.column,
    source,
    name
  });
};
SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
  var source = aSourceFile;
  if (this._sourceRoot != null) {
    source = util.relative(this._sourceRoot, source);
  }
  if (aSourceContent != null) {
    if (!this._sourcesContents) {
      this._sourcesContents = Object.create(null);
    }
    this._sourcesContents[util.toSetString(source)] = aSourceContent;
  } else if (this._sourcesContents) {
    delete this._sourcesContents[util.toSetString(source)];
    if (Object.keys(this._sourcesContents).length === 0) {
      this._sourcesContents = null;
    }
  }
};
SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
  var sourceFile = aSourceFile;
  if (aSourceFile == null) {
    if (aSourceMapConsumer.file == null) {
      throw new Error("SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, " + `or the source map's "file" property. Both were omitted.`);
    }
    sourceFile = aSourceMapConsumer.file;
  }
  var sourceRoot = this._sourceRoot;
  if (sourceRoot != null) {
    sourceFile = util.relative(sourceRoot, sourceFile);
  }
  var newSources = new ArraySet;
  var newNames = new ArraySet;
  this._mappings.unsortedForEach(function(mapping) {
    if (mapping.source === sourceFile && mapping.originalLine != null) {
      var original = aSourceMapConsumer.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn
      });
      if (original.source != null) {
        mapping.source = original.source;
        if (aSourceMapPath != null) {
          mapping.source = util.join(aSourceMapPath, mapping.source);
        }
        if (sourceRoot != null) {
          mapping.source = util.relative(sourceRoot, mapping.source);
        }
        mapping.originalLine = original.line;
        mapping.originalColumn = original.column;
        if (original.name != null) {
          mapping.name = original.name;
        }
      }
    }
    var source = mapping.source;
    if (source != null && !newSources.has(source)) {
      newSources.add(source);
    }
    var name = mapping.name;
    if (name != null && !newNames.has(name)) {
      newNames.add(name);
    }
  }, this);
  this._sources = newSources;
  this._names = newNames;
  aSourceMapConsumer.sources.forEach(function(sourceFile2) {
    var content = aSourceMapConsumer.sourceContentFor(sourceFile2);
    if (content != null) {
      if (aSourceMapPath != null) {
        sourceFile2 = util.join(aSourceMapPath, sourceFile2);
      }
      if (sourceRoot != null) {
        sourceFile2 = util.relative(sourceRoot, sourceFile2);
      }
      this.setSourceContent(sourceFile2, content);
    }
  }, this);
};
SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
  if (aOriginal && typeof aOriginal.line !== "number" && typeof aOriginal.column !== "number") {
    var message = "original.line and original.column are not numbers -- you probably meant to omit " + "the original mapping entirely and only map the generated position. If so, pass " + "null for the original mapping instead of an object with empty or null values.";
    if (this._ignoreInvalidMapping) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(message);
      }
      return false;
    } else {
      throw new Error(message);
    }
  }
  if (aGenerated && "line" in aGenerated && "column" in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
    return;
  } else if (aGenerated && "line" in aGenerated && "column" in aGenerated && aOriginal && "line" in aOriginal && "column" in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
    return;
  } else {
    var message = "Invalid mapping: " + JSON.stringify({
      generated: aGenerated,
      source: aSource,
      original: aOriginal,
      name: aName
    });
    if (this._ignoreInvalidMapping) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(message);
      }
      return false;
    } else {
      throw new Error(message);
    }
  }
};
SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
  var previousGeneratedColumn = 0;
  var previousGeneratedLine = 1;
  var previousOriginalColumn = 0;
  var previousOriginalLine = 0;
  var previousName = 0;
  var previousSource = 0;
  var result = "";
  var next;
  var mapping;
  var nameIdx;
  var sourceIdx;
  var mappings = this._mappings.toArray();
  for (var i = 0, len = mappings.length;i < len; i++) {
    mapping = mappings[i];
    next = "";
    if (mapping.generatedLine !== previousGeneratedLine) {
      previousGeneratedColumn = 0;
      while (mapping.generatedLine !== previousGeneratedLine) {
        next += ";";
        previousGeneratedLine++;
      }
    } else {
      if (i > 0) {
        if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
          continue;
        }
        next += ",";
      }
    }
    next += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
    previousGeneratedColumn = mapping.generatedColumn;
    if (mapping.source != null) {
      sourceIdx = this._sources.indexOf(mapping.source);
      next += base64VLQ.encode(sourceIdx - previousSource);
      previousSource = sourceIdx;
      next += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
      previousOriginalLine = mapping.originalLine - 1;
      next += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
      previousOriginalColumn = mapping.originalColumn;
      if (mapping.name != null) {
        nameIdx = this._names.indexOf(mapping.name);
        next += base64VLQ.encode(nameIdx - previousName);
        previousName = nameIdx;
      }
    }
    result += next;
  }
  return result;
};
SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
  return aSources.map(function(source) {
    if (!this._sourcesContents) {
      return null;
    }
    if (aSourceRoot != null) {
      source = util.relative(aSourceRoot, source);
    }
    var key = util.toSetString(source);
    return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
  }, this);
};
SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
  var map = {
    version: this._version,
    sources: this._sources.toArray(),
    names: this._names.toArray(),
    mappings: this._serializeMappings()
  };
  if (this._file != null) {
    map.file = this._file;
  }
  if (this._sourceRoot != null) {
    map.sourceRoot = this._sourceRoot;
  }
  if (this._sourcesContents) {
    map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
  }
  return map;
};
SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
  return JSON.stringify(this.toJSON());
};
var $SourceMapGenerator = SourceMapGenerator;

// ../../../node_modules/css-tree/lib/generator/sourceMap.js
var trackNodes = new Set(["Atrule", "Selector", "Declaration"]);
function generateSourceMap(handlers) {
  const map = new $SourceMapGenerator;
  const generated = {
    line: 1,
    column: 0
  };
  const original = {
    line: 0,
    column: 0
  };
  const activatedGenerated = {
    line: 1,
    column: 0
  };
  const activatedMapping = {
    generated: activatedGenerated
  };
  let line = 1;
  let column = 0;
  let sourceMappingActive = false;
  const origHandlersNode = handlers.node;
  handlers.node = function(node) {
    if (node.loc && node.loc.start && trackNodes.has(node.type)) {
      const nodeLine = node.loc.start.line;
      const nodeColumn = node.loc.start.column - 1;
      if (original.line !== nodeLine || original.column !== nodeColumn) {
        original.line = nodeLine;
        original.column = nodeColumn;
        generated.line = line;
        generated.column = column;
        if (sourceMappingActive) {
          sourceMappingActive = false;
          if (generated.line !== activatedGenerated.line || generated.column !== activatedGenerated.column) {
            map.addMapping(activatedMapping);
          }
        }
        sourceMappingActive = true;
        map.addMapping({
          source: node.loc.source,
          original,
          generated
        });
      }
    }
    origHandlersNode.call(this, node);
    if (sourceMappingActive && trackNodes.has(node.type)) {
      activatedGenerated.line = line;
      activatedGenerated.column = column;
    }
  };
  const origHandlersEmit = handlers.emit;
  handlers.emit = function(value, type, auto) {
    for (let i = 0;i < value.length; i++) {
      if (value.charCodeAt(i) === 10) {
        line++;
        column = 0;
      } else {
        column++;
      }
    }
    origHandlersEmit(value, type, auto);
  };
  const origHandlersResult = handlers.result;
  handlers.result = function() {
    if (sourceMappingActive) {
      map.addMapping(activatedMapping);
    }
    return {
      css: origHandlersResult(),
      map
    };
  };
  return handlers;
}

// ../../../node_modules/css-tree/lib/generator/token-before.js
var exports_token_before = {};
__export(exports_token_before, {
  spec: () => spec,
  safe: () => safe
});
var PLUSSIGN = 43;
var HYPHENMINUS = 45;
var code = (type, value) => {
  if (type === Delim) {
    type = value;
  }
  if (typeof type === "string") {
    const charCode = type.charCodeAt(0);
    return charCode > 127 ? 32768 : charCode << 8;
  }
  return type;
};
var specPairs = [
  [Ident, Ident],
  [Ident, Function2],
  [Ident, Url],
  [Ident, BadUrl],
  [Ident, "-"],
  [Ident, Number2],
  [Ident, Percentage],
  [Ident, Dimension],
  [Ident, CDC],
  [Ident, LeftParenthesis],
  [AtKeyword, Ident],
  [AtKeyword, Function2],
  [AtKeyword, Url],
  [AtKeyword, BadUrl],
  [AtKeyword, "-"],
  [AtKeyword, Number2],
  [AtKeyword, Percentage],
  [AtKeyword, Dimension],
  [AtKeyword, CDC],
  [Hash, Ident],
  [Hash, Function2],
  [Hash, Url],
  [Hash, BadUrl],
  [Hash, "-"],
  [Hash, Number2],
  [Hash, Percentage],
  [Hash, Dimension],
  [Hash, CDC],
  [Dimension, Ident],
  [Dimension, Function2],
  [Dimension, Url],
  [Dimension, BadUrl],
  [Dimension, "-"],
  [Dimension, Number2],
  [Dimension, Percentage],
  [Dimension, Dimension],
  [Dimension, CDC],
  ["#", Ident],
  ["#", Function2],
  ["#", Url],
  ["#", BadUrl],
  ["#", "-"],
  ["#", Number2],
  ["#", Percentage],
  ["#", Dimension],
  ["#", CDC],
  ["-", Ident],
  ["-", Function2],
  ["-", Url],
  ["-", BadUrl],
  ["-", "-"],
  ["-", Number2],
  ["-", Percentage],
  ["-", Dimension],
  ["-", CDC],
  [Number2, Ident],
  [Number2, Function2],
  [Number2, Url],
  [Number2, BadUrl],
  [Number2, Number2],
  [Number2, Percentage],
  [Number2, Dimension],
  [Number2, "%"],
  [Number2, CDC],
  ["@", Ident],
  ["@", Function2],
  ["@", Url],
  ["@", BadUrl],
  ["@", "-"],
  ["@", CDC],
  [".", Number2],
  [".", Percentage],
  [".", Dimension],
  ["+", Number2],
  ["+", Percentage],
  ["+", Dimension],
  ["/", "*"]
];
var safePairs = specPairs.concat([
  [Ident, Hash],
  [Dimension, Hash],
  [Hash, Hash],
  [AtKeyword, LeftParenthesis],
  [AtKeyword, String2],
  [AtKeyword, Colon],
  [Percentage, Percentage],
  [Percentage, Dimension],
  [Percentage, Function2],
  [Percentage, "-"],
  [RightParenthesis, Ident],
  [RightParenthesis, Function2],
  [RightParenthesis, Percentage],
  [RightParenthesis, Dimension],
  [RightParenthesis, Hash],
  [RightParenthesis, "-"]
]);
function createMap(pairs) {
  const isWhiteSpaceRequired = new Set(pairs.map(([prev, next]) => code(prev) << 16 | code(next)));
  return function(prevCode, type, value) {
    const nextCode = code(type, value);
    const nextCharCode = value.charCodeAt(0);
    const emitWs = nextCharCode === HYPHENMINUS && type !== Ident && type !== Function2 && type !== CDC || nextCharCode === PLUSSIGN ? isWhiteSpaceRequired.has(prevCode << 16 | nextCharCode << 8) : isWhiteSpaceRequired.has(prevCode << 16 | nextCode);
    if (emitWs) {
      this.emit(" ", WhiteSpace, true);
    }
    return nextCode;
  };
}
var spec = createMap(specPairs);
var safe = createMap(safePairs);

// ../../../node_modules/css-tree/lib/generator/create.js
var REVERSESOLIDUS = 92;
function processChildren(node, delimeter) {
  if (typeof delimeter === "function") {
    let prev = null;
    node.children.forEach((node2) => {
      if (prev !== null) {
        delimeter.call(this, prev);
      }
      this.node(node2);
      prev = node2;
    });
    return;
  }
  node.children.forEach(this.node, this);
}
function processChunk(chunk) {
  tokenize(chunk, (type, start, end) => {
    this.token(type, chunk.slice(start, end));
  });
}
function createGenerator(config) {
  const types2 = new Map;
  for (let [name, item] of Object.entries(config.node)) {
    const fn = item.generate || item;
    if (typeof fn === "function") {
      types2.set(name, item.generate || item);
    }
  }
  return function(node, options) {
    let buffer = "";
    let prevCode = 0;
    let handlers = {
      node(node2) {
        if (types2.has(node2.type)) {
          types2.get(node2.type).call(publicApi, node2);
        } else {
          throw new Error("Unknown node type: " + node2.type);
        }
      },
      tokenBefore: safe,
      token(type, value) {
        prevCode = this.tokenBefore(prevCode, type, value);
        this.emit(value, type, false);
        if (type === Delim && value.charCodeAt(0) === REVERSESOLIDUS) {
          this.emit(`
`, WhiteSpace, true);
        }
      },
      emit(value) {
        buffer += value;
      },
      result() {
        return buffer;
      }
    };
    if (options) {
      if (typeof options.decorator === "function") {
        handlers = options.decorator(handlers);
      }
      if (options.sourceMap) {
        handlers = generateSourceMap(handlers);
      }
      if (options.mode in exports_token_before) {
        handlers.tokenBefore = exports_token_before[options.mode];
      }
    }
    const publicApi = {
      node: (node2) => handlers.node(node2),
      children: processChildren,
      token: (type, value) => handlers.token(type, value),
      tokenize: processChunk
    };
    handlers.node(node);
    return handlers.result();
  };
}

// ../../../node_modules/css-tree/lib/convertor/create.js
function createConvertor(walk) {
  return {
    fromPlainObject(ast) {
      walk(ast, {
        enter(node) {
          if (node.children && node.children instanceof List === false) {
            node.children = new List().fromArray(node.children);
          }
        }
      });
      return ast;
    },
    toPlainObject(ast) {
      walk(ast, {
        leave(node) {
          if (node.children && node.children instanceof List) {
            node.children = node.children.toArray();
          }
        }
      });
      return ast;
    }
  };
}

// ../../../node_modules/css-tree/lib/walker/create.js
var { hasOwnProperty: hasOwnProperty2 } = Object.prototype;
var noop = function() {};
function ensureFunction(value) {
  return typeof value === "function" ? value : noop;
}
function invokeForType(fn, type) {
  return function(node, item, list) {
    if (node.type === type) {
      fn.call(this, node, item, list);
    }
  };
}
function getWalkersFromStructure(name, nodeType) {
  const structure = nodeType.structure;
  const walkers = [];
  for (const key in structure) {
    if (hasOwnProperty2.call(structure, key) === false) {
      continue;
    }
    let fieldTypes = structure[key];
    const walker = {
      name: key,
      type: false,
      nullable: false
    };
    if (!Array.isArray(fieldTypes)) {
      fieldTypes = [fieldTypes];
    }
    for (const fieldType of fieldTypes) {
      if (fieldType === null) {
        walker.nullable = true;
      } else if (typeof fieldType === "string") {
        walker.type = "node";
      } else if (Array.isArray(fieldType)) {
        walker.type = "list";
      }
    }
    if (walker.type) {
      walkers.push(walker);
    }
  }
  if (walkers.length) {
    return {
      context: nodeType.walkContext,
      fields: walkers
    };
  }
  return null;
}
function getTypesFromConfig(config) {
  const types2 = {};
  for (const name in config.node) {
    if (hasOwnProperty2.call(config.node, name)) {
      const nodeType = config.node[name];
      if (!nodeType.structure) {
        throw new Error("Missed `structure` field in `" + name + "` node type definition");
      }
      types2[name] = getWalkersFromStructure(name, nodeType);
    }
  }
  return types2;
}
function createTypeIterator(config, reverse) {
  const fields = config.fields.slice();
  const contextName = config.context;
  const useContext = typeof contextName === "string";
  if (reverse) {
    fields.reverse();
  }
  return function(node, context, walk, walkReducer) {
    let prevContextValue;
    if (useContext) {
      prevContextValue = context[contextName];
      context[contextName] = node;
    }
    for (const field of fields) {
      const ref = node[field.name];
      if (!field.nullable || ref) {
        if (field.type === "list") {
          const breakWalk = reverse ? ref.reduceRight(walkReducer, false) : ref.reduce(walkReducer, false);
          if (breakWalk) {
            return true;
          }
        } else if (walk(ref)) {
          return true;
        }
      }
    }
    if (useContext) {
      context[contextName] = prevContextValue;
    }
  };
}
function createFastTraveralMap({
  StyleSheet,
  Atrule,
  Rule,
  Block,
  DeclarationList
}) {
  return {
    Atrule: {
      StyleSheet,
      Atrule,
      Rule,
      Block
    },
    Rule: {
      StyleSheet,
      Atrule,
      Rule,
      Block
    },
    Declaration: {
      StyleSheet,
      Atrule,
      Rule,
      Block,
      DeclarationList
    }
  };
}
function createWalker(config) {
  const types2 = getTypesFromConfig(config);
  const iteratorsNatural = {};
  const iteratorsReverse = {};
  const breakWalk = Symbol("break-walk");
  const skipNode = Symbol("skip-node");
  for (const name in types2) {
    if (hasOwnProperty2.call(types2, name) && types2[name] !== null) {
      iteratorsNatural[name] = createTypeIterator(types2[name], false);
      iteratorsReverse[name] = createTypeIterator(types2[name], true);
    }
  }
  const fastTraversalIteratorsNatural = createFastTraveralMap(iteratorsNatural);
  const fastTraversalIteratorsReverse = createFastTraveralMap(iteratorsReverse);
  const walk = function(root, options) {
    function walkNode(node, item, list) {
      const enterRet = enter.call(context, node, item, list);
      if (enterRet === breakWalk) {
        return true;
      }
      if (enterRet === skipNode) {
        return false;
      }
      if (iterators.hasOwnProperty(node.type)) {
        if (iterators[node.type](node, context, walkNode, walkReducer)) {
          return true;
        }
      }
      if (leave.call(context, node, item, list) === breakWalk) {
        return true;
      }
      return false;
    }
    let enter = noop;
    let leave = noop;
    let iterators = iteratorsNatural;
    let walkReducer = (ret, data, item, list) => ret || walkNode(data, item, list);
    const context = {
      break: breakWalk,
      skip: skipNode,
      root,
      stylesheet: null,
      atrule: null,
      atrulePrelude: null,
      rule: null,
      selector: null,
      block: null,
      declaration: null,
      function: null
    };
    if (typeof options === "function") {
      enter = options;
    } else if (options) {
      enter = ensureFunction(options.enter);
      leave = ensureFunction(options.leave);
      if (options.reverse) {
        iterators = iteratorsReverse;
      }
      if (options.visit) {
        if (fastTraversalIteratorsNatural.hasOwnProperty(options.visit)) {
          iterators = options.reverse ? fastTraversalIteratorsReverse[options.visit] : fastTraversalIteratorsNatural[options.visit];
        } else if (!types2.hasOwnProperty(options.visit)) {
          throw new Error("Bad value `" + options.visit + "` for `visit` option (should be: " + Object.keys(types2).sort().join(", ") + ")");
        }
        enter = invokeForType(enter, options.visit);
        leave = invokeForType(leave, options.visit);
      }
    }
    if (enter === noop && leave === noop) {
      throw new Error("Neither `enter` nor `leave` walker handler is set or both aren't a function");
    }
    walkNode(root);
  };
  walk.break = breakWalk;
  walk.skip = skipNode;
  walk.find = function(ast, fn) {
    let found = null;
    walk(ast, function(node, item, list) {
      if (fn.call(this, node, item, list)) {
        found = node;
        return breakWalk;
      }
    });
    return found;
  };
  walk.findLast = function(ast, fn) {
    let found = null;
    walk(ast, {
      reverse: true,
      enter(node, item, list) {
        if (fn.call(this, node, item, list)) {
          found = node;
          return breakWalk;
        }
      }
    });
    return found;
  };
  walk.findAll = function(ast, fn) {
    const found = [];
    walk(ast, function(node, item, list) {
      if (fn.call(this, node, item, list)) {
        found.push(node);
      }
    });
    return found;
  };
  return walk;
}

// ../../../node_modules/css-tree/lib/definition-syntax/generate.js
function noop2(value) {
  return value;
}
function generateMultiplier(multiplier) {
  const { min, max, comma } = multiplier;
  if (min === 0 && max === 0) {
    return comma ? "#?" : "*";
  }
  if (min === 0 && max === 1) {
    return "?";
  }
  if (min === 1 && max === 0) {
    return comma ? "#" : "+";
  }
  if (min === 1 && max === 1) {
    return "";
  }
  return (comma ? "#" : "") + (min === max ? "{" + min + "}" : "{" + min + "," + (max !== 0 ? max : "") + "}");
}
function generateTypeOpts(node) {
  switch (node.type) {
    case "Range":
      return " [" + (node.min === null ? "-∞" : node.min) + "," + (node.max === null ? "∞" : node.max) + "]";
    default:
      throw new Error("Unknown node type `" + node.type + "`");
  }
}
function generateSequence(node, decorate, forceBraces, compact) {
  const combinator = node.combinator === " " || compact ? node.combinator : " " + node.combinator + " ";
  const result = node.terms.map((term) => internalGenerate(term, decorate, forceBraces, compact)).join(combinator);
  if (node.explicit || forceBraces) {
    return (compact || result[0] === "," ? "[" : "[ ") + result + (compact ? "]" : " ]");
  }
  return result;
}
function internalGenerate(node, decorate, forceBraces, compact) {
  let result;
  switch (node.type) {
    case "Group":
      result = generateSequence(node, decorate, forceBraces, compact) + (node.disallowEmpty ? "!" : "");
      break;
    case "Multiplier":
      return internalGenerate(node.term, decorate, forceBraces, compact) + decorate(generateMultiplier(node), node);
    case "Boolean":
      result = "<boolean-expr[" + internalGenerate(node.term, decorate, forceBraces, compact) + "]>";
      break;
    case "Type":
      result = "<" + node.name + (node.opts ? decorate(generateTypeOpts(node.opts), node.opts) : "") + ">";
      break;
    case "Property":
      result = "<'" + node.name + "'>";
      break;
    case "Keyword":
      result = node.name;
      break;
    case "AtKeyword":
      result = "@" + node.name;
      break;
    case "Function":
      result = node.name + "(";
      break;
    case "String":
    case "Token":
      result = node.value;
      break;
    case "Comma":
      result = ",";
      break;
    default:
      throw new Error("Unknown node type `" + node.type + "`");
  }
  return decorate(result, node);
}
function generate(node, options) {
  let decorate = noop2;
  let forceBraces = false;
  let compact = false;
  if (typeof options === "function") {
    decorate = options;
  } else if (options) {
    forceBraces = Boolean(options.forceBraces);
    compact = Boolean(options.compact);
    if (typeof options.decorate === "function") {
      decorate = options.decorate;
    }
  }
  return internalGenerate(node, decorate, forceBraces, compact);
}

// ../../../node_modules/css-tree/lib/lexer/error.js
var defaultLoc = { offset: 0, line: 1, column: 1 };
function locateMismatch(matchResult, node) {
  const tokens = matchResult.tokens;
  const longestMatch = matchResult.longestMatch;
  const mismatchNode = longestMatch < tokens.length ? tokens[longestMatch].node || null : null;
  const badNode = mismatchNode !== node ? mismatchNode : null;
  let mismatchOffset = 0;
  let mismatchLength = 0;
  let entries = 0;
  let css = "";
  let start;
  let end;
  for (let i = 0;i < tokens.length; i++) {
    const token = tokens[i].value;
    if (i === longestMatch) {
      mismatchLength = token.length;
      mismatchOffset = css.length;
    }
    if (badNode !== null && tokens[i].node === badNode) {
      if (i <= longestMatch) {
        entries++;
      } else {
        entries = 0;
      }
    }
    css += token;
  }
  if (longestMatch === tokens.length || entries > 1) {
    start = fromLoc(badNode || node, "end") || buildLoc(defaultLoc, css);
    end = buildLoc(start);
  } else {
    start = fromLoc(badNode, "start") || buildLoc(fromLoc(node, "start") || defaultLoc, css.slice(0, mismatchOffset));
    end = fromLoc(badNode, "end") || buildLoc(start, css.substr(mismatchOffset, mismatchLength));
  }
  return {
    css,
    mismatchOffset,
    mismatchLength,
    start,
    end
  };
}
function fromLoc(node, point) {
  const value = node && node.loc && node.loc[point];
  if (value) {
    return "line" in value ? buildLoc(value) : value;
  }
  return null;
}
function buildLoc({ offset, line, column }, extra) {
  const loc = {
    offset,
    line,
    column
  };
  if (extra) {
    const lines = extra.split(/\n|\r\n?|\f/);
    loc.offset += extra.length;
    loc.line += lines.length - 1;
    loc.column = lines.length === 1 ? loc.column + extra.length : lines.pop().length + 1;
  }
  return loc;
}
var SyntaxReferenceError = function(type, referenceName) {
  const error = createCustomError("SyntaxReferenceError", type + (referenceName ? " `" + referenceName + "`" : ""));
  error.reference = referenceName;
  return error;
};
var SyntaxMatchError = function(message, syntax, node, matchResult) {
  const error = createCustomError("SyntaxMatchError", message);
  const {
    css,
    mismatchOffset,
    mismatchLength,
    start,
    end
  } = locateMismatch(matchResult, node);
  error.rawMessage = message;
  error.syntax = syntax ? generate(syntax) : "<generic>";
  error.css = css;
  error.mismatchOffset = mismatchOffset;
  error.mismatchLength = mismatchLength;
  error.message = message + `
` + "  syntax: " + error.syntax + `
` + "   value: " + (css || "<empty string>") + `
` + "  --------" + new Array(error.mismatchOffset + 1).join("-") + "^";
  Object.assign(error, start);
  error.loc = {
    source: node && node.loc && node.loc.source || "<unknown>",
    start,
    end
  };
  return error;
};

// ../../../node_modules/css-tree/lib/utils/names.js
var keywords = new Map;
var properties = new Map;
var HYPHENMINUS2 = 45;
var keyword = getKeywordDescriptor;
var property = getPropertyDescriptor;
function isCustomProperty(str, offset) {
  offset = offset || 0;
  return str.length - offset >= 2 && str.charCodeAt(offset) === HYPHENMINUS2 && str.charCodeAt(offset + 1) === HYPHENMINUS2;
}
function getVendorPrefix(str, offset) {
  offset = offset || 0;
  if (str.length - offset >= 3) {
    if (str.charCodeAt(offset) === HYPHENMINUS2 && str.charCodeAt(offset + 1) !== HYPHENMINUS2) {
      const secondDashIndex = str.indexOf("-", offset + 2);
      if (secondDashIndex !== -1) {
        return str.substring(offset, secondDashIndex + 1);
      }
    }
  }
  return "";
}
function getKeywordDescriptor(keyword2) {
  if (keywords.has(keyword2)) {
    return keywords.get(keyword2);
  }
  const name = keyword2.toLowerCase();
  let descriptor = keywords.get(name);
  if (descriptor === undefined) {
    const custom = isCustomProperty(name, 0);
    const vendor = !custom ? getVendorPrefix(name, 0) : "";
    descriptor = Object.freeze({
      basename: name.substr(vendor.length),
      name,
      prefix: vendor,
      vendor,
      custom
    });
  }
  keywords.set(keyword2, descriptor);
  return descriptor;
}
function getPropertyDescriptor(property2) {
  if (properties.has(property2)) {
    return properties.get(property2);
  }
  let name = property2;
  let hack = property2[0];
  if (hack === "/") {
    hack = property2[1] === "/" ? "//" : "/";
  } else if (hack !== "_" && hack !== "*" && hack !== "$" && hack !== "#" && hack !== "+" && hack !== "&") {
    hack = "";
  }
  const custom = isCustomProperty(name, hack.length);
  if (!custom) {
    name = name.toLowerCase();
    if (properties.has(name)) {
      const descriptor2 = properties.get(name);
      properties.set(property2, descriptor2);
      return descriptor2;
    }
  }
  const vendor = !custom ? getVendorPrefix(name, hack.length) : "";
  const prefix = name.substr(0, hack.length + vendor.length);
  const descriptor = Object.freeze({
    basename: name.substr(prefix.length),
    name: name.substr(hack.length),
    hack,
    vendor,
    prefix,
    custom
  });
  properties.set(property2, descriptor);
  return descriptor;
}

// ../../../node_modules/css-tree/lib/lexer/generic-const.js
var cssWideKeywords = [
  "initial",
  "inherit",
  "unset",
  "revert",
  "revert-layer"
];

// ../../../node_modules/css-tree/lib/lexer/generic-an-plus-b.js
var PLUSSIGN2 = 43;
var HYPHENMINUS3 = 45;
var N2 = 110;
var DISALLOW_SIGN = true;
var ALLOW_SIGN = false;
function isDelim(token, code2) {
  return token !== null && token.type === Delim && token.value.charCodeAt(0) === code2;
}
function skipSC(token, offset, getNextToken) {
  while (token !== null && (token.type === WhiteSpace || token.type === Comment)) {
    token = getNextToken(++offset);
  }
  return offset;
}
function checkInteger(token, valueOffset, disallowSign, offset) {
  if (!token) {
    return 0;
  }
  const code2 = token.value.charCodeAt(valueOffset);
  if (code2 === PLUSSIGN2 || code2 === HYPHENMINUS3) {
    if (disallowSign) {
      return 0;
    }
    valueOffset++;
  }
  for (;valueOffset < token.value.length; valueOffset++) {
    if (!isDigit(token.value.charCodeAt(valueOffset))) {
      return 0;
    }
  }
  return offset + 1;
}
function consumeB(token, offset_, getNextToken) {
  let sign = false;
  let offset = skipSC(token, offset_, getNextToken);
  token = getNextToken(offset);
  if (token === null) {
    return offset_;
  }
  if (token.type !== Number2) {
    if (isDelim(token, PLUSSIGN2) || isDelim(token, HYPHENMINUS3)) {
      sign = true;
      offset = skipSC(getNextToken(++offset), offset, getNextToken);
      token = getNextToken(offset);
      if (token === null || token.type !== Number2) {
        return 0;
      }
    } else {
      return offset_;
    }
  }
  if (!sign) {
    const code2 = token.value.charCodeAt(0);
    if (code2 !== PLUSSIGN2 && code2 !== HYPHENMINUS3) {
      return 0;
    }
  }
  return checkInteger(token, sign ? 0 : 1, sign, offset);
}
function anPlusB(token, getNextToken) {
  let offset = 0;
  if (!token) {
    return 0;
  }
  if (token.type === Number2) {
    return checkInteger(token, 0, ALLOW_SIGN, offset);
  } else if (token.type === Ident && token.value.charCodeAt(0) === HYPHENMINUS3) {
    if (!cmpChar(token.value, 1, N2)) {
      return 0;
    }
    switch (token.value.length) {
      case 2:
        return consumeB(getNextToken(++offset), offset, getNextToken);
      case 3:
        if (token.value.charCodeAt(2) !== HYPHENMINUS3) {
          return 0;
        }
        offset = skipSC(getNextToken(++offset), offset, getNextToken);
        token = getNextToken(offset);
        return checkInteger(token, 0, DISALLOW_SIGN, offset);
      default:
        if (token.value.charCodeAt(2) !== HYPHENMINUS3) {
          return 0;
        }
        return checkInteger(token, 3, DISALLOW_SIGN, offset);
    }
  } else if (token.type === Ident || isDelim(token, PLUSSIGN2) && getNextToken(offset + 1).type === Ident) {
    if (token.type !== Ident) {
      token = getNextToken(++offset);
    }
    if (token === null || !cmpChar(token.value, 0, N2)) {
      return 0;
    }
    switch (token.value.length) {
      case 1:
        return consumeB(getNextToken(++offset), offset, getNextToken);
      case 2:
        if (token.value.charCodeAt(1) !== HYPHENMINUS3) {
          return 0;
        }
        offset = skipSC(getNextToken(++offset), offset, getNextToken);
        token = getNextToken(offset);
        return checkInteger(token, 0, DISALLOW_SIGN, offset);
      default:
        if (token.value.charCodeAt(1) !== HYPHENMINUS3) {
          return 0;
        }
        return checkInteger(token, 2, DISALLOW_SIGN, offset);
    }
  } else if (token.type === Dimension) {
    let code2 = token.value.charCodeAt(0);
    let sign = code2 === PLUSSIGN2 || code2 === HYPHENMINUS3 ? 1 : 0;
    let i = sign;
    for (;i < token.value.length; i++) {
      if (!isDigit(token.value.charCodeAt(i))) {
        break;
      }
    }
    if (i === sign) {
      return 0;
    }
    if (!cmpChar(token.value, i, N2)) {
      return 0;
    }
    if (i + 1 === token.value.length) {
      return consumeB(getNextToken(++offset), offset, getNextToken);
    } else {
      if (token.value.charCodeAt(i + 1) !== HYPHENMINUS3) {
        return 0;
      }
      if (i + 2 === token.value.length) {
        offset = skipSC(getNextToken(++offset), offset, getNextToken);
        token = getNextToken(offset);
        return checkInteger(token, 0, DISALLOW_SIGN, offset);
      } else {
        return checkInteger(token, i + 2, DISALLOW_SIGN, offset);
      }
    }
  }
  return 0;
}

// ../../../node_modules/css-tree/lib/lexer/generic-urange.js
var PLUSSIGN3 = 43;
var HYPHENMINUS4 = 45;
var QUESTIONMARK = 63;
var U = 117;
function isDelim2(token, code2) {
  return token !== null && token.type === Delim && token.value.charCodeAt(0) === code2;
}
function startsWith(token, code2) {
  return token.value.charCodeAt(0) === code2;
}
function hexSequence(token, offset, allowDash) {
  let hexlen = 0;
  for (let pos = offset;pos < token.value.length; pos++) {
    const code2 = token.value.charCodeAt(pos);
    if (code2 === HYPHENMINUS4 && allowDash && hexlen !== 0) {
      hexSequence(token, offset + hexlen + 1, false);
      return 6;
    }
    if (!isHexDigit(code2)) {
      return 0;
    }
    if (++hexlen > 6) {
      return 0;
    }
  }
  return hexlen;
}
function withQuestionMarkSequence(consumed, length, getNextToken) {
  if (!consumed) {
    return 0;
  }
  while (isDelim2(getNextToken(length), QUESTIONMARK)) {
    if (++consumed > 6) {
      return 0;
    }
    length++;
  }
  return length;
}
function urange(token, getNextToken) {
  let length = 0;
  if (token === null || token.type !== Ident || !cmpChar(token.value, 0, U)) {
    return 0;
  }
  token = getNextToken(++length);
  if (token === null) {
    return 0;
  }
  if (isDelim2(token, PLUSSIGN3)) {
    token = getNextToken(++length);
    if (token === null) {
      return 0;
    }
    if (token.type === Ident) {
      return withQuestionMarkSequence(hexSequence(token, 0, true), ++length, getNextToken);
    }
    if (isDelim2(token, QUESTIONMARK)) {
      return withQuestionMarkSequence(1, ++length, getNextToken);
    }
    return 0;
  }
  if (token.type === Number2) {
    const consumedHexLength = hexSequence(token, 1, true);
    if (consumedHexLength === 0) {
      return 0;
    }
    token = getNextToken(++length);
    if (token === null) {
      return length;
    }
    if (token.type === Dimension || token.type === Number2) {
      if (!startsWith(token, HYPHENMINUS4) || !hexSequence(token, 1, false)) {
        return 0;
      }
      return length + 1;
    }
    return withQuestionMarkSequence(consumedHexLength, length, getNextToken);
  }
  if (token.type === Dimension) {
    return withQuestionMarkSequence(hexSequence(token, 1, true), ++length, getNextToken);
  }
  return 0;
}

// ../../../node_modules/css-tree/lib/lexer/generic.js
var calcFunctionNames = ["calc(", "-moz-calc(", "-webkit-calc("];
var balancePair2 = new Map([
  [Function2, RightParenthesis],
  [LeftParenthesis, RightParenthesis],
  [LeftSquareBracket, RightSquareBracket],
  [LeftCurlyBracket, RightCurlyBracket]
]);
function charCodeAt(str, index) {
  return index < str.length ? str.charCodeAt(index) : 0;
}
function eqStr(actual, expected) {
  return cmpStr(actual, 0, actual.length, expected);
}
function eqStrAny(actual, expected) {
  for (let i = 0;i < expected.length; i++) {
    if (eqStr(actual, expected[i])) {
      return true;
    }
  }
  return false;
}
function isPostfixIeHack(str, offset) {
  if (offset !== str.length - 2) {
    return false;
  }
  return charCodeAt(str, offset) === 92 && isDigit(charCodeAt(str, offset + 1));
}
function outOfRange(opts, value, numEnd) {
  if (opts && opts.type === "Range") {
    const num = Number(numEnd !== undefined && numEnd !== value.length ? value.substr(0, numEnd) : value);
    if (isNaN(num)) {
      return true;
    }
    if (opts.min !== null && num < opts.min && typeof opts.min !== "string") {
      return true;
    }
    if (opts.max !== null && num > opts.max && typeof opts.max !== "string") {
      return true;
    }
  }
  return false;
}
function consumeFunction(token, getNextToken) {
  let balanceCloseType = 0;
  let balanceStash = [];
  let length = 0;
  scan:
    do {
      switch (token.type) {
        case RightCurlyBracket:
        case RightParenthesis:
        case RightSquareBracket:
          if (token.type !== balanceCloseType) {
            break scan;
          }
          balanceCloseType = balanceStash.pop();
          if (balanceStash.length === 0) {
            length++;
            break scan;
          }
          break;
        case Function2:
        case LeftParenthesis:
        case LeftSquareBracket:
        case LeftCurlyBracket:
          balanceStash.push(balanceCloseType);
          balanceCloseType = balancePair2.get(token.type);
          break;
      }
      length++;
    } while (token = getNextToken(length));
  return length;
}
function calc(next) {
  return function(token, getNextToken, opts) {
    if (token === null) {
      return 0;
    }
    if (token.type === Function2 && eqStrAny(token.value, calcFunctionNames)) {
      return consumeFunction(token, getNextToken);
    }
    return next(token, getNextToken, opts);
  };
}
function tokenType(expectedTokenType) {
  return function(token) {
    if (token === null || token.type !== expectedTokenType) {
      return 0;
    }
    return 1;
  };
}
function customIdent(token) {
  if (token === null || token.type !== Ident) {
    return 0;
  }
  const name = token.value.toLowerCase();
  if (eqStrAny(name, cssWideKeywords)) {
    return 0;
  }
  if (eqStr(name, "default")) {
    return 0;
  }
  return 1;
}
function dashedIdent(token) {
  if (token === null || token.type !== Ident) {
    return 0;
  }
  if (charCodeAt(token.value, 0) !== 45 || charCodeAt(token.value, 1) !== 45) {
    return 0;
  }
  return 1;
}
function customPropertyName(token) {
  if (!dashedIdent(token)) {
    return 0;
  }
  if (token.value === "--") {
    return 0;
  }
  return 1;
}
function hexColor(token) {
  if (token === null || token.type !== Hash) {
    return 0;
  }
  const length = token.value.length;
  if (length !== 4 && length !== 5 && length !== 7 && length !== 9) {
    return 0;
  }
  for (let i = 1;i < length; i++) {
    if (!isHexDigit(charCodeAt(token.value, i))) {
      return 0;
    }
  }
  return 1;
}
function idSelector(token) {
  if (token === null || token.type !== Hash) {
    return 0;
  }
  if (!isIdentifierStart(charCodeAt(token.value, 1), charCodeAt(token.value, 2), charCodeAt(token.value, 3))) {
    return 0;
  }
  return 1;
}
function declarationValue(token, getNextToken) {
  if (!token) {
    return 0;
  }
  let balanceCloseType = 0;
  let balanceStash = [];
  let length = 0;
  scan:
    do {
      switch (token.type) {
        case BadString:
        case BadUrl:
          break scan;
        case RightCurlyBracket:
        case RightParenthesis:
        case RightSquareBracket:
          if (token.type !== balanceCloseType) {
            break scan;
          }
          balanceCloseType = balanceStash.pop();
          break;
        case Semicolon:
          if (balanceCloseType === 0) {
            break scan;
          }
          break;
        case Delim:
          if (balanceCloseType === 0 && token.value === "!") {
            break scan;
          }
          break;
        case Function2:
        case LeftParenthesis:
        case LeftSquareBracket:
        case LeftCurlyBracket:
          balanceStash.push(balanceCloseType);
          balanceCloseType = balancePair2.get(token.type);
          break;
      }
      length++;
    } while (token = getNextToken(length));
  return length;
}
function anyValue(token, getNextToken) {
  if (!token) {
    return 0;
  }
  let balanceCloseType = 0;
  let balanceStash = [];
  let length = 0;
  scan:
    do {
      switch (token.type) {
        case BadString:
        case BadUrl:
          break scan;
        case RightCurlyBracket:
        case RightParenthesis:
        case RightSquareBracket:
          if (token.type !== balanceCloseType) {
            break scan;
          }
          balanceCloseType = balanceStash.pop();
          break;
        case Function2:
        case LeftParenthesis:
        case LeftSquareBracket:
        case LeftCurlyBracket:
          balanceStash.push(balanceCloseType);
          balanceCloseType = balancePair2.get(token.type);
          break;
      }
      length++;
    } while (token = getNextToken(length));
  return length;
}
function dimension(type) {
  if (type) {
    type = new Set(type);
  }
  return function(token, getNextToken, opts) {
    if (token === null || token.type !== Dimension) {
      return 0;
    }
    const numberEnd = consumeNumber(token.value, 0);
    if (type !== null) {
      const reverseSolidusOffset = token.value.indexOf("\\", numberEnd);
      const unit = reverseSolidusOffset === -1 || !isPostfixIeHack(token.value, reverseSolidusOffset) ? token.value.substr(numberEnd) : token.value.substring(numberEnd, reverseSolidusOffset);
      if (type.has(unit.toLowerCase()) === false) {
        return 0;
      }
    }
    if (outOfRange(opts, token.value, numberEnd)) {
      return 0;
    }
    return 1;
  };
}
function percentage(token, getNextToken, opts) {
  if (token === null || token.type !== Percentage) {
    return 0;
  }
  if (outOfRange(opts, token.value, token.value.length - 1)) {
    return 0;
  }
  return 1;
}
function zero(next) {
  if (typeof next !== "function") {
    next = function() {
      return 0;
    };
  }
  return function(token, getNextToken, opts) {
    if (token !== null && token.type === Number2) {
      if (Number(token.value) === 0) {
        return 1;
      }
    }
    return next(token, getNextToken, opts);
  };
}
function number(token, getNextToken, opts) {
  if (token === null) {
    return 0;
  }
  const numberEnd = consumeNumber(token.value, 0);
  const isNumber = numberEnd === token.value.length;
  if (!isNumber && !isPostfixIeHack(token.value, numberEnd)) {
    return 0;
  }
  if (outOfRange(opts, token.value, numberEnd)) {
    return 0;
  }
  return 1;
}
function integer(token, getNextToken, opts) {
  if (token === null || token.type !== Number2) {
    return 0;
  }
  let i = charCodeAt(token.value, 0) === 43 || charCodeAt(token.value, 0) === 45 ? 1 : 0;
  for (;i < token.value.length; i++) {
    if (!isDigit(charCodeAt(token.value, i))) {
      return 0;
    }
  }
  if (outOfRange(opts, token.value, i)) {
    return 0;
  }
  return 1;
}
var tokenTypes = {
  "ident-token": tokenType(Ident),
  "function-token": tokenType(Function2),
  "at-keyword-token": tokenType(AtKeyword),
  "hash-token": tokenType(Hash),
  "string-token": tokenType(String2),
  "bad-string-token": tokenType(BadString),
  "url-token": tokenType(Url),
  "bad-url-token": tokenType(BadUrl),
  "delim-token": tokenType(Delim),
  "number-token": tokenType(Number2),
  "percentage-token": tokenType(Percentage),
  "dimension-token": tokenType(Dimension),
  "whitespace-token": tokenType(WhiteSpace),
  "CDO-token": tokenType(CDO),
  "CDC-token": tokenType(CDC),
  "colon-token": tokenType(Colon),
  "semicolon-token": tokenType(Semicolon),
  "comma-token": tokenType(Comma),
  "[-token": tokenType(LeftSquareBracket),
  "]-token": tokenType(RightSquareBracket),
  "(-token": tokenType(LeftParenthesis),
  ")-token": tokenType(RightParenthesis),
  "{-token": tokenType(LeftCurlyBracket),
  "}-token": tokenType(RightCurlyBracket)
};
var productionTypes = {
  string: tokenType(String2),
  ident: tokenType(Ident),
  percentage: calc(percentage),
  zero: zero(),
  number: calc(number),
  integer: calc(integer),
  "custom-ident": customIdent,
  "dashed-ident": dashedIdent,
  "custom-property-name": customPropertyName,
  "hex-color": hexColor,
  "id-selector": idSelector,
  "an-plus-b": anPlusB,
  urange,
  "declaration-value": declarationValue,
  "any-value": anyValue
};
function createDemensionTypes(units) {
  const {
    angle,
    decibel,
    frequency,
    flex,
    length,
    resolution,
    semitones,
    time
  } = units || {};
  return {
    dimension: calc(dimension(null)),
    angle: calc(dimension(angle)),
    decibel: calc(dimension(decibel)),
    frequency: calc(dimension(frequency)),
    flex: calc(dimension(flex)),
    length: calc(zero(dimension(length))),
    resolution: calc(dimension(resolution)),
    semitones: calc(dimension(semitones)),
    time: calc(dimension(time))
  };
}
function createGenericTypes(units) {
  return {
    ...tokenTypes,
    ...productionTypes,
    ...createDemensionTypes(units)
  };
}

// ../../../node_modules/css-tree/lib/lexer/units.js
var exports_units = {};
__export(exports_units, {
  time: () => time,
  semitones: () => semitones,
  resolution: () => resolution,
  length: () => length,
  frequency: () => frequency,
  flex: () => flex,
  decibel: () => decibel,
  angle: () => angle
});
var length = [
  "cm",
  "mm",
  "q",
  "in",
  "pt",
  "pc",
  "px",
  "em",
  "rem",
  "ex",
  "rex",
  "cap",
  "rcap",
  "ch",
  "rch",
  "ic",
  "ric",
  "lh",
  "rlh",
  "vw",
  "svw",
  "lvw",
  "dvw",
  "vh",
  "svh",
  "lvh",
  "dvh",
  "vi",
  "svi",
  "lvi",
  "dvi",
  "vb",
  "svb",
  "lvb",
  "dvb",
  "vmin",
  "svmin",
  "lvmin",
  "dvmin",
  "vmax",
  "svmax",
  "lvmax",
  "dvmax",
  "cqw",
  "cqh",
  "cqi",
  "cqb",
  "cqmin",
  "cqmax"
];
var angle = ["deg", "grad", "rad", "turn"];
var time = ["s", "ms"];
var frequency = ["hz", "khz"];
var resolution = ["dpi", "dpcm", "dppx", "x"];
var flex = ["fr"];
var decibel = ["db"];
var semitones = ["st"];

// ../../../node_modules/css-tree/lib/definition-syntax/SyntaxError.js
function SyntaxError3(message, input, offset) {
  return Object.assign(createCustomError("SyntaxError", message), {
    input,
    offset,
    rawMessage: message,
    message: message + `
` + "  " + input + `
` + "--" + new Array((offset || input.length) + 1).join("-") + "^"
  });
}
// ../../../node_modules/css-tree/lib/definition-syntax/scanner.js
var TAB = 9;
var N3 = 10;
var F2 = 12;
var R2 = 13;
var SPACE = 32;
var NAME_CHAR = new Uint8Array(128).map((_, idx) => /[a-zA-Z0-9\-]/.test(String.fromCharCode(idx)) ? 1 : 0);

class Scanner {
  constructor(str) {
    this.str = str;
    this.pos = 0;
  }
  charCodeAt(pos) {
    return pos < this.str.length ? this.str.charCodeAt(pos) : 0;
  }
  charCode() {
    return this.charCodeAt(this.pos);
  }
  isNameCharCode(code2 = this.charCode()) {
    return code2 < 128 && NAME_CHAR[code2] === 1;
  }
  nextCharCode() {
    return this.charCodeAt(this.pos + 1);
  }
  nextNonWsCode(pos) {
    return this.charCodeAt(this.findWsEnd(pos));
  }
  skipWs() {
    this.pos = this.findWsEnd(this.pos);
  }
  findWsEnd(pos) {
    for (;pos < this.str.length; pos++) {
      const code2 = this.str.charCodeAt(pos);
      if (code2 !== R2 && code2 !== N3 && code2 !== F2 && code2 !== SPACE && code2 !== TAB) {
        break;
      }
    }
    return pos;
  }
  substringToPos(end) {
    return this.str.substring(this.pos, this.pos = end);
  }
  eat(code2) {
    if (this.charCode() !== code2) {
      this.error("Expect `" + String.fromCharCode(code2) + "`");
    }
    this.pos++;
  }
  peek() {
    return this.pos < this.str.length ? this.str.charAt(this.pos++) : "";
  }
  error(message) {
    throw new SyntaxError3(message, this.str, this.pos);
  }
  scanSpaces() {
    return this.substringToPos(this.findWsEnd(this.pos));
  }
  scanWord() {
    let end = this.pos;
    for (;end < this.str.length; end++) {
      const code2 = this.str.charCodeAt(end);
      if (code2 >= 128 || NAME_CHAR[code2] === 0) {
        break;
      }
    }
    if (this.pos === end) {
      this.error("Expect a keyword");
    }
    return this.substringToPos(end);
  }
  scanNumber() {
    let end = this.pos;
    for (;end < this.str.length; end++) {
      const code2 = this.str.charCodeAt(end);
      if (code2 < 48 || code2 > 57) {
        break;
      }
    }
    if (this.pos === end) {
      this.error("Expect a number");
    }
    return this.substringToPos(end);
  }
  scanString() {
    const end = this.str.indexOf("'", this.pos + 1);
    if (end === -1) {
      this.pos = this.str.length;
      this.error("Expect an apostrophe");
    }
    return this.substringToPos(end + 1);
  }
}

// ../../../node_modules/css-tree/lib/definition-syntax/parse.js
var TAB2 = 9;
var N4 = 10;
var F3 = 12;
var R3 = 13;
var SPACE2 = 32;
var EXCLAMATIONMARK2 = 33;
var NUMBERSIGN2 = 35;
var AMPERSAND = 38;
var APOSTROPHE = 39;
var LEFTPARENTHESIS = 40;
var RIGHTPARENTHESIS = 41;
var ASTERISK = 42;
var PLUSSIGN4 = 43;
var COMMA = 44;
var HYPERMINUS = 45;
var LESSTHANSIGN = 60;
var GREATERTHANSIGN = 62;
var QUESTIONMARK2 = 63;
var COMMERCIALAT = 64;
var LEFTSQUAREBRACKET = 91;
var RIGHTSQUAREBRACKET = 93;
var LEFTCURLYBRACKET2 = 123;
var VERTICALLINE = 124;
var RIGHTCURLYBRACKET = 125;
var INFINITY = 8734;
var COMBINATOR_PRECEDENCE = {
  " ": 1,
  "&&": 2,
  "||": 3,
  "|": 4
};
function readMultiplierRange(scanner) {
  let min = null;
  let max = null;
  scanner.eat(LEFTCURLYBRACKET2);
  scanner.skipWs();
  min = scanner.scanNumber(scanner);
  scanner.skipWs();
  if (scanner.charCode() === COMMA) {
    scanner.pos++;
    scanner.skipWs();
    if (scanner.charCode() !== RIGHTCURLYBRACKET) {
      max = scanner.scanNumber(scanner);
      scanner.skipWs();
    }
  } else {
    max = min;
  }
  scanner.eat(RIGHTCURLYBRACKET);
  return {
    min: Number(min),
    max: max ? Number(max) : 0
  };
}
function readMultiplier(scanner) {
  let range = null;
  let comma = false;
  switch (scanner.charCode()) {
    case ASTERISK:
      scanner.pos++;
      range = {
        min: 0,
        max: 0
      };
      break;
    case PLUSSIGN4:
      scanner.pos++;
      range = {
        min: 1,
        max: 0
      };
      break;
    case QUESTIONMARK2:
      scanner.pos++;
      range = {
        min: 0,
        max: 1
      };
      break;
    case NUMBERSIGN2:
      scanner.pos++;
      comma = true;
      if (scanner.charCode() === LEFTCURLYBRACKET2) {
        range = readMultiplierRange(scanner);
      } else if (scanner.charCode() === QUESTIONMARK2) {
        scanner.pos++;
        range = {
          min: 0,
          max: 0
        };
      } else {
        range = {
          min: 1,
          max: 0
        };
      }
      break;
    case LEFTCURLYBRACKET2:
      range = readMultiplierRange(scanner);
      break;
    default:
      return null;
  }
  return {
    type: "Multiplier",
    comma,
    min: range.min,
    max: range.max,
    term: null
  };
}
function maybeMultiplied(scanner, node) {
  const multiplier = readMultiplier(scanner);
  if (multiplier !== null) {
    multiplier.term = node;
    if (scanner.charCode() === NUMBERSIGN2 && scanner.charCodeAt(scanner.pos - 1) === PLUSSIGN4) {
      return maybeMultiplied(scanner, multiplier);
    }
    return multiplier;
  }
  return node;
}
function maybeToken(scanner) {
  const ch = scanner.peek();
  if (ch === "") {
    return null;
  }
  return maybeMultiplied(scanner, {
    type: "Token",
    value: ch
  });
}
function readProperty(scanner) {
  let name;
  scanner.eat(LESSTHANSIGN);
  scanner.eat(APOSTROPHE);
  name = scanner.scanWord();
  scanner.eat(APOSTROPHE);
  scanner.eat(GREATERTHANSIGN);
  return maybeMultiplied(scanner, {
    type: "Property",
    name
  });
}
function readTypeRange(scanner) {
  let min = null;
  let max = null;
  let sign = 1;
  scanner.eat(LEFTSQUAREBRACKET);
  if (scanner.charCode() === HYPERMINUS) {
    scanner.peek();
    sign = -1;
  }
  if (sign == -1 && scanner.charCode() === INFINITY) {
    scanner.peek();
  } else {
    min = sign * Number(scanner.scanNumber(scanner));
    if (scanner.isNameCharCode()) {
      min += scanner.scanWord();
    }
  }
  scanner.skipWs();
  scanner.eat(COMMA);
  scanner.skipWs();
  if (scanner.charCode() === INFINITY) {
    scanner.peek();
  } else {
    sign = 1;
    if (scanner.charCode() === HYPERMINUS) {
      scanner.peek();
      sign = -1;
    }
    max = sign * Number(scanner.scanNumber(scanner));
    if (scanner.isNameCharCode()) {
      max += scanner.scanWord();
    }
  }
  scanner.eat(RIGHTSQUAREBRACKET);
  return {
    type: "Range",
    min,
    max
  };
}
function readType(scanner) {
  let name;
  let opts = null;
  scanner.eat(LESSTHANSIGN);
  name = scanner.scanWord();
  if (name === "boolean-expr") {
    scanner.eat(LEFTSQUAREBRACKET);
    const implicitGroup = readImplicitGroup(scanner, RIGHTSQUAREBRACKET);
    scanner.eat(RIGHTSQUAREBRACKET);
    scanner.eat(GREATERTHANSIGN);
    return maybeMultiplied(scanner, {
      type: "Boolean",
      term: implicitGroup.terms.length === 1 ? implicitGroup.terms[0] : implicitGroup
    });
  }
  if (scanner.charCode() === LEFTPARENTHESIS && scanner.nextCharCode() === RIGHTPARENTHESIS) {
    scanner.pos += 2;
    name += "()";
  }
  if (scanner.charCodeAt(scanner.findWsEnd(scanner.pos)) === LEFTSQUAREBRACKET) {
    scanner.skipWs();
    opts = readTypeRange(scanner);
  }
  scanner.eat(GREATERTHANSIGN);
  return maybeMultiplied(scanner, {
    type: "Type",
    name,
    opts
  });
}
function readKeywordOrFunction(scanner) {
  const name = scanner.scanWord();
  if (scanner.charCode() === LEFTPARENTHESIS) {
    scanner.pos++;
    return {
      type: "Function",
      name
    };
  }
  return maybeMultiplied(scanner, {
    type: "Keyword",
    name
  });
}
function regroupTerms(terms, combinators) {
  function createGroup(terms2, combinator2) {
    return {
      type: "Group",
      terms: terms2,
      combinator: combinator2,
      disallowEmpty: false,
      explicit: false
    };
  }
  let combinator;
  combinators = Object.keys(combinators).sort((a, b) => COMBINATOR_PRECEDENCE[a] - COMBINATOR_PRECEDENCE[b]);
  while (combinators.length > 0) {
    combinator = combinators.shift();
    let i = 0;
    let subgroupStart = 0;
    for (;i < terms.length; i++) {
      const term = terms[i];
      if (term.type === "Combinator") {
        if (term.value === combinator) {
          if (subgroupStart === -1) {
            subgroupStart = i - 1;
          }
          terms.splice(i, 1);
          i--;
        } else {
          if (subgroupStart !== -1 && i - subgroupStart > 1) {
            terms.splice(subgroupStart, i - subgroupStart, createGroup(terms.slice(subgroupStart, i), combinator));
            i = subgroupStart + 1;
          }
          subgroupStart = -1;
        }
      }
    }
    if (subgroupStart !== -1 && combinators.length) {
      terms.splice(subgroupStart, i - subgroupStart, createGroup(terms.slice(subgroupStart, i), combinator));
    }
  }
  return combinator;
}
function readImplicitGroup(scanner, stopCharCode) {
  const combinators = Object.create(null);
  const terms = [];
  let token;
  let prevToken = null;
  let prevTokenPos = scanner.pos;
  while (scanner.charCode() !== stopCharCode && (token = peek(scanner, stopCharCode))) {
    if (token.type !== "Spaces") {
      if (token.type === "Combinator") {
        if (prevToken === null || prevToken.type === "Combinator") {
          scanner.pos = prevTokenPos;
          scanner.error("Unexpected combinator");
        }
        combinators[token.value] = true;
      } else if (prevToken !== null && prevToken.type !== "Combinator") {
        combinators[" "] = true;
        terms.push({
          type: "Combinator",
          value: " "
        });
      }
      terms.push(token);
      prevToken = token;
      prevTokenPos = scanner.pos;
    }
  }
  if (prevToken !== null && prevToken.type === "Combinator") {
    scanner.pos -= prevTokenPos;
    scanner.error("Unexpected combinator");
  }
  return {
    type: "Group",
    terms,
    combinator: regroupTerms(terms, combinators) || " ",
    disallowEmpty: false,
    explicit: false
  };
}
function readGroup(scanner, stopCharCode) {
  let result;
  scanner.eat(LEFTSQUAREBRACKET);
  result = readImplicitGroup(scanner, stopCharCode);
  scanner.eat(RIGHTSQUAREBRACKET);
  result.explicit = true;
  if (scanner.charCode() === EXCLAMATIONMARK2) {
    scanner.pos++;
    result.disallowEmpty = true;
  }
  return result;
}
function peek(scanner, stopCharCode) {
  let code2 = scanner.charCode();
  switch (code2) {
    case RIGHTSQUAREBRACKET:
      break;
    case LEFTSQUAREBRACKET:
      return maybeMultiplied(scanner, readGroup(scanner, stopCharCode));
    case LESSTHANSIGN:
      return scanner.nextCharCode() === APOSTROPHE ? readProperty(scanner) : readType(scanner);
    case VERTICALLINE:
      return {
        type: "Combinator",
        value: scanner.substringToPos(scanner.pos + (scanner.nextCharCode() === VERTICALLINE ? 2 : 1))
      };
    case AMPERSAND:
      scanner.pos++;
      scanner.eat(AMPERSAND);
      return {
        type: "Combinator",
        value: "&&"
      };
    case COMMA:
      scanner.pos++;
      return {
        type: "Comma"
      };
    case APOSTROPHE:
      return maybeMultiplied(scanner, {
        type: "String",
        value: scanner.scanString()
      });
    case SPACE2:
    case TAB2:
    case N4:
    case R3:
    case F3:
      return {
        type: "Spaces",
        value: scanner.scanSpaces()
      };
    case COMMERCIALAT:
      code2 = scanner.nextCharCode();
      if (scanner.isNameCharCode(code2)) {
        scanner.pos++;
        return {
          type: "AtKeyword",
          name: scanner.scanWord()
        };
      }
      return maybeToken(scanner);
    case ASTERISK:
    case PLUSSIGN4:
    case QUESTIONMARK2:
    case NUMBERSIGN2:
    case EXCLAMATIONMARK2:
      break;
    case LEFTCURLYBRACKET2:
      code2 = scanner.nextCharCode();
      if (code2 < 48 || code2 > 57) {
        return maybeToken(scanner);
      }
      break;
    default:
      if (scanner.isNameCharCode(code2)) {
        return readKeywordOrFunction(scanner);
      }
      return maybeToken(scanner);
  }
}
function parse(source) {
  const scanner = new Scanner(source);
  const result = readImplicitGroup(scanner);
  if (scanner.pos !== source.length) {
    scanner.error("Unexpected input");
  }
  if (result.terms.length === 1 && result.terms[0].type === "Group") {
    return result.terms[0];
  }
  return result;
}
// ../../../node_modules/css-tree/lib/definition-syntax/walk.js
var noop3 = function() {};
function ensureFunction2(value) {
  return typeof value === "function" ? value : noop3;
}
function walk(node, options, context) {
  function walk2(node2) {
    enter.call(context, node2);
    switch (node2.type) {
      case "Group":
        node2.terms.forEach(walk2);
        break;
      case "Multiplier":
      case "Boolean":
        walk2(node2.term);
        break;
      case "Type":
      case "Property":
      case "Keyword":
      case "AtKeyword":
      case "Function":
      case "String":
      case "Token":
      case "Comma":
        break;
      default:
        throw new Error("Unknown type: " + node2.type);
    }
    leave.call(context, node2);
  }
  let enter = noop3;
  let leave = noop3;
  if (typeof options === "function") {
    enter = options;
  } else if (options) {
    enter = ensureFunction2(options.enter);
    leave = ensureFunction2(options.leave);
  }
  if (enter === noop3 && leave === noop3) {
    throw new Error("Neither `enter` nor `leave` walker handler is set or both aren't a function");
  }
  walk2(node, context);
}
// ../../../node_modules/css-tree/lib/lexer/prepare-tokens.js
var astToTokens = {
  decorator(handlers) {
    const tokens = [];
    let curNode = null;
    return {
      ...handlers,
      node(node) {
        const tmp = curNode;
        curNode = node;
        handlers.node.call(this, node);
        curNode = tmp;
      },
      emit(value, type, auto) {
        tokens.push({
          type,
          value,
          node: auto ? null : curNode
        });
      },
      result() {
        return tokens;
      }
    };
  }
};
function stringToTokens(str) {
  const tokens = [];
  tokenize(str, (type, start, end) => tokens.push({
    type,
    value: str.slice(start, end),
    node: null
  }));
  return tokens;
}
function prepare_tokens_default(value, syntax) {
  if (typeof value === "string") {
    return stringToTokens(value);
  }
  return syntax.generate(value, astToTokens);
}

// ../../../node_modules/css-tree/lib/lexer/match-graph.js
var MATCH = { type: "Match" };
var MISMATCH = { type: "Mismatch" };
var DISALLOW_EMPTY = { type: "DisallowEmpty" };
var LEFTPARENTHESIS2 = 40;
var RIGHTPARENTHESIS2 = 41;
function createCondition(match, thenBranch, elseBranch) {
  if (thenBranch === MATCH && elseBranch === MISMATCH) {
    return match;
  }
  if (match === MATCH && thenBranch === MATCH && elseBranch === MATCH) {
    return match;
  }
  if (match.type === "If" && match.else === MISMATCH && thenBranch === MATCH) {
    thenBranch = match.then;
    match = match.match;
  }
  return {
    type: "If",
    match,
    then: thenBranch,
    else: elseBranch
  };
}
function isFunctionType(name) {
  return name.length > 2 && name.charCodeAt(name.length - 2) === LEFTPARENTHESIS2 && name.charCodeAt(name.length - 1) === RIGHTPARENTHESIS2;
}
function isEnumCapatible(term) {
  return term.type === "Keyword" || term.type === "AtKeyword" || term.type === "Function" || term.type === "Type" && isFunctionType(term.name);
}
function groupNode(terms, combinator = " ", explicit = false) {
  return {
    type: "Group",
    terms,
    combinator,
    disallowEmpty: false,
    explicit
  };
}
function replaceTypeInGraph(node, replacements, visited = new Set) {
  if (!visited.has(node)) {
    visited.add(node);
    switch (node.type) {
      case "If":
        node.match = replaceTypeInGraph(node.match, replacements, visited);
        node.then = replaceTypeInGraph(node.then, replacements, visited);
        node.else = replaceTypeInGraph(node.else, replacements, visited);
        break;
      case "Type":
        return replacements[node.name] || node;
    }
  }
  return node;
}
function buildGroupMatchGraph(combinator, terms, atLeastOneTermMatched) {
  switch (combinator) {
    case " ": {
      let result = MATCH;
      for (let i = terms.length - 1;i >= 0; i--) {
        const term = terms[i];
        result = createCondition(term, result, MISMATCH);
      }
      return result;
    }
    case "|": {
      let result = MISMATCH;
      let map = null;
      for (let i = terms.length - 1;i >= 0; i--) {
        let term = terms[i];
        if (isEnumCapatible(term)) {
          if (map === null && i > 0 && isEnumCapatible(terms[i - 1])) {
            map = Object.create(null);
            result = createCondition({
              type: "Enum",
              map
            }, MATCH, result);
          }
          if (map !== null) {
            const key = (isFunctionType(term.name) ? term.name.slice(0, -1) : term.name).toLowerCase();
            if (key in map === false) {
              map[key] = term;
              continue;
            }
          }
        }
        map = null;
        result = createCondition(term, MATCH, result);
      }
      return result;
    }
    case "&&": {
      if (terms.length > 5) {
        return {
          type: "MatchOnce",
          terms,
          all: true
        };
      }
      let result = MISMATCH;
      for (let i = terms.length - 1;i >= 0; i--) {
        const term = terms[i];
        let thenClause;
        if (terms.length > 1) {
          thenClause = buildGroupMatchGraph(combinator, terms.filter(function(newGroupTerm) {
            return newGroupTerm !== term;
          }), false);
        } else {
          thenClause = MATCH;
        }
        result = createCondition(term, thenClause, result);
      }
      return result;
    }
    case "||": {
      if (terms.length > 5) {
        return {
          type: "MatchOnce",
          terms,
          all: false
        };
      }
      let result = atLeastOneTermMatched ? MATCH : MISMATCH;
      for (let i = terms.length - 1;i >= 0; i--) {
        const term = terms[i];
        let thenClause;
        if (terms.length > 1) {
          thenClause = buildGroupMatchGraph(combinator, terms.filter(function(newGroupTerm) {
            return newGroupTerm !== term;
          }), true);
        } else {
          thenClause = MATCH;
        }
        result = createCondition(term, thenClause, result);
      }
      return result;
    }
  }
}
function buildMultiplierMatchGraph(node) {
  let result = MATCH;
  let matchTerm = buildMatchGraphInternal(node.term);
  if (node.max === 0) {
    matchTerm = createCondition(matchTerm, DISALLOW_EMPTY, MISMATCH);
    result = createCondition(matchTerm, null, MISMATCH);
    result.then = createCondition(MATCH, MATCH, result);
    if (node.comma) {
      result.then.else = createCondition({ type: "Comma", syntax: node }, result, MISMATCH);
    }
  } else {
    for (let i = node.min || 1;i <= node.max; i++) {
      if (node.comma && result !== MATCH) {
        result = createCondition({ type: "Comma", syntax: node }, result, MISMATCH);
      }
      result = createCondition(matchTerm, createCondition(MATCH, MATCH, result), MISMATCH);
    }
  }
  if (node.min === 0) {
    result = createCondition(MATCH, MATCH, result);
  } else {
    for (let i = 0;i < node.min - 1; i++) {
      if (node.comma && result !== MATCH) {
        result = createCondition({ type: "Comma", syntax: node }, result, MISMATCH);
      }
      result = createCondition(matchTerm, result, MISMATCH);
    }
  }
  return result;
}
function buildMatchGraphInternal(node) {
  if (typeof node === "function") {
    return {
      type: "Generic",
      fn: node
    };
  }
  switch (node.type) {
    case "Group": {
      let result = buildGroupMatchGraph(node.combinator, node.terms.map(buildMatchGraphInternal), false);
      if (node.disallowEmpty) {
        result = createCondition(result, DISALLOW_EMPTY, MISMATCH);
      }
      return result;
    }
    case "Multiplier":
      return buildMultiplierMatchGraph(node);
    case "Boolean": {
      const term = buildMatchGraphInternal(node.term);
      const matchNode = buildMatchGraphInternal(groupNode([
        groupNode([
          { type: "Keyword", name: "not" },
          { type: "Type", name: "!boolean-group" }
        ]),
        groupNode([
          { type: "Type", name: "!boolean-group" },
          groupNode([
            { type: "Multiplier", comma: false, min: 0, max: 0, term: groupNode([
              { type: "Keyword", name: "and" },
              { type: "Type", name: "!boolean-group" }
            ]) },
            { type: "Multiplier", comma: false, min: 0, max: 0, term: groupNode([
              { type: "Keyword", name: "or" },
              { type: "Type", name: "!boolean-group" }
            ]) }
          ], "|")
        ])
      ], "|"));
      const booleanGroup = buildMatchGraphInternal(groupNode([
        { type: "Type", name: "!term" },
        groupNode([
          { type: "Token", value: "(" },
          { type: "Type", name: "!self" },
          { type: "Token", value: ")" }
        ]),
        { type: "Type", name: "general-enclosed" }
      ], "|"));
      replaceTypeInGraph(booleanGroup, { "!term": term, "!self": matchNode });
      replaceTypeInGraph(matchNode, { "!boolean-group": booleanGroup });
      return matchNode;
    }
    case "Type":
    case "Property":
      return {
        type: node.type,
        name: node.name,
        syntax: node
      };
    case "Keyword":
      return {
        type: node.type,
        name: node.name.toLowerCase(),
        syntax: node
      };
    case "AtKeyword":
      return {
        type: node.type,
        name: "@" + node.name.toLowerCase(),
        syntax: node
      };
    case "Function":
      return {
        type: node.type,
        name: node.name.toLowerCase() + "(",
        syntax: node
      };
    case "String":
      if (node.value.length === 3) {
        return {
          type: "Token",
          value: node.value.charAt(1),
          syntax: node
        };
      }
      return {
        type: node.type,
        value: node.value.substr(1, node.value.length - 2).replace(/\\'/g, "'"),
        syntax: node
      };
    case "Token":
      return {
        type: node.type,
        value: node.value,
        syntax: node
      };
    case "Comma":
      return {
        type: node.type,
        syntax: node
      };
    default:
      throw new Error("Unknown node type:", node.type);
  }
}
function buildMatchGraph(syntaxTree, ref) {
  if (typeof syntaxTree === "string") {
    syntaxTree = parse(syntaxTree);
  }
  return {
    type: "MatchGraph",
    match: buildMatchGraphInternal(syntaxTree),
    syntax: ref || null,
    source: syntaxTree
  };
}

// ../../../node_modules/css-tree/lib/lexer/match.js
var { hasOwnProperty: hasOwnProperty3 } = Object.prototype;
var STUB = 0;
var TOKEN = 1;
var OPEN_SYNTAX = 2;
var CLOSE_SYNTAX = 3;
var EXIT_REASON_MATCH = "Match";
var EXIT_REASON_MISMATCH = "Mismatch";
var EXIT_REASON_ITERATION_LIMIT = "Maximum iteration number exceeded (please fill an issue on https://github.com/csstree/csstree/issues)";
var ITERATION_LIMIT = 15000;
var totalIterationCount = 0;
function reverseList(list) {
  let prev = null;
  let next = null;
  let item = list;
  while (item !== null) {
    next = item.prev;
    item.prev = prev;
    prev = item;
    item = next;
  }
  return prev;
}
function areStringsEqualCaseInsensitive(testStr, referenceStr) {
  if (testStr.length !== referenceStr.length) {
    return false;
  }
  for (let i = 0;i < testStr.length; i++) {
    const referenceCode = referenceStr.charCodeAt(i);
    let testCode = testStr.charCodeAt(i);
    if (testCode >= 65 && testCode <= 90) {
      testCode = testCode | 32;
    }
    if (testCode !== referenceCode) {
      return false;
    }
  }
  return true;
}
function isContextEdgeDelim(token) {
  if (token.type !== Delim) {
    return false;
  }
  return token.value !== "?";
}
function isCommaContextStart(token) {
  if (token === null) {
    return true;
  }
  return token.type === Comma || token.type === Function2 || token.type === LeftParenthesis || token.type === LeftSquareBracket || token.type === LeftCurlyBracket || isContextEdgeDelim(token);
}
function isCommaContextEnd(token) {
  if (token === null) {
    return true;
  }
  return token.type === RightParenthesis || token.type === RightSquareBracket || token.type === RightCurlyBracket || token.type === Delim && token.value === "/";
}
function internalMatch(tokens, state, syntaxes) {
  function moveToNextToken() {
    do {
      tokenIndex++;
      token = tokenIndex < tokens.length ? tokens[tokenIndex] : null;
    } while (token !== null && (token.type === WhiteSpace || token.type === Comment));
  }
  function getNextToken(offset) {
    const nextIndex = tokenIndex + offset;
    return nextIndex < tokens.length ? tokens[nextIndex] : null;
  }
  function stateSnapshotFromSyntax(nextState, prev) {
    return {
      nextState,
      matchStack,
      syntaxStack,
      thenStack,
      tokenIndex,
      prev
    };
  }
  function pushThenStack(nextState) {
    thenStack = {
      nextState,
      matchStack,
      syntaxStack,
      prev: thenStack
    };
  }
  function pushElseStack(nextState) {
    elseStack = stateSnapshotFromSyntax(nextState, elseStack);
  }
  function addTokenToMatch() {
    matchStack = {
      type: TOKEN,
      syntax: state.syntax,
      token,
      prev: matchStack
    };
    moveToNextToken();
    syntaxStash = null;
    if (tokenIndex > longestMatch) {
      longestMatch = tokenIndex;
    }
  }
  function openSyntax() {
    syntaxStack = {
      syntax: state.syntax,
      opts: state.syntax.opts || syntaxStack !== null && syntaxStack.opts || null,
      prev: syntaxStack
    };
    matchStack = {
      type: OPEN_SYNTAX,
      syntax: state.syntax,
      token: matchStack.token,
      prev: matchStack
    };
  }
  function closeSyntax() {
    if (matchStack.type === OPEN_SYNTAX) {
      matchStack = matchStack.prev;
    } else {
      matchStack = {
        type: CLOSE_SYNTAX,
        syntax: syntaxStack.syntax,
        token: matchStack.token,
        prev: matchStack
      };
    }
    syntaxStack = syntaxStack.prev;
  }
  let syntaxStack = null;
  let thenStack = null;
  let elseStack = null;
  let syntaxStash = null;
  let iterationCount = 0;
  let exitReason = null;
  let token = null;
  let tokenIndex = -1;
  let longestMatch = 0;
  let matchStack = {
    type: STUB,
    syntax: null,
    token: null,
    prev: null
  };
  moveToNextToken();
  while (exitReason === null && ++iterationCount < ITERATION_LIMIT) {
    switch (state.type) {
      case "Match":
        if (thenStack === null) {
          if (token !== null) {
            if (tokenIndex !== tokens.length - 1 || token.value !== "\\0" && token.value !== "\\9") {
              state = MISMATCH;
              break;
            }
          }
          exitReason = EXIT_REASON_MATCH;
          break;
        }
        state = thenStack.nextState;
        if (state === DISALLOW_EMPTY) {
          if (thenStack.matchStack === matchStack) {
            state = MISMATCH;
            break;
          } else {
            state = MATCH;
          }
        }
        while (thenStack.syntaxStack !== syntaxStack) {
          closeSyntax();
        }
        thenStack = thenStack.prev;
        break;
      case "Mismatch":
        if (syntaxStash !== null && syntaxStash !== false) {
          if (elseStack === null || tokenIndex > elseStack.tokenIndex) {
            elseStack = syntaxStash;
            syntaxStash = false;
          }
        } else if (elseStack === null) {
          exitReason = EXIT_REASON_MISMATCH;
          break;
        }
        state = elseStack.nextState;
        thenStack = elseStack.thenStack;
        syntaxStack = elseStack.syntaxStack;
        matchStack = elseStack.matchStack;
        tokenIndex = elseStack.tokenIndex;
        token = tokenIndex < tokens.length ? tokens[tokenIndex] : null;
        elseStack = elseStack.prev;
        break;
      case "MatchGraph":
        state = state.match;
        break;
      case "If":
        if (state.else !== MISMATCH) {
          pushElseStack(state.else);
        }
        if (state.then !== MATCH) {
          pushThenStack(state.then);
        }
        state = state.match;
        break;
      case "MatchOnce":
        state = {
          type: "MatchOnceBuffer",
          syntax: state,
          index: 0,
          mask: 0
        };
        break;
      case "MatchOnceBuffer": {
        const terms = state.syntax.terms;
        if (state.index === terms.length) {
          if (state.mask === 0 || state.syntax.all) {
            state = MISMATCH;
            break;
          }
          state = MATCH;
          break;
        }
        if (state.mask === (1 << terms.length) - 1) {
          state = MATCH;
          break;
        }
        for (;state.index < terms.length; state.index++) {
          const matchFlag = 1 << state.index;
          if ((state.mask & matchFlag) === 0) {
            pushElseStack(state);
            pushThenStack({
              type: "AddMatchOnce",
              syntax: state.syntax,
              mask: state.mask | matchFlag
            });
            state = terms[state.index++];
            break;
          }
        }
        break;
      }
      case "AddMatchOnce":
        state = {
          type: "MatchOnceBuffer",
          syntax: state.syntax,
          index: 0,
          mask: state.mask
        };
        break;
      case "Enum":
        if (token !== null) {
          let name = token.value.toLowerCase();
          if (name.indexOf("\\") !== -1) {
            name = name.replace(/\\[09].*$/, "");
          }
          if (hasOwnProperty3.call(state.map, name)) {
            state = state.map[name];
            break;
          }
        }
        state = MISMATCH;
        break;
      case "Generic": {
        const opts = syntaxStack !== null ? syntaxStack.opts : null;
        const lastTokenIndex2 = tokenIndex + Math.floor(state.fn(token, getNextToken, opts));
        if (!isNaN(lastTokenIndex2) && lastTokenIndex2 > tokenIndex) {
          while (tokenIndex < lastTokenIndex2) {
            addTokenToMatch();
          }
          state = MATCH;
        } else {
          state = MISMATCH;
        }
        break;
      }
      case "Type":
      case "Property": {
        const syntaxDict = state.type === "Type" ? "types" : "properties";
        const dictSyntax = hasOwnProperty3.call(syntaxes, syntaxDict) ? syntaxes[syntaxDict][state.name] : null;
        if (!dictSyntax || !dictSyntax.match) {
          throw new Error("Bad syntax reference: " + (state.type === "Type" ? "<" + state.name + ">" : "<'" + state.name + "'>"));
        }
        if (syntaxStash !== false && token !== null && state.type === "Type") {
          const lowPriorityMatching = state.name === "custom-ident" && token.type === Ident || state.name === "length" && token.value === "0";
          if (lowPriorityMatching) {
            if (syntaxStash === null) {
              syntaxStash = stateSnapshotFromSyntax(state, elseStack);
            }
            state = MISMATCH;
            break;
          }
        }
        openSyntax();
        state = dictSyntax.matchRef || dictSyntax.match;
        break;
      }
      case "Keyword": {
        const name = state.name;
        if (token !== null) {
          let keywordName = token.value;
          if (keywordName.indexOf("\\") !== -1) {
            keywordName = keywordName.replace(/\\[09].*$/, "");
          }
          if (areStringsEqualCaseInsensitive(keywordName, name)) {
            addTokenToMatch();
            state = MATCH;
            break;
          }
        }
        state = MISMATCH;
        break;
      }
      case "AtKeyword":
      case "Function":
        if (token !== null && areStringsEqualCaseInsensitive(token.value, state.name)) {
          addTokenToMatch();
          state = MATCH;
          break;
        }
        state = MISMATCH;
        break;
      case "Token":
        if (token !== null && token.value === state.value) {
          addTokenToMatch();
          state = MATCH;
          break;
        }
        state = MISMATCH;
        break;
      case "Comma":
        if (token !== null && token.type === Comma) {
          if (isCommaContextStart(matchStack.token)) {
            state = MISMATCH;
          } else {
            addTokenToMatch();
            state = isCommaContextEnd(token) ? MISMATCH : MATCH;
          }
        } else {
          state = isCommaContextStart(matchStack.token) || isCommaContextEnd(token) ? MATCH : MISMATCH;
        }
        break;
      case "String":
        let string = "";
        let lastTokenIndex = tokenIndex;
        for (;lastTokenIndex < tokens.length && string.length < state.value.length; lastTokenIndex++) {
          string += tokens[lastTokenIndex].value;
        }
        if (areStringsEqualCaseInsensitive(string, state.value)) {
          while (tokenIndex < lastTokenIndex) {
            addTokenToMatch();
          }
          state = MATCH;
        } else {
          state = MISMATCH;
        }
        break;
      default:
        throw new Error("Unknown node type: " + state.type);
    }
  }
  totalIterationCount += iterationCount;
  switch (exitReason) {
    case null:
      console.warn("[csstree-match] BREAK after " + ITERATION_LIMIT + " iterations");
      exitReason = EXIT_REASON_ITERATION_LIMIT;
      matchStack = null;
      break;
    case EXIT_REASON_MATCH:
      while (syntaxStack !== null) {
        closeSyntax();
      }
      break;
    default:
      matchStack = null;
  }
  return {
    tokens,
    reason: exitReason,
    iterations: iterationCount,
    match: matchStack,
    longestMatch
  };
}
function matchAsTree(tokens, matchGraph, syntaxes) {
  const matchResult = internalMatch(tokens, matchGraph, syntaxes || {});
  if (matchResult.match === null) {
    return matchResult;
  }
  let item = matchResult.match;
  let host = matchResult.match = {
    syntax: matchGraph.syntax || null,
    match: []
  };
  const hostStack = [host];
  item = reverseList(item).prev;
  while (item !== null) {
    switch (item.type) {
      case OPEN_SYNTAX:
        host.match.push(host = {
          syntax: item.syntax,
          match: []
        });
        hostStack.push(host);
        break;
      case CLOSE_SYNTAX:
        hostStack.pop();
        host = hostStack[hostStack.length - 1];
        break;
      default:
        host.match.push({
          syntax: item.syntax || null,
          token: item.token.value,
          node: item.token.node
        });
    }
    item = item.prev;
  }
  return matchResult;
}

// ../../../node_modules/css-tree/lib/lexer/trace.js
var exports_trace = {};
__export(exports_trace, {
  isType: () => isType,
  isProperty: () => isProperty,
  isKeyword: () => isKeyword,
  getTrace: () => getTrace
});
function getTrace(node) {
  function shouldPutToTrace(syntax) {
    if (syntax === null) {
      return false;
    }
    return syntax.type === "Type" || syntax.type === "Property" || syntax.type === "Keyword";
  }
  function hasMatch(matchNode) {
    if (Array.isArray(matchNode.match)) {
      for (let i = 0;i < matchNode.match.length; i++) {
        if (hasMatch(matchNode.match[i])) {
          if (shouldPutToTrace(matchNode.syntax)) {
            result.unshift(matchNode.syntax);
          }
          return true;
        }
      }
    } else if (matchNode.node === node) {
      result = shouldPutToTrace(matchNode.syntax) ? [matchNode.syntax] : [];
      return true;
    }
    return false;
  }
  let result = null;
  if (this.matched !== null) {
    hasMatch(this.matched);
  }
  return result;
}
function isType(node, type) {
  return testNode(this, node, (match) => match.type === "Type" && match.name === type);
}
function isProperty(node, property2) {
  return testNode(this, node, (match) => match.type === "Property" && match.name === property2);
}
function isKeyword(node) {
  return testNode(this, node, (match) => match.type === "Keyword");
}
function testNode(match, node, fn) {
  const trace = getTrace.call(match, node);
  if (trace === null) {
    return false;
  }
  return trace.some(fn);
}

// ../../../node_modules/css-tree/lib/lexer/search.js
function getFirstMatchNode(matchNode) {
  if ("node" in matchNode) {
    return matchNode.node;
  }
  return getFirstMatchNode(matchNode.match[0]);
}
function getLastMatchNode(matchNode) {
  if ("node" in matchNode) {
    return matchNode.node;
  }
  return getLastMatchNode(matchNode.match[matchNode.match.length - 1]);
}
function matchFragments(lexer, ast, match, type, name) {
  function findFragments(matchNode) {
    if (matchNode.syntax !== null && matchNode.syntax.type === type && matchNode.syntax.name === name) {
      const start = getFirstMatchNode(matchNode);
      const end = getLastMatchNode(matchNode);
      lexer.syntax.walk(ast, function(node, item, list) {
        if (node === start) {
          const nodes = new List;
          do {
            nodes.appendData(item.data);
            if (item.data === end) {
              break;
            }
            item = item.next;
          } while (item !== null);
          fragments.push({
            parent: list,
            nodes
          });
        }
      });
    }
    if (Array.isArray(matchNode.match)) {
      matchNode.match.forEach(findFragments);
    }
  }
  const fragments = [];
  if (match.matched !== null) {
    findFragments(match.matched);
  }
  return fragments;
}

// ../../../node_modules/css-tree/lib/lexer/structure.js
var { hasOwnProperty: hasOwnProperty4 } = Object.prototype;
function isValidNumber(value) {
  return typeof value === "number" && isFinite(value) && Math.floor(value) === value && value >= 0;
}
function isValidLocation(loc) {
  return Boolean(loc) && isValidNumber(loc.offset) && isValidNumber(loc.line) && isValidNumber(loc.column);
}
function createNodeStructureChecker(type, fields) {
  return function checkNode(node, warn) {
    if (!node || node.constructor !== Object) {
      return warn(node, "Type of node should be an Object");
    }
    for (let key in node) {
      let valid = true;
      if (hasOwnProperty4.call(node, key) === false) {
        continue;
      }
      if (key === "type") {
        if (node.type !== type) {
          warn(node, "Wrong node type `" + node.type + "`, expected `" + type + "`");
        }
      } else if (key === "loc") {
        if (node.loc === null) {
          continue;
        } else if (node.loc && node.loc.constructor === Object) {
          if (typeof node.loc.source !== "string") {
            key += ".source";
          } else if (!isValidLocation(node.loc.start)) {
            key += ".start";
          } else if (!isValidLocation(node.loc.end)) {
            key += ".end";
          } else {
            continue;
          }
        }
        valid = false;
      } else if (fields.hasOwnProperty(key)) {
        valid = false;
        for (let i = 0;!valid && i < fields[key].length; i++) {
          const fieldType = fields[key][i];
          switch (fieldType) {
            case String:
              valid = typeof node[key] === "string";
              break;
            case Boolean:
              valid = typeof node[key] === "boolean";
              break;
            case null:
              valid = node[key] === null;
              break;
            default:
              if (typeof fieldType === "string") {
                valid = node[key] && node[key].type === fieldType;
              } else if (Array.isArray(fieldType)) {
                valid = node[key] instanceof List;
              }
          }
        }
      } else {
        warn(node, "Unknown field `" + key + "` for " + type + " node type");
      }
      if (!valid) {
        warn(node, "Bad value for `" + type + "." + key + "`");
      }
    }
    for (const key in fields) {
      if (hasOwnProperty4.call(fields, key) && hasOwnProperty4.call(node, key) === false) {
        warn(node, "Field `" + type + "." + key + "` is missed");
      }
    }
  };
}
function genTypesList(fieldTypes, path) {
  const docsTypes = [];
  for (let i = 0;i < fieldTypes.length; i++) {
    const fieldType = fieldTypes[i];
    if (fieldType === String || fieldType === Boolean) {
      docsTypes.push(fieldType.name.toLowerCase());
    } else if (fieldType === null) {
      docsTypes.push("null");
    } else if (typeof fieldType === "string") {
      docsTypes.push(fieldType);
    } else if (Array.isArray(fieldType)) {
      docsTypes.push("List<" + (genTypesList(fieldType, path) || "any") + ">");
    } else {
      throw new Error("Wrong value `" + fieldType + "` in `" + path + "` structure definition");
    }
  }
  return docsTypes.join(" | ");
}
function processStructure(name, nodeType) {
  const structure = nodeType.structure;
  const fields = {
    type: String,
    loc: true
  };
  const docs = {
    type: '"' + name + '"'
  };
  for (const key in structure) {
    if (hasOwnProperty4.call(structure, key) === false) {
      continue;
    }
    const fieldTypes = fields[key] = Array.isArray(structure[key]) ? structure[key].slice() : [structure[key]];
    docs[key] = genTypesList(fieldTypes, name + "." + key);
  }
  return {
    docs,
    check: createNodeStructureChecker(name, fields)
  };
}
function getStructureFromConfig(config) {
  const structure = {};
  if (config.node) {
    for (const name in config.node) {
      if (hasOwnProperty4.call(config.node, name)) {
        const nodeType = config.node[name];
        if (nodeType.structure) {
          structure[name] = processStructure(name, nodeType);
        } else {
          throw new Error("Missed `structure` field in `" + name + "` node type definition");
        }
      }
    }
  }
  return structure;
}

// ../../../node_modules/css-tree/lib/lexer/Lexer.js
function dumpMapSyntax(map, compact, syntaxAsAst) {
  const result = {};
  for (const name in map) {
    if (map[name].syntax) {
      result[name] = syntaxAsAst ? map[name].syntax : generate(map[name].syntax, { compact });
    }
  }
  return result;
}
function dumpAtruleMapSyntax(map, compact, syntaxAsAst) {
  const result = {};
  for (const [name, atrule] of Object.entries(map)) {
    result[name] = {
      prelude: atrule.prelude && (syntaxAsAst ? atrule.prelude.syntax : generate(atrule.prelude.syntax, { compact })),
      descriptors: atrule.descriptors && dumpMapSyntax(atrule.descriptors, compact, syntaxAsAst)
    };
  }
  return result;
}
function valueHasVar(tokens) {
  for (let i = 0;i < tokens.length; i++) {
    if (tokens[i].value.toLowerCase() === "var(") {
      return true;
    }
  }
  return false;
}
function syntaxHasTopLevelCommaMultiplier(syntax) {
  const singleTerm = syntax.terms[0];
  return syntax.explicit === false && syntax.terms.length === 1 && singleTerm.type === "Multiplier" && singleTerm.comma === true;
}
function buildMatchResult(matched, error, iterations) {
  return {
    matched,
    iterations,
    error,
    ...exports_trace
  };
}
function matchSyntax(lexer, syntax, value, useCssWideKeywords) {
  const tokens = prepare_tokens_default(value, lexer.syntax);
  let result;
  if (valueHasVar(tokens)) {
    return buildMatchResult(null, new Error("Matching for a tree with var() is not supported"));
  }
  if (useCssWideKeywords) {
    result = matchAsTree(tokens, lexer.cssWideKeywordsSyntax, lexer);
  }
  if (!useCssWideKeywords || !result.match) {
    result = matchAsTree(tokens, syntax.match, lexer);
    if (!result.match) {
      return buildMatchResult(null, new SyntaxMatchError(result.reason, syntax.syntax, value, result), result.iterations);
    }
  }
  return buildMatchResult(result.match, null, result.iterations);
}

class Lexer {
  constructor(config, syntax, structure) {
    this.cssWideKeywords = cssWideKeywords;
    this.syntax = syntax;
    this.generic = false;
    this.units = { ...exports_units };
    this.atrules = Object.create(null);
    this.properties = Object.create(null);
    this.types = Object.create(null);
    this.structure = structure || getStructureFromConfig(config);
    if (config) {
      if (config.cssWideKeywords) {
        this.cssWideKeywords = config.cssWideKeywords;
      }
      if (config.units) {
        for (const group of Object.keys(exports_units)) {
          if (Array.isArray(config.units[group])) {
            this.units[group] = config.units[group];
          }
        }
      }
      if (config.types) {
        for (const [name, type] of Object.entries(config.types)) {
          this.addType_(name, type);
        }
      }
      if (config.generic) {
        this.generic = true;
        for (const [name, value] of Object.entries(createGenericTypes(this.units))) {
          this.addType_(name, value);
        }
      }
      if (config.atrules) {
        for (const [name, atrule] of Object.entries(config.atrules)) {
          this.addAtrule_(name, atrule);
        }
      }
      if (config.properties) {
        for (const [name, property2] of Object.entries(config.properties)) {
          this.addProperty_(name, property2);
        }
      }
    }
    this.cssWideKeywordsSyntax = buildMatchGraph(this.cssWideKeywords.join(" |  "));
  }
  checkStructure(ast) {
    function collectWarning(node, message) {
      warns.push({ node, message });
    }
    const structure = this.structure;
    const warns = [];
    this.syntax.walk(ast, function(node) {
      if (structure.hasOwnProperty(node.type)) {
        structure[node.type].check(node, collectWarning);
      } else {
        collectWarning(node, "Unknown node type `" + node.type + "`");
      }
    });
    return warns.length ? warns : false;
  }
  createDescriptor(syntax, type, name, parent2 = null) {
    const ref = {
      type,
      name
    };
    const descriptor = {
      type,
      name,
      parent: parent2,
      serializable: typeof syntax === "string" || syntax && typeof syntax.type === "string",
      syntax: null,
      match: null,
      matchRef: null
    };
    if (typeof syntax === "function") {
      descriptor.match = buildMatchGraph(syntax, ref);
    } else {
      if (typeof syntax === "string") {
        Object.defineProperty(descriptor, "syntax", {
          get() {
            Object.defineProperty(descriptor, "syntax", {
              value: parse(syntax)
            });
            return descriptor.syntax;
          }
        });
      } else {
        descriptor.syntax = syntax;
      }
      Object.defineProperty(descriptor, "match", {
        get() {
          Object.defineProperty(descriptor, "match", {
            value: buildMatchGraph(descriptor.syntax, ref)
          });
          return descriptor.match;
        }
      });
      if (type === "Property") {
        Object.defineProperty(descriptor, "matchRef", {
          get() {
            const syntax2 = descriptor.syntax;
            const value = syntaxHasTopLevelCommaMultiplier(syntax2) ? buildMatchGraph({
              ...syntax2,
              terms: [syntax2.terms[0].term]
            }, ref) : null;
            Object.defineProperty(descriptor, "matchRef", {
              value
            });
            return value;
          }
        });
      }
    }
    return descriptor;
  }
  addAtrule_(name, syntax) {
    if (!syntax) {
      return;
    }
    this.atrules[name] = {
      type: "Atrule",
      name,
      prelude: syntax.prelude ? this.createDescriptor(syntax.prelude, "AtrulePrelude", name) : null,
      descriptors: syntax.descriptors ? Object.keys(syntax.descriptors).reduce((map, descName) => {
        map[descName] = this.createDescriptor(syntax.descriptors[descName], "AtruleDescriptor", descName, name);
        return map;
      }, Object.create(null)) : null
    };
  }
  addProperty_(name, syntax) {
    if (!syntax) {
      return;
    }
    this.properties[name] = this.createDescriptor(syntax, "Property", name);
  }
  addType_(name, syntax) {
    if (!syntax) {
      return;
    }
    this.types[name] = this.createDescriptor(syntax, "Type", name);
  }
  checkAtruleName(atruleName) {
    if (!this.getAtrule(atruleName)) {
      return new SyntaxReferenceError("Unknown at-rule", "@" + atruleName);
    }
  }
  checkAtrulePrelude(atruleName, prelude) {
    const error = this.checkAtruleName(atruleName);
    if (error) {
      return error;
    }
    const atrule = this.getAtrule(atruleName);
    if (!atrule.prelude && prelude) {
      return new SyntaxError("At-rule `@" + atruleName + "` should not contain a prelude");
    }
    if (atrule.prelude && !prelude) {
      if (!matchSyntax(this, atrule.prelude, "", false).matched) {
        return new SyntaxError("At-rule `@" + atruleName + "` should contain a prelude");
      }
    }
  }
  checkAtruleDescriptorName(atruleName, descriptorName) {
    const error = this.checkAtruleName(atruleName);
    if (error) {
      return error;
    }
    const atrule = this.getAtrule(atruleName);
    const descriptor = keyword(descriptorName);
    if (!atrule.descriptors) {
      return new SyntaxError("At-rule `@" + atruleName + "` has no known descriptors");
    }
    if (!atrule.descriptors[descriptor.name] && !atrule.descriptors[descriptor.basename]) {
      return new SyntaxReferenceError("Unknown at-rule descriptor", descriptorName);
    }
  }
  checkPropertyName(propertyName) {
    if (!this.getProperty(propertyName)) {
      return new SyntaxReferenceError("Unknown property", propertyName);
    }
  }
  matchAtrulePrelude(atruleName, prelude) {
    const error = this.checkAtrulePrelude(atruleName, prelude);
    if (error) {
      return buildMatchResult(null, error);
    }
    const atrule = this.getAtrule(atruleName);
    if (!atrule.prelude) {
      return buildMatchResult(null, null);
    }
    return matchSyntax(this, atrule.prelude, prelude || "", false);
  }
  matchAtruleDescriptor(atruleName, descriptorName, value) {
    const error = this.checkAtruleDescriptorName(atruleName, descriptorName);
    if (error) {
      return buildMatchResult(null, error);
    }
    const atrule = this.getAtrule(atruleName);
    const descriptor = keyword(descriptorName);
    return matchSyntax(this, atrule.descriptors[descriptor.name] || atrule.descriptors[descriptor.basename], value, false);
  }
  matchDeclaration(node) {
    if (node.type !== "Declaration") {
      return buildMatchResult(null, new Error("Not a Declaration node"));
    }
    return this.matchProperty(node.property, node.value);
  }
  matchProperty(propertyName, value) {
    if (property(propertyName).custom) {
      return buildMatchResult(null, new Error("Lexer matching doesn't applicable for custom properties"));
    }
    const error = this.checkPropertyName(propertyName);
    if (error) {
      return buildMatchResult(null, error);
    }
    return matchSyntax(this, this.getProperty(propertyName), value, true);
  }
  matchType(typeName, value) {
    const typeSyntax = this.getType(typeName);
    if (!typeSyntax) {
      return buildMatchResult(null, new SyntaxReferenceError("Unknown type", typeName));
    }
    return matchSyntax(this, typeSyntax, value, false);
  }
  match(syntax, value) {
    if (typeof syntax !== "string" && (!syntax || !syntax.type)) {
      return buildMatchResult(null, new SyntaxReferenceError("Bad syntax"));
    }
    if (typeof syntax === "string" || !syntax.match) {
      syntax = this.createDescriptor(syntax, "Type", "anonymous");
    }
    return matchSyntax(this, syntax, value, false);
  }
  findValueFragments(propertyName, value, type, name) {
    return matchFragments(this, value, this.matchProperty(propertyName, value), type, name);
  }
  findDeclarationValueFragments(declaration, type, name) {
    return matchFragments(this, declaration.value, this.matchDeclaration(declaration), type, name);
  }
  findAllFragments(ast, type, name) {
    const result = [];
    this.syntax.walk(ast, {
      visit: "Declaration",
      enter: (declaration) => {
        result.push.apply(result, this.findDeclarationValueFragments(declaration, type, name));
      }
    });
    return result;
  }
  getAtrule(atruleName, fallbackBasename = true) {
    const atrule = keyword(atruleName);
    const atruleEntry = atrule.vendor && fallbackBasename ? this.atrules[atrule.name] || this.atrules[atrule.basename] : this.atrules[atrule.name];
    return atruleEntry || null;
  }
  getAtrulePrelude(atruleName, fallbackBasename = true) {
    const atrule = this.getAtrule(atruleName, fallbackBasename);
    return atrule && atrule.prelude || null;
  }
  getAtruleDescriptor(atruleName, name) {
    return this.atrules.hasOwnProperty(atruleName) && this.atrules.declarators ? this.atrules[atruleName].declarators[name] || null : null;
  }
  getProperty(propertyName, fallbackBasename = true) {
    const property2 = property(propertyName);
    const propertyEntry = property2.vendor && fallbackBasename ? this.properties[property2.name] || this.properties[property2.basename] : this.properties[property2.name];
    return propertyEntry || null;
  }
  getType(name) {
    return hasOwnProperty.call(this.types, name) ? this.types[name] : null;
  }
  validate() {
    function syntaxRef(name, isType2) {
      return isType2 ? `<${name}>` : `<'${name}'>`;
    }
    function validate(syntax, name, broken, descriptor) {
      if (broken.has(name)) {
        return broken.get(name);
      }
      broken.set(name, false);
      if (descriptor.syntax !== null) {
        walk(descriptor.syntax, function(node) {
          if (node.type !== "Type" && node.type !== "Property") {
            return;
          }
          const map = node.type === "Type" ? syntax.types : syntax.properties;
          const brokenMap = node.type === "Type" ? brokenTypes : brokenProperties;
          if (!hasOwnProperty.call(map, node.name)) {
            errors.push(`${syntaxRef(name, broken === brokenTypes)} used missed syntax definition ${syntaxRef(node.name, node.type === "Type")}`);
            broken.set(name, true);
          } else if (validate(syntax, node.name, brokenMap, map[node.name])) {
            errors.push(`${syntaxRef(name, broken === brokenTypes)} used broken syntax definition ${syntaxRef(node.name, node.type === "Type")}`);
            broken.set(name, true);
          }
        }, this);
      }
    }
    const errors = [];
    let brokenTypes = new Map;
    let brokenProperties = new Map;
    for (const key in this.types) {
      validate(this, key, brokenTypes, this.types[key]);
    }
    for (const key in this.properties) {
      validate(this, key, brokenProperties, this.properties[key]);
    }
    const brokenTypesArray = [...brokenTypes.keys()].filter((name) => brokenTypes.get(name));
    const brokenPropertiesArray = [...brokenProperties.keys()].filter((name) => brokenProperties.get(name));
    if (brokenTypesArray.length || brokenPropertiesArray.length) {
      return {
        errors,
        types: brokenTypesArray,
        properties: brokenPropertiesArray
      };
    }
    return null;
  }
  dump(syntaxAsAst, pretty) {
    return {
      generic: this.generic,
      cssWideKeywords: this.cssWideKeywords,
      units: this.units,
      types: dumpMapSyntax(this.types, !pretty, syntaxAsAst),
      properties: dumpMapSyntax(this.properties, !pretty, syntaxAsAst),
      atrules: dumpAtruleMapSyntax(this.atrules, !pretty, syntaxAsAst)
    };
  }
  toString() {
    return JSON.stringify(this.dump());
  }
}

// ../../../node_modules/css-tree/lib/syntax/config/mix.js
function appendOrSet(a, b) {
  if (typeof b === "string" && /^\s*\|/.test(b)) {
    return typeof a === "string" ? a + b : b.replace(/^\s*\|\s*/, "");
  }
  return b || null;
}
function sliceProps(obj, props) {
  const result = Object.create(null);
  for (const [key, value] of Object.entries(obj)) {
    if (value) {
      result[key] = {};
      for (const prop of Object.keys(value)) {
        if (props.includes(prop)) {
          result[key][prop] = value[prop];
        }
      }
    }
  }
  return result;
}
function mix(dest, src) {
  const result = { ...dest };
  for (const [prop, value] of Object.entries(src)) {
    switch (prop) {
      case "generic":
        result[prop] = Boolean(value);
        break;
      case "cssWideKeywords":
        result[prop] = dest[prop] ? [...dest[prop], ...value] : value || [];
        break;
      case "units":
        result[prop] = { ...dest[prop] };
        for (const [name, patch] of Object.entries(value)) {
          result[prop][name] = Array.isArray(patch) ? patch : [];
        }
        break;
      case "atrules":
        result[prop] = { ...dest[prop] };
        for (const [name, atrule] of Object.entries(value)) {
          const exists = result[prop][name] || {};
          const current = result[prop][name] = {
            prelude: exists.prelude || null,
            descriptors: {
              ...exists.descriptors
            }
          };
          if (!atrule) {
            continue;
          }
          current.prelude = atrule.prelude ? appendOrSet(current.prelude, atrule.prelude) : current.prelude || null;
          for (const [descriptorName, descriptorValue] of Object.entries(atrule.descriptors || {})) {
            current.descriptors[descriptorName] = descriptorValue ? appendOrSet(current.descriptors[descriptorName], descriptorValue) : null;
          }
          if (!Object.keys(current.descriptors).length) {
            current.descriptors = null;
          }
        }
        break;
      case "types":
      case "properties":
        result[prop] = { ...dest[prop] };
        for (const [name, syntax] of Object.entries(value)) {
          result[prop][name] = appendOrSet(result[prop][name], syntax);
        }
        break;
      case "scope":
      case "features":
        result[prop] = { ...dest[prop] };
        for (const [name, props] of Object.entries(value)) {
          result[prop][name] = { ...result[prop][name], ...props };
        }
        break;
      case "parseContext":
        result[prop] = {
          ...dest[prop],
          ...value
        };
        break;
      case "atrule":
      case "pseudo":
        result[prop] = {
          ...dest[prop],
          ...sliceProps(value, ["parse"])
        };
        break;
      case "node":
        result[prop] = {
          ...dest[prop],
          ...sliceProps(value, ["name", "structure", "parse", "generate", "walkContext"])
        };
        break;
    }
  }
  return result;
}

// ../../../node_modules/css-tree/lib/syntax/create.js
function createSyntax(config) {
  const parse2 = createParser(config);
  const walk2 = createWalker(config);
  const generate2 = createGenerator(config);
  const { fromPlainObject, toPlainObject } = createConvertor(walk2);
  const syntax = {
    lexer: null,
    createLexer: (config2) => new Lexer(config2, syntax, syntax.lexer.structure),
    tokenize,
    parse: parse2,
    generate: generate2,
    walk: walk2,
    find: walk2.find,
    findLast: walk2.findLast,
    findAll: walk2.findAll,
    fromPlainObject,
    toPlainObject,
    fork(extension) {
      const base = mix({}, config);
      return createSyntax(typeof extension === "function" ? extension(base) : mix(base, extension));
    }
  };
  syntax.lexer = new Lexer({
    generic: config.generic,
    cssWideKeywords: config.cssWideKeywords,
    units: config.units,
    types: config.types,
    atrules: config.atrules,
    properties: config.properties,
    node: config.node
  }, syntax);
  return syntax;
}
var create_default = (config) => createSyntax(mix({}, config));

// ../../../node_modules/css-tree/dist/data.js
var data_default = {
  generic: true,
  cssWideKeywords: [
    "initial",
    "inherit",
    "unset",
    "revert",
    "revert-layer"
  ],
  units: {
    angle: [
      "deg",
      "grad",
      "rad",
      "turn"
    ],
    decibel: [
      "db"
    ],
    flex: [
      "fr"
    ],
    frequency: [
      "hz",
      "khz"
    ],
    length: [
      "cm",
      "mm",
      "q",
      "in",
      "pt",
      "pc",
      "px",
      "em",
      "rem",
      "ex",
      "rex",
      "cap",
      "rcap",
      "ch",
      "rch",
      "ic",
      "ric",
      "lh",
      "rlh",
      "vw",
      "svw",
      "lvw",
      "dvw",
      "vh",
      "svh",
      "lvh",
      "dvh",
      "vi",
      "svi",
      "lvi",
      "dvi",
      "vb",
      "svb",
      "lvb",
      "dvb",
      "vmin",
      "svmin",
      "lvmin",
      "dvmin",
      "vmax",
      "svmax",
      "lvmax",
      "dvmax",
      "cqw",
      "cqh",
      "cqi",
      "cqb",
      "cqmin",
      "cqmax"
    ],
    resolution: [
      "dpi",
      "dpcm",
      "dppx",
      "x"
    ],
    semitones: [
      "st"
    ],
    time: [
      "s",
      "ms"
    ]
  },
  types: {
    "abs()": "abs( <calc-sum> )",
    "absolute-size": "xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large",
    "acos()": "acos( <calc-sum> )",
    "alpha-value": "<number>|<percentage>",
    "angle-percentage": "<angle>|<percentage>",
    "angular-color-hint": "<angle-percentage>",
    "angular-color-stop": "<color>&&<color-stop-angle>?",
    "angular-color-stop-list": "[<angular-color-stop> [, <angular-color-hint>]?]# , <angular-color-stop>",
    "animateable-feature": "scroll-position|contents|<custom-ident>",
    "asin()": "asin( <calc-sum> )",
    "atan()": "atan( <calc-sum> )",
    "atan2()": "atan2( <calc-sum> , <calc-sum> )",
    attachment: "scroll|fixed|local",
    "attr()": "attr( <attr-name> <type-or-unit>? [, <attr-fallback>]? )",
    "attr-matcher": "['~'|'|'|'^'|'$'|'*']? '='",
    "attr-modifier": "i|s",
    "attribute-selector": "'[' <wq-name> ']'|'[' <wq-name> <attr-matcher> [<string-token>|<ident-token>] <attr-modifier>? ']'",
    "auto-repeat": "repeat( [auto-fill|auto-fit] , [<line-names>? <fixed-size>]+ <line-names>? )",
    "auto-track-list": "[<line-names>? [<fixed-size>|<fixed-repeat>]]* <line-names>? <auto-repeat> [<line-names>? [<fixed-size>|<fixed-repeat>]]* <line-names>?",
    axis: "block|inline|x|y",
    "baseline-position": "[first|last]? baseline",
    "basic-shape": "<inset()>|<xywh()>|<rect()>|<circle()>|<ellipse()>|<polygon()>|<path()>",
    "bg-image": "none|<image>",
    "bg-layer": "<bg-image>||<bg-position> [/ <bg-size>]?||<repeat-style>||<attachment>||<box>||<box>",
    "bg-position": "[[left|center|right|top|bottom|<length-percentage>]|[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]|[center|[left|right] <length-percentage>?]&&[center|[top|bottom] <length-percentage>?]]",
    "bg-size": "[<length-percentage>|auto]{1,2}|cover|contain",
    "blur()": "blur( <length> )",
    "blend-mode": "normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity",
    box: "border-box|padding-box|content-box",
    "brightness()": "brightness( <number-percentage> )",
    "calc()": "calc( <calc-sum> )",
    "calc-sum": "<calc-product> [['+'|'-'] <calc-product>]*",
    "calc-product": "<calc-value> ['*' <calc-value>|'/' <number>]*",
    "calc-value": "<number>|<dimension>|<percentage>|<calc-constant>|( <calc-sum> )",
    "calc-constant": "e|pi|infinity|-infinity|NaN",
    "cf-final-image": "<image>|<color>",
    "cf-mixing-image": "<percentage>?&&<image>",
    "circle()": "circle( [<shape-radius>]? [at <position>]? )",
    "clamp()": "clamp( <calc-sum>#{3} )",
    "class-selector": "'.' <ident-token>",
    "clip-source": "<url>",
    color: "<color-base>|currentColor|<system-color>|<device-cmyk()>|<light-dark()>|<-non-standard-color>",
    "color-stop": "<color-stop-length>|<color-stop-angle>",
    "color-stop-angle": "<angle-percentage>{1,2}",
    "color-stop-length": "<length-percentage>{1,2}",
    "color-stop-list": "[<linear-color-stop> [, <linear-color-hint>]?]# , <linear-color-stop>",
    "color-interpolation-method": "in [<rectangular-color-space>|<polar-color-space> <hue-interpolation-method>?|<custom-color-space>]",
    combinator: "'>'|'+'|'~'|['|' '|']",
    "common-lig-values": "[common-ligatures|no-common-ligatures]",
    "compat-auto": "searchfield|textarea|push-button|slider-horizontal|checkbox|radio|square-button|menulist|listbox|meter|progress-bar|button",
    "composite-style": "clear|copy|source-over|source-in|source-out|source-atop|destination-over|destination-in|destination-out|destination-atop|xor",
    "compositing-operator": "add|subtract|intersect|exclude",
    "compound-selector": "[<type-selector>? <subclass-selector>*]!",
    "compound-selector-list": "<compound-selector>#",
    "complex-selector": "<complex-selector-unit> [<combinator>? <complex-selector-unit>]*",
    "complex-selector-list": "<complex-selector>#",
    "conic-gradient()": "conic-gradient( [from <angle>]? [at <position>]? , <angular-color-stop-list> )",
    "contextual-alt-values": "[contextual|no-contextual]",
    "content-distribution": "space-between|space-around|space-evenly|stretch",
    "content-list": "[<string>|contents|<image>|<counter>|<quote>|<target>|<leader()>|<attr()>]+",
    "content-position": "center|start|end|flex-start|flex-end",
    "content-replacement": "<image>",
    "contrast()": "contrast( [<number-percentage>] )",
    "cos()": "cos( <calc-sum> )",
    counter: "<counter()>|<counters()>",
    "counter()": "counter( <counter-name> , <counter-style>? )",
    "counter-name": "<custom-ident>",
    "counter-style": "<counter-style-name>|symbols( )",
    "counter-style-name": "<custom-ident>",
    "counters()": "counters( <counter-name> , <string> , <counter-style>? )",
    "cross-fade()": "cross-fade( <cf-mixing-image> , <cf-final-image>? )",
    "cubic-bezier-timing-function": "ease|ease-in|ease-out|ease-in-out|cubic-bezier( <number [0,1]> , <number> , <number [0,1]> , <number> )",
    "deprecated-system-color": "ActiveBorder|ActiveCaption|AppWorkspace|Background|ButtonFace|ButtonHighlight|ButtonShadow|ButtonText|CaptionText|GrayText|Highlight|HighlightText|InactiveBorder|InactiveCaption|InactiveCaptionText|InfoBackground|InfoText|Menu|MenuText|Scrollbar|ThreeDDarkShadow|ThreeDFace|ThreeDHighlight|ThreeDLightShadow|ThreeDShadow|Window|WindowFrame|WindowText",
    "discretionary-lig-values": "[discretionary-ligatures|no-discretionary-ligatures]",
    "display-box": "contents|none",
    "display-inside": "flow|flow-root|table|flex|grid|ruby",
    "display-internal": "table-row-group|table-header-group|table-footer-group|table-row|table-cell|table-column-group|table-column|table-caption|ruby-base|ruby-text|ruby-base-container|ruby-text-container",
    "display-legacy": "inline-block|inline-list-item|inline-table|inline-flex|inline-grid",
    "display-listitem": "<display-outside>?&&[flow|flow-root]?&&list-item",
    "display-outside": "block|inline|run-in",
    "drop-shadow()": "drop-shadow( <length>{2,3} <color>? )",
    "east-asian-variant-values": "[jis78|jis83|jis90|jis04|simplified|traditional]",
    "east-asian-width-values": "[full-width|proportional-width]",
    "element()": "element( <custom-ident> , [first|start|last|first-except]? )|element( <id-selector> )",
    "ellipse()": "ellipse( [<shape-radius>{2}]? [at <position>]? )",
    "ending-shape": "circle|ellipse",
    "env()": "env( <custom-ident> , <declaration-value>? )",
    "exp()": "exp( <calc-sum> )",
    "explicit-track-list": "[<line-names>? <track-size>]+ <line-names>?",
    "family-name": "<string>|<custom-ident>+",
    "feature-tag-value": "<string> [<integer>|on|off]?",
    "feature-type": "@stylistic|@historical-forms|@styleset|@character-variant|@swash|@ornaments|@annotation",
    "feature-value-block": "<feature-type> '{' <feature-value-declaration-list> '}'",
    "feature-value-block-list": "<feature-value-block>+",
    "feature-value-declaration": "<custom-ident> : <integer>+ ;",
    "feature-value-declaration-list": "<feature-value-declaration>",
    "feature-value-name": "<custom-ident>",
    "fill-rule": "nonzero|evenodd",
    "filter-function": "<blur()>|<brightness()>|<contrast()>|<drop-shadow()>|<grayscale()>|<hue-rotate()>|<invert()>|<opacity()>|<saturate()>|<sepia()>",
    "filter-function-list": "[<filter-function>|<url>]+",
    "final-bg-layer": "<'background-color'>||<bg-image>||<bg-position> [/ <bg-size>]?||<repeat-style>||<attachment>||<box>||<box>",
    "fixed-breadth": "<length-percentage>",
    "fixed-repeat": "repeat( [<integer [1,∞]>] , [<line-names>? <fixed-size>]+ <line-names>? )",
    "fixed-size": "<fixed-breadth>|minmax( <fixed-breadth> , <track-breadth> )|minmax( <inflexible-breadth> , <fixed-breadth> )",
    "font-stretch-absolute": "normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded|<percentage>",
    "font-variant-css21": "[normal|small-caps]",
    "font-weight-absolute": "normal|bold|<number [1,1000]>",
    "frequency-percentage": "<frequency>|<percentage>",
    "general-enclosed": "[<function-token> <any-value>? )]|[( <any-value>? )]",
    "generic-family": "<generic-script-specific>|<generic-complete>|<generic-incomplete>|<-non-standard-generic-family>",
    "generic-name": "serif|sans-serif|cursive|fantasy|monospace",
    "geometry-box": "<shape-box>|fill-box|stroke-box|view-box",
    gradient: "<linear-gradient()>|<repeating-linear-gradient()>|<radial-gradient()>|<repeating-radial-gradient()>|<conic-gradient()>|<repeating-conic-gradient()>|<-legacy-gradient>",
    "grayscale()": "grayscale( <number-percentage> )",
    "grid-line": "auto|<custom-ident>|[<integer>&&<custom-ident>?]|[span&&[<integer>||<custom-ident>]]",
    "historical-lig-values": "[historical-ligatures|no-historical-ligatures]",
    "hsl()": "hsl( <hue> <percentage> <percentage> [/ <alpha-value>]? )|hsl( <hue> , <percentage> , <percentage> , <alpha-value>? )",
    "hsla()": "hsla( <hue> <percentage> <percentage> [/ <alpha-value>]? )|hsla( <hue> , <percentage> , <percentage> , <alpha-value>? )",
    hue: "<number>|<angle>",
    "hue-rotate()": "hue-rotate( <angle> )",
    "hue-interpolation-method": "[shorter|longer|increasing|decreasing] hue",
    "hwb()": "hwb( [<hue>|none] [<percentage>|none] [<percentage>|none] [/ [<alpha-value>|none]]? )",
    "hypot()": "hypot( <calc-sum># )",
    image: "<url>|<image()>|<image-set()>|<element()>|<paint()>|<cross-fade()>|<gradient>",
    "image()": "image( <image-tags>? [<image-src>? , <color>?]! )",
    "image-set()": "image-set( <image-set-option># )",
    "image-set-option": "[<image>|<string>] [<resolution>||type( <string> )]",
    "image-src": "<url>|<string>",
    "image-tags": "ltr|rtl",
    "inflexible-breadth": "<length-percentage>|min-content|max-content|auto",
    "inset()": "inset( <length-percentage>{1,4} [round <'border-radius'>]? )",
    "invert()": "invert( <number-percentage> )",
    "keyframes-name": "<custom-ident>|<string>",
    "keyframe-block": "<keyframe-selector># { <declaration-list> }",
    "keyframe-block-list": "<keyframe-block>+",
    "keyframe-selector": "from|to|<percentage>|<timeline-range-name> <percentage>",
    "lab()": "lab( [<percentage>|<number>|none] [<percentage>|<number>|none] [<percentage>|<number>|none] [/ [<alpha-value>|none]]? )",
    "layer()": "layer( <layer-name> )",
    "layer-name": "<ident> ['.' <ident>]*",
    "lch()": "lch( [<percentage>|<number>|none] [<percentage>|<number>|none] [<hue>|none] [/ [<alpha-value>|none]]? )",
    "leader()": "leader( <leader-type> )",
    "leader-type": "dotted|solid|space|<string>",
    "length-percentage": "<length>|<percentage>",
    "light-dark()": "light-dark( <color> , <color> )",
    "line-names": "'[' <custom-ident>* ']'",
    "line-name-list": "[<line-names>|<name-repeat>]+",
    "line-style": "none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset",
    "line-width": "<length>|thin|medium|thick",
    "linear-color-hint": "<length-percentage>",
    "linear-color-stop": "<color> <color-stop-length>?",
    "linear-gradient()": "linear-gradient( [[<angle>|to <side-or-corner>]||<color-interpolation-method>]? , <color-stop-list> )",
    "log()": "log( <calc-sum> , <calc-sum>? )",
    "mask-layer": "<mask-reference>||<position> [/ <bg-size>]?||<repeat-style>||<geometry-box>||[<geometry-box>|no-clip]||<compositing-operator>||<masking-mode>",
    "mask-position": "[<length-percentage>|left|center|right] [<length-percentage>|top|center|bottom]?",
    "mask-reference": "none|<image>|<mask-source>",
    "mask-source": "<url>",
    "masking-mode": "alpha|luminance|match-source",
    "matrix()": "matrix( <number>#{6} )",
    "matrix3d()": "matrix3d( <number>#{16} )",
    "max()": "max( <calc-sum># )",
    "media-and": "<media-in-parens> [and <media-in-parens>]+",
    "media-condition": "<media-not>|<media-and>|<media-or>|<media-in-parens>",
    "media-condition-without-or": "<media-not>|<media-and>|<media-in-parens>",
    "media-feature": "( [<mf-plain>|<mf-boolean>|<mf-range>] )",
    "media-in-parens": "( <media-condition> )|<media-feature>|<general-enclosed>",
    "media-not": "not <media-in-parens>",
    "media-or": "<media-in-parens> [or <media-in-parens>]+",
    "media-query": "<media-condition>|[not|only]? <media-type> [and <media-condition-without-or>]?",
    "media-query-list": "<media-query>#",
    "media-type": "<ident>",
    "mf-boolean": "<mf-name>",
    "mf-name": "<ident>",
    "mf-plain": "<mf-name> : <mf-value>",
    "mf-range": "<mf-name> ['<'|'>']? '='? <mf-value>|<mf-value> ['<'|'>']? '='? <mf-name>|<mf-value> '<' '='? <mf-name> '<' '='? <mf-value>|<mf-value> '>' '='? <mf-name> '>' '='? <mf-value>",
    "mf-value": "<number>|<dimension>|<ident>|<ratio>",
    "min()": "min( <calc-sum># )",
    "minmax()": "minmax( [<length-percentage>|min-content|max-content|auto] , [<length-percentage>|<flex>|min-content|max-content|auto] )",
    "mod()": "mod( <calc-sum> , <calc-sum> )",
    "name-repeat": "repeat( [<integer [1,∞]>|auto-fill] , <line-names>+ )",
    "named-color": "transparent|aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen",
    "namespace-prefix": "<ident>",
    "ns-prefix": "[<ident-token>|'*']? '|'",
    "number-percentage": "<number>|<percentage>",
    "numeric-figure-values": "[lining-nums|oldstyle-nums]",
    "numeric-fraction-values": "[diagonal-fractions|stacked-fractions]",
    "numeric-spacing-values": "[proportional-nums|tabular-nums]",
    nth: "<an-plus-b>|even|odd",
    "opacity()": "opacity( [<number-percentage>] )",
    "overflow-position": "unsafe|safe",
    "outline-radius": "<length>|<percentage>",
    "page-body": "<declaration>? [; <page-body>]?|<page-margin-box> <page-body>",
    "page-margin-box": "<page-margin-box-type> '{' <declaration-list> '}'",
    "page-margin-box-type": "@top-left-corner|@top-left|@top-center|@top-right|@top-right-corner|@bottom-left-corner|@bottom-left|@bottom-center|@bottom-right|@bottom-right-corner|@left-top|@left-middle|@left-bottom|@right-top|@right-middle|@right-bottom",
    "page-selector-list": "[<page-selector>#]?",
    "page-selector": "<pseudo-page>+|<ident> <pseudo-page>*",
    "page-size": "A5|A4|A3|B5|B4|JIS-B5|JIS-B4|letter|legal|ledger",
    "path()": "path( [<fill-rule> ,]? <string> )",
    "paint()": "paint( <ident> , <declaration-value>? )",
    "perspective()": "perspective( [<length [0,∞]>|none] )",
    "polygon()": "polygon( <fill-rule>? , [<length-percentage> <length-percentage>]# )",
    "polar-color-space": "hsl|hwb|lch|oklch",
    position: "[[left|center|right]||[top|center|bottom]|[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]?|[[left|right] <length-percentage>]&&[[top|bottom] <length-percentage>]]",
    "pow()": "pow( <calc-sum> , <calc-sum> )",
    "pseudo-class-selector": "':' <ident-token>|':' <function-token> <any-value> ')'",
    "pseudo-element-selector": "':' <pseudo-class-selector>|<legacy-pseudo-element-selector>",
    "pseudo-page": ": [left|right|first|blank]",
    quote: "open-quote|close-quote|no-open-quote|no-close-quote",
    "radial-gradient()": "radial-gradient( [<ending-shape>||<size>]? [at <position>]? , <color-stop-list> )",
    ratio: "<number [0,∞]> [/ <number [0,∞]>]?",
    "ray()": "ray( <angle>&&<ray-size>?&&contain?&&[at <position>]? )",
    "ray-size": "closest-side|closest-corner|farthest-side|farthest-corner|sides",
    "rectangular-color-space": "srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|oklab|xyz|xyz-d50|xyz-d65",
    "relative-selector": "<combinator>? <complex-selector>",
    "relative-selector-list": "<relative-selector>#",
    "relative-size": "larger|smaller",
    "rem()": "rem( <calc-sum> , <calc-sum> )",
    "repeat-style": "repeat-x|repeat-y|[repeat|space|round|no-repeat]{1,2}",
    "repeating-conic-gradient()": "repeating-conic-gradient( [from <angle>]? [at <position>]? , <angular-color-stop-list> )",
    "repeating-linear-gradient()": "repeating-linear-gradient( [<angle>|to <side-or-corner>]? , <color-stop-list> )",
    "repeating-radial-gradient()": "repeating-radial-gradient( [<ending-shape>||<size>]? [at <position>]? , <color-stop-list> )",
    "reversed-counter-name": "reversed( <counter-name> )",
    "rgb()": "rgb( <percentage>{3} [/ <alpha-value>]? )|rgb( <number>{3} [/ <alpha-value>]? )|rgb( <percentage>#{3} , <alpha-value>? )|rgb( <number>#{3} , <alpha-value>? )",
    "rgba()": "rgba( <percentage>{3} [/ <alpha-value>]? )|rgba( <number>{3} [/ <alpha-value>]? )|rgba( <percentage>#{3} , <alpha-value>? )|rgba( <number>#{3} , <alpha-value>? )",
    "rotate()": "rotate( [<angle>|<zero>] )",
    "rotate3d()": "rotate3d( <number> , <number> , <number> , [<angle>|<zero>] )",
    "rotateX()": "rotateX( [<angle>|<zero>] )",
    "rotateY()": "rotateY( [<angle>|<zero>] )",
    "rotateZ()": "rotateZ( [<angle>|<zero>] )",
    "round()": "round( <rounding-strategy>? , <calc-sum> , <calc-sum> )",
    "rounding-strategy": "nearest|up|down|to-zero",
    "saturate()": "saturate( <number-percentage> )",
    "scale()": "scale( [<number>|<percentage>]#{1,2} )",
    "scale3d()": "scale3d( [<number>|<percentage>]#{3} )",
    "scaleX()": "scaleX( [<number>|<percentage>] )",
    "scaleY()": "scaleY( [<number>|<percentage>] )",
    "scaleZ()": "scaleZ( [<number>|<percentage>] )",
    "scroll()": "scroll( [<axis>||<scroller>]? )",
    scroller: "root|nearest|self",
    "self-position": "center|start|end|self-start|self-end|flex-start|flex-end",
    "shape-radius": "<length-percentage>|closest-side|farthest-side",
    "sign()": "sign( <calc-sum> )",
    "skew()": "skew( [<angle>|<zero>] , [<angle>|<zero>]? )",
    "skewX()": "skewX( [<angle>|<zero>] )",
    "skewY()": "skewY( [<angle>|<zero>] )",
    "sepia()": "sepia( <number-percentage> )",
    shadow: "inset?&&<length>{2,4}&&<color>?",
    "shadow-t": "[<length>{2,3}&&<color>?]",
    shape: "rect( <top> , <right> , <bottom> , <left> )|rect( <top> <right> <bottom> <left> )",
    "shape-box": "<box>|margin-box",
    "side-or-corner": "[left|right]||[top|bottom]",
    "sin()": "sin( <calc-sum> )",
    "single-animation": "<'animation-duration'>||<easing-function>||<'animation-delay'>||<single-animation-iteration-count>||<single-animation-direction>||<single-animation-fill-mode>||<single-animation-play-state>||[none|<keyframes-name>]||<single-animation-timeline>",
    "single-animation-direction": "normal|reverse|alternate|alternate-reverse",
    "single-animation-fill-mode": "none|forwards|backwards|both",
    "single-animation-iteration-count": "infinite|<number>",
    "single-animation-play-state": "running|paused",
    "single-animation-timeline": "auto|none|<dashed-ident>|<scroll()>|<view()>",
    "single-transition": "[none|<single-transition-property>]||<time>||<easing-function>||<time>||<transition-behavior-value>",
    "single-transition-property": "all|<custom-ident>",
    size: "closest-side|farthest-side|closest-corner|farthest-corner|<length>|<length-percentage>{2}",
    "sqrt()": "sqrt( <calc-sum> )",
    "step-position": "jump-start|jump-end|jump-none|jump-both|start|end",
    "step-timing-function": "step-start|step-end|steps( <integer> [, <step-position>]? )",
    "subclass-selector": "<id-selector>|<class-selector>|<attribute-selector>|<pseudo-class-selector>",
    "supports-condition": "not <supports-in-parens>|<supports-in-parens> [and <supports-in-parens>]*|<supports-in-parens> [or <supports-in-parens>]*",
    "supports-in-parens": "( <supports-condition> )|<supports-feature>|<general-enclosed>",
    "supports-feature": "<supports-decl>|<supports-selector-fn>",
    "supports-decl": "( <declaration> )",
    "supports-selector-fn": "selector( <complex-selector> )",
    symbol: "<string>|<image>|<custom-ident>",
    "system-color": "AccentColor|AccentColorText|ActiveText|ButtonBorder|ButtonFace|ButtonText|Canvas|CanvasText|Field|FieldText|GrayText|Highlight|HighlightText|LinkText|Mark|MarkText|SelectedItem|SelectedItemText|VisitedText",
    "tan()": "tan( <calc-sum> )",
    target: "<target-counter()>|<target-counters()>|<target-text()>",
    "target-counter()": "target-counter( [<string>|<url>] , <custom-ident> , <counter-style>? )",
    "target-counters()": "target-counters( [<string>|<url>] , <custom-ident> , <string> , <counter-style>? )",
    "target-text()": "target-text( [<string>|<url>] , [content|before|after|first-letter]? )",
    "time-percentage": "<time>|<percentage>",
    "timeline-range-name": "cover|contain|entry|exit|entry-crossing|exit-crossing",
    "easing-function": "linear|<cubic-bezier-timing-function>|<step-timing-function>",
    "track-breadth": "<length-percentage>|<flex>|min-content|max-content|auto",
    "track-list": "[<line-names>? [<track-size>|<track-repeat>]]+ <line-names>?",
    "track-repeat": "repeat( [<integer [1,∞]>] , [<line-names>? <track-size>]+ <line-names>? )",
    "track-size": "<track-breadth>|minmax( <inflexible-breadth> , <track-breadth> )|fit-content( <length-percentage> )",
    "transform-function": "<matrix()>|<translate()>|<translateX()>|<translateY()>|<scale()>|<scaleX()>|<scaleY()>|<rotate()>|<skew()>|<skewX()>|<skewY()>|<matrix3d()>|<translate3d()>|<translateZ()>|<scale3d()>|<scaleZ()>|<rotate3d()>|<rotateX()>|<rotateY()>|<rotateZ()>|<perspective()>",
    "transform-list": "<transform-function>+",
    "transition-behavior-value": "normal|allow-discrete",
    "translate()": "translate( <length-percentage> , <length-percentage>? )",
    "translate3d()": "translate3d( <length-percentage> , <length-percentage> , <length> )",
    "translateX()": "translateX( <length-percentage> )",
    "translateY()": "translateY( <length-percentage> )",
    "translateZ()": "translateZ( <length> )",
    "type-or-unit": "string|color|url|integer|number|length|angle|time|frequency|cap|ch|em|ex|ic|lh|rlh|rem|vb|vi|vw|vh|vmin|vmax|mm|Q|cm|in|pt|pc|px|deg|grad|rad|turn|ms|s|Hz|kHz|%",
    "type-selector": "<wq-name>|<ns-prefix>? '*'",
    "var()": "var( <custom-property-name> , <declaration-value>? )",
    "view()": "view( [<axis>||<'view-timeline-inset'>]? )",
    "viewport-length": "auto|<length-percentage>",
    "visual-box": "content-box|padding-box|border-box",
    "wq-name": "<ns-prefix>? <ident-token>",
    "-legacy-gradient": "<-webkit-gradient()>|<-legacy-linear-gradient>|<-legacy-repeating-linear-gradient>|<-legacy-radial-gradient>|<-legacy-repeating-radial-gradient>",
    "-legacy-linear-gradient": "-moz-linear-gradient( <-legacy-linear-gradient-arguments> )|-webkit-linear-gradient( <-legacy-linear-gradient-arguments> )|-o-linear-gradient( <-legacy-linear-gradient-arguments> )",
    "-legacy-repeating-linear-gradient": "-moz-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )|-webkit-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )|-o-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )",
    "-legacy-linear-gradient-arguments": "[<angle>|<side-or-corner>]? , <color-stop-list>",
    "-legacy-radial-gradient": "-moz-radial-gradient( <-legacy-radial-gradient-arguments> )|-webkit-radial-gradient( <-legacy-radial-gradient-arguments> )|-o-radial-gradient( <-legacy-radial-gradient-arguments> )",
    "-legacy-repeating-radial-gradient": "-moz-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )|-webkit-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )|-o-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )",
    "-legacy-radial-gradient-arguments": "[<position> ,]? [[[<-legacy-radial-gradient-shape>||<-legacy-radial-gradient-size>]|[<length>|<percentage>]{2}] ,]? <color-stop-list>",
    "-legacy-radial-gradient-size": "closest-side|closest-corner|farthest-side|farthest-corner|contain|cover",
    "-legacy-radial-gradient-shape": "circle|ellipse",
    "-non-standard-font": "-apple-system-body|-apple-system-headline|-apple-system-subheadline|-apple-system-caption1|-apple-system-caption2|-apple-system-footnote|-apple-system-short-body|-apple-system-short-headline|-apple-system-short-subheadline|-apple-system-short-caption1|-apple-system-short-footnote|-apple-system-tall-body",
    "-non-standard-color": "-moz-ButtonDefault|-moz-ButtonHoverFace|-moz-ButtonHoverText|-moz-CellHighlight|-moz-CellHighlightText|-moz-Combobox|-moz-ComboboxText|-moz-Dialog|-moz-DialogText|-moz-dragtargetzone|-moz-EvenTreeRow|-moz-Field|-moz-FieldText|-moz-html-CellHighlight|-moz-html-CellHighlightText|-moz-mac-accentdarkestshadow|-moz-mac-accentdarkshadow|-moz-mac-accentface|-moz-mac-accentlightesthighlight|-moz-mac-accentlightshadow|-moz-mac-accentregularhighlight|-moz-mac-accentregularshadow|-moz-mac-chrome-active|-moz-mac-chrome-inactive|-moz-mac-focusring|-moz-mac-menuselect|-moz-mac-menushadow|-moz-mac-menutextselect|-moz-MenuHover|-moz-MenuHoverText|-moz-MenuBarText|-moz-MenuBarHoverText|-moz-nativehyperlinktext|-moz-OddTreeRow|-moz-win-communicationstext|-moz-win-mediatext|-moz-activehyperlinktext|-moz-default-background-color|-moz-default-color|-moz-hyperlinktext|-moz-visitedhyperlinktext|-webkit-activelink|-webkit-focus-ring-color|-webkit-link|-webkit-text",
    "-non-standard-image-rendering": "optimize-contrast|-moz-crisp-edges|-o-crisp-edges|-webkit-optimize-contrast",
    "-non-standard-overflow": "overlay|-moz-scrollbars-none|-moz-scrollbars-horizontal|-moz-scrollbars-vertical|-moz-hidden-unscrollable",
    "-non-standard-size": "intrinsic|min-intrinsic|-webkit-fill-available|-webkit-fit-content|-webkit-min-content|-webkit-max-content|-moz-available|-moz-fit-content|-moz-min-content|-moz-max-content",
    "-webkit-gradient()": "-webkit-gradient( <-webkit-gradient-type> , <-webkit-gradient-point> [, <-webkit-gradient-point>|, <-webkit-gradient-radius> , <-webkit-gradient-point>] [, <-webkit-gradient-radius>]? [, <-webkit-gradient-color-stop>]* )",
    "-webkit-gradient-color-stop": "from( <color> )|color-stop( [<number-zero-one>|<percentage>] , <color> )|to( <color> )",
    "-webkit-gradient-point": "[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]",
    "-webkit-gradient-radius": "<length>|<percentage>",
    "-webkit-gradient-type": "linear|radial",
    "-webkit-mask-box-repeat": "repeat|stretch|round",
    "-ms-filter-function-list": "<-ms-filter-function>+",
    "-ms-filter-function": "<-ms-filter-function-progid>|<-ms-filter-function-legacy>",
    "-ms-filter-function-progid": "'progid:' [<ident-token> '.']* [<ident-token>|<function-token> <any-value>? )]",
    "-ms-filter-function-legacy": "<ident-token>|<function-token> <any-value>? )",
    "absolute-color-base": "<hex-color>|<absolute-color-function>|<named-color>|transparent",
    "absolute-color-function": "<rgb()>|<rgba()>|<hsl()>|<hsla()>|<hwb()>|<lab()>|<lch()>|<oklab()>|<oklch()>|<color()>",
    age: "child|young|old",
    "anchor-name": "<dashed-ident>",
    "attr-name": "<wq-name>",
    "attr-fallback": "<any-value>",
    "bg-clip": "<box>|border|text",
    bottom: "<length>|auto",
    "container-name": "<custom-ident>",
    "container-condition": "not <query-in-parens>|<query-in-parens> [[and <query-in-parens>]*|[or <query-in-parens>]*]",
    "coord-box": "content-box|padding-box|border-box|fill-box|stroke-box|view-box",
    "generic-voice": "[<age>? <gender> <integer>?]",
    gender: "male|female|neutral",
    "generic-script-specific": "generic( kai )|generic( fangsong )|generic( nastaliq )",
    "generic-complete": "serif|sans-serif|system-ui|cursive|fantasy|math|monospace",
    "generic-incomplete": "ui-serif|ui-sans-serif|ui-monospace|ui-rounded",
    "-non-standard-generic-family": "-apple-system|BlinkMacSystemFont",
    left: "<length>|auto",
    "color-base": "<hex-color>|<color-function>|<named-color>|<color-mix()>|transparent",
    "color-function": "<rgb()>|<rgba()>|<hsl()>|<hsla()>|<hwb()>|<lab()>|<lch()>|<oklab()>|<oklch()>|<color()>",
    "device-cmyk()": "<legacy-device-cmyk-syntax>|<modern-device-cmyk-syntax>",
    "legacy-device-cmyk-syntax": "device-cmyk( <number>#{4} )",
    "modern-device-cmyk-syntax": "device-cmyk( <cmyk-component>{4} [/ [<alpha-value>|none]]? )",
    "cmyk-component": "<number>|<percentage>|none",
    "color-mix()": "color-mix( <color-interpolation-method> , [<color>&&<percentage [0,100]>?]#{2} )",
    "color-space": "<rectangular-color-space>|<polar-color-space>|<custom-color-space>",
    "custom-color-space": "<dashed-ident>",
    paint: "none|<color>|<url> [none|<color>]?|context-fill|context-stroke",
    "palette-identifier": "<dashed-ident>",
    right: "<length>|auto",
    "scope-start": "<forgiving-selector-list>",
    "scope-end": "<forgiving-selector-list>",
    "forgiving-selector-list": "<complex-real-selector-list>",
    "forgiving-relative-selector-list": "<relative-real-selector-list>",
    "selector-list": "<complex-selector-list>",
    "complex-real-selector-list": "<complex-real-selector>#",
    "simple-selector-list": "<simple-selector>#",
    "relative-real-selector-list": "<relative-real-selector>#",
    "complex-selector-unit": "[<compound-selector>? <pseudo-compound-selector>*]!",
    "complex-real-selector": "<compound-selector> [<combinator>? <compound-selector>]*",
    "relative-real-selector": "<combinator>? <complex-real-selector>",
    "pseudo-compound-selector": "<pseudo-element-selector> <pseudo-class-selector>*",
    "simple-selector": "<type-selector>|<subclass-selector>",
    "legacy-pseudo-element-selector": "':' [before|after|first-line|first-letter]",
    "single-animation-composition": "replace|add|accumulate",
    "svg-length": "<percentage>|<length>|<number>",
    "svg-writing-mode": "lr-tb|rl-tb|tb-rl|lr|rl|tb",
    top: "<length>|auto",
    x: "<number>",
    y: "<number>",
    declaration: "<ident-token> : <declaration-value>? ['!' important]?",
    "declaration-list": "[<declaration>? ';']* <declaration>?",
    url: "url( <string> <url-modifier>* )|<url-token>",
    "url-modifier": "<ident>|<function-token> <any-value> )",
    "number-zero-one": "<number [0,1]>",
    "number-one-or-greater": "<number [1,∞]>",
    "color()": "color( <colorspace-params> [/ [<alpha-value>|none]]? )",
    "colorspace-params": "[<predefined-rgb-params>|<xyz-params>]",
    "predefined-rgb-params": "<predefined-rgb> [<number>|<percentage>|none]{3}",
    "predefined-rgb": "srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020",
    "xyz-params": "<xyz-space> [<number>|<percentage>|none]{3}",
    "xyz-space": "xyz|xyz-d50|xyz-d65",
    "oklab()": "oklab( [<percentage>|<number>|none] [<percentage>|<number>|none] [<percentage>|<number>|none] [/ [<alpha-value>|none]]? )",
    "oklch()": "oklch( [<percentage>|<number>|none] [<percentage>|<number>|none] [<hue>|none] [/ [<alpha-value>|none]]? )",
    "offset-path": "<ray()>|<url>|<basic-shape>",
    "rect()": "rect( [<length-percentage>|auto]{4} [round <'border-radius'>]? )",
    "xywh()": "xywh( <length-percentage>{2} <length-percentage [0,∞]>{2} [round <'border-radius'>]? )",
    "query-in-parens": "( <container-condition> )|( <size-feature> )|style( <style-query> )|<general-enclosed>",
    "size-feature": "<mf-plain>|<mf-boolean>|<mf-range>",
    "style-feature": "<declaration>",
    "style-query": "<style-condition>|<style-feature>",
    "style-condition": "not <style-in-parens>|<style-in-parens> [[and <style-in-parens>]*|[or <style-in-parens>]*]",
    "style-in-parens": "( <style-condition> )|( <style-feature> )|<general-enclosed>",
    "-non-standard-display": "-ms-inline-flexbox|-ms-grid|-ms-inline-grid|-webkit-flex|-webkit-inline-flex|-webkit-box|-webkit-inline-box|-moz-inline-stack|-moz-box|-moz-inline-box",
    "inset-area": "[[left|center|right|span-left|span-right|x-start|x-end|span-x-start|span-x-end|x-self-start|x-self-end|span-x-self-start|span-x-self-end|span-all]||[top|center|bottom|span-top|span-bottom|y-start|y-end|span-y-start|span-y-end|y-self-start|y-self-end|span-y-self-start|span-y-self-end|span-all]|[block-start|center|block-end|span-block-start|span-block-end|span-all]||[inline-start|center|inline-end|span-inline-start|span-inline-end|span-all]|[self-block-start|self-block-end|span-self-block-start|span-self-block-end|span-all]||[self-inline-start|self-inline-end|span-self-inline-start|span-self-inline-end|span-all]|[start|center|end|span-start|span-end|span-all]{1,2}|[self-start|center|self-end|span-self-start|span-self-end|span-all]{1,2}]",
    "position-area": "[[left|center|right|span-left|span-right|x-start|x-end|span-x-start|span-x-end|x-self-start|x-self-end|span-x-self-start|span-x-self-end|span-all]||[top|center|bottom|span-top|span-bottom|y-start|y-end|span-y-start|span-y-end|y-self-start|y-self-end|span-y-self-start|span-y-self-end|span-all]|[block-start|center|block-end|span-block-start|span-block-end|span-all]||[inline-start|center|inline-end|span-inline-start|span-inline-end|span-all]|[self-block-start|center|self-block-end|span-self-block-start|span-self-block-end|span-all]||[self-inline-start|center|self-inline-end|span-self-inline-start|span-self-inline-end|span-all]|[start|center|end|span-start|span-end|span-all]{1,2}|[self-start|center|self-end|span-self-start|span-self-end|span-all]{1,2}]",
    "anchor()": "anchor( <anchor-element>?&&<anchor-side> , <length-percentage>? )",
    "anchor-side": "inside|outside|top|left|right|bottom|start|end|self-start|self-end|<percentage>|center",
    "anchor-size()": "anchor-size( [<anchor-element>||<anchor-size>]? , <length-percentage>? )",
    "anchor-size": "width|height|block|inline|self-block|self-inline",
    "anchor-element": "<dashed-ident>",
    "try-size": "most-width|most-height|most-block-size|most-inline-size",
    "try-tactic": "flip-block||flip-inline||flip-start",
    "font-variant-css2": "normal|small-caps",
    "font-width-css3": "normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded",
    "system-family-name": "caption|icon|menu|message-box|small-caption|status-bar"
  },
  properties: {
    "--*": "<declaration-value>",
    "-ms-accelerator": "false|true",
    "-ms-block-progression": "tb|rl|bt|lr",
    "-ms-content-zoom-chaining": "none|chained",
    "-ms-content-zooming": "none|zoom",
    "-ms-content-zoom-limit": "<'-ms-content-zoom-limit-min'> <'-ms-content-zoom-limit-max'>",
    "-ms-content-zoom-limit-max": "<percentage>",
    "-ms-content-zoom-limit-min": "<percentage>",
    "-ms-content-zoom-snap": "<'-ms-content-zoom-snap-type'>||<'-ms-content-zoom-snap-points'>",
    "-ms-content-zoom-snap-points": "snapInterval( <percentage> , <percentage> )|snapList( <percentage># )",
    "-ms-content-zoom-snap-type": "none|proximity|mandatory",
    "-ms-filter": "<string>",
    "-ms-flow-from": "[none|<custom-ident>]#",
    "-ms-flow-into": "[none|<custom-ident>]#",
    "-ms-grid-columns": "none|<track-list>|<auto-track-list>",
    "-ms-grid-rows": "none|<track-list>|<auto-track-list>",
    "-ms-high-contrast-adjust": "auto|none",
    "-ms-hyphenate-limit-chars": "auto|<integer>{1,3}",
    "-ms-hyphenate-limit-lines": "no-limit|<integer>",
    "-ms-hyphenate-limit-zone": "<percentage>|<length>",
    "-ms-ime-align": "auto|after",
    "-ms-overflow-style": "auto|none|scrollbar|-ms-autohiding-scrollbar",
    "-ms-scrollbar-3dlight-color": "<color>",
    "-ms-scrollbar-arrow-color": "<color>",
    "-ms-scrollbar-base-color": "<color>",
    "-ms-scrollbar-darkshadow-color": "<color>",
    "-ms-scrollbar-face-color": "<color>",
    "-ms-scrollbar-highlight-color": "<color>",
    "-ms-scrollbar-shadow-color": "<color>",
    "-ms-scrollbar-track-color": "<color>",
    "-ms-scroll-chaining": "chained|none",
    "-ms-scroll-limit": "<'-ms-scroll-limit-x-min'> <'-ms-scroll-limit-y-min'> <'-ms-scroll-limit-x-max'> <'-ms-scroll-limit-y-max'>",
    "-ms-scroll-limit-x-max": "auto|<length>",
    "-ms-scroll-limit-x-min": "<length>",
    "-ms-scroll-limit-y-max": "auto|<length>",
    "-ms-scroll-limit-y-min": "<length>",
    "-ms-scroll-rails": "none|railed",
    "-ms-scroll-snap-points-x": "snapInterval( <length-percentage> , <length-percentage> )|snapList( <length-percentage># )",
    "-ms-scroll-snap-points-y": "snapInterval( <length-percentage> , <length-percentage> )|snapList( <length-percentage># )",
    "-ms-scroll-snap-type": "none|proximity|mandatory",
    "-ms-scroll-snap-x": "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-x'>",
    "-ms-scroll-snap-y": "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-y'>",
    "-ms-scroll-translation": "none|vertical-to-horizontal",
    "-ms-text-autospace": "none|ideograph-alpha|ideograph-numeric|ideograph-parenthesis|ideograph-space",
    "-ms-touch-select": "grippers|none",
    "-ms-user-select": "none|element|text",
    "-ms-wrap-flow": "auto|both|start|end|maximum|clear",
    "-ms-wrap-margin": "<length>",
    "-ms-wrap-through": "wrap|none",
    "-moz-appearance": "none|button|button-arrow-down|button-arrow-next|button-arrow-previous|button-arrow-up|button-bevel|button-focus|caret|checkbox|checkbox-container|checkbox-label|checkmenuitem|dualbutton|groupbox|listbox|listitem|menuarrow|menubar|menucheckbox|menuimage|menuitem|menuitemtext|menulist|menulist-button|menulist-text|menulist-textfield|menupopup|menuradio|menuseparator|meterbar|meterchunk|progressbar|progressbar-vertical|progresschunk|progresschunk-vertical|radio|radio-container|radio-label|radiomenuitem|range|range-thumb|resizer|resizerpanel|scale-horizontal|scalethumbend|scalethumb-horizontal|scalethumbstart|scalethumbtick|scalethumb-vertical|scale-vertical|scrollbarbutton-down|scrollbarbutton-left|scrollbarbutton-right|scrollbarbutton-up|scrollbarthumb-horizontal|scrollbarthumb-vertical|scrollbartrack-horizontal|scrollbartrack-vertical|searchfield|separator|sheet|spinner|spinner-downbutton|spinner-textfield|spinner-upbutton|splitter|statusbar|statusbarpanel|tab|tabpanel|tabpanels|tab-scroll-arrow-back|tab-scroll-arrow-forward|textfield|textfield-multiline|toolbar|toolbarbutton|toolbarbutton-dropdown|toolbargripper|toolbox|tooltip|treeheader|treeheadercell|treeheadersortarrow|treeitem|treeline|treetwisty|treetwistyopen|treeview|-moz-mac-unified-toolbar|-moz-win-borderless-glass|-moz-win-browsertabbar-toolbox|-moz-win-communicationstext|-moz-win-communications-toolbox|-moz-win-exclude-glass|-moz-win-glass|-moz-win-mediatext|-moz-win-media-toolbox|-moz-window-button-box|-moz-window-button-box-maximized|-moz-window-button-close|-moz-window-button-maximize|-moz-window-button-minimize|-moz-window-button-restore|-moz-window-frame-bottom|-moz-window-frame-left|-moz-window-frame-right|-moz-window-titlebar|-moz-window-titlebar-maximized",
    "-moz-binding": "<url>|none",
    "-moz-border-bottom-colors": "<color>+|none",
    "-moz-border-left-colors": "<color>+|none",
    "-moz-border-right-colors": "<color>+|none",
    "-moz-border-top-colors": "<color>+|none",
    "-moz-context-properties": "none|[fill|fill-opacity|stroke|stroke-opacity]#",
    "-moz-float-edge": "border-box|content-box|margin-box|padding-box",
    "-moz-force-broken-image-icon": "0|1",
    "-moz-image-region": "<shape>|auto",
    "-moz-orient": "inline|block|horizontal|vertical",
    "-moz-outline-radius": "<outline-radius>{1,4} [/ <outline-radius>{1,4}]?",
    "-moz-outline-radius-bottomleft": "<outline-radius>",
    "-moz-outline-radius-bottomright": "<outline-radius>",
    "-moz-outline-radius-topleft": "<outline-radius>",
    "-moz-outline-radius-topright": "<outline-radius>",
    "-moz-stack-sizing": "ignore|stretch-to-fit",
    "-moz-text-blink": "none|blink",
    "-moz-user-focus": "ignore|normal|select-after|select-before|select-menu|select-same|select-all|none",
    "-moz-user-input": "auto|none|enabled|disabled",
    "-moz-user-modify": "read-only|read-write|write-only",
    "-moz-window-dragging": "drag|no-drag",
    "-moz-window-shadow": "default|menu|tooltip|sheet|none",
    "-webkit-appearance": "none|button|button-bevel|caps-lock-indicator|caret|checkbox|default-button|inner-spin-button|listbox|listitem|media-controls-background|media-controls-fullscreen-background|media-current-time-display|media-enter-fullscreen-button|media-exit-fullscreen-button|media-fullscreen-button|media-mute-button|media-overlay-play-button|media-play-button|media-seek-back-button|media-seek-forward-button|media-slider|media-sliderthumb|media-time-remaining-display|media-toggle-closed-captions-button|media-volume-slider|media-volume-slider-container|media-volume-sliderthumb|menulist|menulist-button|menulist-text|menulist-textfield|meter|progress-bar|progress-bar-value|push-button|radio|scrollbarbutton-down|scrollbarbutton-left|scrollbarbutton-right|scrollbarbutton-up|scrollbargripper-horizontal|scrollbargripper-vertical|scrollbarthumb-horizontal|scrollbarthumb-vertical|scrollbartrack-horizontal|scrollbartrack-vertical|searchfield|searchfield-cancel-button|searchfield-decoration|searchfield-results-button|searchfield-results-decoration|slider-horizontal|slider-vertical|sliderthumb-horizontal|sliderthumb-vertical|square-button|textarea|textfield|-apple-pay-button",
    "-webkit-border-before": "<'border-width'>||<'border-style'>||<color>",
    "-webkit-border-before-color": "<color>",
    "-webkit-border-before-style": "<'border-style'>",
    "-webkit-border-before-width": "<'border-width'>",
    "-webkit-box-reflect": "[above|below|right|left]? <length>? <image>?",
    "-webkit-line-clamp": "none|<integer>",
    "-webkit-mask": "[<mask-reference>||<position> [/ <bg-size>]?||<repeat-style>||[<box>|border|padding|content|text]||[<box>|border|padding|content]]#",
    "-webkit-mask-attachment": "<attachment>#",
    "-webkit-mask-clip": "[<box>|border|padding|content|text]#",
    "-webkit-mask-composite": "<composite-style>#",
    "-webkit-mask-image": "<mask-reference>#",
    "-webkit-mask-origin": "[<box>|border|padding|content]#",
    "-webkit-mask-position": "<position>#",
    "-webkit-mask-position-x": "[<length-percentage>|left|center|right]#",
    "-webkit-mask-position-y": "[<length-percentage>|top|center|bottom]#",
    "-webkit-mask-repeat": "<repeat-style>#",
    "-webkit-mask-repeat-x": "repeat|no-repeat|space|round",
    "-webkit-mask-repeat-y": "repeat|no-repeat|space|round",
    "-webkit-mask-size": "<bg-size>#",
    "-webkit-overflow-scrolling": "auto|touch",
    "-webkit-tap-highlight-color": "<color>",
    "-webkit-text-fill-color": "<color>",
    "-webkit-text-stroke": "<length>||<color>",
    "-webkit-text-stroke-color": "<color>",
    "-webkit-text-stroke-width": "<length>",
    "-webkit-touch-callout": "default|none",
    "-webkit-user-modify": "read-only|read-write|read-write-plaintext-only",
    "accent-color": "auto|<color>",
    "align-content": "normal|<baseline-position>|<content-distribution>|<overflow-position>? <content-position>",
    "align-items": "normal|stretch|<baseline-position>|[<overflow-position>? <self-position>]",
    "align-self": "auto|normal|stretch|<baseline-position>|<overflow-position>? <self-position>",
    "align-tracks": "[normal|<baseline-position>|<content-distribution>|<overflow-position>? <content-position>]#",
    all: "initial|inherit|unset|revert|revert-layer",
    "anchor-name": "none|<dashed-ident>#",
    "anchor-scope": "none|all|<dashed-ident>#",
    animation: "<single-animation>#",
    "animation-composition": "<single-animation-composition>#",
    "animation-delay": "<time>#",
    "animation-direction": "<single-animation-direction>#",
    "animation-duration": "<time>#",
    "animation-fill-mode": "<single-animation-fill-mode>#",
    "animation-iteration-count": "<single-animation-iteration-count>#",
    "animation-name": "[none|<keyframes-name>]#",
    "animation-play-state": "<single-animation-play-state>#",
    "animation-range": "[<'animation-range-start'> <'animation-range-end'>?]#",
    "animation-range-end": "[normal|<length-percentage>|<timeline-range-name> <length-percentage>?]#",
    "animation-range-start": "[normal|<length-percentage>|<timeline-range-name> <length-percentage>?]#",
    "animation-timing-function": "<easing-function>#",
    "animation-timeline": "<single-animation-timeline>#",
    appearance: "none|auto|textfield|menulist-button|<compat-auto>",
    "aspect-ratio": "auto||<ratio>",
    azimuth: "<angle>|[[left-side|far-left|left|center-left|center|center-right|right|far-right|right-side]||behind]|leftwards|rightwards",
    "backdrop-filter": "none|<filter-function-list>",
    "backface-visibility": "visible|hidden",
    background: "[<bg-layer> ,]* <final-bg-layer>",
    "background-attachment": "<attachment>#",
    "background-blend-mode": "<blend-mode>#",
    "background-clip": "<bg-clip>#",
    "background-color": "<color>",
    "background-image": "<bg-image>#",
    "background-origin": "<box>#",
    "background-position": "<bg-position>#",
    "background-position-x": "[center|[[left|right|x-start|x-end]? <length-percentage>?]!]#",
    "background-position-y": "[center|[[top|bottom|y-start|y-end]? <length-percentage>?]!]#",
    "background-repeat": "<repeat-style>#",
    "background-size": "<bg-size>#",
    "block-size": "<'width'>",
    border: "<line-width>||<line-style>||<color>",
    "border-block": "<'border-top-width'>||<'border-top-style'>||<color>",
    "border-block-color": "<'border-top-color'>{1,2}",
    "border-block-style": "<'border-top-style'>",
    "border-block-width": "<'border-top-width'>",
    "border-block-end": "<'border-top-width'>||<'border-top-style'>||<color>",
    "border-block-end-color": "<'border-top-color'>",
    "border-block-end-style": "<'border-top-style'>",
    "border-block-end-width": "<'border-top-width'>",
    "border-block-start": "<'border-top-width'>||<'border-top-style'>||<color>",
    "border-block-start-color": "<'border-top-color'>",
    "border-block-start-style": "<'border-top-style'>",
    "border-block-start-width": "<'border-top-width'>",
    "border-bottom": "<line-width>||<line-style>||<color>",
    "border-bottom-color": "<'border-top-color'>",
    "border-bottom-left-radius": "<length-percentage>{1,2}",
    "border-bottom-right-radius": "<length-percentage>{1,2}",
    "border-bottom-style": "<line-style>",
    "border-bottom-width": "<line-width>",
    "border-collapse": "collapse|separate",
    "border-color": "<color>{1,4}",
    "border-end-end-radius": "<length-percentage>{1,2}",
    "border-end-start-radius": "<length-percentage>{1,2}",
    "border-image": "<'border-image-source'>||<'border-image-slice'> [/ <'border-image-width'>|/ <'border-image-width'>? / <'border-image-outset'>]?||<'border-image-repeat'>",
    "border-image-outset": "[<length>|<number>]{1,4}",
    "border-image-repeat": "[stretch|repeat|round|space]{1,2}",
    "border-image-slice": "<number-percentage>{1,4}&&fill?",
    "border-image-source": "none|<image>",
    "border-image-width": "[<length-percentage>|<number>|auto]{1,4}",
    "border-inline": "<'border-top-width'>||<'border-top-style'>||<color>",
    "border-inline-end": "<'border-top-width'>||<'border-top-style'>||<color>",
    "border-inline-color": "<'border-top-color'>{1,2}",
    "border-inline-style": "<'border-top-style'>",
    "border-inline-width": "<'border-top-width'>",
    "border-inline-end-color": "<'border-top-color'>",
    "border-inline-end-style": "<'border-top-style'>",
    "border-inline-end-width": "<'border-top-width'>",
    "border-inline-start": "<'border-top-width'>||<'border-top-style'>||<color>",
    "border-inline-start-color": "<'border-top-color'>",
    "border-inline-start-style": "<'border-top-style'>",
    "border-inline-start-width": "<'border-top-width'>",
    "border-left": "<line-width>||<line-style>||<color>",
    "border-left-color": "<color>",
    "border-left-style": "<line-style>",
    "border-left-width": "<line-width>",
    "border-radius": "<length-percentage>{1,4} [/ <length-percentage>{1,4}]?",
    "border-right": "<line-width>||<line-style>||<color>",
    "border-right-color": "<color>",
    "border-right-style": "<line-style>",
    "border-right-width": "<line-width>",
    "border-spacing": "<length> <length>?",
    "border-start-end-radius": "<length-percentage>{1,2}",
    "border-start-start-radius": "<length-percentage>{1,2}",
    "border-style": "<line-style>{1,4}",
    "border-top": "<line-width>||<line-style>||<color>",
    "border-top-color": "<color>",
    "border-top-left-radius": "<length-percentage>{1,2}",
    "border-top-right-radius": "<length-percentage>{1,2}",
    "border-top-style": "<line-style>",
    "border-top-width": "<line-width>",
    "border-width": "<line-width>{1,4}",
    bottom: "<length>|<percentage>|auto",
    "box-align": "start|center|end|baseline|stretch",
    "box-decoration-break": "slice|clone",
    "box-direction": "normal|reverse|inherit",
    "box-flex": "<number>",
    "box-flex-group": "<integer>",
    "box-lines": "single|multiple",
    "box-ordinal-group": "<integer>",
    "box-orient": "horizontal|vertical|inline-axis|block-axis|inherit",
    "box-pack": "start|center|end|justify",
    "box-shadow": "none|<shadow>#",
    "box-sizing": "content-box|border-box",
    "break-after": "auto|avoid|always|all|avoid-page|page|left|right|recto|verso|avoid-column|column|avoid-region|region",
    "break-before": "auto|avoid|always|all|avoid-page|page|left|right|recto|verso|avoid-column|column|avoid-region|region",
    "break-inside": "auto|avoid|avoid-page|avoid-column|avoid-region",
    "caption-side": "top|bottom|block-start|block-end|inline-start|inline-end",
    caret: "<'caret-color'>||<'caret-shape'>",
    "caret-color": "auto|<color>",
    "caret-shape": "auto|bar|block|underscore",
    clear: "none|left|right|both|inline-start|inline-end",
    clip: "<shape>|auto",
    "clip-path": "<clip-source>|[<basic-shape>||<geometry-box>]|none",
    "clip-rule": "nonzero|evenodd",
    color: "<color>",
    "color-interpolation-filters": "auto|sRGB|linearRGB",
    "color-scheme": "normal|[light|dark|<custom-ident>]+&&only?",
    "column-count": "<integer>|auto",
    "column-fill": "auto|balance",
    "column-gap": "normal|<length-percentage>",
    "column-rule": "<'column-rule-width'>||<'column-rule-style'>||<'column-rule-color'>",
    "column-rule-color": "<color>",
    "column-rule-style": "<'border-style'>",
    "column-rule-width": "<'border-width'>",
    "column-span": "none|all",
    "column-width": "<length>|auto",
    columns: "<'column-width'>||<'column-count'>",
    contain: "none|strict|content|[[size||inline-size]||layout||style||paint]",
    "contain-intrinsic-size": "[auto? [none|<length>]]{1,2}",
    "contain-intrinsic-block-size": "auto? [none|<length>]",
    "contain-intrinsic-height": "auto? [none|<length>]",
    "contain-intrinsic-inline-size": "auto? [none|<length>]",
    "contain-intrinsic-width": "auto? [none|<length>]",
    container: "<'container-name'> [/ <'container-type'>]?",
    "container-name": "none|<custom-ident>+",
    "container-type": "normal||[size|inline-size]",
    content: "normal|none|[<content-replacement>|<content-list>] [/ [<string>|<counter>]+]?",
    "content-visibility": "visible|auto|hidden",
    "counter-increment": "[<counter-name> <integer>?]+|none",
    "counter-reset": "[<counter-name> <integer>?|<reversed-counter-name> <integer>?]+|none",
    "counter-set": "[<counter-name> <integer>?]+|none",
    cursor: "[[<url> [<x> <y>]? ,]* [auto|default|none|context-menu|help|pointer|progress|wait|cell|crosshair|text|vertical-text|alias|copy|move|no-drop|not-allowed|e-resize|n-resize|ne-resize|nw-resize|s-resize|se-resize|sw-resize|w-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|col-resize|row-resize|all-scroll|zoom-in|zoom-out|grab|grabbing|hand|-webkit-grab|-webkit-grabbing|-webkit-zoom-in|-webkit-zoom-out|-moz-grab|-moz-grabbing|-moz-zoom-in|-moz-zoom-out]]",
    d: "none|path( <string> )",
    cx: "<length>|<percentage>",
    cy: "<length>|<percentage>",
    direction: "ltr|rtl",
    display: "[<display-outside>||<display-inside>]|<display-listitem>|<display-internal>|<display-box>|<display-legacy>|<-non-standard-display>",
    "dominant-baseline": "auto|use-script|no-change|reset-size|ideographic|alphabetic|hanging|mathematical|central|middle|text-after-edge|text-before-edge",
    "empty-cells": "show|hide",
    "field-sizing": "content|fixed",
    fill: "<paint>",
    "fill-opacity": "<number-zero-one>",
    "fill-rule": "nonzero|evenodd",
    filter: "none|<filter-function-list>|<-ms-filter-function-list>",
    flex: "none|[<'flex-grow'> <'flex-shrink'>?||<'flex-basis'>]",
    "flex-basis": "content|<'width'>",
    "flex-direction": "row|row-reverse|column|column-reverse",
    "flex-flow": "<'flex-direction'>||<'flex-wrap'>",
    "flex-grow": "<number>",
    "flex-shrink": "<number>",
    "flex-wrap": "nowrap|wrap|wrap-reverse",
    float: "left|right|none|inline-start|inline-end",
    font: "[[<'font-style'>||<font-variant-css2>||<'font-weight'>||<font-width-css3>]? <'font-size'> [/ <'line-height'>]? <'font-family'>#]|<system-family-name>|<-non-standard-font>",
    "font-family": "[<family-name>|<generic-family>]#",
    "font-feature-settings": "normal|<feature-tag-value>#",
    "font-kerning": "auto|normal|none",
    "font-language-override": "normal|<string>",
    "font-optical-sizing": "auto|none",
    "font-palette": "normal|light|dark|<palette-identifier>",
    "font-variation-settings": "normal|[<string> <number>]#",
    "font-size": "<absolute-size>|<relative-size>|<length-percentage>",
    "font-size-adjust": "none|[ex-height|cap-height|ch-width|ic-width|ic-height]? [from-font|<number>]",
    "font-smooth": "auto|never|always|<absolute-size>|<length>",
    "font-stretch": "<font-stretch-absolute>",
    "font-style": "normal|italic|oblique <angle>?",
    "font-synthesis": "none|[weight||style||small-caps||position]",
    "font-synthesis-position": "auto|none",
    "font-synthesis-small-caps": "auto|none",
    "font-synthesis-style": "auto|none",
    "font-synthesis-weight": "auto|none",
    "font-variant": "normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>||stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )||[small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps]||<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero||<east-asian-variant-values>||<east-asian-width-values>||ruby]",
    "font-variant-alternates": "normal|[stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )]",
    "font-variant-caps": "normal|small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps",
    "font-variant-east-asian": "normal|[<east-asian-variant-values>||<east-asian-width-values>||ruby]",
    "font-variant-emoji": "normal|text|emoji|unicode",
    "font-variant-ligatures": "normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>]",
    "font-variant-numeric": "normal|[<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero]",
    "font-variant-position": "normal|sub|super",
    "font-weight": "<font-weight-absolute>|bolder|lighter",
    "forced-color-adjust": "auto|none|preserve-parent-color",
    gap: "<'row-gap'> <'column-gap'>?",
    grid: "<'grid-template'>|<'grid-template-rows'> / [auto-flow&&dense?] <'grid-auto-columns'>?|[auto-flow&&dense?] <'grid-auto-rows'>? / <'grid-template-columns'>",
    "grid-area": "<grid-line> [/ <grid-line>]{0,3}",
    "grid-auto-columns": "<track-size>+",
    "grid-auto-flow": "[row|column]||dense",
    "grid-auto-rows": "<track-size>+",
    "grid-column": "<grid-line> [/ <grid-line>]?",
    "grid-column-end": "<grid-line>",
    "grid-column-gap": "<length-percentage>",
    "grid-column-start": "<grid-line>",
    "grid-gap": "<'grid-row-gap'> <'grid-column-gap'>?",
    "grid-row": "<grid-line> [/ <grid-line>]?",
    "grid-row-end": "<grid-line>",
    "grid-row-gap": "<length-percentage>",
    "grid-row-start": "<grid-line>",
    "grid-template": "none|[<'grid-template-rows'> / <'grid-template-columns'>]|[<line-names>? <string> <track-size>? <line-names>?]+ [/ <explicit-track-list>]?",
    "grid-template-areas": "none|<string>+",
    "grid-template-columns": "none|<track-list>|<auto-track-list>|subgrid <line-name-list>?",
    "grid-template-rows": "none|<track-list>|<auto-track-list>|subgrid <line-name-list>?",
    "hanging-punctuation": "none|[first||[force-end|allow-end]||last]",
    height: "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>",
    "hyphenate-character": "auto|<string>",
    "hyphenate-limit-chars": "[auto|<integer>]{1,3}",
    hyphens: "none|manual|auto",
    "image-orientation": "from-image|<angle>|[<angle>? flip]",
    "image-rendering": "auto|crisp-edges|pixelated|optimizeSpeed|optimizeQuality|<-non-standard-image-rendering>",
    "image-resolution": "[from-image||<resolution>]&&snap?",
    "ime-mode": "auto|normal|active|inactive|disabled",
    "initial-letter": "normal|[<number> <integer>?]",
    "initial-letter-align": "[auto|alphabetic|hanging|ideographic]",
    "inline-size": "<'width'>",
    "input-security": "auto|none",
    inset: "<'top'>{1,4}",
    "inset-block": "<'top'>{1,2}",
    "inset-block-end": "<'top'>",
    "inset-block-start": "<'top'>",
    "inset-inline": "<'top'>{1,2}",
    "inset-inline-end": "<'top'>",
    "inset-inline-start": "<'top'>",
    "interpolate-size": "numeric-only|allow-keywords",
    isolation: "auto|isolate",
    "justify-content": "normal|<content-distribution>|<overflow-position>? [<content-position>|left|right]",
    "justify-items": "normal|stretch|<baseline-position>|<overflow-position>? [<self-position>|left|right]|legacy|legacy&&[left|right|center]",
    "justify-self": "auto|normal|stretch|<baseline-position>|<overflow-position>? [<self-position>|left|right]",
    "justify-tracks": "[normal|<content-distribution>|<overflow-position>? [<content-position>|left|right]]#",
    left: "<length>|<percentage>|auto",
    "letter-spacing": "normal|<length-percentage>",
    "line-break": "auto|loose|normal|strict|anywhere",
    "line-clamp": "none|<integer>",
    "line-height": "normal|<number>|<length>|<percentage>",
    "line-height-step": "<length>",
    "list-style": "<'list-style-type'>||<'list-style-position'>||<'list-style-image'>",
    "list-style-image": "<image>|none",
    "list-style-position": "inside|outside",
    "list-style-type": "<counter-style>|<string>|none",
    margin: "[<length>|<percentage>|auto]{1,4}",
    "margin-block": "<'margin-left'>{1,2}",
    "margin-block-end": "<'margin-left'>",
    "margin-block-start": "<'margin-left'>",
    "margin-bottom": "<length>|<percentage>|auto",
    "margin-inline": "<'margin-left'>{1,2}",
    "margin-inline-end": "<'margin-left'>",
    "margin-inline-start": "<'margin-left'>",
    "margin-left": "<length>|<percentage>|auto",
    "margin-right": "<length>|<percentage>|auto",
    "margin-top": "<length>|<percentage>|auto",
    "margin-trim": "none|in-flow|all",
    marker: "none|<url>",
    "marker-end": "none|<url>",
    "marker-mid": "none|<url>",
    "marker-start": "none|<url>",
    mask: "<mask-layer>#",
    "mask-border": "<'mask-border-source'>||<'mask-border-slice'> [/ <'mask-border-width'>? [/ <'mask-border-outset'>]?]?||<'mask-border-repeat'>||<'mask-border-mode'>",
    "mask-border-mode": "luminance|alpha",
    "mask-border-outset": "[<length>|<number>]{1,4}",
    "mask-border-repeat": "[stretch|repeat|round|space]{1,2}",
    "mask-border-slice": "<number-percentage>{1,4} fill?",
    "mask-border-source": "none|<image>",
    "mask-border-width": "[<length-percentage>|<number>|auto]{1,4}",
    "mask-clip": "[<geometry-box>|no-clip]#",
    "mask-composite": "<compositing-operator>#",
    "mask-image": "<mask-reference>#",
    "mask-mode": "<masking-mode>#",
    "mask-origin": "<geometry-box>#",
    "mask-position": "<position>#",
    "mask-repeat": "<repeat-style>#",
    "mask-size": "<bg-size>#",
    "mask-type": "luminance|alpha",
    "masonry-auto-flow": "[pack|next]||[definite-first|ordered]",
    "math-depth": "auto-add|add( <integer> )|<integer>",
    "math-shift": "normal|compact",
    "math-style": "normal|compact",
    "max-block-size": "<'max-width'>",
    "max-height": "none|<length-percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>",
    "max-inline-size": "<'max-width'>",
    "max-lines": "none|<integer>",
    "max-width": "none|<length-percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>",
    "min-block-size": "<'min-width'>",
    "min-height": "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>",
    "min-inline-size": "<'min-width'>",
    "min-width": "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>",
    "mix-blend-mode": "<blend-mode>|plus-lighter",
    "object-fit": "fill|contain|cover|none|scale-down",
    "object-position": "<position>",
    offset: "[<'offset-position'>? [<'offset-path'> [<'offset-distance'>||<'offset-rotate'>]?]?]! [/ <'offset-anchor'>]?",
    "offset-anchor": "auto|<position>",
    "offset-distance": "<length-percentage>",
    "offset-path": "none|<offset-path>||<coord-box>",
    "offset-position": "normal|auto|<position>",
    "offset-rotate": "[auto|reverse]||<angle>",
    opacity: "<alpha-value>",
    order: "<integer>",
    orphans: "<integer>",
    outline: "[<'outline-width'>||<'outline-style'>||<'outline-color'>]",
    "outline-color": "auto|<color>",
    "outline-offset": "<length>",
    "outline-style": "auto|<'border-style'>",
    "outline-width": "<line-width>",
    overflow: "[visible|hidden|clip|scroll|auto]{1,2}|<-non-standard-overflow>",
    "overflow-anchor": "auto|none",
    "overflow-block": "visible|hidden|clip|scroll|auto",
    "overflow-clip-box": "padding-box|content-box",
    "overflow-clip-margin": "<visual-box>||<length [0,∞]>",
    "overflow-inline": "visible|hidden|clip|scroll|auto",
    "overflow-wrap": "normal|break-word|anywhere",
    "overflow-x": "visible|hidden|clip|scroll|auto",
    "overflow-y": "visible|hidden|clip|scroll|auto",
    overlay: "none|auto",
    "overscroll-behavior": "[contain|none|auto]{1,2}",
    "overscroll-behavior-block": "contain|none|auto",
    "overscroll-behavior-inline": "contain|none|auto",
    "overscroll-behavior-x": "contain|none|auto",
    "overscroll-behavior-y": "contain|none|auto",
    padding: "[<length>|<percentage>]{1,4}",
    "padding-block": "<'padding-left'>{1,2}",
    "padding-block-end": "<'padding-left'>",
    "padding-block-start": "<'padding-left'>",
    "padding-bottom": "<length>|<percentage>",
    "padding-inline": "<'padding-left'>{1,2}",
    "padding-inline-end": "<'padding-left'>",
    "padding-inline-start": "<'padding-left'>",
    "padding-left": "<length>|<percentage>",
    "padding-right": "<length>|<percentage>",
    "padding-top": "<length>|<percentage>",
    page: "auto|<custom-ident>",
    "page-break-after": "auto|always|avoid|left|right|recto|verso",
    "page-break-before": "auto|always|avoid|left|right|recto|verso",
    "page-break-inside": "auto|avoid",
    "paint-order": "normal|[fill||stroke||markers]",
    perspective: "none|<length>",
    "perspective-origin": "<position>",
    "place-content": "<'align-content'> <'justify-content'>?",
    "place-items": "<'align-items'> <'justify-items'>?",
    "place-self": "<'align-self'> <'justify-self'>?",
    "pointer-events": "auto|none|visiblePainted|visibleFill|visibleStroke|visible|painted|fill|stroke|all|inherit",
    position: "static|relative|absolute|sticky|fixed|-webkit-sticky",
    "position-anchor": "auto|<anchor-name>",
    "position-area": "none|<position-area>",
    "position-try": "<'position-try-order'>? <'position-try-fallbacks'>",
    "position-try-fallbacks": "none|[[<dashed-ident>||<try-tactic>]|<'position-area'>]#",
    "position-try-order": "normal|<try-size>",
    "position-visibility": "always|[anchors-valid||anchors-visible||no-overflow]",
    "print-color-adjust": "economy|exact",
    quotes: "none|auto|[<string> <string>]+",
    r: "<length>|<percentage>",
    resize: "none|both|horizontal|vertical|block|inline",
    right: "<length>|<percentage>|auto",
    rotate: "none|<angle>|[x|y|z|<number>{3}]&&<angle>",
    "row-gap": "normal|<length-percentage>",
    "ruby-align": "start|center|space-between|space-around",
    "ruby-merge": "separate|collapse|auto",
    "ruby-position": "[alternate||[over|under]]|inter-character",
    rx: "<length>|<percentage>",
    ry: "<length>|<percentage>",
    scale: "none|[<number>|<percentage>]{1,3}",
    "scrollbar-color": "auto|<color>{2}",
    "scrollbar-gutter": "auto|stable&&both-edges?",
    "scrollbar-width": "auto|thin|none",
    "scroll-behavior": "auto|smooth",
    "scroll-margin": "<length>{1,4}",
    "scroll-margin-block": "<length>{1,2}",
    "scroll-margin-block-start": "<length>",
    "scroll-margin-block-end": "<length>",
    "scroll-margin-bottom": "<length>",
    "scroll-margin-inline": "<length>{1,2}",
    "scroll-margin-inline-start": "<length>",
    "scroll-margin-inline-end": "<length>",
    "scroll-margin-left": "<length>",
    "scroll-margin-right": "<length>",
    "scroll-margin-top": "<length>",
    "scroll-padding": "[auto|<length-percentage>]{1,4}",
    "scroll-padding-block": "[auto|<length-percentage>]{1,2}",
    "scroll-padding-block-start": "auto|<length-percentage>",
    "scroll-padding-block-end": "auto|<length-percentage>",
    "scroll-padding-bottom": "auto|<length-percentage>",
    "scroll-padding-inline": "[auto|<length-percentage>]{1,2}",
    "scroll-padding-inline-start": "auto|<length-percentage>",
    "scroll-padding-inline-end": "auto|<length-percentage>",
    "scroll-padding-left": "auto|<length-percentage>",
    "scroll-padding-right": "auto|<length-percentage>",
    "scroll-padding-top": "auto|<length-percentage>",
    "scroll-snap-align": "[none|start|end|center]{1,2}",
    "scroll-snap-coordinate": "none|<position>#",
    "scroll-snap-destination": "<position>",
    "scroll-snap-points-x": "none|repeat( <length-percentage> )",
    "scroll-snap-points-y": "none|repeat( <length-percentage> )",
    "scroll-snap-stop": "normal|always",
    "scroll-snap-type": "none|[x|y|block|inline|both] [mandatory|proximity]?",
    "scroll-snap-type-x": "none|mandatory|proximity",
    "scroll-snap-type-y": "none|mandatory|proximity",
    "scroll-timeline": "[<'scroll-timeline-name'>||<'scroll-timeline-axis'>]#",
    "scroll-timeline-axis": "[block|inline|x|y]#",
    "scroll-timeline-name": "[none|<dashed-ident>]#",
    "shape-image-threshold": "<alpha-value>",
    "shape-margin": "<length-percentage>",
    "shape-outside": "none|[<shape-box>||<basic-shape>]|<image>",
    "shape-rendering": "auto|optimizeSpeed|crispEdges|geometricPrecision",
    stroke: "<paint>",
    "stroke-dasharray": "none|[<svg-length>+]#",
    "stroke-dashoffset": "<svg-length>",
    "stroke-linecap": "butt|round|square",
    "stroke-linejoin": "miter|round|bevel",
    "stroke-miterlimit": "<number-one-or-greater>",
    "stroke-opacity": "<'opacity'>",
    "stroke-width": "<svg-length>",
    "tab-size": "<integer>|<length>",
    "table-layout": "auto|fixed",
    "text-align": "start|end|left|right|center|justify|match-parent",
    "text-align-last": "auto|start|end|left|right|center|justify",
    "text-anchor": "start|middle|end",
    "text-combine-upright": "none|all|[digits <integer>?]",
    "text-decoration": "<'text-decoration-line'>||<'text-decoration-style'>||<'text-decoration-color'>||<'text-decoration-thickness'>",
    "text-decoration-color": "<color>",
    "text-decoration-line": "none|[underline||overline||line-through||blink]|spelling-error|grammar-error",
    "text-decoration-skip": "none|[objects||[spaces|[leading-spaces||trailing-spaces]]||edges||box-decoration]",
    "text-decoration-skip-ink": "auto|all|none",
    "text-decoration-style": "solid|double|dotted|dashed|wavy",
    "text-decoration-thickness": "auto|from-font|<length>|<percentage>",
    "text-emphasis": "<'text-emphasis-style'>||<'text-emphasis-color'>",
    "text-emphasis-color": "<color>",
    "text-emphasis-position": "auto|[over|under]&&[right|left]?",
    "text-emphasis-style": "none|[[filled|open]||[dot|circle|double-circle|triangle|sesame]]|<string>",
    "text-indent": "<length-percentage>&&hanging?&&each-line?",
    "text-justify": "auto|inter-character|inter-word|none",
    "text-orientation": "mixed|upright|sideways",
    "text-overflow": "[clip|ellipsis|<string>]{1,2}",
    "text-rendering": "auto|optimizeSpeed|optimizeLegibility|geometricPrecision",
    "text-shadow": "none|<shadow-t>#",
    "text-size-adjust": "none|auto|<percentage>",
    "text-spacing-trim": "space-all|normal|space-first|trim-start|trim-both|trim-all|auto",
    "text-transform": "none|capitalize|uppercase|lowercase|full-width|full-size-kana",
    "text-underline-offset": "auto|<length>|<percentage>",
    "text-underline-position": "auto|from-font|[under||[left|right]]",
    "text-wrap": "<'text-wrap-mode'>||<'text-wrap-style'>",
    "text-wrap-mode": "auto|wrap|nowrap",
    "text-wrap-style": "auto|balance|stable|pretty",
    "timeline-scope": "none|<dashed-ident>#",
    top: "<length>|<percentage>|auto",
    "touch-action": "auto|none|[[pan-x|pan-left|pan-right]||[pan-y|pan-up|pan-down]||pinch-zoom]|manipulation",
    transform: "none|<transform-list>",
    "transform-box": "content-box|border-box|fill-box|stroke-box|view-box",
    "transform-origin": "[<length-percentage>|left|center|right|top|bottom]|[[<length-percentage>|left|center|right]&&[<length-percentage>|top|center|bottom]] <length>?",
    "transform-style": "flat|preserve-3d",
    transition: "<single-transition>#",
    "transition-behavior": "<transition-behavior-value>#",
    "transition-delay": "<time>#",
    "transition-duration": "<time>#",
    "transition-property": "none|<single-transition-property>#",
    "transition-timing-function": "<easing-function>#",
    translate: "none|<length-percentage> [<length-percentage> <length>?]?",
    "unicode-bidi": "normal|embed|isolate|bidi-override|isolate-override|plaintext|-moz-isolate|-moz-isolate-override|-moz-plaintext|-webkit-isolate|-webkit-isolate-override|-webkit-plaintext",
    "user-select": "auto|text|none|contain|all",
    "vector-effect": "none|non-scaling-stroke|non-scaling-size|non-rotation|fixed-position",
    "vertical-align": "baseline|sub|super|text-top|text-bottom|middle|top|bottom|<percentage>|<length>",
    "view-timeline": "[<'view-timeline-name'> <'view-timeline-axis'>?]#",
    "view-timeline-axis": "[block|inline|x|y]#",
    "view-timeline-inset": "[[auto|<length-percentage>]{1,2}]#",
    "view-timeline-name": "none|<dashed-ident>#",
    "view-transition-name": "none|<custom-ident>",
    visibility: "visible|hidden|collapse",
    "white-space": "normal|pre|nowrap|pre-wrap|pre-line|break-spaces|[<'white-space-collapse'>||<'text-wrap'>||<'white-space-trim'>]",
    "white-space-collapse": "collapse|discard|preserve|preserve-breaks|preserve-spaces|break-spaces",
    widows: "<integer>",
    width: "auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>",
    "will-change": "auto|<animateable-feature>#",
    "word-break": "normal|break-all|keep-all|break-word|auto-phrase",
    "word-spacing": "normal|<length>",
    "word-wrap": "normal|break-word",
    "writing-mode": "horizontal-tb|vertical-rl|vertical-lr|sideways-rl|sideways-lr|<svg-writing-mode>",
    x: "<length>|<percentage>",
    y: "<length>|<percentage>",
    "z-index": "auto|<integer>",
    zoom: "normal|reset|<number>|<percentage>",
    "-moz-background-clip": "padding|border",
    "-moz-border-radius-bottomleft": "<'border-bottom-left-radius'>",
    "-moz-border-radius-bottomright": "<'border-bottom-right-radius'>",
    "-moz-border-radius-topleft": "<'border-top-left-radius'>",
    "-moz-border-radius-topright": "<'border-bottom-right-radius'>",
    "-moz-control-character-visibility": "visible|hidden",
    "-moz-osx-font-smoothing": "auto|grayscale",
    "-moz-user-select": "none|text|all|-moz-none",
    "-ms-flex-align": "start|end|center|baseline|stretch",
    "-ms-flex-item-align": "auto|start|end|center|baseline|stretch",
    "-ms-flex-line-pack": "start|end|center|justify|distribute|stretch",
    "-ms-flex-negative": "<'flex-shrink'>",
    "-ms-flex-pack": "start|end|center|justify|distribute",
    "-ms-flex-order": "<integer>",
    "-ms-flex-positive": "<'flex-grow'>",
    "-ms-flex-preferred-size": "<'flex-basis'>",
    "-ms-interpolation-mode": "nearest-neighbor|bicubic",
    "-ms-grid-column-align": "start|end|center|stretch",
    "-ms-grid-row-align": "start|end|center|stretch",
    "-ms-hyphenate-limit-last": "none|always|column|page|spread",
    "-webkit-background-clip": "[<box>|border|padding|content|text]#",
    "-webkit-column-break-after": "always|auto|avoid",
    "-webkit-column-break-before": "always|auto|avoid",
    "-webkit-column-break-inside": "always|auto|avoid",
    "-webkit-font-smoothing": "auto|none|antialiased|subpixel-antialiased",
    "-webkit-mask-box-image": "[<url>|<gradient>|none] [<length-percentage>{4} <-webkit-mask-box-repeat>{2}]?",
    "-webkit-print-color-adjust": "economy|exact",
    "-webkit-text-security": "none|circle|disc|square",
    "-webkit-user-drag": "none|element|auto",
    "-webkit-user-select": "auto|none|text|all",
    "alignment-baseline": "auto|baseline|before-edge|text-before-edge|middle|central|after-edge|text-after-edge|ideographic|alphabetic|hanging|mathematical",
    "baseline-shift": "baseline|sub|super|<svg-length>",
    behavior: "<url>+",
    cue: "<'cue-before'> <'cue-after'>?",
    "cue-after": "<url> <decibel>?|none",
    "cue-before": "<url> <decibel>?|none",
    "glyph-orientation-horizontal": "<angle>",
    "glyph-orientation-vertical": "<angle>",
    kerning: "auto|<svg-length>",
    pause: "<'pause-before'> <'pause-after'>?",
    "pause-after": "<time>|none|x-weak|weak|medium|strong|x-strong",
    "pause-before": "<time>|none|x-weak|weak|medium|strong|x-strong",
    rest: "<'rest-before'> <'rest-after'>?",
    "rest-after": "<time>|none|x-weak|weak|medium|strong|x-strong",
    "rest-before": "<time>|none|x-weak|weak|medium|strong|x-strong",
    src: "[<url> [format( <string># )]?|local( <family-name> )]#",
    speak: "auto|never|always",
    "speak-as": "normal|spell-out||digits||[literal-punctuation|no-punctuation]",
    "unicode-range": "<urange>#",
    "voice-balance": "<number>|left|center|right|leftwards|rightwards",
    "voice-duration": "auto|<time>",
    "voice-family": "[[<family-name>|<generic-voice>] ,]* [<family-name>|<generic-voice>]|preserve",
    "voice-pitch": "<frequency>&&absolute|[[x-low|low|medium|high|x-high]||[<frequency>|<semitones>|<percentage>]]",
    "voice-range": "<frequency>&&absolute|[[x-low|low|medium|high|x-high]||[<frequency>|<semitones>|<percentage>]]",
    "voice-rate": "[normal|x-slow|slow|medium|fast|x-fast]||<percentage>",
    "voice-stress": "normal|strong|moderate|none|reduced",
    "voice-volume": "silent|[[x-soft|soft|medium|loud|x-loud]||<decibel>]",
    "white-space-trim": "none|discard-before||discard-after||discard-inner"
  },
  atrules: {
    charset: {
      prelude: "<string>",
      descriptors: null
    },
    "counter-style": {
      prelude: "<counter-style-name>",
      descriptors: {
        "additive-symbols": "[<integer>&&<symbol>]#",
        fallback: "<counter-style-name>",
        negative: "<symbol> <symbol>?",
        pad: "<integer>&&<symbol>",
        prefix: "<symbol>",
        range: "[[<integer>|infinite]{2}]#|auto",
        "speak-as": "auto|bullets|numbers|words|spell-out|<counter-style-name>",
        suffix: "<symbol>",
        symbols: "<symbol>+",
        system: "cyclic|numeric|alphabetic|symbolic|additive|[fixed <integer>?]|[extends <counter-style-name>]"
      }
    },
    document: {
      prelude: "[<url>|url-prefix( <string> )|domain( <string> )|media-document( <string> )|regexp( <string> )]#",
      descriptors: null
    },
    "font-palette-values": {
      prelude: "<dashed-ident>",
      descriptors: {
        "base-palette": "light|dark|<integer [0,∞]>",
        "font-family": "<family-name>#",
        "override-colors": "[<integer [0,∞]> <absolute-color-base>]#"
      }
    },
    "font-face": {
      prelude: null,
      descriptors: {
        "ascent-override": "normal|<percentage>",
        "descent-override": "normal|<percentage>",
        "font-display": "[auto|block|swap|fallback|optional]",
        "font-family": "<family-name>",
        "font-feature-settings": "normal|<feature-tag-value>#",
        "font-variation-settings": "normal|[<string> <number>]#",
        "font-stretch": "<font-stretch-absolute>{1,2}",
        "font-style": "normal|italic|oblique <angle>{0,2}",
        "font-weight": "<font-weight-absolute>{1,2}",
        "line-gap-override": "normal|<percentage>",
        "size-adjust": "<percentage>",
        src: "[<url> [format( <string># )]?|local( <family-name> )]#",
        "unicode-range": "<urange>#"
      }
    },
    "font-feature-values": {
      prelude: "<family-name>#",
      descriptors: null
    },
    import: {
      prelude: "[<string>|<url>] [layer|layer( <layer-name> )]? [supports( [<supports-condition>|<declaration>] )]? <media-query-list>?",
      descriptors: null
    },
    keyframes: {
      prelude: "<keyframes-name>",
      descriptors: null
    },
    layer: {
      prelude: "[<layer-name>#|<layer-name>?]",
      descriptors: null
    },
    media: {
      prelude: "<media-query-list>",
      descriptors: null
    },
    namespace: {
      prelude: "<namespace-prefix>? [<string>|<url>]",
      descriptors: null
    },
    page: {
      prelude: "<page-selector-list>",
      descriptors: {
        bleed: "auto|<length>",
        marks: "none|[crop||cross]",
        "page-orientation": "upright|rotate-left|rotate-right",
        size: "<length>{1,2}|auto|[<page-size>||[portrait|landscape]]"
      }
    },
    "position-try": {
      prelude: "<dashed-ident>",
      descriptors: {
        top: "<'top'>",
        left: "<'left'>",
        bottom: "<'bottom'>",
        right: "<'right'>",
        "inset-block-start": "<'inset-block-start'>",
        "inset-block-end": "<'inset-block-end'>",
        "inset-inline-start": "<'inset-inline-start'>",
        "inset-inline-end": "<'inset-inline-end'>",
        "inset-block": "<'inset-block'>",
        "inset-inline": "<'inset-inline'>",
        inset: "<'inset'>",
        "margin-top": "<'margin-top'>",
        "margin-left": "<'margin-left'>",
        "margin-bottom": "<'margin-bottom'>",
        "margin-right": "<'margin-right'>",
        "margin-block-start": "<'margin-block-start'>",
        "margin-block-end": "<'margin-block-end'>",
        "margin-inline-start": "<'margin-inline-start'>",
        "margin-inline-end": "<'margin-inline-end'>",
        margin: "<'margin'>",
        "margin-block": "<'margin-block'>",
        "margin-inline": "<'margin-inline'>",
        width: "<'width'>",
        height: "<'height'>",
        "min-width": "<'min-width'>",
        "min-height": "<'min-height'>",
        "max-width": "<'max-width'>",
        "max-height": "<'max-height'>",
        "block-size": "<'block-size'>",
        "inline-size": "<'inline-size'>",
        "min-block-size": "<'min-block-size'>",
        "min-inline-size": "<'min-inline-size'>",
        "max-block-size": "<'max-block-size'>",
        "max-inline-size": "<'max-inline-size'>",
        "align-self": "<'align-self'>|anchor-center",
        "justify-self": "<'justify-self'>|anchor-center"
      }
    },
    property: {
      prelude: "<custom-property-name>",
      descriptors: {
        syntax: "<string>",
        inherits: "true|false",
        "initial-value": "<declaration-value>?"
      }
    },
    scope: {
      prelude: "[( <scope-start> )]? [to ( <scope-end> )]?",
      descriptors: null
    },
    "starting-style": {
      prelude: null,
      descriptors: null
    },
    supports: {
      prelude: "<supports-condition>",
      descriptors: null
    },
    container: {
      prelude: "[<container-name>]? <container-condition>",
      descriptors: null
    },
    nest: {
      prelude: "<complex-selector-list>",
      descriptors: null
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/node/index.js
var exports_node = {};
__export(exports_node, {
  WhiteSpace: () => exports_WhiteSpace,
  Value: () => exports_Value,
  Url: () => exports_Url,
  UnicodeRange: () => exports_UnicodeRange,
  TypeSelector: () => exports_TypeSelector,
  SupportsDeclaration: () => exports_SupportsDeclaration,
  StyleSheet: () => exports_StyleSheet,
  String: () => exports_String,
  SelectorList: () => exports_SelectorList,
  Selector: () => exports_Selector,
  Scope: () => exports_Scope,
  Rule: () => exports_Rule,
  Raw: () => exports_Raw,
  Ratio: () => exports_Ratio,
  PseudoElementSelector: () => exports_PseudoElementSelector,
  PseudoClassSelector: () => exports_PseudoClassSelector,
  Percentage: () => exports_Percentage,
  Parentheses: () => exports_Parentheses,
  Operator: () => exports_Operator,
  Number: () => exports_Number,
  Nth: () => exports_Nth,
  NestingSelector: () => exports_NestingSelector,
  MediaQueryList: () => exports_MediaQueryList,
  MediaQuery: () => exports_MediaQuery,
  LayerList: () => exports_LayerList,
  Layer: () => exports_Layer,
  Identifier: () => exports_Identifier,
  IdSelector: () => exports_IdSelector,
  Hash: () => exports_Hash,
  GeneralEnclosed: () => exports_GeneralEnclosed,
  Function: () => exports_Function,
  FeatureRange: () => exports_FeatureRange,
  FeatureFunction: () => exports_FeatureFunction,
  Feature: () => exports_Feature,
  Dimension: () => exports_Dimension,
  DeclarationList: () => exports_DeclarationList,
  Declaration: () => exports_Declaration,
  Condition: () => exports_Condition,
  Comment: () => exports_Comment,
  Combinator: () => exports_Combinator,
  ClassSelector: () => exports_ClassSelector,
  CDO: () => exports_CDO,
  CDC: () => exports_CDC,
  Brackets: () => exports_Brackets,
  Block: () => exports_Block,
  AttributeSelector: () => exports_AttributeSelector,
  AtrulePrelude: () => exports_AtrulePrelude,
  Atrule: () => exports_Atrule,
  AnPlusB: () => exports_AnPlusB
});

// ../../../node_modules/css-tree/lib/syntax/node/AnPlusB.js
var exports_AnPlusB = {};
__export(exports_AnPlusB, {
  structure: () => structure,
  parse: () => parse2,
  name: () => name,
  generate: () => generate2
});
var PLUSSIGN5 = 43;
var HYPHENMINUS5 = 45;
var N5 = 110;
var DISALLOW_SIGN2 = true;
var ALLOW_SIGN2 = false;
function checkInteger2(offset, disallowSign) {
  let pos = this.tokenStart + offset;
  const code2 = this.charCodeAt(pos);
  if (code2 === PLUSSIGN5 || code2 === HYPHENMINUS5) {
    if (disallowSign) {
      this.error("Number sign is not allowed");
    }
    pos++;
  }
  for (;pos < this.tokenEnd; pos++) {
    if (!isDigit(this.charCodeAt(pos))) {
      this.error("Integer is expected", pos);
    }
  }
}
function checkTokenIsInteger(disallowSign) {
  return checkInteger2.call(this, 0, disallowSign);
}
function expectCharCode(offset, code2) {
  if (!this.cmpChar(this.tokenStart + offset, code2)) {
    let msg = "";
    switch (code2) {
      case N5:
        msg = "N is expected";
        break;
      case HYPHENMINUS5:
        msg = "HyphenMinus is expected";
        break;
    }
    this.error(msg, this.tokenStart + offset);
  }
}
function consumeB2() {
  let offset = 0;
  let sign = 0;
  let type = this.tokenType;
  while (type === WhiteSpace || type === Comment) {
    type = this.lookupType(++offset);
  }
  if (type !== Number2) {
    if (this.isDelim(PLUSSIGN5, offset) || this.isDelim(HYPHENMINUS5, offset)) {
      sign = this.isDelim(PLUSSIGN5, offset) ? PLUSSIGN5 : HYPHENMINUS5;
      do {
        type = this.lookupType(++offset);
      } while (type === WhiteSpace || type === Comment);
      if (type !== Number2) {
        this.skip(offset);
        checkTokenIsInteger.call(this, DISALLOW_SIGN2);
      }
    } else {
      return null;
    }
  }
  if (offset > 0) {
    this.skip(offset);
  }
  if (sign === 0) {
    type = this.charCodeAt(this.tokenStart);
    if (type !== PLUSSIGN5 && type !== HYPHENMINUS5) {
      this.error("Number sign is expected");
    }
  }
  checkTokenIsInteger.call(this, sign !== 0);
  return sign === HYPHENMINUS5 ? "-" + this.consume(Number2) : this.consume(Number2);
}
var name = "AnPlusB";
var structure = {
  a: [String, null],
  b: [String, null]
};
function parse2() {
  const start = this.tokenStart;
  let a = null;
  let b = null;
  if (this.tokenType === Number2) {
    checkTokenIsInteger.call(this, ALLOW_SIGN2);
    b = this.consume(Number2);
  } else if (this.tokenType === Ident && this.cmpChar(this.tokenStart, HYPHENMINUS5)) {
    a = "-1";
    expectCharCode.call(this, 1, N5);
    switch (this.tokenEnd - this.tokenStart) {
      case 2:
        this.next();
        b = consumeB2.call(this);
        break;
      case 3:
        expectCharCode.call(this, 2, HYPHENMINUS5);
        this.next();
        this.skipSC();
        checkTokenIsInteger.call(this, DISALLOW_SIGN2);
        b = "-" + this.consume(Number2);
        break;
      default:
        expectCharCode.call(this, 2, HYPHENMINUS5);
        checkInteger2.call(this, 3, DISALLOW_SIGN2);
        this.next();
        b = this.substrToCursor(start + 2);
    }
  } else if (this.tokenType === Ident || this.isDelim(PLUSSIGN5) && this.lookupType(1) === Ident) {
    let sign = 0;
    a = "1";
    if (this.isDelim(PLUSSIGN5)) {
      sign = 1;
      this.next();
    }
    expectCharCode.call(this, 0, N5);
    switch (this.tokenEnd - this.tokenStart) {
      case 1:
        this.next();
        b = consumeB2.call(this);
        break;
      case 2:
        expectCharCode.call(this, 1, HYPHENMINUS5);
        this.next();
        this.skipSC();
        checkTokenIsInteger.call(this, DISALLOW_SIGN2);
        b = "-" + this.consume(Number2);
        break;
      default:
        expectCharCode.call(this, 1, HYPHENMINUS5);
        checkInteger2.call(this, 2, DISALLOW_SIGN2);
        this.next();
        b = this.substrToCursor(start + sign + 1);
    }
  } else if (this.tokenType === Dimension) {
    const code2 = this.charCodeAt(this.tokenStart);
    const sign = code2 === PLUSSIGN5 || code2 === HYPHENMINUS5;
    let i = this.tokenStart + sign;
    for (;i < this.tokenEnd; i++) {
      if (!isDigit(this.charCodeAt(i))) {
        break;
      }
    }
    if (i === this.tokenStart + sign) {
      this.error("Integer is expected", this.tokenStart + sign);
    }
    expectCharCode.call(this, i - this.tokenStart, N5);
    a = this.substring(start, i);
    if (i + 1 === this.tokenEnd) {
      this.next();
      b = consumeB2.call(this);
    } else {
      expectCharCode.call(this, i - this.tokenStart + 1, HYPHENMINUS5);
      if (i + 2 === this.tokenEnd) {
        this.next();
        this.skipSC();
        checkTokenIsInteger.call(this, DISALLOW_SIGN2);
        b = "-" + this.consume(Number2);
      } else {
        checkInteger2.call(this, i - this.tokenStart + 2, DISALLOW_SIGN2);
        this.next();
        b = this.substrToCursor(i + 1);
      }
    }
  } else {
    this.error();
  }
  if (a !== null && a.charCodeAt(0) === PLUSSIGN5) {
    a = a.substr(1);
  }
  if (b !== null && b.charCodeAt(0) === PLUSSIGN5) {
    b = b.substr(1);
  }
  return {
    type: "AnPlusB",
    loc: this.getLocation(start, this.tokenStart),
    a,
    b
  };
}
function generate2(node) {
  if (node.a) {
    const a = node.a === "+1" && "n" || node.a === "1" && "n" || node.a === "-1" && "-n" || node.a + "n";
    if (node.b) {
      const b = node.b[0] === "-" || node.b[0] === "+" ? node.b : "+" + node.b;
      this.tokenize(a + b);
    } else {
      this.tokenize(a);
    }
  } else {
    this.tokenize(node.b);
  }
}
// ../../../node_modules/css-tree/lib/syntax/node/Atrule.js
var exports_Atrule = {};
__export(exports_Atrule, {
  walkContext: () => walkContext,
  structure: () => structure2,
  parse: () => parse3,
  name: () => name2,
  generate: () => generate3
});
function consumeRaw() {
  return this.Raw(this.consumeUntilLeftCurlyBracketOrSemicolon, true);
}
function isDeclarationBlockAtrule() {
  for (let offset = 1, type;type = this.lookupType(offset); offset++) {
    if (type === RightCurlyBracket) {
      return true;
    }
    if (type === LeftCurlyBracket || type === AtKeyword) {
      return false;
    }
  }
  return false;
}
var name2 = "Atrule";
var walkContext = "atrule";
var structure2 = {
  name: String,
  prelude: ["AtrulePrelude", "Raw", null],
  block: ["Block", null]
};
function parse3(isDeclaration = false) {
  const start = this.tokenStart;
  let name3;
  let nameLowerCase;
  let prelude = null;
  let block = null;
  this.eat(AtKeyword);
  name3 = this.substrToCursor(start + 1);
  nameLowerCase = name3.toLowerCase();
  this.skipSC();
  if (this.eof === false && this.tokenType !== LeftCurlyBracket && this.tokenType !== Semicolon) {
    if (this.parseAtrulePrelude) {
      prelude = this.parseWithFallback(this.AtrulePrelude.bind(this, name3, isDeclaration), consumeRaw);
    } else {
      prelude = consumeRaw.call(this, this.tokenIndex);
    }
    this.skipSC();
  }
  switch (this.tokenType) {
    case Semicolon:
      this.next();
      break;
    case LeftCurlyBracket:
      if (hasOwnProperty.call(this.atrule, nameLowerCase) && typeof this.atrule[nameLowerCase].block === "function") {
        block = this.atrule[nameLowerCase].block.call(this, isDeclaration);
      } else {
        block = this.Block(isDeclarationBlockAtrule.call(this));
      }
      break;
  }
  return {
    type: "Atrule",
    loc: this.getLocation(start, this.tokenStart),
    name: name3,
    prelude,
    block
  };
}
function generate3(node) {
  this.token(AtKeyword, "@" + node.name);
  if (node.prelude !== null) {
    this.node(node.prelude);
  }
  if (node.block) {
    this.node(node.block);
  } else {
    this.token(Semicolon, ";");
  }
}
// ../../../node_modules/css-tree/lib/syntax/node/AtrulePrelude.js
var exports_AtrulePrelude = {};
__export(exports_AtrulePrelude, {
  walkContext: () => walkContext2,
  structure: () => structure3,
  parse: () => parse4,
  name: () => name3,
  generate: () => generate4
});
var name3 = "AtrulePrelude";
var walkContext2 = "atrulePrelude";
var structure3 = {
  children: [[]]
};
function parse4(name4) {
  let children = null;
  if (name4 !== null) {
    name4 = name4.toLowerCase();
  }
  this.skipSC();
  if (hasOwnProperty.call(this.atrule, name4) && typeof this.atrule[name4].prelude === "function") {
    children = this.atrule[name4].prelude.call(this);
  } else {
    children = this.readSequence(this.scope.AtrulePrelude);
  }
  this.skipSC();
  if (this.eof !== true && this.tokenType !== LeftCurlyBracket && this.tokenType !== Semicolon) {
    this.error("Semicolon or block is expected");
  }
  return {
    type: "AtrulePrelude",
    loc: this.getLocationFromList(children),
    children
  };
}
function generate4(node) {
  this.children(node);
}
// ../../../node_modules/css-tree/lib/syntax/node/AttributeSelector.js
var exports_AttributeSelector = {};
__export(exports_AttributeSelector, {
  structure: () => structure4,
  parse: () => parse5,
  name: () => name4,
  generate: () => generate5
});
var DOLLARSIGN = 36;
var ASTERISK2 = 42;
var EQUALSSIGN = 61;
var CIRCUMFLEXACCENT = 94;
var VERTICALLINE2 = 124;
var TILDE = 126;
function getAttributeName() {
  if (this.eof) {
    this.error("Unexpected end of input");
  }
  const start = this.tokenStart;
  let expectIdent = false;
  if (this.isDelim(ASTERISK2)) {
    expectIdent = true;
    this.next();
  } else if (!this.isDelim(VERTICALLINE2)) {
    this.eat(Ident);
  }
  if (this.isDelim(VERTICALLINE2)) {
    if (this.charCodeAt(this.tokenStart + 1) !== EQUALSSIGN) {
      this.next();
      this.eat(Ident);
    } else if (expectIdent) {
      this.error("Identifier is expected", this.tokenEnd);
    }
  } else if (expectIdent) {
    this.error("Vertical line is expected");
  }
  return {
    type: "Identifier",
    loc: this.getLocation(start, this.tokenStart),
    name: this.substrToCursor(start)
  };
}
function getOperator() {
  const start = this.tokenStart;
  const code2 = this.charCodeAt(start);
  if (code2 !== EQUALSSIGN && code2 !== TILDE && code2 !== CIRCUMFLEXACCENT && code2 !== DOLLARSIGN && code2 !== ASTERISK2 && code2 !== VERTICALLINE2) {
    this.error("Attribute selector (=, ~=, ^=, $=, *=, |=) is expected");
  }
  this.next();
  if (code2 !== EQUALSSIGN) {
    if (!this.isDelim(EQUALSSIGN)) {
      this.error("Equal sign is expected");
    }
    this.next();
  }
  return this.substrToCursor(start);
}
var name4 = "AttributeSelector";
var structure4 = {
  name: "Identifier",
  matcher: [String, null],
  value: ["String", "Identifier", null],
  flags: [String, null]
};
function parse5() {
  const start = this.tokenStart;
  let name5;
  let matcher = null;
  let value = null;
  let flags = null;
  this.eat(LeftSquareBracket);
  this.skipSC();
  name5 = getAttributeName.call(this);
  this.skipSC();
  if (this.tokenType !== RightSquareBracket) {
    if (this.tokenType !== Ident) {
      matcher = getOperator.call(this);
      this.skipSC();
      value = this.tokenType === String2 ? this.String() : this.Identifier();
      this.skipSC();
    }
    if (this.tokenType === Ident) {
      flags = this.consume(Ident);
      this.skipSC();
    }
  }
  this.eat(RightSquareBracket);
  return {
    type: "AttributeSelector",
    loc: this.getLocation(start, this.tokenStart),
    name: name5,
    matcher,
    value,
    flags
  };
}
function generate5(node) {
  this.token(Delim, "[");
  this.node(node.name);
  if (node.matcher !== null) {
    this.tokenize(node.matcher);
    this.node(node.value);
  }
  if (node.flags !== null) {
    this.token(Ident, node.flags);
  }
  this.token(Delim, "]");
}
// ../../../node_modules/css-tree/lib/syntax/node/Block.js
var exports_Block = {};
__export(exports_Block, {
  walkContext: () => walkContext3,
  structure: () => structure5,
  parse: () => parse6,
  name: () => name5,
  generate: () => generate6
});
var AMPERSAND2 = 38;
function consumeRaw2() {
  return this.Raw(null, true);
}
function consumeRule() {
  return this.parseWithFallback(this.Rule, consumeRaw2);
}
function consumeRawDeclaration() {
  return this.Raw(this.consumeUntilSemicolonIncluded, true);
}
function consumeDeclaration() {
  if (this.tokenType === Semicolon) {
    return consumeRawDeclaration.call(this, this.tokenIndex);
  }
  const node = this.parseWithFallback(this.Declaration, consumeRawDeclaration);
  if (this.tokenType === Semicolon) {
    this.next();
  }
  return node;
}
var name5 = "Block";
var walkContext3 = "block";
var structure5 = {
  children: [[
    "Atrule",
    "Rule",
    "Declaration"
  ]]
};
function parse6(isStyleBlock) {
  const consumer = isStyleBlock ? consumeDeclaration : consumeRule;
  const start = this.tokenStart;
  let children = this.createList();
  this.eat(LeftCurlyBracket);
  scan:
    while (!this.eof) {
      switch (this.tokenType) {
        case RightCurlyBracket:
          break scan;
        case WhiteSpace:
        case Comment:
          this.next();
          break;
        case AtKeyword:
          children.push(this.parseWithFallback(this.Atrule.bind(this, isStyleBlock), consumeRaw2));
          break;
        default:
          if (isStyleBlock && this.isDelim(AMPERSAND2)) {
            children.push(consumeRule.call(this));
          } else {
            children.push(consumer.call(this));
          }
      }
    }
  if (!this.eof) {
    this.eat(RightCurlyBracket);
  }
  return {
    type: "Block",
    loc: this.getLocation(start, this.tokenStart),
    children
  };
}
function generate6(node) {
  this.token(LeftCurlyBracket, "{");
  this.children(node, (prev) => {
    if (prev.type === "Declaration") {
      this.token(Semicolon, ";");
    }
  });
  this.token(RightCurlyBracket, "}");
}
// ../../../node_modules/css-tree/lib/syntax/node/Brackets.js
var exports_Brackets = {};
__export(exports_Brackets, {
  structure: () => structure6,
  parse: () => parse7,
  name: () => name6,
  generate: () => generate7
});
var name6 = "Brackets";
var structure6 = {
  children: [[]]
};
function parse7(readSequence2, recognizer) {
  const start = this.tokenStart;
  let children = null;
  this.eat(LeftSquareBracket);
  children = readSequence2.call(this, recognizer);
  if (!this.eof) {
    this.eat(RightSquareBracket);
  }
  return {
    type: "Brackets",
    loc: this.getLocation(start, this.tokenStart),
    children
  };
}
function generate7(node) {
  this.token(Delim, "[");
  this.children(node);
  this.token(Delim, "]");
}
// ../../../node_modules/css-tree/lib/syntax/node/CDC.js
var exports_CDC = {};
__export(exports_CDC, {
  structure: () => structure7,
  parse: () => parse8,
  name: () => name7,
  generate: () => generate8
});
var name7 = "CDC";
var structure7 = [];
function parse8() {
  const start = this.tokenStart;
  this.eat(CDC);
  return {
    type: "CDC",
    loc: this.getLocation(start, this.tokenStart)
  };
}
function generate8() {
  this.token(CDC, "-->");
}
// ../../../node_modules/css-tree/lib/syntax/node/CDO.js
var exports_CDO = {};
__export(exports_CDO, {
  structure: () => structure8,
  parse: () => parse9,
  name: () => name8,
  generate: () => generate9
});
var name8 = "CDO";
var structure8 = [];
function parse9() {
  const start = this.tokenStart;
  this.eat(CDO);
  return {
    type: "CDO",
    loc: this.getLocation(start, this.tokenStart)
  };
}
function generate9() {
  this.token(CDO, "<!--");
}
// ../../../node_modules/css-tree/lib/syntax/node/ClassSelector.js
var exports_ClassSelector = {};
__export(exports_ClassSelector, {
  structure: () => structure9,
  parse: () => parse10,
  name: () => name9,
  generate: () => generate10
});
var FULLSTOP = 46;
var name9 = "ClassSelector";
var structure9 = {
  name: String
};
function parse10() {
  this.eatDelim(FULLSTOP);
  return {
    type: "ClassSelector",
    loc: this.getLocation(this.tokenStart - 1, this.tokenEnd),
    name: this.consume(Ident)
  };
}
function generate10(node) {
  this.token(Delim, ".");
  this.token(Ident, node.name);
}
// ../../../node_modules/css-tree/lib/syntax/node/Combinator.js
var exports_Combinator = {};
__export(exports_Combinator, {
  structure: () => structure10,
  parse: () => parse11,
  name: () => name10,
  generate: () => generate11
});
var PLUSSIGN6 = 43;
var SOLIDUS = 47;
var GREATERTHANSIGN2 = 62;
var TILDE2 = 126;
var name10 = "Combinator";
var structure10 = {
  name: String
};
function parse11() {
  const start = this.tokenStart;
  let name11;
  switch (this.tokenType) {
    case WhiteSpace:
      name11 = " ";
      break;
    case Delim:
      switch (this.charCodeAt(this.tokenStart)) {
        case GREATERTHANSIGN2:
        case PLUSSIGN6:
        case TILDE2:
          this.next();
          break;
        case SOLIDUS:
          this.next();
          this.eatIdent("deep");
          this.eatDelim(SOLIDUS);
          break;
        default:
          this.error("Combinator is expected");
      }
      name11 = this.substrToCursor(start);
      break;
  }
  return {
    type: "Combinator",
    loc: this.getLocation(start, this.tokenStart),
    name: name11
  };
}
function generate11(node) {
  this.tokenize(node.name);
}
// ../../../node_modules/css-tree/lib/syntax/node/Comment.js
var exports_Comment = {};
__export(exports_Comment, {
  structure: () => structure11,
  parse: () => parse12,
  name: () => name11,
  generate: () => generate12
});
var ASTERISK3 = 42;
var SOLIDUS2 = 47;
var name11 = "Comment";
var structure11 = {
  value: String
};
function parse12() {
  const start = this.tokenStart;
  let end = this.tokenEnd;
  this.eat(Comment);
  if (end - start + 2 >= 2 && this.charCodeAt(end - 2) === ASTERISK3 && this.charCodeAt(end - 1) === SOLIDUS2) {
    end -= 2;
  }
  return {
    type: "Comment",
    loc: this.getLocation(start, this.tokenStart),
    value: this.substring(start + 2, end)
  };
}
function generate12(node) {
  this.token(Comment, "/*" + node.value + "*/");
}
// ../../../node_modules/css-tree/lib/syntax/node/Condition.js
var exports_Condition = {};
__export(exports_Condition, {
  structure: () => structure12,
  parse: () => parse13,
  name: () => name12,
  generate: () => generate13
});
var likelyFeatureToken = new Set([Colon, RightParenthesis, EOF]);
var name12 = "Condition";
var structure12 = {
  kind: String,
  children: [[
    "Identifier",
    "Feature",
    "FeatureFunction",
    "FeatureRange",
    "SupportsDeclaration"
  ]]
};
function featureOrRange(kind) {
  if (this.lookupTypeNonSC(1) === Ident && likelyFeatureToken.has(this.lookupTypeNonSC(2))) {
    return this.Feature(kind);
  }
  return this.FeatureRange(kind);
}
var parentheses = {
  media: featureOrRange,
  container: featureOrRange,
  supports() {
    return this.SupportsDeclaration();
  }
};
function parse13(kind = "media") {
  const children = this.createList();
  scan:
    while (!this.eof) {
      switch (this.tokenType) {
        case Comment:
        case WhiteSpace:
          this.next();
          continue;
        case Ident:
          children.push(this.Identifier());
          break;
        case LeftParenthesis: {
          let term = this.parseWithFallback(() => parentheses[kind].call(this, kind), () => null);
          if (!term) {
            term = this.parseWithFallback(() => {
              this.eat(LeftParenthesis);
              const res = this.Condition(kind);
              this.eat(RightParenthesis);
              return res;
            }, () => {
              return this.GeneralEnclosed(kind);
            });
          }
          children.push(term);
          break;
        }
        case Function2: {
          let term = this.parseWithFallback(() => this.FeatureFunction(kind), () => null);
          if (!term) {
            term = this.GeneralEnclosed(kind);
          }
          children.push(term);
          break;
        }
        default:
          break scan;
      }
    }
  if (children.isEmpty) {
    this.error("Condition is expected");
  }
  return {
    type: "Condition",
    loc: this.getLocationFromList(children),
    kind,
    children
  };
}
function generate13(node) {
  node.children.forEach((child2) => {
    if (child2.type === "Condition") {
      this.token(LeftParenthesis, "(");
      this.node(child2);
      this.token(RightParenthesis, ")");
    } else {
      this.node(child2);
    }
  });
}
// ../../../node_modules/css-tree/lib/syntax/node/Declaration.js
var exports_Declaration = {};
__export(exports_Declaration, {
  walkContext: () => walkContext4,
  structure: () => structure13,
  parse: () => parse14,
  name: () => name13,
  generate: () => generate14
});
var EXCLAMATIONMARK3 = 33;
var NUMBERSIGN3 = 35;
var DOLLARSIGN2 = 36;
var AMPERSAND3 = 38;
var ASTERISK4 = 42;
var PLUSSIGN7 = 43;
var SOLIDUS3 = 47;
function consumeValueRaw() {
  return this.Raw(this.consumeUntilExclamationMarkOrSemicolon, true);
}
function consumeCustomPropertyRaw() {
  return this.Raw(this.consumeUntilExclamationMarkOrSemicolon, false);
}
function consumeValue() {
  const startValueToken = this.tokenIndex;
  const value = this.Value();
  if (value.type !== "Raw" && this.eof === false && this.tokenType !== Semicolon && this.isDelim(EXCLAMATIONMARK3) === false && this.isBalanceEdge(startValueToken) === false) {
    this.error();
  }
  return value;
}
var name13 = "Declaration";
var walkContext4 = "declaration";
var structure13 = {
  important: [Boolean, String],
  property: String,
  value: ["Value", "Raw"]
};
function parse14() {
  const start = this.tokenStart;
  const startToken = this.tokenIndex;
  const property2 = readProperty2.call(this);
  const customProperty = isCustomProperty(property2);
  const parseValue = customProperty ? this.parseCustomProperty : this.parseValue;
  const consumeRaw3 = customProperty ? consumeCustomPropertyRaw : consumeValueRaw;
  let important = false;
  let value;
  this.skipSC();
  this.eat(Colon);
  const valueStart = this.tokenIndex;
  if (!customProperty) {
    this.skipSC();
  }
  if (parseValue) {
    value = this.parseWithFallback(consumeValue, consumeRaw3);
  } else {
    value = consumeRaw3.call(this, this.tokenIndex);
  }
  if (customProperty && value.type === "Value" && value.children.isEmpty) {
    for (let offset = valueStart - this.tokenIndex;offset <= 0; offset++) {
      if (this.lookupType(offset) === WhiteSpace) {
        value.children.appendData({
          type: "WhiteSpace",
          loc: null,
          value: " "
        });
        break;
      }
    }
  }
  if (this.isDelim(EXCLAMATIONMARK3)) {
    important = getImportant.call(this);
    this.skipSC();
  }
  if (this.eof === false && this.tokenType !== Semicolon && this.isBalanceEdge(startToken) === false) {
    this.error();
  }
  return {
    type: "Declaration",
    loc: this.getLocation(start, this.tokenStart),
    important,
    property: property2,
    value
  };
}
function generate14(node) {
  this.token(Ident, node.property);
  this.token(Colon, ":");
  this.node(node.value);
  if (node.important) {
    this.token(Delim, "!");
    this.token(Ident, node.important === true ? "important" : node.important);
  }
}
function readProperty2() {
  const start = this.tokenStart;
  if (this.tokenType === Delim) {
    switch (this.charCodeAt(this.tokenStart)) {
      case ASTERISK4:
      case DOLLARSIGN2:
      case PLUSSIGN7:
      case NUMBERSIGN3:
      case AMPERSAND3:
        this.next();
        break;
      case SOLIDUS3:
        this.next();
        if (this.isDelim(SOLIDUS3)) {
          this.next();
        }
        break;
    }
  }
  if (this.tokenType === Hash) {
    this.eat(Hash);
  } else {
    this.eat(Ident);
  }
  return this.substrToCursor(start);
}
function getImportant() {
  this.eat(Delim);
  this.skipSC();
  const important = this.consume(Ident);
  return important === "important" ? true : important;
}
// ../../../node_modules/css-tree/lib/syntax/node/DeclarationList.js
var exports_DeclarationList = {};
__export(exports_DeclarationList, {
  structure: () => structure14,
  parse: () => parse15,
  name: () => name14,
  generate: () => generate15
});
var AMPERSAND4 = 38;
function consumeRaw3() {
  return this.Raw(this.consumeUntilSemicolonIncluded, true);
}
var name14 = "DeclarationList";
var structure14 = {
  children: [[
    "Declaration",
    "Atrule",
    "Rule"
  ]]
};
function parse15() {
  const children = this.createList();
  scan:
    while (!this.eof) {
      switch (this.tokenType) {
        case WhiteSpace:
        case Comment:
        case Semicolon:
          this.next();
          break;
        case AtKeyword:
          children.push(this.parseWithFallback(this.Atrule.bind(this, true), consumeRaw3));
          break;
        default:
          if (this.isDelim(AMPERSAND4)) {
            children.push(this.parseWithFallback(this.Rule, consumeRaw3));
          } else {
            children.push(this.parseWithFallback(this.Declaration, consumeRaw3));
          }
      }
    }
  return {
    type: "DeclarationList",
    loc: this.getLocationFromList(children),
    children
  };
}
function generate15(node) {
  this.children(node, (prev) => {
    if (prev.type === "Declaration") {
      this.token(Semicolon, ";");
    }
  });
}
// ../../../node_modules/css-tree/lib/syntax/node/Dimension.js
var exports_Dimension = {};
__export(exports_Dimension, {
  structure: () => structure15,
  parse: () => parse16,
  name: () => name15,
  generate: () => generate16
});
var name15 = "Dimension";
var structure15 = {
  value: String,
  unit: String
};
function parse16() {
  const start = this.tokenStart;
  const value = this.consumeNumber(Dimension);
  return {
    type: "Dimension",
    loc: this.getLocation(start, this.tokenStart),
    value,
    unit: this.substring(start + value.length, this.tokenStart)
  };
}
function generate16(node) {
  this.token(Dimension, node.value + node.unit);
}
// ../../../node_modules/css-tree/lib/syntax/node/Feature.js
var exports_Feature = {};
__export(exports_Feature, {
  structure: () => structure16,
  parse: () => parse17,
  name: () => name16,
  generate: () => generate17
});
var SOLIDUS4 = 47;
var name16 = "Feature";
var structure16 = {
  kind: String,
  name: String,
  value: ["Identifier", "Number", "Dimension", "Ratio", "Function", null]
};
function parse17(kind) {
  const start = this.tokenStart;
  let name17;
  let value = null;
  this.eat(LeftParenthesis);
  this.skipSC();
  name17 = this.consume(Ident);
  this.skipSC();
  if (this.tokenType !== RightParenthesis) {
    this.eat(Colon);
    this.skipSC();
    switch (this.tokenType) {
      case Number2:
        if (this.lookupNonWSType(1) === Delim) {
          value = this.Ratio();
        } else {
          value = this.Number();
        }
        break;
      case Dimension:
        value = this.Dimension();
        break;
      case Ident:
        value = this.Identifier();
        break;
      case Function2:
        value = this.parseWithFallback(() => {
          const res = this.Function(this.readSequence, this.scope.Value);
          this.skipSC();
          if (this.isDelim(SOLIDUS4)) {
            this.error();
          }
          return res;
        }, () => {
          return this.Ratio();
        });
        break;
      default:
        this.error("Number, dimension, ratio or identifier is expected");
    }
    this.skipSC();
  }
  if (!this.eof) {
    this.eat(RightParenthesis);
  }
  return {
    type: "Feature",
    loc: this.getLocation(start, this.tokenStart),
    kind,
    name: name17,
    value
  };
}
function generate17(node) {
  this.token(LeftParenthesis, "(");
  this.token(Ident, node.name);
  if (node.value !== null) {
    this.token(Colon, ":");
    this.node(node.value);
  }
  this.token(RightParenthesis, ")");
}
// ../../../node_modules/css-tree/lib/syntax/node/FeatureFunction.js
var exports_FeatureFunction = {};
__export(exports_FeatureFunction, {
  structure: () => structure17,
  parse: () => parse18,
  name: () => name17,
  generate: () => generate18
});
var name17 = "FeatureFunction";
var structure17 = {
  kind: String,
  feature: String,
  value: ["Declaration", "Selector"]
};
function getFeatureParser(kind, name18) {
  const featuresOfKind = this.features[kind] || {};
  const parser = featuresOfKind[name18];
  if (typeof parser !== "function") {
    this.error(`Unknown feature ${name18}()`);
  }
  return parser;
}
function parse18(kind = "unknown") {
  const start = this.tokenStart;
  const functionName = this.consumeFunctionName();
  const valueParser = getFeatureParser.call(this, kind, functionName.toLowerCase());
  this.skipSC();
  const value = this.parseWithFallback(() => {
    const startValueToken = this.tokenIndex;
    const value2 = valueParser.call(this);
    if (this.eof === false && this.isBalanceEdge(startValueToken) === false) {
      this.error();
    }
    return value2;
  }, () => this.Raw(null, false));
  if (!this.eof) {
    this.eat(RightParenthesis);
  }
  return {
    type: "FeatureFunction",
    loc: this.getLocation(start, this.tokenStart),
    kind,
    feature: functionName,
    value
  };
}
function generate18(node) {
  this.token(Function2, node.feature + "(");
  this.node(node.value);
  this.token(RightParenthesis, ")");
}
// ../../../node_modules/css-tree/lib/syntax/node/FeatureRange.js
var exports_FeatureRange = {};
__export(exports_FeatureRange, {
  structure: () => structure18,
  parse: () => parse19,
  name: () => name18,
  generate: () => generate19
});
var SOLIDUS5 = 47;
var LESSTHANSIGN2 = 60;
var EQUALSSIGN2 = 61;
var GREATERTHANSIGN3 = 62;
var name18 = "FeatureRange";
var structure18 = {
  kind: String,
  left: ["Identifier", "Number", "Dimension", "Ratio", "Function"],
  leftComparison: String,
  middle: ["Identifier", "Number", "Dimension", "Ratio", "Function"],
  rightComparison: [String, null],
  right: ["Identifier", "Number", "Dimension", "Ratio", "Function", null]
};
function readTerm() {
  this.skipSC();
  switch (this.tokenType) {
    case Number2:
      if (this.isDelim(SOLIDUS5, this.lookupOffsetNonSC(1))) {
        return this.Ratio();
      } else {
        return this.Number();
      }
    case Dimension:
      return this.Dimension();
    case Ident:
      return this.Identifier();
    case Function2:
      return this.parseWithFallback(() => {
        const res = this.Function(this.readSequence, this.scope.Value);
        this.skipSC();
        if (this.isDelim(SOLIDUS5)) {
          this.error();
        }
        return res;
      }, () => {
        return this.Ratio();
      });
    default:
      this.error("Number, dimension, ratio or identifier is expected");
  }
}
function readComparison(expectColon) {
  this.skipSC();
  if (this.isDelim(LESSTHANSIGN2) || this.isDelim(GREATERTHANSIGN3)) {
    const value = this.source[this.tokenStart];
    this.next();
    if (this.isDelim(EQUALSSIGN2)) {
      this.next();
      return value + "=";
    }
    return value;
  }
  if (this.isDelim(EQUALSSIGN2)) {
    return "=";
  }
  this.error(`Expected ${expectColon ? '":", ' : ""}"<", ">", "=" or ")"`);
}
function parse19(kind = "unknown") {
  const start = this.tokenStart;
  this.skipSC();
  this.eat(LeftParenthesis);
  const left = readTerm.call(this);
  const leftComparison = readComparison.call(this, left.type === "Identifier");
  const middle = readTerm.call(this);
  let rightComparison = null;
  let right = null;
  if (this.lookupNonWSType(0) !== RightParenthesis) {
    rightComparison = readComparison.call(this);
    right = readTerm.call(this);
  }
  this.skipSC();
  this.eat(RightParenthesis);
  return {
    type: "FeatureRange",
    loc: this.getLocation(start, this.tokenStart),
    kind,
    left,
    leftComparison,
    middle,
    rightComparison,
    right
  };
}
function generate19(node) {
  this.token(LeftParenthesis, "(");
  this.node(node.left);
  this.tokenize(node.leftComparison);
  this.node(node.middle);
  if (node.right) {
    this.tokenize(node.rightComparison);
    this.node(node.right);
  }
  this.token(RightParenthesis, ")");
}
// ../../../node_modules/css-tree/lib/syntax/node/Function.js
var exports_Function = {};
__export(exports_Function, {
  walkContext: () => walkContext5,
  structure: () => structure19,
  parse: () => parse20,
  name: () => name19,
  generate: () => generate20
});
var name19 = "Function";
var walkContext5 = "function";
var structure19 = {
  name: String,
  children: [[]]
};
function parse20(readSequence2, recognizer) {
  const start = this.tokenStart;
  const name20 = this.consumeFunctionName();
  const nameLowerCase = name20.toLowerCase();
  let children;
  children = recognizer.hasOwnProperty(nameLowerCase) ? recognizer[nameLowerCase].call(this, recognizer) : readSequence2.call(this, recognizer);
  if (!this.eof) {
    this.eat(RightParenthesis);
  }
  return {
    type: "Function",
    loc: this.getLocation(start, this.tokenStart),
    name: name20,
    children
  };
}
function generate20(node) {
  this.token(Function2, node.name + "(");
  this.children(node);
  this.token(RightParenthesis, ")");
}
// ../../../node_modules/css-tree/lib/syntax/node/GeneralEnclosed.js
var exports_GeneralEnclosed = {};
__export(exports_GeneralEnclosed, {
  structure: () => structure20,
  parse: () => parse21,
  name: () => name20,
  generate: () => generate21
});
var name20 = "GeneralEnclosed";
var structure20 = {
  kind: String,
  function: [String, null],
  children: [[]]
};
function parse21(kind) {
  const start = this.tokenStart;
  let functionName = null;
  if (this.tokenType === Function2) {
    functionName = this.consumeFunctionName();
  } else {
    this.eat(LeftParenthesis);
  }
  const children = this.parseWithFallback(() => {
    const startValueToken = this.tokenIndex;
    const children2 = this.readSequence(this.scope.Value);
    if (this.eof === false && this.isBalanceEdge(startValueToken) === false) {
      this.error();
    }
    return children2;
  }, () => this.createSingleNodeList(this.Raw(null, false)));
  if (!this.eof) {
    this.eat(RightParenthesis);
  }
  return {
    type: "GeneralEnclosed",
    loc: this.getLocation(start, this.tokenStart),
    kind,
    function: functionName,
    children
  };
}
function generate21(node) {
  if (node.function) {
    this.token(Function2, node.function + "(");
  } else {
    this.token(LeftParenthesis, "(");
  }
  this.children(node);
  this.token(RightParenthesis, ")");
}
// ../../../node_modules/css-tree/lib/syntax/node/Hash.js
var exports_Hash = {};
__export(exports_Hash, {
  xxx: () => xxx,
  structure: () => structure21,
  parse: () => parse22,
  name: () => name21,
  generate: () => generate22
});
var xxx = "XXX";
var name21 = "Hash";
var structure21 = {
  value: String
};
function parse22() {
  const start = this.tokenStart;
  this.eat(Hash);
  return {
    type: "Hash",
    loc: this.getLocation(start, this.tokenStart),
    value: this.substrToCursor(start + 1)
  };
}
function generate22(node) {
  this.token(Hash, "#" + node.value);
}
// ../../../node_modules/css-tree/lib/syntax/node/Identifier.js
var exports_Identifier = {};
__export(exports_Identifier, {
  structure: () => structure22,
  parse: () => parse23,
  name: () => name22,
  generate: () => generate23
});
var name22 = "Identifier";
var structure22 = {
  name: String
};
function parse23() {
  return {
    type: "Identifier",
    loc: this.getLocation(this.tokenStart, this.tokenEnd),
    name: this.consume(Ident)
  };
}
function generate23(node) {
  this.token(Ident, node.name);
}
// ../../../node_modules/css-tree/lib/syntax/node/IdSelector.js
var exports_IdSelector = {};
__export(exports_IdSelector, {
  structure: () => structure23,
  parse: () => parse24,
  name: () => name23,
  generate: () => generate24
});
var name23 = "IdSelector";
var structure23 = {
  name: String
};
function parse24() {
  const start = this.tokenStart;
  this.eat(Hash);
  return {
    type: "IdSelector",
    loc: this.getLocation(start, this.tokenStart),
    name: this.substrToCursor(start + 1)
  };
}
function generate24(node) {
  this.token(Delim, "#" + node.name);
}
// ../../../node_modules/css-tree/lib/syntax/node/Layer.js
var exports_Layer = {};
__export(exports_Layer, {
  structure: () => structure24,
  parse: () => parse25,
  name: () => name24,
  generate: () => generate25
});
var FULLSTOP2 = 46;
var name24 = "Layer";
var structure24 = {
  name: String
};
function parse25() {
  let tokenStart = this.tokenStart;
  let name25 = this.consume(Ident);
  while (this.isDelim(FULLSTOP2)) {
    this.eat(Delim);
    name25 += "." + this.consume(Ident);
  }
  return {
    type: "Layer",
    loc: this.getLocation(tokenStart, this.tokenStart),
    name: name25
  };
}
function generate25(node) {
  this.tokenize(node.name);
}
// ../../../node_modules/css-tree/lib/syntax/node/LayerList.js
var exports_LayerList = {};
__export(exports_LayerList, {
  structure: () => structure25,
  parse: () => parse26,
  name: () => name25,
  generate: () => generate26
});
var name25 = "LayerList";
var structure25 = {
  children: [[
    "Layer"
  ]]
};
function parse26() {
  const children = this.createList();
  this.skipSC();
  while (!this.eof) {
    children.push(this.Layer());
    if (this.lookupTypeNonSC(0) !== Comma) {
      break;
    }
    this.skipSC();
    this.next();
    this.skipSC();
  }
  return {
    type: "LayerList",
    loc: this.getLocationFromList(children),
    children
  };
}
function generate26(node) {
  this.children(node, () => this.token(Comma, ","));
}
// ../../../node_modules/css-tree/lib/syntax/node/MediaQuery.js
var exports_MediaQuery = {};
__export(exports_MediaQuery, {
  structure: () => structure26,
  parse: () => parse27,
  name: () => name26,
  generate: () => generate27
});
var name26 = "MediaQuery";
var structure26 = {
  modifier: [String, null],
  mediaType: [String, null],
  condition: ["Condition", null]
};
function parse27() {
  const start = this.tokenStart;
  let modifier = null;
  let mediaType = null;
  let condition = null;
  this.skipSC();
  if (this.tokenType === Ident && this.lookupTypeNonSC(1) !== LeftParenthesis) {
    const ident = this.consume(Ident);
    const identLowerCase = ident.toLowerCase();
    if (identLowerCase === "not" || identLowerCase === "only") {
      this.skipSC();
      modifier = identLowerCase;
      mediaType = this.consume(Ident);
    } else {
      mediaType = ident;
    }
    switch (this.lookupTypeNonSC(0)) {
      case Ident: {
        this.skipSC();
        this.eatIdent("and");
        condition = this.Condition("media");
        break;
      }
      case LeftCurlyBracket:
      case Semicolon:
      case Comma:
      case EOF:
        break;
      default:
        this.error("Identifier or parenthesis is expected");
    }
  } else {
    switch (this.tokenType) {
      case Ident:
      case LeftParenthesis:
      case Function2: {
        condition = this.Condition("media");
        break;
      }
      case LeftCurlyBracket:
      case Semicolon:
      case EOF:
        break;
      default:
        this.error("Identifier or parenthesis is expected");
    }
  }
  return {
    type: "MediaQuery",
    loc: this.getLocation(start, this.tokenStart),
    modifier,
    mediaType,
    condition
  };
}
function generate27(node) {
  if (node.mediaType) {
    if (node.modifier) {
      this.token(Ident, node.modifier);
    }
    this.token(Ident, node.mediaType);
    if (node.condition) {
      this.token(Ident, "and");
      this.node(node.condition);
    }
  } else if (node.condition) {
    this.node(node.condition);
  }
}
// ../../../node_modules/css-tree/lib/syntax/node/MediaQueryList.js
var exports_MediaQueryList = {};
__export(exports_MediaQueryList, {
  structure: () => structure27,
  parse: () => parse28,
  name: () => name27,
  generate: () => generate28
});
var name27 = "MediaQueryList";
var structure27 = {
  children: [[
    "MediaQuery"
  ]]
};
function parse28() {
  const children = this.createList();
  this.skipSC();
  while (!this.eof) {
    children.push(this.MediaQuery());
    if (this.tokenType !== Comma) {
      break;
    }
    this.next();
  }
  return {
    type: "MediaQueryList",
    loc: this.getLocationFromList(children),
    children
  };
}
function generate28(node) {
  this.children(node, () => this.token(Comma, ","));
}
// ../../../node_modules/css-tree/lib/syntax/node/NestingSelector.js
var exports_NestingSelector = {};
__export(exports_NestingSelector, {
  structure: () => structure28,
  parse: () => parse29,
  name: () => name28,
  generate: () => generate29
});
var AMPERSAND5 = 38;
var name28 = "NestingSelector";
var structure28 = {};
function parse29() {
  const start = this.tokenStart;
  this.eatDelim(AMPERSAND5);
  return {
    type: "NestingSelector",
    loc: this.getLocation(start, this.tokenStart)
  };
}
function generate29() {
  this.token(Delim, "&");
}
// ../../../node_modules/css-tree/lib/syntax/node/Nth.js
var exports_Nth = {};
__export(exports_Nth, {
  structure: () => structure29,
  parse: () => parse30,
  name: () => name29,
  generate: () => generate30
});
var name29 = "Nth";
var structure29 = {
  nth: ["AnPlusB", "Identifier"],
  selector: ["SelectorList", null]
};
function parse30() {
  this.skipSC();
  const start = this.tokenStart;
  let end = start;
  let selector = null;
  let nth;
  if (this.lookupValue(0, "odd") || this.lookupValue(0, "even")) {
    nth = this.Identifier();
  } else {
    nth = this.AnPlusB();
  }
  end = this.tokenStart;
  this.skipSC();
  if (this.lookupValue(0, "of")) {
    this.next();
    selector = this.SelectorList();
    end = this.tokenStart;
  }
  return {
    type: "Nth",
    loc: this.getLocation(start, end),
    nth,
    selector
  };
}
function generate30(node) {
  this.node(node.nth);
  if (node.selector !== null) {
    this.token(Ident, "of");
    this.node(node.selector);
  }
}
// ../../../node_modules/css-tree/lib/syntax/node/Number.js
var exports_Number = {};
__export(exports_Number, {
  structure: () => structure30,
  parse: () => parse31,
  name: () => name30,
  generate: () => generate31
});
var name30 = "Number";
var structure30 = {
  value: String
};
function parse31() {
  return {
    type: "Number",
    loc: this.getLocation(this.tokenStart, this.tokenEnd),
    value: this.consume(Number2)
  };
}
function generate31(node) {
  this.token(Number2, node.value);
}
// ../../../node_modules/css-tree/lib/syntax/node/Operator.js
var exports_Operator = {};
__export(exports_Operator, {
  structure: () => structure31,
  parse: () => parse32,
  name: () => name31,
  generate: () => generate32
});
var name31 = "Operator";
var structure31 = {
  value: String
};
function parse32() {
  const start = this.tokenStart;
  this.next();
  return {
    type: "Operator",
    loc: this.getLocation(start, this.tokenStart),
    value: this.substrToCursor(start)
  };
}
function generate32(node) {
  this.tokenize(node.value);
}
// ../../../node_modules/css-tree/lib/syntax/node/Parentheses.js
var exports_Parentheses = {};
__export(exports_Parentheses, {
  structure: () => structure32,
  parse: () => parse33,
  name: () => name32,
  generate: () => generate33
});
var name32 = "Parentheses";
var structure32 = {
  children: [[]]
};
function parse33(readSequence2, recognizer) {
  const start = this.tokenStart;
  let children = null;
  this.eat(LeftParenthesis);
  children = readSequence2.call(this, recognizer);
  if (!this.eof) {
    this.eat(RightParenthesis);
  }
  return {
    type: "Parentheses",
    loc: this.getLocation(start, this.tokenStart),
    children
  };
}
function generate33(node) {
  this.token(LeftParenthesis, "(");
  this.children(node);
  this.token(RightParenthesis, ")");
}
// ../../../node_modules/css-tree/lib/syntax/node/Percentage.js
var exports_Percentage = {};
__export(exports_Percentage, {
  structure: () => structure33,
  parse: () => parse34,
  name: () => name33,
  generate: () => generate34
});
var name33 = "Percentage";
var structure33 = {
  value: String
};
function parse34() {
  return {
    type: "Percentage",
    loc: this.getLocation(this.tokenStart, this.tokenEnd),
    value: this.consumeNumber(Percentage)
  };
}
function generate34(node) {
  this.token(Percentage, node.value + "%");
}
// ../../../node_modules/css-tree/lib/syntax/node/PseudoClassSelector.js
var exports_PseudoClassSelector = {};
__export(exports_PseudoClassSelector, {
  walkContext: () => walkContext6,
  structure: () => structure34,
  parse: () => parse35,
  name: () => name34,
  generate: () => generate35
});
var name34 = "PseudoClassSelector";
var walkContext6 = "function";
var structure34 = {
  name: String,
  children: [["Raw"], null]
};
function parse35() {
  const start = this.tokenStart;
  let children = null;
  let name35;
  let nameLowerCase;
  this.eat(Colon);
  if (this.tokenType === Function2) {
    name35 = this.consumeFunctionName();
    nameLowerCase = name35.toLowerCase();
    if (this.lookupNonWSType(0) == RightParenthesis) {
      children = this.createList();
    } else if (hasOwnProperty.call(this.pseudo, nameLowerCase)) {
      this.skipSC();
      children = this.pseudo[nameLowerCase].call(this);
      this.skipSC();
    } else {
      children = this.createList();
      children.push(this.Raw(null, false));
    }
    this.eat(RightParenthesis);
  } else {
    name35 = this.consume(Ident);
  }
  return {
    type: "PseudoClassSelector",
    loc: this.getLocation(start, this.tokenStart),
    name: name35,
    children
  };
}
function generate35(node) {
  this.token(Colon, ":");
  if (node.children === null) {
    this.token(Ident, node.name);
  } else {
    this.token(Function2, node.name + "(");
    this.children(node);
    this.token(RightParenthesis, ")");
  }
}
// ../../../node_modules/css-tree/lib/syntax/node/PseudoElementSelector.js
var exports_PseudoElementSelector = {};
__export(exports_PseudoElementSelector, {
  walkContext: () => walkContext7,
  structure: () => structure35,
  parse: () => parse36,
  name: () => name35,
  generate: () => generate36
});
var name35 = "PseudoElementSelector";
var walkContext7 = "function";
var structure35 = {
  name: String,
  children: [["Raw"], null]
};
function parse36() {
  const start = this.tokenStart;
  let children = null;
  let name36;
  let nameLowerCase;
  this.eat(Colon);
  this.eat(Colon);
  if (this.tokenType === Function2) {
    name36 = this.consumeFunctionName();
    nameLowerCase = name36.toLowerCase();
    if (this.lookupNonWSType(0) == RightParenthesis) {
      children = this.createList();
    } else if (hasOwnProperty.call(this.pseudo, nameLowerCase)) {
      this.skipSC();
      children = this.pseudo[nameLowerCase].call(this);
      this.skipSC();
    } else {
      children = this.createList();
      children.push(this.Raw(null, false));
    }
    this.eat(RightParenthesis);
  } else {
    name36 = this.consume(Ident);
  }
  return {
    type: "PseudoElementSelector",
    loc: this.getLocation(start, this.tokenStart),
    name: name36,
    children
  };
}
function generate36(node) {
  this.token(Colon, ":");
  this.token(Colon, ":");
  if (node.children === null) {
    this.token(Ident, node.name);
  } else {
    this.token(Function2, node.name + "(");
    this.children(node);
    this.token(RightParenthesis, ")");
  }
}
// ../../../node_modules/css-tree/lib/syntax/node/Ratio.js
var exports_Ratio = {};
__export(exports_Ratio, {
  structure: () => structure36,
  parse: () => parse37,
  name: () => name36,
  generate: () => generate37
});
var SOLIDUS6 = 47;
function consumeTerm() {
  this.skipSC();
  switch (this.tokenType) {
    case Number2:
      return this.Number();
    case Function2:
      return this.Function(this.readSequence, this.scope.Value);
    default:
      this.error("Number of function is expected");
  }
}
var name36 = "Ratio";
var structure36 = {
  left: ["Number", "Function"],
  right: ["Number", "Function", null]
};
function parse37() {
  const start = this.tokenStart;
  const left = consumeTerm.call(this);
  let right = null;
  this.skipSC();
  if (this.isDelim(SOLIDUS6)) {
    this.eatDelim(SOLIDUS6);
    right = consumeTerm.call(this);
  }
  return {
    type: "Ratio",
    loc: this.getLocation(start, this.tokenStart),
    left,
    right
  };
}
function generate37(node) {
  this.node(node.left);
  this.token(Delim, "/");
  if (node.right) {
    this.node(node.right);
  } else {
    this.node(Number2, 1);
  }
}
// ../../../node_modules/css-tree/lib/syntax/node/Raw.js
var exports_Raw = {};
__export(exports_Raw, {
  structure: () => structure37,
  parse: () => parse38,
  name: () => name37,
  generate: () => generate38
});
function getOffsetExcludeWS() {
  if (this.tokenIndex > 0) {
    if (this.lookupType(-1) === WhiteSpace) {
      return this.tokenIndex > 1 ? this.getTokenStart(this.tokenIndex - 1) : this.firstCharOffset;
    }
  }
  return this.tokenStart;
}
var name37 = "Raw";
var structure37 = {
  value: String
};
function parse38(consumeUntil, excludeWhiteSpace) {
  const startOffset = this.getTokenStart(this.tokenIndex);
  let endOffset;
  this.skipUntilBalanced(this.tokenIndex, consumeUntil || this.consumeUntilBalanceEnd);
  if (excludeWhiteSpace && this.tokenStart > startOffset) {
    endOffset = getOffsetExcludeWS.call(this);
  } else {
    endOffset = this.tokenStart;
  }
  return {
    type: "Raw",
    loc: this.getLocation(startOffset, endOffset),
    value: this.substring(startOffset, endOffset)
  };
}
function generate38(node) {
  this.tokenize(node.value);
}
// ../../../node_modules/css-tree/lib/syntax/node/Rule.js
var exports_Rule = {};
__export(exports_Rule, {
  walkContext: () => walkContext8,
  structure: () => structure38,
  parse: () => parse39,
  name: () => name38,
  generate: () => generate39
});
function consumeRaw4() {
  return this.Raw(this.consumeUntilLeftCurlyBracket, true);
}
function consumePrelude() {
  const prelude = this.SelectorList();
  if (prelude.type !== "Raw" && this.eof === false && this.tokenType !== LeftCurlyBracket) {
    this.error();
  }
  return prelude;
}
var name38 = "Rule";
var walkContext8 = "rule";
var structure38 = {
  prelude: ["SelectorList", "Raw"],
  block: ["Block"]
};
function parse39() {
  const startToken = this.tokenIndex;
  const startOffset = this.tokenStart;
  let prelude;
  let block;
  if (this.parseRulePrelude) {
    prelude = this.parseWithFallback(consumePrelude, consumeRaw4);
  } else {
    prelude = consumeRaw4.call(this, startToken);
  }
  block = this.Block(true);
  return {
    type: "Rule",
    loc: this.getLocation(startOffset, this.tokenStart),
    prelude,
    block
  };
}
function generate39(node) {
  this.node(node.prelude);
  this.node(node.block);
}
// ../../../node_modules/css-tree/lib/syntax/node/Scope.js
var exports_Scope = {};
__export(exports_Scope, {
  structure: () => structure39,
  parse: () => parse40,
  name: () => name39,
  generate: () => generate40
});
var name39 = "Scope";
var structure39 = {
  root: ["SelectorList", "Raw", null],
  limit: ["SelectorList", "Raw", null]
};
function parse40() {
  let root = null;
  let limit = null;
  this.skipSC();
  const startOffset = this.tokenStart;
  if (this.tokenType === LeftParenthesis) {
    this.next();
    this.skipSC();
    root = this.parseWithFallback(this.SelectorList, () => this.Raw(false, true));
    this.skipSC();
    this.eat(RightParenthesis);
  }
  if (this.lookupNonWSType(0) === Ident) {
    this.skipSC();
    this.eatIdent("to");
    this.skipSC();
    this.eat(LeftParenthesis);
    this.skipSC();
    limit = this.parseWithFallback(this.SelectorList, () => this.Raw(false, true));
    this.skipSC();
    this.eat(RightParenthesis);
  }
  return {
    type: "Scope",
    loc: this.getLocation(startOffset, this.tokenStart),
    root,
    limit
  };
}
function generate40(node) {
  if (node.root) {
    this.token(LeftParenthesis, "(");
    this.node(node.root);
    this.token(RightParenthesis, ")");
  }
  if (node.limit) {
    this.token(Ident, "to");
    this.token(LeftParenthesis, "(");
    this.node(node.limit);
    this.token(RightParenthesis, ")");
  }
}
// ../../../node_modules/css-tree/lib/syntax/node/Selector.js
var exports_Selector = {};
__export(exports_Selector, {
  structure: () => structure40,
  parse: () => parse41,
  name: () => name40,
  generate: () => generate41
});
var name40 = "Selector";
var structure40 = {
  children: [[
    "TypeSelector",
    "IdSelector",
    "ClassSelector",
    "AttributeSelector",
    "PseudoClassSelector",
    "PseudoElementSelector",
    "Combinator"
  ]]
};
function parse41() {
  const children = this.readSequence(this.scope.Selector);
  if (this.getFirstListNode(children) === null) {
    this.error("Selector is expected");
  }
  return {
    type: "Selector",
    loc: this.getLocationFromList(children),
    children
  };
}
function generate41(node) {
  this.children(node);
}
// ../../../node_modules/css-tree/lib/syntax/node/SelectorList.js
var exports_SelectorList = {};
__export(exports_SelectorList, {
  walkContext: () => walkContext9,
  structure: () => structure41,
  parse: () => parse42,
  name: () => name41,
  generate: () => generate42
});
var name41 = "SelectorList";
var walkContext9 = "selector";
var structure41 = {
  children: [[
    "Selector",
    "Raw"
  ]]
};
function parse42() {
  const children = this.createList();
  while (!this.eof) {
    children.push(this.Selector());
    if (this.tokenType === Comma) {
      this.next();
      continue;
    }
    break;
  }
  return {
    type: "SelectorList",
    loc: this.getLocationFromList(children),
    children
  };
}
function generate42(node) {
  this.children(node, () => this.token(Comma, ","));
}
// ../../../node_modules/css-tree/lib/syntax/node/String.js
var exports_String = {};
__export(exports_String, {
  structure: () => structure42,
  parse: () => parse43,
  name: () => name42,
  generate: () => generate43
});

// ../../../node_modules/css-tree/lib/utils/string.js
var REVERSE_SOLIDUS = 92;
var QUOTATION_MARK = 34;
var APOSTROPHE2 = 39;
function decode(str) {
  const len = str.length;
  const firstChar = str.charCodeAt(0);
  const start = firstChar === QUOTATION_MARK || firstChar === APOSTROPHE2 ? 1 : 0;
  const end = start === 1 && len > 1 && str.charCodeAt(len - 1) === firstChar ? len - 2 : len - 1;
  let decoded = "";
  for (let i = start;i <= end; i++) {
    let code2 = str.charCodeAt(i);
    if (code2 === REVERSE_SOLIDUS) {
      if (i === end) {
        if (i !== len - 1) {
          decoded = str.substr(i + 1);
        }
        break;
      }
      code2 = str.charCodeAt(++i);
      if (isValidEscape(REVERSE_SOLIDUS, code2)) {
        const escapeStart = i - 1;
        const escapeEnd = consumeEscaped(str, escapeStart);
        i = escapeEnd - 1;
        decoded += decodeEscaped(str.substring(escapeStart + 1, escapeEnd));
      } else {
        if (code2 === 13 && str.charCodeAt(i + 1) === 10) {
          i++;
        }
      }
    } else {
      decoded += str[i];
    }
  }
  return decoded;
}
function encode(str, apostrophe) {
  const quote = apostrophe ? "'" : '"';
  const quoteCode = apostrophe ? APOSTROPHE2 : QUOTATION_MARK;
  let encoded = "";
  let wsBeforeHexIsNeeded = false;
  for (let i = 0;i < str.length; i++) {
    const code2 = str.charCodeAt(i);
    if (code2 === 0) {
      encoded += "�";
      continue;
    }
    if (code2 <= 31 || code2 === 127) {
      encoded += "\\" + code2.toString(16);
      wsBeforeHexIsNeeded = true;
      continue;
    }
    if (code2 === quoteCode || code2 === REVERSE_SOLIDUS) {
      encoded += "\\" + str.charAt(i);
      wsBeforeHexIsNeeded = false;
    } else {
      if (wsBeforeHexIsNeeded && (isHexDigit(code2) || isWhiteSpace(code2))) {
        encoded += " ";
      }
      encoded += str.charAt(i);
      wsBeforeHexIsNeeded = false;
    }
  }
  return quote + encoded + quote;
}

// ../../../node_modules/css-tree/lib/syntax/node/String.js
var name42 = "String";
var structure42 = {
  value: String
};
function parse43() {
  return {
    type: "String",
    loc: this.getLocation(this.tokenStart, this.tokenEnd),
    value: decode(this.consume(String2))
  };
}
function generate43(node) {
  this.token(String2, encode(node.value));
}
// ../../../node_modules/css-tree/lib/syntax/node/StyleSheet.js
var exports_StyleSheet = {};
__export(exports_StyleSheet, {
  walkContext: () => walkContext10,
  structure: () => structure43,
  parse: () => parse44,
  name: () => name43,
  generate: () => generate44
});
var EXCLAMATIONMARK4 = 33;
function consumeRaw5() {
  return this.Raw(null, false);
}
var name43 = "StyleSheet";
var walkContext10 = "stylesheet";
var structure43 = {
  children: [[
    "Comment",
    "CDO",
    "CDC",
    "Atrule",
    "Rule",
    "Raw"
  ]]
};
function parse44() {
  const start = this.tokenStart;
  const children = this.createList();
  let child2;
  scan:
    while (!this.eof) {
      switch (this.tokenType) {
        case WhiteSpace:
          this.next();
          continue;
        case Comment:
          if (this.charCodeAt(this.tokenStart + 2) !== EXCLAMATIONMARK4) {
            this.next();
            continue;
          }
          child2 = this.Comment();
          break;
        case CDO:
          child2 = this.CDO();
          break;
        case CDC:
          child2 = this.CDC();
          break;
        case AtKeyword:
          child2 = this.parseWithFallback(this.Atrule, consumeRaw5);
          break;
        default:
          child2 = this.parseWithFallback(this.Rule, consumeRaw5);
      }
      children.push(child2);
    }
  return {
    type: "StyleSheet",
    loc: this.getLocation(start, this.tokenStart),
    children
  };
}
function generate44(node) {
  this.children(node);
}
// ../../../node_modules/css-tree/lib/syntax/node/SupportsDeclaration.js
var exports_SupportsDeclaration = {};
__export(exports_SupportsDeclaration, {
  structure: () => structure44,
  parse: () => parse45,
  name: () => name44,
  generate: () => generate45
});
var name44 = "SupportsDeclaration";
var structure44 = {
  declaration: "Declaration"
};
function parse45() {
  const start = this.tokenStart;
  this.eat(LeftParenthesis);
  this.skipSC();
  const declaration = this.Declaration();
  if (!this.eof) {
    this.eat(RightParenthesis);
  }
  return {
    type: "SupportsDeclaration",
    loc: this.getLocation(start, this.tokenStart),
    declaration
  };
}
function generate45(node) {
  this.token(LeftParenthesis, "(");
  this.node(node.declaration);
  this.token(RightParenthesis, ")");
}
// ../../../node_modules/css-tree/lib/syntax/node/TypeSelector.js
var exports_TypeSelector = {};
__export(exports_TypeSelector, {
  structure: () => structure45,
  parse: () => parse46,
  name: () => name45,
  generate: () => generate46
});
var ASTERISK5 = 42;
var VERTICALLINE3 = 124;
function eatIdentifierOrAsterisk() {
  if (this.tokenType !== Ident && this.isDelim(ASTERISK5) === false) {
    this.error("Identifier or asterisk is expected");
  }
  this.next();
}
var name45 = "TypeSelector";
var structure45 = {
  name: String
};
function parse46() {
  const start = this.tokenStart;
  if (this.isDelim(VERTICALLINE3)) {
    this.next();
    eatIdentifierOrAsterisk.call(this);
  } else {
    eatIdentifierOrAsterisk.call(this);
    if (this.isDelim(VERTICALLINE3)) {
      this.next();
      eatIdentifierOrAsterisk.call(this);
    }
  }
  return {
    type: "TypeSelector",
    loc: this.getLocation(start, this.tokenStart),
    name: this.substrToCursor(start)
  };
}
function generate46(node) {
  this.tokenize(node.name);
}
// ../../../node_modules/css-tree/lib/syntax/node/UnicodeRange.js
var exports_UnicodeRange = {};
__export(exports_UnicodeRange, {
  structure: () => structure46,
  parse: () => parse47,
  name: () => name46,
  generate: () => generate47
});
var PLUSSIGN8 = 43;
var HYPHENMINUS6 = 45;
var QUESTIONMARK3 = 63;
function eatHexSequence(offset, allowDash) {
  let len = 0;
  for (let pos = this.tokenStart + offset;pos < this.tokenEnd; pos++) {
    const code2 = this.charCodeAt(pos);
    if (code2 === HYPHENMINUS6 && allowDash && len !== 0) {
      eatHexSequence.call(this, offset + len + 1, false);
      return -1;
    }
    if (!isHexDigit(code2)) {
      this.error(allowDash && len !== 0 ? "Hyphen minus" + (len < 6 ? " or hex digit" : "") + " is expected" : len < 6 ? "Hex digit is expected" : "Unexpected input", pos);
    }
    if (++len > 6) {
      this.error("Too many hex digits", pos);
    }
  }
  this.next();
  return len;
}
function eatQuestionMarkSequence(max) {
  let count = 0;
  while (this.isDelim(QUESTIONMARK3)) {
    if (++count > max) {
      this.error("Too many question marks");
    }
    this.next();
  }
}
function startsWith2(code2) {
  if (this.charCodeAt(this.tokenStart) !== code2) {
    this.error((code2 === PLUSSIGN8 ? "Plus sign" : "Hyphen minus") + " is expected");
  }
}
function scanUnicodeRange() {
  let hexLength = 0;
  switch (this.tokenType) {
    case Number2:
      hexLength = eatHexSequence.call(this, 1, true);
      if (this.isDelim(QUESTIONMARK3)) {
        eatQuestionMarkSequence.call(this, 6 - hexLength);
        break;
      }
      if (this.tokenType === Dimension || this.tokenType === Number2) {
        startsWith2.call(this, HYPHENMINUS6);
        eatHexSequence.call(this, 1, false);
        break;
      }
      break;
    case Dimension:
      hexLength = eatHexSequence.call(this, 1, true);
      if (hexLength > 0) {
        eatQuestionMarkSequence.call(this, 6 - hexLength);
      }
      break;
    default:
      this.eatDelim(PLUSSIGN8);
      if (this.tokenType === Ident) {
        hexLength = eatHexSequence.call(this, 0, true);
        if (hexLength > 0) {
          eatQuestionMarkSequence.call(this, 6 - hexLength);
        }
        break;
      }
      if (this.isDelim(QUESTIONMARK3)) {
        this.next();
        eatQuestionMarkSequence.call(this, 5);
        break;
      }
      this.error("Hex digit or question mark is expected");
  }
}
var name46 = "UnicodeRange";
var structure46 = {
  value: String
};
function parse47() {
  const start = this.tokenStart;
  this.eatIdent("u");
  scanUnicodeRange.call(this);
  return {
    type: "UnicodeRange",
    loc: this.getLocation(start, this.tokenStart),
    value: this.substrToCursor(start)
  };
}
function generate47(node) {
  this.tokenize(node.value);
}
// ../../../node_modules/css-tree/lib/syntax/node/Url.js
var exports_Url = {};
__export(exports_Url, {
  structure: () => structure47,
  parse: () => parse48,
  name: () => name47,
  generate: () => generate48
});

// ../../../node_modules/css-tree/lib/utils/url.js
var SPACE3 = 32;
var REVERSE_SOLIDUS2 = 92;
var QUOTATION_MARK2 = 34;
var APOSTROPHE3 = 39;
var LEFTPARENTHESIS3 = 40;
var RIGHTPARENTHESIS3 = 41;
function decode2(str) {
  const len = str.length;
  let start = 4;
  let end = str.charCodeAt(len - 1) === RIGHTPARENTHESIS3 ? len - 2 : len - 1;
  let decoded = "";
  while (start < end && isWhiteSpace(str.charCodeAt(start))) {
    start++;
  }
  while (start < end && isWhiteSpace(str.charCodeAt(end))) {
    end--;
  }
  for (let i = start;i <= end; i++) {
    let code2 = str.charCodeAt(i);
    if (code2 === REVERSE_SOLIDUS2) {
      if (i === end) {
        if (i !== len - 1) {
          decoded = str.substr(i + 1);
        }
        break;
      }
      code2 = str.charCodeAt(++i);
      if (isValidEscape(REVERSE_SOLIDUS2, code2)) {
        const escapeStart = i - 1;
        const escapeEnd = consumeEscaped(str, escapeStart);
        i = escapeEnd - 1;
        decoded += decodeEscaped(str.substring(escapeStart + 1, escapeEnd));
      } else {
        if (code2 === 13 && str.charCodeAt(i + 1) === 10) {
          i++;
        }
      }
    } else {
      decoded += str[i];
    }
  }
  return decoded;
}
function encode2(str) {
  let encoded = "";
  let wsBeforeHexIsNeeded = false;
  for (let i = 0;i < str.length; i++) {
    const code2 = str.charCodeAt(i);
    if (code2 === 0) {
      encoded += "�";
      continue;
    }
    if (code2 <= 31 || code2 === 127) {
      encoded += "\\" + code2.toString(16);
      wsBeforeHexIsNeeded = true;
      continue;
    }
    if (code2 === SPACE3 || code2 === REVERSE_SOLIDUS2 || code2 === QUOTATION_MARK2 || code2 === APOSTROPHE3 || code2 === LEFTPARENTHESIS3 || code2 === RIGHTPARENTHESIS3) {
      encoded += "\\" + str.charAt(i);
      wsBeforeHexIsNeeded = false;
    } else {
      if (wsBeforeHexIsNeeded && isHexDigit(code2)) {
        encoded += " ";
      }
      encoded += str.charAt(i);
      wsBeforeHexIsNeeded = false;
    }
  }
  return "url(" + encoded + ")";
}

// ../../../node_modules/css-tree/lib/syntax/node/Url.js
var name47 = "Url";
var structure47 = {
  value: String
};
function parse48() {
  const start = this.tokenStart;
  let value;
  switch (this.tokenType) {
    case Url:
      value = decode2(this.consume(Url));
      break;
    case Function2:
      if (!this.cmpStr(this.tokenStart, this.tokenEnd, "url(")) {
        this.error("Function name must be `url`");
      }
      this.eat(Function2);
      this.skipSC();
      value = decode(this.consume(String2));
      this.skipSC();
      if (!this.eof) {
        this.eat(RightParenthesis);
      }
      break;
    default:
      this.error("Url or Function is expected");
  }
  return {
    type: "Url",
    loc: this.getLocation(start, this.tokenStart),
    value
  };
}
function generate48(node) {
  this.token(Url, encode2(node.value));
}
// ../../../node_modules/css-tree/lib/syntax/node/Value.js
var exports_Value = {};
__export(exports_Value, {
  structure: () => structure48,
  parse: () => parse49,
  name: () => name48,
  generate: () => generate49
});
var name48 = "Value";
var structure48 = {
  children: [[]]
};
function parse49() {
  const start = this.tokenStart;
  const children = this.readSequence(this.scope.Value);
  return {
    type: "Value",
    loc: this.getLocation(start, this.tokenStart),
    children
  };
}
function generate49(node) {
  this.children(node);
}
// ../../../node_modules/css-tree/lib/syntax/node/WhiteSpace.js
var exports_WhiteSpace = {};
__export(exports_WhiteSpace, {
  structure: () => structure49,
  parse: () => parse50,
  name: () => name49,
  generate: () => generate50
});
var SPACE4 = Object.freeze({
  type: "WhiteSpace",
  loc: null,
  value: " "
});
var name49 = "WhiteSpace";
var structure49 = {
  value: String
};
function parse50() {
  this.eat(WhiteSpace);
  return SPACE4;
}
function generate50(node) {
  this.token(WhiteSpace, node.value);
}
// ../../../node_modules/css-tree/lib/syntax/config/lexer.js
var lexer_default = {
  generic: true,
  cssWideKeywords,
  ...data_default,
  node: exports_node
};

// ../../../node_modules/css-tree/lib/syntax/scope/index.js
var exports_scope = {};
__export(exports_scope, {
  Value: () => value_default,
  Selector: () => selector_default,
  AtrulePrelude: () => atrulePrelude_default
});

// ../../../node_modules/css-tree/lib/syntax/scope/default.js
var NUMBERSIGN4 = 35;
var ASTERISK6 = 42;
var PLUSSIGN9 = 43;
var HYPHENMINUS7 = 45;
var SOLIDUS7 = 47;
var U2 = 117;
function defaultRecognizer(context) {
  switch (this.tokenType) {
    case Hash:
      return this.Hash();
    case Comma:
      return this.Operator();
    case LeftParenthesis:
      return this.Parentheses(this.readSequence, context.recognizer);
    case LeftSquareBracket:
      return this.Brackets(this.readSequence, context.recognizer);
    case String2:
      return this.String();
    case Dimension:
      return this.Dimension();
    case Percentage:
      return this.Percentage();
    case Number2:
      return this.Number();
    case Function2:
      return this.cmpStr(this.tokenStart, this.tokenEnd, "url(") ? this.Url() : this.Function(this.readSequence, context.recognizer);
    case Url:
      return this.Url();
    case Ident:
      if (this.cmpChar(this.tokenStart, U2) && this.cmpChar(this.tokenStart + 1, PLUSSIGN9)) {
        return this.UnicodeRange();
      } else {
        return this.Identifier();
      }
    case Delim: {
      const code2 = this.charCodeAt(this.tokenStart);
      if (code2 === SOLIDUS7 || code2 === ASTERISK6 || code2 === PLUSSIGN9 || code2 === HYPHENMINUS7) {
        return this.Operator();
      }
      if (code2 === NUMBERSIGN4) {
        this.error("Hex or identifier is expected", this.tokenStart + 1);
      }
      break;
    }
  }
}

// ../../../node_modules/css-tree/lib/syntax/scope/atrulePrelude.js
var atrulePrelude_default = {
  getNode: defaultRecognizer
};
// ../../../node_modules/css-tree/lib/syntax/scope/selector.js
var NUMBERSIGN5 = 35;
var AMPERSAND6 = 38;
var ASTERISK7 = 42;
var PLUSSIGN10 = 43;
var SOLIDUS8 = 47;
var FULLSTOP3 = 46;
var GREATERTHANSIGN4 = 62;
var VERTICALLINE4 = 124;
var TILDE3 = 126;
function onWhiteSpace(next, children) {
  if (children.last !== null && children.last.type !== "Combinator" && next !== null && next.type !== "Combinator") {
    children.push({
      type: "Combinator",
      loc: null,
      name: " "
    });
  }
}
function getNode() {
  switch (this.tokenType) {
    case LeftSquareBracket:
      return this.AttributeSelector();
    case Hash:
      return this.IdSelector();
    case Colon:
      if (this.lookupType(1) === Colon) {
        return this.PseudoElementSelector();
      } else {
        return this.PseudoClassSelector();
      }
    case Ident:
      return this.TypeSelector();
    case Number2:
    case Percentage:
      return this.Percentage();
    case Dimension:
      if (this.charCodeAt(this.tokenStart) === FULLSTOP3) {
        this.error("Identifier is expected", this.tokenStart + 1);
      }
      break;
    case Delim: {
      const code2 = this.charCodeAt(this.tokenStart);
      switch (code2) {
        case PLUSSIGN10:
        case GREATERTHANSIGN4:
        case TILDE3:
        case SOLIDUS8:
          return this.Combinator();
        case FULLSTOP3:
          return this.ClassSelector();
        case ASTERISK7:
        case VERTICALLINE4:
          return this.TypeSelector();
        case NUMBERSIGN5:
          return this.IdSelector();
        case AMPERSAND6:
          return this.NestingSelector();
      }
      break;
    }
  }
}
var selector_default = {
  onWhiteSpace,
  getNode
};
// ../../../node_modules/css-tree/lib/syntax/function/expression.js
function expression_default() {
  return this.createSingleNodeList(this.Raw(null, false));
}

// ../../../node_modules/css-tree/lib/syntax/function/var.js
function var_default() {
  const children = this.createList();
  this.skipSC();
  children.push(this.Identifier());
  this.skipSC();
  if (this.tokenType === Comma) {
    children.push(this.Operator());
    const startIndex = this.tokenIndex;
    const value = this.parseCustomProperty ? this.Value(null) : this.Raw(this.consumeUntilExclamationMarkOrSemicolon, false);
    if (value.type === "Value" && value.children.isEmpty) {
      for (let offset = startIndex - this.tokenIndex;offset <= 0; offset++) {
        if (this.lookupType(offset) === WhiteSpace) {
          value.children.appendData({
            type: "WhiteSpace",
            loc: null,
            value: " "
          });
          break;
        }
      }
    }
    children.push(value);
  }
  return children;
}

// ../../../node_modules/css-tree/lib/syntax/scope/value.js
function isPlusMinusOperator(node) {
  return node !== null && node.type === "Operator" && (node.value[node.value.length - 1] === "-" || node.value[node.value.length - 1] === "+");
}
var value_default = {
  getNode: defaultRecognizer,
  onWhiteSpace(next, children) {
    if (isPlusMinusOperator(next)) {
      next.value = " " + next.value;
    }
    if (isPlusMinusOperator(children.last)) {
      children.last.value += " ";
    }
  },
  expression: expression_default,
  var: var_default
};
// ../../../node_modules/css-tree/lib/syntax/atrule/container.js
var nonContainerNameKeywords = new Set(["none", "and", "not", "or"]);
var container_default = {
  parse: {
    prelude() {
      const children = this.createList();
      if (this.tokenType === Ident) {
        const name50 = this.substring(this.tokenStart, this.tokenEnd);
        if (!nonContainerNameKeywords.has(name50.toLowerCase())) {
          children.push(this.Identifier());
        }
      }
      children.push(this.Condition("container"));
      return children;
    },
    block(nested = false) {
      return this.Block(nested);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/font-face.js
var font_face_default = {
  parse: {
    prelude: null,
    block() {
      return this.Block(true);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/import.js
function parseWithFallback(parse51, fallback) {
  return this.parseWithFallback(() => {
    try {
      return parse51.call(this);
    } finally {
      this.skipSC();
      if (this.lookupNonWSType(0) !== RightParenthesis) {
        this.error();
      }
    }
  }, fallback || (() => this.Raw(null, true)));
}
var parseFunctions = {
  layer() {
    this.skipSC();
    const children = this.createList();
    const node = parseWithFallback.call(this, this.Layer);
    if (node.type !== "Raw" || node.value !== "") {
      children.push(node);
    }
    return children;
  },
  supports() {
    this.skipSC();
    const children = this.createList();
    const node = parseWithFallback.call(this, this.Declaration, () => parseWithFallback.call(this, () => this.Condition("supports")));
    if (node.type !== "Raw" || node.value !== "") {
      children.push(node);
    }
    return children;
  }
};
var import_default3 = {
  parse: {
    prelude() {
      const children = this.createList();
      switch (this.tokenType) {
        case String2:
          children.push(this.String());
          break;
        case Url:
        case Function2:
          children.push(this.Url());
          break;
        default:
          this.error("String or url() is expected");
      }
      this.skipSC();
      if (this.tokenType === Ident && this.cmpStr(this.tokenStart, this.tokenEnd, "layer")) {
        children.push(this.Identifier());
      } else if (this.tokenType === Function2 && this.cmpStr(this.tokenStart, this.tokenEnd, "layer(")) {
        children.push(this.Function(null, parseFunctions));
      }
      this.skipSC();
      if (this.tokenType === Function2 && this.cmpStr(this.tokenStart, this.tokenEnd, "supports(")) {
        children.push(this.Function(null, parseFunctions));
      }
      if (this.lookupNonWSType(0) === Ident || this.lookupNonWSType(0) === LeftParenthesis) {
        children.push(this.MediaQueryList());
      }
      return children;
    },
    block: null
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/layer.js
var layer_default = {
  parse: {
    prelude() {
      return this.createSingleNodeList(this.LayerList());
    },
    block() {
      return this.Block(false);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/media.js
var media_default = {
  parse: {
    prelude() {
      return this.createSingleNodeList(this.MediaQueryList());
    },
    block(nested = false) {
      return this.Block(nested);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/nest.js
var nest_default = {
  parse: {
    prelude() {
      return this.createSingleNodeList(this.SelectorList());
    },
    block() {
      return this.Block(true);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/page.js
var page_default = {
  parse: {
    prelude() {
      return this.createSingleNodeList(this.SelectorList());
    },
    block() {
      return this.Block(true);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/scope.js
var scope_default = {
  parse: {
    prelude() {
      return this.createSingleNodeList(this.Scope());
    },
    block(nested = false) {
      return this.Block(nested);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/starting-style.js
var starting_style_default = {
  parse: {
    prelude: null,
    block(nested = false) {
      return this.Block(nested);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/supports.js
var supports_default = {
  parse: {
    prelude() {
      return this.createSingleNodeList(this.Condition("supports"));
    },
    block(nested = false) {
      return this.Block(nested);
    }
  }
};

// ../../../node_modules/css-tree/lib/syntax/atrule/index.js
var atrule_default = {
  container: container_default,
  "font-face": font_face_default,
  import: import_default3,
  layer: layer_default,
  media: media_default,
  nest: nest_default,
  page: page_default,
  scope: scope_default,
  "starting-style": starting_style_default,
  supports: supports_default
};

// ../../../node_modules/css-tree/lib/syntax/pseudo/lang.js
function parseLanguageRangeList() {
  const children = this.createList();
  this.skipSC();
  loop:
    while (!this.eof) {
      switch (this.tokenType) {
        case Ident:
          children.push(this.Identifier());
          break;
        case String2:
          children.push(this.String());
          break;
        case Comma:
          children.push(this.Operator());
          break;
        case RightParenthesis:
          break loop;
        default:
          this.error("Identifier, string or comma is expected");
      }
      this.skipSC();
    }
  return children;
}

// ../../../node_modules/css-tree/lib/syntax/pseudo/index.js
var selectorList = {
  parse() {
    return this.createSingleNodeList(this.SelectorList());
  }
};
var selector = {
  parse() {
    return this.createSingleNodeList(this.Selector());
  }
};
var identList = {
  parse() {
    return this.createSingleNodeList(this.Identifier());
  }
};
var langList = {
  parse: parseLanguageRangeList
};
var nth = {
  parse() {
    return this.createSingleNodeList(this.Nth());
  }
};
var pseudo_default = {
  dir: identList,
  has: selectorList,
  lang: langList,
  matches: selectorList,
  is: selectorList,
  "-moz-any": selectorList,
  "-webkit-any": selectorList,
  where: selectorList,
  not: selectorList,
  "nth-child": nth,
  "nth-last-child": nth,
  "nth-last-of-type": nth,
  "nth-of-type": nth,
  slotted: selector,
  host: selector,
  "host-context": selector
};

// ../../../node_modules/css-tree/lib/syntax/node/index-parse.js
var exports_index_parse = {};
__export(exports_index_parse, {
  WhiteSpace: () => parse50,
  Value: () => parse49,
  Url: () => parse48,
  UnicodeRange: () => parse47,
  TypeSelector: () => parse46,
  SupportsDeclaration: () => parse45,
  StyleSheet: () => parse44,
  String: () => parse43,
  SelectorList: () => parse42,
  Selector: () => parse41,
  Scope: () => parse40,
  Rule: () => parse39,
  Raw: () => parse38,
  Ratio: () => parse37,
  PseudoElementSelector: () => parse36,
  PseudoClassSelector: () => parse35,
  Percentage: () => parse34,
  Parentheses: () => parse33,
  Operator: () => parse32,
  Number: () => parse31,
  Nth: () => parse30,
  NestingSelector: () => parse29,
  MediaQueryList: () => parse28,
  MediaQuery: () => parse27,
  LayerList: () => parse26,
  Layer: () => parse25,
  Identifier: () => parse23,
  IdSelector: () => parse24,
  Hash: () => parse22,
  GeneralEnclosed: () => parse21,
  Function: () => parse20,
  FeatureRange: () => parse19,
  FeatureFunction: () => parse18,
  Feature: () => parse17,
  Dimension: () => parse16,
  DeclarationList: () => parse15,
  Declaration: () => parse14,
  Condition: () => parse13,
  Comment: () => parse12,
  Combinator: () => parse11,
  ClassSelector: () => parse10,
  CDO: () => parse9,
  CDC: () => parse8,
  Brackets: () => parse7,
  Block: () => parse6,
  AttributeSelector: () => parse5,
  AtrulePrelude: () => parse4,
  Atrule: () => parse3,
  AnPlusB: () => parse2
});

// ../../../node_modules/css-tree/lib/syntax/config/parser.js
var parser_default = {
  parseContext: {
    default: "StyleSheet",
    stylesheet: "StyleSheet",
    atrule: "Atrule",
    atrulePrelude(options) {
      return this.AtrulePrelude(options.atrule ? String(options.atrule) : null);
    },
    mediaQueryList: "MediaQueryList",
    mediaQuery: "MediaQuery",
    condition(options) {
      return this.Condition(options.kind);
    },
    rule: "Rule",
    selectorList: "SelectorList",
    selector: "Selector",
    block() {
      return this.Block(true);
    },
    declarationList: "DeclarationList",
    declaration: "Declaration",
    value: "Value"
  },
  features: {
    supports: {
      selector() {
        return this.Selector();
      }
    },
    container: {
      style() {
        return this.Declaration();
      }
    }
  },
  scope: exports_scope,
  atrule: atrule_default,
  pseudo: pseudo_default,
  node: exports_index_parse
};

// ../../../node_modules/css-tree/lib/syntax/config/walker.js
var walker_default = {
  node: exports_node
};

// ../../../node_modules/css-tree/lib/syntax/index.js
var syntax_default = create_default({
  ...lexer_default,
  ...parser_default,
  ...walker_default
});

// ../../../node_modules/css-tree/lib/index.js
var {
  tokenize: tokenize2,
  parse: parse51,
  generate: generate51,
  lexer,
  createLexer,
  walk: walk2,
  find,
  findLast,
  findAll,
  toPlainObject,
  fromPlainObject,
  fork
} = syntax_default;

// script/api/style/css-manager.ts
class CSSManager {
  static instance;
  constructor() {}
  injectDefaultStyles() {
    try {
      const styleElement = document.createElement("style");
      styleElement.id = "onlook-stylesheet" /* ONLOOK_STYLESHEET_ID */;
      styleElement.textContent = `
            [${"data-onlook-editing-text" /* DATA_ONLOOK_EDITING_TEXT */}="true"] {
                opacity: 0;
            }
        `;
      document.head.appendChild(styleElement);
    } catch (error) {
      console.warn("Error injecting default styles", error);
    }
  }
  static getInstance() {
    if (!CSSManager.instance) {
      CSSManager.instance = new CSSManager;
    }
    return CSSManager.instance;
  }
  get stylesheet() {
    const styleElement = document.getElementById("onlook-stylesheet" /* ONLOOK_STYLESHEET_ID */) || this.createStylesheet();
    styleElement.textContent = styleElement.textContent || "";
    return parse51(styleElement.textContent);
  }
  set stylesheet(ast) {
    const styleElement = document.getElementById("onlook-stylesheet" /* ONLOOK_STYLESHEET_ID */) || this.createStylesheet();
    styleElement.textContent = generate51(ast);
  }
  createStylesheet() {
    const styleElement = document.createElement("style");
    styleElement.id = "onlook-stylesheet" /* ONLOOK_STYLESHEET_ID */;
    document.head.appendChild(styleElement);
    return styleElement;
  }
  find(ast, selectorToFind) {
    const matchingNodes = [];
    walk2(ast, {
      visit: "Rule",
      enter: (node) => {
        if (node.type === "Rule") {
          const rule = node;
          if (rule.prelude.type === "SelectorList") {
            rule.prelude.children.forEach((selector2) => {
              const selectorText = generate51(selector2);
              if (selectorText === selectorToFind) {
                matchingNodes.push(node);
              }
            });
          }
        }
      }
    });
    return matchingNodes;
  }
  updateStyle(domId, style) {
    const selector2 = getDomIdSelector(domId, false);
    const ast = this.stylesheet;
    for (const [property2, value] of Object.entries(style)) {
      const cssProperty = this.jsToCssProperty(property2);
      const matchingNodes = this.find(ast, selector2);
      if (!matchingNodes.length) {
        this.addRule(ast, selector2, cssProperty, value.value);
      } else {
        matchingNodes.forEach((node) => {
          if (node.type === "Rule") {
            this.updateRule(node, cssProperty, value.value);
          }
        });
      }
    }
    this.stylesheet = ast;
  }
  addRule(ast, selector2, property2, value) {
    const newRule = {
      type: "Rule",
      prelude: {
        type: "SelectorList",
        children: [
          {
            type: "Selector",
            children: [
              {
                type: "TypeSelector",
                name: selector2
              }
            ]
          }
        ]
      },
      block: {
        type: "Block",
        children: [
          {
            type: "Declaration",
            property: property2,
            value: { type: "Raw", value }
          }
        ]
      }
    };
    if (ast.type === "StyleSheet") {
      ast.children.push(newRule);
    }
  }
  updateRule(rule, property2, value) {
    let found = false;
    walk2(rule.block, {
      visit: "Declaration",
      enter: (decl) => {
        if (decl.property === property2) {
          decl.value = { type: "Raw", value };
          if (value === "") {
            rule.block.children = rule.block.children.filter((decl2) => decl2.property !== property2);
          }
          found = true;
        }
      }
    });
    if (!found) {
      if (value === "") {
        rule.block.children = rule.block.children.filter((decl) => decl.property !== property2);
      } else {
        rule.block.children.push({
          type: "Declaration",
          property: property2,
          value: { type: "Raw", value },
          important: false
        });
      }
    }
  }
  getJsStyle(selector2) {
    const ast = this.stylesheet;
    const matchingNodes = this.find(ast, selector2);
    const styles = {};
    if (!matchingNodes.length) {
      return styles;
    }
    matchingNodes.forEach((node) => {
      if (node.type === "Rule") {
        walk2(node, {
          visit: "Declaration",
          enter: (decl) => {
            styles[this.cssToJsProperty(decl.property)] = decl.value.value;
          }
        });
      }
    });
    return styles;
  }
  jsToCssProperty(key) {
    if (!key) {
      return "";
    }
    return key.replace(/([A-Z])/g, "-$1").toLowerCase();
  }
  cssToJsProperty(key) {
    if (!key) {
      return "";
    }
    return key.replace(/-([a-z])/g, (g) => g[1]?.toUpperCase() ?? "");
  }
  removeStyles(domId, jsStyles) {
    const selector2 = getDomIdSelector(domId, false);
    const ast = this.stylesheet;
    const matchingNodes = this.find(ast, selector2);
    matchingNodes.forEach((node) => {
      if (node.type === "Rule") {
        const cssProperties = jsStyles.map((style) => this.jsToCssProperty(style));
        node.block.children = node.block.children.filter((decl) => !cssProperties.includes(decl.property));
      }
    });
    this.stylesheet = ast;
  }
  clear() {
    this.stylesheet = parse51("");
  }
}
var cssManager = CSSManager.getInstance();
// script/api/style/update.ts
function updateStyle(domId, change) {
  cssManager.updateStyle(domId, change.updated);
  return getElementByDomId(domId, true);
}
// script/api/elements/dom/image.ts
function insertImage(domId, image) {
  cssManager.updateStyle(domId, {
    backgroundImage: { value: `url(${image})`, type: "value" /* Value */ }
  });
}
function removeImage(domId) {
  cssManager.updateStyle(domId, {
    backgroundImage: { value: "none", type: "value" /* Value */ }
  });
}

// script/api/elements/dom/insert.ts
function findClosestIndex(container, y) {
  const children = Array.from(container.children);
  if (children.length === 0) {
    return 0;
  }
  let closestIndex = 0;
  let minDistance = Infinity;
  children.forEach((child2, index) => {
    const rect = child2.getBoundingClientRect();
    const childMiddle = rect.top + rect.height / 2;
    const distance = Math.abs(y - childMiddle);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });
  const closestRect = children[closestIndex]?.getBoundingClientRect();
  if (!closestRect) {
    return 0;
  }
  const closestMiddle = closestRect.top + closestRect.height / 2;
  return y > closestMiddle ? closestIndex + 1 : closestIndex;
}
function getInsertLocation(x, y) {
  const targetEl = findNearestBlockLevelContainer(x, y);
  if (!targetEl) {
    return null;
  }
  const display = window.getComputedStyle(targetEl).display;
  const isStackOrGrid = display === "flex" || display === "grid";
  if (isStackOrGrid) {
    const index = findClosestIndex(targetEl, y);
    return {
      type: "index",
      targetDomId: getOrAssignDomId(targetEl),
      targetOid: getInstanceId(targetEl) || getOid(targetEl) || null,
      index,
      originalIndex: index
    };
  }
  return {
    type: "append",
    targetDomId: getOrAssignDomId(targetEl),
    targetOid: getInstanceId(targetEl) || getOid(targetEl) || null
  };
}
function findNearestBlockLevelContainer(x, y) {
  let targetEl = getDeepElement(x, y);
  if (!targetEl) {
    return null;
  }
  let inlineOnly = true;
  while (targetEl && inlineOnly) {
    inlineOnly = INLINE_ONLY_CONTAINERS.has(targetEl.tagName.toLowerCase());
    if (inlineOnly) {
      targetEl = targetEl.parentElement;
    }
  }
  return targetEl;
}
function insertElement(element, location) {
  const targetEl = getHtmlElement(location.targetDomId);
  if (!targetEl) {
    console.warn(`Target element not found: ${location.targetDomId}`);
    return;
  }
  const newEl = createElement(element);
  switch (location.type) {
    case "append":
      targetEl.appendChild(newEl);
      break;
    case "prepend":
      targetEl.prepend(newEl);
      break;
    case "index":
      if (location.index === undefined || location.index < 0) {
        console.warn(`Invalid index: ${location.index}`);
        return;
      }
      if (location.index >= targetEl.children.length) {
        targetEl.appendChild(newEl);
      } else {
        targetEl.insertBefore(newEl, targetEl.children.item(location.index));
      }
      break;
    default:
      console.warn(`Invalid position: ${location}`);
      assertNever(location);
  }
  const domEl = getDomElement(newEl, true);
  return domEl;
}
function createElement(element) {
  const newEl = document.createElement(element.tagName);
  newEl.setAttribute("data-onlook-inserted" /* DATA_ONLOOK_INSERTED */, "true");
  for (const [key, value] of Object.entries(element.attributes)) {
    newEl.setAttribute(key, value);
  }
  if (element.textContent !== null && element.textContent !== undefined) {
    newEl.textContent = element.textContent;
  }
  for (const [key, value] of Object.entries(element.styles)) {
    newEl.style.setProperty(cssManager.jsToCssProperty(key), value);
  }
  for (const child2 of element.children) {
    const childEl = createElement(child2);
    newEl.appendChild(childEl);
  }
  return newEl;
}
function removeElement(location) {
  const targetEl = getHtmlElement(location.targetDomId);
  if (!targetEl) {
    console.warn(`Target element not found: ${location.targetDomId}`);
    return null;
  }
  let elementToRemove = null;
  switch (location.type) {
    case "append":
      elementToRemove = targetEl.lastElementChild;
      break;
    case "prepend":
      elementToRemove = targetEl.firstElementChild;
      break;
    case "index":
      if (location.index !== -1) {
        elementToRemove = targetEl.children.item(location.index);
      } else {
        console.warn(`Invalid index: ${location.index}`);
        return null;
      }
      break;
    default:
      console.warn(`Invalid position: ${location}`);
      assertNever(location);
  }
  if (elementToRemove) {
    const domEl = getDomElement(elementToRemove, true);
    elementToRemove.style.display = "none";
    return domEl;
  } else {
    console.warn(`No element found to remove at the specified location`);
    return null;
  }
}

// script/api/elements/dom/remove.ts
function getRemoveAction(domId, frameId) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("Element not found for domId:", domId);
    return null;
  }
  const location = getElementLocation(el);
  if (!location) {
    console.warn("Failed to get location for element:", el);
    return null;
  }
  const actionEl = getActionElement(domId);
  if (!actionEl) {
    console.warn("Failed to get action element for element:", el);
    return null;
  }
  return {
    type: "remove-element",
    targets: [
      {
        frameId,
        domId: actionEl.domId,
        oid: actionEl.oid
      }
    ],
    location,
    element: actionEl,
    editText: false,
    pasteParams: null,
    codeBlock: null
  };
}

// script/api/elements/move/index.ts
function moveElement(domId, newIndex) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn(`Move element not found: ${domId}`);
    return null;
  }
  const movedEl = moveElToIndex(el, newIndex);
  if (!movedEl) {
    console.warn(`Failed to move element: ${domId}`);
    return null;
  }
  const domEl = getDomElement(movedEl, true);
  return domEl;
}
function getElementIndex(domId) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn(`Element not found: ${domId}`);
    return -1;
  }
  const htmlElments = Array.from(el.parentElement?.children || []).filter(isValidHtmlElement);
  const index = htmlElments.indexOf(el);
  return index;
}
function moveElToIndex(el, newIndex) {
  const parent2 = el.parentElement;
  if (!parent2) {
    console.warn("Parent not found");
    return;
  }
  parent2.removeChild(el);
  if (newIndex >= parent2.children.length) {
    parent2.appendChild(el);
    return el;
  }
  const referenceNode = parent2.children[newIndex];
  parent2.insertBefore(el, referenceNode ?? null);
  return el;
}

// script/api/elements/move/helpers.ts
function getDisplayDirection(element) {
  if (!element || !element.children || element.children.length < 2) {
    return "vertical" /* VERTICAL */;
  }
  const children = Array.from(element.children);
  const firstChild = children[0];
  const secondChild = children[1];
  const firstRect = firstChild?.getBoundingClientRect();
  const secondRect = secondChild?.getBoundingClientRect();
  if (firstRect && secondRect && Math.abs(firstRect.left - secondRect.left) < Math.abs(firstRect.top - secondRect.top)) {
    return "vertical" /* VERTICAL */;
  } else {
    return "horizontal" /* HORIZONTAL */;
  }
}
function findInsertionIndex(elements, x, y, displayDirection) {
  if (elements.length === 0) {
    return 0;
  }
  const midPoints = elements.map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  });
  if (displayDirection === "horizontal" /* HORIZONTAL */) {
    for (let i = 0;i < midPoints.length; i++) {
      const midPoint = midPoints[i];
      if (midPoint && x < midPoint.x) {
        return i;
      }
    }
  } else {
    for (let i = 0;i < midPoints.length; i++) {
      const midPoint = midPoints[i];
      if (midPoint && y < midPoint.y) {
        return i;
      }
    }
  }
  return elements.length;
}
function findGridInsertionIndex(parent2, siblings, x, y) {
  const parentRect = parent2.getBoundingClientRect();
  const gridComputedStyle = window.getComputedStyle(parent2);
  const columns = gridComputedStyle.gridTemplateColumns.split(" ").length;
  const rows = gridComputedStyle.gridTemplateRows.split(" ").length;
  const cellWidth = parentRect.width / columns;
  const cellHeight = parentRect.height / rows;
  const gridX = Math.floor((x - parentRect.left) / cellWidth);
  const gridY = Math.floor((y - parentRect.top) / cellHeight);
  const targetIndex = gridY * columns + gridX;
  return Math.min(Math.max(targetIndex, 0), siblings.length);
}

// script/api/elements/move/stub.ts
function createStub(el) {
  const stub = document.createElement("div");
  const styles = window.getComputedStyle(el);
  const className = el.className;
  stub.id = "onlook-drag-stub" /* ONLOOK_STUB_ID */;
  stub.style.width = styles.width;
  stub.style.height = styles.height;
  stub.style.margin = styles.margin;
  stub.style.padding = styles.padding;
  stub.style.borderRadius = styles.borderRadius;
  stub.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
  stub.style.display = "none";
  stub.className = className;
  document.body.appendChild(stub);
}
function moveStub(el, x, y) {
  const stub = document.getElementById("onlook-drag-stub" /* ONLOOK_STUB_ID */);
  if (!stub) {
    return;
  }
  const parent2 = el.parentElement;
  if (!parent2) {
    return;
  }
  let displayDirection = el.getAttribute("data-onlook-drag-direction" /* DATA_ONLOOK_DRAG_DIRECTION */);
  if (!displayDirection) {
    displayDirection = getDisplayDirection(parent2);
  }
  const parentStyle = window.getComputedStyle(parent2);
  const isGridLayout = parentStyle.display === "grid";
  const isFlexRow = !isGridLayout && parentStyle.display === "flex" && (parentStyle.flexDirection === "row" || parentStyle.flexDirection === "");
  if (isFlexRow) {
    displayDirection = "horizontal" /* HORIZONTAL */;
  }
  const siblings = Array.from(parent2.children).filter((child2) => child2 !== el && child2 !== stub);
  let insertionIndex;
  if (isGridLayout) {
    insertionIndex = findGridInsertionIndex(parent2, siblings, x, y);
  } else {
    insertionIndex = findInsertionIndex(siblings, x, y, displayDirection);
  }
  stub.remove();
  if (insertionIndex >= siblings.length) {
    parent2.appendChild(stub);
  } else {
    parent2.insertBefore(stub, siblings[insertionIndex] ?? null);
  }
  stub.style.display = "block";
}
function removeStub() {
  const stub = document.getElementById("onlook-drag-stub" /* ONLOOK_STUB_ID */);
  if (!stub) {
    return;
  }
  stub.remove();
}
function getCurrentStubIndex(parent2, el) {
  const stub = document.getElementById("onlook-drag-stub" /* ONLOOK_STUB_ID */);
  if (!stub) {
    return -1;
  }
  const siblings = Array.from(parent2.children).filter((child2) => child2 !== el);
  return siblings.indexOf(stub);
}

// script/api/elements/move/drag.ts
function startDrag(domId) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn(`Start drag element not found: ${domId}`);
    return null;
  }
  const parent2 = el.parentElement;
  if (!parent2) {
    console.warn("Start drag parent not found");
    return null;
  }
  const htmlChildren = Array.from(parent2.children).filter(isValidHtmlElement);
  const originalIndex = htmlChildren.indexOf(el);
  const styles = window.getComputedStyle(el);
  prepareElementForDragging(el);
  if (styles.position !== "absolute") {
    createStub(el);
  }
  const pos = getAbsolutePosition(el);
  const rect = el.getBoundingClientRect();
  const offset = styles.position === "absolute" ? {
    x: pos.left,
    y: pos.top
  } : {
    x: pos.left - rect.left,
    y: pos.top - rect.top
  };
  el.setAttribute("data-onlook-drag-start-position" /* DATA_ONLOOK_DRAG_START_POSITION */, JSON.stringify({ ...pos, offset }));
  return originalIndex;
}
function dragAbsolute(domId, x, y, origin) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("Dragging element not found");
    return;
  }
  const parent2 = el.parentElement;
  if (parent2) {
    const pos = JSON.parse(el.getAttribute("data-onlook-drag-start-position" /* DATA_ONLOOK_DRAG_START_POSITION */) || "{}");
    const parentRect = parent2.getBoundingClientRect();
    const newLeft = x - parentRect.left - (origin.x - pos.offset.x);
    const newTop = y - parentRect.top - (origin.y - pos.offset.y);
    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
  }
  el.style.transform = "none";
}
function drag(domId, dx, dy, x, y) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("Dragging element not found");
    return;
  }
  if (!el.style.transition) {
    el.style.transition = "transform 0.05s cubic-bezier(0.2, 0, 0, 1)";
  }
  const pos = JSON.parse(el.getAttribute("data-onlook-drag-start-position" /* DATA_ONLOOK_DRAG_START_POSITION */) || "{}");
  if (el.style.position !== "fixed") {
    const styles = window.getComputedStyle(el);
    el.style.position = "fixed";
    el.style.width = styles.width;
    el.style.height = styles.height;
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
  }
  el.style.transform = `translate(${dx}px, ${dy}px)`;
  const parent2 = el.parentElement;
  if (parent2) {
    moveStub(el, x, y);
  }
}
function endDragAbsolute(domId) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("End drag element not found");
    return null;
  }
  const styles = window.getComputedStyle(el);
  removeDragAttributes(el);
  getOrAssignDomId(el);
  return {
    left: styles.left,
    top: styles.top
  };
}
function endDrag(domId) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("End drag element not found");
    endAllDrag();
    return null;
  }
  const parent2 = el.parentElement;
  if (!parent2) {
    console.warn("End drag parent not found");
    cleanUpElementAfterDragging(el);
    return null;
  }
  const stubIndex = getCurrentStubIndex(parent2, el);
  cleanUpElementAfterDragging(el);
  removeStub();
  if (stubIndex === -1) {
    return null;
  }
  const elementIndex = Array.from(parent2.children).indexOf(el);
  if (stubIndex === elementIndex) {
    return null;
  }
  return {
    newIndex: stubIndex,
    child: getDomElement(el, false),
    parent: getDomElement(parent2, false)
  };
}
function prepareElementForDragging(el) {
  const saved = el.getAttribute("data-onlook-drag-saved-style" /* DATA_ONLOOK_DRAG_SAVED_STYLE */);
  if (saved) {
    return;
  }
  const style = {
    position: el.style.position,
    transform: el.style.transform,
    width: el.style.width,
    height: el.style.height,
    left: el.style.left,
    top: el.style.top
  };
  el.setAttribute("data-onlook-drag-saved-style" /* DATA_ONLOOK_DRAG_SAVED_STYLE */, JSON.stringify(style));
  el.setAttribute("data-onlook-dragging" /* DATA_ONLOOK_DRAGGING */, "true");
  el.style.zIndex = "1000";
  if (el.getAttribute("data-onlook-drag-direction" /* DATA_ONLOOK_DRAG_DIRECTION */) !== null) {
    const parent2 = el.parentElement;
    if (parent2) {
      const displayDirection = getDisplayDirection(parent2);
      el.setAttribute("data-onlook-drag-direction" /* DATA_ONLOOK_DRAG_DIRECTION */, displayDirection);
    }
  }
}
function cleanUpElementAfterDragging(el) {
  restoreElementStyle(el);
  removeDragAttributes(el);
  getOrAssignDomId(el);
}
function removeDragAttributes(el) {
  el.removeAttribute("data-onlook-drag-saved-style" /* DATA_ONLOOK_DRAG_SAVED_STYLE */);
  el.removeAttribute("data-onlook-dragging" /* DATA_ONLOOK_DRAGGING */);
  el.removeAttribute("data-onlook-drag-direction" /* DATA_ONLOOK_DRAG_DIRECTION */);
  el.removeAttribute("data-onlook-drag-start-position" /* DATA_ONLOOK_DRAG_START_POSITION */);
}
function getAbsolutePosition(element) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY
  };
}
function endAllDrag() {
  const draggingElements = document.querySelectorAll(`[${"data-onlook-dragging" /* DATA_ONLOOK_DRAGGING */}]`);
  for (const el of Array.from(draggingElements)) {
    cleanUpElementAfterDragging(el);
  }
  removeStub();
}

// script/api/events/publish.ts
function publishEditText(domEl) {
  const parent2 = getHtmlElement(domEl.domId)?.parentElement;
  const layerMap = parent2 ? buildLayerTree(parent2) : null;
  if (!domEl || !layerMap) {
    console.warn("No domEl or layerMap found for edit text event");
    return;
  }
}

// script/api/elements/text.ts
function startEditingText(domId) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("Start editing text failed. No element for selector:", domId);
    return null;
  }
  const childNodes = Array.from(el.childNodes).filter((node) => node.nodeType !== Node.COMMENT_NODE);
  let targetEl = null;
  const hasOnlyTextAndBreaks = childNodes.every((node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "br");
  if (childNodes.length === 0) {
    targetEl = el;
  } else if (childNodes.length === 1 && childNodes[0]?.nodeType === Node.TEXT_NODE) {
    targetEl = el;
  } else if (hasOnlyTextAndBreaks) {
    targetEl = el;
  }
  if (!targetEl) {
    console.warn("Start editing text failed. No target element found for selector:", domId);
    return null;
  }
  const originalContent = extractTextContent(el);
  prepareElementForEditing(targetEl);
  return { originalContent };
}
function editText(domId, content) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("Edit text failed. No element for selector:", domId);
    return null;
  }
  prepareElementForEditing(el);
  updateTextContent(el, content);
  return getDomElement(el, true);
}
function stopEditingText(domId) {
  const el = getHtmlElement(domId);
  if (!el) {
    console.warn("Stop editing text failed. No element for selector:", domId);
    return null;
  }
  cleanUpElementAfterEditing(el);
  publishEditText(getDomElement(el, true));
  return { newContent: extractTextContent(el), domEl: getDomElement(el, true) };
}
function prepareElementForEditing(el) {
  el.setAttribute("data-onlook-editing-text" /* DATA_ONLOOK_EDITING_TEXT */, "true");
}
function cleanUpElementAfterEditing(el) {
  restoreElementStyle(el);
  removeEditingAttributes(el);
}
function removeEditingAttributes(el) {
  el.removeAttribute("data-onlook-editing-text" /* DATA_ONLOOK_EDITING_TEXT */);
}
function updateTextContent(el, content) {
  const htmlContent = content.replace(/\n/g, "<br>");
  el.innerHTML = htmlContent;
}
function extractTextContent(el) {
  let content = el.innerHTML;
  content = content.replace(/<br\s*\/?>/gi, `
`);
  content = content.replace(/<[^>]*>/g, "");
  const textArea = document.createElement("textarea");
  textArea.innerHTML = content;
  return textArea.value;
}
function isChildTextEditable(oid) {
  return true;
}

// script/api/events/dom.ts
function listenForDomMutation() {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };
  const observer = new MutationObserver((mutationsList) => {
    let added = new Map;
    let removed = new Map;
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        const parent2 = mutation.target;
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE || shouldIgnoreMutatedNode(node)) {
            continue;
          }
          const element = node;
          dedupNewElement(element);
          const layerMap = buildLayerTree(parent2);
          if (layerMap) {
            added = new Map([...added, ...layerMap]);
          }
        }
        for (const node of mutation.removedNodes) {
          if (node.nodeType === Node.TEXT_NODE || shouldIgnoreMutatedNode(node)) {
            continue;
          }
          const layerMap = buildLayerTree(parent2);
          if (layerMap) {
            removed = new Map([...removed, ...layerMap]);
          }
        }
      }
    }
  });
  observer.observe(targetNode, config);
}
function shouldIgnoreMutatedNode(node) {
  if (node.id === "onlook-drag-stub" /* ONLOOK_STUB_ID */) {
    return true;
  }
  if (node.getAttribute("data-onlook-inserted" /* DATA_ONLOOK_INSERTED */)) {
    return true;
  }
  return false;
}
function dedupNewElement(newEl) {
  const oid = newEl.getAttribute("data-oid" /* DATA_ONLOOK_ID */);
  if (!oid) {
    return;
  }
  document.querySelectorAll(`[${"data-oid" /* DATA_ONLOOK_ID */}="${oid}"][${"data-onlook-inserted" /* DATA_ONLOOK_INSERTED */}]`).forEach((targetEl) => {
    const ATTRIBUTES_TO_REPLACE = [
      "data-odid" /* DATA_ONLOOK_DOM_ID */,
      "data-onlook-drag-saved-style" /* DATA_ONLOOK_DRAG_SAVED_STYLE */,
      "data-onlook-editing-text" /* DATA_ONLOOK_EDITING_TEXT */,
      "data-oiid" /* DATA_ONLOOK_INSTANCE_ID */
    ];
    ATTRIBUTES_TO_REPLACE.forEach((attr) => {
      const targetAttr = targetEl.getAttribute(attr);
      if (targetAttr) {
        newEl.setAttribute(attr, targetAttr);
      }
    });
    targetEl.remove();
  });
}

// script/api/events/index.ts
function listenForEvents() {
  listenForWindowEvents();
  listenForDomMutation();
}
function listenForWindowEvents() {
  window.addEventListener("resize", () => {});
}

// script/api/ready.ts
function handleBodyReady() {
  listenForEvents();
  keepDomUpdated();
  cssManager.injectDefaultStyles();
}
var domUpdateInterval = null;
function keepDomUpdated() {
  if (domUpdateInterval !== null) {
    clearInterval(domUpdateInterval);
    domUpdateInterval = null;
  }
  const interval = setInterval(() => {
    try {
      if (processDom()) {
        clearInterval(interval);
        domUpdateInterval = null;
      }
    } catch (err) {
      clearInterval(interval);
      domUpdateInterval = null;
      console.warn("Error in keepDomUpdated:", err);
    }
  }, 5000);
  domUpdateInterval = interval;
}
var handleDocumentBody = setInterval(() => {
  window.onerror = function logError(errorMsg, url, lineNumber) {
    console.log(`Unhandled error: ${errorMsg} ${url} ${lineNumber}`);
  };
  if (window?.document?.body) {
    clearInterval(handleDocumentBody);
    try {
      handleBodyReady();
    } catch (err) {
      console.log("Error in documentBodyInit:", err);
    }
  }
}, 300);

// script/api/screenshot.ts
async function captureScreenshot() {
  try {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get canvas context");
    }
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: viewportWidth,
            height: viewportHeight
          }
        });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            video.oncanplay = () => {
              context.drawImage(video, 0, 0, viewportWidth, viewportHeight);
              stream.getTracks().forEach((track) => track.stop());
              resolve();
            };
          };
        });
        const base642 = await compressImage(canvas);
        console.log(`Screenshot captured - Size: ~${Math.round(base642.length * 0.75 / 1024)} KB`);
        return {
          mimeType: "image/jpeg",
          data: base642
        };
      } catch (displayError) {
        console.log("getDisplayMedia failed, falling back to DOM rendering:", displayError);
      }
    }
    await renderDomToCanvas(context, viewportWidth, viewportHeight);
    const base64 = await compressImage(canvas);
    console.log(`DOM screenshot captured - Size: ~${Math.round(base64.length * 0.75 / 1024)} KB`);
    return {
      mimeType: "image/jpeg",
      data: base64
    };
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
      canvas.width = 400;
      canvas.height = 300;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 400, 300);
      context.fillStyle = "#ff0000";
      context.font = "14px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText("Screenshot unavailable", 200, 150);
      return {
        mimeType: "image/jpeg",
        data: canvas.toDataURL("image/jpeg", 0.8)
      };
    }
    throw error;
  }
}
async function compressImage(canvas) {
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_BASE64_SIZE = MAX_FILE_SIZE * 0.75;
  const qualityLevels = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
  const scalingFactors = [1, 0.8, 0.6, 0.5, 0.4, 0.3];
  for (const scale of scalingFactors) {
    let scaledCanvas = canvas;
    if (scale < 1) {
      scaledCanvas = document.createElement("canvas");
      const scaledContext = scaledCanvas.getContext("2d");
      if (!scaledContext)
        continue;
      scaledCanvas.width = canvas.width * scale;
      scaledCanvas.height = canvas.height * scale;
      scaledContext.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    }
    for (const quality of qualityLevels) {
      const base64 = scaledCanvas.toDataURL("image/jpeg", quality);
      if (base64.length <= MAX_BASE64_SIZE) {
        return base64;
      }
    }
  }
  const fallbackCanvas = document.createElement("canvas");
  const fallbackContext = fallbackCanvas.getContext("2d");
  if (fallbackContext) {
    fallbackCanvas.width = canvas.width * 0.2;
    fallbackCanvas.height = canvas.height * 0.2;
    fallbackContext.drawImage(canvas, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
    return fallbackCanvas.toDataURL("image/jpeg", 0.2);
  }
  return canvas.toDataURL("image/jpeg", 0.1);
}
async function renderDomToCanvas(context, width, height) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  const elements = document.querySelectorAll("*");
  const visibleElements = [];
  for (const element of elements) {
    if (element instanceof HTMLElement) {
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      if (rect.width > 0 && rect.height > 0 && rect.left < width && rect.top < height && rect.right > 0 && rect.bottom > 0 && styles.visibility !== "hidden" && styles.display !== "none" && parseFloat(styles.opacity) > 0) {
        visibleElements.push({ element, rect, styles });
      }
    }
  }
  visibleElements.sort((a, b) => {
    const aZIndex = parseInt(a.styles.zIndex) || 0;
    const bZIndex = parseInt(b.styles.zIndex) || 0;
    return aZIndex - bZIndex;
  });
  for (const { element, rect, styles } of visibleElements) {
    try {
      await renderElement(context, element, rect, styles);
    } catch (error) {
      console.warn("Failed to render element:", element, error);
    }
  }
}
async function renderElement(context, element, rect, styles) {
  const { left, top, width, height } = rect;
  if (width < 1 || height < 1 || left > window.innerWidth || top > window.innerHeight) {
    return;
  }
  const backgroundColor = styles.backgroundColor;
  if (backgroundColor && backgroundColor !== "rgba(0, 0, 0, 0)" && backgroundColor !== "transparent") {
    context.fillStyle = backgroundColor;
    context.fillRect(left, top, width, height);
  }
  const borderWidth = parseFloat(styles.borderWidth) || 0;
  const borderColor = styles.borderColor;
  if (borderWidth > 0 && borderColor && borderColor !== "transparent") {
    context.strokeStyle = borderColor;
    context.lineWidth = borderWidth;
    context.strokeRect(left, top, width, height);
  }
  if (element.textContent && element.children.length === 0) {
    const text = element.textContent.trim();
    if (text) {
      const fontSize = parseFloat(styles.fontSize) || 16;
      const fontFamily = styles.fontFamily || "Arial, sans-serif";
      const color = styles.color || "#000000";
      context.fillStyle = color;
      context.font = `${fontSize}px ${fontFamily}`;
      context.textAlign = "left";
      context.textBaseline = "top";
      const words = text.split(" ");
      let line = "";
      let y = top + 2;
      const lineHeight = fontSize * 1.2;
      for (const word of words) {
        const testLine = line + word + " ";
        const metrics = context.measureText(testLine);
        if (metrics.width > width - 4 && line !== "") {
          context.fillText(line, left + 2, y);
          line = word + " ";
          y += lineHeight;
          if (y > top + height)
            break;
        } else {
          line = testLine;
        }
      }
      if (line && y <= top + height) {
        context.fillText(line, left + 2, y);
      }
    }
  }
  if (element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0) {
    try {
      context.drawImage(element, left, top, width, height);
    } catch (error) {
      context.fillStyle = "#f0f0f0";
      context.fillRect(left, top, width, height);
      context.fillStyle = "#999999";
      context.font = "12px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText("Image", left + width / 2, top + height / 2);
    }
  }
}
// ../../../node_modules/zod/dist/esm/v3/external.js
var exports_external = {};
__export(exports_external, {
  void: () => voidType,
  util: () => util2,
  unknown: () => unknownType,
  union: () => unionType,
  undefined: () => undefinedType,
  tuple: () => tupleType,
  transformer: () => effectsType,
  symbol: () => symbolType,
  string: () => stringType,
  strictObject: () => strictObjectType,
  setErrorMap: () => setErrorMap,
  set: () => setType,
  record: () => recordType,
  quotelessJson: () => quotelessJson,
  promise: () => promiseType,
  preprocess: () => preprocessType,
  pipeline: () => pipelineType,
  ostring: () => ostring,
  optional: () => optionalType,
  onumber: () => onumber,
  oboolean: () => oboolean,
  objectUtil: () => objectUtil,
  object: () => objectType,
  number: () => numberType,
  nullable: () => nullableType,
  null: () => nullType,
  never: () => neverType,
  nativeEnum: () => nativeEnumType,
  nan: () => nanType,
  map: () => mapType,
  makeIssue: () => makeIssue,
  literal: () => literalType,
  lazy: () => lazyType,
  late: () => late,
  isValid: () => isValid,
  isDirty: () => isDirty,
  isAsync: () => isAsync,
  isAborted: () => isAborted,
  intersection: () => intersectionType,
  instanceof: () => instanceOfType,
  getParsedType: () => getParsedType,
  getErrorMap: () => getErrorMap,
  function: () => functionType,
  enum: () => enumType,
  effect: () => effectsType,
  discriminatedUnion: () => discriminatedUnionType,
  defaultErrorMap: () => en_default,
  datetimeRegex: () => datetimeRegex,
  date: () => dateType,
  custom: () => custom,
  coerce: () => coerce,
  boolean: () => booleanType,
  bigint: () => bigIntType,
  array: () => arrayType,
  any: () => anyType,
  addIssueToContext: () => addIssueToContext,
  ZodVoid: () => ZodVoid,
  ZodUnknown: () => ZodUnknown,
  ZodUnion: () => ZodUnion,
  ZodUndefined: () => ZodUndefined,
  ZodType: () => ZodType,
  ZodTuple: () => ZodTuple,
  ZodTransformer: () => ZodEffects,
  ZodSymbol: () => ZodSymbol,
  ZodString: () => ZodString,
  ZodSet: () => ZodSet,
  ZodSchema: () => ZodType,
  ZodRecord: () => ZodRecord,
  ZodReadonly: () => ZodReadonly,
  ZodPromise: () => ZodPromise,
  ZodPipeline: () => ZodPipeline,
  ZodParsedType: () => ZodParsedType,
  ZodOptional: () => ZodOptional,
  ZodObject: () => ZodObject,
  ZodNumber: () => ZodNumber,
  ZodNullable: () => ZodNullable,
  ZodNull: () => ZodNull,
  ZodNever: () => ZodNever,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNaN: () => ZodNaN,
  ZodMap: () => ZodMap,
  ZodLiteral: () => ZodLiteral,
  ZodLazy: () => ZodLazy,
  ZodIssueCode: () => ZodIssueCode,
  ZodIntersection: () => ZodIntersection,
  ZodFunction: () => ZodFunction,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodError: () => ZodError,
  ZodEnum: () => ZodEnum,
  ZodEffects: () => ZodEffects,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodDefault: () => ZodDefault,
  ZodDate: () => ZodDate,
  ZodCatch: () => ZodCatch,
  ZodBranded: () => ZodBranded,
  ZodBoolean: () => ZodBoolean,
  ZodBigInt: () => ZodBigInt,
  ZodArray: () => ZodArray,
  ZodAny: () => ZodAny,
  Schema: () => ZodType,
  ParseStatus: () => ParseStatus,
  OK: () => OK,
  NEVER: () => NEVER,
  INVALID: () => INVALID,
  EMPTY_PATH: () => EMPTY_PATH,
  DIRTY: () => DIRTY,
  BRAND: () => BRAND
});

// ../../../node_modules/zod/dist/esm/v3/helpers/util.js
var util2;
(function(util3) {
  util3.assertEqual = (_) => {};
  function assertIs(_arg) {}
  util3.assertIs = assertIs;
  function assertNever2(_x) {
    throw new Error;
  }
  util3.assertNever = assertNever2;
  util3.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util3.getValidEnumValues = (obj) => {
    const validKeys = util3.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util3.objectValues(filtered);
  };
  util3.objectValues = (obj) => {
    return util3.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util3.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util3.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return;
  };
  util3.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util3.joinValues = joinValues;
  util3.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util2 || (util2 = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util2.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../../node_modules/zod/dist/esm/v3/ZodError.js
var ZodIssueCode = util2.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};

class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util2.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../../node_modules/zod/dist/esm/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util2.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util2.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util2.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util2.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util2.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util2.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../../node_modules/zod/dist/esm/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
// ../../../node_modules/zod/dist/esm/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== undefined) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === en_default ? undefined : en_default
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}

class ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
}
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
// ../../../node_modules/zod/dist/esm/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../../node_modules/zod/dist/esm/v3/types.js
class ParseInputLazyPath {
  constructor(parent2, value, path, key) {
    this._cachedPath = [];
    this.parent = parent2;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
}
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}

class ZodType {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus,
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(undefined).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version2) {
  if ((version2 === "v4" || !version2) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version2 === "v6" || !version2) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}

class ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util2.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}

class ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util2.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util2.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util2.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
}
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};

class ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = undefined;
    const status = new ParseStatus;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util2.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
}
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};

class ZodBoolean extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};

class ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus;
    let ctx = undefined;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util2.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
}
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};

class ZodSymbol extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};

class ZodUndefined extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};

class ZodNull extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};

class ZodAny extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};

class ZodUnknown extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
}
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};

class ZodNever extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
}
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};

class ZodVoid extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
}
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};

class ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : undefined,
          maximum: tooBig ? def.exactLength.value : undefined,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}

class ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util2.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {} else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== undefined ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  extend(augmentation) {
    return new ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  merge(merging) {
    const merged = new ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  catchall(index) {
    return new ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util2.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util2.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util2.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util2.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util2.objectKeys(this.shape));
  }
}
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};

class ZodUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = undefined;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
}
ZodUnion.create = (types2, params) => {
  return new ZodUnion({
    options: types2,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util2.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [undefined];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [undefined, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};

class ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  static create(discriminator, options, params) {
    const optionsMap = new Map;
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util2.objectKeys(b);
    const sharedKeys = util2.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0;index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}

class ZodIntersection extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
}
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};

class ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new ZodTuple({
      ...this._def,
      rest
    });
  }
}
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};

class ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
}

class ZodMap extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = new Map;
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = new Map;
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
}
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};

class ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = new Set;
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
}
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};

class ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
}

class ZodLazy extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
}
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};

class ZodLiteral extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
}
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}

class ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util2.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
}
ZodEnum.create = createZodEnum;

class ZodNativeEnum extends ZodType {
  _parse(input) {
    const nativeEnumValues = util2.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util2.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util2.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util2.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util2.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
}
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};

class ZodPromise extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
}
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};

class ZodEffects extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util2.assertNever(effect);
  }
}
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
class ZodOptional extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(undefined);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};

class ZodNullable extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};

class ZodDefault extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};

class ZodCatch extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
}
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};

class ZodNaN extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
}
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");

class ZodBranded extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
}

class ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
}

class ZodReadonly extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
// ../../../packages/models/src/actions/location.ts
var BaseActionLocationSchema = exports_external.object({
  type: exports_external.enum(["prepend", "append"]),
  targetDomId: exports_external.string(),
  targetOid: exports_external.string().nullable()
});
var IndexActionLocationSchema = BaseActionLocationSchema.extend({
  type: exports_external.literal("index"),
  index: exports_external.number(),
  originalIndex: exports_external.number()
});
var ActionLocationSchema = exports_external.discriminatedUnion("type", [
  IndexActionLocationSchema,
  BaseActionLocationSchema
]);
// ../../../packages/models/src/chat/suggestion.ts
var ChatSuggestionSchema = exports_external.object({
  title: exports_external.string().describe("The display title of the suggestion. This will be shown to the user. Keep it concise but descriptive."),
  prompt: exports_external.string().describe("The prompt for the suggestion. This will be used to generate the suggestion. Make this as detailed and specific as possible.")
});
// ../../../packages/models/src/chat/summary.ts
var ChatSummarySchema = exports_external.object({
  filesDiscussed: exports_external.array(exports_external.string()).describe("List of file paths mentioned in the conversation"),
  projectContext: exports_external.string().describe("Summary of what the user is building and their overall goals"),
  implementationDetails: exports_external.string().describe("Summary of key code decisions, patterns, and important implementation details"),
  userPreferences: exports_external.string().describe("Specific preferences the user has expressed about implementation, design, etc."),
  currentStatus: exports_external.string().describe("Current state of the project and any pending work")
});
// ../../../packages/models/src/llm/index.ts
var BEDROCK_MODEL_MAP = {
  ["claude-sonnet-4-20250514" /* SONNET_4 */]: "us.anthropic.claude-sonnet-4-20250514-v1:0",
  ["claude-3-7-sonnet-20250219" /* SONNET_3_7 */]: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
  ["claude-3-5-haiku-20241022" /* HAIKU */]: "us.anthropic.claude-3-5-haiku-20241022-v1:0"
};
// script/api/theme/index.ts
function getTheme() {
  try {
    return window?.localStorage.getItem("theme") || "light" /* LIGHT */;
  } catch (error) {
    console.warn("Failed to get theme", error);
    return "light" /* LIGHT */;
  }
}
function setTheme(theme) {
  try {
    if (theme === "dark" /* DARK */) {
      document.documentElement.classList.add("dark");
      window?.localStorage.setItem("theme", "dark" /* DARK */);
    } else {
      document.documentElement.classList.remove("dark");
      window?.localStorage.setItem("theme", "light" /* LIGHT */);
    }
    return true;
  } catch (error) {
    console.warn("Failed to set theme", error);
    return false;
  }
}

// script/api/index.ts
var preloadMethods = {
  processDom,
  setFrameId,
  getComputedStyleByDomId,
  updateElementInstance,
  getFirstOnlookElement,
  captureScreenshot,
  getElementAtLoc,
  getElementByDomId,
  getElementIndex,
  setElementType,
  getElementType,
  getParentElement,
  getChildrenCount,
  getOffsetParent,
  getActionLocation,
  getActionElement,
  getInsertLocation,
  getRemoveAction,
  getTheme,
  setTheme,
  startDrag,
  drag,
  dragAbsolute,
  endDrag,
  endDragAbsolute,
  endAllDrag,
  startEditingText,
  editText,
  stopEditingText,
  isChildTextEditable,
  updateStyle,
  insertElement,
  removeElement,
  moveElement,
  groupElements,
  ungroupElements,
  insertImage,
  removeImage,
  handleBodyReady
};

// script/index.ts
var penpalParent = null;
var isConnecting = false;
var createMessageConnection = async () => {
  if (isConnecting || penpalParent) {
    return penpalParent;
  }
  isConnecting = true;
  console.log(`${PENPAL_CHILD_CHANNEL} - Creating penpal connection`);
  const messenger = new WindowMessenger_default({
    remoteWindow: window.parent,
    allowedOrigins: ["*"]
  });
  const connection = connect_default({
    messenger,
    methods: preloadMethods
  });
  connection.promise.then((parent2) => {
    if (!parent2) {
      console.error(`${PENPAL_CHILD_CHANNEL} - Failed to setup penpal connection: child is null`);
      reconnect();
      return;
    }
    const remote = parent2;
    penpalParent = remote;
    console.log(`${PENPAL_CHILD_CHANNEL} - Penpal connection set`);
  }).finally(() => {
    isConnecting = false;
  });
  connection.promise.catch((error) => {
    console.error(`${PENPAL_CHILD_CHANNEL} - Failed to setup penpal connection:`, error);
    reconnect();
  });
  return penpalParent;
};
var reconnect = import_debounce2.default(() => {
  if (isConnecting)
    return;
  console.log(`${PENPAL_CHILD_CHANNEL} - Reconnecting to penpal parent`);
  penpalParent = null;
  createMessageConnection();
}, 1000);
createMessageConnection();
export {
  penpalParent
};

//# debugId=DD8FFA45C06EC65864756E2164756E21
//# sourceMappingURL=index.js.map
