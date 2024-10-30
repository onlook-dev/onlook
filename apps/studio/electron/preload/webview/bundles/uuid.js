var buf,
    bufIdx = 0,
    hexBytes = [],
    i;

// Pre-calculate toString(16) for speed
for (i = 0; i < 256; i++) {
    hexBytes[i] = (i + 0x100).toString(16).substr(1);
}

// Buffer random numbers for speed
// Reduce memory usage by decreasing this number (min 16)
// or improve speed by increasing this number (try 16384)
uuid.BUFFER_SIZE = 4096;

// Binary uuids
uuid.bin = uuidBin;

// Clear buffer
uuid.clearBuffer = () => {
    buf = null;
    bufIdx = 0;
};

// Test for uuid
uuid.test = (uuid) => {
    if (typeof uuid === 'string') {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
    }
    return false;
};

// Node & Browser support
var crypt0;
if (typeof crypto !== 'undefined') {
    crypt0 = crypto;
} else if (typeof window !== 'undefined' && typeof window.msCrypto !== 'undefined') {
    crypt0 = window.msCrypto; // IE11
}

if (typeof module !== 'undefined' && typeof require === 'function') {
    crypt0 = crypt0 || require('crypto');
    module.exports = uuid;
} else if (typeof window !== 'undefined') {
    window.uuid = uuid;
}

// Use best available PRNG
// Also expose this so you can override it.
uuid.randomBytes = (() => {
    if (crypt0) {
        if (crypt0.randomBytes) {
            return crypt0.randomBytes;
        }
        if (crypt0.getRandomValues) {
            if (typeof Uint8Array.prototype.slice !== 'function') {
                return (n) => {
                    var bytes = new Uint8Array(n);
                    crypt0.getRandomValues(bytes);
                    return Array.from(bytes);
                };
            }
            return (n) => {
                var bytes = new Uint8Array(n);
                crypt0.getRandomValues(bytes);
                return bytes;
            };
        }
    }
    return (n) => {
        var i,
            r = [];
        for (i = 0; i < n; i++) {
            r.push(Math.floor(Math.random() * 256));
        }
        return r;
    };
})();

// Buffer some random bytes for speed
function randomBytesBuffered(n) {
    if (!buf || bufIdx + n > uuid.BUFFER_SIZE) {
        bufIdx = 0;
        buf = uuid.randomBytes(uuid.BUFFER_SIZE);
    }
    return buf.slice(bufIdx, (bufIdx += n));
}

// uuid.bin
function uuidBin() {
    var b = randomBytesBuffered(16);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    return b;
}

// String UUIDv4 (Random)
export function uuid() {
    var b = uuidBin();
    return (
        hexBytes[b[0]] +
        hexBytes[b[1]] +
        hexBytes[b[2]] +
        hexBytes[b[3]] +
        '-' +
        hexBytes[b[4]] +
        hexBytes[b[5]] +
        '-' +
        hexBytes[b[6]] +
        hexBytes[b[7]] +
        '-' +
        hexBytes[b[8]] +
        hexBytes[b[9]] +
        '-' +
        hexBytes[b[10]] +
        hexBytes[b[11]] +
        hexBytes[b[12]] +
        hexBytes[b[13]] +
        hexBytes[b[14]] +
        hexBytes[b[15]]
    );
}
