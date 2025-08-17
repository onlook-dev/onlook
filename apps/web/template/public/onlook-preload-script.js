var Hh = Object.create;
var { getPrototypeOf: Mh, defineProperty: Rr, getOwnPropertyNames: yh } = Object;
var Ah = Object.prototype.hasOwnProperty;
var rf = (l, i, t) => {
    t = l != null ? Hh(Mh(l)) : {};
    let r = i || !l || !l.__esModule ? Rr(t, 'default', { value: l, enumerable: !0 }) : t;
    for (let n of yh(l)) if (!Ah.call(r, n)) Rr(r, n, { get: () => l[n], enumerable: !0 });
    return r;
};
var hl = (l, i) => () => (i || l((i = { exports: {} }).exports, i), i.exports);
var D = (l, i) => {
    for (var t in i)
        Rr(l, t, { get: i[t], enumerable: !0, configurable: !0, set: (r) => (i[t] = () => r) });
};
var Fr = hl((E5, nf) => {
    function Uh(l) {
        var i = typeof l;
        return l != null && (i == 'object' || i == 'function');
    }
    nf.exports = Uh;
});
var bf = hl((G5, of) => {
    var kh = typeof global == 'object' && global && global.Object === Object && global;
    of.exports = kh;
});
var Vr = hl((L5, ff) => {
    var Sh = bf(),
        Nh = typeof self == 'object' && self && self.Object === Object && self,
        Ch = Sh || Nh || Function('return this')();
    ff.exports = Ch;
});
var ef = hl((B5, gf) => {
    var Ph = Vr(),
        Ih = function () {
            return Ph.Date.now();
        };
    gf.exports = Ih;
});
var cf = hl((R5, hf) => {
    var Th = /\s/;
    function Zh(l) {
        var i = l.length;
        while (i-- && Th.test(l.charAt(i)));
        return i;
    }
    hf.exports = Zh;
});
var wf = hl((F5, mf) => {
    var dh = cf(),
        lc = /^\s+/;
    function ic(l) {
        return l ? l.slice(0, dh(l) + 1).replace(lc, '') : l;
    }
    mf.exports = ic;
});
var Kr = hl((V5, pf) => {
    var tc = Vr(),
        rc = tc.Symbol;
    pf.exports = rc;
});
var af = hl((K5, xf) => {
    var uf = Kr(),
        zf = Object.prototype,
        nc = zf.hasOwnProperty,
        oc = zf.toString,
        ht = uf ? uf.toStringTag : void 0;
    function bc(l) {
        var i = nc.call(l, ht),
            t = l[ht];
        try {
            l[ht] = void 0;
            var r = !0;
        } catch (o) {}
        var n = oc.call(l);
        if (r)
            if (i) l[ht] = t;
            else delete l[ht];
        return n;
    }
    xf.exports = bc;
});
var vf = hl((H5, _f) => {
    var fc = Object.prototype,
        gc = fc.toString;
    function ec(l) {
        return gc.call(l);
    }
    _f.exports = ec;
});
var qf = hl((M5, $f) => {
    var Of = Kr(),
        hc = af(),
        cc = vf(),
        mc = '[object Null]',
        wc = '[object Undefined]',
        Df = Of ? Of.toStringTag : void 0;
    function pc(l) {
        if (l == null) return l === void 0 ? wc : mc;
        return Df && Df in Object(l) ? hc(l) : cc(l);
    }
    $f.exports = pc;
});
var Xf = hl((y5, Jf) => {
    function uc(l) {
        return l != null && typeof l == 'object';
    }
    Jf.exports = uc;
});
var jf = hl((A5, Wf) => {
    var zc = qf(),
        xc = Xf(),
        ac = '[object Symbol]';
    function _c(l) {
        return typeof l == 'symbol' || (xc(l) && zc(l) == ac);
    }
    Wf.exports = _c;
});
var Ef = hl((U5, Qf) => {
    var vc = wf(),
        sf = Fr(),
        Oc = jf(),
        Yf = NaN,
        Dc = /^[-+]0x[0-9a-f]+$/i,
        $c = /^0b[01]+$/i,
        qc = /^0o[0-7]+$/i,
        Jc = parseInt;
    function Xc(l) {
        if (typeof l == 'number') return l;
        if (Oc(l)) return Yf;
        if (sf(l)) {
            var i = typeof l.valueOf == 'function' ? l.valueOf() : l;
            l = sf(i) ? i + '' : i;
        }
        if (typeof l != 'string') return l === 0 ? l : +l;
        l = vc(l);
        var t = $c.test(l);
        return t || qc.test(l) ? Jc(l.slice(2), t ? 2 : 8) : Dc.test(l) ? Yf : +l;
    }
    Qf.exports = Xc;
});
var Mr = hl((k5, Lf) => {
    var Wc = Fr(),
        Hr = ef(),
        Gf = Ef(),
        jc = 'Expected a function',
        sc = Math.max,
        Yc = Math.min;
    function Qc(l, i, t) {
        var r,
            n,
            o,
            b,
            g,
            e,
            f = 0,
            h = !1,
            c = !1,
            m = !0;
        if (typeof l != 'function') throw new TypeError(jc);
        if (((i = Gf(i) || 0), Wc(t)))
            (h = !!t.leading),
                (c = 'maxWait' in t),
                (o = c ? sc(Gf(t.maxWait) || 0, i) : o),
                (m = 'trailing' in t ? !!t.trailing : m);
        function u(L) {
            var y = r,
                T = n;
            return (r = n = void 0), (f = L), (b = l.apply(T, y)), b;
        }
        function X(L) {
            return (f = L), (g = setTimeout(q, i)), h ? u(L) : b;
        }
        function I(L) {
            var y = L - e,
                T = L - f,
                Br = i - y;
            return c ? Yc(Br, o - T) : Br;
        }
        function F(L) {
            var y = L - e,
                T = L - f;
            return e === void 0 || y >= i || y < 0 || (c && T >= o);
        }
        function q() {
            var L = Hr();
            if (F(L)) return V(L);
            g = setTimeout(q, I(L));
        }
        function V(L) {
            if (((g = void 0), m && r)) return u(L);
            return (r = n = void 0), b;
        }
        function fl() {
            if (g !== void 0) clearTimeout(g);
            (f = 0), (r = e = n = g = void 0);
        }
        function K() {
            return g === void 0 ? b : V(Hr());
        }
        function G() {
            var L = Hr(),
                y = F(L);
            if (((r = arguments), (n = this), (e = L), y)) {
                if (g === void 0) return X(e);
                if (c) return clearTimeout(g), (g = setTimeout(q, i)), u(e);
            }
            if (g === void 0) g = setTimeout(q, i);
            return b;
        }
        return (G.cancel = fl), (G.flush = K), G;
    }
    Lf.exports = Qc;
});
var B0 = hl((Xm) => {
    var L0 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');
    Xm.encode = function (l) {
        if (0 <= l && l < L0.length) return L0[l];
        throw new TypeError('Must be between 0 and 63: ' + l);
    };
    Xm.decode = function (l) {
        var i = 65,
            t = 90,
            r = 97,
            n = 122,
            o = 48,
            b = 57,
            g = 43,
            e = 47,
            f = 26,
            h = 52;
        if (i <= l && l <= t) return l - i;
        if (r <= l && l <= n) return l - r + f;
        if (o <= l && l <= b) return l - o + h;
        if (l == g) return 62;
        if (l == e) return 63;
        return -1;
    };
});
var H0 = hl((Qm) => {
    var R0 = B0(),
        rn = 5,
        F0 = 1 << rn,
        V0 = F0 - 1,
        K0 = F0;
    function sm(l) {
        return l < 0 ? (-l << 1) + 1 : (l << 1) + 0;
    }
    function Ym(l) {
        var i = (l & 1) === 1,
            t = l >> 1;
        return i ? -t : t;
    }
    Qm.encode = function l(i) {
        var t = '',
            r,
            n = sm(i);
        do {
            if (((r = n & V0), (n >>>= rn), n > 0)) r |= K0;
            t += R0.encode(r);
        } while (n > 0);
        return t;
    };
    Qm.decode = function l(i, t, r) {
        var n = i.length,
            o = 0,
            b = 0,
            g,
            e;
        do {
            if (t >= n) throw new Error('Expected more digits in base 64 VLQ value.');
            if (((e = R0.decode(i.charCodeAt(t++))), e === -1))
                throw new Error('Invalid base64 digit: ' + i.charAt(t - 1));
            (g = !!(e & K0)), (e &= V0), (o = o + (e << b)), (b += rn);
        } while (g);
        (r.value = Ym(o)), (r.rest = t);
    };
});
var fr = hl((Cm) => {
    function Lm(l, i, t) {
        if (i in l) return l[i];
        else if (arguments.length === 3) return t;
        else throw new Error('"' + i + '" is a required argument.');
    }
    Cm.getArg = Lm;
    var M0 = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/,
        Bm = /^data:.+\,.+$/;
    function at(l) {
        var i = l.match(M0);
        if (!i) return null;
        return { scheme: i[1], auth: i[2], host: i[3], port: i[4], path: i[5] };
    }
    Cm.urlParse = at;
    function Vi(l) {
        var i = '';
        if (l.scheme) i += l.scheme + ':';
        if (((i += '//'), l.auth)) i += l.auth + '@';
        if (l.host) i += l.host;
        if (l.port) i += ':' + l.port;
        if (l.path) i += l.path;
        return i;
    }
    Cm.urlGenerate = Vi;
    var Rm = 32;
    function Fm(l) {
        var i = [];
        return function (t) {
            for (var r = 0; r < i.length; r++)
                if (i[r].input === t) {
                    var n = i[0];
                    return (i[0] = i[r]), (i[r] = n), i[0].result;
                }
            var o = l(t);
            if ((i.unshift({ input: t, result: o }), i.length > Rm)) i.pop();
            return o;
        };
    }
    var nn = Fm(function l(i) {
        var t = i,
            r = at(i);
        if (r) {
            if (!r.path) return i;
            t = r.path;
        }
        var n = Cm.isAbsolute(t),
            o = [],
            b = 0,
            g = 0;
        while (!0)
            if (((b = g), (g = t.indexOf('/', b)), g === -1)) {
                o.push(t.slice(b));
                break;
            } else {
                o.push(t.slice(b, g));
                while (g < t.length && t[g] === '/') g++;
            }
        for (var e, f = 0, g = o.length - 1; g >= 0; g--)
            if (((e = o[g]), e === '.')) o.splice(g, 1);
            else if (e === '..') f++;
            else if (f > 0)
                if (e === '') o.splice(g + 1, f), (f = 0);
                else o.splice(g, 2), f--;
        if (((t = o.join('/')), t === '')) t = n ? '/' : '.';
        if (r) return (r.path = t), Vi(r);
        return t;
    });
    Cm.normalize = nn;
    function y0(l, i) {
        if (l === '') l = '.';
        if (i === '') i = '.';
        var t = at(i),
            r = at(l);
        if (r) l = r.path || '/';
        if (t && !t.scheme) {
            if (r) t.scheme = r.scheme;
            return Vi(t);
        }
        if (t || i.match(Bm)) return i;
        if (r && !r.host && !r.path) return (r.host = i), Vi(r);
        var n = i.charAt(0) === '/' ? i : nn(l.replace(/\/+$/, '') + '/' + i);
        if (r) return (r.path = n), Vi(r);
        return n;
    }
    Cm.join = y0;
    Cm.isAbsolute = function (l) {
        return l.charAt(0) === '/' || M0.test(l);
    };
    function Vm(l, i) {
        if (l === '') l = '.';
        l = l.replace(/\/$/, '');
        var t = 0;
        while (i.indexOf(l + '/') !== 0) {
            var r = l.lastIndexOf('/');
            if (r < 0) return i;
            if (((l = l.slice(0, r)), l.match(/^([^\/]+:\/)?\/*$/))) return i;
            ++t;
        }
        return Array(t + 1).join('../') + i.substr(l.length + 1);
    }
    Cm.relative = Vm;
    var A0 = (function () {
        var l = Object.create(null);
        return !('__proto__' in l);
    })();
    function U0(l) {
        return l;
    }
    function Km(l) {
        if (k0(l)) return '$' + l;
        return l;
    }
    Cm.toSetString = A0 ? U0 : Km;
    function Hm(l) {
        if (k0(l)) return l.slice(1);
        return l;
    }
    Cm.fromSetString = A0 ? U0 : Hm;
    function k0(l) {
        if (!l) return !1;
        var i = l.length;
        if (i < 9) return !1;
        if (
            l.charCodeAt(i - 1) !== 95 ||
            l.charCodeAt(i - 2) !== 95 ||
            l.charCodeAt(i - 3) !== 111 ||
            l.charCodeAt(i - 4) !== 116 ||
            l.charCodeAt(i - 5) !== 111 ||
            l.charCodeAt(i - 6) !== 114 ||
            l.charCodeAt(i - 7) !== 112 ||
            l.charCodeAt(i - 8) !== 95 ||
            l.charCodeAt(i - 9) !== 95
        )
            return !1;
        for (var t = i - 10; t >= 0; t--) if (l.charCodeAt(t) !== 36) return !1;
        return !0;
    }
    function Mm(l, i, t) {
        var r = Zl(l.source, i.source);
        if (r !== 0) return r;
        if (((r = l.originalLine - i.originalLine), r !== 0)) return r;
        if (((r = l.originalColumn - i.originalColumn), r !== 0 || t)) return r;
        if (((r = l.generatedColumn - i.generatedColumn), r !== 0)) return r;
        if (((r = l.generatedLine - i.generatedLine), r !== 0)) return r;
        return Zl(l.name, i.name);
    }
    Cm.compareByOriginalPositions = Mm;
    function ym(l, i, t) {
        var r = l.originalLine - i.originalLine;
        if (r !== 0) return r;
        if (((r = l.originalColumn - i.originalColumn), r !== 0 || t)) return r;
        if (((r = l.generatedColumn - i.generatedColumn), r !== 0)) return r;
        if (((r = l.generatedLine - i.generatedLine), r !== 0)) return r;
        return Zl(l.name, i.name);
    }
    Cm.compareByOriginalPositionsNoSource = ym;
    function Am(l, i, t) {
        var r = l.generatedLine - i.generatedLine;
        if (r !== 0) return r;
        if (((r = l.generatedColumn - i.generatedColumn), r !== 0 || t)) return r;
        if (((r = Zl(l.source, i.source)), r !== 0)) return r;
        if (((r = l.originalLine - i.originalLine), r !== 0)) return r;
        if (((r = l.originalColumn - i.originalColumn), r !== 0)) return r;
        return Zl(l.name, i.name);
    }
    Cm.compareByGeneratedPositionsDeflated = Am;
    function Um(l, i, t) {
        var r = l.generatedColumn - i.generatedColumn;
        if (r !== 0 || t) return r;
        if (((r = Zl(l.source, i.source)), r !== 0)) return r;
        if (((r = l.originalLine - i.originalLine), r !== 0)) return r;
        if (((r = l.originalColumn - i.originalColumn), r !== 0)) return r;
        return Zl(l.name, i.name);
    }
    Cm.compareByGeneratedPositionsDeflatedNoLine = Um;
    function Zl(l, i) {
        if (l === i) return 0;
        if (l === null) return 1;
        if (i === null) return -1;
        if (l > i) return 1;
        return -1;
    }
    function km(l, i) {
        var t = l.generatedLine - i.generatedLine;
        if (t !== 0) return t;
        if (((t = l.generatedColumn - i.generatedColumn), t !== 0)) return t;
        if (((t = Zl(l.source, i.source)), t !== 0)) return t;
        if (((t = l.originalLine - i.originalLine), t !== 0)) return t;
        if (((t = l.originalColumn - i.originalColumn), t !== 0)) return t;
        return Zl(l.name, i.name);
    }
    Cm.compareByGeneratedPositionsInflated = km;
    function Sm(l) {
        return JSON.parse(l.replace(/^\)]}'[^\n]*\n/, ''));
    }
    Cm.parseSourceMapInput = Sm;
    function Nm(l, i, t) {
        if (((i = i || ''), l)) {
            if (l[l.length - 1] !== '/' && i[0] !== '/') l += '/';
            i = l + i;
        }
        if (t) {
            var r = at(t);
            if (!r) throw new Error('sourceMapURL could not be parsed');
            if (r.path) {
                var n = r.path.lastIndexOf('/');
                if (n >= 0) r.path = r.path.substring(0, n + 1);
            }
            i = y0(Vi(r), i);
        }
        return nn(i);
    }
    Cm.computeSourceURL = Nm;
});
var S0 = hl((cw) => {
    var on = fr(),
        bn = Object.prototype.hasOwnProperty,
        vi = typeof Map !== 'undefined';
    function dl() {
        (this._array = []), (this._set = vi ? new Map() : Object.create(null));
    }
    dl.fromArray = function l(i, t) {
        var r = new dl();
        for (var n = 0, o = i.length; n < o; n++) r.add(i[n], t);
        return r;
    };
    dl.prototype.size = function l() {
        return vi ? this._set.size : Object.getOwnPropertyNames(this._set).length;
    };
    dl.prototype.add = function l(i, t) {
        var r = vi ? i : on.toSetString(i),
            n = vi ? this.has(i) : bn.call(this._set, r),
            o = this._array.length;
        if (!n || t) this._array.push(i);
        if (!n)
            if (vi) this._set.set(i, o);
            else this._set[r] = o;
    };
    dl.prototype.has = function l(i) {
        if (vi) return this._set.has(i);
        else {
            var t = on.toSetString(i);
            return bn.call(this._set, t);
        }
    };
    dl.prototype.indexOf = function l(i) {
        if (vi) {
            var t = this._set.get(i);
            if (t >= 0) return t;
        } else {
            var r = on.toSetString(i);
            if (bn.call(this._set, r)) return this._set[r];
        }
        throw new Error('"' + i + '" is not in the set.');
    };
    dl.prototype.at = function l(i) {
        if (i >= 0 && i < this._array.length) return this._array[i];
        throw new Error('No element indexed by ' + i);
    };
    dl.prototype.toArray = function l() {
        return this._array.slice();
    };
    cw.ArraySet = dl;
});
var C0 = hl((pw) => {
    var N0 = fr();
    function ww(l, i) {
        var t = l.generatedLine,
            r = i.generatedLine,
            n = l.generatedColumn,
            o = i.generatedColumn;
        return r > t || (r == t && o >= n) || N0.compareByGeneratedPositionsInflated(l, i) <= 0;
    }
    function gr() {
        (this._array = []),
            (this._sorted = !0),
            (this._last = { generatedLine: -1, generatedColumn: 0 });
    }
    gr.prototype.unsortedForEach = function l(i, t) {
        this._array.forEach(i, t);
    };
    gr.prototype.add = function l(i) {
        if (ww(this._last, i)) (this._last = i), this._array.push(i);
        else (this._sorted = !1), this._array.push(i);
    };
    gr.prototype.toArray = function l() {
        if (!this._sorted)
            this._array.sort(N0.compareByGeneratedPositionsInflated), (this._sorted = !0);
        return this._array;
    };
    pw.MappingList = gr;
});
var ji = 'PENPAL_CHILD';
var Vh = rf(Mr(), 1);
var Ec = class extends Error {
        code;
        constructor(l, i) {
            super(i);
            (this.name = 'PenpalError'), (this.code = l);
        }
    },
    _l = Ec,
    Gc = (l) => ({
        name: l.name,
        message: l.message,
        stack: l.stack,
        penpalCode: l instanceof _l ? l.code : void 0,
    }),
    Lc = ({ name: l, message: i, stack: t, penpalCode: r }) => {
        let n = r ? new _l(r, i) : new Error(i);
        return (n.name = l), (n.stack = t), n;
    },
    Bc = Symbol('Reply'),
    Rc = class {
        value;
        transferables;
        #l = Bc;
        constructor(l, i) {
            (this.value = l), (this.transferables = i?.transferables);
        }
    },
    Fc = Rc,
    ql = 'penpal',
    Ut = (l) => {
        return typeof l === 'object' && l !== null;
    },
    Kf = (l) => {
        return typeof l === 'function';
    },
    Vc = (l) => {
        return Ut(l) && l.namespace === ql;
    },
    si = (l) => {
        return l.type === 'SYN';
    },
    kt = (l) => {
        return l.type === 'ACK1';
    },
    ct = (l) => {
        return l.type === 'ACK2';
    },
    Hf = (l) => {
        return l.type === 'CALL';
    },
    Mf = (l) => {
        return l.type === 'REPLY';
    },
    Kc = (l) => {
        return l.type === 'DESTROY';
    },
    yf = (l, i = []) => {
        let t = [];
        for (let r of Object.keys(l)) {
            let n = l[r];
            if (Kf(n)) t.push([...i, r]);
            else if (Ut(n)) t.push(...yf(n, [...i, r]));
        }
        return t;
    },
    Hc = (l, i) => {
        let t = l.reduce((r, n) => {
            return Ut(r) ? r[n] : void 0;
        }, i);
        return Kf(t) ? t : void 0;
    },
    oi = (l) => {
        return l.join('.');
    },
    Bf = (l, i, t) => ({
        namespace: ql,
        channel: l,
        type: 'REPLY',
        callId: i,
        isError: !0,
        ...(t instanceof Error ? { value: Gc(t), isSerializedErrorInstance: !0 } : { value: t }),
    }),
    Mc = (l, i, t, r) => {
        let n = !1,
            o = async (b) => {
                if (n) return;
                if (!Hf(b)) return;
                r?.(`Received ${oi(b.methodPath)}() call`, b);
                let { methodPath: g, args: e, id: f } = b,
                    h,
                    c;
                try {
                    let m = Hc(g, i);
                    if (!m) throw new _l('METHOD_NOT_FOUND', `Method \`${oi(g)}\` is not found.`);
                    let u = await m(...e);
                    if (u instanceof Fc) (c = u.transferables), (u = await u.value);
                    h = { namespace: ql, channel: t, type: 'REPLY', callId: f, value: u };
                } catch (m) {
                    h = Bf(t, f, m);
                }
                if (n) return;
                try {
                    r?.(`Sending ${oi(g)}() reply`, h), l.sendMessage(h, c);
                } catch (m) {
                    if (m.name === 'DataCloneError')
                        (h = Bf(t, f, m)), r?.(`Sending ${oi(g)}() reply`, h), l.sendMessage(h);
                    throw m;
                }
            };
        return (
            l.addMessageHandler(o),
            () => {
                (n = !0), l.removeMessageHandler(o);
            }
        );
    },
    yc = Mc,
    Af =
        crypto.randomUUID?.bind(crypto) ??
        (() =>
            new Array(4)
                .fill(0)
                .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
                .join('-')),
    Ac = Symbol('CallOptions'),
    Uc = class {
        transferables;
        timeout;
        #l = Ac;
        constructor(l) {
            (this.transferables = l?.transferables), (this.timeout = l?.timeout);
        }
    },
    kc = Uc,
    Sc = new Set(['apply', 'call', 'bind']),
    Uf = (l, i, t = []) => {
        return new Proxy(t.length ? () => {} : Object.create(null), {
            get(r, n) {
                if (n === 'then') return;
                if (t.length && Sc.has(n)) return Reflect.get(r, n);
                return Uf(l, i, [...t, n]);
            },
            apply(r, n, o) {
                return l(t, o);
            },
        });
    },
    Rf = (l) => {
        return new _l(
            'CONNECTION_DESTROYED',
            `Method call ${oi(l)}() failed due to destroyed connection`,
        );
    },
    Nc = (l, i, t) => {
        let r = !1,
            n = new Map(),
            o = (e) => {
                if (!Mf(e)) return;
                let { callId: f, value: h, isError: c, isSerializedErrorInstance: m } = e,
                    u = n.get(f);
                if (!u) return;
                if ((n.delete(f), t?.(`Received ${oi(u.methodPath)}() call`, e), c))
                    u.reject(m ? Lc(h) : h);
                else u.resolve(h);
            };
        return (
            l.addMessageHandler(o),
            {
                remoteProxy: Uf((e, f) => {
                    if (r) throw Rf(e);
                    let h = Af(),
                        c = f[f.length - 1],
                        m = c instanceof kc,
                        { timeout: u, transferables: X } = m ? c : {},
                        I = m ? f.slice(0, -1) : f;
                    return new Promise((F, q) => {
                        let V =
                            u !== void 0
                                ? window.setTimeout(() => {
                                      n.delete(h),
                                          q(
                                              new _l(
                                                  'METHOD_CALL_TIMEOUT',
                                                  `Method call ${oi(e)}() timed out after ${u}ms`,
                                              ),
                                          );
                                  }, u)
                                : void 0;
                        n.set(h, { methodPath: e, resolve: F, reject: q, timeoutId: V });
                        try {
                            let fl = {
                                namespace: ql,
                                channel: i,
                                type: 'CALL',
                                id: h,
                                methodPath: e,
                                args: I,
                            };
                            t?.(`Sending ${oi(e)}() call`, fl), l.sendMessage(fl, X);
                        } catch (fl) {
                            q(new _l('TRANSMISSION_FAILED', fl.message));
                        }
                    });
                }, t),
                destroy: () => {
                    (r = !0), l.removeMessageHandler(o);
                    for (let { methodPath: e, reject: f, timeoutId: h } of n.values())
                        clearTimeout(h), f(Rf(e));
                    n.clear();
                },
            }
        );
    },
    Cc = Nc,
    Pc = () => {
        let l, i;
        return {
            promise: new Promise((r, n) => {
                (l = r), (i = n);
            }),
            resolve: l,
            reject: i,
        };
    },
    Ic = Pc,
    Tc = class extends Error {
        constructor(l) {
            super(
                `You've hit a bug in Penpal. Please file an issue with the following information: ${l}`,
            );
        }
    },
    Yi = Tc,
    yr = 'deprecated-penpal',
    Zc = (l) => {
        return Ut(l) && 'penpal' in l;
    },
    dc = (l) => l.split('.'),
    Ff = (l) => l.join('.'),
    kf = (l) => {
        return new Yi(`Unexpected message to translate: ${JSON.stringify(l)}`);
    },
    lm = (l) => {
        if (l.penpal === 'syn')
            return { namespace: ql, channel: void 0, type: 'SYN', participantId: yr };
        if (l.penpal === 'ack') return { namespace: ql, channel: void 0, type: 'ACK2' };
        if (l.penpal === 'call')
            return {
                namespace: ql,
                channel: void 0,
                type: 'CALL',
                id: l.id,
                methodPath: dc(l.methodName),
                args: l.args,
            };
        if (l.penpal === 'reply')
            if (l.resolution === 'fulfilled')
                return {
                    namespace: ql,
                    channel: void 0,
                    type: 'REPLY',
                    callId: l.id,
                    value: l.returnValue,
                };
            else
                return {
                    namespace: ql,
                    channel: void 0,
                    type: 'REPLY',
                    callId: l.id,
                    isError: !0,
                    ...(l.returnValueIsError
                        ? { value: l.returnValue, isSerializedErrorInstance: !0 }
                        : { value: l.returnValue }),
                };
        throw kf(l);
    },
    im = (l) => {
        if (kt(l)) return { penpal: 'synAck', methodNames: l.methodPaths.map(Ff) };
        if (Hf(l)) return { penpal: 'call', id: l.id, methodName: Ff(l.methodPath), args: l.args };
        if (Mf(l))
            if (l.isError)
                return {
                    penpal: 'reply',
                    id: l.callId,
                    resolution: 'rejected',
                    ...(l.isSerializedErrorInstance
                        ? { returnValue: l.value, returnValueIsError: !0 }
                        : { returnValue: l.value }),
                };
            else
                return {
                    penpal: 'reply',
                    id: l.callId,
                    resolution: 'fulfilled',
                    returnValue: l.value,
                };
        throw kf(l);
    },
    tm = ({ messenger: l, methods: i, timeout: t, channel: r, log: n }) => {
        let o = Af(),
            b,
            g = [],
            e = !1,
            f = yf(i),
            { promise: h, resolve: c, reject: m } = Ic(),
            u =
                t !== void 0
                    ? setTimeout(() => {
                          m(new _l('CONNECTION_TIMEOUT', `Connection timed out after ${t}ms`));
                      }, t)
                    : void 0,
            X = () => {
                for (let G of g) G();
            },
            I = () => {
                if (e) return;
                g.push(yc(l, i, r, n));
                let { remoteProxy: G, destroy: L } = Cc(l, r, n);
                g.push(L), clearTimeout(u), (e = !0), c({ remoteProxy: G, destroy: X });
            },
            F = () => {
                let G = { namespace: ql, type: 'SYN', channel: r, participantId: o };
                n?.('Sending handshake SYN', G);
                try {
                    l.sendMessage(G);
                } catch (L) {
                    m(new _l('TRANSMISSION_FAILED', L.message));
                }
            },
            q = (G) => {
                if ((n?.('Received handshake SYN', G), G.participantId === b && b !== yr)) return;
                if (((b = G.participantId), F(), !(o > b || b === yr))) return;
                let y = { namespace: ql, channel: r, type: 'ACK1', methodPaths: f };
                n?.('Sending handshake ACK1', y);
                try {
                    l.sendMessage(y);
                } catch (T) {
                    m(new _l('TRANSMISSION_FAILED', T.message));
                    return;
                }
            },
            V = (G) => {
                n?.('Received handshake ACK1', G);
                let L = { namespace: ql, channel: r, type: 'ACK2' };
                n?.('Sending handshake ACK2', L);
                try {
                    l.sendMessage(L);
                } catch (y) {
                    m(new _l('TRANSMISSION_FAILED', y.message));
                    return;
                }
                I();
            },
            fl = (G) => {
                n?.('Received handshake ACK2', G), I();
            },
            K = (G) => {
                if (si(G)) q(G);
                if (kt(G)) V(G);
                if (ct(G)) fl(G);
            };
        return l.addMessageHandler(K), g.push(() => l.removeMessageHandler(K)), F(), h;
    },
    rm = tm,
    nm = (l) => {
        let i = !1,
            t;
        return (...r) => {
            if (!i) (i = !0), (t = l(...r));
            return t;
        };
    },
    om = nm,
    Vf = new WeakSet(),
    bm = ({ messenger: l, methods: i = {}, timeout: t, channel: r, log: n }) => {
        if (!l) throw new _l('INVALID_ARGUMENT', 'messenger must be defined');
        if (Vf.has(l))
            throw new _l(
                'INVALID_ARGUMENT',
                'A messenger can only be used for a single connection',
            );
        Vf.add(l);
        let o = [l.destroy],
            b = om((f) => {
                if (f) {
                    let h = { namespace: ql, channel: r, type: 'DESTROY' };
                    try {
                        l.sendMessage(h);
                    } catch (c) {}
                }
                for (let h of o) h();
                n?.('Connection destroyed');
            }),
            g = (f) => {
                return Vc(f) && f.channel === r;
            };
        return {
            promise: (async () => {
                try {
                    l.initialize({ log: n, validateReceivedMessage: g }),
                        l.addMessageHandler((c) => {
                            if (Kc(c)) b(!1);
                        });
                    let { remoteProxy: f, destroy: h } = await rm({
                        messenger: l,
                        methods: i,
                        timeout: t,
                        channel: r,
                        log: n,
                    });
                    return o.push(h), f;
                } catch (f) {
                    throw (b(!0), f);
                }
            })(),
            destroy: () => {
                b(!0);
            },
        };
    },
    Sf = bm,
    fm = class {
        #l;
        #n;
        #t;
        #i;
        #b;
        #r = new Set();
        #o;
        #f = !1;
        constructor({ remoteWindow: l, allowedOrigins: i }) {
            if (!l) throw new _l('INVALID_ARGUMENT', 'remoteWindow must be defined');
            (this.#l = l), (this.#n = i?.length ? i : [window.origin]);
        }
        initialize = ({ log: l, validateReceivedMessage: i }) => {
            (this.#t = l), (this.#i = i), window.addEventListener('message', this.#c);
        };
        sendMessage = (l, i) => {
            if (si(l)) {
                let t = this.#g(l);
                this.#l.postMessage(l, { targetOrigin: t, transfer: i });
                return;
            }
            if (kt(l) || this.#f) {
                let t = this.#f ? im(l) : l,
                    r = this.#g(l);
                this.#l.postMessage(t, { targetOrigin: r, transfer: i });
                return;
            }
            if (ct(l)) {
                let { port1: t, port2: r } = new MessageChannel();
                (this.#o = t), t.addEventListener('message', this.#e), t.start();
                let n = [r, ...(i || [])],
                    o = this.#g(l);
                this.#l.postMessage(l, { targetOrigin: o, transfer: n });
                return;
            }
            if (this.#o) {
                this.#o.postMessage(l, { transfer: i });
                return;
            }
            throw new Yi('Port is undefined');
        };
        addMessageHandler = (l) => {
            this.#r.add(l);
        };
        removeMessageHandler = (l) => {
            this.#r.delete(l);
        };
        destroy = () => {
            window.removeEventListener('message', this.#c), this.#h(), this.#r.clear();
        };
        #m = (l) => {
            return this.#n.some((i) => (i instanceof RegExp ? i.test(l) : i === l || i === '*'));
        };
        #g = (l) => {
            if (si(l)) return '*';
            if (!this.#b) throw new Yi('Concrete remote origin not set');
            return this.#b === 'null' && this.#n.includes('*') ? '*' : this.#b;
        };
        #h = () => {
            this.#o?.removeEventListener('message', this.#e), this.#o?.close(), (this.#o = void 0);
        };
        #c = ({ source: l, origin: i, ports: t, data: r }) => {
            if (l !== this.#l) return;
            if (Zc(r))
                this.#t?.('Please upgrade the child window to the latest version of Penpal.'),
                    (this.#f = !0),
                    (r = lm(r));
            if (!this.#i?.(r)) return;
            if (!this.#m(i)) {
                this.#t?.(
                    `Received a message from origin \`${i}\` which did not match allowed origins \`[${this.#n.join(', ')}]\``,
                );
                return;
            }
            if (si(r)) this.#h(), (this.#b = i);
            if (ct(r) && !this.#f) {
                if (((this.#o = t[0]), !this.#o)) throw new Yi('No port received on ACK2');
                this.#o.addEventListener('message', this.#e), this.#o.start();
            }
            for (let n of this.#r) n(r);
        };
        #e = ({ data: l }) => {
            if (!this.#i?.(l)) return;
            for (let i of this.#r) i(l);
        };
    },
    Nf = fm,
    S5 = class {
        #l;
        #n;
        #t = new Set();
        #i;
        constructor({ worker: l }) {
            if (!l) throw new _l('INVALID_ARGUMENT', 'worker must be defined');
            this.#l = l;
        }
        initialize = ({ validateReceivedMessage: l }) => {
            (this.#n = l), this.#l.addEventListener('message', this.#r);
        };
        sendMessage = (l, i) => {
            if (si(l) || kt(l)) {
                this.#l.postMessage(l, { transfer: i });
                return;
            }
            if (ct(l)) {
                let { port1: t, port2: r } = new MessageChannel();
                (this.#i = t),
                    t.addEventListener('message', this.#r),
                    t.start(),
                    this.#l.postMessage(l, { transfer: [r, ...(i || [])] });
                return;
            }
            if (this.#i) {
                this.#i.postMessage(l, { transfer: i });
                return;
            }
            throw new Yi('Port is undefined');
        };
        addMessageHandler = (l) => {
            this.#t.add(l);
        };
        removeMessageHandler = (l) => {
            this.#t.delete(l);
        };
        destroy = () => {
            this.#l.removeEventListener('message', this.#r), this.#b(), this.#t.clear();
        };
        #b = () => {
            this.#i?.removeEventListener('message', this.#r), this.#i?.close(), (this.#i = void 0);
        };
        #r = ({ ports: l, data: i }) => {
            if (!this.#n?.(i)) return;
            if (si(i)) this.#b();
            if (ct(i)) {
                if (((this.#i = l[0]), !this.#i)) throw new Yi('No port received on ACK2');
                this.#i.addEventListener('message', this.#r), this.#i.start();
            }
            for (let t of this.#t) t(i);
        };
    };
var N5 = class {
    #l;
    #n;
    #t = new Set();
    constructor({ port: l }) {
        if (!l) throw new _l('INVALID_ARGUMENT', 'port must be defined');
        this.#l = l;
    }
    initialize = ({ validateReceivedMessage: l }) => {
        (this.#n = l), this.#l.addEventListener('message', this.#i), this.#l.start();
    };
    sendMessage = (l, i) => {
        this.#l?.postMessage(l, { transfer: i });
    };
    addMessageHandler = (l) => {
        this.#t.add(l);
    };
    removeMessageHandler = (l) => {
        this.#t.delete(l);
    };
    destroy = () => {
        this.#l.removeEventListener('message', this.#i), this.#l.close(), this.#t.clear();
    };
    #i = ({ data: l }) => {
        if (!this.#n?.(l)) return;
        for (let i of this.#t) i(l);
    };
};
var Cf = ['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT'],
    Pf = new Set([
        'a',
        'abbr',
        'area',
        'audio',
        'b',
        'bdi',
        'bdo',
        'br',
        'button',
        'canvas',
        'cite',
        'code',
        'data',
        'datalist',
        'del',
        'dfn',
        'em',
        'embed',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'i',
        'iframe',
        'img',
        'input',
        'ins',
        'kbd',
        'label',
        'li',
        'map',
        'mark',
        'meter',
        'noscript',
        'object',
        'output',
        'p',
        'picture',
        'progress',
        'q',
        'ruby',
        's',
        'samp',
        'script',
        'select',
        'slot',
        'small',
        'span',
        'strong',
        'sub',
        'sup',
        'svg',
        'template',
        'textarea',
        'time',
        'u',
        'var',
        'video',
        'wbr',
    ]);
var Ar = '.next-prod';
var ex = {
    SCALE: 0.7,
    PAN_POSITION: { x: 175, y: 100 },
    URL: 'http://localhost:3000/',
    FRAME_POSITION: { x: 0, y: 0 },
    FRAME_DIMENSION: { width: 1536, height: 960 },
    ASPECT_RATIO_LOCKED: !1,
    DEVICE: 'Custom:Custom',
    THEME: 'system',
    ORIENTATION: 'Portrait',
    MIN_DIMENSIONS: { width: '280px', height: '360px' },
    COMMANDS: { run: 'bun run dev', build: 'bun run build', install: 'bun install' },
    IMAGE_FOLDER: 'public',
    IMAGE_DIMENSION: { width: '100px', height: '100px' },
    FONT_FOLDER: 'public/fonts',
    FONT_CONFIG: 'app/fonts.ts',
    TAILWIND_CONFIG: 'tailwind.config.ts',
    CHAT_SETTINGS: {
        showSuggestions: !0,
        autoApplyCode: !0,
        expandCodeBlocks: !1,
        showMiniChat: !0,
    },
    EDITOR_SETTINGS: { shouldWarnDelete: !1, enableBunReplace: !0, buildFlags: '--no-lint' },
};
var Ur = ['node_modules', 'dist', 'build', '.git', '.next'],
    mx = [...Ur, 'static', Ar],
    wx = [...Ur, Ar],
    px = [...Ur, 'coverage'];
var xx = { ['en']: 'English', ['ja']: '日本語', ['zh']: '中文', ['ko']: '한국어' };
var df = rf(Mr(), 1);
function H(l) {
    return document.querySelector(`[${'data-odid'}="${l}"]`);
}
function kr(l, i = !1) {
    let t = `[${'data-odid'}="${l}"]`;
    if (!i) return t;
    return gm(t);
}
function gm(l) {
    return CSS.escape(l);
}
function zi(l) {
    return (
        l &&
        l instanceof Node &&
        l.nodeType === Node.ELEMENT_NODE &&
        !Cf.includes(l.tagName) &&
        !l.hasAttribute('data-onlook-ignore') &&
        l.style.display !== 'none'
    );
}
var em = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
var If = (l = 21) => {
    let i = '',
        t = l | 0;
    while (t--) i += em[(Math.random() * 64) | 0];
    return i;
};
function Jl(l) {
    let i = l.getAttribute('data-odid');
    if (!i) (i = `odid-${If()}`), l.setAttribute('data-odid', i);
    return i;
}
function Vl(l) {
    return l.getAttribute('data-oid');
}
function Kl(l) {
    return l.getAttribute('data-oiid');
}
function Tf(l, i) {
    if (!vl) return;
    vl.onDomProcessed({ layerMap: Object.fromEntries(l), rootNode: i }).catch((t) => {
        console.error('Failed to send DOM processed event:', t);
    });
}
function Sr(l) {
    window._onlookFrameId = l;
}
function Qi() {
    let l = window._onlookFrameId;
    if (!l)
        return (
            console.warn('Frame id not found'),
            vl?.getFrameId().then((i) => {
                Sr(i);
            }),
            ''
        );
    return l;
}
function hm(l = document.body) {
    if (!Qi()) return console.warn('frameView id not found, skipping dom processing'), null;
    let t = zl(l);
    if (!t) return console.warn('Error building layer tree, root element is null'), null;
    let r = l.getAttribute('data-odid');
    if (!r) return console.warn('Root dom id not found'), null;
    let n = t.get(r);
    if (!n) return console.warn('Root node not found'), null;
    return Tf(t, n), { rootDomId: r, layerMap: Array.from(t.entries()) };
}
var St = df.default(hm, 500),
    cm = [
        (l) => {
            let i = l.parentElement;
            return i && i.tagName.toLowerCase() === 'svg';
        },
        (l) => {
            return l.tagName.toLowerCase() === 'next-route-announcer';
        },
        (l) => {
            return l.tagName.toLowerCase() === 'nextjs-portal';
        },
    ];
function zl(l) {
    if (!zi(l)) return null;
    let i = new Map(),
        t = document.createTreeWalker(l, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (o) => {
                let b = o;
                if (cm.some((g) => g(b))) return NodeFilter.FILTER_REJECT;
                return zi(b) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            },
        }),
        r = Zf(l);
    (r.children = []), i.set(r.domId, r);
    let n = t.nextNode();
    while (n) {
        let o = Zf(n);
        o.children = [];
        let b = n.parentElement;
        if (b) {
            let g = b.getAttribute('data-odid');
            if (g) {
                o.parent = g;
                let e = i.get(g);
                if (e && e.children) e.children.push(o.domId);
            }
        }
        i.set(o.domId, o), (n = t.nextNode());
    }
    return i;
}
function Zf(l) {
    let i = Jl(l),
        t = Vl(l),
        r = Kl(l),
        n = Array.from(l.childNodes)
            .map((e) => (e.nodeType === Node.TEXT_NODE ? e.textContent : ''))
            .join(' ')
            .trim()
            .slice(0, 500),
        o = window.getComputedStyle(l),
        b = l.getAttribute('data-ocname');
    return {
        domId: i,
        oid: t || null,
        instanceId: r || null,
        textContent: n || '',
        tagName: l.tagName.toLowerCase(),
        isVisible: o.visibility !== 'hidden',
        component: b || null,
        frameId: Qi(),
        children: null,
        parent: null,
        dynamicType: null,
        coreElementType: null,
    };
}
function Nr(l) {
    throw new Error(`Expected \`never\`, found: ${JSON.stringify(l)}`);
}
var l0 = (l) => JSON.parse(JSON.stringify(l));
function i0(l) {
    let i = r0(l),
        t = mm(l),
        r = wm(l);
    return { defined: { width: 'auto', height: 'auto', ...t, ...r }, computed: i };
}
function t0(l) {
    let i = H(l);
    if (!i) return {};
    return r0(i);
}
function r0(l) {
    return l0(window.getComputedStyle(l));
}
function mm(l) {
    let i = {},
        t = n0(l.style.cssText);
    return (
        Object.entries(t).forEach(([r, n]) => {
            i[r] = n;
        }),
        i
    );
}
function wm(l) {
    let i = {},
        t = document.styleSheets;
    for (let r = 0; r < t.length; r++) {
        let n,
            o = t[r];
        try {
            if (!o) {
                console.warn('Sheet is undefined');
                continue;
            }
            n = Array.from(o.cssRules) || o.rules;
        } catch (b) {
            console.warn("Can't read the css rules of: " + o?.href, b);
            continue;
        }
        for (let b = 0; b < n.length; b++)
            try {
                let g = n[b];
                if (g && l.matches(g.selectorText)) {
                    let e = n0(g.style.cssText);
                    Object.entries(e).forEach(([f, h]) => (i[f] = h));
                }
            } catch (g) {
                console.warn('Error', g);
            }
    }
    return i;
}
function n0(l) {
    let i = {};
    return (
        l.split(';').forEach((t) => {
            if (((t = t.trim()), !t)) return;
            let [r, ...n] = t.split(':');
            i[r?.trim() ?? ''] = n.join(':').trim();
        }),
        i
    );
}
var o0 = (l, i) => {
        let t = document.elementFromPoint(l, i);
        if (!t) return;
        let r = (o) => {
            if (o?.shadowRoot) {
                let b = o.shadowRoot.elementFromPoint(l, i);
                if (b == o) return o;
                else if (b?.shadowRoot) return r(b);
                else return b || o;
            } else return o;
        };
        return r(t) || t;
    },
    nl = (l, i) => {
        let t = l.parentElement,
            r = t
                ? {
                      domId: t.getAttribute('data-odid'),
                      frameId: Qi(),
                      oid: t.getAttribute('data-oid'),
                      instanceId: t.getAttribute('data-oiid'),
                      rect: t.getBoundingClientRect(),
                  }
                : null,
            n = l.getBoundingClientRect(),
            o = i ? i0(l) : null;
        return {
            domId: l.getAttribute('data-odid'),
            oid: l.getAttribute('data-oid'),
            frameId: Qi(),
            instanceId: l.getAttribute('data-oiid'),
            rect: n,
            tagName: l.tagName,
            parent: r,
            styles: o,
        };
    };
function Nt(l) {
    try {
        let i = l.getAttribute('data-onlook-drag-saved-style');
        if (i) {
            let t = JSON.parse(i);
            for (let r in t) l.style[r] = t[r];
        }
    } catch (i) {
        console.warn('Error restoring style', i);
    }
}
function b0(l) {
    let i = l.parentElement;
    if (!i) return;
    return {
        type: 'index',
        targetDomId: i.getAttribute('data-odid'),
        targetOid: Kl(i) || Vl(i) || null,
        index: Array.from(l.parentElement?.children || []).indexOf(l),
        originalIndex: Array.from(l.parentElement?.children || []).indexOf(l),
    };
}
var f0 = (l) => {
    let i = Array.from(l.childNodes)
        .filter((t) => t.nodeType === Node.TEXT_NODE)
        .map((t) => t.textContent);
    if (i.length === 0) return;
    return i.join('');
};
var Ct = (l, i) => {
        let t = H(l) || document.body;
        return nl(t, i);
    },
    g0 = (l, i, t) => {
        let r = pm(l, i) || document.body;
        return nl(r, t);
    },
    pm = (l, i) => {
        let t = document.elementFromPoint(l, i);
        if (!t) return;
        let r = (o) => {
            if (o?.shadowRoot) {
                let b = o.shadowRoot.elementFromPoint(l, i);
                if (b == o) return o;
                else if (b?.shadowRoot) return r(b);
                else return b || o;
            } else return o;
        };
        return r(t) || t;
    },
    e0 = (l, i, t) => {
        let r = H(l);
        if (!r) {
            console.warn('Failed to updateElementInstanceId: Element not found');
            return;
        }
        r.setAttribute('data-oiid', i), r.setAttribute('data-ocname', t);
    },
    h0 = (l) => {
        let i = H(l);
        if (!i?.parentElement) return null;
        return nl(i.parentElement, !1);
    },
    c0 = (l) => {
        let i = H(l);
        if (!i) return 0;
        return i.children.length;
    },
    m0 = (l) => {
        let i = H(l);
        if (!i) return null;
        return nl(i.offsetParent, !1);
    };
function w0(l, i, t) {
    let r = H(l.domId);
    if (!r) return console.warn('Failed to find parent element', l.domId), null;
    let n = um(i),
        o = new Set(t.map((f) => f.domId)),
        b = Array.from(r.children)
            .map((f, h) => ({ element: f, index: h, domId: Jl(f) }))
            .filter(({ domId: f }) => o.has(f));
    if (b.length === 0) return console.warn('No valid children found to group'), null;
    let g = Math.min(...b.map((f) => f.index));
    return (
        r.insertBefore(n, r.children[g] ?? null),
        b.forEach(({ element: f }) => {
            let h = f.cloneNode(!0);
            h.setAttribute('data-onlook-inserted', 'true'),
                n.appendChild(h),
                (f.style.display = 'none'),
                u0(f);
        }),
        { domEl: nl(n, !0), newMap: zl(n) }
    );
}
function p0(l, i) {
    let t = H(l.domId);
    if (!t) return console.warn(`Parent element not found: ${l.domId}`), null;
    let r;
    if (i.domId) r = H(i.domId);
    else return console.warn('Container domId is required for ungrouping'), null;
    if (!r) return console.warn('Container element not found for ungrouping'), null;
    return (
        Array.from(r.children).forEach((b) => {
            t.appendChild(b);
        }),
        r.remove(),
        { domEl: nl(t, !0), newMap: zl(t) }
    );
}
function um(l) {
    let i = document.createElement(l.tagName);
    return (
        Object.entries(l.attributes).forEach(([t, r]) => {
            i.setAttribute(t, r);
        }),
        i.setAttribute('data-onlook-inserted', 'true'),
        i.setAttribute('data-odid', l.domId),
        i.setAttribute('data-oid', l.oid),
        i
    );
}
function u0(l) {
    l.removeAttribute('data-odid'),
        l.removeAttribute('data-oid'),
        l.removeAttribute('data-onlook-inserted');
    let i = Array.from(l.children);
    if (i.length === 0) return;
    i.forEach((t) => {
        u0(t);
    });
}
function Pt(l) {
    let i = H(l);
    if (!i) return console.warn('Element not found for domId:', l), null;
    return z0(i);
}
function z0(l) {
    let i = Array.from(l.attributes).reduce((r, n) => {
            return (r[n.name] = n.value), r;
        }, {}),
        t = Kl(l) || Vl(l) || null;
    if (!t) return console.warn('Element has no oid'), null;
    return {
        oid: t,
        domId: Jl(l),
        tagName: l.tagName.toLowerCase(),
        children: Array.from(l.children)
            .map((r) => z0(r))
            .filter(Boolean),
        attributes: i,
        textContent: f0(l) || null,
        styles: {},
    };
}
function x0(l) {
    let i = H(l);
    if (!i) throw new Error('Element not found for domId: ' + l);
    let t = i.parentElement;
    if (!t) throw new Error('Inserted element has no parent');
    let r = Kl(t) || Vl(t);
    if (!r) return console.warn('Parent element has no oid'), null;
    let n = Jl(t),
        o = Array.from(t.children).indexOf(i);
    if (o === -1) return { type: 'append', targetDomId: n, targetOid: r };
    return { type: 'index', targetDomId: n, targetOid: r, index: o, originalIndex: o };
}
function a0(l) {
    let i = document.querySelector(`[${'data-odid'}="${l}"]`);
    if (!i)
        return (
            console.warn('No element found', { domId: l }), { dynamicType: null, coreType: null }
        );
    let t = i.getAttribute('data-onlook-dynamic-type') || null,
        r = i.getAttribute('data-onlook-core-element-type') || null;
    return { dynamicType: t, coreType: r };
}
function _0(l, i, t) {
    let r = document.querySelector(`[${'data-odid'}="${l}"]`);
    if (r) {
        if (i) r.setAttribute('data-onlook-dynamic-type', i);
        if (t) r.setAttribute('data-onlook-core-element-type', t);
    }
}
function v0() {
    let i = document.body.querySelector(`[${'data-oid'}]`);
    if (i) return nl(i, !0);
    return null;
}
var Yl = 0,
    w = 1,
    _ = 2,
    S = 3,
    R = 4,
    gl = 5,
    Ei = 6,
    il = 7,
    wl = 8,
    $ = 9,
    v = 10,
    A = 11,
    j = 12,
    Y = 13,
    Pl = 14,
    cl = 15,
    P = 16,
    Z = 17,
    d = 18,
    el = 19,
    pl = 20,
    s = 21,
    a = 22,
    N = 23,
    ml = 24,
    U = 25;
function ol(l) {
    return l >= 48 && l <= 57;
}
function Dl(l) {
    return ol(l) || (l >= 65 && l <= 70) || (l >= 97 && l <= 102);
}
function Zt(l) {
    return l >= 65 && l <= 90;
}
function zm(l) {
    return l >= 97 && l <= 122;
}
function xm(l) {
    return Zt(l) || zm(l);
}
function am(l) {
    return l >= 128;
}
function Tt(l) {
    return xm(l) || am(l) || l === 95;
}
function mt(l) {
    return Tt(l) || ol(l) || l === 45;
}
function _m(l) {
    return (l >= 0 && l <= 8) || l === 11 || (l >= 14 && l <= 31) || l === 127;
}
function wt(l) {
    return l === 10 || l === 13 || l === 12;
}
function Hl(l) {
    return wt(l) || l === 32 || l === 9;
}
function Ol(l, i) {
    if (l !== 92) return !1;
    if (wt(i) || i === 0) return !1;
    return !0;
}
function Gi(l, i, t) {
    if (l === 45) return Tt(i) || i === 45 || Ol(i, t);
    if (Tt(l)) return !0;
    if (l === 92) return Ol(l, i);
    return !1;
}
function dt(l, i, t) {
    if (l === 43 || l === 45) {
        if (ol(i)) return 2;
        return i === 46 && ol(t) ? 3 : 0;
    }
    if (l === 46) return ol(i) ? 2 : 0;
    if (ol(l)) return 1;
    return 0;
}
function lr(l) {
    if (l === 65279) return 1;
    if (l === 65534) return 1;
    return 0;
}
var Cr = new Array(128),
    vm = 128,
    pt = 130,
    Pr = 131,
    ir = 132,
    Ir = 133;
for (let l = 0; l < Cr.length; l++)
    Cr[l] = (Hl(l) && pt) || (ol(l) && Pr) || (Tt(l) && ir) || (_m(l) && Ir) || l || vm;
function tr(l) {
    return l < 128 ? Cr[l] : ir;
}
function Li(l, i) {
    return i < l.length ? l.charCodeAt(i) : 0;
}
function rr(l, i, t) {
    if (t === 13 && Li(l, i + 1) === 10) return 2;
    return 1;
}
function Il(l, i, t) {
    let r = l.charCodeAt(i);
    if (Zt(r)) r = r | 32;
    return r === t;
}
function Tl(l, i, t, r) {
    if (t - i !== r.length) return !1;
    if (i < 0 || t > l.length) return !1;
    for (let n = i; n < t; n++) {
        let o = r.charCodeAt(n - i),
            b = l.charCodeAt(n);
        if (Zt(b)) b = b | 32;
        if (b !== o) return !1;
    }
    return !0;
}
function O0(l, i) {
    for (; i >= 0; i--) if (!Hl(l.charCodeAt(i))) break;
    return i + 1;
}
function ut(l, i) {
    for (; i < l.length; i++) if (!Hl(l.charCodeAt(i))) break;
    return i;
}
function Tr(l, i) {
    for (; i < l.length; i++) if (!ol(l.charCodeAt(i))) break;
    return i;
}
function Ml(l, i) {
    if (((i += 2), Dl(Li(l, i - 1)))) {
        for (let r = Math.min(l.length, i + 5); i < r; i++) if (!Dl(Li(l, i))) break;
        let t = Li(l, i);
        if (Hl(t)) i += rr(l, i, t);
    }
    return i;
}
function zt(l, i) {
    for (; i < l.length; i++) {
        let t = l.charCodeAt(i);
        if (mt(t)) continue;
        if (Ol(t, Li(l, i + 1))) {
            i = Ml(l, i) - 1;
            continue;
        }
        break;
    }
    return i;
}
function xi(l, i) {
    let t = l.charCodeAt(i);
    if (t === 43 || t === 45) t = l.charCodeAt((i += 1));
    if (ol(t)) (i = Tr(l, i + 1)), (t = l.charCodeAt(i));
    if (t === 46 && ol(l.charCodeAt(i + 1))) (i += 2), (i = Tr(l, i));
    if (Il(l, i, 101)) {
        let r = 0;
        if (((t = l.charCodeAt(i + 1)), t === 45 || t === 43)) (r = 1), (t = l.charCodeAt(i + 2));
        if (ol(t)) i = Tr(l, i + 1 + r + 1);
    }
    return i;
}
function nr(l, i) {
    for (; i < l.length; i++) {
        let t = l.charCodeAt(i);
        if (t === 41) {
            i++;
            break;
        }
        if (Ol(t, Li(l, i + 1))) i = Ml(l, i);
    }
    return i;
}
function xt(l) {
    if (l.length === 1 && !Dl(l.charCodeAt(0))) return l[0];
    let i = parseInt(l, 16);
    if (i === 0 || (i >= 55296 && i <= 57343) || i > 1114111) i = 65533;
    return String.fromCodePoint(i);
}
var Bi = [
    'EOF-token',
    'ident-token',
    'function-token',
    'at-keyword-token',
    'hash-token',
    'string-token',
    'bad-string-token',
    'url-token',
    'bad-url-token',
    'delim-token',
    'number-token',
    'percentage-token',
    'dimension-token',
    'whitespace-token',
    'CDO-token',
    'CDC-token',
    'colon-token',
    'semicolon-token',
    'comma-token',
    '[-token',
    ']-token',
    '(-token',
    ')-token',
    '{-token',
    '}-token',
    'comment-token',
];
function Ri(l = null, i) {
    if (l === null || l.length < i) return new Uint32Array(Math.max(i + 1024, 16384));
    return l;
}
var D0 = 10,
    Om = 12,
    $0 = 13;
function q0(l) {
    let i = l.source,
        t = i.length,
        r = i.length > 0 ? lr(i.charCodeAt(0)) : 0,
        n = Ri(l.lines, t),
        o = Ri(l.columns, t),
        b = l.startLine,
        g = l.startColumn;
    for (let e = r; e < t; e++) {
        let f = i.charCodeAt(e);
        if (((n[e] = b), (o[e] = g++), f === D0 || f === $0 || f === Om)) {
            if (f === $0 && e + 1 < t && i.charCodeAt(e + 1) === D0) e++, (n[e] = b), (o[e] = g);
            b++, (g = 1);
        }
    }
    (n[t] = b), (o[t] = g), (l.lines = n), (l.columns = o), (l.computed = !0);
}
class or {
    constructor(l, i, t, r) {
        this.setSource(l, i, t, r), (this.lines = null), (this.columns = null);
    }
    setSource(l = '', i = 0, t = 1, r = 1) {
        (this.source = l),
            (this.startOffset = i),
            (this.startLine = t),
            (this.startColumn = r),
            (this.computed = !1);
    }
    getLocation(l, i) {
        if (!this.computed) q0(this);
        return {
            source: i,
            offset: this.startOffset + l,
            line: this.lines[l],
            column: this.columns[l],
        };
    }
    getLocationRange(l, i, t) {
        if (!this.computed) q0(this);
        return {
            source: t,
            start: { offset: this.startOffset + l, line: this.lines[l], column: this.columns[l] },
            end: { offset: this.startOffset + i, line: this.lines[i], column: this.columns[i] },
        };
    }
}
var yl = 16777215,
    Al = 24,
    ai = new Uint8Array(32);
ai[_] = a;
ai[s] = a;
ai[el] = pl;
ai[N] = ml;
function J0(l) {
    return ai[l] !== 0;
}
class br {
    constructor(l, i) {
        this.setSource(l, i);
    }
    reset() {
        (this.eof = !1),
            (this.tokenIndex = -1),
            (this.tokenType = 0),
            (this.tokenStart = this.firstCharOffset),
            (this.tokenEnd = this.firstCharOffset);
    }
    setSource(l = '', i = () => {}) {
        l = String(l || '');
        let t = l.length,
            r = Ri(this.offsetAndType, l.length + 1),
            n = Ri(this.balance, l.length + 1),
            o = 0,
            b = -1,
            g = 0,
            e = l.length;
        (this.offsetAndType = null),
            (this.balance = null),
            n.fill(0),
            i(l, (f, h, c) => {
                let m = o++;
                if (((r[m] = (f << Al) | c), b === -1)) b = h;
                if (((n[m] = e), f === g)) {
                    let u = n[e];
                    (n[e] = m), (e = u), (g = ai[r[u] >> Al]);
                } else if (J0(f)) (e = m), (g = ai[f]);
            }),
            (r[o] = (Yl << Al) | t),
            (n[o] = o);
        for (let f = 0; f < o; f++) {
            let h = n[f];
            if (h <= f) {
                let c = n[h];
                if (c !== f) n[f] = c;
            } else if (h > o) n[f] = o;
        }
        (this.source = l),
            (this.firstCharOffset = b === -1 ? 0 : b),
            (this.tokenCount = o),
            (this.offsetAndType = r),
            (this.balance = n),
            this.reset(),
            this.next();
    }
    lookupType(l) {
        if (((l += this.tokenIndex), l < this.tokenCount)) return this.offsetAndType[l] >> Al;
        return Yl;
    }
    lookupTypeNonSC(l) {
        for (let i = this.tokenIndex; i < this.tokenCount; i++) {
            let t = this.offsetAndType[i] >> Al;
            if (t !== Y && t !== U) {
                if (l-- === 0) return t;
            }
        }
        return Yl;
    }
    lookupOffset(l) {
        if (((l += this.tokenIndex), l < this.tokenCount)) return this.offsetAndType[l - 1] & yl;
        return this.source.length;
    }
    lookupOffsetNonSC(l) {
        for (let i = this.tokenIndex; i < this.tokenCount; i++) {
            let t = this.offsetAndType[i] >> Al;
            if (t !== Y && t !== U) {
                if (l-- === 0) return i - this.tokenIndex;
            }
        }
        return Yl;
    }
    lookupValue(l, i) {
        if (((l += this.tokenIndex), l < this.tokenCount))
            return Tl(this.source, this.offsetAndType[l - 1] & yl, this.offsetAndType[l] & yl, i);
        return !1;
    }
    getTokenStart(l) {
        if (l === this.tokenIndex) return this.tokenStart;
        if (l > 0)
            return l < this.tokenCount
                ? this.offsetAndType[l - 1] & yl
                : this.offsetAndType[this.tokenCount] & yl;
        return this.firstCharOffset;
    }
    substrToCursor(l) {
        return this.source.substring(l, this.tokenStart);
    }
    isBalanceEdge(l) {
        return this.balance[this.tokenIndex] < l;
    }
    isDelim(l, i) {
        if (i)
            return this.lookupType(i) === $ && this.source.charCodeAt(this.lookupOffset(i)) === l;
        return this.tokenType === $ && this.source.charCodeAt(this.tokenStart) === l;
    }
    skip(l) {
        let i = this.tokenIndex + l;
        if (i < this.tokenCount)
            (this.tokenIndex = i),
                (this.tokenStart = this.offsetAndType[i - 1] & yl),
                (i = this.offsetAndType[i]),
                (this.tokenType = i >> Al),
                (this.tokenEnd = i & yl);
        else (this.tokenIndex = this.tokenCount), this.next();
    }
    next() {
        let l = this.tokenIndex + 1;
        if (l < this.tokenCount)
            (this.tokenIndex = l),
                (this.tokenStart = this.tokenEnd),
                (l = this.offsetAndType[l]),
                (this.tokenType = l >> Al),
                (this.tokenEnd = l & yl);
        else
            (this.eof = !0),
                (this.tokenIndex = this.tokenCount),
                (this.tokenType = Yl),
                (this.tokenStart = this.tokenEnd = this.source.length);
    }
    skipSC() {
        while (this.tokenType === Y || this.tokenType === U) this.next();
    }
    skipUntilBalanced(l, i) {
        let t = l,
            r = 0,
            n = 0;
        l: for (; t < this.tokenCount; t++) {
            if (((r = this.balance[t]), r < l)) break l;
            switch (
                ((n = t > 0 ? this.offsetAndType[t - 1] & yl : this.firstCharOffset),
                i(this.source.charCodeAt(n)))
            ) {
                case 1:
                    break l;
                case 2:
                    t++;
                    break l;
                default:
                    if (J0(this.offsetAndType[t] >> Al)) t = r;
            }
        }
        this.skip(t - this.tokenIndex);
    }
    forEachToken(l) {
        for (let i = 0, t = this.firstCharOffset; i < this.tokenCount; i++) {
            let r = t,
                n = this.offsetAndType[i],
                o = n & yl,
                b = n >> Al;
            (t = o), l(b, r, o, i);
        }
    }
    dump() {
        let l = new Array(this.tokenCount);
        return (
            this.forEachToken((i, t, r, n) => {
                l[n] = {
                    idx: n,
                    type: Bi[i],
                    chunk: this.source.substring(t, r),
                    balance: this.balance[n],
                };
            }),
            l
        );
    }
}
function bi(l, i) {
    function t(c) {
        return c < g ? l.charCodeAt(c) : 0;
    }
    function r() {
        if (((f = xi(l, f)), Gi(t(f), t(f + 1), t(f + 2)))) {
            (h = j), (f = zt(l, f));
            return;
        }
        if (t(f) === 37) {
            (h = A), f++;
            return;
        }
        h = v;
    }
    function n() {
        let c = f;
        if (((f = zt(l, f)), Tl(l, c, f, 'url') && t(f) === 40)) {
            if (((f = ut(l, f + 1)), t(f) === 34 || t(f) === 39)) {
                (h = _), (f = c + 4);
                return;
            }
            b();
            return;
        }
        if (t(f) === 40) {
            (h = _), f++;
            return;
        }
        h = w;
    }
    function o(c) {
        if (!c) c = t(f++);
        h = gl;
        for (; f < l.length; f++) {
            let m = l.charCodeAt(f);
            switch (tr(m)) {
                case c:
                    f++;
                    return;
                case pt:
                    if (wt(m)) {
                        (f += rr(l, f, m)), (h = Ei);
                        return;
                    }
                    break;
                case 92:
                    if (f === l.length - 1) break;
                    let u = t(f + 1);
                    if (wt(u)) f += rr(l, f + 1, u);
                    else if (Ol(m, u)) f = Ml(l, f) - 1;
                    break;
            }
        }
    }
    function b() {
        (h = il), (f = ut(l, f));
        for (; f < l.length; f++) {
            let c = l.charCodeAt(f);
            switch (tr(c)) {
                case 41:
                    f++;
                    return;
                case pt:
                    if (((f = ut(l, f)), t(f) === 41 || f >= l.length)) {
                        if (f < l.length) f++;
                        return;
                    }
                    (f = nr(l, f)), (h = wl);
                    return;
                case 34:
                case 39:
                case 40:
                case Ir:
                    (f = nr(l, f)), (h = wl);
                    return;
                case 92:
                    if (Ol(c, t(f + 1))) {
                        f = Ml(l, f) - 1;
                        break;
                    }
                    (f = nr(l, f)), (h = wl);
                    return;
            }
        }
    }
    l = String(l || '');
    let g = l.length,
        e = lr(t(0)),
        f = e,
        h;
    while (f < g) {
        let c = l.charCodeAt(f);
        switch (tr(c)) {
            case pt:
                (h = Y), (f = ut(l, f + 1));
                break;
            case 34:
                o();
                break;
            case 35:
                if (mt(t(f + 1)) || Ol(t(f + 1), t(f + 2))) (h = R), (f = zt(l, f + 1));
                else (h = $), f++;
                break;
            case 39:
                o();
                break;
            case 40:
                (h = s), f++;
                break;
            case 41:
                (h = a), f++;
                break;
            case 43:
                if (dt(c, t(f + 1), t(f + 2))) r();
                else (h = $), f++;
                break;
            case 44:
                (h = d), f++;
                break;
            case 45:
                if (dt(c, t(f + 1), t(f + 2))) r();
                else if (t(f + 1) === 45 && t(f + 2) === 62) (h = cl), (f = f + 3);
                else if (Gi(c, t(f + 1), t(f + 2))) n();
                else (h = $), f++;
                break;
            case 46:
                if (dt(c, t(f + 1), t(f + 2))) r();
                else (h = $), f++;
                break;
            case 47:
                if (t(f + 1) === 42)
                    (h = U), (f = l.indexOf('*/', f + 2)), (f = f === -1 ? l.length : f + 2);
                else (h = $), f++;
                break;
            case 58:
                (h = P), f++;
                break;
            case 59:
                (h = Z), f++;
                break;
            case 60:
                if (t(f + 1) === 33 && t(f + 2) === 45 && t(f + 3) === 45) (h = Pl), (f = f + 4);
                else (h = $), f++;
                break;
            case 64:
                if (Gi(t(f + 1), t(f + 2), t(f + 3))) (h = S), (f = zt(l, f + 1));
                else (h = $), f++;
                break;
            case 91:
                (h = el), f++;
                break;
            case 92:
                if (Ol(c, t(f + 1))) n();
                else (h = $), f++;
                break;
            case 93:
                (h = pl), f++;
                break;
            case 123:
                (h = N), f++;
                break;
            case 125:
                (h = ml), f++;
                break;
            case Pr:
                r();
                break;
            case ir:
                n();
                break;
            default:
                (h = $), f++;
        }
        i(h, e, (e = f));
    }
}
var Fi = null;
class ll {
    static createItem(l) {
        return { prev: null, next: null, data: l };
    }
    constructor() {
        (this.head = null), (this.tail = null), (this.cursor = null);
    }
    createItem(l) {
        return ll.createItem(l);
    }
    allocateCursor(l, i) {
        let t;
        if (Fi !== null)
            (t = Fi), (Fi = Fi.cursor), (t.prev = l), (t.next = i), (t.cursor = this.cursor);
        else t = { prev: l, next: i, cursor: this.cursor };
        return (this.cursor = t), t;
    }
    releaseCursor() {
        let { cursor: l } = this;
        (this.cursor = l.cursor), (l.prev = null), (l.next = null), (l.cursor = Fi), (Fi = l);
    }
    updateCursors(l, i, t, r) {
        let { cursor: n } = this;
        while (n !== null) {
            if (n.prev === l) n.prev = i;
            if (n.next === t) n.next = r;
            n = n.cursor;
        }
    }
    *[Symbol.iterator]() {
        for (let l = this.head; l !== null; l = l.next) yield l.data;
    }
    get size() {
        let l = 0;
        for (let i = this.head; i !== null; i = i.next) l++;
        return l;
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
    fromArray(l) {
        let i = null;
        this.head = null;
        for (let t of l) {
            let r = ll.createItem(t);
            if (i !== null) i.next = r;
            else this.head = r;
            (r.prev = i), (i = r);
        }
        return (this.tail = i), this;
    }
    toArray() {
        return [...this];
    }
    toJSON() {
        return [...this];
    }
    forEach(l, i = this) {
        let t = this.allocateCursor(null, this.head);
        while (t.next !== null) {
            let r = t.next;
            (t.next = r.next), l.call(i, r.data, r, this);
        }
        this.releaseCursor();
    }
    forEachRight(l, i = this) {
        let t = this.allocateCursor(this.tail, null);
        while (t.prev !== null) {
            let r = t.prev;
            (t.prev = r.prev), l.call(i, r.data, r, this);
        }
        this.releaseCursor();
    }
    reduce(l, i, t = this) {
        let r = this.allocateCursor(null, this.head),
            n = i,
            o;
        while (r.next !== null)
            (o = r.next), (r.next = o.next), (n = l.call(t, n, o.data, o, this));
        return this.releaseCursor(), n;
    }
    reduceRight(l, i, t = this) {
        let r = this.allocateCursor(this.tail, null),
            n = i,
            o;
        while (r.prev !== null)
            (o = r.prev), (r.prev = o.prev), (n = l.call(t, n, o.data, o, this));
        return this.releaseCursor(), n;
    }
    some(l, i = this) {
        for (let t = this.head; t !== null; t = t.next) if (l.call(i, t.data, t, this)) return !0;
        return !1;
    }
    map(l, i = this) {
        let t = new ll();
        for (let r = this.head; r !== null; r = r.next) t.appendData(l.call(i, r.data, r, this));
        return t;
    }
    filter(l, i = this) {
        let t = new ll();
        for (let r = this.head; r !== null; r = r.next)
            if (l.call(i, r.data, r, this)) t.appendData(r.data);
        return t;
    }
    nextUntil(l, i, t = this) {
        if (l === null) return;
        let r = this.allocateCursor(null, l);
        while (r.next !== null) {
            let n = r.next;
            if (((r.next = n.next), i.call(t, n.data, n, this))) break;
        }
        this.releaseCursor();
    }
    prevUntil(l, i, t = this) {
        if (l === null) return;
        let r = this.allocateCursor(l, null);
        while (r.prev !== null) {
            let n = r.prev;
            if (((r.prev = n.prev), i.call(t, n.data, n, this))) break;
        }
        this.releaseCursor();
    }
    clear() {
        (this.head = null), (this.tail = null);
    }
    copy() {
        let l = new ll();
        for (let i of this) l.appendData(i);
        return l;
    }
    prepend(l) {
        if ((this.updateCursors(null, l, this.head, l), this.head !== null))
            (this.head.prev = l), (l.next = this.head);
        else this.tail = l;
        return (this.head = l), this;
    }
    prependData(l) {
        return this.prepend(ll.createItem(l));
    }
    append(l) {
        return this.insert(l);
    }
    appendData(l) {
        return this.insert(ll.createItem(l));
    }
    insert(l, i = null) {
        if (i !== null)
            if ((this.updateCursors(i.prev, l, i, l), i.prev === null)) {
                if (this.head !== i) throw new Error("before doesn't belong to list");
                (this.head = l), (i.prev = l), (l.next = i), this.updateCursors(null, l);
            } else (i.prev.next = l), (l.prev = i.prev), (i.prev = l), (l.next = i);
        else {
            if ((this.updateCursors(this.tail, l, null, l), this.tail !== null))
                (this.tail.next = l), (l.prev = this.tail);
            else this.head = l;
            this.tail = l;
        }
        return this;
    }
    insertData(l, i) {
        return this.insert(ll.createItem(l), i);
    }
    remove(l) {
        if ((this.updateCursors(l, l.prev, l, l.next), l.prev !== null)) l.prev.next = l.next;
        else {
            if (this.head !== l) throw new Error("item doesn't belong to list");
            this.head = l.next;
        }
        if (l.next !== null) l.next.prev = l.prev;
        else {
            if (this.tail !== l) throw new Error("item doesn't belong to list");
            this.tail = l.prev;
        }
        return (l.prev = null), (l.next = null), l;
    }
    push(l) {
        this.insert(ll.createItem(l));
    }
    pop() {
        return this.tail !== null ? this.remove(this.tail) : null;
    }
    unshift(l) {
        this.prepend(ll.createItem(l));
    }
    shift() {
        return this.head !== null ? this.remove(this.head) : null;
    }
    prependList(l) {
        return this.insertList(l, this.head);
    }
    appendList(l) {
        return this.insertList(l);
    }
    insertList(l, i) {
        if (l.head === null) return this;
        if (i !== void 0 && i !== null) {
            if ((this.updateCursors(i.prev, l.tail, i, l.head), i.prev !== null))
                (i.prev.next = l.head), (l.head.prev = i.prev);
            else this.head = l.head;
            (i.prev = l.tail), (l.tail.next = i);
        } else {
            if ((this.updateCursors(this.tail, l.tail, null, l.head), this.tail !== null))
                (this.tail.next = l.head), (l.head.prev = this.tail);
            else this.head = l.head;
            this.tail = l.tail;
        }
        return (l.head = null), (l.tail = null), this;
    }
    replace(l, i) {
        if ('head' in i) this.insertList(i, l);
        else this.insert(i, l);
        this.remove(l);
    }
}
function _i(l, i) {
    let t = Object.create(SyntaxError.prototype),
        r = new Error();
    return Object.assign(t, {
        name: l,
        message: i,
        get stack() {
            return (r.stack || '').replace(
                /^(.+\n){1,3}/,
                `${l}: ${i}
`,
            );
        },
    });
}
var Zr = 100,
    X0 = 60,
    W0 = '    ';
function j0({ source: l, line: i, column: t, baseLine: r, baseColumn: n }, o) {
    function b(X, I) {
        return f.slice(X, I).map((F, q) => String(X + q + 1).padStart(m) + ' |' + F).join(`
`);
    }
    let g = `
`.repeat(Math.max(r - 1, 0)),
        e = ' '.repeat(Math.max(n - 1, 0)),
        f = (g + e + l).split(/\r\n?|\n|\f/),
        h = Math.max(1, i - o) - 1,
        c = Math.min(i + o, f.length + 1),
        m = Math.max(4, String(c).length) + 1,
        u = 0;
    if (((t += (W0.length - 1) * (f[i - 1].substr(0, t - 1).match(/\t/g) || []).length), t > Zr))
        (u = t - X0 + 3), (t = X0 - 2);
    for (let X = h; X <= c; X++)
        if (X >= 0 && X < f.length)
            (f[X] = f[X].replace(/\t/g, W0)),
                (f[X] =
                    (u > 0 && f[X].length > u ? '…' : '') +
                    f[X].substr(u, Zr - 2) +
                    (f[X].length > u + Zr - 1 ? '…' : ''));
    return [b(h, i), new Array(t + m + 2).join('-') + '^', b(i, c)]
        .filter(Boolean)
        .join(
            `
`,
        )
        .replace(/^(\s+\d+\s+\|\n)+/, '')
        .replace(/\n(\s+\d+\s+\|)+$/, '');
}
function dr(l, i, t, r, n, o = 1, b = 1) {
    return Object.assign(_i('SyntaxError', l), {
        source: i,
        offset: t,
        line: r,
        column: n,
        sourceFragment(e) {
            return j0(
                { source: i, line: r, column: n, baseLine: o, baseColumn: b },
                isNaN(e) ? 0 : e,
            );
        },
        get formattedMessage() {
            return (
                `Parse error: ${l}
` + j0({ source: i, line: r, column: n, baseLine: o, baseColumn: b }, 2)
            );
        },
    });
}
function s0(l) {
    let i = this.createList(),
        t = !1,
        r = { recognizer: l };
    while (!this.eof) {
        switch (this.tokenType) {
            case U:
                this.next();
                continue;
            case Y:
                (t = !0), this.next();
                continue;
        }
        let n = l.getNode.call(this, r);
        if (n === void 0) break;
        if (t) {
            if (l.onWhiteSpace) l.onWhiteSpace.call(this, n, i, r);
            t = !1;
        }
        i.push(n);
    }
    if (t && l.onWhiteSpace) l.onWhiteSpace.call(this, null, i, r);
    return i;
}
var Y0 = () => {},
    Dm = 33,
    $m = 35,
    ln = 59,
    Q0 = 123,
    E0 = 0;
function qm(l) {
    return function () {
        return this[l]();
    };
}
function tn(l) {
    let i = Object.create(null);
    for (let t of Object.keys(l)) {
        let r = l[t],
            n = r.parse || r;
        if (n) i[t] = n;
    }
    return i;
}
function Jm(l) {
    let i = {
        context: Object.create(null),
        features: Object.assign(Object.create(null), l.features),
        scope: Object.assign(Object.create(null), l.scope),
        atrule: tn(l.atrule),
        pseudo: tn(l.pseudo),
        node: tn(l.node),
    };
    for (let [t, r] of Object.entries(l.parseContext))
        switch (typeof r) {
            case 'function':
                i.context[t] = r;
                break;
            case 'string':
                i.context[t] = qm(r);
                break;
        }
    return { config: i, ...i, ...i.node };
}
function G0(l) {
    let i = '',
        t = '<unknown>',
        r = !1,
        n = Y0,
        o = !1,
        b = new or(),
        g = Object.assign(new br(), Jm(l || {}), {
            parseAtrulePrelude: !0,
            parseRulePrelude: !0,
            parseValue: !0,
            parseCustomProperty: !1,
            readSequence: s0,
            consumeUntilBalanceEnd: () => 0,
            consumeUntilLeftCurlyBracket(f) {
                return f === Q0 ? 1 : 0;
            },
            consumeUntilLeftCurlyBracketOrSemicolon(f) {
                return f === Q0 || f === ln ? 1 : 0;
            },
            consumeUntilExclamationMarkOrSemicolon(f) {
                return f === Dm || f === ln ? 1 : 0;
            },
            consumeUntilSemicolonIncluded(f) {
                return f === ln ? 2 : 0;
            },
            createList() {
                return new ll();
            },
            createSingleNodeList(f) {
                return new ll().appendData(f);
            },
            getFirstListNode(f) {
                return f && f.first;
            },
            getLastListNode(f) {
                return f && f.last;
            },
            parseWithFallback(f, h) {
                let c = this.tokenIndex;
                try {
                    return f.call(this);
                } catch (m) {
                    if (o) throw m;
                    this.skip(c - this.tokenIndex);
                    let u = h.call(this);
                    return (o = !0), n(m, u), (o = !1), u;
                }
            },
            lookupNonWSType(f) {
                let h;
                do if (((h = this.lookupType(f++)), h !== Y && h !== U)) return h;
                while (h !== E0);
                return E0;
            },
            charCodeAt(f) {
                return f >= 0 && f < i.length ? i.charCodeAt(f) : 0;
            },
            substring(f, h) {
                return i.substring(f, h);
            },
            substrToCursor(f) {
                return this.source.substring(f, this.tokenStart);
            },
            cmpChar(f, h) {
                return Il(i, f, h);
            },
            cmpStr(f, h, c) {
                return Tl(i, f, h, c);
            },
            consume(f) {
                let h = this.tokenStart;
                return this.eat(f), this.substrToCursor(h);
            },
            consumeFunctionName() {
                let f = i.substring(this.tokenStart, this.tokenEnd - 1);
                return this.eat(_), f;
            },
            consumeNumber(f) {
                let h = i.substring(this.tokenStart, xi(i, this.tokenStart));
                return this.eat(f), h;
            },
            eat(f) {
                if (this.tokenType !== f) {
                    let h = Bi[f]
                            .slice(0, -6)
                            .replace(/-/g, ' ')
                            .replace(/^./, (u) => u.toUpperCase()),
                        c = `${/[[\](){}]/.test(h) ? `"${h}"` : h} is expected`,
                        m = this.tokenStart;
                    switch (f) {
                        case w:
                            if (this.tokenType === _ || this.tokenType === il)
                                (m = this.tokenEnd - 1),
                                    (c = 'Identifier is expected but function found');
                            else c = 'Identifier is expected';
                            break;
                        case R:
                            if (this.isDelim($m)) this.next(), m++, (c = 'Name is expected');
                            break;
                        case A:
                            if (this.tokenType === v)
                                (m = this.tokenEnd), (c = 'Percent sign is expected');
                            break;
                    }
                    this.error(c, m);
                }
                this.next();
            },
            eatIdent(f) {
                if (this.tokenType !== w || this.lookupValue(0, f) === !1)
                    this.error(`Identifier "${f}" is expected`);
                this.next();
            },
            eatDelim(f) {
                if (!this.isDelim(f)) this.error(`Delim "${String.fromCharCode(f)}" is expected`);
                this.next();
            },
            getLocation(f, h) {
                if (r) return b.getLocationRange(f, h, t);
                return null;
            },
            getLocationFromList(f) {
                if (r) {
                    let h = this.getFirstListNode(f),
                        c = this.getLastListNode(f);
                    return b.getLocationRange(
                        h !== null ? h.loc.start.offset - b.startOffset : this.tokenStart,
                        c !== null ? c.loc.end.offset - b.startOffset : this.tokenStart,
                        t,
                    );
                }
                return null;
            },
            error(f, h) {
                let c =
                    typeof h !== 'undefined' && h < i.length
                        ? b.getLocation(h)
                        : this.eof
                          ? b.getLocation(O0(i, i.length - 1))
                          : b.getLocation(this.tokenStart);
                throw new dr(
                    f || 'Unexpected input',
                    i,
                    c.offset,
                    c.line,
                    c.column,
                    b.startLine,
                    b.startColumn,
                );
            },
        });
    return Object.assign(
        function (f, h) {
            (i = f),
                (h = h || {}),
                g.setSource(i, bi),
                b.setSource(i, h.offset, h.line, h.column),
                (t = h.filename || '<unknown>'),
                (r = Boolean(h.positions)),
                (n = typeof h.onParseError === 'function' ? h.onParseError : Y0),
                (o = !1),
                (g.parseAtrulePrelude =
                    'parseAtrulePrelude' in h ? Boolean(h.parseAtrulePrelude) : !0),
                (g.parseRulePrelude = 'parseRulePrelude' in h ? Boolean(h.parseRulePrelude) : !0),
                (g.parseValue = 'parseValue' in h ? Boolean(h.parseValue) : !0),
                (g.parseCustomProperty =
                    'parseCustomProperty' in h ? Boolean(h.parseCustomProperty) : !1);
            let { context: c = 'default', onComment: m } = h;
            if (c in g.context === !1) throw new Error('Unknown context `' + c + '`');
            if (typeof m === 'function')
                g.forEachToken((X, I, F) => {
                    if (X === U) {
                        let q = g.getLocation(I, F),
                            V = Tl(i, F - 2, F, '*/') ? i.slice(I + 2, F - 2) : i.slice(I + 2, F);
                        m(V, q);
                    }
                });
            let u = g.context[c].call(g, h);
            if (!g.eof) g.error();
            return u;
        },
        { SyntaxError: dr, config: g.config },
    );
}
var _t = H0(),
    bl = fr(),
    er = S0().ArraySet,
    zw = C0().MappingList;
function jl(l) {
    if (!l) l = {};
    (this._file = bl.getArg(l, 'file', null)),
        (this._sourceRoot = bl.getArg(l, 'sourceRoot', null)),
        (this._skipValidation = bl.getArg(l, 'skipValidation', !1)),
        (this._ignoreInvalidMapping = bl.getArg(l, 'ignoreInvalidMapping', !1)),
        (this._sources = new er()),
        (this._names = new er()),
        (this._mappings = new zw()),
        (this._sourcesContents = null);
}
jl.prototype._version = 3;
jl.fromSourceMap = function l(i, t) {
    var r = i.sourceRoot,
        n = new jl(Object.assign(t || {}, { file: i.file, sourceRoot: r }));
    return (
        i.eachMapping(function (o) {
            var b = { generated: { line: o.generatedLine, column: o.generatedColumn } };
            if (o.source != null) {
                if (((b.source = o.source), r != null)) b.source = bl.relative(r, b.source);
                if (
                    ((b.original = { line: o.originalLine, column: o.originalColumn }),
                    o.name != null)
                )
                    b.name = o.name;
            }
            n.addMapping(b);
        }),
        i.sources.forEach(function (o) {
            var b = o;
            if (r !== null) b = bl.relative(r, o);
            if (!n._sources.has(b)) n._sources.add(b);
            var g = i.sourceContentFor(o);
            if (g != null) n.setSourceContent(o, g);
        }),
        n
    );
};
jl.prototype.addMapping = function l(i) {
    var t = bl.getArg(i, 'generated'),
        r = bl.getArg(i, 'original', null),
        n = bl.getArg(i, 'source', null),
        o = bl.getArg(i, 'name', null);
    if (!this._skipValidation) {
        if (this._validateMapping(t, r, n, o) === !1) return;
    }
    if (n != null) {
        if (((n = String(n)), !this._sources.has(n))) this._sources.add(n);
    }
    if (o != null) {
        if (((o = String(o)), !this._names.has(o))) this._names.add(o);
    }
    this._mappings.add({
        generatedLine: t.line,
        generatedColumn: t.column,
        originalLine: r != null && r.line,
        originalColumn: r != null && r.column,
        source: n,
        name: o,
    });
};
jl.prototype.setSourceContent = function l(i, t) {
    var r = i;
    if (this._sourceRoot != null) r = bl.relative(this._sourceRoot, r);
    if (t != null) {
        if (!this._sourcesContents) this._sourcesContents = Object.create(null);
        this._sourcesContents[bl.toSetString(r)] = t;
    } else if (this._sourcesContents) {
        if (
            (delete this._sourcesContents[bl.toSetString(r)],
            Object.keys(this._sourcesContents).length === 0)
        )
            this._sourcesContents = null;
    }
};
jl.prototype.applySourceMap = function l(i, t, r) {
    var n = t;
    if (t == null) {
        if (i.file == null)
            throw new Error(
                `SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, or the source map's "file" property. Both were omitted.`,
            );
        n = i.file;
    }
    var o = this._sourceRoot;
    if (o != null) n = bl.relative(o, n);
    var b = new er(),
        g = new er();
    this._mappings.unsortedForEach(function (e) {
        if (e.source === n && e.originalLine != null) {
            var f = i.originalPositionFor({ line: e.originalLine, column: e.originalColumn });
            if (f.source != null) {
                if (((e.source = f.source), r != null)) e.source = bl.join(r, e.source);
                if (o != null) e.source = bl.relative(o, e.source);
                if (((e.originalLine = f.line), (e.originalColumn = f.column), f.name != null))
                    e.name = f.name;
            }
        }
        var h = e.source;
        if (h != null && !b.has(h)) b.add(h);
        var c = e.name;
        if (c != null && !g.has(c)) g.add(c);
    }, this),
        (this._sources = b),
        (this._names = g),
        i.sources.forEach(function (e) {
            var f = i.sourceContentFor(e);
            if (f != null) {
                if (r != null) e = bl.join(r, e);
                if (o != null) e = bl.relative(o, e);
                this.setSourceContent(e, f);
            }
        }, this);
};
jl.prototype._validateMapping = function l(i, t, r, n) {
    if (t && typeof t.line !== 'number' && typeof t.column !== 'number') {
        var o =
            'original.line and original.column are not numbers -- you probably meant to omit the original mapping entirely and only map the generated position. If so, pass null for the original mapping instead of an object with empty or null values.';
        if (this._ignoreInvalidMapping) {
            if (typeof console !== 'undefined' && console.warn) console.warn(o);
            return !1;
        } else throw new Error(o);
    }
    if (i && 'line' in i && 'column' in i && i.line > 0 && i.column >= 0 && !t && !r && !n) return;
    else if (
        i &&
        'line' in i &&
        'column' in i &&
        t &&
        'line' in t &&
        'column' in t &&
        i.line > 0 &&
        i.column >= 0 &&
        t.line > 0 &&
        t.column >= 0 &&
        r
    )
        return;
    else {
        var o =
            'Invalid mapping: ' + JSON.stringify({ generated: i, source: r, original: t, name: n });
        if (this._ignoreInvalidMapping) {
            if (typeof console !== 'undefined' && console.warn) console.warn(o);
            return !1;
        } else throw new Error(o);
    }
};
jl.prototype._serializeMappings = function l() {
    var i = 0,
        t = 1,
        r = 0,
        n = 0,
        o = 0,
        b = 0,
        g = '',
        e,
        f,
        h,
        c,
        m = this._mappings.toArray();
    for (var u = 0, X = m.length; u < X; u++) {
        if (((f = m[u]), (e = ''), f.generatedLine !== t)) {
            i = 0;
            while (f.generatedLine !== t) (e += ';'), t++;
        } else if (u > 0) {
            if (!bl.compareByGeneratedPositionsInflated(f, m[u - 1])) continue;
            e += ',';
        }
        if (((e += _t.encode(f.generatedColumn - i)), (i = f.generatedColumn), f.source != null)) {
            if (
                ((c = this._sources.indexOf(f.source)),
                (e += _t.encode(c - b)),
                (b = c),
                (e += _t.encode(f.originalLine - 1 - n)),
                (n = f.originalLine - 1),
                (e += _t.encode(f.originalColumn - r)),
                (r = f.originalColumn),
                f.name != null)
            )
                (h = this._names.indexOf(f.name)), (e += _t.encode(h - o)), (o = h);
        }
        g += e;
    }
    return g;
};
jl.prototype._generateSourcesContent = function l(i, t) {
    return i.map(function (r) {
        if (!this._sourcesContents) return null;
        if (t != null) r = bl.relative(t, r);
        var n = bl.toSetString(r);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents, n)
            ? this._sourcesContents[n]
            : null;
    }, this);
};
jl.prototype.toJSON = function l() {
    var i = {
        version: this._version,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings(),
    };
    if (this._file != null) i.file = this._file;
    if (this._sourceRoot != null) i.sourceRoot = this._sourceRoot;
    if (this._sourcesContents)
        i.sourcesContent = this._generateSourcesContent(i.sources, i.sourceRoot);
    return i;
};
jl.prototype.toString = function l() {
    return JSON.stringify(this.toJSON());
};
var fn = jl;
var P0 = new Set(['Atrule', 'Selector', 'Declaration']);
function I0(l) {
    let i = new fn(),
        t = { line: 1, column: 0 },
        r = { line: 0, column: 0 },
        n = { line: 1, column: 0 },
        o = { generated: n },
        b = 1,
        g = 0,
        e = !1,
        f = l.node;
    l.node = function (m) {
        if (m.loc && m.loc.start && P0.has(m.type)) {
            let u = m.loc.start.line,
                X = m.loc.start.column - 1;
            if (r.line !== u || r.column !== X) {
                if (((r.line = u), (r.column = X), (t.line = b), (t.column = g), e)) {
                    if (((e = !1), t.line !== n.line || t.column !== n.column)) i.addMapping(o);
                }
                (e = !0), i.addMapping({ source: m.loc.source, original: r, generated: t });
            }
        }
        if ((f.call(this, m), e && P0.has(m.type))) (n.line = b), (n.column = g);
    };
    let h = l.emit;
    l.emit = function (m, u, X) {
        for (let I = 0; I < m.length; I++)
            if (m.charCodeAt(I) === 10) b++, (g = 0);
            else g++;
        h(m, u, X);
    };
    let c = l.result;
    return (
        (l.result = function () {
            if (e) i.addMapping(o);
            return { css: c(), map: i };
        }),
        l
    );
}
var hr = {};
D(hr, { spec: () => vw, safe: () => en });
var xw = 43,
    aw = 45,
    gn = (l, i) => {
        if (l === $) l = i;
        if (typeof l === 'string') {
            let t = l.charCodeAt(0);
            return t > 127 ? 32768 : t << 8;
        }
        return l;
    },
    T0 = [
        [w, w],
        [w, _],
        [w, il],
        [w, wl],
        [w, '-'],
        [w, v],
        [w, A],
        [w, j],
        [w, cl],
        [w, s],
        [S, w],
        [S, _],
        [S, il],
        [S, wl],
        [S, '-'],
        [S, v],
        [S, A],
        [S, j],
        [S, cl],
        [R, w],
        [R, _],
        [R, il],
        [R, wl],
        [R, '-'],
        [R, v],
        [R, A],
        [R, j],
        [R, cl],
        [j, w],
        [j, _],
        [j, il],
        [j, wl],
        [j, '-'],
        [j, v],
        [j, A],
        [j, j],
        [j, cl],
        ['#', w],
        ['#', _],
        ['#', il],
        ['#', wl],
        ['#', '-'],
        ['#', v],
        ['#', A],
        ['#', j],
        ['#', cl],
        ['-', w],
        ['-', _],
        ['-', il],
        ['-', wl],
        ['-', '-'],
        ['-', v],
        ['-', A],
        ['-', j],
        ['-', cl],
        [v, w],
        [v, _],
        [v, il],
        [v, wl],
        [v, v],
        [v, A],
        [v, j],
        [v, '%'],
        [v, cl],
        ['@', w],
        ['@', _],
        ['@', il],
        ['@', wl],
        ['@', '-'],
        ['@', cl],
        ['.', v],
        ['.', A],
        ['.', j],
        ['+', v],
        ['+', A],
        ['+', j],
        ['/', '*'],
    ],
    _w = T0.concat([
        [w, R],
        [j, R],
        [R, R],
        [S, s],
        [S, gl],
        [S, P],
        [A, A],
        [A, j],
        [A, _],
        [A, '-'],
        [a, w],
        [a, _],
        [a, A],
        [a, j],
        [a, R],
        [a, '-'],
    ]);
function Z0(l) {
    let i = new Set(l.map(([t, r]) => (gn(t) << 16) | gn(r)));
    return function (t, r, n) {
        let o = gn(r, n),
            b = n.charCodeAt(0);
        if (
            (b === aw && r !== w && r !== _ && r !== cl) || b === xw
                ? i.has((t << 16) | (b << 8))
                : i.has((t << 16) | o)
        )
            this.emit(' ', Y, !0);
        return o;
    };
}
var vw = Z0(T0),
    en = Z0(_w);
var Ow = 92;
function Dw(l, i) {
    if (typeof i === 'function') {
        let t = null;
        l.children.forEach((r) => {
            if (t !== null) i.call(this, t);
            this.node(r), (t = r);
        });
        return;
    }
    l.children.forEach(this.node, this);
}
function $w(l) {
    bi(l, (i, t, r) => {
        this.token(i, l.slice(t, r));
    });
}
function d0(l) {
    let i = new Map();
    for (let [t, r] of Object.entries(l.node))
        if (typeof (r.generate || r) === 'function') i.set(t, r.generate || r);
    return function (t, r) {
        let n = '',
            o = 0,
            b = {
                node(e) {
                    if (i.has(e.type)) i.get(e.type).call(g, e);
                    else throw new Error('Unknown node type: ' + e.type);
                },
                tokenBefore: en,
                token(e, f) {
                    if (
                        ((o = this.tokenBefore(o, e, f)),
                        this.emit(f, e, !1),
                        e === $ && f.charCodeAt(0) === Ow)
                    )
                        this.emit(
                            `
`,
                            Y,
                            !0,
                        );
                },
                emit(e) {
                    n += e;
                },
                result() {
                    return n;
                },
            };
        if (r) {
            if (typeof r.decorator === 'function') b = r.decorator(b);
            if (r.sourceMap) b = I0(b);
            if (r.mode in hr) b.tokenBefore = hr[r.mode];
        }
        let g = {
            node: (e) => b.node(e),
            children: Dw,
            token: (e, f) => b.token(e, f),
            tokenize: $w,
        };
        return b.node(t), b.result();
    };
}
function lg(l) {
    return {
        fromPlainObject(i) {
            return (
                l(i, {
                    enter(t) {
                        if (t.children && t.children instanceof ll === !1)
                            t.children = new ll().fromArray(t.children);
                    },
                }),
                i
            );
        },
        toPlainObject(i) {
            return (
                l(i, {
                    leave(t) {
                        if (t.children && t.children instanceof ll)
                            t.children = t.children.toArray();
                    },
                }),
                i
            );
        },
    };
}
var { hasOwnProperty: hn } = Object.prototype,
    vt = function () {};
function ig(l) {
    return typeof l === 'function' ? l : vt;
}
function tg(l, i) {
    return function (t, r, n) {
        if (t.type === i) l.call(this, t, r, n);
    };
}
function qw(l, i) {
    let t = i.structure,
        r = [];
    for (let n in t) {
        if (hn.call(t, n) === !1) continue;
        let o = t[n],
            b = { name: n, type: !1, nullable: !1 };
        if (!Array.isArray(o)) o = [o];
        for (let g of o)
            if (g === null) b.nullable = !0;
            else if (typeof g === 'string') b.type = 'node';
            else if (Array.isArray(g)) b.type = 'list';
        if (b.type) r.push(b);
    }
    if (r.length) return { context: i.walkContext, fields: r };
    return null;
}
function Jw(l) {
    let i = {};
    for (let t in l.node)
        if (hn.call(l.node, t)) {
            let r = l.node[t];
            if (!r.structure)
                throw new Error('Missed `structure` field in `' + t + '` node type definition');
            i[t] = qw(t, r);
        }
    return i;
}
function rg(l, i) {
    let t = l.fields.slice(),
        r = l.context,
        n = typeof r === 'string';
    if (i) t.reverse();
    return function (o, b, g, e) {
        let f;
        if (n) (f = b[r]), (b[r] = o);
        for (let h of t) {
            let c = o[h.name];
            if (!h.nullable || c) {
                if (h.type === 'list') {
                    if (i ? c.reduceRight(e, !1) : c.reduce(e, !1)) return !0;
                } else if (g(c)) return !0;
            }
        }
        if (n) b[r] = f;
    };
}
function ng({ StyleSheet: l, Atrule: i, Rule: t, Block: r, DeclarationList: n }) {
    return {
        Atrule: { StyleSheet: l, Atrule: i, Rule: t, Block: r },
        Rule: { StyleSheet: l, Atrule: i, Rule: t, Block: r },
        Declaration: { StyleSheet: l, Atrule: i, Rule: t, Block: r, DeclarationList: n },
    };
}
function og(l) {
    let i = Jw(l),
        t = {},
        r = {},
        n = Symbol('break-walk'),
        o = Symbol('skip-node');
    for (let f in i)
        if (hn.call(i, f) && i[f] !== null) (t[f] = rg(i[f], !1)), (r[f] = rg(i[f], !0));
    let b = ng(t),
        g = ng(r),
        e = function (f, h) {
            function c(q, V, fl) {
                let K = m.call(F, q, V, fl);
                if (K === n) return !0;
                if (K === o) return !1;
                if (X.hasOwnProperty(q.type)) {
                    if (X[q.type](q, F, c, I)) return !0;
                }
                if (u.call(F, q, V, fl) === n) return !0;
                return !1;
            }
            let m = vt,
                u = vt,
                X = t,
                I = (q, V, fl, K) => q || c(V, fl, K),
                F = {
                    break: n,
                    skip: o,
                    root: f,
                    stylesheet: null,
                    atrule: null,
                    atrulePrelude: null,
                    rule: null,
                    selector: null,
                    block: null,
                    declaration: null,
                    function: null,
                };
            if (typeof h === 'function') m = h;
            else if (h) {
                if (((m = ig(h.enter)), (u = ig(h.leave)), h.reverse)) X = r;
                if (h.visit) {
                    if (b.hasOwnProperty(h.visit)) X = h.reverse ? g[h.visit] : b[h.visit];
                    else if (!i.hasOwnProperty(h.visit))
                        throw new Error(
                            'Bad value `' +
                                h.visit +
                                '` for `visit` option (should be: ' +
                                Object.keys(i).sort().join(', ') +
                                ')',
                        );
                    (m = tg(m, h.visit)), (u = tg(u, h.visit));
                }
            }
            if (m === vt && u === vt)
                throw new Error(
                    "Neither `enter` nor `leave` walker handler is set or both aren't a function",
                );
            c(f);
        };
    return (
        (e.break = n),
        (e.skip = o),
        (e.find = function (f, h) {
            let c = null;
            return (
                e(f, function (m, u, X) {
                    if (h.call(this, m, u, X)) return (c = m), n;
                }),
                c
            );
        }),
        (e.findLast = function (f, h) {
            let c = null;
            return (
                e(f, {
                    reverse: !0,
                    enter(m, u, X) {
                        if (h.call(this, m, u, X)) return (c = m), n;
                    },
                }),
                c
            );
        }),
        (e.findAll = function (f, h) {
            let c = [];
            return (
                e(f, function (m, u, X) {
                    if (h.call(this, m, u, X)) c.push(m);
                }),
                c
            );
        }),
        e
    );
}
function Xw(l) {
    return l;
}
function Ww(l) {
    let { min: i, max: t, comma: r } = l;
    if (i === 0 && t === 0) return r ? '#?' : '*';
    if (i === 0 && t === 1) return '?';
    if (i === 1 && t === 0) return r ? '#' : '+';
    if (i === 1 && t === 1) return '';
    return (r ? '#' : '') + (i === t ? '{' + i + '}' : '{' + i + ',' + (t !== 0 ? t : '') + '}');
}
function jw(l) {
    switch (l.type) {
        case 'Range':
            return (
                ' [' + (l.min === null ? '-∞' : l.min) + ',' + (l.max === null ? '∞' : l.max) + ']'
            );
        default:
            throw new Error('Unknown node type `' + l.type + '`');
    }
}
function sw(l, i, t, r) {
    let n = l.combinator === ' ' || r ? l.combinator : ' ' + l.combinator + ' ',
        o = l.terms.map((b) => cr(b, i, t, r)).join(n);
    if (l.explicit || t) return (r || o[0] === ',' ? '[' : '[ ') + o + (r ? ']' : ' ]');
    return o;
}
function cr(l, i, t, r) {
    let n;
    switch (l.type) {
        case 'Group':
            n = sw(l, i, t, r) + (l.disallowEmpty ? '!' : '');
            break;
        case 'Multiplier':
            return cr(l.term, i, t, r) + i(Ww(l), l);
        case 'Boolean':
            n = '<boolean-expr[' + cr(l.term, i, t, r) + ']>';
            break;
        case 'Type':
            n = '<' + l.name + (l.opts ? i(jw(l.opts), l.opts) : '') + '>';
            break;
        case 'Property':
            n = "<'" + l.name + "'>";
            break;
        case 'Keyword':
            n = l.name;
            break;
        case 'AtKeyword':
            n = '@' + l.name;
            break;
        case 'Function':
            n = l.name + '(';
            break;
        case 'String':
        case 'Token':
            n = l.value;
            break;
        case 'Comma':
            n = ',';
            break;
        default:
            throw new Error('Unknown node type `' + l.type + '`');
    }
    return i(n, l);
}
function Ki(l, i) {
    let t = Xw,
        r = !1,
        n = !1;
    if (typeof i === 'function') t = i;
    else if (i) {
        if (
            ((r = Boolean(i.forceBraces)),
            (n = Boolean(i.compact)),
            typeof i.decorate === 'function')
        )
            t = i.decorate;
    }
    return cr(l, t, r, n);
}
var bg = { offset: 0, line: 1, column: 1 };
function Yw(l, i) {
    let { tokens: t, longestMatch: r } = l,
        n = r < t.length ? t[r].node || null : null,
        o = n !== i ? n : null,
        b = 0,
        g = 0,
        e = 0,
        f = '',
        h,
        c;
    for (let m = 0; m < t.length; m++) {
        let u = t[m].value;
        if (m === r) (g = u.length), (b = f.length);
        if (o !== null && t[m].node === o)
            if (m <= r) e++;
            else e = 0;
        f += u;
    }
    if (r === t.length || e > 1) (h = mr(o || i, 'end') || Ot(bg, f)), (c = Ot(h));
    else
        (h = mr(o, 'start') || Ot(mr(i, 'start') || bg, f.slice(0, b))),
            (c = mr(o, 'end') || Ot(h, f.substr(b, g)));
    return { css: f, mismatchOffset: b, mismatchLength: g, start: h, end: c };
}
function mr(l, i) {
    let t = l && l.loc && l.loc[i];
    if (t) return 'line' in t ? Ot(t) : t;
    return null;
}
function Ot({ offset: l, line: i, column: t }, r) {
    let n = { offset: l, line: i, column: t };
    if (r) {
        let o = r.split(/\n|\r\n?|\f/);
        (n.offset += r.length),
            (n.line += o.length - 1),
            (n.column = o.length === 1 ? n.column + r.length : o.pop().length + 1);
    }
    return n;
}
var Hi = function (l, i) {
        let t = _i('SyntaxReferenceError', l + (i ? ' `' + i + '`' : ''));
        return (t.reference = i), t;
    },
    fg = function (l, i, t, r) {
        let n = _i('SyntaxMatchError', l),
            { css: o, mismatchOffset: b, mismatchLength: g, start: e, end: f } = Yw(r, t);
        return (
            (n.rawMessage = l),
            (n.syntax = i ? Ki(i) : '<generic>'),
            (n.css = o),
            (n.mismatchOffset = b),
            (n.mismatchLength = g),
            (n.message =
                l +
                `
  syntax: ` +
                n.syntax +
                `
   value: ` +
                (o || '<empty string>') +
                `
  --------` +
                new Array(n.mismatchOffset + 1).join('-') +
                '^'),
            Object.assign(n, e),
            (n.loc = { source: (t && t.loc && t.loc.source) || '<unknown>', start: e, end: f }),
            n
        );
    };
var wr = new Map(),
    Mi = new Map();
var pr = Qw,
    cn = Ew;
function ur(l, i) {
    return (i = i || 0), l.length - i >= 2 && l.charCodeAt(i) === 45 && l.charCodeAt(i + 1) === 45;
}
function gg(l, i) {
    if (((i = i || 0), l.length - i >= 3)) {
        if (l.charCodeAt(i) === 45 && l.charCodeAt(i + 1) !== 45) {
            let t = l.indexOf('-', i + 2);
            if (t !== -1) return l.substring(i, t + 1);
        }
    }
    return '';
}
function Qw(l) {
    if (wr.has(l)) return wr.get(l);
    let i = l.toLowerCase(),
        t = wr.get(i);
    if (t === void 0) {
        let r = ur(i, 0),
            n = !r ? gg(i, 0) : '';
        t = Object.freeze({
            basename: i.substr(n.length),
            name: i,
            prefix: n,
            vendor: n,
            custom: r,
        });
    }
    return wr.set(l, t), t;
}
function Ew(l) {
    if (Mi.has(l)) return Mi.get(l);
    let i = l,
        t = l[0];
    if (t === '/') t = l[1] === '/' ? '//' : '/';
    else if (t !== '_' && t !== '*' && t !== '$' && t !== '#' && t !== '+' && t !== '&') t = '';
    let r = ur(i, t.length);
    if (!r) {
        if (((i = i.toLowerCase()), Mi.has(i))) {
            let g = Mi.get(i);
            return Mi.set(l, g), g;
        }
    }
    let n = !r ? gg(i, t.length) : '',
        o = i.substr(0, t.length + n.length),
        b = Object.freeze({
            basename: i.substr(o.length),
            name: i.substr(t.length),
            hack: t,
            vendor: n,
            prefix: o,
            custom: r,
        });
    return Mi.set(l, b), b;
}
var yi = ['initial', 'inherit', 'unset', 'revert', 'revert-layer'];
var $t = 43,
    Ul = 45,
    mn = 110,
    Ai = !0,
    Lw = !1;
function pn(l, i) {
    return l !== null && l.type === $ && l.value.charCodeAt(0) === i;
}
function Dt(l, i, t) {
    while (l !== null && (l.type === Y || l.type === U)) l = t(++i);
    return i;
}
function fi(l, i, t, r) {
    if (!l) return 0;
    let n = l.value.charCodeAt(i);
    if (n === $t || n === Ul) {
        if (t) return 0;
        i++;
    }
    for (; i < l.value.length; i++) if (!ol(l.value.charCodeAt(i))) return 0;
    return r + 1;
}
function wn(l, i, t) {
    let r = !1,
        n = Dt(l, i, t);
    if (((l = t(n)), l === null)) return i;
    if (l.type !== v)
        if (pn(l, $t) || pn(l, Ul)) {
            if (((r = !0), (n = Dt(t(++n), n, t)), (l = t(n)), l === null || l.type !== v))
                return 0;
        } else return i;
    if (!r) {
        let o = l.value.charCodeAt(0);
        if (o !== $t && o !== Ul) return 0;
    }
    return fi(l, r ? 0 : 1, r, n);
}
function un(l, i) {
    let t = 0;
    if (!l) return 0;
    if (l.type === v) return fi(l, 0, Lw, t);
    else if (l.type === w && l.value.charCodeAt(0) === Ul) {
        if (!Il(l.value, 1, mn)) return 0;
        switch (l.value.length) {
            case 2:
                return wn(i(++t), t, i);
            case 3:
                if (l.value.charCodeAt(2) !== Ul) return 0;
                return (t = Dt(i(++t), t, i)), (l = i(t)), fi(l, 0, Ai, t);
            default:
                if (l.value.charCodeAt(2) !== Ul) return 0;
                return fi(l, 3, Ai, t);
        }
    } else if (l.type === w || (pn(l, $t) && i(t + 1).type === w)) {
        if (l.type !== w) l = i(++t);
        if (l === null || !Il(l.value, 0, mn)) return 0;
        switch (l.value.length) {
            case 1:
                return wn(i(++t), t, i);
            case 2:
                if (l.value.charCodeAt(1) !== Ul) return 0;
                return (t = Dt(i(++t), t, i)), (l = i(t)), fi(l, 0, Ai, t);
            default:
                if (l.value.charCodeAt(1) !== Ul) return 0;
                return fi(l, 2, Ai, t);
        }
    } else if (l.type === j) {
        let r = l.value.charCodeAt(0),
            n = r === $t || r === Ul ? 1 : 0,
            o = n;
        for (; o < l.value.length; o++) if (!ol(l.value.charCodeAt(o))) break;
        if (o === n) return 0;
        if (!Il(l.value, o, mn)) return 0;
        if (o + 1 === l.value.length) return wn(i(++t), t, i);
        else {
            if (l.value.charCodeAt(o + 1) !== Ul) return 0;
            if (o + 2 === l.value.length)
                return (t = Dt(i(++t), t, i)), (l = i(t)), fi(l, 0, Ai, t);
            else return fi(l, o + 2, Ai, t);
        }
    }
    return 0;
}
var Bw = 43,
    eg = 45,
    hg = 63,
    Rw = 117;
function zn(l, i) {
    return l !== null && l.type === $ && l.value.charCodeAt(0) === i;
}
function Fw(l, i) {
    return l.value.charCodeAt(0) === i;
}
function qt(l, i, t) {
    let r = 0;
    for (let n = i; n < l.value.length; n++) {
        let o = l.value.charCodeAt(n);
        if (o === eg && t && r !== 0) return qt(l, i + r + 1, !1), 6;
        if (!Dl(o)) return 0;
        if (++r > 6) return 0;
    }
    return r;
}
function zr(l, i, t) {
    if (!l) return 0;
    while (zn(t(i), hg)) {
        if (++l > 6) return 0;
        i++;
    }
    return i;
}
function xn(l, i) {
    let t = 0;
    if (l === null || l.type !== w || !Il(l.value, 0, Rw)) return 0;
    if (((l = i(++t)), l === null)) return 0;
    if (zn(l, Bw)) {
        if (((l = i(++t)), l === null)) return 0;
        if (l.type === w) return zr(qt(l, 0, !0), ++t, i);
        if (zn(l, hg)) return zr(1, ++t, i);
        return 0;
    }
    if (l.type === v) {
        let r = qt(l, 1, !0);
        if (r === 0) return 0;
        if (((l = i(++t)), l === null)) return t;
        if (l.type === j || l.type === v) {
            if (!Fw(l, eg) || !qt(l, 1, !1)) return 0;
            return t + 1;
        }
        return zr(r, t, i);
    }
    if (l.type === j) return zr(qt(l, 1, !0), ++t, i);
    return 0;
}
var Vw = ['calc(', '-moz-calc(', '-webkit-calc('],
    an = new Map([
        [_, a],
        [s, a],
        [el, pl],
        [N, ml],
    ]);
function Ql(l, i) {
    return i < l.length ? l.charCodeAt(i) : 0;
}
function cg(l, i) {
    return Tl(l, 0, l.length, i);
}
function mg(l, i) {
    for (let t = 0; t < i.length; t++) if (cg(l, i[t])) return !0;
    return !1;
}
function wg(l, i) {
    if (i !== l.length - 2) return !1;
    return Ql(l, i) === 92 && ol(Ql(l, i + 1));
}
function xr(l, i, t) {
    if (l && l.type === 'Range') {
        let r = Number(t !== void 0 && t !== i.length ? i.substr(0, t) : i);
        if (isNaN(r)) return !0;
        if (l.min !== null && r < l.min && typeof l.min !== 'string') return !0;
        if (l.max !== null && r > l.max && typeof l.max !== 'string') return !0;
    }
    return !1;
}
function Kw(l, i) {
    let t = 0,
        r = [],
        n = 0;
    l: do {
        switch (l.type) {
            case ml:
            case a:
            case pl:
                if (l.type !== t) break l;
                if (((t = r.pop()), r.length === 0)) {
                    n++;
                    break l;
                }
                break;
            case _:
            case s:
            case el:
            case N:
                r.push(t), (t = an.get(l.type));
                break;
        }
        n++;
    } while ((l = i(n)));
    return n;
}
function sl(l) {
    return function (i, t, r) {
        if (i === null) return 0;
        if (i.type === _ && mg(i.value, Vw)) return Kw(i, t);
        return l(i, t, r);
    };
}
function C(l) {
    return function (i) {
        if (i === null || i.type !== l) return 0;
        return 1;
    };
}
function Hw(l) {
    if (l === null || l.type !== w) return 0;
    let i = l.value.toLowerCase();
    if (mg(i, yi)) return 0;
    if (cg(i, 'default')) return 0;
    return 1;
}
function pg(l) {
    if (l === null || l.type !== w) return 0;
    if (Ql(l.value, 0) !== 45 || Ql(l.value, 1) !== 45) return 0;
    return 1;
}
function Mw(l) {
    if (!pg(l)) return 0;
    if (l.value === '--') return 0;
    return 1;
}
function yw(l) {
    if (l === null || l.type !== R) return 0;
    let i = l.value.length;
    if (i !== 4 && i !== 5 && i !== 7 && i !== 9) return 0;
    for (let t = 1; t < i; t++) if (!Dl(Ql(l.value, t))) return 0;
    return 1;
}
function Aw(l) {
    if (l === null || l.type !== R) return 0;
    if (!Gi(Ql(l.value, 1), Ql(l.value, 2), Ql(l.value, 3))) return 0;
    return 1;
}
function Uw(l, i) {
    if (!l) return 0;
    let t = 0,
        r = [],
        n = 0;
    l: do {
        switch (l.type) {
            case Ei:
            case wl:
                break l;
            case ml:
            case a:
            case pl:
                if (l.type !== t) break l;
                t = r.pop();
                break;
            case Z:
                if (t === 0) break l;
                break;
            case $:
                if (t === 0 && l.value === '!') break l;
                break;
            case _:
            case s:
            case el:
            case N:
                r.push(t), (t = an.get(l.type));
                break;
        }
        n++;
    } while ((l = i(n)));
    return n;
}
function kw(l, i) {
    if (!l) return 0;
    let t = 0,
        r = [],
        n = 0;
    l: do {
        switch (l.type) {
            case Ei:
            case wl:
                break l;
            case ml:
            case a:
            case pl:
                if (l.type !== t) break l;
                t = r.pop();
                break;
            case _:
            case s:
            case el:
            case N:
                r.push(t), (t = an.get(l.type));
                break;
        }
        n++;
    } while ((l = i(n)));
    return n;
}
function li(l) {
    if (l) l = new Set(l);
    return function (i, t, r) {
        if (i === null || i.type !== j) return 0;
        let n = xi(i.value, 0);
        if (l !== null) {
            let o = i.value.indexOf('\\', n),
                b = o === -1 || !wg(i.value, o) ? i.value.substr(n) : i.value.substring(n, o);
            if (l.has(b.toLowerCase()) === !1) return 0;
        }
        if (xr(r, i.value, n)) return 0;
        return 1;
    };
}
function Sw(l, i, t) {
    if (l === null || l.type !== A) return 0;
    if (xr(t, l.value, l.value.length - 1)) return 0;
    return 1;
}
function ug(l) {
    if (typeof l !== 'function')
        l = function () {
            return 0;
        };
    return function (i, t, r) {
        if (i !== null && i.type === v) {
            if (Number(i.value) === 0) return 1;
        }
        return l(i, t, r);
    };
}
function Nw(l, i, t) {
    if (l === null) return 0;
    let r = xi(l.value, 0);
    if (r !== l.value.length && !wg(l.value, r)) return 0;
    if (xr(t, l.value, r)) return 0;
    return 1;
}
function Cw(l, i, t) {
    if (l === null || l.type !== v) return 0;
    let r = Ql(l.value, 0) === 43 || Ql(l.value, 0) === 45 ? 1 : 0;
    for (; r < l.value.length; r++) if (!ol(Ql(l.value, r))) return 0;
    if (xr(t, l.value, r)) return 0;
    return 1;
}
var Pw = {
        'ident-token': C(w),
        'function-token': C(_),
        'at-keyword-token': C(S),
        'hash-token': C(R),
        'string-token': C(gl),
        'bad-string-token': C(Ei),
        'url-token': C(il),
        'bad-url-token': C(wl),
        'delim-token': C($),
        'number-token': C(v),
        'percentage-token': C(A),
        'dimension-token': C(j),
        'whitespace-token': C(Y),
        'CDO-token': C(Pl),
        'CDC-token': C(cl),
        'colon-token': C(P),
        'semicolon-token': C(Z),
        'comma-token': C(d),
        '[-token': C(el),
        ']-token': C(pl),
        '(-token': C(s),
        ')-token': C(a),
        '{-token': C(N),
        '}-token': C(ml),
    },
    Iw = {
        string: C(gl),
        ident: C(w),
        percentage: sl(Sw),
        zero: ug(),
        number: sl(Nw),
        integer: sl(Cw),
        'custom-ident': Hw,
        'dashed-ident': pg,
        'custom-property-name': Mw,
        'hex-color': yw,
        'id-selector': Aw,
        'an-plus-b': un,
        urange: xn,
        'declaration-value': Uw,
        'any-value': kw,
    };
function Tw(l) {
    let {
        angle: i,
        decibel: t,
        frequency: r,
        flex: n,
        length: o,
        resolution: b,
        semitones: g,
        time: e,
    } = l || {};
    return {
        dimension: sl(li(null)),
        angle: sl(li(i)),
        decibel: sl(li(t)),
        frequency: sl(li(r)),
        flex: sl(li(n)),
        length: sl(ug(li(o))),
        resolution: sl(li(b)),
        semitones: sl(li(g)),
        time: sl(li(e)),
    };
}
function zg(l) {
    return { ...Pw, ...Iw, ...Tw(l) };
}
var ar = {};
D(ar, {
    time: () => lp,
    semitones: () => op,
    resolution: () => tp,
    length: () => Zw,
    frequency: () => ip,
    flex: () => rp,
    decibel: () => np,
    angle: () => dw,
});
var Zw = [
        'cm',
        'mm',
        'q',
        'in',
        'pt',
        'pc',
        'px',
        'em',
        'rem',
        'ex',
        'rex',
        'cap',
        'rcap',
        'ch',
        'rch',
        'ic',
        'ric',
        'lh',
        'rlh',
        'vw',
        'svw',
        'lvw',
        'dvw',
        'vh',
        'svh',
        'lvh',
        'dvh',
        'vi',
        'svi',
        'lvi',
        'dvi',
        'vb',
        'svb',
        'lvb',
        'dvb',
        'vmin',
        'svmin',
        'lvmin',
        'dvmin',
        'vmax',
        'svmax',
        'lvmax',
        'dvmax',
        'cqw',
        'cqh',
        'cqi',
        'cqb',
        'cqmin',
        'cqmax',
    ],
    dw = ['deg', 'grad', 'rad', 'turn'],
    lp = ['s', 'ms'],
    ip = ['hz', 'khz'],
    tp = ['dpi', 'dpcm', 'dppx', 'x'],
    rp = ['fr'],
    np = ['db'],
    op = ['st'];
function _n(l, i, t) {
    return Object.assign(_i('SyntaxError', l), {
        input: i,
        offset: t,
        rawMessage: l,
        message:
            l +
            `
  ` +
            i +
            `
--` +
            new Array((t || i.length) + 1).join('-') +
            '^',
    });
}
var bp = 9,
    fp = 10,
    gp = 12,
    ep = 13,
    hp = 32,
    xg = new Uint8Array(128).map((l, i) => (/[a-zA-Z0-9\-]/.test(String.fromCharCode(i)) ? 1 : 0));
class vn {
    constructor(l) {
        (this.str = l), (this.pos = 0);
    }
    charCodeAt(l) {
        return l < this.str.length ? this.str.charCodeAt(l) : 0;
    }
    charCode() {
        return this.charCodeAt(this.pos);
    }
    isNameCharCode(l = this.charCode()) {
        return l < 128 && xg[l] === 1;
    }
    nextCharCode() {
        return this.charCodeAt(this.pos + 1);
    }
    nextNonWsCode(l) {
        return this.charCodeAt(this.findWsEnd(l));
    }
    skipWs() {
        this.pos = this.findWsEnd(this.pos);
    }
    findWsEnd(l) {
        for (; l < this.str.length; l++) {
            let i = this.str.charCodeAt(l);
            if (i !== ep && i !== fp && i !== gp && i !== hp && i !== bp) break;
        }
        return l;
    }
    substringToPos(l) {
        return this.str.substring(this.pos, (this.pos = l));
    }
    eat(l) {
        if (this.charCode() !== l) this.error('Expect `' + String.fromCharCode(l) + '`');
        this.pos++;
    }
    peek() {
        return this.pos < this.str.length ? this.str.charAt(this.pos++) : '';
    }
    error(l) {
        throw new _n(l, this.str, this.pos);
    }
    scanSpaces() {
        return this.substringToPos(this.findWsEnd(this.pos));
    }
    scanWord() {
        let l = this.pos;
        for (; l < this.str.length; l++) {
            let i = this.str.charCodeAt(l);
            if (i >= 128 || xg[i] === 0) break;
        }
        if (this.pos === l) this.error('Expect a keyword');
        return this.substringToPos(l);
    }
    scanNumber() {
        let l = this.pos;
        for (; l < this.str.length; l++) {
            let i = this.str.charCodeAt(l);
            if (i < 48 || i > 57) break;
        }
        if (this.pos === l) this.error('Expect a number');
        return this.substringToPos(l);
    }
    scanString() {
        let l = this.str.indexOf("'", this.pos + 1);
        if (l === -1) (this.pos = this.str.length), this.error('Expect an apostrophe');
        return this.substringToPos(l + 1);
    }
}
var cp = 9,
    mp = 10,
    wp = 12,
    pp = 13,
    up = 32,
    Jg = 33,
    qn = 35,
    ag = 38,
    _r = 39,
    Xg = 40,
    zp = 41,
    Wg = 42,
    Jn = 43,
    Xn = 44,
    _g = 45,
    Wn = 60,
    Dn = 62,
    $n = 63,
    xp = 64,
    Jt = 91,
    Xt = 93,
    vr = 123,
    vg = 124,
    Og = 125,
    Dg = 8734,
    $g = { ' ': 1, '&&': 2, '||': 3, '|': 4 };
function qg(l) {
    let i = null,
        t = null;
    if ((l.eat(vr), l.skipWs(), (i = l.scanNumber(l)), l.skipWs(), l.charCode() === Xn)) {
        if ((l.pos++, l.skipWs(), l.charCode() !== Og)) (t = l.scanNumber(l)), l.skipWs();
    } else t = i;
    return l.eat(Og), { min: Number(i), max: t ? Number(t) : 0 };
}
function ap(l) {
    let i = null,
        t = !1;
    switch (l.charCode()) {
        case Wg:
            l.pos++, (i = { min: 0, max: 0 });
            break;
        case Jn:
            l.pos++, (i = { min: 1, max: 0 });
            break;
        case $n:
            l.pos++, (i = { min: 0, max: 1 });
            break;
        case qn:
            if ((l.pos++, (t = !0), l.charCode() === vr)) i = qg(l);
            else if (l.charCode() === $n) l.pos++, (i = { min: 0, max: 0 });
            else i = { min: 1, max: 0 };
            break;
        case vr:
            i = qg(l);
            break;
        default:
            return null;
    }
    return { type: 'Multiplier', comma: t, min: i.min, max: i.max, term: null };
}
function gi(l, i) {
    let t = ap(l);
    if (t !== null) {
        if (((t.term = i), l.charCode() === qn && l.charCodeAt(l.pos - 1) === Jn)) return gi(l, t);
        return t;
    }
    return i;
}
function On(l) {
    let i = l.peek();
    if (i === '') return null;
    return gi(l, { type: 'Token', value: i });
}
function _p(l) {
    let i;
    return (
        l.eat(Wn),
        l.eat(_r),
        (i = l.scanWord()),
        l.eat(_r),
        l.eat(Dn),
        gi(l, { type: 'Property', name: i })
    );
}
function vp(l) {
    let i = null,
        t = null,
        r = 1;
    if ((l.eat(Jt), l.charCode() === _g)) l.peek(), (r = -1);
    if (r == -1 && l.charCode() === Dg) l.peek();
    else if (((i = r * Number(l.scanNumber(l))), l.isNameCharCode())) i += l.scanWord();
    if ((l.skipWs(), l.eat(Xn), l.skipWs(), l.charCode() === Dg)) l.peek();
    else {
        if (((r = 1), l.charCode() === _g)) l.peek(), (r = -1);
        if (((t = r * Number(l.scanNumber(l))), l.isNameCharCode())) t += l.scanWord();
    }
    return l.eat(Xt), { type: 'Range', min: i, max: t };
}
function Op(l) {
    let i,
        t = null;
    if ((l.eat(Wn), (i = l.scanWord()), i === 'boolean-expr')) {
        l.eat(Jt);
        let r = jn(l, Xt);
        return (
            l.eat(Xt),
            l.eat(Dn),
            gi(l, { type: 'Boolean', term: r.terms.length === 1 ? r.terms[0] : r })
        );
    }
    if (l.charCode() === Xg && l.nextCharCode() === zp) (l.pos += 2), (i += '()');
    if (l.charCodeAt(l.findWsEnd(l.pos)) === Jt) l.skipWs(), (t = vp(l));
    return l.eat(Dn), gi(l, { type: 'Type', name: i, opts: t });
}
function Dp(l) {
    let i = l.scanWord();
    if (l.charCode() === Xg) return l.pos++, { type: 'Function', name: i };
    return gi(l, { type: 'Keyword', name: i });
}
function $p(l, i) {
    function t(n, o) {
        return { type: 'Group', terms: n, combinator: o, disallowEmpty: !1, explicit: !1 };
    }
    let r;
    i = Object.keys(i).sort((n, o) => $g[n] - $g[o]);
    while (i.length > 0) {
        r = i.shift();
        let n = 0,
            o = 0;
        for (; n < l.length; n++) {
            let b = l[n];
            if (b.type === 'Combinator')
                if (b.value === r) {
                    if (o === -1) o = n - 1;
                    l.splice(n, 1), n--;
                } else {
                    if (o !== -1 && n - o > 1) l.splice(o, n - o, t(l.slice(o, n), r)), (n = o + 1);
                    o = -1;
                }
        }
        if (o !== -1 && i.length) l.splice(o, n - o, t(l.slice(o, n), r));
    }
    return r;
}
function jn(l, i) {
    let t = Object.create(null),
        r = [],
        n,
        o = null,
        b = l.pos;
    while (l.charCode() !== i && (n = Jp(l, i)))
        if (n.type !== 'Spaces') {
            if (n.type === 'Combinator') {
                if (o === null || o.type === 'Combinator')
                    (l.pos = b), l.error('Unexpected combinator');
                t[n.value] = !0;
            } else if (o !== null && o.type !== 'Combinator')
                (t[' '] = !0), r.push({ type: 'Combinator', value: ' ' });
            r.push(n), (o = n), (b = l.pos);
        }
    if (o !== null && o.type === 'Combinator') (l.pos -= b), l.error('Unexpected combinator');
    return {
        type: 'Group',
        terms: r,
        combinator: $p(r, t) || ' ',
        disallowEmpty: !1,
        explicit: !1,
    };
}
function qp(l, i) {
    let t;
    if ((l.eat(Jt), (t = jn(l, i)), l.eat(Xt), (t.explicit = !0), l.charCode() === Jg))
        l.pos++, (t.disallowEmpty = !0);
    return t;
}
function Jp(l, i) {
    let t = l.charCode();
    switch (t) {
        case Xt:
            break;
        case Jt:
            return gi(l, qp(l, i));
        case Wn:
            return l.nextCharCode() === _r ? _p(l) : Op(l);
        case vg:
            return {
                type: 'Combinator',
                value: l.substringToPos(l.pos + (l.nextCharCode() === vg ? 2 : 1)),
            };
        case ag:
            return l.pos++, l.eat(ag), { type: 'Combinator', value: '&&' };
        case Xn:
            return l.pos++, { type: 'Comma' };
        case _r:
            return gi(l, { type: 'String', value: l.scanString() });
        case up:
        case cp:
        case mp:
        case pp:
        case wp:
            return { type: 'Spaces', value: l.scanSpaces() };
        case xp:
            if (((t = l.nextCharCode()), l.isNameCharCode(t)))
                return l.pos++, { type: 'AtKeyword', name: l.scanWord() };
            return On(l);
        case Wg:
        case Jn:
        case $n:
        case qn:
        case Jg:
            break;
        case vr:
            if (((t = l.nextCharCode()), t < 48 || t > 57)) return On(l);
            break;
        default:
            if (l.isNameCharCode(t)) return Dp(l);
            return On(l);
    }
}
function Wt(l) {
    let i = new vn(l),
        t = jn(i);
    if (i.pos !== l.length) i.error('Unexpected input');
    if (t.terms.length === 1 && t.terms[0].type === 'Group') return t.terms[0];
    return t;
}
var jt = function () {};
function jg(l) {
    return typeof l === 'function' ? l : jt;
}
function sn(l, i, t) {
    function r(b) {
        switch ((n.call(t, b), b.type)) {
            case 'Group':
                b.terms.forEach(r);
                break;
            case 'Multiplier':
            case 'Boolean':
                r(b.term);
                break;
            case 'Type':
            case 'Property':
            case 'Keyword':
            case 'AtKeyword':
            case 'Function':
            case 'String':
            case 'Token':
            case 'Comma':
                break;
            default:
                throw new Error('Unknown type: ' + b.type);
        }
        o.call(t, b);
    }
    let n = jt,
        o = jt;
    if (typeof i === 'function') n = i;
    else if (i) (n = jg(i.enter)), (o = jg(i.leave));
    if (n === jt && o === jt)
        throw new Error(
            "Neither `enter` nor `leave` walker handler is set or both aren't a function",
        );
    r(l, t);
}
var Wp = {
    decorator(l) {
        let i = [],
            t = null;
        return {
            ...l,
            node(r) {
                let n = t;
                (t = r), l.node.call(this, r), (t = n);
            },
            emit(r, n, o) {
                i.push({ type: n, value: r, node: o ? null : t });
            },
            result() {
                return i;
            },
        };
    },
};
function jp(l) {
    let i = [];
    return bi(l, (t, r, n) => i.push({ type: t, value: l.slice(r, n), node: null })), i;
}
function Yn(l, i) {
    if (typeof l === 'string') return jp(l);
    return i.generate(l, Wp);
}
var M = { type: 'Match' },
    k = { type: 'Mismatch' },
    Or = { type: 'DisallowEmpty' },
    sp = 40,
    Yp = 41;
function xl(l, i, t) {
    if (i === M && t === k) return l;
    if (l === M && i === M && t === M) return l;
    if (l.type === 'If' && l.else === k && i === M) (i = l.then), (l = l.match);
    return { type: 'If', match: l, then: i, else: t };
}
function Yg(l) {
    return l.length > 2 && l.charCodeAt(l.length - 2) === sp && l.charCodeAt(l.length - 1) === Yp;
}
function sg(l) {
    return (
        l.type === 'Keyword' ||
        l.type === 'AtKeyword' ||
        l.type === 'Function' ||
        (l.type === 'Type' && Yg(l.name))
    );
}
function ei(l, i = ' ', t = !1) {
    return { type: 'Group', terms: l, combinator: i, disallowEmpty: !1, explicit: t };
}
function st(l, i, t = new Set()) {
    if (!t.has(l))
        switch ((t.add(l), l.type)) {
            case 'If':
                (l.match = st(l.match, i, t)),
                    (l.then = st(l.then, i, t)),
                    (l.else = st(l.else, i, t));
                break;
            case 'Type':
                return i[l.name] || l;
        }
    return l;
}
function Qn(l, i, t) {
    switch (l) {
        case ' ': {
            let r = M;
            for (let n = i.length - 1; n >= 0; n--) {
                let o = i[n];
                r = xl(o, r, k);
            }
            return r;
        }
        case '|': {
            let r = k,
                n = null;
            for (let o = i.length - 1; o >= 0; o--) {
                let b = i[o];
                if (sg(b)) {
                    if (n === null && o > 0 && sg(i[o - 1]))
                        (n = Object.create(null)), (r = xl({ type: 'Enum', map: n }, M, r));
                    if (n !== null) {
                        let g = (Yg(b.name) ? b.name.slice(0, -1) : b.name).toLowerCase();
                        if (g in n === !1) {
                            n[g] = b;
                            continue;
                        }
                    }
                }
                (n = null), (r = xl(b, M, r));
            }
            return r;
        }
        case '&&': {
            if (i.length > 5) return { type: 'MatchOnce', terms: i, all: !0 };
            let r = k;
            for (let n = i.length - 1; n >= 0; n--) {
                let o = i[n],
                    b;
                if (i.length > 1)
                    b = Qn(
                        l,
                        i.filter(function (g) {
                            return g !== o;
                        }),
                        !1,
                    );
                else b = M;
                r = xl(o, b, r);
            }
            return r;
        }
        case '||': {
            if (i.length > 5) return { type: 'MatchOnce', terms: i, all: !1 };
            let r = t ? M : k;
            for (let n = i.length - 1; n >= 0; n--) {
                let o = i[n],
                    b;
                if (i.length > 1)
                    b = Qn(
                        l,
                        i.filter(function (g) {
                            return g !== o;
                        }),
                        !0,
                    );
                else b = M;
                r = xl(o, b, r);
            }
            return r;
        }
    }
}
function Qp(l) {
    let i = M,
        t = Ui(l.term);
    if (l.max === 0) {
        if (((t = xl(t, Or, k)), (i = xl(t, null, k)), (i.then = xl(M, M, i)), l.comma))
            i.then.else = xl({ type: 'Comma', syntax: l }, i, k);
    } else
        for (let r = l.min || 1; r <= l.max; r++) {
            if (l.comma && i !== M) i = xl({ type: 'Comma', syntax: l }, i, k);
            i = xl(t, xl(M, M, i), k);
        }
    if (l.min === 0) i = xl(M, M, i);
    else
        for (let r = 0; r < l.min - 1; r++) {
            if (l.comma && i !== M) i = xl({ type: 'Comma', syntax: l }, i, k);
            i = xl(t, i, k);
        }
    return i;
}
function Ui(l) {
    if (typeof l === 'function') return { type: 'Generic', fn: l };
    switch (l.type) {
        case 'Group': {
            let i = Qn(l.combinator, l.terms.map(Ui), !1);
            if (l.disallowEmpty) i = xl(i, Or, k);
            return i;
        }
        case 'Multiplier':
            return Qp(l);
        case 'Boolean': {
            let i = Ui(l.term),
                t = Ui(
                    ei(
                        [
                            ei([
                                { type: 'Keyword', name: 'not' },
                                { type: 'Type', name: '!boolean-group' },
                            ]),
                            ei([
                                { type: 'Type', name: '!boolean-group' },
                                ei(
                                    [
                                        {
                                            type: 'Multiplier',
                                            comma: !1,
                                            min: 0,
                                            max: 0,
                                            term: ei([
                                                { type: 'Keyword', name: 'and' },
                                                { type: 'Type', name: '!boolean-group' },
                                            ]),
                                        },
                                        {
                                            type: 'Multiplier',
                                            comma: !1,
                                            min: 0,
                                            max: 0,
                                            term: ei([
                                                { type: 'Keyword', name: 'or' },
                                                { type: 'Type', name: '!boolean-group' },
                                            ]),
                                        },
                                    ],
                                    '|',
                                ),
                            ]),
                        ],
                        '|',
                    ),
                ),
                r = Ui(
                    ei(
                        [
                            { type: 'Type', name: '!term' },
                            ei([
                                { type: 'Token', value: '(' },
                                { type: 'Type', name: '!self' },
                                { type: 'Token', value: ')' },
                            ]),
                            { type: 'Type', name: 'general-enclosed' },
                        ],
                        '|',
                    ),
                );
            return st(r, { '!term': i, '!self': t }), st(t, { '!boolean-group': r }), t;
        }
        case 'Type':
        case 'Property':
            return { type: l.type, name: l.name, syntax: l };
        case 'Keyword':
            return { type: l.type, name: l.name.toLowerCase(), syntax: l };
        case 'AtKeyword':
            return { type: l.type, name: '@' + l.name.toLowerCase(), syntax: l };
        case 'Function':
            return { type: l.type, name: l.name.toLowerCase() + '(', syntax: l };
        case 'String':
            if (l.value.length === 3) return { type: 'Token', value: l.value.charAt(1), syntax: l };
            return {
                type: l.type,
                value: l.value.substr(1, l.value.length - 2).replace(/\\'/g, "'"),
                syntax: l,
            };
        case 'Token':
            return { type: l.type, value: l.value, syntax: l };
        case 'Comma':
            return { type: l.type, syntax: l };
        default:
            throw new Error('Unknown node type:', l.type);
    }
}
function Yt(l, i) {
    if (typeof l === 'string') l = Wt(l);
    return { type: 'MatchGraph', match: Ui(l), syntax: i || null, source: l };
}
var { hasOwnProperty: Qg } = Object.prototype,
    Ep = 0,
    Gp = 1,
    Gn = 2,
    Rg = 3,
    Eg = 'Match',
    Lp = 'Mismatch',
    Bp =
        'Maximum iteration number exceeded (please fill an issue on https://github.com/csstree/csstree/issues)',
    Gg = 15000,
    Rp = 0;
function Fp(l) {
    let i = null,
        t = null,
        r = l;
    while (r !== null) (t = r.prev), (r.prev = i), (i = r), (r = t);
    return i;
}
function En(l, i) {
    if (l.length !== i.length) return !1;
    for (let t = 0; t < l.length; t++) {
        let r = i.charCodeAt(t),
            n = l.charCodeAt(t);
        if (n >= 65 && n <= 90) n = n | 32;
        if (n !== r) return !1;
    }
    return !0;
}
function Vp(l) {
    if (l.type !== $) return !1;
    return l.value !== '?';
}
function Lg(l) {
    if (l === null) return !0;
    return l.type === d || l.type === _ || l.type === s || l.type === el || l.type === N || Vp(l);
}
function Bg(l) {
    if (l === null) return !0;
    return l.type === a || l.type === pl || l.type === ml || (l.type === $ && l.value === '/');
}
function Kp(l, i, t) {
    function r() {
        do V++, (q = V < l.length ? l[V] : null);
        while (q !== null && (q.type === Y || q.type === U));
    }
    function n(G) {
        let L = V + G;
        return L < l.length ? l[L] : null;
    }
    function o(G, L) {
        return {
            nextState: G,
            matchStack: K,
            syntaxStack: c,
            thenStack: m,
            tokenIndex: V,
            prev: L,
        };
    }
    function b(G) {
        m = { nextState: G, matchStack: K, syntaxStack: c, prev: m };
    }
    function g(G) {
        u = o(G, u);
    }
    function e() {
        if (((K = { type: Gp, syntax: i.syntax, token: q, prev: K }), r(), (X = null), V > fl))
            fl = V;
    }
    function f() {
        (c = { syntax: i.syntax, opts: i.syntax.opts || (c !== null && c.opts) || null, prev: c }),
            (K = { type: Gn, syntax: i.syntax, token: K.token, prev: K });
    }
    function h() {
        if (K.type === Gn) K = K.prev;
        else K = { type: Rg, syntax: c.syntax, token: K.token, prev: K };
        c = c.prev;
    }
    let c = null,
        m = null,
        u = null,
        X = null,
        I = 0,
        F = null,
        q = null,
        V = -1,
        fl = 0,
        K = { type: Ep, syntax: null, token: null, prev: null };
    r();
    while (F === null && ++I < Gg)
        switch (i.type) {
            case 'Match':
                if (m === null) {
                    if (q !== null) {
                        if (V !== l.length - 1 || (q.value !== '\\0' && q.value !== '\\9')) {
                            i = k;
                            break;
                        }
                    }
                    F = Eg;
                    break;
                }
                if (((i = m.nextState), i === Or))
                    if (m.matchStack === K) {
                        i = k;
                        break;
                    } else i = M;
                while (m.syntaxStack !== c) h();
                m = m.prev;
                break;
            case 'Mismatch':
                if (X !== null && X !== !1) {
                    if (u === null || V > u.tokenIndex) (u = X), (X = !1);
                } else if (u === null) {
                    F = Lp;
                    break;
                }
                (i = u.nextState),
                    (m = u.thenStack),
                    (c = u.syntaxStack),
                    (K = u.matchStack),
                    (V = u.tokenIndex),
                    (q = V < l.length ? l[V] : null),
                    (u = u.prev);
                break;
            case 'MatchGraph':
                i = i.match;
                break;
            case 'If':
                if (i.else !== k) g(i.else);
                if (i.then !== M) b(i.then);
                i = i.match;
                break;
            case 'MatchOnce':
                i = { type: 'MatchOnceBuffer', syntax: i, index: 0, mask: 0 };
                break;
            case 'MatchOnceBuffer': {
                let y = i.syntax.terms;
                if (i.index === y.length) {
                    if (i.mask === 0 || i.syntax.all) {
                        i = k;
                        break;
                    }
                    i = M;
                    break;
                }
                if (i.mask === (1 << y.length) - 1) {
                    i = M;
                    break;
                }
                for (; i.index < y.length; i.index++) {
                    let T = 1 << i.index;
                    if ((i.mask & T) === 0) {
                        g(i),
                            b({ type: 'AddMatchOnce', syntax: i.syntax, mask: i.mask | T }),
                            (i = y[i.index++]);
                        break;
                    }
                }
                break;
            }
            case 'AddMatchOnce':
                i = { type: 'MatchOnceBuffer', syntax: i.syntax, index: 0, mask: i.mask };
                break;
            case 'Enum':
                if (q !== null) {
                    let y = q.value.toLowerCase();
                    if (y.indexOf('\\') !== -1) y = y.replace(/\\[09].*$/, '');
                    if (Qg.call(i.map, y)) {
                        i = i.map[y];
                        break;
                    }
                }
                i = k;
                break;
            case 'Generic': {
                let y = c !== null ? c.opts : null,
                    T = V + Math.floor(i.fn(q, n, y));
                if (!isNaN(T) && T > V) {
                    while (V < T) e();
                    i = M;
                } else i = k;
                break;
            }
            case 'Type':
            case 'Property': {
                let y = i.type === 'Type' ? 'types' : 'properties',
                    T = Qg.call(t, y) ? t[y][i.name] : null;
                if (!T || !T.match)
                    throw new Error(
                        'Bad syntax reference: ' +
                            (i.type === 'Type' ? '<' + i.name + '>' : "<'" + i.name + "'>"),
                    );
                if (X !== !1 && q !== null && i.type === 'Type') {
                    if (
                        (i.name === 'custom-ident' && q.type === w) ||
                        (i.name === 'length' && q.value === '0')
                    ) {
                        if (X === null) X = o(i, u);
                        i = k;
                        break;
                    }
                }
                f(), (i = T.matchRef || T.match);
                break;
            }
            case 'Keyword': {
                let y = i.name;
                if (q !== null) {
                    let T = q.value;
                    if (T.indexOf('\\') !== -1) T = T.replace(/\\[09].*$/, '');
                    if (En(T, y)) {
                        e(), (i = M);
                        break;
                    }
                }
                i = k;
                break;
            }
            case 'AtKeyword':
            case 'Function':
                if (q !== null && En(q.value, i.name)) {
                    e(), (i = M);
                    break;
                }
                i = k;
                break;
            case 'Token':
                if (q !== null && q.value === i.value) {
                    e(), (i = M);
                    break;
                }
                i = k;
                break;
            case 'Comma':
                if (q !== null && q.type === d)
                    if (Lg(K.token)) i = k;
                    else e(), (i = Bg(q) ? k : M);
                else i = Lg(K.token) || Bg(q) ? M : k;
                break;
            case 'String':
                let G = '',
                    L = V;
                for (; L < l.length && G.length < i.value.length; L++) G += l[L].value;
                if (En(G, i.value)) {
                    while (V < L) e();
                    i = M;
                } else i = k;
                break;
            default:
                throw new Error('Unknown node type: ' + i.type);
        }
    switch (((Rp += I), F)) {
        case null:
            console.warn('[csstree-match] BREAK after ' + Gg + ' iterations'), (F = Bp), (K = null);
            break;
        case Eg:
            while (c !== null) h();
            break;
        default:
            K = null;
    }
    return { tokens: l, reason: F, iterations: I, match: K, longestMatch: fl };
}
function Ln(l, i, t) {
    let r = Kp(l, i, t || {});
    if (r.match === null) return r;
    let n = r.match,
        o = (r.match = { syntax: i.syntax || null, match: [] }),
        b = [o];
    n = Fp(n).prev;
    while (n !== null) {
        switch (n.type) {
            case Gn:
                o.match.push((o = { syntax: n.syntax, match: [] })), b.push(o);
                break;
            case Rg:
                b.pop(), (o = b[b.length - 1]);
                break;
            default:
                o.match.push({
                    syntax: n.syntax || null,
                    token: n.token.value,
                    node: n.token.node,
                });
        }
        n = n.prev;
    }
    return r;
}
var Rn = {};
D(Rn, { isType: () => Hp, isProperty: () => Mp, isKeyword: () => yp, getTrace: () => Fg });
function Fg(l) {
    function i(n) {
        if (n === null) return !1;
        return n.type === 'Type' || n.type === 'Property' || n.type === 'Keyword';
    }
    function t(n) {
        if (Array.isArray(n.match)) {
            for (let o = 0; o < n.match.length; o++)
                if (t(n.match[o])) {
                    if (i(n.syntax)) r.unshift(n.syntax);
                    return !0;
                }
        } else if (n.node === l) return (r = i(n.syntax) ? [n.syntax] : []), !0;
        return !1;
    }
    let r = null;
    if (this.matched !== null) t(this.matched);
    return r;
}
function Hp(l, i) {
    return Bn(this, l, (t) => t.type === 'Type' && t.name === i);
}
function Mp(l, i) {
    return Bn(this, l, (t) => t.type === 'Property' && t.name === i);
}
function yp(l) {
    return Bn(this, l, (i) => i.type === 'Keyword');
}
function Bn(l, i, t) {
    let r = Fg.call(l, i);
    if (r === null) return !1;
    return r.some(t);
}
function Vg(l) {
    if ('node' in l) return l.node;
    return Vg(l.match[0]);
}
function Kg(l) {
    if ('node' in l) return l.node;
    return Kg(l.match[l.match.length - 1]);
}
function Fn(l, i, t, r, n) {
    function o(g) {
        if (g.syntax !== null && g.syntax.type === r && g.syntax.name === n) {
            let e = Vg(g),
                f = Kg(g);
            l.syntax.walk(i, function (h, c, m) {
                if (h === e) {
                    let u = new ll();
                    do {
                        if ((u.appendData(c.data), c.data === f)) break;
                        c = c.next;
                    } while (c !== null);
                    b.push({ parent: m, nodes: u });
                }
            });
        }
        if (Array.isArray(g.match)) g.match.forEach(o);
    }
    let b = [];
    if (t.matched !== null) o(t.matched);
    return b;
}
var { hasOwnProperty: Qt } = Object.prototype;
function Vn(l) {
    return typeof l === 'number' && isFinite(l) && Math.floor(l) === l && l >= 0;
}
function Hg(l) {
    return Boolean(l) && Vn(l.offset) && Vn(l.line) && Vn(l.column);
}
function Ap(l, i) {
    return function t(r, n) {
        if (!r || r.constructor !== Object) return n(r, 'Type of node should be an Object');
        for (let o in r) {
            let b = !0;
            if (Qt.call(r, o) === !1) continue;
            if (o === 'type') {
                if (r.type !== l) n(r, 'Wrong node type `' + r.type + '`, expected `' + l + '`');
            } else if (o === 'loc') {
                if (r.loc === null) continue;
                else if (r.loc && r.loc.constructor === Object)
                    if (typeof r.loc.source !== 'string') o += '.source';
                    else if (!Hg(r.loc.start)) o += '.start';
                    else if (!Hg(r.loc.end)) o += '.end';
                    else continue;
                b = !1;
            } else if (i.hasOwnProperty(o)) {
                b = !1;
                for (let g = 0; !b && g < i[o].length; g++) {
                    let e = i[o][g];
                    switch (e) {
                        case String:
                            b = typeof r[o] === 'string';
                            break;
                        case Boolean:
                            b = typeof r[o] === 'boolean';
                            break;
                        case null:
                            b = r[o] === null;
                            break;
                        default:
                            if (typeof e === 'string') b = r[o] && r[o].type === e;
                            else if (Array.isArray(e)) b = r[o] instanceof ll;
                    }
                }
            } else n(r, 'Unknown field `' + o + '` for ' + l + ' node type');
            if (!b) n(r, 'Bad value for `' + l + '.' + o + '`');
        }
        for (let o in i)
            if (Qt.call(i, o) && Qt.call(r, o) === !1)
                n(r, 'Field `' + l + '.' + o + '` is missed');
    };
}
function Mg(l, i) {
    let t = [];
    for (let r = 0; r < l.length; r++) {
        let n = l[r];
        if (n === String || n === Boolean) t.push(n.name.toLowerCase());
        else if (n === null) t.push('null');
        else if (typeof n === 'string') t.push(n);
        else if (Array.isArray(n)) t.push('List<' + (Mg(n, i) || 'any') + '>');
        else throw new Error('Wrong value `' + n + '` in `' + i + '` structure definition');
    }
    return t.join(' | ');
}
function Up(l, i) {
    let t = i.structure,
        r = { type: String, loc: !0 },
        n = { type: '"' + l + '"' };
    for (let o in t) {
        if (Qt.call(t, o) === !1) continue;
        let b = (r[o] = Array.isArray(t[o]) ? t[o].slice() : [t[o]]);
        n[o] = Mg(b, l + '.' + o);
    }
    return { docs: n, check: Ap(l, r) };
}
function yg(l) {
    let i = {};
    if (l.node) {
        for (let t in l.node)
            if (Qt.call(l.node, t)) {
                let r = l.node[t];
                if (r.structure) i[t] = Up(t, r);
                else
                    throw new Error('Missed `structure` field in `' + t + '` node type definition');
            }
    }
    return i;
}
function Kn(l, i, t) {
    let r = {};
    for (let n in l) if (l[n].syntax) r[n] = t ? l[n].syntax : Ki(l[n].syntax, { compact: i });
    return r;
}
function kp(l, i, t) {
    let r = {};
    for (let [n, o] of Object.entries(l))
        r[n] = {
            prelude: o.prelude && (t ? o.prelude.syntax : Ki(o.prelude.syntax, { compact: i })),
            descriptors: o.descriptors && Kn(o.descriptors, i, t),
        };
    return r;
}
function Sp(l) {
    for (let i = 0; i < l.length; i++) if (l[i].value.toLowerCase() === 'var(') return !0;
    return !1;
}
function Np(l) {
    let i = l.terms[0];
    return l.explicit === !1 && l.terms.length === 1 && i.type === 'Multiplier' && i.comma === !0;
}
function El(l, i, t) {
    return { matched: l, iterations: t, error: i, ...Rn };
}
function ki(l, i, t, r) {
    let n = Yn(t, l.syntax),
        o;
    if (Sp(n)) return El(null, new Error('Matching for a tree with var() is not supported'));
    if (r) o = Ln(n, l.cssWideKeywordsSyntax, l);
    if (!r || !o.match) {
        if (((o = Ln(n, i.match, l)), !o.match))
            return El(null, new fg(o.reason, i.syntax, t, o), o.iterations);
    }
    return El(o.match, null, o.iterations);
}
class Et {
    constructor(l, i, t) {
        if (
            ((this.cssWideKeywords = yi),
            (this.syntax = i),
            (this.generic = !1),
            (this.units = { ...ar }),
            (this.atrules = Object.create(null)),
            (this.properties = Object.create(null)),
            (this.types = Object.create(null)),
            (this.structure = t || yg(l)),
            l)
        ) {
            if (l.cssWideKeywords) this.cssWideKeywords = l.cssWideKeywords;
            if (l.units) {
                for (let r of Object.keys(ar))
                    if (Array.isArray(l.units[r])) this.units[r] = l.units[r];
            }
            if (l.types) for (let [r, n] of Object.entries(l.types)) this.addType_(r, n);
            if (l.generic) {
                this.generic = !0;
                for (let [r, n] of Object.entries(zg(this.units))) this.addType_(r, n);
            }
            if (l.atrules) for (let [r, n] of Object.entries(l.atrules)) this.addAtrule_(r, n);
            if (l.properties)
                for (let [r, n] of Object.entries(l.properties)) this.addProperty_(r, n);
        }
        this.cssWideKeywordsSyntax = Yt(this.cssWideKeywords.join(' |  '));
    }
    checkStructure(l) {
        function i(n, o) {
            r.push({ node: n, message: o });
        }
        let t = this.structure,
            r = [];
        return (
            this.syntax.walk(l, function (n) {
                if (t.hasOwnProperty(n.type)) t[n.type].check(n, i);
                else i(n, 'Unknown node type `' + n.type + '`');
            }),
            r.length ? r : !1
        );
    }
    createDescriptor(l, i, t, r = null) {
        let n = { type: i, name: t },
            o = {
                type: i,
                name: t,
                parent: r,
                serializable: typeof l === 'string' || (l && typeof l.type === 'string'),
                syntax: null,
                match: null,
                matchRef: null,
            };
        if (typeof l === 'function') o.match = Yt(l, n);
        else {
            if (typeof l === 'string')
                Object.defineProperty(o, 'syntax', {
                    get() {
                        return Object.defineProperty(o, 'syntax', { value: Wt(l) }), o.syntax;
                    },
                });
            else o.syntax = l;
            if (
                (Object.defineProperty(o, 'match', {
                    get() {
                        return (
                            Object.defineProperty(o, 'match', { value: Yt(o.syntax, n) }), o.match
                        );
                    },
                }),
                i === 'Property')
            )
                Object.defineProperty(o, 'matchRef', {
                    get() {
                        let b = o.syntax,
                            g = Np(b) ? Yt({ ...b, terms: [b.terms[0].term] }, n) : null;
                        return Object.defineProperty(o, 'matchRef', { value: g }), g;
                    },
                });
        }
        return o;
    }
    addAtrule_(l, i) {
        if (!i) return;
        this.atrules[l] = {
            type: 'Atrule',
            name: l,
            prelude: i.prelude ? this.createDescriptor(i.prelude, 'AtrulePrelude', l) : null,
            descriptors: i.descriptors
                ? Object.keys(i.descriptors).reduce((t, r) => {
                      return (
                          (t[r] = this.createDescriptor(
                              i.descriptors[r],
                              'AtruleDescriptor',
                              r,
                              l,
                          )),
                          t
                      );
                  }, Object.create(null))
                : null,
        };
    }
    addProperty_(l, i) {
        if (!i) return;
        this.properties[l] = this.createDescriptor(i, 'Property', l);
    }
    addType_(l, i) {
        if (!i) return;
        this.types[l] = this.createDescriptor(i, 'Type', l);
    }
    checkAtruleName(l) {
        if (!this.getAtrule(l)) return new Hi('Unknown at-rule', '@' + l);
    }
    checkAtrulePrelude(l, i) {
        let t = this.checkAtruleName(l);
        if (t) return t;
        let r = this.getAtrule(l);
        if (!r.prelude && i)
            return new SyntaxError('At-rule `@' + l + '` should not contain a prelude');
        if (r.prelude && !i) {
            if (!ki(this, r.prelude, '', !1).matched)
                return new SyntaxError('At-rule `@' + l + '` should contain a prelude');
        }
    }
    checkAtruleDescriptorName(l, i) {
        let t = this.checkAtruleName(l);
        if (t) return t;
        let r = this.getAtrule(l),
            n = pr(i);
        if (!r.descriptors) return new SyntaxError('At-rule `@' + l + '` has no known descriptors');
        if (!r.descriptors[n.name] && !r.descriptors[n.basename])
            return new Hi('Unknown at-rule descriptor', i);
    }
    checkPropertyName(l) {
        if (!this.getProperty(l)) return new Hi('Unknown property', l);
    }
    matchAtrulePrelude(l, i) {
        let t = this.checkAtrulePrelude(l, i);
        if (t) return El(null, t);
        let r = this.getAtrule(l);
        if (!r.prelude) return El(null, null);
        return ki(this, r.prelude, i || '', !1);
    }
    matchAtruleDescriptor(l, i, t) {
        let r = this.checkAtruleDescriptorName(l, i);
        if (r) return El(null, r);
        let n = this.getAtrule(l),
            o = pr(i);
        return ki(this, n.descriptors[o.name] || n.descriptors[o.basename], t, !1);
    }
    matchDeclaration(l) {
        if (l.type !== 'Declaration') return El(null, new Error('Not a Declaration node'));
        return this.matchProperty(l.property, l.value);
    }
    matchProperty(l, i) {
        if (cn(l).custom)
            return El(null, new Error("Lexer matching doesn't applicable for custom properties"));
        let t = this.checkPropertyName(l);
        if (t) return El(null, t);
        return ki(this, this.getProperty(l), i, !0);
    }
    matchType(l, i) {
        let t = this.getType(l);
        if (!t) return El(null, new Hi('Unknown type', l));
        return ki(this, t, i, !1);
    }
    match(l, i) {
        if (typeof l !== 'string' && (!l || !l.type)) return El(null, new Hi('Bad syntax'));
        if (typeof l === 'string' || !l.match) l = this.createDescriptor(l, 'Type', 'anonymous');
        return ki(this, l, i, !1);
    }
    findValueFragments(l, i, t, r) {
        return Fn(this, i, this.matchProperty(l, i), t, r);
    }
    findDeclarationValueFragments(l, i, t) {
        return Fn(this, l.value, this.matchDeclaration(l), i, t);
    }
    findAllFragments(l, i, t) {
        let r = [];
        return (
            this.syntax.walk(l, {
                visit: 'Declaration',
                enter: (n) => {
                    r.push.apply(r, this.findDeclarationValueFragments(n, i, t));
                },
            }),
            r
        );
    }
    getAtrule(l, i = !0) {
        let t = pr(l);
        return (
            (t.vendor && i
                ? this.atrules[t.name] || this.atrules[t.basename]
                : this.atrules[t.name]) || null
        );
    }
    getAtrulePrelude(l, i = !0) {
        let t = this.getAtrule(l, i);
        return (t && t.prelude) || null;
    }
    getAtruleDescriptor(l, i) {
        return this.atrules.hasOwnProperty(l) && this.atrules.declarators
            ? this.atrules[l].declarators[i] || null
            : null;
    }
    getProperty(l, i = !0) {
        let t = cn(l);
        return (
            (t.vendor && i
                ? this.properties[t.name] || this.properties[t.basename]
                : this.properties[t.name]) || null
        );
    }
    getType(l) {
        return hasOwnProperty.call(this.types, l) ? this.types[l] : null;
    }
    validate() {
        function l(g, e) {
            return e ? `<${g}>` : `<'${g}'>`;
        }
        function i(g, e, f, h) {
            if (f.has(e)) return f.get(e);
            if ((f.set(e, !1), h.syntax !== null))
                sn(
                    h.syntax,
                    function (c) {
                        if (c.type !== 'Type' && c.type !== 'Property') return;
                        let m = c.type === 'Type' ? g.types : g.properties,
                            u = c.type === 'Type' ? r : n;
                        if (!hasOwnProperty.call(m, c.name))
                            t.push(
                                `${l(e, f === r)} used missed syntax definition ${l(c.name, c.type === 'Type')}`,
                            ),
                                f.set(e, !0);
                        else if (i(g, c.name, u, m[c.name]))
                            t.push(
                                `${l(e, f === r)} used broken syntax definition ${l(c.name, c.type === 'Type')}`,
                            ),
                                f.set(e, !0);
                    },
                    this,
                );
        }
        let t = [],
            r = new Map(),
            n = new Map();
        for (let g in this.types) i(this, g, r, this.types[g]);
        for (let g in this.properties) i(this, g, n, this.properties[g]);
        let o = [...r.keys()].filter((g) => r.get(g)),
            b = [...n.keys()].filter((g) => n.get(g));
        if (o.length || b.length) return { errors: t, types: o, properties: b };
        return null;
    }
    dump(l, i) {
        return {
            generic: this.generic,
            cssWideKeywords: this.cssWideKeywords,
            units: this.units,
            types: Kn(this.types, !i, l),
            properties: Kn(this.properties, !i, l),
            atrules: kp(this.atrules, !i, l),
        };
    }
    toString() {
        return JSON.stringify(this.dump());
    }
}
function Hn(l, i) {
    if (typeof i === 'string' && /^\s*\|/.test(i))
        return typeof l === 'string' ? l + i : i.replace(/^\s*\|\s*/, '');
    return i || null;
}
function Ag(l, i) {
    let t = Object.create(null);
    for (let [r, n] of Object.entries(l))
        if (n) {
            t[r] = {};
            for (let o of Object.keys(n)) if (i.includes(o)) t[r][o] = n[o];
        }
    return t;
}
function Gt(l, i) {
    let t = { ...l };
    for (let [r, n] of Object.entries(i))
        switch (r) {
            case 'generic':
                t[r] = Boolean(n);
                break;
            case 'cssWideKeywords':
                t[r] = l[r] ? [...l[r], ...n] : n || [];
                break;
            case 'units':
                t[r] = { ...l[r] };
                for (let [o, b] of Object.entries(n)) t[r][o] = Array.isArray(b) ? b : [];
                break;
            case 'atrules':
                t[r] = { ...l[r] };
                for (let [o, b] of Object.entries(n)) {
                    let g = t[r][o] || {},
                        e = (t[r][o] = {
                            prelude: g.prelude || null,
                            descriptors: { ...g.descriptors },
                        });
                    if (!b) continue;
                    e.prelude = b.prelude ? Hn(e.prelude, b.prelude) : e.prelude || null;
                    for (let [f, h] of Object.entries(b.descriptors || {}))
                        e.descriptors[f] = h ? Hn(e.descriptors[f], h) : null;
                    if (!Object.keys(e.descriptors).length) e.descriptors = null;
                }
                break;
            case 'types':
            case 'properties':
                t[r] = { ...l[r] };
                for (let [o, b] of Object.entries(n)) t[r][o] = Hn(t[r][o], b);
                break;
            case 'scope':
            case 'features':
                t[r] = { ...l[r] };
                for (let [o, b] of Object.entries(n)) t[r][o] = { ...t[r][o], ...b };
                break;
            case 'parseContext':
                t[r] = { ...l[r], ...n };
                break;
            case 'atrule':
            case 'pseudo':
                t[r] = { ...l[r], ...Ag(n, ['parse']) };
                break;
            case 'node':
                t[r] = {
                    ...l[r],
                    ...Ag(n, ['name', 'structure', 'parse', 'generate', 'walkContext']),
                };
                break;
        }
    return t;
}
function Ug(l) {
    let i = G0(l),
        t = og(l),
        r = d0(l),
        { fromPlainObject: n, toPlainObject: o } = lg(t),
        b = {
            lexer: null,
            createLexer: (g) => new Et(g, b, b.lexer.structure),
            tokenize: bi,
            parse: i,
            generate: r,
            walk: t,
            find: t.find,
            findLast: t.findLast,
            findAll: t.findAll,
            fromPlainObject: n,
            toPlainObject: o,
            fork(g) {
                let e = Gt({}, l);
                return Ug(typeof g === 'function' ? g(e) : Gt(e, g));
            },
        };
    return (
        (b.lexer = new Et(
            {
                generic: l.generic,
                cssWideKeywords: l.cssWideKeywords,
                units: l.units,
                types: l.types,
                atrules: l.atrules,
                properties: l.properties,
                node: l.node,
            },
            b,
        )),
        b
    );
}
var Mn = (l) => Ug(Gt({}, l));
var kg = {
    generic: !0,
    cssWideKeywords: ['initial', 'inherit', 'unset', 'revert', 'revert-layer'],
    units: {
        angle: ['deg', 'grad', 'rad', 'turn'],
        decibel: ['db'],
        flex: ['fr'],
        frequency: ['hz', 'khz'],
        length: [
            'cm',
            'mm',
            'q',
            'in',
            'pt',
            'pc',
            'px',
            'em',
            'rem',
            'ex',
            'rex',
            'cap',
            'rcap',
            'ch',
            'rch',
            'ic',
            'ric',
            'lh',
            'rlh',
            'vw',
            'svw',
            'lvw',
            'dvw',
            'vh',
            'svh',
            'lvh',
            'dvh',
            'vi',
            'svi',
            'lvi',
            'dvi',
            'vb',
            'svb',
            'lvb',
            'dvb',
            'vmin',
            'svmin',
            'lvmin',
            'dvmin',
            'vmax',
            'svmax',
            'lvmax',
            'dvmax',
            'cqw',
            'cqh',
            'cqi',
            'cqb',
            'cqmin',
            'cqmax',
        ],
        resolution: ['dpi', 'dpcm', 'dppx', 'x'],
        semitones: ['st'],
        time: ['s', 'ms'],
    },
    types: {
        'abs()': 'abs( <calc-sum> )',
        'absolute-size': 'xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large',
        'acos()': 'acos( <calc-sum> )',
        'alpha-value': '<number>|<percentage>',
        'angle-percentage': '<angle>|<percentage>',
        'angular-color-hint': '<angle-percentage>',
        'angular-color-stop': '<color>&&<color-stop-angle>?',
        'angular-color-stop-list':
            '[<angular-color-stop> [, <angular-color-hint>]?]# , <angular-color-stop>',
        'animateable-feature': 'scroll-position|contents|<custom-ident>',
        'asin()': 'asin( <calc-sum> )',
        'atan()': 'atan( <calc-sum> )',
        'atan2()': 'atan2( <calc-sum> , <calc-sum> )',
        attachment: 'scroll|fixed|local',
        'attr()': 'attr( <attr-name> <type-or-unit>? [, <attr-fallback>]? )',
        'attr-matcher': "['~'|'|'|'^'|'$'|'*']? '='",
        'attr-modifier': 'i|s',
        'attribute-selector':
            "'[' <wq-name> ']'|'[' <wq-name> <attr-matcher> [<string-token>|<ident-token>] <attr-modifier>? ']'",
        'auto-repeat':
            'repeat( [auto-fill|auto-fit] , [<line-names>? <fixed-size>]+ <line-names>? )',
        'auto-track-list':
            '[<line-names>? [<fixed-size>|<fixed-repeat>]]* <line-names>? <auto-repeat> [<line-names>? [<fixed-size>|<fixed-repeat>]]* <line-names>?',
        axis: 'block|inline|x|y',
        'baseline-position': '[first|last]? baseline',
        'basic-shape': '<inset()>|<xywh()>|<rect()>|<circle()>|<ellipse()>|<polygon()>|<path()>',
        'bg-image': 'none|<image>',
        'bg-layer':
            '<bg-image>||<bg-position> [/ <bg-size>]?||<repeat-style>||<attachment>||<box>||<box>',
        'bg-position':
            '[[left|center|right|top|bottom|<length-percentage>]|[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]|[center|[left|right] <length-percentage>?]&&[center|[top|bottom] <length-percentage>?]]',
        'bg-size': '[<length-percentage>|auto]{1,2}|cover|contain',
        'blur()': 'blur( <length> )',
        'blend-mode':
            'normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity',
        box: 'border-box|padding-box|content-box',
        'brightness()': 'brightness( <number-percentage> )',
        'calc()': 'calc( <calc-sum> )',
        'calc-sum': "<calc-product> [['+'|'-'] <calc-product>]*",
        'calc-product': "<calc-value> ['*' <calc-value>|'/' <number>]*",
        'calc-value': '<number>|<dimension>|<percentage>|<calc-constant>|( <calc-sum> )',
        'calc-constant': 'e|pi|infinity|-infinity|NaN',
        'cf-final-image': '<image>|<color>',
        'cf-mixing-image': '<percentage>?&&<image>',
        'circle()': 'circle( [<shape-radius>]? [at <position>]? )',
        'clamp()': 'clamp( <calc-sum>#{3} )',
        'class-selector': "'.' <ident-token>",
        'clip-source': '<url>',
        color: '<color-base>|currentColor|<system-color>|<device-cmyk()>|<light-dark()>|<-non-standard-color>',
        'color-stop': '<color-stop-length>|<color-stop-angle>',
        'color-stop-angle': '<angle-percentage>{1,2}',
        'color-stop-length': '<length-percentage>{1,2}',
        'color-stop-list': '[<linear-color-stop> [, <linear-color-hint>]?]# , <linear-color-stop>',
        'color-interpolation-method':
            'in [<rectangular-color-space>|<polar-color-space> <hue-interpolation-method>?|<custom-color-space>]',
        combinator: "'>'|'+'|'~'|['|' '|']",
        'common-lig-values': '[common-ligatures|no-common-ligatures]',
        'compat-auto':
            'searchfield|textarea|push-button|slider-horizontal|checkbox|radio|square-button|menulist|listbox|meter|progress-bar|button',
        'composite-style':
            'clear|copy|source-over|source-in|source-out|source-atop|destination-over|destination-in|destination-out|destination-atop|xor',
        'compositing-operator': 'add|subtract|intersect|exclude',
        'compound-selector': '[<type-selector>? <subclass-selector>*]!',
        'compound-selector-list': '<compound-selector>#',
        'complex-selector': '<complex-selector-unit> [<combinator>? <complex-selector-unit>]*',
        'complex-selector-list': '<complex-selector>#',
        'conic-gradient()':
            'conic-gradient( [from <angle>]? [at <position>]? , <angular-color-stop-list> )',
        'contextual-alt-values': '[contextual|no-contextual]',
        'content-distribution': 'space-between|space-around|space-evenly|stretch',
        'content-list':
            '[<string>|contents|<image>|<counter>|<quote>|<target>|<leader()>|<attr()>]+',
        'content-position': 'center|start|end|flex-start|flex-end',
        'content-replacement': '<image>',
        'contrast()': 'contrast( [<number-percentage>] )',
        'cos()': 'cos( <calc-sum> )',
        counter: '<counter()>|<counters()>',
        'counter()': 'counter( <counter-name> , <counter-style>? )',
        'counter-name': '<custom-ident>',
        'counter-style': '<counter-style-name>|symbols( )',
        'counter-style-name': '<custom-ident>',
        'counters()': 'counters( <counter-name> , <string> , <counter-style>? )',
        'cross-fade()': 'cross-fade( <cf-mixing-image> , <cf-final-image>? )',
        'cubic-bezier-timing-function':
            'ease|ease-in|ease-out|ease-in-out|cubic-bezier( <number [0,1]> , <number> , <number [0,1]> , <number> )',
        'deprecated-system-color':
            'ActiveBorder|ActiveCaption|AppWorkspace|Background|ButtonFace|ButtonHighlight|ButtonShadow|ButtonText|CaptionText|GrayText|Highlight|HighlightText|InactiveBorder|InactiveCaption|InactiveCaptionText|InfoBackground|InfoText|Menu|MenuText|Scrollbar|ThreeDDarkShadow|ThreeDFace|ThreeDHighlight|ThreeDLightShadow|ThreeDShadow|Window|WindowFrame|WindowText',
        'discretionary-lig-values': '[discretionary-ligatures|no-discretionary-ligatures]',
        'display-box': 'contents|none',
        'display-inside': 'flow|flow-root|table|flex|grid|ruby',
        'display-internal':
            'table-row-group|table-header-group|table-footer-group|table-row|table-cell|table-column-group|table-column|table-caption|ruby-base|ruby-text|ruby-base-container|ruby-text-container',
        'display-legacy': 'inline-block|inline-list-item|inline-table|inline-flex|inline-grid',
        'display-listitem': '<display-outside>?&&[flow|flow-root]?&&list-item',
        'display-outside': 'block|inline|run-in',
        'drop-shadow()': 'drop-shadow( <length>{2,3} <color>? )',
        'east-asian-variant-values': '[jis78|jis83|jis90|jis04|simplified|traditional]',
        'east-asian-width-values': '[full-width|proportional-width]',
        'element()':
            'element( <custom-ident> , [first|start|last|first-except]? )|element( <id-selector> )',
        'ellipse()': 'ellipse( [<shape-radius>{2}]? [at <position>]? )',
        'ending-shape': 'circle|ellipse',
        'env()': 'env( <custom-ident> , <declaration-value>? )',
        'exp()': 'exp( <calc-sum> )',
        'explicit-track-list': '[<line-names>? <track-size>]+ <line-names>?',
        'family-name': '<string>|<custom-ident>+',
        'feature-tag-value': '<string> [<integer>|on|off]?',
        'feature-type':
            '@stylistic|@historical-forms|@styleset|@character-variant|@swash|@ornaments|@annotation',
        'feature-value-block': "<feature-type> '{' <feature-value-declaration-list> '}'",
        'feature-value-block-list': '<feature-value-block>+',
        'feature-value-declaration': '<custom-ident> : <integer>+ ;',
        'feature-value-declaration-list': '<feature-value-declaration>',
        'feature-value-name': '<custom-ident>',
        'fill-rule': 'nonzero|evenodd',
        'filter-function':
            '<blur()>|<brightness()>|<contrast()>|<drop-shadow()>|<grayscale()>|<hue-rotate()>|<invert()>|<opacity()>|<saturate()>|<sepia()>',
        'filter-function-list': '[<filter-function>|<url>]+',
        'final-bg-layer':
            "<'background-color'>||<bg-image>||<bg-position> [/ <bg-size>]?||<repeat-style>||<attachment>||<box>||<box>",
        'fixed-breadth': '<length-percentage>',
        'fixed-repeat': 'repeat( [<integer [1,∞]>] , [<line-names>? <fixed-size>]+ <line-names>? )',
        'fixed-size':
            '<fixed-breadth>|minmax( <fixed-breadth> , <track-breadth> )|minmax( <inflexible-breadth> , <fixed-breadth> )',
        'font-stretch-absolute':
            'normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded|<percentage>',
        'font-variant-css21': '[normal|small-caps]',
        'font-weight-absolute': 'normal|bold|<number [1,1000]>',
        'frequency-percentage': '<frequency>|<percentage>',
        'general-enclosed': '[<function-token> <any-value>? )]|[( <any-value>? )]',
        'generic-family':
            '<generic-script-specific>|<generic-complete>|<generic-incomplete>|<-non-standard-generic-family>',
        'generic-name': 'serif|sans-serif|cursive|fantasy|monospace',
        'geometry-box': '<shape-box>|fill-box|stroke-box|view-box',
        gradient:
            '<linear-gradient()>|<repeating-linear-gradient()>|<radial-gradient()>|<repeating-radial-gradient()>|<conic-gradient()>|<repeating-conic-gradient()>|<-legacy-gradient>',
        'grayscale()': 'grayscale( <number-percentage> )',
        'grid-line':
            'auto|<custom-ident>|[<integer>&&<custom-ident>?]|[span&&[<integer>||<custom-ident>]]',
        'historical-lig-values': '[historical-ligatures|no-historical-ligatures]',
        'hsl()':
            'hsl( <hue> <percentage> <percentage> [/ <alpha-value>]? )|hsl( <hue> , <percentage> , <percentage> , <alpha-value>? )',
        'hsla()':
            'hsla( <hue> <percentage> <percentage> [/ <alpha-value>]? )|hsla( <hue> , <percentage> , <percentage> , <alpha-value>? )',
        hue: '<number>|<angle>',
        'hue-rotate()': 'hue-rotate( <angle> )',
        'hue-interpolation-method': '[shorter|longer|increasing|decreasing] hue',
        'hwb()':
            'hwb( [<hue>|none] [<percentage>|none] [<percentage>|none] [/ [<alpha-value>|none]]? )',
        'hypot()': 'hypot( <calc-sum># )',
        image: '<url>|<image()>|<image-set()>|<element()>|<paint()>|<cross-fade()>|<gradient>',
        'image()': 'image( <image-tags>? [<image-src>? , <color>?]! )',
        'image-set()': 'image-set( <image-set-option># )',
        'image-set-option': '[<image>|<string>] [<resolution>||type( <string> )]',
        'image-src': '<url>|<string>',
        'image-tags': 'ltr|rtl',
        'inflexible-breadth': '<length-percentage>|min-content|max-content|auto',
        'inset()': "inset( <length-percentage>{1,4} [round <'border-radius'>]? )",
        'invert()': 'invert( <number-percentage> )',
        'keyframes-name': '<custom-ident>|<string>',
        'keyframe-block': '<keyframe-selector># { <declaration-list> }',
        'keyframe-block-list': '<keyframe-block>+',
        'keyframe-selector': 'from|to|<percentage>|<timeline-range-name> <percentage>',
        'lab()':
            'lab( [<percentage>|<number>|none] [<percentage>|<number>|none] [<percentage>|<number>|none] [/ [<alpha-value>|none]]? )',
        'layer()': 'layer( <layer-name> )',
        'layer-name': "<ident> ['.' <ident>]*",
        'lch()':
            'lch( [<percentage>|<number>|none] [<percentage>|<number>|none] [<hue>|none] [/ [<alpha-value>|none]]? )',
        'leader()': 'leader( <leader-type> )',
        'leader-type': 'dotted|solid|space|<string>',
        'length-percentage': '<length>|<percentage>',
        'light-dark()': 'light-dark( <color> , <color> )',
        'line-names': "'[' <custom-ident>* ']'",
        'line-name-list': '[<line-names>|<name-repeat>]+',
        'line-style': 'none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset',
        'line-width': '<length>|thin|medium|thick',
        'linear-color-hint': '<length-percentage>',
        'linear-color-stop': '<color> <color-stop-length>?',
        'linear-gradient()':
            'linear-gradient( [[<angle>|to <side-or-corner>]||<color-interpolation-method>]? , <color-stop-list> )',
        'log()': 'log( <calc-sum> , <calc-sum>? )',
        'mask-layer':
            '<mask-reference>||<position> [/ <bg-size>]?||<repeat-style>||<geometry-box>||[<geometry-box>|no-clip]||<compositing-operator>||<masking-mode>',
        'mask-position':
            '[<length-percentage>|left|center|right] [<length-percentage>|top|center|bottom]?',
        'mask-reference': 'none|<image>|<mask-source>',
        'mask-source': '<url>',
        'masking-mode': 'alpha|luminance|match-source',
        'matrix()': 'matrix( <number>#{6} )',
        'matrix3d()': 'matrix3d( <number>#{16} )',
        'max()': 'max( <calc-sum># )',
        'media-and': '<media-in-parens> [and <media-in-parens>]+',
        'media-condition': '<media-not>|<media-and>|<media-or>|<media-in-parens>',
        'media-condition-without-or': '<media-not>|<media-and>|<media-in-parens>',
        'media-feature': '( [<mf-plain>|<mf-boolean>|<mf-range>] )',
        'media-in-parens': '( <media-condition> )|<media-feature>|<general-enclosed>',
        'media-not': 'not <media-in-parens>',
        'media-or': '<media-in-parens> [or <media-in-parens>]+',
        'media-query':
            '<media-condition>|[not|only]? <media-type> [and <media-condition-without-or>]?',
        'media-query-list': '<media-query>#',
        'media-type': '<ident>',
        'mf-boolean': '<mf-name>',
        'mf-name': '<ident>',
        'mf-plain': '<mf-name> : <mf-value>',
        'mf-range':
            "<mf-name> ['<'|'>']? '='? <mf-value>|<mf-value> ['<'|'>']? '='? <mf-name>|<mf-value> '<' '='? <mf-name> '<' '='? <mf-value>|<mf-value> '>' '='? <mf-name> '>' '='? <mf-value>",
        'mf-value': '<number>|<dimension>|<ident>|<ratio>',
        'min()': 'min( <calc-sum># )',
        'minmax()':
            'minmax( [<length-percentage>|min-content|max-content|auto] , [<length-percentage>|<flex>|min-content|max-content|auto] )',
        'mod()': 'mod( <calc-sum> , <calc-sum> )',
        'name-repeat': 'repeat( [<integer [1,∞]>|auto-fill] , <line-names>+ )',
        'named-color':
            'transparent|aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen',
        'namespace-prefix': '<ident>',
        'ns-prefix': "[<ident-token>|'*']? '|'",
        'number-percentage': '<number>|<percentage>',
        'numeric-figure-values': '[lining-nums|oldstyle-nums]',
        'numeric-fraction-values': '[diagonal-fractions|stacked-fractions]',
        'numeric-spacing-values': '[proportional-nums|tabular-nums]',
        nth: '<an-plus-b>|even|odd',
        'opacity()': 'opacity( [<number-percentage>] )',
        'overflow-position': 'unsafe|safe',
        'outline-radius': '<length>|<percentage>',
        'page-body': '<declaration>? [; <page-body>]?|<page-margin-box> <page-body>',
        'page-margin-box': "<page-margin-box-type> '{' <declaration-list> '}'",
        'page-margin-box-type':
            '@top-left-corner|@top-left|@top-center|@top-right|@top-right-corner|@bottom-left-corner|@bottom-left|@bottom-center|@bottom-right|@bottom-right-corner|@left-top|@left-middle|@left-bottom|@right-top|@right-middle|@right-bottom',
        'page-selector-list': '[<page-selector>#]?',
        'page-selector': '<pseudo-page>+|<ident> <pseudo-page>*',
        'page-size': 'A5|A4|A3|B5|B4|JIS-B5|JIS-B4|letter|legal|ledger',
        'path()': 'path( [<fill-rule> ,]? <string> )',
        'paint()': 'paint( <ident> , <declaration-value>? )',
        'perspective()': 'perspective( [<length [0,∞]>|none] )',
        'polygon()': 'polygon( <fill-rule>? , [<length-percentage> <length-percentage>]# )',
        'polar-color-space': 'hsl|hwb|lch|oklch',
        position:
            '[[left|center|right]||[top|center|bottom]|[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]?|[[left|right] <length-percentage>]&&[[top|bottom] <length-percentage>]]',
        'pow()': 'pow( <calc-sum> , <calc-sum> )',
        'pseudo-class-selector': "':' <ident-token>|':' <function-token> <any-value> ')'",
        'pseudo-element-selector': "':' <pseudo-class-selector>|<legacy-pseudo-element-selector>",
        'pseudo-page': ': [left|right|first|blank]',
        quote: 'open-quote|close-quote|no-open-quote|no-close-quote',
        'radial-gradient()':
            'radial-gradient( [<ending-shape>||<size>]? [at <position>]? , <color-stop-list> )',
        ratio: '<number [0,∞]> [/ <number [0,∞]>]?',
        'ray()': 'ray( <angle>&&<ray-size>?&&contain?&&[at <position>]? )',
        'ray-size': 'closest-side|closest-corner|farthest-side|farthest-corner|sides',
        'rectangular-color-space':
            'srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|oklab|xyz|xyz-d50|xyz-d65',
        'relative-selector': '<combinator>? <complex-selector>',
        'relative-selector-list': '<relative-selector>#',
        'relative-size': 'larger|smaller',
        'rem()': 'rem( <calc-sum> , <calc-sum> )',
        'repeat-style': 'repeat-x|repeat-y|[repeat|space|round|no-repeat]{1,2}',
        'repeating-conic-gradient()':
            'repeating-conic-gradient( [from <angle>]? [at <position>]? , <angular-color-stop-list> )',
        'repeating-linear-gradient()':
            'repeating-linear-gradient( [<angle>|to <side-or-corner>]? , <color-stop-list> )',
        'repeating-radial-gradient()':
            'repeating-radial-gradient( [<ending-shape>||<size>]? [at <position>]? , <color-stop-list> )',
        'reversed-counter-name': 'reversed( <counter-name> )',
        'rgb()':
            'rgb( <percentage>{3} [/ <alpha-value>]? )|rgb( <number>{3} [/ <alpha-value>]? )|rgb( <percentage>#{3} , <alpha-value>? )|rgb( <number>#{3} , <alpha-value>? )',
        'rgba()':
            'rgba( <percentage>{3} [/ <alpha-value>]? )|rgba( <number>{3} [/ <alpha-value>]? )|rgba( <percentage>#{3} , <alpha-value>? )|rgba( <number>#{3} , <alpha-value>? )',
        'rotate()': 'rotate( [<angle>|<zero>] )',
        'rotate3d()': 'rotate3d( <number> , <number> , <number> , [<angle>|<zero>] )',
        'rotateX()': 'rotateX( [<angle>|<zero>] )',
        'rotateY()': 'rotateY( [<angle>|<zero>] )',
        'rotateZ()': 'rotateZ( [<angle>|<zero>] )',
        'round()': 'round( <rounding-strategy>? , <calc-sum> , <calc-sum> )',
        'rounding-strategy': 'nearest|up|down|to-zero',
        'saturate()': 'saturate( <number-percentage> )',
        'scale()': 'scale( [<number>|<percentage>]#{1,2} )',
        'scale3d()': 'scale3d( [<number>|<percentage>]#{3} )',
        'scaleX()': 'scaleX( [<number>|<percentage>] )',
        'scaleY()': 'scaleY( [<number>|<percentage>] )',
        'scaleZ()': 'scaleZ( [<number>|<percentage>] )',
        'scroll()': 'scroll( [<axis>||<scroller>]? )',
        scroller: 'root|nearest|self',
        'self-position': 'center|start|end|self-start|self-end|flex-start|flex-end',
        'shape-radius': '<length-percentage>|closest-side|farthest-side',
        'sign()': 'sign( <calc-sum> )',
        'skew()': 'skew( [<angle>|<zero>] , [<angle>|<zero>]? )',
        'skewX()': 'skewX( [<angle>|<zero>] )',
        'skewY()': 'skewY( [<angle>|<zero>] )',
        'sepia()': 'sepia( <number-percentage> )',
        shadow: 'inset?&&<length>{2,4}&&<color>?',
        'shadow-t': '[<length>{2,3}&&<color>?]',
        shape: 'rect( <top> , <right> , <bottom> , <left> )|rect( <top> <right> <bottom> <left> )',
        'shape-box': '<box>|margin-box',
        'side-or-corner': '[left|right]||[top|bottom]',
        'sin()': 'sin( <calc-sum> )',
        'single-animation':
            "<'animation-duration'>||<easing-function>||<'animation-delay'>||<single-animation-iteration-count>||<single-animation-direction>||<single-animation-fill-mode>||<single-animation-play-state>||[none|<keyframes-name>]||<single-animation-timeline>",
        'single-animation-direction': 'normal|reverse|alternate|alternate-reverse',
        'single-animation-fill-mode': 'none|forwards|backwards|both',
        'single-animation-iteration-count': 'infinite|<number>',
        'single-animation-play-state': 'running|paused',
        'single-animation-timeline': 'auto|none|<dashed-ident>|<scroll()>|<view()>',
        'single-transition':
            '[none|<single-transition-property>]||<time>||<easing-function>||<time>||<transition-behavior-value>',
        'single-transition-property': 'all|<custom-ident>',
        size: 'closest-side|farthest-side|closest-corner|farthest-corner|<length>|<length-percentage>{2}',
        'sqrt()': 'sqrt( <calc-sum> )',
        'step-position': 'jump-start|jump-end|jump-none|jump-both|start|end',
        'step-timing-function': 'step-start|step-end|steps( <integer> [, <step-position>]? )',
        'subclass-selector':
            '<id-selector>|<class-selector>|<attribute-selector>|<pseudo-class-selector>',
        'supports-condition':
            'not <supports-in-parens>|<supports-in-parens> [and <supports-in-parens>]*|<supports-in-parens> [or <supports-in-parens>]*',
        'supports-in-parens': '( <supports-condition> )|<supports-feature>|<general-enclosed>',
        'supports-feature': '<supports-decl>|<supports-selector-fn>',
        'supports-decl': '( <declaration> )',
        'supports-selector-fn': 'selector( <complex-selector> )',
        symbol: '<string>|<image>|<custom-ident>',
        'system-color':
            'AccentColor|AccentColorText|ActiveText|ButtonBorder|ButtonFace|ButtonText|Canvas|CanvasText|Field|FieldText|GrayText|Highlight|HighlightText|LinkText|Mark|MarkText|SelectedItem|SelectedItemText|VisitedText',
        'tan()': 'tan( <calc-sum> )',
        target: '<target-counter()>|<target-counters()>|<target-text()>',
        'target-counter()':
            'target-counter( [<string>|<url>] , <custom-ident> , <counter-style>? )',
        'target-counters()':
            'target-counters( [<string>|<url>] , <custom-ident> , <string> , <counter-style>? )',
        'target-text()': 'target-text( [<string>|<url>] , [content|before|after|first-letter]? )',
        'time-percentage': '<time>|<percentage>',
        'timeline-range-name': 'cover|contain|entry|exit|entry-crossing|exit-crossing',
        'easing-function': 'linear|<cubic-bezier-timing-function>|<step-timing-function>',
        'track-breadth': '<length-percentage>|<flex>|min-content|max-content|auto',
        'track-list': '[<line-names>? [<track-size>|<track-repeat>]]+ <line-names>?',
        'track-repeat': 'repeat( [<integer [1,∞]>] , [<line-names>? <track-size>]+ <line-names>? )',
        'track-size':
            '<track-breadth>|minmax( <inflexible-breadth> , <track-breadth> )|fit-content( <length-percentage> )',
        'transform-function':
            '<matrix()>|<translate()>|<translateX()>|<translateY()>|<scale()>|<scaleX()>|<scaleY()>|<rotate()>|<skew()>|<skewX()>|<skewY()>|<matrix3d()>|<translate3d()>|<translateZ()>|<scale3d()>|<scaleZ()>|<rotate3d()>|<rotateX()>|<rotateY()>|<rotateZ()>|<perspective()>',
        'transform-list': '<transform-function>+',
        'transition-behavior-value': 'normal|allow-discrete',
        'translate()': 'translate( <length-percentage> , <length-percentage>? )',
        'translate3d()': 'translate3d( <length-percentage> , <length-percentage> , <length> )',
        'translateX()': 'translateX( <length-percentage> )',
        'translateY()': 'translateY( <length-percentage> )',
        'translateZ()': 'translateZ( <length> )',
        'type-or-unit':
            'string|color|url|integer|number|length|angle|time|frequency|cap|ch|em|ex|ic|lh|rlh|rem|vb|vi|vw|vh|vmin|vmax|mm|Q|cm|in|pt|pc|px|deg|grad|rad|turn|ms|s|Hz|kHz|%',
        'type-selector': "<wq-name>|<ns-prefix>? '*'",
        'var()': 'var( <custom-property-name> , <declaration-value>? )',
        'view()': "view( [<axis>||<'view-timeline-inset'>]? )",
        'viewport-length': 'auto|<length-percentage>',
        'visual-box': 'content-box|padding-box|border-box',
        'wq-name': '<ns-prefix>? <ident-token>',
        '-legacy-gradient':
            '<-webkit-gradient()>|<-legacy-linear-gradient>|<-legacy-repeating-linear-gradient>|<-legacy-radial-gradient>|<-legacy-repeating-radial-gradient>',
        '-legacy-linear-gradient':
            '-moz-linear-gradient( <-legacy-linear-gradient-arguments> )|-webkit-linear-gradient( <-legacy-linear-gradient-arguments> )|-o-linear-gradient( <-legacy-linear-gradient-arguments> )',
        '-legacy-repeating-linear-gradient':
            '-moz-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )|-webkit-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )|-o-repeating-linear-gradient( <-legacy-linear-gradient-arguments> )',
        '-legacy-linear-gradient-arguments': '[<angle>|<side-or-corner>]? , <color-stop-list>',
        '-legacy-radial-gradient':
            '-moz-radial-gradient( <-legacy-radial-gradient-arguments> )|-webkit-radial-gradient( <-legacy-radial-gradient-arguments> )|-o-radial-gradient( <-legacy-radial-gradient-arguments> )',
        '-legacy-repeating-radial-gradient':
            '-moz-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )|-webkit-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )|-o-repeating-radial-gradient( <-legacy-radial-gradient-arguments> )',
        '-legacy-radial-gradient-arguments':
            '[<position> ,]? [[[<-legacy-radial-gradient-shape>||<-legacy-radial-gradient-size>]|[<length>|<percentage>]{2}] ,]? <color-stop-list>',
        '-legacy-radial-gradient-size':
            'closest-side|closest-corner|farthest-side|farthest-corner|contain|cover',
        '-legacy-radial-gradient-shape': 'circle|ellipse',
        '-non-standard-font':
            '-apple-system-body|-apple-system-headline|-apple-system-subheadline|-apple-system-caption1|-apple-system-caption2|-apple-system-footnote|-apple-system-short-body|-apple-system-short-headline|-apple-system-short-subheadline|-apple-system-short-caption1|-apple-system-short-footnote|-apple-system-tall-body',
        '-non-standard-color':
            '-moz-ButtonDefault|-moz-ButtonHoverFace|-moz-ButtonHoverText|-moz-CellHighlight|-moz-CellHighlightText|-moz-Combobox|-moz-ComboboxText|-moz-Dialog|-moz-DialogText|-moz-dragtargetzone|-moz-EvenTreeRow|-moz-Field|-moz-FieldText|-moz-html-CellHighlight|-moz-html-CellHighlightText|-moz-mac-accentdarkestshadow|-moz-mac-accentdarkshadow|-moz-mac-accentface|-moz-mac-accentlightesthighlight|-moz-mac-accentlightshadow|-moz-mac-accentregularhighlight|-moz-mac-accentregularshadow|-moz-mac-chrome-active|-moz-mac-chrome-inactive|-moz-mac-focusring|-moz-mac-menuselect|-moz-mac-menushadow|-moz-mac-menutextselect|-moz-MenuHover|-moz-MenuHoverText|-moz-MenuBarText|-moz-MenuBarHoverText|-moz-nativehyperlinktext|-moz-OddTreeRow|-moz-win-communicationstext|-moz-win-mediatext|-moz-activehyperlinktext|-moz-default-background-color|-moz-default-color|-moz-hyperlinktext|-moz-visitedhyperlinktext|-webkit-activelink|-webkit-focus-ring-color|-webkit-link|-webkit-text',
        '-non-standard-image-rendering':
            'optimize-contrast|-moz-crisp-edges|-o-crisp-edges|-webkit-optimize-contrast',
        '-non-standard-overflow':
            'overlay|-moz-scrollbars-none|-moz-scrollbars-horizontal|-moz-scrollbars-vertical|-moz-hidden-unscrollable',
        '-non-standard-size':
            'intrinsic|min-intrinsic|-webkit-fill-available|-webkit-fit-content|-webkit-min-content|-webkit-max-content|-moz-available|-moz-fit-content|-moz-min-content|-moz-max-content',
        '-webkit-gradient()':
            '-webkit-gradient( <-webkit-gradient-type> , <-webkit-gradient-point> [, <-webkit-gradient-point>|, <-webkit-gradient-radius> , <-webkit-gradient-point>] [, <-webkit-gradient-radius>]? [, <-webkit-gradient-color-stop>]* )',
        '-webkit-gradient-color-stop':
            'from( <color> )|color-stop( [<number-zero-one>|<percentage>] , <color> )|to( <color> )',
        '-webkit-gradient-point':
            '[left|center|right|<length-percentage>] [top|center|bottom|<length-percentage>]',
        '-webkit-gradient-radius': '<length>|<percentage>',
        '-webkit-gradient-type': 'linear|radial',
        '-webkit-mask-box-repeat': 'repeat|stretch|round',
        '-ms-filter-function-list': '<-ms-filter-function>+',
        '-ms-filter-function': '<-ms-filter-function-progid>|<-ms-filter-function-legacy>',
        '-ms-filter-function-progid':
            "'progid:' [<ident-token> '.']* [<ident-token>|<function-token> <any-value>? )]",
        '-ms-filter-function-legacy': '<ident-token>|<function-token> <any-value>? )',
        'absolute-color-base': '<hex-color>|<absolute-color-function>|<named-color>|transparent',
        'absolute-color-function':
            '<rgb()>|<rgba()>|<hsl()>|<hsla()>|<hwb()>|<lab()>|<lch()>|<oklab()>|<oklch()>|<color()>',
        age: 'child|young|old',
        'anchor-name': '<dashed-ident>',
        'attr-name': '<wq-name>',
        'attr-fallback': '<any-value>',
        'bg-clip': '<box>|border|text',
        bottom: '<length>|auto',
        'container-name': '<custom-ident>',
        'container-condition':
            'not <query-in-parens>|<query-in-parens> [[and <query-in-parens>]*|[or <query-in-parens>]*]',
        'coord-box': 'content-box|padding-box|border-box|fill-box|stroke-box|view-box',
        'generic-voice': '[<age>? <gender> <integer>?]',
        gender: 'male|female|neutral',
        'generic-script-specific': 'generic( kai )|generic( fangsong )|generic( nastaliq )',
        'generic-complete': 'serif|sans-serif|system-ui|cursive|fantasy|math|monospace',
        'generic-incomplete': 'ui-serif|ui-sans-serif|ui-monospace|ui-rounded',
        '-non-standard-generic-family': '-apple-system|BlinkMacSystemFont',
        left: '<length>|auto',
        'color-base': '<hex-color>|<color-function>|<named-color>|<color-mix()>|transparent',
        'color-function':
            '<rgb()>|<rgba()>|<hsl()>|<hsla()>|<hwb()>|<lab()>|<lch()>|<oklab()>|<oklch()>|<color()>',
        'device-cmyk()': '<legacy-device-cmyk-syntax>|<modern-device-cmyk-syntax>',
        'legacy-device-cmyk-syntax': 'device-cmyk( <number>#{4} )',
        'modern-device-cmyk-syntax': 'device-cmyk( <cmyk-component>{4} [/ [<alpha-value>|none]]? )',
        'cmyk-component': '<number>|<percentage>|none',
        'color-mix()':
            'color-mix( <color-interpolation-method> , [<color>&&<percentage [0,100]>?]#{2} )',
        'color-space': '<rectangular-color-space>|<polar-color-space>|<custom-color-space>',
        'custom-color-space': '<dashed-ident>',
        paint: 'none|<color>|<url> [none|<color>]?|context-fill|context-stroke',
        'palette-identifier': '<dashed-ident>',
        right: '<length>|auto',
        'scope-start': '<forgiving-selector-list>',
        'scope-end': '<forgiving-selector-list>',
        'forgiving-selector-list': '<complex-real-selector-list>',
        'forgiving-relative-selector-list': '<relative-real-selector-list>',
        'selector-list': '<complex-selector-list>',
        'complex-real-selector-list': '<complex-real-selector>#',
        'simple-selector-list': '<simple-selector>#',
        'relative-real-selector-list': '<relative-real-selector>#',
        'complex-selector-unit': '[<compound-selector>? <pseudo-compound-selector>*]!',
        'complex-real-selector': '<compound-selector> [<combinator>? <compound-selector>]*',
        'relative-real-selector': '<combinator>? <complex-real-selector>',
        'pseudo-compound-selector': '<pseudo-element-selector> <pseudo-class-selector>*',
        'simple-selector': '<type-selector>|<subclass-selector>',
        'legacy-pseudo-element-selector': "':' [before|after|first-line|first-letter]",
        'single-animation-composition': 'replace|add|accumulate',
        'svg-length': '<percentage>|<length>|<number>',
        'svg-writing-mode': 'lr-tb|rl-tb|tb-rl|lr|rl|tb',
        top: '<length>|auto',
        x: '<number>',
        y: '<number>',
        declaration: "<ident-token> : <declaration-value>? ['!' important]?",
        'declaration-list': "[<declaration>? ';']* <declaration>?",
        url: 'url( <string> <url-modifier>* )|<url-token>',
        'url-modifier': '<ident>|<function-token> <any-value> )',
        'number-zero-one': '<number [0,1]>',
        'number-one-or-greater': '<number [1,∞]>',
        'color()': 'color( <colorspace-params> [/ [<alpha-value>|none]]? )',
        'colorspace-params': '[<predefined-rgb-params>|<xyz-params>]',
        'predefined-rgb-params': '<predefined-rgb> [<number>|<percentage>|none]{3}',
        'predefined-rgb': 'srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020',
        'xyz-params': '<xyz-space> [<number>|<percentage>|none]{3}',
        'xyz-space': 'xyz|xyz-d50|xyz-d65',
        'oklab()':
            'oklab( [<percentage>|<number>|none] [<percentage>|<number>|none] [<percentage>|<number>|none] [/ [<alpha-value>|none]]? )',
        'oklch()':
            'oklch( [<percentage>|<number>|none] [<percentage>|<number>|none] [<hue>|none] [/ [<alpha-value>|none]]? )',
        'offset-path': '<ray()>|<url>|<basic-shape>',
        'rect()': "rect( [<length-percentage>|auto]{4} [round <'border-radius'>]? )",
        'xywh()':
            "xywh( <length-percentage>{2} <length-percentage [0,∞]>{2} [round <'border-radius'>]? )",
        'query-in-parens':
            '( <container-condition> )|( <size-feature> )|style( <style-query> )|<general-enclosed>',
        'size-feature': '<mf-plain>|<mf-boolean>|<mf-range>',
        'style-feature': '<declaration>',
        'style-query': '<style-condition>|<style-feature>',
        'style-condition':
            'not <style-in-parens>|<style-in-parens> [[and <style-in-parens>]*|[or <style-in-parens>]*]',
        'style-in-parens': '( <style-condition> )|( <style-feature> )|<general-enclosed>',
        '-non-standard-display':
            '-ms-inline-flexbox|-ms-grid|-ms-inline-grid|-webkit-flex|-webkit-inline-flex|-webkit-box|-webkit-inline-box|-moz-inline-stack|-moz-box|-moz-inline-box',
        'inset-area':
            '[[left|center|right|span-left|span-right|x-start|x-end|span-x-start|span-x-end|x-self-start|x-self-end|span-x-self-start|span-x-self-end|span-all]||[top|center|bottom|span-top|span-bottom|y-start|y-end|span-y-start|span-y-end|y-self-start|y-self-end|span-y-self-start|span-y-self-end|span-all]|[block-start|center|block-end|span-block-start|span-block-end|span-all]||[inline-start|center|inline-end|span-inline-start|span-inline-end|span-all]|[self-block-start|self-block-end|span-self-block-start|span-self-block-end|span-all]||[self-inline-start|self-inline-end|span-self-inline-start|span-self-inline-end|span-all]|[start|center|end|span-start|span-end|span-all]{1,2}|[self-start|center|self-end|span-self-start|span-self-end|span-all]{1,2}]',
        'position-area':
            '[[left|center|right|span-left|span-right|x-start|x-end|span-x-start|span-x-end|x-self-start|x-self-end|span-x-self-start|span-x-self-end|span-all]||[top|center|bottom|span-top|span-bottom|y-start|y-end|span-y-start|span-y-end|y-self-start|y-self-end|span-y-self-start|span-y-self-end|span-all]|[block-start|center|block-end|span-block-start|span-block-end|span-all]||[inline-start|center|inline-end|span-inline-start|span-inline-end|span-all]|[self-block-start|center|self-block-end|span-self-block-start|span-self-block-end|span-all]||[self-inline-start|center|self-inline-end|span-self-inline-start|span-self-inline-end|span-all]|[start|center|end|span-start|span-end|span-all]{1,2}|[self-start|center|self-end|span-self-start|span-self-end|span-all]{1,2}]',
        'anchor()': 'anchor( <anchor-element>?&&<anchor-side> , <length-percentage>? )',
        'anchor-side':
            'inside|outside|top|left|right|bottom|start|end|self-start|self-end|<percentage>|center',
        'anchor-size()': 'anchor-size( [<anchor-element>||<anchor-size>]? , <length-percentage>? )',
        'anchor-size': 'width|height|block|inline|self-block|self-inline',
        'anchor-element': '<dashed-ident>',
        'try-size': 'most-width|most-height|most-block-size|most-inline-size',
        'try-tactic': 'flip-block||flip-inline||flip-start',
        'font-variant-css2': 'normal|small-caps',
        'font-width-css3':
            'normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded',
        'system-family-name': 'caption|icon|menu|message-box|small-caption|status-bar',
    },
    properties: {
        '--*': '<declaration-value>',
        '-ms-accelerator': 'false|true',
        '-ms-block-progression': 'tb|rl|bt|lr',
        '-ms-content-zoom-chaining': 'none|chained',
        '-ms-content-zooming': 'none|zoom',
        '-ms-content-zoom-limit': "<'-ms-content-zoom-limit-min'> <'-ms-content-zoom-limit-max'>",
        '-ms-content-zoom-limit-max': '<percentage>',
        '-ms-content-zoom-limit-min': '<percentage>',
        '-ms-content-zoom-snap': "<'-ms-content-zoom-snap-type'>||<'-ms-content-zoom-snap-points'>",
        '-ms-content-zoom-snap-points':
            'snapInterval( <percentage> , <percentage> )|snapList( <percentage># )',
        '-ms-content-zoom-snap-type': 'none|proximity|mandatory',
        '-ms-filter': '<string>',
        '-ms-flow-from': '[none|<custom-ident>]#',
        '-ms-flow-into': '[none|<custom-ident>]#',
        '-ms-grid-columns': 'none|<track-list>|<auto-track-list>',
        '-ms-grid-rows': 'none|<track-list>|<auto-track-list>',
        '-ms-high-contrast-adjust': 'auto|none',
        '-ms-hyphenate-limit-chars': 'auto|<integer>{1,3}',
        '-ms-hyphenate-limit-lines': 'no-limit|<integer>',
        '-ms-hyphenate-limit-zone': '<percentage>|<length>',
        '-ms-ime-align': 'auto|after',
        '-ms-overflow-style': 'auto|none|scrollbar|-ms-autohiding-scrollbar',
        '-ms-scrollbar-3dlight-color': '<color>',
        '-ms-scrollbar-arrow-color': '<color>',
        '-ms-scrollbar-base-color': '<color>',
        '-ms-scrollbar-darkshadow-color': '<color>',
        '-ms-scrollbar-face-color': '<color>',
        '-ms-scrollbar-highlight-color': '<color>',
        '-ms-scrollbar-shadow-color': '<color>',
        '-ms-scrollbar-track-color': '<color>',
        '-ms-scroll-chaining': 'chained|none',
        '-ms-scroll-limit':
            "<'-ms-scroll-limit-x-min'> <'-ms-scroll-limit-y-min'> <'-ms-scroll-limit-x-max'> <'-ms-scroll-limit-y-max'>",
        '-ms-scroll-limit-x-max': 'auto|<length>',
        '-ms-scroll-limit-x-min': '<length>',
        '-ms-scroll-limit-y-max': 'auto|<length>',
        '-ms-scroll-limit-y-min': '<length>',
        '-ms-scroll-rails': 'none|railed',
        '-ms-scroll-snap-points-x':
            'snapInterval( <length-percentage> , <length-percentage> )|snapList( <length-percentage># )',
        '-ms-scroll-snap-points-y':
            'snapInterval( <length-percentage> , <length-percentage> )|snapList( <length-percentage># )',
        '-ms-scroll-snap-type': 'none|proximity|mandatory',
        '-ms-scroll-snap-x': "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-x'>",
        '-ms-scroll-snap-y': "<'-ms-scroll-snap-type'> <'-ms-scroll-snap-points-y'>",
        '-ms-scroll-translation': 'none|vertical-to-horizontal',
        '-ms-text-autospace':
            'none|ideograph-alpha|ideograph-numeric|ideograph-parenthesis|ideograph-space',
        '-ms-touch-select': 'grippers|none',
        '-ms-user-select': 'none|element|text',
        '-ms-wrap-flow': 'auto|both|start|end|maximum|clear',
        '-ms-wrap-margin': '<length>',
        '-ms-wrap-through': 'wrap|none',
        '-moz-appearance':
            'none|button|button-arrow-down|button-arrow-next|button-arrow-previous|button-arrow-up|button-bevel|button-focus|caret|checkbox|checkbox-container|checkbox-label|checkmenuitem|dualbutton|groupbox|listbox|listitem|menuarrow|menubar|menucheckbox|menuimage|menuitem|menuitemtext|menulist|menulist-button|menulist-text|menulist-textfield|menupopup|menuradio|menuseparator|meterbar|meterchunk|progressbar|progressbar-vertical|progresschunk|progresschunk-vertical|radio|radio-container|radio-label|radiomenuitem|range|range-thumb|resizer|resizerpanel|scale-horizontal|scalethumbend|scalethumb-horizontal|scalethumbstart|scalethumbtick|scalethumb-vertical|scale-vertical|scrollbarbutton-down|scrollbarbutton-left|scrollbarbutton-right|scrollbarbutton-up|scrollbarthumb-horizontal|scrollbarthumb-vertical|scrollbartrack-horizontal|scrollbartrack-vertical|searchfield|separator|sheet|spinner|spinner-downbutton|spinner-textfield|spinner-upbutton|splitter|statusbar|statusbarpanel|tab|tabpanel|tabpanels|tab-scroll-arrow-back|tab-scroll-arrow-forward|textfield|textfield-multiline|toolbar|toolbarbutton|toolbarbutton-dropdown|toolbargripper|toolbox|tooltip|treeheader|treeheadercell|treeheadersortarrow|treeitem|treeline|treetwisty|treetwistyopen|treeview|-moz-mac-unified-toolbar|-moz-win-borderless-glass|-moz-win-browsertabbar-toolbox|-moz-win-communicationstext|-moz-win-communications-toolbox|-moz-win-exclude-glass|-moz-win-glass|-moz-win-mediatext|-moz-win-media-toolbox|-moz-window-button-box|-moz-window-button-box-maximized|-moz-window-button-close|-moz-window-button-maximize|-moz-window-button-minimize|-moz-window-button-restore|-moz-window-frame-bottom|-moz-window-frame-left|-moz-window-frame-right|-moz-window-titlebar|-moz-window-titlebar-maximized',
        '-moz-binding': '<url>|none',
        '-moz-border-bottom-colors': '<color>+|none',
        '-moz-border-left-colors': '<color>+|none',
        '-moz-border-right-colors': '<color>+|none',
        '-moz-border-top-colors': '<color>+|none',
        '-moz-context-properties': 'none|[fill|fill-opacity|stroke|stroke-opacity]#',
        '-moz-float-edge': 'border-box|content-box|margin-box|padding-box',
        '-moz-force-broken-image-icon': '0|1',
        '-moz-image-region': '<shape>|auto',
        '-moz-orient': 'inline|block|horizontal|vertical',
        '-moz-outline-radius': '<outline-radius>{1,4} [/ <outline-radius>{1,4}]?',
        '-moz-outline-radius-bottomleft': '<outline-radius>',
        '-moz-outline-radius-bottomright': '<outline-radius>',
        '-moz-outline-radius-topleft': '<outline-radius>',
        '-moz-outline-radius-topright': '<outline-radius>',
        '-moz-stack-sizing': 'ignore|stretch-to-fit',
        '-moz-text-blink': 'none|blink',
        '-moz-user-focus':
            'ignore|normal|select-after|select-before|select-menu|select-same|select-all|none',
        '-moz-user-input': 'auto|none|enabled|disabled',
        '-moz-user-modify': 'read-only|read-write|write-only',
        '-moz-window-dragging': 'drag|no-drag',
        '-moz-window-shadow': 'default|menu|tooltip|sheet|none',
        '-webkit-appearance':
            'none|button|button-bevel|caps-lock-indicator|caret|checkbox|default-button|inner-spin-button|listbox|listitem|media-controls-background|media-controls-fullscreen-background|media-current-time-display|media-enter-fullscreen-button|media-exit-fullscreen-button|media-fullscreen-button|media-mute-button|media-overlay-play-button|media-play-button|media-seek-back-button|media-seek-forward-button|media-slider|media-sliderthumb|media-time-remaining-display|media-toggle-closed-captions-button|media-volume-slider|media-volume-slider-container|media-volume-sliderthumb|menulist|menulist-button|menulist-text|menulist-textfield|meter|progress-bar|progress-bar-value|push-button|radio|scrollbarbutton-down|scrollbarbutton-left|scrollbarbutton-right|scrollbarbutton-up|scrollbargripper-horizontal|scrollbargripper-vertical|scrollbarthumb-horizontal|scrollbarthumb-vertical|scrollbartrack-horizontal|scrollbartrack-vertical|searchfield|searchfield-cancel-button|searchfield-decoration|searchfield-results-button|searchfield-results-decoration|slider-horizontal|slider-vertical|sliderthumb-horizontal|sliderthumb-vertical|square-button|textarea|textfield|-apple-pay-button',
        '-webkit-border-before': "<'border-width'>||<'border-style'>||<color>",
        '-webkit-border-before-color': '<color>',
        '-webkit-border-before-style': "<'border-style'>",
        '-webkit-border-before-width': "<'border-width'>",
        '-webkit-box-reflect': '[above|below|right|left]? <length>? <image>?',
        '-webkit-line-clamp': 'none|<integer>',
        '-webkit-mask':
            '[<mask-reference>||<position> [/ <bg-size>]?||<repeat-style>||[<box>|border|padding|content|text]||[<box>|border|padding|content]]#',
        '-webkit-mask-attachment': '<attachment>#',
        '-webkit-mask-clip': '[<box>|border|padding|content|text]#',
        '-webkit-mask-composite': '<composite-style>#',
        '-webkit-mask-image': '<mask-reference>#',
        '-webkit-mask-origin': '[<box>|border|padding|content]#',
        '-webkit-mask-position': '<position>#',
        '-webkit-mask-position-x': '[<length-percentage>|left|center|right]#',
        '-webkit-mask-position-y': '[<length-percentage>|top|center|bottom]#',
        '-webkit-mask-repeat': '<repeat-style>#',
        '-webkit-mask-repeat-x': 'repeat|no-repeat|space|round',
        '-webkit-mask-repeat-y': 'repeat|no-repeat|space|round',
        '-webkit-mask-size': '<bg-size>#',
        '-webkit-overflow-scrolling': 'auto|touch',
        '-webkit-tap-highlight-color': '<color>',
        '-webkit-text-fill-color': '<color>',
        '-webkit-text-stroke': '<length>||<color>',
        '-webkit-text-stroke-color': '<color>',
        '-webkit-text-stroke-width': '<length>',
        '-webkit-touch-callout': 'default|none',
        '-webkit-user-modify': 'read-only|read-write|read-write-plaintext-only',
        'accent-color': 'auto|<color>',
        'align-content':
            'normal|<baseline-position>|<content-distribution>|<overflow-position>? <content-position>',
        'align-items': 'normal|stretch|<baseline-position>|[<overflow-position>? <self-position>]',
        'align-self':
            'auto|normal|stretch|<baseline-position>|<overflow-position>? <self-position>',
        'align-tracks':
            '[normal|<baseline-position>|<content-distribution>|<overflow-position>? <content-position>]#',
        all: 'initial|inherit|unset|revert|revert-layer',
        'anchor-name': 'none|<dashed-ident>#',
        'anchor-scope': 'none|all|<dashed-ident>#',
        animation: '<single-animation>#',
        'animation-composition': '<single-animation-composition>#',
        'animation-delay': '<time>#',
        'animation-direction': '<single-animation-direction>#',
        'animation-duration': '<time>#',
        'animation-fill-mode': '<single-animation-fill-mode>#',
        'animation-iteration-count': '<single-animation-iteration-count>#',
        'animation-name': '[none|<keyframes-name>]#',
        'animation-play-state': '<single-animation-play-state>#',
        'animation-range': "[<'animation-range-start'> <'animation-range-end'>?]#",
        'animation-range-end':
            '[normal|<length-percentage>|<timeline-range-name> <length-percentage>?]#',
        'animation-range-start':
            '[normal|<length-percentage>|<timeline-range-name> <length-percentage>?]#',
        'animation-timing-function': '<easing-function>#',
        'animation-timeline': '<single-animation-timeline>#',
        appearance: 'none|auto|textfield|menulist-button|<compat-auto>',
        'aspect-ratio': 'auto||<ratio>',
        azimuth:
            '<angle>|[[left-side|far-left|left|center-left|center|center-right|right|far-right|right-side]||behind]|leftwards|rightwards',
        'backdrop-filter': 'none|<filter-function-list>',
        'backface-visibility': 'visible|hidden',
        background: '[<bg-layer> ,]* <final-bg-layer>',
        'background-attachment': '<attachment>#',
        'background-blend-mode': '<blend-mode>#',
        'background-clip': '<bg-clip>#',
        'background-color': '<color>',
        'background-image': '<bg-image>#',
        'background-origin': '<box>#',
        'background-position': '<bg-position>#',
        'background-position-x': '[center|[[left|right|x-start|x-end]? <length-percentage>?]!]#',
        'background-position-y': '[center|[[top|bottom|y-start|y-end]? <length-percentage>?]!]#',
        'background-repeat': '<repeat-style>#',
        'background-size': '<bg-size>#',
        'block-size': "<'width'>",
        border: '<line-width>||<line-style>||<color>',
        'border-block': "<'border-top-width'>||<'border-top-style'>||<color>",
        'border-block-color': "<'border-top-color'>{1,2}",
        'border-block-style': "<'border-top-style'>",
        'border-block-width': "<'border-top-width'>",
        'border-block-end': "<'border-top-width'>||<'border-top-style'>||<color>",
        'border-block-end-color': "<'border-top-color'>",
        'border-block-end-style': "<'border-top-style'>",
        'border-block-end-width': "<'border-top-width'>",
        'border-block-start': "<'border-top-width'>||<'border-top-style'>||<color>",
        'border-block-start-color': "<'border-top-color'>",
        'border-block-start-style': "<'border-top-style'>",
        'border-block-start-width': "<'border-top-width'>",
        'border-bottom': '<line-width>||<line-style>||<color>',
        'border-bottom-color': "<'border-top-color'>",
        'border-bottom-left-radius': '<length-percentage>{1,2}',
        'border-bottom-right-radius': '<length-percentage>{1,2}',
        'border-bottom-style': '<line-style>',
        'border-bottom-width': '<line-width>',
        'border-collapse': 'collapse|separate',
        'border-color': '<color>{1,4}',
        'border-end-end-radius': '<length-percentage>{1,2}',
        'border-end-start-radius': '<length-percentage>{1,2}',
        'border-image':
            "<'border-image-source'>||<'border-image-slice'> [/ <'border-image-width'>|/ <'border-image-width'>? / <'border-image-outset'>]?||<'border-image-repeat'>",
        'border-image-outset': '[<length>|<number>]{1,4}',
        'border-image-repeat': '[stretch|repeat|round|space]{1,2}',
        'border-image-slice': '<number-percentage>{1,4}&&fill?',
        'border-image-source': 'none|<image>',
        'border-image-width': '[<length-percentage>|<number>|auto]{1,4}',
        'border-inline': "<'border-top-width'>||<'border-top-style'>||<color>",
        'border-inline-end': "<'border-top-width'>||<'border-top-style'>||<color>",
        'border-inline-color': "<'border-top-color'>{1,2}",
        'border-inline-style': "<'border-top-style'>",
        'border-inline-width': "<'border-top-width'>",
        'border-inline-end-color': "<'border-top-color'>",
        'border-inline-end-style': "<'border-top-style'>",
        'border-inline-end-width': "<'border-top-width'>",
        'border-inline-start': "<'border-top-width'>||<'border-top-style'>||<color>",
        'border-inline-start-color': "<'border-top-color'>",
        'border-inline-start-style': "<'border-top-style'>",
        'border-inline-start-width': "<'border-top-width'>",
        'border-left': '<line-width>||<line-style>||<color>',
        'border-left-color': '<color>',
        'border-left-style': '<line-style>',
        'border-left-width': '<line-width>',
        'border-radius': '<length-percentage>{1,4} [/ <length-percentage>{1,4}]?',
        'border-right': '<line-width>||<line-style>||<color>',
        'border-right-color': '<color>',
        'border-right-style': '<line-style>',
        'border-right-width': '<line-width>',
        'border-spacing': '<length> <length>?',
        'border-start-end-radius': '<length-percentage>{1,2}',
        'border-start-start-radius': '<length-percentage>{1,2}',
        'border-style': '<line-style>{1,4}',
        'border-top': '<line-width>||<line-style>||<color>',
        'border-top-color': '<color>',
        'border-top-left-radius': '<length-percentage>{1,2}',
        'border-top-right-radius': '<length-percentage>{1,2}',
        'border-top-style': '<line-style>',
        'border-top-width': '<line-width>',
        'border-width': '<line-width>{1,4}',
        bottom: '<length>|<percentage>|auto',
        'box-align': 'start|center|end|baseline|stretch',
        'box-decoration-break': 'slice|clone',
        'box-direction': 'normal|reverse|inherit',
        'box-flex': '<number>',
        'box-flex-group': '<integer>',
        'box-lines': 'single|multiple',
        'box-ordinal-group': '<integer>',
        'box-orient': 'horizontal|vertical|inline-axis|block-axis|inherit',
        'box-pack': 'start|center|end|justify',
        'box-shadow': 'none|<shadow>#',
        'box-sizing': 'content-box|border-box',
        'break-after':
            'auto|avoid|always|all|avoid-page|page|left|right|recto|verso|avoid-column|column|avoid-region|region',
        'break-before':
            'auto|avoid|always|all|avoid-page|page|left|right|recto|verso|avoid-column|column|avoid-region|region',
        'break-inside': 'auto|avoid|avoid-page|avoid-column|avoid-region',
        'caption-side': 'top|bottom|block-start|block-end|inline-start|inline-end',
        caret: "<'caret-color'>||<'caret-shape'>",
        'caret-color': 'auto|<color>',
        'caret-shape': 'auto|bar|block|underscore',
        clear: 'none|left|right|both|inline-start|inline-end',
        clip: '<shape>|auto',
        'clip-path': '<clip-source>|[<basic-shape>||<geometry-box>]|none',
        'clip-rule': 'nonzero|evenodd',
        color: '<color>',
        'color-interpolation-filters': 'auto|sRGB|linearRGB',
        'color-scheme': 'normal|[light|dark|<custom-ident>]+&&only?',
        'column-count': '<integer>|auto',
        'column-fill': 'auto|balance',
        'column-gap': 'normal|<length-percentage>',
        'column-rule': "<'column-rule-width'>||<'column-rule-style'>||<'column-rule-color'>",
        'column-rule-color': '<color>',
        'column-rule-style': "<'border-style'>",
        'column-rule-width': "<'border-width'>",
        'column-span': 'none|all',
        'column-width': '<length>|auto',
        columns: "<'column-width'>||<'column-count'>",
        contain: 'none|strict|content|[[size||inline-size]||layout||style||paint]',
        'contain-intrinsic-size': '[auto? [none|<length>]]{1,2}',
        'contain-intrinsic-block-size': 'auto? [none|<length>]',
        'contain-intrinsic-height': 'auto? [none|<length>]',
        'contain-intrinsic-inline-size': 'auto? [none|<length>]',
        'contain-intrinsic-width': 'auto? [none|<length>]',
        container: "<'container-name'> [/ <'container-type'>]?",
        'container-name': 'none|<custom-ident>+',
        'container-type': 'normal||[size|inline-size]',
        content: 'normal|none|[<content-replacement>|<content-list>] [/ [<string>|<counter>]+]?',
        'content-visibility': 'visible|auto|hidden',
        'counter-increment': '[<counter-name> <integer>?]+|none',
        'counter-reset': '[<counter-name> <integer>?|<reversed-counter-name> <integer>?]+|none',
        'counter-set': '[<counter-name> <integer>?]+|none',
        cursor: '[[<url> [<x> <y>]? ,]* [auto|default|none|context-menu|help|pointer|progress|wait|cell|crosshair|text|vertical-text|alias|copy|move|no-drop|not-allowed|e-resize|n-resize|ne-resize|nw-resize|s-resize|se-resize|sw-resize|w-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|col-resize|row-resize|all-scroll|zoom-in|zoom-out|grab|grabbing|hand|-webkit-grab|-webkit-grabbing|-webkit-zoom-in|-webkit-zoom-out|-moz-grab|-moz-grabbing|-moz-zoom-in|-moz-zoom-out]]',
        d: 'none|path( <string> )',
        cx: '<length>|<percentage>',
        cy: '<length>|<percentage>',
        direction: 'ltr|rtl',
        display:
            '[<display-outside>||<display-inside>]|<display-listitem>|<display-internal>|<display-box>|<display-legacy>|<-non-standard-display>',
        'dominant-baseline':
            'auto|use-script|no-change|reset-size|ideographic|alphabetic|hanging|mathematical|central|middle|text-after-edge|text-before-edge',
        'empty-cells': 'show|hide',
        'field-sizing': 'content|fixed',
        fill: '<paint>',
        'fill-opacity': '<number-zero-one>',
        'fill-rule': 'nonzero|evenodd',
        filter: 'none|<filter-function-list>|<-ms-filter-function-list>',
        flex: "none|[<'flex-grow'> <'flex-shrink'>?||<'flex-basis'>]",
        'flex-basis': "content|<'width'>",
        'flex-direction': 'row|row-reverse|column|column-reverse',
        'flex-flow': "<'flex-direction'>||<'flex-wrap'>",
        'flex-grow': '<number>',
        'flex-shrink': '<number>',
        'flex-wrap': 'nowrap|wrap|wrap-reverse',
        float: 'left|right|none|inline-start|inline-end',
        font: "[[<'font-style'>||<font-variant-css2>||<'font-weight'>||<font-width-css3>]? <'font-size'> [/ <'line-height'>]? <'font-family'>#]|<system-family-name>|<-non-standard-font>",
        'font-family': '[<family-name>|<generic-family>]#',
        'font-feature-settings': 'normal|<feature-tag-value>#',
        'font-kerning': 'auto|normal|none',
        'font-language-override': 'normal|<string>',
        'font-optical-sizing': 'auto|none',
        'font-palette': 'normal|light|dark|<palette-identifier>',
        'font-variation-settings': 'normal|[<string> <number>]#',
        'font-size': '<absolute-size>|<relative-size>|<length-percentage>',
        'font-size-adjust':
            'none|[ex-height|cap-height|ch-width|ic-width|ic-height]? [from-font|<number>]',
        'font-smooth': 'auto|never|always|<absolute-size>|<length>',
        'font-stretch': '<font-stretch-absolute>',
        'font-style': 'normal|italic|oblique <angle>?',
        'font-synthesis': 'none|[weight||style||small-caps||position]',
        'font-synthesis-position': 'auto|none',
        'font-synthesis-small-caps': 'auto|none',
        'font-synthesis-style': 'auto|none',
        'font-synthesis-weight': 'auto|none',
        'font-variant':
            'normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>||stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )||[small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps]||<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero||<east-asian-variant-values>||<east-asian-width-values>||ruby]',
        'font-variant-alternates':
            'normal|[stylistic( <feature-value-name> )||historical-forms||styleset( <feature-value-name># )||character-variant( <feature-value-name># )||swash( <feature-value-name> )||ornaments( <feature-value-name> )||annotation( <feature-value-name> )]',
        'font-variant-caps':
            'normal|small-caps|all-small-caps|petite-caps|all-petite-caps|unicase|titling-caps',
        'font-variant-east-asian':
            'normal|[<east-asian-variant-values>||<east-asian-width-values>||ruby]',
        'font-variant-emoji': 'normal|text|emoji|unicode',
        'font-variant-ligatures':
            'normal|none|[<common-lig-values>||<discretionary-lig-values>||<historical-lig-values>||<contextual-alt-values>]',
        'font-variant-numeric':
            'normal|[<numeric-figure-values>||<numeric-spacing-values>||<numeric-fraction-values>||ordinal||slashed-zero]',
        'font-variant-position': 'normal|sub|super',
        'font-weight': '<font-weight-absolute>|bolder|lighter',
        'forced-color-adjust': 'auto|none|preserve-parent-color',
        gap: "<'row-gap'> <'column-gap'>?",
        grid: "<'grid-template'>|<'grid-template-rows'> / [auto-flow&&dense?] <'grid-auto-columns'>?|[auto-flow&&dense?] <'grid-auto-rows'>? / <'grid-template-columns'>",
        'grid-area': '<grid-line> [/ <grid-line>]{0,3}',
        'grid-auto-columns': '<track-size>+',
        'grid-auto-flow': '[row|column]||dense',
        'grid-auto-rows': '<track-size>+',
        'grid-column': '<grid-line> [/ <grid-line>]?',
        'grid-column-end': '<grid-line>',
        'grid-column-gap': '<length-percentage>',
        'grid-column-start': '<grid-line>',
        'grid-gap': "<'grid-row-gap'> <'grid-column-gap'>?",
        'grid-row': '<grid-line> [/ <grid-line>]?',
        'grid-row-end': '<grid-line>',
        'grid-row-gap': '<length-percentage>',
        'grid-row-start': '<grid-line>',
        'grid-template':
            "none|[<'grid-template-rows'> / <'grid-template-columns'>]|[<line-names>? <string> <track-size>? <line-names>?]+ [/ <explicit-track-list>]?",
        'grid-template-areas': 'none|<string>+',
        'grid-template-columns': 'none|<track-list>|<auto-track-list>|subgrid <line-name-list>?',
        'grid-template-rows': 'none|<track-list>|<auto-track-list>|subgrid <line-name-list>?',
        'hanging-punctuation': 'none|[first||[force-end|allow-end]||last]',
        height: 'auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>',
        'hyphenate-character': 'auto|<string>',
        'hyphenate-limit-chars': '[auto|<integer>]{1,3}',
        hyphens: 'none|manual|auto',
        'image-orientation': 'from-image|<angle>|[<angle>? flip]',
        'image-rendering':
            'auto|crisp-edges|pixelated|optimizeSpeed|optimizeQuality|<-non-standard-image-rendering>',
        'image-resolution': '[from-image||<resolution>]&&snap?',
        'ime-mode': 'auto|normal|active|inactive|disabled',
        'initial-letter': 'normal|[<number> <integer>?]',
        'initial-letter-align': '[auto|alphabetic|hanging|ideographic]',
        'inline-size': "<'width'>",
        'input-security': 'auto|none',
        inset: "<'top'>{1,4}",
        'inset-block': "<'top'>{1,2}",
        'inset-block-end': "<'top'>",
        'inset-block-start': "<'top'>",
        'inset-inline': "<'top'>{1,2}",
        'inset-inline-end': "<'top'>",
        'inset-inline-start': "<'top'>",
        'interpolate-size': 'numeric-only|allow-keywords',
        isolation: 'auto|isolate',
        'justify-content':
            'normal|<content-distribution>|<overflow-position>? [<content-position>|left|right]',
        'justify-items':
            'normal|stretch|<baseline-position>|<overflow-position>? [<self-position>|left|right]|legacy|legacy&&[left|right|center]',
        'justify-self':
            'auto|normal|stretch|<baseline-position>|<overflow-position>? [<self-position>|left|right]',
        'justify-tracks':
            '[normal|<content-distribution>|<overflow-position>? [<content-position>|left|right]]#',
        left: '<length>|<percentage>|auto',
        'letter-spacing': 'normal|<length-percentage>',
        'line-break': 'auto|loose|normal|strict|anywhere',
        'line-clamp': 'none|<integer>',
        'line-height': 'normal|<number>|<length>|<percentage>',
        'line-height-step': '<length>',
        'list-style': "<'list-style-type'>||<'list-style-position'>||<'list-style-image'>",
        'list-style-image': '<image>|none',
        'list-style-position': 'inside|outside',
        'list-style-type': '<counter-style>|<string>|none',
        margin: '[<length>|<percentage>|auto]{1,4}',
        'margin-block': "<'margin-left'>{1,2}",
        'margin-block-end': "<'margin-left'>",
        'margin-block-start': "<'margin-left'>",
        'margin-bottom': '<length>|<percentage>|auto',
        'margin-inline': "<'margin-left'>{1,2}",
        'margin-inline-end': "<'margin-left'>",
        'margin-inline-start': "<'margin-left'>",
        'margin-left': '<length>|<percentage>|auto',
        'margin-right': '<length>|<percentage>|auto',
        'margin-top': '<length>|<percentage>|auto',
        'margin-trim': 'none|in-flow|all',
        marker: 'none|<url>',
        'marker-end': 'none|<url>',
        'marker-mid': 'none|<url>',
        'marker-start': 'none|<url>',
        mask: '<mask-layer>#',
        'mask-border':
            "<'mask-border-source'>||<'mask-border-slice'> [/ <'mask-border-width'>? [/ <'mask-border-outset'>]?]?||<'mask-border-repeat'>||<'mask-border-mode'>",
        'mask-border-mode': 'luminance|alpha',
        'mask-border-outset': '[<length>|<number>]{1,4}',
        'mask-border-repeat': '[stretch|repeat|round|space]{1,2}',
        'mask-border-slice': '<number-percentage>{1,4} fill?',
        'mask-border-source': 'none|<image>',
        'mask-border-width': '[<length-percentage>|<number>|auto]{1,4}',
        'mask-clip': '[<geometry-box>|no-clip]#',
        'mask-composite': '<compositing-operator>#',
        'mask-image': '<mask-reference>#',
        'mask-mode': '<masking-mode>#',
        'mask-origin': '<geometry-box>#',
        'mask-position': '<position>#',
        'mask-repeat': '<repeat-style>#',
        'mask-size': '<bg-size>#',
        'mask-type': 'luminance|alpha',
        'masonry-auto-flow': '[pack|next]||[definite-first|ordered]',
        'math-depth': 'auto-add|add( <integer> )|<integer>',
        'math-shift': 'normal|compact',
        'math-style': 'normal|compact',
        'max-block-size': "<'max-width'>",
        'max-height':
            'none|<length-percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>',
        'max-inline-size': "<'max-width'>",
        'max-lines': 'none|<integer>',
        'max-width':
            'none|<length-percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>',
        'min-block-size': "<'min-width'>",
        'min-height':
            'auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>',
        'min-inline-size': "<'min-width'>",
        'min-width':
            'auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>',
        'mix-blend-mode': '<blend-mode>|plus-lighter',
        'object-fit': 'fill|contain|cover|none|scale-down',
        'object-position': '<position>',
        offset: "[<'offset-position'>? [<'offset-path'> [<'offset-distance'>||<'offset-rotate'>]?]?]! [/ <'offset-anchor'>]?",
        'offset-anchor': 'auto|<position>',
        'offset-distance': '<length-percentage>',
        'offset-path': 'none|<offset-path>||<coord-box>',
        'offset-position': 'normal|auto|<position>',
        'offset-rotate': '[auto|reverse]||<angle>',
        opacity: '<alpha-value>',
        order: '<integer>',
        orphans: '<integer>',
        outline: "[<'outline-width'>||<'outline-style'>||<'outline-color'>]",
        'outline-color': 'auto|<color>',
        'outline-offset': '<length>',
        'outline-style': "auto|<'border-style'>",
        'outline-width': '<line-width>',
        overflow: '[visible|hidden|clip|scroll|auto]{1,2}|<-non-standard-overflow>',
        'overflow-anchor': 'auto|none',
        'overflow-block': 'visible|hidden|clip|scroll|auto',
        'overflow-clip-box': 'padding-box|content-box',
        'overflow-clip-margin': '<visual-box>||<length [0,∞]>',
        'overflow-inline': 'visible|hidden|clip|scroll|auto',
        'overflow-wrap': 'normal|break-word|anywhere',
        'overflow-x': 'visible|hidden|clip|scroll|auto',
        'overflow-y': 'visible|hidden|clip|scroll|auto',
        overlay: 'none|auto',
        'overscroll-behavior': '[contain|none|auto]{1,2}',
        'overscroll-behavior-block': 'contain|none|auto',
        'overscroll-behavior-inline': 'contain|none|auto',
        'overscroll-behavior-x': 'contain|none|auto',
        'overscroll-behavior-y': 'contain|none|auto',
        padding: '[<length>|<percentage>]{1,4}',
        'padding-block': "<'padding-left'>{1,2}",
        'padding-block-end': "<'padding-left'>",
        'padding-block-start': "<'padding-left'>",
        'padding-bottom': '<length>|<percentage>',
        'padding-inline': "<'padding-left'>{1,2}",
        'padding-inline-end': "<'padding-left'>",
        'padding-inline-start': "<'padding-left'>",
        'padding-left': '<length>|<percentage>',
        'padding-right': '<length>|<percentage>',
        'padding-top': '<length>|<percentage>',
        page: 'auto|<custom-ident>',
        'page-break-after': 'auto|always|avoid|left|right|recto|verso',
        'page-break-before': 'auto|always|avoid|left|right|recto|verso',
        'page-break-inside': 'auto|avoid',
        'paint-order': 'normal|[fill||stroke||markers]',
        perspective: 'none|<length>',
        'perspective-origin': '<position>',
        'place-content': "<'align-content'> <'justify-content'>?",
        'place-items': "<'align-items'> <'justify-items'>?",
        'place-self': "<'align-self'> <'justify-self'>?",
        'pointer-events':
            'auto|none|visiblePainted|visibleFill|visibleStroke|visible|painted|fill|stroke|all|inherit',
        position: 'static|relative|absolute|sticky|fixed|-webkit-sticky',
        'position-anchor': 'auto|<anchor-name>',
        'position-area': 'none|<position-area>',
        'position-try': "<'position-try-order'>? <'position-try-fallbacks'>",
        'position-try-fallbacks': "none|[[<dashed-ident>||<try-tactic>]|<'position-area'>]#",
        'position-try-order': 'normal|<try-size>',
        'position-visibility': 'always|[anchors-valid||anchors-visible||no-overflow]',
        'print-color-adjust': 'economy|exact',
        quotes: 'none|auto|[<string> <string>]+',
        r: '<length>|<percentage>',
        resize: 'none|both|horizontal|vertical|block|inline',
        right: '<length>|<percentage>|auto',
        rotate: 'none|<angle>|[x|y|z|<number>{3}]&&<angle>',
        'row-gap': 'normal|<length-percentage>',
        'ruby-align': 'start|center|space-between|space-around',
        'ruby-merge': 'separate|collapse|auto',
        'ruby-position': '[alternate||[over|under]]|inter-character',
        rx: '<length>|<percentage>',
        ry: '<length>|<percentage>',
        scale: 'none|[<number>|<percentage>]{1,3}',
        'scrollbar-color': 'auto|<color>{2}',
        'scrollbar-gutter': 'auto|stable&&both-edges?',
        'scrollbar-width': 'auto|thin|none',
        'scroll-behavior': 'auto|smooth',
        'scroll-margin': '<length>{1,4}',
        'scroll-margin-block': '<length>{1,2}',
        'scroll-margin-block-start': '<length>',
        'scroll-margin-block-end': '<length>',
        'scroll-margin-bottom': '<length>',
        'scroll-margin-inline': '<length>{1,2}',
        'scroll-margin-inline-start': '<length>',
        'scroll-margin-inline-end': '<length>',
        'scroll-margin-left': '<length>',
        'scroll-margin-right': '<length>',
        'scroll-margin-top': '<length>',
        'scroll-padding': '[auto|<length-percentage>]{1,4}',
        'scroll-padding-block': '[auto|<length-percentage>]{1,2}',
        'scroll-padding-block-start': 'auto|<length-percentage>',
        'scroll-padding-block-end': 'auto|<length-percentage>',
        'scroll-padding-bottom': 'auto|<length-percentage>',
        'scroll-padding-inline': '[auto|<length-percentage>]{1,2}',
        'scroll-padding-inline-start': 'auto|<length-percentage>',
        'scroll-padding-inline-end': 'auto|<length-percentage>',
        'scroll-padding-left': 'auto|<length-percentage>',
        'scroll-padding-right': 'auto|<length-percentage>',
        'scroll-padding-top': 'auto|<length-percentage>',
        'scroll-snap-align': '[none|start|end|center]{1,2}',
        'scroll-snap-coordinate': 'none|<position>#',
        'scroll-snap-destination': '<position>',
        'scroll-snap-points-x': 'none|repeat( <length-percentage> )',
        'scroll-snap-points-y': 'none|repeat( <length-percentage> )',
        'scroll-snap-stop': 'normal|always',
        'scroll-snap-type': 'none|[x|y|block|inline|both] [mandatory|proximity]?',
        'scroll-snap-type-x': 'none|mandatory|proximity',
        'scroll-snap-type-y': 'none|mandatory|proximity',
        'scroll-timeline': "[<'scroll-timeline-name'>||<'scroll-timeline-axis'>]#",
        'scroll-timeline-axis': '[block|inline|x|y]#',
        'scroll-timeline-name': '[none|<dashed-ident>]#',
        'shape-image-threshold': '<alpha-value>',
        'shape-margin': '<length-percentage>',
        'shape-outside': 'none|[<shape-box>||<basic-shape>]|<image>',
        'shape-rendering': 'auto|optimizeSpeed|crispEdges|geometricPrecision',
        stroke: '<paint>',
        'stroke-dasharray': 'none|[<svg-length>+]#',
        'stroke-dashoffset': '<svg-length>',
        'stroke-linecap': 'butt|round|square',
        'stroke-linejoin': 'miter|round|bevel',
        'stroke-miterlimit': '<number-one-or-greater>',
        'stroke-opacity': "<'opacity'>",
        'stroke-width': '<svg-length>',
        'tab-size': '<integer>|<length>',
        'table-layout': 'auto|fixed',
        'text-align': 'start|end|left|right|center|justify|match-parent',
        'text-align-last': 'auto|start|end|left|right|center|justify',
        'text-anchor': 'start|middle|end',
        'text-combine-upright': 'none|all|[digits <integer>?]',
        'text-decoration':
            "<'text-decoration-line'>||<'text-decoration-style'>||<'text-decoration-color'>||<'text-decoration-thickness'>",
        'text-decoration-color': '<color>',
        'text-decoration-line':
            'none|[underline||overline||line-through||blink]|spelling-error|grammar-error',
        'text-decoration-skip':
            'none|[objects||[spaces|[leading-spaces||trailing-spaces]]||edges||box-decoration]',
        'text-decoration-skip-ink': 'auto|all|none',
        'text-decoration-style': 'solid|double|dotted|dashed|wavy',
        'text-decoration-thickness': 'auto|from-font|<length>|<percentage>',
        'text-emphasis': "<'text-emphasis-style'>||<'text-emphasis-color'>",
        'text-emphasis-color': '<color>',
        'text-emphasis-position': 'auto|[over|under]&&[right|left]?',
        'text-emphasis-style':
            'none|[[filled|open]||[dot|circle|double-circle|triangle|sesame]]|<string>',
        'text-indent': '<length-percentage>&&hanging?&&each-line?',
        'text-justify': 'auto|inter-character|inter-word|none',
        'text-orientation': 'mixed|upright|sideways',
        'text-overflow': '[clip|ellipsis|<string>]{1,2}',
        'text-rendering': 'auto|optimizeSpeed|optimizeLegibility|geometricPrecision',
        'text-shadow': 'none|<shadow-t>#',
        'text-size-adjust': 'none|auto|<percentage>',
        'text-spacing-trim': 'space-all|normal|space-first|trim-start|trim-both|trim-all|auto',
        'text-transform': 'none|capitalize|uppercase|lowercase|full-width|full-size-kana',
        'text-underline-offset': 'auto|<length>|<percentage>',
        'text-underline-position': 'auto|from-font|[under||[left|right]]',
        'text-wrap': "<'text-wrap-mode'>||<'text-wrap-style'>",
        'text-wrap-mode': 'auto|wrap|nowrap',
        'text-wrap-style': 'auto|balance|stable|pretty',
        'timeline-scope': 'none|<dashed-ident>#',
        top: '<length>|<percentage>|auto',
        'touch-action':
            'auto|none|[[pan-x|pan-left|pan-right]||[pan-y|pan-up|pan-down]||pinch-zoom]|manipulation',
        transform: 'none|<transform-list>',
        'transform-box': 'content-box|border-box|fill-box|stroke-box|view-box',
        'transform-origin':
            '[<length-percentage>|left|center|right|top|bottom]|[[<length-percentage>|left|center|right]&&[<length-percentage>|top|center|bottom]] <length>?',
        'transform-style': 'flat|preserve-3d',
        transition: '<single-transition>#',
        'transition-behavior': '<transition-behavior-value>#',
        'transition-delay': '<time>#',
        'transition-duration': '<time>#',
        'transition-property': 'none|<single-transition-property>#',
        'transition-timing-function': '<easing-function>#',
        translate: 'none|<length-percentage> [<length-percentage> <length>?]?',
        'unicode-bidi':
            'normal|embed|isolate|bidi-override|isolate-override|plaintext|-moz-isolate|-moz-isolate-override|-moz-plaintext|-webkit-isolate|-webkit-isolate-override|-webkit-plaintext',
        'user-select': 'auto|text|none|contain|all',
        'vector-effect': 'none|non-scaling-stroke|non-scaling-size|non-rotation|fixed-position',
        'vertical-align':
            'baseline|sub|super|text-top|text-bottom|middle|top|bottom|<percentage>|<length>',
        'view-timeline': "[<'view-timeline-name'> <'view-timeline-axis'>?]#",
        'view-timeline-axis': '[block|inline|x|y]#',
        'view-timeline-inset': '[[auto|<length-percentage>]{1,2}]#',
        'view-timeline-name': 'none|<dashed-ident>#',
        'view-transition-name': 'none|<custom-ident>',
        visibility: 'visible|hidden|collapse',
        'white-space':
            "normal|pre|nowrap|pre-wrap|pre-line|break-spaces|[<'white-space-collapse'>||<'text-wrap'>||<'white-space-trim'>]",
        'white-space-collapse':
            'collapse|discard|preserve|preserve-breaks|preserve-spaces|break-spaces',
        widows: '<integer>',
        width: 'auto|<length>|<percentage>|min-content|max-content|fit-content|fit-content( <length-percentage> )|stretch|<-non-standard-size>',
        'will-change': 'auto|<animateable-feature>#',
        'word-break': 'normal|break-all|keep-all|break-word|auto-phrase',
        'word-spacing': 'normal|<length>',
        'word-wrap': 'normal|break-word',
        'writing-mode':
            'horizontal-tb|vertical-rl|vertical-lr|sideways-rl|sideways-lr|<svg-writing-mode>',
        x: '<length>|<percentage>',
        y: '<length>|<percentage>',
        'z-index': 'auto|<integer>',
        zoom: 'normal|reset|<number>|<percentage>',
        '-moz-background-clip': 'padding|border',
        '-moz-border-radius-bottomleft': "<'border-bottom-left-radius'>",
        '-moz-border-radius-bottomright': "<'border-bottom-right-radius'>",
        '-moz-border-radius-topleft': "<'border-top-left-radius'>",
        '-moz-border-radius-topright': "<'border-bottom-right-radius'>",
        '-moz-control-character-visibility': 'visible|hidden',
        '-moz-osx-font-smoothing': 'auto|grayscale',
        '-moz-user-select': 'none|text|all|-moz-none',
        '-ms-flex-align': 'start|end|center|baseline|stretch',
        '-ms-flex-item-align': 'auto|start|end|center|baseline|stretch',
        '-ms-flex-line-pack': 'start|end|center|justify|distribute|stretch',
        '-ms-flex-negative': "<'flex-shrink'>",
        '-ms-flex-pack': 'start|end|center|justify|distribute',
        '-ms-flex-order': '<integer>',
        '-ms-flex-positive': "<'flex-grow'>",
        '-ms-flex-preferred-size': "<'flex-basis'>",
        '-ms-interpolation-mode': 'nearest-neighbor|bicubic',
        '-ms-grid-column-align': 'start|end|center|stretch',
        '-ms-grid-row-align': 'start|end|center|stretch',
        '-ms-hyphenate-limit-last': 'none|always|column|page|spread',
        '-webkit-background-clip': '[<box>|border|padding|content|text]#',
        '-webkit-column-break-after': 'always|auto|avoid',
        '-webkit-column-break-before': 'always|auto|avoid',
        '-webkit-column-break-inside': 'always|auto|avoid',
        '-webkit-font-smoothing': 'auto|none|antialiased|subpixel-antialiased',
        '-webkit-mask-box-image':
            '[<url>|<gradient>|none] [<length-percentage>{4} <-webkit-mask-box-repeat>{2}]?',
        '-webkit-print-color-adjust': 'economy|exact',
        '-webkit-text-security': 'none|circle|disc|square',
        '-webkit-user-drag': 'none|element|auto',
        '-webkit-user-select': 'auto|none|text|all',
        'alignment-baseline':
            'auto|baseline|before-edge|text-before-edge|middle|central|after-edge|text-after-edge|ideographic|alphabetic|hanging|mathematical',
        'baseline-shift': 'baseline|sub|super|<svg-length>',
        behavior: '<url>+',
        cue: "<'cue-before'> <'cue-after'>?",
        'cue-after': '<url> <decibel>?|none',
        'cue-before': '<url> <decibel>?|none',
        'glyph-orientation-horizontal': '<angle>',
        'glyph-orientation-vertical': '<angle>',
        kerning: 'auto|<svg-length>',
        pause: "<'pause-before'> <'pause-after'>?",
        'pause-after': '<time>|none|x-weak|weak|medium|strong|x-strong',
        'pause-before': '<time>|none|x-weak|weak|medium|strong|x-strong',
        rest: "<'rest-before'> <'rest-after'>?",
        'rest-after': '<time>|none|x-weak|weak|medium|strong|x-strong',
        'rest-before': '<time>|none|x-weak|weak|medium|strong|x-strong',
        src: '[<url> [format( <string># )]?|local( <family-name> )]#',
        speak: 'auto|never|always',
        'speak-as': 'normal|spell-out||digits||[literal-punctuation|no-punctuation]',
        'unicode-range': '<urange>#',
        'voice-balance': '<number>|left|center|right|leftwards|rightwards',
        'voice-duration': 'auto|<time>',
        'voice-family':
            '[[<family-name>|<generic-voice>] ,]* [<family-name>|<generic-voice>]|preserve',
        'voice-pitch':
            '<frequency>&&absolute|[[x-low|low|medium|high|x-high]||[<frequency>|<semitones>|<percentage>]]',
        'voice-range':
            '<frequency>&&absolute|[[x-low|low|medium|high|x-high]||[<frequency>|<semitones>|<percentage>]]',
        'voice-rate': '[normal|x-slow|slow|medium|fast|x-fast]||<percentage>',
        'voice-stress': 'normal|strong|moderate|none|reduced',
        'voice-volume': 'silent|[[x-soft|soft|medium|loud|x-loud]||<decibel>]',
        'white-space-trim': 'none|discard-before||discard-after||discard-inner',
    },
    atrules: {
        charset: { prelude: '<string>', descriptors: null },
        'counter-style': {
            prelude: '<counter-style-name>',
            descriptors: {
                'additive-symbols': '[<integer>&&<symbol>]#',
                fallback: '<counter-style-name>',
                negative: '<symbol> <symbol>?',
                pad: '<integer>&&<symbol>',
                prefix: '<symbol>',
                range: '[[<integer>|infinite]{2}]#|auto',
                'speak-as': 'auto|bullets|numbers|words|spell-out|<counter-style-name>',
                suffix: '<symbol>',
                symbols: '<symbol>+',
                system: 'cyclic|numeric|alphabetic|symbolic|additive|[fixed <integer>?]|[extends <counter-style-name>]',
            },
        },
        document: {
            prelude:
                '[<url>|url-prefix( <string> )|domain( <string> )|media-document( <string> )|regexp( <string> )]#',
            descriptors: null,
        },
        'font-palette-values': {
            prelude: '<dashed-ident>',
            descriptors: {
                'base-palette': 'light|dark|<integer [0,∞]>',
                'font-family': '<family-name>#',
                'override-colors': '[<integer [0,∞]> <absolute-color-base>]#',
            },
        },
        'font-face': {
            prelude: null,
            descriptors: {
                'ascent-override': 'normal|<percentage>',
                'descent-override': 'normal|<percentage>',
                'font-display': '[auto|block|swap|fallback|optional]',
                'font-family': '<family-name>',
                'font-feature-settings': 'normal|<feature-tag-value>#',
                'font-variation-settings': 'normal|[<string> <number>]#',
                'font-stretch': '<font-stretch-absolute>{1,2}',
                'font-style': 'normal|italic|oblique <angle>{0,2}',
                'font-weight': '<font-weight-absolute>{1,2}',
                'line-gap-override': 'normal|<percentage>',
                'size-adjust': '<percentage>',
                src: '[<url> [format( <string># )]?|local( <family-name> )]#',
                'unicode-range': '<urange>#',
            },
        },
        'font-feature-values': { prelude: '<family-name>#', descriptors: null },
        import: {
            prelude:
                '[<string>|<url>] [layer|layer( <layer-name> )]? [supports( [<supports-condition>|<declaration>] )]? <media-query-list>?',
            descriptors: null,
        },
        keyframes: { prelude: '<keyframes-name>', descriptors: null },
        layer: { prelude: '[<layer-name>#|<layer-name>?]', descriptors: null },
        media: { prelude: '<media-query-list>', descriptors: null },
        namespace: { prelude: '<namespace-prefix>? [<string>|<url>]', descriptors: null },
        page: {
            prelude: '<page-selector-list>',
            descriptors: {
                bleed: 'auto|<length>',
                marks: 'none|[crop||cross]',
                'page-orientation': 'upright|rotate-left|rotate-right',
                size: '<length>{1,2}|auto|[<page-size>||[portrait|landscape]]',
            },
        },
        'position-try': {
            prelude: '<dashed-ident>',
            descriptors: {
                top: "<'top'>",
                left: "<'left'>",
                bottom: "<'bottom'>",
                right: "<'right'>",
                'inset-block-start': "<'inset-block-start'>",
                'inset-block-end': "<'inset-block-end'>",
                'inset-inline-start': "<'inset-inline-start'>",
                'inset-inline-end': "<'inset-inline-end'>",
                'inset-block': "<'inset-block'>",
                'inset-inline': "<'inset-inline'>",
                inset: "<'inset'>",
                'margin-top': "<'margin-top'>",
                'margin-left': "<'margin-left'>",
                'margin-bottom': "<'margin-bottom'>",
                'margin-right': "<'margin-right'>",
                'margin-block-start': "<'margin-block-start'>",
                'margin-block-end': "<'margin-block-end'>",
                'margin-inline-start': "<'margin-inline-start'>",
                'margin-inline-end': "<'margin-inline-end'>",
                margin: "<'margin'>",
                'margin-block': "<'margin-block'>",
                'margin-inline': "<'margin-inline'>",
                width: "<'width'>",
                height: "<'height'>",
                'min-width': "<'min-width'>",
                'min-height': "<'min-height'>",
                'max-width': "<'max-width'>",
                'max-height': "<'max-height'>",
                'block-size': "<'block-size'>",
                'inline-size': "<'inline-size'>",
                'min-block-size': "<'min-block-size'>",
                'min-inline-size': "<'min-inline-size'>",
                'max-block-size': "<'max-block-size'>",
                'max-inline-size': "<'max-inline-size'>",
                'align-self': "<'align-self'>|anchor-center",
                'justify-self': "<'justify-self'>|anchor-center",
            },
        },
        property: {
            prelude: '<custom-property-name>',
            descriptors: {
                syntax: '<string>',
                inherits: 'true|false',
                'initial-value': '<declaration-value>?',
            },
        },
        scope: { prelude: '[( <scope-start> )]? [to ( <scope-end> )]?', descriptors: null },
        'starting-style': { prelude: null, descriptors: null },
        supports: { prelude: '<supports-condition>', descriptors: null },
        container: { prelude: '[<container-name>]? <container-condition>', descriptors: null },
        nest: { prelude: '<complex-selector-list>', descriptors: null },
    },
};
var Bt = {};
D(Bt, {
    WhiteSpace: () => Hb,
    Value: () => Vb,
    Url: () => Rb,
    UnicodeRange: () => Gb,
    TypeSelector: () => Yb,
    SupportsDeclaration: () => Wb,
    StyleSheet: () => Jb,
    String: () => $b,
    SelectorList: () => vb,
    Selector: () => ab,
    Scope: () => zb,
    Rule: () => pb,
    Raw: () => mb,
    Ratio: () => hb,
    PseudoElementSelector: () => gb,
    PseudoClassSelector: () => bb,
    Percentage: () => nb,
    Parentheses: () => tb,
    Operator: () => lb,
    Number: () => To,
    Nth: () => Po,
    NestingSelector: () => No,
    MediaQueryList: () => ko,
    MediaQuery: () => Ao,
    LayerList: () => Mo,
    Layer: () => Ko,
    Identifier: () => Bo,
    IdSelector: () => Fo,
    Hash: () => Go,
    GeneralEnclosed: () => Qo,
    Function: () => so,
    FeatureRange: () => Wo,
    FeatureFunction: () => qo,
    Feature: () => Do,
    Dimension: () => vo,
    DeclarationList: () => ao,
    Declaration: () => uo,
    Condition: () => wo,
    Comment: () => co,
    Combinator: () => eo,
    ClassSelector: () => fo,
    CDO: () => oo,
    CDC: () => ro,
    Brackets: () => io,
    Block: () => dn,
    AttributeSelector: () => Tn,
    AtrulePrelude: () => Cn,
    Atrule: () => Sn,
    AnPlusB: () => Un,
});
var Un = {};
D(Un, { structure: () => Ip, parse: () => An, name: () => Pp, generate: () => Tp });
var kl = 43,
    Xl = 45,
    Dr = 110,
    Oi = !0,
    Cp = !1;
function $r(l, i) {
    let t = this.tokenStart + l,
        r = this.charCodeAt(t);
    if (r === kl || r === Xl) {
        if (i) this.error('Number sign is not allowed');
        t++;
    }
    for (; t < this.tokenEnd; t++)
        if (!ol(this.charCodeAt(t))) this.error('Integer is expected', t);
}
function Si(l) {
    return $r.call(this, 0, l);
}
function hi(l, i) {
    if (!this.cmpChar(this.tokenStart + l, i)) {
        let t = '';
        switch (i) {
            case Dr:
                t = 'N is expected';
                break;
            case Xl:
                t = 'HyphenMinus is expected';
                break;
        }
        this.error(t, this.tokenStart + l);
    }
}
function yn() {
    let l = 0,
        i = 0,
        t = this.tokenType;
    while (t === Y || t === U) t = this.lookupType(++l);
    if (t !== v)
        if (this.isDelim(kl, l) || this.isDelim(Xl, l)) {
            i = this.isDelim(kl, l) ? kl : Xl;
            do t = this.lookupType(++l);
            while (t === Y || t === U);
            if (t !== v) this.skip(l), Si.call(this, Oi);
        } else return null;
    if (l > 0) this.skip(l);
    if (i === 0) {
        if (((t = this.charCodeAt(this.tokenStart)), t !== kl && t !== Xl))
            this.error('Number sign is expected');
    }
    return Si.call(this, i !== 0), i === Xl ? '-' + this.consume(v) : this.consume(v);
}
var Pp = 'AnPlusB',
    Ip = { a: [String, null], b: [String, null] };
function An() {
    let l = this.tokenStart,
        i = null,
        t = null;
    if (this.tokenType === v) Si.call(this, Cp), (t = this.consume(v));
    else if (this.tokenType === w && this.cmpChar(this.tokenStart, Xl))
        switch (((i = '-1'), hi.call(this, 1, Dr), this.tokenEnd - this.tokenStart)) {
            case 2:
                this.next(), (t = yn.call(this));
                break;
            case 3:
                hi.call(this, 2, Xl),
                    this.next(),
                    this.skipSC(),
                    Si.call(this, Oi),
                    (t = '-' + this.consume(v));
                break;
            default:
                hi.call(this, 2, Xl),
                    $r.call(this, 3, Oi),
                    this.next(),
                    (t = this.substrToCursor(l + 2));
        }
    else if (this.tokenType === w || (this.isDelim(kl) && this.lookupType(1) === w)) {
        let r = 0;
        if (((i = '1'), this.isDelim(kl))) (r = 1), this.next();
        switch ((hi.call(this, 0, Dr), this.tokenEnd - this.tokenStart)) {
            case 1:
                this.next(), (t = yn.call(this));
                break;
            case 2:
                hi.call(this, 1, Xl),
                    this.next(),
                    this.skipSC(),
                    Si.call(this, Oi),
                    (t = '-' + this.consume(v));
                break;
            default:
                hi.call(this, 1, Xl),
                    $r.call(this, 2, Oi),
                    this.next(),
                    (t = this.substrToCursor(l + r + 1));
        }
    } else if (this.tokenType === j) {
        let r = this.charCodeAt(this.tokenStart),
            n = r === kl || r === Xl,
            o = this.tokenStart + n;
        for (; o < this.tokenEnd; o++) if (!ol(this.charCodeAt(o))) break;
        if (o === this.tokenStart + n) this.error('Integer is expected', this.tokenStart + n);
        if (
            (hi.call(this, o - this.tokenStart, Dr),
            (i = this.substring(l, o)),
            o + 1 === this.tokenEnd)
        )
            this.next(), (t = yn.call(this));
        else if ((hi.call(this, o - this.tokenStart + 1, Xl), o + 2 === this.tokenEnd))
            this.next(), this.skipSC(), Si.call(this, Oi), (t = '-' + this.consume(v));
        else
            $r.call(this, o - this.tokenStart + 2, Oi),
                this.next(),
                (t = this.substrToCursor(o + 1));
    } else this.error();
    if (i !== null && i.charCodeAt(0) === kl) i = i.substr(1);
    if (t !== null && t.charCodeAt(0) === kl) t = t.substr(1);
    return { type: 'AnPlusB', loc: this.getLocation(l, this.tokenStart), a: i, b: t };
}
function Tp(l) {
    if (l.a) {
        let i =
            (l.a === '+1' && 'n') || (l.a === '1' && 'n') || (l.a === '-1' && '-n') || l.a + 'n';
        if (l.b) {
            let t = l.b[0] === '-' || l.b[0] === '+' ? l.b : '+' + l.b;
            this.tokenize(i + t);
        } else this.tokenize(i);
    } else this.tokenize(l.b);
}
var Sn = {};
D(Sn, {
    walkContext: () => lu,
    structure: () => iu,
    parse: () => kn,
    name: () => dp,
    generate: () => tu,
});
function Sg() {
    return this.Raw(this.consumeUntilLeftCurlyBracketOrSemicolon, !0);
}
function Zp() {
    for (let l = 1, i; (i = this.lookupType(l)); l++) {
        if (i === ml) return !0;
        if (i === N || i === S) return !1;
    }
    return !1;
}
var dp = 'Atrule',
    lu = 'atrule',
    iu = { name: String, prelude: ['AtrulePrelude', 'Raw', null], block: ['Block', null] };
function kn(l = !1) {
    let i = this.tokenStart,
        t,
        r,
        n = null,
        o = null;
    if (
        (this.eat(S),
        (t = this.substrToCursor(i + 1)),
        (r = t.toLowerCase()),
        this.skipSC(),
        this.eof === !1 && this.tokenType !== N && this.tokenType !== Z)
    ) {
        if (this.parseAtrulePrelude)
            n = this.parseWithFallback(this.AtrulePrelude.bind(this, t, l), Sg);
        else n = Sg.call(this, this.tokenIndex);
        this.skipSC();
    }
    switch (this.tokenType) {
        case Z:
            this.next();
            break;
        case N:
            if (hasOwnProperty.call(this.atrule, r) && typeof this.atrule[r].block === 'function')
                o = this.atrule[r].block.call(this, l);
            else o = this.Block(Zp.call(this));
            break;
    }
    return {
        type: 'Atrule',
        loc: this.getLocation(i, this.tokenStart),
        name: t,
        prelude: n,
        block: o,
    };
}
function tu(l) {
    if ((this.token(S, '@' + l.name), l.prelude !== null)) this.node(l.prelude);
    if (l.block) this.node(l.block);
    else this.token(Z, ';');
}
var Cn = {};
D(Cn, {
    walkContext: () => nu,
    structure: () => ou,
    parse: () => Nn,
    name: () => ru,
    generate: () => bu,
});
var ru = 'AtrulePrelude',
    nu = 'atrulePrelude',
    ou = { children: [[]] };
function Nn(l) {
    let i = null;
    if (l !== null) l = l.toLowerCase();
    if (
        (this.skipSC(),
        hasOwnProperty.call(this.atrule, l) && typeof this.atrule[l].prelude === 'function')
    )
        i = this.atrule[l].prelude.call(this);
    else i = this.readSequence(this.scope.AtrulePrelude);
    if ((this.skipSC(), this.eof !== !0 && this.tokenType !== N && this.tokenType !== Z))
        this.error('Semicolon or block is expected');
    return { type: 'AtrulePrelude', loc: this.getLocationFromList(i), children: i };
}
function bu(l) {
    this.children(l);
}
var Tn = {};
D(Tn, { structure: () => wu, parse: () => In, name: () => mu, generate: () => pu });
var fu = 36,
    Ng = 42,
    qr = 61,
    gu = 94,
    Pn = 124,
    eu = 126;
function hu() {
    if (this.eof) this.error('Unexpected end of input');
    let l = this.tokenStart,
        i = !1;
    if (this.isDelim(Ng)) (i = !0), this.next();
    else if (!this.isDelim(Pn)) this.eat(w);
    if (this.isDelim(Pn)) {
        if (this.charCodeAt(this.tokenStart + 1) !== qr) this.next(), this.eat(w);
        else if (i) this.error('Identifier is expected', this.tokenEnd);
    } else if (i) this.error('Vertical line is expected');
    return {
        type: 'Identifier',
        loc: this.getLocation(l, this.tokenStart),
        name: this.substrToCursor(l),
    };
}
function cu() {
    let l = this.tokenStart,
        i = this.charCodeAt(l);
    if (i !== qr && i !== eu && i !== gu && i !== fu && i !== Ng && i !== Pn)
        this.error('Attribute selector (=, ~=, ^=, $=, *=, |=) is expected');
    if ((this.next(), i !== qr)) {
        if (!this.isDelim(qr)) this.error('Equal sign is expected');
        this.next();
    }
    return this.substrToCursor(l);
}
var mu = 'AttributeSelector',
    wu = {
        name: 'Identifier',
        matcher: [String, null],
        value: ['String', 'Identifier', null],
        flags: [String, null],
    };
function In() {
    let l = this.tokenStart,
        i,
        t = null,
        r = null,
        n = null;
    if ((this.eat(el), this.skipSC(), (i = hu.call(this)), this.skipSC(), this.tokenType !== pl)) {
        if (this.tokenType !== w)
            (t = cu.call(this)),
                this.skipSC(),
                (r = this.tokenType === gl ? this.String() : this.Identifier()),
                this.skipSC();
        if (this.tokenType === w) (n = this.consume(w)), this.skipSC();
    }
    return (
        this.eat(pl),
        {
            type: 'AttributeSelector',
            loc: this.getLocation(l, this.tokenStart),
            name: i,
            matcher: t,
            value: r,
            flags: n,
        }
    );
}
function pu(l) {
    if ((this.token($, '['), this.node(l.name), l.matcher !== null))
        this.tokenize(l.matcher), this.node(l.value);
    if (l.flags !== null) this.token(w, l.flags);
    this.token($, ']');
}
var dn = {};
D(dn, {
    walkContext: () => au,
    structure: () => _u,
    parse: () => Zn,
    name: () => xu,
    generate: () => vu,
});
var uu = 38;
function Ig() {
    return this.Raw(null, !0);
}
function Cg() {
    return this.parseWithFallback(this.Rule, Ig);
}
function Pg() {
    return this.Raw(this.consumeUntilSemicolonIncluded, !0);
}
function zu() {
    if (this.tokenType === Z) return Pg.call(this, this.tokenIndex);
    let l = this.parseWithFallback(this.Declaration, Pg);
    if (this.tokenType === Z) this.next();
    return l;
}
var xu = 'Block',
    au = 'block',
    _u = { children: [['Atrule', 'Rule', 'Declaration']] };
function Zn(l) {
    let i = l ? zu : Cg,
        t = this.tokenStart,
        r = this.createList();
    this.eat(N);
    l: while (!this.eof)
        switch (this.tokenType) {
            case ml:
                break l;
            case Y:
            case U:
                this.next();
                break;
            case S:
                r.push(this.parseWithFallback(this.Atrule.bind(this, l), Ig));
                break;
            default:
                if (l && this.isDelim(uu)) r.push(Cg.call(this));
                else r.push(i.call(this));
        }
    if (!this.eof) this.eat(ml);
    return { type: 'Block', loc: this.getLocation(t, this.tokenStart), children: r };
}
function vu(l) {
    this.token(N, '{'),
        this.children(l, (i) => {
            if (i.type === 'Declaration') this.token(Z, ';');
        }),
        this.token(ml, '}');
}
var io = {};
D(io, { structure: () => Du, parse: () => lo, name: () => Ou, generate: () => $u });
var Ou = 'Brackets',
    Du = { children: [[]] };
function lo(l, i) {
    let t = this.tokenStart,
        r = null;
    if ((this.eat(el), (r = l.call(this, i)), !this.eof)) this.eat(pl);
    return { type: 'Brackets', loc: this.getLocation(t, this.tokenStart), children: r };
}
function $u(l) {
    this.token($, '['), this.children(l), this.token($, ']');
}
var ro = {};
D(ro, { structure: () => Ju, parse: () => to, name: () => qu, generate: () => Xu });
var qu = 'CDC',
    Ju = [];
function to() {
    let l = this.tokenStart;
    return this.eat(cl), { type: 'CDC', loc: this.getLocation(l, this.tokenStart) };
}
function Xu() {
    this.token(cl, '-->');
}
var oo = {};
D(oo, { structure: () => ju, parse: () => no, name: () => Wu, generate: () => su });
var Wu = 'CDO',
    ju = [];
function no() {
    let l = this.tokenStart;
    return this.eat(Pl), { type: 'CDO', loc: this.getLocation(l, this.tokenStart) };
}
function su() {
    this.token(Pl, '<!--');
}
var fo = {};
D(fo, { structure: () => Eu, parse: () => bo, name: () => Qu, generate: () => Gu });
var Yu = 46,
    Qu = 'ClassSelector',
    Eu = { name: String };
function bo() {
    return (
        this.eatDelim(Yu),
        {
            type: 'ClassSelector',
            loc: this.getLocation(this.tokenStart - 1, this.tokenEnd),
            name: this.consume(w),
        }
    );
}
function Gu(l) {
    this.token($, '.'), this.token(w, l.name);
}
var eo = {};
D(eo, { structure: () => Vu, parse: () => go, name: () => Fu, generate: () => Ku });
var Lu = 43,
    Tg = 47,
    Bu = 62,
    Ru = 126,
    Fu = 'Combinator',
    Vu = { name: String };
function go() {
    let l = this.tokenStart,
        i;
    switch (this.tokenType) {
        case Y:
            i = ' ';
            break;
        case $:
            switch (this.charCodeAt(this.tokenStart)) {
                case Bu:
                case Lu:
                case Ru:
                    this.next();
                    break;
                case Tg:
                    this.next(), this.eatIdent('deep'), this.eatDelim(Tg);
                    break;
                default:
                    this.error('Combinator is expected');
            }
            i = this.substrToCursor(l);
            break;
    }
    return { type: 'Combinator', loc: this.getLocation(l, this.tokenStart), name: i };
}
function Ku(l) {
    this.tokenize(l.name);
}
var co = {};
D(co, { structure: () => Au, parse: () => ho, name: () => yu, generate: () => Uu });
var Hu = 42,
    Mu = 47,
    yu = 'Comment',
    Au = { value: String };
function ho() {
    let l = this.tokenStart,
        i = this.tokenEnd;
    if (
        (this.eat(U),
        i - l + 2 >= 2 && this.charCodeAt(i - 2) === Hu && this.charCodeAt(i - 1) === Mu)
    )
        i -= 2;
    return {
        type: 'Comment',
        loc: this.getLocation(l, this.tokenStart),
        value: this.substring(l + 2, i),
    };
}
function Uu(l) {
    this.token(U, '/*' + l.value + '*/');
}
var wo = {};
D(wo, { structure: () => Nu, parse: () => mo, name: () => Su, generate: () => Pu });
var ku = new Set([P, a, Yl]),
    Su = 'Condition',
    Nu = {
        kind: String,
        children: [
            ['Identifier', 'Feature', 'FeatureFunction', 'FeatureRange', 'SupportsDeclaration'],
        ],
    };
function Zg(l) {
    if (this.lookupTypeNonSC(1) === w && ku.has(this.lookupTypeNonSC(2))) return this.Feature(l);
    return this.FeatureRange(l);
}
var Cu = {
    media: Zg,
    container: Zg,
    supports() {
        return this.SupportsDeclaration();
    },
};
function mo(l = 'media') {
    let i = this.createList();
    l: while (!this.eof)
        switch (this.tokenType) {
            case U:
            case Y:
                this.next();
                continue;
            case w:
                i.push(this.Identifier());
                break;
            case s: {
                let t = this.parseWithFallback(
                    () => Cu[l].call(this, l),
                    () => null,
                );
                if (!t)
                    t = this.parseWithFallback(
                        () => {
                            this.eat(s);
                            let r = this.Condition(l);
                            return this.eat(a), r;
                        },
                        () => {
                            return this.GeneralEnclosed(l);
                        },
                    );
                i.push(t);
                break;
            }
            case _: {
                let t = this.parseWithFallback(
                    () => this.FeatureFunction(l),
                    () => null,
                );
                if (!t) t = this.GeneralEnclosed(l);
                i.push(t);
                break;
            }
            default:
                break l;
        }
    if (i.isEmpty) this.error('Condition is expected');
    return { type: 'Condition', loc: this.getLocationFromList(i), kind: l, children: i };
}
function Pu(l) {
    l.children.forEach((i) => {
        if (i.type === 'Condition') this.token(s, '('), this.node(i), this.token(a, ')');
        else this.node(i);
    });
}
var uo = {};
D(uo, {
    walkContext: () => o1,
    structure: () => b1,
    parse: () => po,
    name: () => n1,
    generate: () => f1,
});
var le = 33,
    Iu = 35,
    Tu = 36,
    Zu = 38,
    du = 42,
    l1 = 43,
    dg = 47;
function i1() {
    return this.Raw(this.consumeUntilExclamationMarkOrSemicolon, !0);
}
function t1() {
    return this.Raw(this.consumeUntilExclamationMarkOrSemicolon, !1);
}
function r1() {
    let l = this.tokenIndex,
        i = this.Value();
    if (
        i.type !== 'Raw' &&
        this.eof === !1 &&
        this.tokenType !== Z &&
        this.isDelim(le) === !1 &&
        this.isBalanceEdge(l) === !1
    )
        this.error();
    return i;
}
var n1 = 'Declaration',
    o1 = 'declaration',
    b1 = { important: [Boolean, String], property: String, value: ['Value', 'Raw'] };
function po() {
    let l = this.tokenStart,
        i = this.tokenIndex,
        t = g1.call(this),
        r = ur(t),
        n = r ? this.parseCustomProperty : this.parseValue,
        o = r ? t1 : i1,
        b = !1,
        g;
    this.skipSC(), this.eat(P);
    let e = this.tokenIndex;
    if (!r) this.skipSC();
    if (n) g = this.parseWithFallback(r1, o);
    else g = o.call(this, this.tokenIndex);
    if (r && g.type === 'Value' && g.children.isEmpty) {
        for (let f = e - this.tokenIndex; f <= 0; f++)
            if (this.lookupType(f) === Y) {
                g.children.appendData({ type: 'WhiteSpace', loc: null, value: ' ' });
                break;
            }
    }
    if (this.isDelim(le)) (b = e1.call(this)), this.skipSC();
    if (this.eof === !1 && this.tokenType !== Z && this.isBalanceEdge(i) === !1) this.error();
    return {
        type: 'Declaration',
        loc: this.getLocation(l, this.tokenStart),
        important: b,
        property: t,
        value: g,
    };
}
function f1(l) {
    if ((this.token(w, l.property), this.token(P, ':'), this.node(l.value), l.important))
        this.token($, '!'), this.token(w, l.important === !0 ? 'important' : l.important);
}
function g1() {
    let l = this.tokenStart;
    if (this.tokenType === $)
        switch (this.charCodeAt(this.tokenStart)) {
            case du:
            case Tu:
            case l1:
            case Iu:
            case Zu:
                this.next();
                break;
            case dg:
                if ((this.next(), this.isDelim(dg))) this.next();
                break;
        }
    if (this.tokenType === R) this.eat(R);
    else this.eat(w);
    return this.substrToCursor(l);
}
function e1() {
    this.eat($), this.skipSC();
    let l = this.consume(w);
    return l === 'important' ? !0 : l;
}
var ao = {};
D(ao, { structure: () => m1, parse: () => xo, name: () => c1, generate: () => w1 });
var h1 = 38;
function zo() {
    return this.Raw(this.consumeUntilSemicolonIncluded, !0);
}
var c1 = 'DeclarationList',
    m1 = { children: [['Declaration', 'Atrule', 'Rule']] };
function xo() {
    let l = this.createList();
    l: while (!this.eof)
        switch (this.tokenType) {
            case Y:
            case U:
            case Z:
                this.next();
                break;
            case S:
                l.push(this.parseWithFallback(this.Atrule.bind(this, !0), zo));
                break;
            default:
                if (this.isDelim(h1)) l.push(this.parseWithFallback(this.Rule, zo));
                else l.push(this.parseWithFallback(this.Declaration, zo));
        }
    return { type: 'DeclarationList', loc: this.getLocationFromList(l), children: l };
}
function w1(l) {
    this.children(l, (i) => {
        if (i.type === 'Declaration') this.token(Z, ';');
    });
}
var vo = {};
D(vo, { structure: () => u1, parse: () => _o, name: () => p1, generate: () => z1 });
var p1 = 'Dimension',
    u1 = { value: String, unit: String };
function _o() {
    let l = this.tokenStart,
        i = this.consumeNumber(j);
    return {
        type: 'Dimension',
        loc: this.getLocation(l, this.tokenStart),
        value: i,
        unit: this.substring(l + i.length, this.tokenStart),
    };
}
function z1(l) {
    this.token(j, l.value + l.unit);
}
var Do = {};
D(Do, { structure: () => _1, parse: () => Oo, name: () => a1, generate: () => v1 });
var x1 = 47,
    a1 = 'Feature',
    _1 = {
        kind: String,
        name: String,
        value: ['Identifier', 'Number', 'Dimension', 'Ratio', 'Function', null],
    };
function Oo(l) {
    let i = this.tokenStart,
        t,
        r = null;
    if ((this.eat(s), this.skipSC(), (t = this.consume(w)), this.skipSC(), this.tokenType !== a)) {
        switch ((this.eat(P), this.skipSC(), this.tokenType)) {
            case v:
                if (this.lookupNonWSType(1) === $) r = this.Ratio();
                else r = this.Number();
                break;
            case j:
                r = this.Dimension();
                break;
            case w:
                r = this.Identifier();
                break;
            case _:
                r = this.parseWithFallback(
                    () => {
                        let n = this.Function(this.readSequence, this.scope.Value);
                        if ((this.skipSC(), this.isDelim(x1))) this.error();
                        return n;
                    },
                    () => {
                        return this.Ratio();
                    },
                );
                break;
            default:
                this.error('Number, dimension, ratio or identifier is expected');
        }
        this.skipSC();
    }
    if (!this.eof) this.eat(a);
    return {
        type: 'Feature',
        loc: this.getLocation(i, this.tokenStart),
        kind: l,
        name: t,
        value: r,
    };
}
function v1(l) {
    if ((this.token(s, '('), this.token(w, l.name), l.value !== null))
        this.token(P, ':'), this.node(l.value);
    this.token(a, ')');
}
var qo = {};
D(qo, { structure: () => D1, parse: () => $o, name: () => O1, generate: () => q1 });
var O1 = 'FeatureFunction',
    D1 = { kind: String, feature: String, value: ['Declaration', 'Selector'] };
function $1(l, i) {
    let r = (this.features[l] || {})[i];
    if (typeof r !== 'function') this.error(`Unknown feature ${i}()`);
    return r;
}
function $o(l = 'unknown') {
    let i = this.tokenStart,
        t = this.consumeFunctionName(),
        r = $1.call(this, l, t.toLowerCase());
    this.skipSC();
    let n = this.parseWithFallback(
        () => {
            let o = this.tokenIndex,
                b = r.call(this);
            if (this.eof === !1 && this.isBalanceEdge(o) === !1) this.error();
            return b;
        },
        () => this.Raw(null, !1),
    );
    if (!this.eof) this.eat(a);
    return {
        type: 'FeatureFunction',
        loc: this.getLocation(i, this.tokenStart),
        kind: l,
        feature: t,
        value: n,
    };
}
function q1(l) {
    this.token(_, l.feature + '('), this.node(l.value), this.token(a, ')');
}
var Wo = {};
D(Wo, { structure: () => j1, parse: () => Xo, name: () => W1, generate: () => s1 });
var ie = 47,
    J1 = 60,
    te = 61,
    X1 = 62,
    W1 = 'FeatureRange',
    j1 = {
        kind: String,
        left: ['Identifier', 'Number', 'Dimension', 'Ratio', 'Function'],
        leftComparison: String,
        middle: ['Identifier', 'Number', 'Dimension', 'Ratio', 'Function'],
        rightComparison: [String, null],
        right: ['Identifier', 'Number', 'Dimension', 'Ratio', 'Function', null],
    };
function Jo() {
    switch ((this.skipSC(), this.tokenType)) {
        case v:
            if (this.isDelim(ie, this.lookupOffsetNonSC(1))) return this.Ratio();
            else return this.Number();
        case j:
            return this.Dimension();
        case w:
            return this.Identifier();
        case _:
            return this.parseWithFallback(
                () => {
                    let l = this.Function(this.readSequence, this.scope.Value);
                    if ((this.skipSC(), this.isDelim(ie))) this.error();
                    return l;
                },
                () => {
                    return this.Ratio();
                },
            );
        default:
            this.error('Number, dimension, ratio or identifier is expected');
    }
}
function re(l) {
    if ((this.skipSC(), this.isDelim(J1) || this.isDelim(X1))) {
        let i = this.source[this.tokenStart];
        if ((this.next(), this.isDelim(te))) return this.next(), i + '=';
        return i;
    }
    if (this.isDelim(te)) return '=';
    this.error(`Expected ${l ? '":", ' : ''}"<", ">", "=" or ")"`);
}
function Xo(l = 'unknown') {
    let i = this.tokenStart;
    this.skipSC(), this.eat(s);
    let t = Jo.call(this),
        r = re.call(this, t.type === 'Identifier'),
        n = Jo.call(this),
        o = null,
        b = null;
    if (this.lookupNonWSType(0) !== a) (o = re.call(this)), (b = Jo.call(this));
    return (
        this.skipSC(),
        this.eat(a),
        {
            type: 'FeatureRange',
            loc: this.getLocation(i, this.tokenStart),
            kind: l,
            left: t,
            leftComparison: r,
            middle: n,
            rightComparison: o,
            right: b,
        }
    );
}
function s1(l) {
    if (
        (this.token(s, '('),
        this.node(l.left),
        this.tokenize(l.leftComparison),
        this.node(l.middle),
        l.right)
    )
        this.tokenize(l.rightComparison), this.node(l.right);
    this.token(a, ')');
}
var so = {};
D(so, {
    walkContext: () => Q1,
    structure: () => E1,
    parse: () => jo,
    name: () => Y1,
    generate: () => G1,
});
var Y1 = 'Function',
    Q1 = 'function',
    E1 = { name: String, children: [[]] };
function jo(l, i) {
    let t = this.tokenStart,
        r = this.consumeFunctionName(),
        n = r.toLowerCase(),
        o;
    if (((o = i.hasOwnProperty(n) ? i[n].call(this, i) : l.call(this, i)), !this.eof)) this.eat(a);
    return { type: 'Function', loc: this.getLocation(t, this.tokenStart), name: r, children: o };
}
function G1(l) {
    this.token(_, l.name + '('), this.children(l), this.token(a, ')');
}
var Qo = {};
D(Qo, { structure: () => B1, parse: () => Yo, name: () => L1, generate: () => R1 });
var L1 = 'GeneralEnclosed',
    B1 = { kind: String, function: [String, null], children: [[]] };
function Yo(l) {
    let i = this.tokenStart,
        t = null;
    if (this.tokenType === _) t = this.consumeFunctionName();
    else this.eat(s);
    let r = this.parseWithFallback(
        () => {
            let n = this.tokenIndex,
                o = this.readSequence(this.scope.Value);
            if (this.eof === !1 && this.isBalanceEdge(n) === !1) this.error();
            return o;
        },
        () => this.createSingleNodeList(this.Raw(null, !1)),
    );
    if (!this.eof) this.eat(a);
    return {
        type: 'GeneralEnclosed',
        loc: this.getLocation(i, this.tokenStart),
        kind: l,
        function: t,
        children: r,
    };
}
function R1(l) {
    if (l.function) this.token(_, l.function + '(');
    else this.token(s, '(');
    this.children(l), this.token(a, ')');
}
var Go = {};
D(Go, { xxx: () => F1, structure: () => K1, parse: () => Eo, name: () => V1, generate: () => H1 });
var F1 = 'XXX',
    V1 = 'Hash',
    K1 = { value: String };
function Eo() {
    let l = this.tokenStart;
    return (
        this.eat(R),
        {
            type: 'Hash',
            loc: this.getLocation(l, this.tokenStart),
            value: this.substrToCursor(l + 1),
        }
    );
}
function H1(l) {
    this.token(R, '#' + l.value);
}
var Bo = {};
D(Bo, { structure: () => y1, parse: () => Lo, name: () => M1, generate: () => A1 });
var M1 = 'Identifier',
    y1 = { name: String };
function Lo() {
    return {
        type: 'Identifier',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        name: this.consume(w),
    };
}
function A1(l) {
    this.token(w, l.name);
}
var Fo = {};
D(Fo, { structure: () => k1, parse: () => Ro, name: () => U1, generate: () => S1 });
var U1 = 'IdSelector',
    k1 = { name: String };
function Ro() {
    let l = this.tokenStart;
    return (
        this.eat(R),
        {
            type: 'IdSelector',
            loc: this.getLocation(l, this.tokenStart),
            name: this.substrToCursor(l + 1),
        }
    );
}
function S1(l) {
    this.token($, '#' + l.name);
}
var Ko = {};
D(Ko, { structure: () => P1, parse: () => Vo, name: () => C1, generate: () => I1 });
var N1 = 46,
    C1 = 'Layer',
    P1 = { name: String };
function Vo() {
    let l = this.tokenStart,
        i = this.consume(w);
    while (this.isDelim(N1)) this.eat($), (i += '.' + this.consume(w));
    return { type: 'Layer', loc: this.getLocation(l, this.tokenStart), name: i };
}
function I1(l) {
    this.tokenize(l.name);
}
var Mo = {};
D(Mo, { structure: () => Z1, parse: () => Ho, name: () => T1, generate: () => d1 });
var T1 = 'LayerList',
    Z1 = { children: [['Layer']] };
function Ho() {
    let l = this.createList();
    this.skipSC();
    while (!this.eof) {
        if ((l.push(this.Layer()), this.lookupTypeNonSC(0) !== d)) break;
        this.skipSC(), this.next(), this.skipSC();
    }
    return { type: 'LayerList', loc: this.getLocationFromList(l), children: l };
}
function d1(l) {
    this.children(l, () => this.token(d, ','));
}
var Ao = {};
D(Ao, { structure: () => i2, parse: () => yo, name: () => l2, generate: () => t2 });
var l2 = 'MediaQuery',
    i2 = { modifier: [String, null], mediaType: [String, null], condition: ['Condition', null] };
function yo() {
    let l = this.tokenStart,
        i = null,
        t = null,
        r = null;
    if ((this.skipSC(), this.tokenType === w && this.lookupTypeNonSC(1) !== s)) {
        let n = this.consume(w),
            o = n.toLowerCase();
        if (o === 'not' || o === 'only') this.skipSC(), (i = o), (t = this.consume(w));
        else t = n;
        switch (this.lookupTypeNonSC(0)) {
            case w: {
                this.skipSC(), this.eatIdent('and'), (r = this.Condition('media'));
                break;
            }
            case N:
            case Z:
            case d:
            case Yl:
                break;
            default:
                this.error('Identifier or parenthesis is expected');
        }
    } else
        switch (this.tokenType) {
            case w:
            case s:
            case _: {
                r = this.Condition('media');
                break;
            }
            case N:
            case Z:
            case Yl:
                break;
            default:
                this.error('Identifier or parenthesis is expected');
        }
    return {
        type: 'MediaQuery',
        loc: this.getLocation(l, this.tokenStart),
        modifier: i,
        mediaType: t,
        condition: r,
    };
}
function t2(l) {
    if (l.mediaType) {
        if (l.modifier) this.token(w, l.modifier);
        if ((this.token(w, l.mediaType), l.condition)) this.token(w, 'and'), this.node(l.condition);
    } else if (l.condition) this.node(l.condition);
}
var ko = {};
D(ko, { structure: () => n2, parse: () => Uo, name: () => r2, generate: () => o2 });
var r2 = 'MediaQueryList',
    n2 = { children: [['MediaQuery']] };
function Uo() {
    let l = this.createList();
    this.skipSC();
    while (!this.eof) {
        if ((l.push(this.MediaQuery()), this.tokenType !== d)) break;
        this.next();
    }
    return { type: 'MediaQueryList', loc: this.getLocationFromList(l), children: l };
}
function o2(l) {
    this.children(l, () => this.token(d, ','));
}
var No = {};
D(No, { structure: () => g2, parse: () => So, name: () => f2, generate: () => e2 });
var b2 = 38,
    f2 = 'NestingSelector',
    g2 = {};
function So() {
    let l = this.tokenStart;
    return (
        this.eatDelim(b2), { type: 'NestingSelector', loc: this.getLocation(l, this.tokenStart) }
    );
}
function e2() {
    this.token($, '&');
}
var Po = {};
D(Po, { structure: () => c2, parse: () => Co, name: () => h2, generate: () => m2 });
var h2 = 'Nth',
    c2 = { nth: ['AnPlusB', 'Identifier'], selector: ['SelectorList', null] };
function Co() {
    this.skipSC();
    let l = this.tokenStart,
        i = l,
        t = null,
        r;
    if (this.lookupValue(0, 'odd') || this.lookupValue(0, 'even')) r = this.Identifier();
    else r = this.AnPlusB();
    if (((i = this.tokenStart), this.skipSC(), this.lookupValue(0, 'of')))
        this.next(), (t = this.SelectorList()), (i = this.tokenStart);
    return { type: 'Nth', loc: this.getLocation(l, i), nth: r, selector: t };
}
function m2(l) {
    if ((this.node(l.nth), l.selector !== null)) this.token(w, 'of'), this.node(l.selector);
}
var To = {};
D(To, { structure: () => p2, parse: () => Io, name: () => w2, generate: () => u2 });
var w2 = 'Number',
    p2 = { value: String };
function Io() {
    return {
        type: 'Number',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        value: this.consume(v),
    };
}
function u2(l) {
    this.token(v, l.value);
}
var lb = {};
D(lb, { structure: () => x2, parse: () => Zo, name: () => z2, generate: () => a2 });
var z2 = 'Operator',
    x2 = { value: String };
function Zo() {
    let l = this.tokenStart;
    return (
        this.next(),
        {
            type: 'Operator',
            loc: this.getLocation(l, this.tokenStart),
            value: this.substrToCursor(l),
        }
    );
}
function a2(l) {
    this.tokenize(l.value);
}
var tb = {};
D(tb, { structure: () => v2, parse: () => ib, name: () => _2, generate: () => O2 });
var _2 = 'Parentheses',
    v2 = { children: [[]] };
function ib(l, i) {
    let t = this.tokenStart,
        r = null;
    if ((this.eat(s), (r = l.call(this, i)), !this.eof)) this.eat(a);
    return { type: 'Parentheses', loc: this.getLocation(t, this.tokenStart), children: r };
}
function O2(l) {
    this.token(s, '('), this.children(l), this.token(a, ')');
}
var nb = {};
D(nb, { structure: () => $2, parse: () => rb, name: () => D2, generate: () => q2 });
var D2 = 'Percentage',
    $2 = { value: String };
function rb() {
    return {
        type: 'Percentage',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        value: this.consumeNumber(A),
    };
}
function q2(l) {
    this.token(A, l.value + '%');
}
var bb = {};
D(bb, {
    walkContext: () => X2,
    structure: () => W2,
    parse: () => ob,
    name: () => J2,
    generate: () => j2,
});
var J2 = 'PseudoClassSelector',
    X2 = 'function',
    W2 = { name: String, children: [['Raw'], null] };
function ob() {
    let l = this.tokenStart,
        i = null,
        t,
        r;
    if ((this.eat(P), this.tokenType === _)) {
        if (((t = this.consumeFunctionName()), (r = t.toLowerCase()), this.lookupNonWSType(0) == a))
            i = this.createList();
        else if (hasOwnProperty.call(this.pseudo, r))
            this.skipSC(), (i = this.pseudo[r].call(this)), this.skipSC();
        else (i = this.createList()), i.push(this.Raw(null, !1));
        this.eat(a);
    } else t = this.consume(w);
    return {
        type: 'PseudoClassSelector',
        loc: this.getLocation(l, this.tokenStart),
        name: t,
        children: i,
    };
}
function j2(l) {
    if ((this.token(P, ':'), l.children === null)) this.token(w, l.name);
    else this.token(_, l.name + '('), this.children(l), this.token(a, ')');
}
var gb = {};
D(gb, {
    walkContext: () => Y2,
    structure: () => Q2,
    parse: () => fb,
    name: () => s2,
    generate: () => E2,
});
var s2 = 'PseudoElementSelector',
    Y2 = 'function',
    Q2 = { name: String, children: [['Raw'], null] };
function fb() {
    let l = this.tokenStart,
        i = null,
        t,
        r;
    if ((this.eat(P), this.eat(P), this.tokenType === _)) {
        if (((t = this.consumeFunctionName()), (r = t.toLowerCase()), this.lookupNonWSType(0) == a))
            i = this.createList();
        else if (hasOwnProperty.call(this.pseudo, r))
            this.skipSC(), (i = this.pseudo[r].call(this)), this.skipSC();
        else (i = this.createList()), i.push(this.Raw(null, !1));
        this.eat(a);
    } else t = this.consume(w);
    return {
        type: 'PseudoElementSelector',
        loc: this.getLocation(l, this.tokenStart),
        name: t,
        children: i,
    };
}
function E2(l) {
    if ((this.token(P, ':'), this.token(P, ':'), l.children === null)) this.token(w, l.name);
    else this.token(_, l.name + '('), this.children(l), this.token(a, ')');
}
var hb = {};
D(hb, { structure: () => L2, parse: () => eb, name: () => G2, generate: () => B2 });
var ne = 47;
function oe() {
    switch ((this.skipSC(), this.tokenType)) {
        case v:
            return this.Number();
        case _:
            return this.Function(this.readSequence, this.scope.Value);
        default:
            this.error('Number of function is expected');
    }
}
var G2 = 'Ratio',
    L2 = { left: ['Number', 'Function'], right: ['Number', 'Function', null] };
function eb() {
    let l = this.tokenStart,
        i = oe.call(this),
        t = null;
    if ((this.skipSC(), this.isDelim(ne))) this.eatDelim(ne), (t = oe.call(this));
    return { type: 'Ratio', loc: this.getLocation(l, this.tokenStart), left: i, right: t };
}
function B2(l) {
    if ((this.node(l.left), this.token($, '/'), l.right)) this.node(l.right);
    else this.node(v, 1);
}
var mb = {};
D(mb, { structure: () => V2, parse: () => cb, name: () => F2, generate: () => K2 });
function R2() {
    if (this.tokenIndex > 0) {
        if (this.lookupType(-1) === Y)
            return this.tokenIndex > 1
                ? this.getTokenStart(this.tokenIndex - 1)
                : this.firstCharOffset;
    }
    return this.tokenStart;
}
var F2 = 'Raw',
    V2 = { value: String };
function cb(l, i) {
    let t = this.getTokenStart(this.tokenIndex),
        r;
    if (
        (this.skipUntilBalanced(this.tokenIndex, l || this.consumeUntilBalanceEnd),
        i && this.tokenStart > t)
    )
        r = R2.call(this);
    else r = this.tokenStart;
    return { type: 'Raw', loc: this.getLocation(t, r), value: this.substring(t, r) };
}
function K2(l) {
    this.tokenize(l.value);
}
var pb = {};
D(pb, {
    walkContext: () => y2,
    structure: () => A2,
    parse: () => wb,
    name: () => M2,
    generate: () => U2,
});
function be() {
    return this.Raw(this.consumeUntilLeftCurlyBracket, !0);
}
function H2() {
    let l = this.SelectorList();
    if (l.type !== 'Raw' && this.eof === !1 && this.tokenType !== N) this.error();
    return l;
}
var M2 = 'Rule',
    y2 = 'rule',
    A2 = { prelude: ['SelectorList', 'Raw'], block: ['Block'] };
function wb() {
    let l = this.tokenIndex,
        i = this.tokenStart,
        t,
        r;
    if (this.parseRulePrelude) t = this.parseWithFallback(H2, be);
    else t = be.call(this, l);
    return (
        (r = this.Block(!0)),
        { type: 'Rule', loc: this.getLocation(i, this.tokenStart), prelude: t, block: r }
    );
}
function U2(l) {
    this.node(l.prelude), this.node(l.block);
}
var zb = {};
D(zb, { structure: () => S2, parse: () => ub, name: () => k2, generate: () => N2 });
var k2 = 'Scope',
    S2 = { root: ['SelectorList', 'Raw', null], limit: ['SelectorList', 'Raw', null] };
function ub() {
    let l = null,
        i = null;
    this.skipSC();
    let t = this.tokenStart;
    if (this.tokenType === s)
        this.next(),
            this.skipSC(),
            (l = this.parseWithFallback(this.SelectorList, () => this.Raw(!1, !0))),
            this.skipSC(),
            this.eat(a);
    if (this.lookupNonWSType(0) === w)
        this.skipSC(),
            this.eatIdent('to'),
            this.skipSC(),
            this.eat(s),
            this.skipSC(),
            (i = this.parseWithFallback(this.SelectorList, () => this.Raw(!1, !0))),
            this.skipSC(),
            this.eat(a);
    return { type: 'Scope', loc: this.getLocation(t, this.tokenStart), root: l, limit: i };
}
function N2(l) {
    if (l.root) this.token(s, '('), this.node(l.root), this.token(a, ')');
    if (l.limit) this.token(w, 'to'), this.token(s, '('), this.node(l.limit), this.token(a, ')');
}
var ab = {};
D(ab, { structure: () => P2, parse: () => xb, name: () => C2, generate: () => I2 });
var C2 = 'Selector',
    P2 = {
        children: [
            [
                'TypeSelector',
                'IdSelector',
                'ClassSelector',
                'AttributeSelector',
                'PseudoClassSelector',
                'PseudoElementSelector',
                'Combinator',
            ],
        ],
    };
function xb() {
    let l = this.readSequence(this.scope.Selector);
    if (this.getFirstListNode(l) === null) this.error('Selector is expected');
    return { type: 'Selector', loc: this.getLocationFromList(l), children: l };
}
function I2(l) {
    this.children(l);
}
var vb = {};
D(vb, {
    walkContext: () => Z2,
    structure: () => d2,
    parse: () => _b,
    name: () => T2,
    generate: () => lz,
});
var T2 = 'SelectorList',
    Z2 = 'selector',
    d2 = { children: [['Selector', 'Raw']] };
function _b() {
    let l = this.createList();
    while (!this.eof) {
        if ((l.push(this.Selector()), this.tokenType === d)) {
            this.next();
            continue;
        }
        break;
    }
    return { type: 'SelectorList', loc: this.getLocationFromList(l), children: l };
}
function lz(l) {
    this.children(l, () => this.token(d, ','));
}
var $b = {};
D($b, { structure: () => tz, parse: () => Db, name: () => iz, generate: () => rz });
var Ob = 92,
    fe = 34,
    ge = 39;
function Jr(l) {
    let i = l.length,
        t = l.charCodeAt(0),
        r = t === fe || t === ge ? 1 : 0,
        n = r === 1 && i > 1 && l.charCodeAt(i - 1) === t ? i - 2 : i - 1,
        o = '';
    for (let b = r; b <= n; b++) {
        let g = l.charCodeAt(b);
        if (g === Ob) {
            if (b === n) {
                if (b !== i - 1) o = l.substr(b + 1);
                break;
            }
            if (((g = l.charCodeAt(++b)), Ol(Ob, g))) {
                let e = b - 1,
                    f = Ml(l, e);
                (b = f - 1), (o += xt(l.substring(e + 1, f)));
            } else if (g === 13 && l.charCodeAt(b + 1) === 10) b++;
        } else o += l[b];
    }
    return o;
}
function ee(l, i) {
    let t = i ? "'" : '"',
        r = i ? ge : fe,
        n = '',
        o = !1;
    for (let b = 0; b < l.length; b++) {
        let g = l.charCodeAt(b);
        if (g === 0) {
            n += '�';
            continue;
        }
        if (g <= 31 || g === 127) {
            (n += '\\' + g.toString(16)), (o = !0);
            continue;
        }
        if (g === r || g === Ob) (n += '\\' + l.charAt(b)), (o = !1);
        else {
            if (o && (Dl(g) || Hl(g))) n += ' ';
            (n += l.charAt(b)), (o = !1);
        }
    }
    return t + n + t;
}
var iz = 'String',
    tz = { value: String };
function Db() {
    return {
        type: 'String',
        loc: this.getLocation(this.tokenStart, this.tokenEnd),
        value: Jr(this.consume(gl)),
    };
}
function rz(l) {
    this.token(gl, ee(l.value));
}
var Jb = {};
D(Jb, {
    walkContext: () => bz,
    structure: () => fz,
    parse: () => qb,
    name: () => oz,
    generate: () => gz,
});
var nz = 33;
function ce() {
    return this.Raw(null, !1);
}
var oz = 'StyleSheet',
    bz = 'stylesheet',
    fz = { children: [['Comment', 'CDO', 'CDC', 'Atrule', 'Rule', 'Raw']] };
function qb() {
    let l = this.tokenStart,
        i = this.createList(),
        t;
    l: while (!this.eof) {
        switch (this.tokenType) {
            case Y:
                this.next();
                continue;
            case U:
                if (this.charCodeAt(this.tokenStart + 2) !== nz) {
                    this.next();
                    continue;
                }
                t = this.Comment();
                break;
            case Pl:
                t = this.CDO();
                break;
            case cl:
                t = this.CDC();
                break;
            case S:
                t = this.parseWithFallback(this.Atrule, ce);
                break;
            default:
                t = this.parseWithFallback(this.Rule, ce);
        }
        i.push(t);
    }
    return { type: 'StyleSheet', loc: this.getLocation(l, this.tokenStart), children: i };
}
function gz(l) {
    this.children(l);
}
var Wb = {};
D(Wb, { structure: () => hz, parse: () => Xb, name: () => ez, generate: () => cz });
var ez = 'SupportsDeclaration',
    hz = { declaration: 'Declaration' };
function Xb() {
    let l = this.tokenStart;
    this.eat(s), this.skipSC();
    let i = this.Declaration();
    if (!this.eof) this.eat(a);
    return {
        type: 'SupportsDeclaration',
        loc: this.getLocation(l, this.tokenStart),
        declaration: i,
    };
}
function cz(l) {
    this.token(s, '('), this.node(l.declaration), this.token(a, ')');
}
var Yb = {};
D(Yb, { structure: () => pz, parse: () => sb, name: () => wz, generate: () => uz });
var mz = 42,
    me = 124;
function jb() {
    if (this.tokenType !== w && this.isDelim(mz) === !1)
        this.error('Identifier or asterisk is expected');
    this.next();
}
var wz = 'TypeSelector',
    pz = { name: String };
function sb() {
    let l = this.tokenStart;
    if (this.isDelim(me)) this.next(), jb.call(this);
    else if ((jb.call(this), this.isDelim(me))) this.next(), jb.call(this);
    return {
        type: 'TypeSelector',
        loc: this.getLocation(l, this.tokenStart),
        name: this.substrToCursor(l),
    };
}
function uz(l) {
    this.tokenize(l.name);
}
var Gb = {};
D(Gb, { structure: () => _z, parse: () => Eb, name: () => az, generate: () => vz });
var we = 43,
    pe = 45,
    Qb = 63;
function Lt(l, i) {
    let t = 0;
    for (let r = this.tokenStart + l; r < this.tokenEnd; r++) {
        let n = this.charCodeAt(r);
        if (n === pe && i && t !== 0) return Lt.call(this, l + t + 1, !1), -1;
        if (!Dl(n))
            this.error(
                i && t !== 0
                    ? 'Hyphen minus' + (t < 6 ? ' or hex digit' : '') + ' is expected'
                    : t < 6
                      ? 'Hex digit is expected'
                      : 'Unexpected input',
                r,
            );
        if (++t > 6) this.error('Too many hex digits', r);
    }
    return this.next(), t;
}
function Xr(l) {
    let i = 0;
    while (this.isDelim(Qb)) {
        if (++i > l) this.error('Too many question marks');
        this.next();
    }
}
function zz(l) {
    if (this.charCodeAt(this.tokenStart) !== l)
        this.error((l === we ? 'Plus sign' : 'Hyphen minus') + ' is expected');
}
function xz() {
    let l = 0;
    switch (this.tokenType) {
        case v:
            if (((l = Lt.call(this, 1, !0)), this.isDelim(Qb))) {
                Xr.call(this, 6 - l);
                break;
            }
            if (this.tokenType === j || this.tokenType === v) {
                zz.call(this, pe), Lt.call(this, 1, !1);
                break;
            }
            break;
        case j:
            if (((l = Lt.call(this, 1, !0)), l > 0)) Xr.call(this, 6 - l);
            break;
        default:
            if ((this.eatDelim(we), this.tokenType === w)) {
                if (((l = Lt.call(this, 0, !0)), l > 0)) Xr.call(this, 6 - l);
                break;
            }
            if (this.isDelim(Qb)) {
                this.next(), Xr.call(this, 5);
                break;
            }
            this.error('Hex digit or question mark is expected');
    }
}
var az = 'UnicodeRange',
    _z = { value: String };
function Eb() {
    let l = this.tokenStart;
    return (
        this.eatIdent('u'),
        xz.call(this),
        {
            type: 'UnicodeRange',
            loc: this.getLocation(l, this.tokenStart),
            value: this.substrToCursor(l),
        }
    );
}
function vz(l) {
    this.tokenize(l.value);
}
var Rb = {};
D(Rb, { structure: () => Xz, parse: () => Bb, name: () => Jz, generate: () => Wz });
var Oz = 32,
    Lb = 92,
    Dz = 34,
    $z = 39,
    qz = 40,
    ue = 41;
function ze(l) {
    let i = l.length,
        t = 4,
        r = l.charCodeAt(i - 1) === ue ? i - 2 : i - 1,
        n = '';
    while (t < r && Hl(l.charCodeAt(t))) t++;
    while (t < r && Hl(l.charCodeAt(r))) r--;
    for (let o = t; o <= r; o++) {
        let b = l.charCodeAt(o);
        if (b === Lb) {
            if (o === r) {
                if (o !== i - 1) n = l.substr(o + 1);
                break;
            }
            if (((b = l.charCodeAt(++o)), Ol(Lb, b))) {
                let g = o - 1,
                    e = Ml(l, g);
                (o = e - 1), (n += xt(l.substring(g + 1, e)));
            } else if (b === 13 && l.charCodeAt(o + 1) === 10) o++;
        } else n += l[o];
    }
    return n;
}
function xe(l) {
    let i = '',
        t = !1;
    for (let r = 0; r < l.length; r++) {
        let n = l.charCodeAt(r);
        if (n === 0) {
            i += '�';
            continue;
        }
        if (n <= 31 || n === 127) {
            (i += '\\' + n.toString(16)), (t = !0);
            continue;
        }
        if (n === Oz || n === Lb || n === Dz || n === $z || n === qz || n === ue)
            (i += '\\' + l.charAt(r)), (t = !1);
        else {
            if (t && Dl(n)) i += ' ';
            (i += l.charAt(r)), (t = !1);
        }
    }
    return 'url(' + i + ')';
}
var Jz = 'Url',
    Xz = { value: String };
function Bb() {
    let l = this.tokenStart,
        i;
    switch (this.tokenType) {
        case il:
            i = ze(this.consume(il));
            break;
        case _:
            if (!this.cmpStr(this.tokenStart, this.tokenEnd, 'url('))
                this.error('Function name must be `url`');
            if ((this.eat(_), this.skipSC(), (i = Jr(this.consume(gl))), this.skipSC(), !this.eof))
                this.eat(a);
            break;
        default:
            this.error('Url or Function is expected');
    }
    return { type: 'Url', loc: this.getLocation(l, this.tokenStart), value: i };
}
function Wz(l) {
    this.token(il, xe(l.value));
}
var Vb = {};
D(Vb, { structure: () => sz, parse: () => Fb, name: () => jz, generate: () => Yz });
var jz = 'Value',
    sz = { children: [[]] };
function Fb() {
    let l = this.tokenStart,
        i = this.readSequence(this.scope.Value);
    return { type: 'Value', loc: this.getLocation(l, this.tokenStart), children: i };
}
function Yz(l) {
    this.children(l);
}
var Hb = {};
D(Hb, { structure: () => Gz, parse: () => Kb, name: () => Ez, generate: () => Lz });
var Qz = Object.freeze({ type: 'WhiteSpace', loc: null, value: ' ' }),
    Ez = 'WhiteSpace',
    Gz = { value: String };
function Kb() {
    return this.eat(Y), Qz;
}
function Lz(l) {
    this.token(Y, l.value);
}
var _e = { generic: !0, cssWideKeywords: yi, ...kg, node: Bt };
var Ab = {};
D(Ab, { Value: () => Je, Selector: () => $e, AtrulePrelude: () => Oe });
var Bz = 35,
    Rz = 42,
    ve = 43,
    Fz = 45,
    Vz = 47,
    Kz = 117;
function Rt(l) {
    switch (this.tokenType) {
        case R:
            return this.Hash();
        case d:
            return this.Operator();
        case s:
            return this.Parentheses(this.readSequence, l.recognizer);
        case el:
            return this.Brackets(this.readSequence, l.recognizer);
        case gl:
            return this.String();
        case j:
            return this.Dimension();
        case A:
            return this.Percentage();
        case v:
            return this.Number();
        case _:
            return this.cmpStr(this.tokenStart, this.tokenEnd, 'url(')
                ? this.Url()
                : this.Function(this.readSequence, l.recognizer);
        case il:
            return this.Url();
        case w:
            if (this.cmpChar(this.tokenStart, Kz) && this.cmpChar(this.tokenStart + 1, ve))
                return this.UnicodeRange();
            else return this.Identifier();
        case $: {
            let i = this.charCodeAt(this.tokenStart);
            if (i === Vz || i === Rz || i === ve || i === Fz) return this.Operator();
            if (i === Bz) this.error('Hex or identifier is expected', this.tokenStart + 1);
            break;
        }
    }
}
var Oe = { getNode: Rt };
var Hz = 35,
    Mz = 38,
    yz = 42,
    Az = 43,
    Uz = 47,
    De = 46,
    kz = 62,
    Sz = 124,
    Nz = 126;
function Cz(l, i) {
    if (i.last !== null && i.last.type !== 'Combinator' && l !== null && l.type !== 'Combinator')
        i.push({ type: 'Combinator', loc: null, name: ' ' });
}
function Pz() {
    switch (this.tokenType) {
        case el:
            return this.AttributeSelector();
        case R:
            return this.IdSelector();
        case P:
            if (this.lookupType(1) === P) return this.PseudoElementSelector();
            else return this.PseudoClassSelector();
        case w:
            return this.TypeSelector();
        case v:
        case A:
            return this.Percentage();
        case j:
            if (this.charCodeAt(this.tokenStart) === De)
                this.error('Identifier is expected', this.tokenStart + 1);
            break;
        case $: {
            switch (this.charCodeAt(this.tokenStart)) {
                case Az:
                case kz:
                case Nz:
                case Uz:
                    return this.Combinator();
                case De:
                    return this.ClassSelector();
                case yz:
                case Sz:
                    return this.TypeSelector();
                case Hz:
                    return this.IdSelector();
                case Mz:
                    return this.NestingSelector();
            }
            break;
        }
    }
}
var $e = { onWhiteSpace: Cz, getNode: Pz };
function Mb() {
    return this.createSingleNodeList(this.Raw(null, !1));
}
function yb() {
    let l = this.createList();
    if ((this.skipSC(), l.push(this.Identifier()), this.skipSC(), this.tokenType === d)) {
        l.push(this.Operator());
        let i = this.tokenIndex,
            t = this.parseCustomProperty
                ? this.Value(null)
                : this.Raw(this.consumeUntilExclamationMarkOrSemicolon, !1);
        if (t.type === 'Value' && t.children.isEmpty) {
            for (let r = i - this.tokenIndex; r <= 0; r++)
                if (this.lookupType(r) === Y) {
                    t.children.appendData({ type: 'WhiteSpace', loc: null, value: ' ' });
                    break;
                }
        }
        l.push(t);
    }
    return l;
}
function qe(l) {
    return (
        l !== null &&
        l.type === 'Operator' &&
        (l.value[l.value.length - 1] === '-' || l.value[l.value.length - 1] === '+')
    );
}
var Je = {
    getNode: Rt,
    onWhiteSpace(l, i) {
        if (qe(l)) l.value = ' ' + l.value;
        if (qe(i.last)) i.last.value += ' ';
    },
    expression: Mb,
    var: yb,
};
var Iz = new Set(['none', 'and', 'not', 'or']),
    Xe = {
        parse: {
            prelude() {
                let l = this.createList();
                if (this.tokenType === w) {
                    let i = this.substring(this.tokenStart, this.tokenEnd);
                    if (!Iz.has(i.toLowerCase())) l.push(this.Identifier());
                }
                return l.push(this.Condition('container')), l;
            },
            block(l = !1) {
                return this.Block(l);
            },
        },
    };
var We = {
    parse: {
        prelude: null,
        block() {
            return this.Block(!0);
        },
    },
};
function Ub(l, i) {
    return this.parseWithFallback(
        () => {
            try {
                return l.call(this);
            } finally {
                if ((this.skipSC(), this.lookupNonWSType(0) !== a)) this.error();
            }
        },
        i || (() => this.Raw(null, !0)),
    );
}
var je = {
        layer() {
            this.skipSC();
            let l = this.createList(),
                i = Ub.call(this, this.Layer);
            if (i.type !== 'Raw' || i.value !== '') l.push(i);
            return l;
        },
        supports() {
            this.skipSC();
            let l = this.createList(),
                i = Ub.call(this, this.Declaration, () =>
                    Ub.call(this, () => this.Condition('supports')),
                );
            if (i.type !== 'Raw' || i.value !== '') l.push(i);
            return l;
        },
    },
    se = {
        parse: {
            prelude() {
                let l = this.createList();
                switch (this.tokenType) {
                    case gl:
                        l.push(this.String());
                        break;
                    case il:
                    case _:
                        l.push(this.Url());
                        break;
                    default:
                        this.error('String or url() is expected');
                }
                if (
                    (this.skipSC(),
                    this.tokenType === w && this.cmpStr(this.tokenStart, this.tokenEnd, 'layer'))
                )
                    l.push(this.Identifier());
                else if (
                    this.tokenType === _ &&
                    this.cmpStr(this.tokenStart, this.tokenEnd, 'layer(')
                )
                    l.push(this.Function(null, je));
                if (
                    (this.skipSC(),
                    this.tokenType === _ &&
                        this.cmpStr(this.tokenStart, this.tokenEnd, 'supports('))
                )
                    l.push(this.Function(null, je));
                if (this.lookupNonWSType(0) === w || this.lookupNonWSType(0) === s)
                    l.push(this.MediaQueryList());
                return l;
            },
            block: null,
        },
    };
var Ye = {
    parse: {
        prelude() {
            return this.createSingleNodeList(this.LayerList());
        },
        block() {
            return this.Block(!1);
        },
    },
};
var Qe = {
    parse: {
        prelude() {
            return this.createSingleNodeList(this.MediaQueryList());
        },
        block(l = !1) {
            return this.Block(l);
        },
    },
};
var Ee = {
    parse: {
        prelude() {
            return this.createSingleNodeList(this.SelectorList());
        },
        block() {
            return this.Block(!0);
        },
    },
};
var Ge = {
    parse: {
        prelude() {
            return this.createSingleNodeList(this.SelectorList());
        },
        block() {
            return this.Block(!0);
        },
    },
};
var Le = {
    parse: {
        prelude() {
            return this.createSingleNodeList(this.Scope());
        },
        block(l = !1) {
            return this.Block(l);
        },
    },
};
var Be = {
    parse: {
        prelude: null,
        block(l = !1) {
            return this.Block(l);
        },
    },
};
var Re = {
    parse: {
        prelude() {
            return this.createSingleNodeList(this.Condition('supports'));
        },
        block(l = !1) {
            return this.Block(l);
        },
    },
};
var Fe = {
    container: Xe,
    'font-face': We,
    import: se,
    layer: Ye,
    media: Qe,
    nest: Ee,
    page: Ge,
    scope: Le,
    'starting-style': Be,
    supports: Re,
};
function Ve() {
    let l = this.createList();
    this.skipSC();
    l: while (!this.eof) {
        switch (this.tokenType) {
            case w:
                l.push(this.Identifier());
                break;
            case gl:
                l.push(this.String());
                break;
            case d:
                l.push(this.Operator());
                break;
            case a:
                break l;
            default:
                this.error('Identifier, string or comma is expected');
        }
        this.skipSC();
    }
    return l;
}
var Di = {
        parse() {
            return this.createSingleNodeList(this.SelectorList());
        },
    },
    kb = {
        parse() {
            return this.createSingleNodeList(this.Selector());
        },
    },
    Tz = {
        parse() {
            return this.createSingleNodeList(this.Identifier());
        },
    },
    Zz = { parse: Ve },
    Wr = {
        parse() {
            return this.createSingleNodeList(this.Nth());
        },
    },
    Ke = {
        dir: Tz,
        has: Di,
        lang: Zz,
        matches: Di,
        is: Di,
        '-moz-any': Di,
        '-webkit-any': Di,
        where: Di,
        not: Di,
        'nth-child': Wr,
        'nth-last-child': Wr,
        'nth-last-of-type': Wr,
        'nth-of-type': Wr,
        slotted: kb,
        host: kb,
        'host-context': kb,
    };
var Sb = {};
D(Sb, {
    WhiteSpace: () => Kb,
    Value: () => Fb,
    Url: () => Bb,
    UnicodeRange: () => Eb,
    TypeSelector: () => sb,
    SupportsDeclaration: () => Xb,
    StyleSheet: () => qb,
    String: () => Db,
    SelectorList: () => _b,
    Selector: () => xb,
    Scope: () => ub,
    Rule: () => wb,
    Raw: () => cb,
    Ratio: () => eb,
    PseudoElementSelector: () => fb,
    PseudoClassSelector: () => ob,
    Percentage: () => rb,
    Parentheses: () => ib,
    Operator: () => Zo,
    Number: () => Io,
    Nth: () => Co,
    NestingSelector: () => So,
    MediaQueryList: () => Uo,
    MediaQuery: () => yo,
    LayerList: () => Ho,
    Layer: () => Vo,
    Identifier: () => Lo,
    IdSelector: () => Ro,
    Hash: () => Eo,
    GeneralEnclosed: () => Yo,
    Function: () => jo,
    FeatureRange: () => Xo,
    FeatureFunction: () => $o,
    Feature: () => Oo,
    Dimension: () => _o,
    DeclarationList: () => xo,
    Declaration: () => po,
    Condition: () => mo,
    Comment: () => ho,
    Combinator: () => go,
    ClassSelector: () => bo,
    CDO: () => no,
    CDC: () => to,
    Brackets: () => lo,
    Block: () => Zn,
    AttributeSelector: () => In,
    AtrulePrelude: () => Nn,
    Atrule: () => kn,
    AnPlusB: () => An,
});
var He = {
    parseContext: {
        default: 'StyleSheet',
        stylesheet: 'StyleSheet',
        atrule: 'Atrule',
        atrulePrelude(l) {
            return this.AtrulePrelude(l.atrule ? String(l.atrule) : null);
        },
        mediaQueryList: 'MediaQueryList',
        mediaQuery: 'MediaQuery',
        condition(l) {
            return this.Condition(l.kind);
        },
        rule: 'Rule',
        selectorList: 'SelectorList',
        selector: 'Selector',
        block() {
            return this.Block(!0);
        },
        declarationList: 'DeclarationList',
        declaration: 'Declaration',
        value: 'Value',
    },
    features: {
        supports: {
            selector() {
                return this.Selector();
            },
        },
        container: {
            style() {
                return this.Declaration();
            },
        },
    },
    scope: Ab,
    atrule: Fe,
    pseudo: Ke,
    node: Sb,
};
var Me = { node: Bt };
var ye = Mn({ ..._e, ...He, ...Me });
var {
    tokenize: a6,
    parse: Nb,
    generate: Cb,
    lexer: _6,
    createLexer: v6,
    walk: jr,
    find: O6,
    findLast: D6,
    findAll: $6,
    toPlainObject: q6,
    fromPlainObject: J6,
    fork: X6,
} = ye;
class Ni {
    static instance;
    constructor() {}
    injectDefaultStyles() {
        try {
            let l = document.createElement('style');
            (l.id = 'onlook-stylesheet'),
                (l.textContent = `
            [${'data-onlook-editing-text'}="true"] {
                opacity: 0;
            }
        `),
                document.head.appendChild(l);
        } catch (l) {
            console.warn('Error injecting default styles', l);
        }
    }
    static getInstance() {
        if (!Ni.instance) Ni.instance = new Ni();
        return Ni.instance;
    }
    get stylesheet() {
        let l = document.getElementById('onlook-stylesheet') || this.createStylesheet();
        return (l.textContent = l.textContent || ''), Nb(l.textContent);
    }
    set stylesheet(l) {
        let i = document.getElementById('onlook-stylesheet') || this.createStylesheet();
        i.textContent = Cb(l);
    }
    createStylesheet() {
        let l = document.createElement('style');
        return (l.id = 'onlook-stylesheet'), document.head.appendChild(l), l;
    }
    find(l, i) {
        let t = [];
        return (
            jr(l, {
                visit: 'Rule',
                enter: (r) => {
                    if (r.type === 'Rule') {
                        let n = r;
                        if (n.prelude.type === 'SelectorList')
                            n.prelude.children.forEach((o) => {
                                if (Cb(o) === i) t.push(r);
                            });
                    }
                },
            }),
            t
        );
    }
    updateStyle(l, i) {
        let t = kr(l, !1),
            r = this.stylesheet;
        for (let [n, o] of Object.entries(i)) {
            let b = this.jsToCssProperty(n),
                g = this.find(r, t);
            if (!g.length) this.addRule(r, t, b, o.value);
            else
                g.forEach((e) => {
                    if (e.type === 'Rule') this.updateRule(e, b, o.value);
                });
        }
        this.stylesheet = r;
    }
    addRule(l, i, t, r) {
        let n = {
            type: 'Rule',
            prelude: {
                type: 'SelectorList',
                children: [{ type: 'Selector', children: [{ type: 'TypeSelector', name: i }] }],
            },
            block: {
                type: 'Block',
                children: [{ type: 'Declaration', property: t, value: { type: 'Raw', value: r } }],
            },
        };
        if (l.type === 'StyleSheet') l.children.push(n);
    }
    updateRule(l, i, t) {
        let r = !1;
        if (
            (jr(l.block, {
                visit: 'Declaration',
                enter: (n) => {
                    if (n.property === i) {
                        if (((n.value = { type: 'Raw', value: t }), t === ''))
                            l.block.children = l.block.children.filter((o) => o.property !== i);
                        r = !0;
                    }
                },
            }),
            !r)
        )
            if (t === '') l.block.children = l.block.children.filter((n) => n.property !== i);
            else
                l.block.children.push({
                    type: 'Declaration',
                    property: i,
                    value: { type: 'Raw', value: t },
                    important: !1,
                });
    }
    getJsStyle(l) {
        let i = this.stylesheet,
            t = this.find(i, l),
            r = {};
        if (!t.length) return r;
        return (
            t.forEach((n) => {
                if (n.type === 'Rule')
                    jr(n, {
                        visit: 'Declaration',
                        enter: (o) => {
                            r[this.cssToJsProperty(o.property)] = o.value.value;
                        },
                    });
            }),
            r
        );
    }
    jsToCssProperty(l) {
        if (!l) return '';
        return l.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
    cssToJsProperty(l) {
        if (!l) return '';
        return l.replace(/-([a-z])/g, (i) => i[1]?.toUpperCase() ?? '');
    }
    removeStyles(l, i) {
        let t = kr(l, !1),
            r = this.stylesheet;
        this.find(r, t).forEach((o) => {
            if (o.type === 'Rule') {
                let b = i.map((g) => this.jsToCssProperty(g));
                o.block.children = o.block.children.filter((g) => !b.includes(g.property));
            }
        }),
            (this.stylesheet = r);
    }
    clear() {
        this.stylesheet = Nb('');
    }
}
var ii = Ni.getInstance();
function Ae(l, i) {
    return ii.updateStyle(l, i.updated), Ct(l, !0);
}
function Ue(l, i) {
    ii.updateStyle(l, { backgroundImage: { value: `url(${i})`, type: 'value' } });
}
function ke(l) {
    ii.updateStyle(l, { backgroundImage: { value: 'none', type: 'value' } });
}
function l4(l, i) {
    let t = Array.from(l.children);
    if (t.length === 0) return 0;
    let r = 0,
        n = 1 / 0;
    t.forEach((g, e) => {
        let f = g.getBoundingClientRect(),
            h = f.top + f.height / 2,
            c = Math.abs(i - h);
        if (c < n) (n = c), (r = e);
    });
    let o = t[r]?.getBoundingClientRect();
    if (!o) return 0;
    let b = o.top + o.height / 2;
    return i > b ? r + 1 : r;
}
function Se(l, i) {
    let t = i4(l, i);
    if (!t) return null;
    let r = window.getComputedStyle(t).display;
    if (r === 'flex' || r === 'grid') {
        let o = l4(t, i);
        return {
            type: 'index',
            targetDomId: Jl(t),
            targetOid: Kl(t) || Vl(t) || null,
            index: o,
            originalIndex: o,
        };
    }
    return { type: 'append', targetDomId: Jl(t), targetOid: Kl(t) || Vl(t) || null };
}
function i4(l, i) {
    let t = o0(l, i);
    if (!t) return null;
    let r = !0;
    while (t && r) if (((r = Pf.has(t.tagName.toLowerCase())), r)) t = t.parentElement;
    return t;
}
function Ne(l, i) {
    let t = H(i.targetDomId);
    if (!t) {
        console.warn(`Target element not found: ${i.targetDomId}`);
        return;
    }
    let r = Ce(l);
    switch (i.type) {
        case 'append':
            t.appendChild(r);
            break;
        case 'prepend':
            t.prepend(r);
            break;
        case 'index':
            if (i.index === void 0 || i.index < 0) {
                console.warn(`Invalid index: ${i.index}`);
                return;
            }
            if (i.index >= t.children.length) t.appendChild(r);
            else t.insertBefore(r, t.children.item(i.index));
            break;
        default:
            console.warn(`Invalid position: ${i}`), Nr(i);
    }
    let n = nl(r, !0),
        o = zl(r);
    return { domEl: n, newMap: o };
}
function Ce(l) {
    let i = document.createElement(l.tagName);
    i.setAttribute('data-onlook-inserted', 'true');
    for (let [t, r] of Object.entries(l.attributes)) i.setAttribute(t, r);
    if (l.textContent !== null && l.textContent !== void 0) i.textContent = l.textContent;
    for (let [t, r] of Object.entries(l.styles)) i.style.setProperty(ii.jsToCssProperty(t), r);
    for (let t of l.children) {
        let r = Ce(t);
        i.appendChild(r);
    }
    return i;
}
function Pe(l) {
    let i = H(l.targetDomId);
    if (!i) return console.warn(`Target element not found: ${l.targetDomId}`), null;
    let t = null;
    switch (l.type) {
        case 'append':
            t = i.lastElementChild;
            break;
        case 'prepend':
            t = i.firstElementChild;
            break;
        case 'index':
            if (l.index !== -1) t = i.children.item(l.index);
            else return console.warn(`Invalid index: ${l.index}`), null;
            break;
        default:
            console.warn(`Invalid position: ${l}`), Nr(l);
    }
    if (t) {
        let r = nl(t, !0);
        t.style.display = 'none';
        let n = i.parentElement ? zl(i.parentElement) : null;
        return { domEl: r, newMap: n };
    } else return console.warn('No element found to remove at the specified location'), null;
}
function Ie(l, i) {
    let t = H(l);
    if (!t) return console.warn('Element not found for domId:', l), null;
    let r = b0(t);
    if (!r) return console.warn('Failed to get location for element:', t), null;
    let n = Pt(l);
    if (!n) return console.warn('Failed to get action element for element:', t), null;
    return {
        type: 'remove-element',
        targets: [{ frameId: i, domId: n.domId, oid: n.oid }],
        location: r,
        element: n,
        editText: !1,
        pasteParams: null,
        codeBlock: null,
    };
}
function Te(l, i) {
    let t = H(l);
    if (!t) return console.warn(`Move element not found: ${l}`), null;
    let r = t4(t, i);
    if (!r) return console.warn(`Failed to move element: ${l}`), null;
    let n = nl(r, !0),
        o = r.parentElement ? zl(r.parentElement) : null;
    return { domEl: n, newMap: o };
}
function Ze(l) {
    let i = H(l);
    if (!i) return console.warn(`Element not found: ${l}`), -1;
    return Array.from(i.parentElement?.children || [])
        .filter(zi)
        .indexOf(i);
}
function t4(l, i) {
    let t = l.parentElement;
    if (!t) {
        console.warn('Parent not found');
        return;
    }
    if ((t.removeChild(l), i >= t.children.length)) return t.appendChild(l), l;
    let r = t.children[i];
    return t.insertBefore(l, r ?? null), l;
}
function sr(l) {
    if (!l || !l.children || l.children.length < 2) return 'vertical';
    let i = Array.from(l.children),
        t = i[0],
        r = i[1],
        n = t?.getBoundingClientRect(),
        o = r?.getBoundingClientRect();
    if (n && o && Math.abs(n.left - o.left) < Math.abs(n.top - o.top)) return 'vertical';
    else return 'horizontal';
}
function de(l, i, t, r) {
    if (l.length === 0) return 0;
    let n = l.map((o) => {
        let b = o.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    });
    if (r === 'horizontal')
        for (let o = 0; o < n.length; o++) {
            let b = n[o];
            if (b && i < b.x) return o;
        }
    else
        for (let o = 0; o < n.length; o++) {
            let b = n[o];
            if (b && t < b.y) return o;
        }
    return l.length;
}
function lh(l, i, t, r) {
    let n = l.getBoundingClientRect(),
        o = window.getComputedStyle(l),
        b = o.gridTemplateColumns.split(' ').length,
        g = o.gridTemplateRows.split(' ').length,
        e = n.width / b,
        f = n.height / g,
        h = Math.floor((t - n.left) / e),
        m = Math.floor((r - n.top) / f) * b + h;
    return Math.min(Math.max(m, 0), i.length);
}
function ih(l) {
    let i = document.createElement('div'),
        t = window.getComputedStyle(l),
        r = l.className;
    (i.id = 'onlook-drag-stub'),
        (i.style.width = t.width),
        (i.style.height = t.height),
        (i.style.margin = t.margin),
        (i.style.padding = t.padding),
        (i.style.borderRadius = t.borderRadius),
        (i.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'),
        (i.style.display = 'none'),
        (i.className = r),
        document.body.appendChild(i);
}
function th(l, i, t) {
    let r = document.getElementById('onlook-drag-stub');
    if (!r) return;
    let n = l.parentElement;
    if (!n) return;
    let o = l.getAttribute('data-onlook-drag-direction');
    if (!o) o = sr(n);
    let b = window.getComputedStyle(n),
        g = b.display === 'grid';
    if (!g && b.display === 'flex' && (b.flexDirection === 'row' || b.flexDirection === ''))
        o = 'horizontal';
    let f = Array.from(n.children).filter((c) => c !== l && c !== r),
        h;
    if (g) h = lh(n, f, i, t);
    else h = de(f, i, t, o);
    if ((r.remove(), h >= f.length)) n.appendChild(r);
    else n.insertBefore(r, f[h] ?? null);
    r.style.display = 'block';
}
function Pb() {
    let l = document.getElementById('onlook-drag-stub');
    if (!l) return;
    l.remove();
}
function rh(l, i) {
    let t = document.getElementById('onlook-drag-stub');
    if (!t) return -1;
    return Array.from(l.children)
        .filter((n) => n !== i)
        .indexOf(t);
}
function nh(l) {
    let i = H(l);
    if (!i) return console.warn(`Start drag element not found: ${l}`), null;
    let t = i.parentElement;
    if (!t) return console.warn('Start drag parent not found'), null;
    let n = Array.from(t.children).filter(zi).indexOf(i),
        o = window.getComputedStyle(i);
    if ((r4(i), o.position !== 'absolute')) ih(i);
    let b = n4(i),
        g = i.getBoundingClientRect(),
        e =
            o.position === 'absolute'
                ? { x: b.left, y: b.top }
                : { x: b.left - g.left, y: b.top - g.top };
    return (
        i.setAttribute('data-onlook-drag-start-position', JSON.stringify({ ...b, offset: e })), n
    );
}
function oh(l, i, t, r) {
    let n = H(l);
    if (!n) {
        console.warn('Dragging element not found');
        return;
    }
    let o = n.parentElement;
    if (o) {
        let b = JSON.parse(n.getAttribute('data-onlook-drag-start-position') || '{}'),
            g = o.getBoundingClientRect(),
            e = i - g.left - (r.x - b.offset.x),
            f = t - g.top - (r.y - b.offset.y);
        (n.style.left = `${e}px`), (n.style.top = `${f}px`);
    }
    n.style.transform = 'none';
}
function bh(l, i, t, r, n) {
    let o = H(l);
    if (!o) {
        console.warn('Dragging element not found');
        return;
    }
    if (!o.style.transition) o.style.transition = 'transform 0.05s cubic-bezier(0.2, 0, 0, 1)';
    let b = JSON.parse(o.getAttribute('data-onlook-drag-start-position') || '{}');
    if (o.style.position !== 'fixed') {
        let e = window.getComputedStyle(o);
        (o.style.position = 'fixed'),
            (o.style.width = e.width),
            (o.style.height = e.height),
            (o.style.left = `${b.left}px`),
            (o.style.top = `${b.top}px`);
    }
    if (((o.style.transform = `translate(${i}px, ${t}px)`), o.parentElement)) th(o, r, n);
}
function fh(l) {
    let i = H(l);
    if (!i) return console.warn('End drag element not found'), null;
    let t = window.getComputedStyle(i);
    return eh(i), Jl(i), { left: t.left, top: t.top };
}
function gh(l) {
    let i = H(l);
    if (!i) return console.warn('End drag element not found'), Tb(), null;
    let t = i.parentElement;
    if (!t) return console.warn('End drag parent not found'), Ib(i), null;
    let r = rh(t, i);
    if ((Ib(i), Pb(), r === -1)) return null;
    let n = Array.from(t.children).indexOf(i);
    if (r === n) return null;
    return { newIndex: r, child: nl(i, !1), parent: nl(t, !1) };
}
function r4(l) {
    if (l.getAttribute('data-onlook-drag-saved-style')) return;
    let t = {
        position: l.style.position,
        transform: l.style.transform,
        width: l.style.width,
        height: l.style.height,
        left: l.style.left,
        top: l.style.top,
    };
    if (
        (l.setAttribute('data-onlook-drag-saved-style', JSON.stringify(t)),
        l.setAttribute('data-onlook-dragging', 'true'),
        (l.style.zIndex = '1000'),
        l.getAttribute('data-onlook-drag-direction') !== null)
    ) {
        let r = l.parentElement;
        if (r) {
            let n = sr(r);
            l.setAttribute('data-onlook-drag-direction', n);
        }
    }
}
function Ib(l) {
    Nt(l), eh(l), Jl(l);
}
function eh(l) {
    l.removeAttribute('data-onlook-drag-saved-style'),
        l.removeAttribute('data-onlook-dragging'),
        l.removeAttribute('data-onlook-drag-direction'),
        l.removeAttribute('data-onlook-drag-start-position');
}
function n4(l) {
    let i = l.getBoundingClientRect();
    return { left: i.left + window.scrollX, top: i.top + window.scrollY };
}
function Tb() {
    let l = document.querySelectorAll(`[${'data-onlook-dragging'}]`);
    for (let i of Array.from(l)) Ib(i);
    Pb();
}
function hh(l) {
    let i = H(l);
    if (!i) return console.warn('Start editing text failed. No element for selector:', l), null;
    let t = Array.from(i.childNodes).filter((b) => b.nodeType !== Node.COMMENT_NODE),
        r = null,
        n = t.every(
            (b) =>
                b.nodeType === Node.TEXT_NODE ||
                (b.nodeType === Node.ELEMENT_NODE && b.tagName.toLowerCase() === 'br'),
        );
    if (t.length === 0) r = i;
    else if (t.length === 1 && t[0]?.nodeType === Node.TEXT_NODE) r = i;
    else if (n) r = i;
    if (!r)
        return (
            console.warn('Start editing text failed. No target element found for selector:', l),
            null
        );
    let o = ph(i);
    return wh(r), { originalContent: o };
}
function ch(l, i) {
    let t = H(l);
    if (!t) return console.warn('Edit text failed. No element for selector:', l), null;
    return wh(t), f4(t, i), { domEl: nl(t, !0), newMap: zl(t) };
}
function mh(l) {
    let i = H(l);
    if (!i) return console.warn('Stop editing text failed. No element for selector:', l), null;
    return o4(i), { newContent: ph(i), domEl: nl(i, !0) };
}
function wh(l) {
    l.setAttribute('data-onlook-editing-text', 'true');
}
function o4(l) {
    Nt(l), b4(l);
}
function b4(l) {
    l.removeAttribute('data-onlook-editing-text');
}
function f4(l, i) {
    let t = i.replace(/\n/g, '<br>');
    l.innerHTML = t;
}
function ph(l) {
    let i = l.innerHTML;
    (i = i.replace(
        /<br\s*\/?>/gi,
        `
`,
    )),
        (i = i.replace(/<[^>]*>/g, ''));
    let t = document.createElement('textarea');
    return (t.innerHTML = i), t.value;
}
function uh(l) {
    return !0;
}
function xh() {
    let l = document.body,
        i = { childList: !0, subtree: !0 };
    new MutationObserver((r) => {
        let n = new Map(),
            o = new Map();
        for (let b of r)
            if (b.type === 'childList') {
                let g = b.target;
                b.addedNodes.forEach((e) => {
                    let f = e;
                    if (e.nodeType === Node.ELEMENT_NODE && f.hasAttribute('data-odid') && !zh(f)) {
                        if ((g4(f), g)) {
                            let h = zl(g);
                            if (h) n = new Map([...n, ...h]);
                        }
                    }
                }),
                    b.removedNodes.forEach((e) => {
                        let f = e;
                        if (
                            e.nodeType === Node.ELEMENT_NODE &&
                            f.hasAttribute('data-odid') &&
                            !zh(f)
                        ) {
                            if (g) {
                                let h = zl(g);
                                if (h) o = new Map([...o, ...h]);
                            }
                        }
                    });
            }
        if (n.size > 0 || o.size > 0) {
            if (vl)
                vl.onWindowMutated({
                    added: Object.fromEntries(n),
                    removed: Object.fromEntries(o),
                }).catch((b) => {
                    console.error('Failed to send window mutation event:', b);
                });
        }
    }).observe(l, i);
}
function ah() {
    function l() {
        if (vl)
            vl.onWindowResized().catch((i) => {
                console.error('Failed to send window resize event:', i);
            });
    }
    window.addEventListener('resize', l);
}
function zh(l) {
    if (l.id === 'onlook-drag-stub') return !0;
    if (l.getAttribute('data-onlook-inserted')) return !0;
    return !1;
}
function g4(l) {
    let i = l.getAttribute('data-oid');
    if (!i) return;
    document.querySelectorAll(`[${'data-oid'}="${i}"][${'data-onlook-inserted'}]`).forEach((t) => {
        [
            'data-odid',
            'data-onlook-drag-saved-style',
            'data-onlook-editing-text',
            'data-oiid',
        ].forEach((n) => {
            let o = t.getAttribute(n);
            if (o) l.setAttribute(n, o);
        }),
            t.remove();
    });
}
function _h() {
    xh(), ah();
}
function Zb() {
    _h(), e4(), ii.injectDefaultStyles();
}
var Ci = null;
function e4() {
    if (Ci !== null) clearInterval(Ci), (Ci = null);
    let l = setInterval(() => {
        try {
            if (St() !== null) clearInterval(l), (Ci = null);
        } catch (i) {
            clearInterval(l), (Ci = null), console.warn('Error in keepDomUpdated:', i);
        }
    }, 5000);
    Ci = l;
}
var h4 = setInterval(() => {
    if (
        ((window.onerror = function l(i, t, r) {
            console.log(`Unhandled error: ${i} ${t} ${r}`);
        }),
        window?.document?.body)
    ) {
        clearInterval(h4);
        try {
            Zb();
        } catch (l) {
            console.log('Error in documentBodyInit:', l);
        }
    }
}, 300);
async function Oh() {
    try {
        let { innerWidth: l, innerHeight: i } = window,
            t = document.createElement('canvas'),
            r = t.getContext('2d');
        if (!r) throw new Error('Failed to get canvas context');
        if (
            ((t.width = l),
            (t.height = i),
            navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
        )
            try {
                let o = await navigator.mediaDevices.getDisplayMedia({
                        video: { width: l, height: i },
                    }),
                    b = document.createElement('video');
                (b.srcObject = o),
                    (b.autoplay = !0),
                    (b.muted = !0),
                    await new Promise((e) => {
                        b.onloadedmetadata = () => {
                            b.play(),
                                (b.oncanplay = () => {
                                    r.drawImage(b, 0, 0, l, i),
                                        o.getTracks().forEach((f) => f.stop()),
                                        e();
                                });
                        };
                    });
                let g = await vh(t);
                return (
                    console.log(
                        `Screenshot captured - Size: ~${Math.round((g.length * 0.75) / 1024)} KB`,
                    ),
                    { mimeType: 'image/jpeg', data: g }
                );
            } catch (o) {
                console.log('getDisplayMedia failed, falling back to DOM rendering:', o);
            }
        await c4(r, l, i);
        let n = await vh(t);
        return (
            console.log(
                `DOM screenshot captured - Size: ~${Math.round((n.length * 0.75) / 1024)} KB`,
            ),
            { mimeType: 'image/jpeg', data: n }
        );
    } catch (l) {
        console.error('Failed to capture screenshot:', l);
        let i = document.createElement('canvas'),
            t = i.getContext('2d');
        if (t)
            return (
                (i.width = 400),
                (i.height = 300),
                (t.fillStyle = '#ffffff'),
                t.fillRect(0, 0, 400, 300),
                (t.fillStyle = '#ff0000'),
                (t.font = '14px Arial, sans-serif'),
                (t.textAlign = 'center'),
                t.fillText('Screenshot unavailable', 200, 150),
                { mimeType: 'image/jpeg', data: i.toDataURL('image/jpeg', 0.8) }
            );
        throw l;
    }
}
async function vh(l) {
    let r = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3],
        n = [1, 0.8, 0.6, 0.5, 0.4, 0.3];
    for (let g of n) {
        let e = l;
        if (g < 1) {
            e = document.createElement('canvas');
            let f = e.getContext('2d');
            if (!f) continue;
            (e.width = l.width * g),
                (e.height = l.height * g),
                f.drawImage(l, 0, 0, e.width, e.height);
        }
        for (let f of r) {
            let h = e.toDataURL('image/jpeg', f);
            if (h.length <= 3932160) return h;
        }
    }
    let o = document.createElement('canvas'),
        b = o.getContext('2d');
    if (b)
        return (
            (o.width = l.width * 0.2),
            (o.height = l.height * 0.2),
            b.drawImage(l, 0, 0, o.width, o.height),
            o.toDataURL('image/jpeg', 0.2)
        );
    return l.toDataURL('image/jpeg', 0.1);
}
async function c4(l, i, t) {
    (l.fillStyle = '#ffffff'), l.fillRect(0, 0, i, t);
    let r = document.querySelectorAll('*'),
        n = [];
    for (let o of r)
        if (o instanceof HTMLElement) {
            let b = o.getBoundingClientRect(),
                g = window.getComputedStyle(o);
            if (
                b.width > 0 &&
                b.height > 0 &&
                b.left < i &&
                b.top < t &&
                b.right > 0 &&
                b.bottom > 0 &&
                g.visibility !== 'hidden' &&
                g.display !== 'none' &&
                parseFloat(g.opacity) > 0
            )
                n.push({ element: o, rect: b, styles: g });
        }
    n.sort((o, b) => {
        let g = parseInt(o.styles.zIndex) || 0,
            e = parseInt(b.styles.zIndex) || 0;
        return g - e;
    });
    for (let { element: o, rect: b, styles: g } of n)
        try {
            await m4(l, o, b, g);
        } catch (e) {
            console.warn('Failed to render element:', o, e);
        }
}
async function m4(l, i, t, r) {
    let { left: n, top: o, width: b, height: g } = t;
    if (b < 1 || g < 1 || n > window.innerWidth || o > window.innerHeight) return;
    let e = r.backgroundColor;
    if (e && e !== 'rgba(0, 0, 0, 0)' && e !== 'transparent')
        (l.fillStyle = e), l.fillRect(n, o, b, g);
    let f = parseFloat(r.borderWidth) || 0,
        h = r.borderColor;
    if (f > 0 && h && h !== 'transparent')
        (l.strokeStyle = h), (l.lineWidth = f), l.strokeRect(n, o, b, g);
    if (i.textContent && i.children.length === 0) {
        let c = i.textContent.trim();
        if (c) {
            let m = parseFloat(r.fontSize) || 16,
                u = r.fontFamily || 'Arial, sans-serif',
                X = r.color || '#000000';
            (l.fillStyle = X),
                (l.font = `${m}px ${u}`),
                (l.textAlign = 'left'),
                (l.textBaseline = 'top');
            let I = c.split(' '),
                F = '',
                q = o + 2,
                V = m * 1.2;
            for (let fl of I) {
                let K = F + fl + ' ';
                if (l.measureText(K).width > b - 4 && F !== '') {
                    if ((l.fillText(F, n + 2, q), (F = fl + ' '), (q += V), q > o + g)) break;
                } else F = K;
            }
            if (F && q <= o + g) l.fillText(F, n + 2, q);
        }
    }
    if (i instanceof HTMLImageElement && i.complete && i.naturalWidth > 0)
        try {
            l.drawImage(i, n, o, b, g);
        } catch (c) {
            (l.fillStyle = '#f0f0f0'),
                l.fillRect(n, o, b, g),
                (l.fillStyle = '#999999'),
                (l.font = '12px Arial, sans-serif'),
                (l.textAlign = 'center'),
                l.fillText('Image', n + b / 2, o + g / 2);
        }
}
var rl = {};
D(rl, {
    void: () => I4,
    util: () => B,
    unknown: () => C4,
    union: () => l5,
    undefined: () => k4,
    tuple: () => r5,
    transformer: () => w5,
    symbol: () => U4,
    string: () => Yh,
    strictObject: () => d4,
    setErrorMap: () => u4,
    set: () => b5,
    record: () => n5,
    quotelessJson: () => w4,
    promise: () => m5,
    preprocess: () => z5,
    pipeline: () => x5,
    ostring: () => a5,
    optional: () => p5,
    onumber: () => _5,
    oboolean: () => v5,
    objectUtil: () => db,
    object: () => Z4,
    number: () => Qh,
    nullable: () => u5,
    null: () => S4,
    never: () => P4,
    nativeEnum: () => c5,
    nan: () => M4,
    map: () => o5,
    makeIssue: () => Ft,
    literal: () => e5,
    lazy: () => g5,
    late: () => K4,
    isValid: () => ci,
    isDirty: () => Qr,
    isAsync: () => Ii,
    isAborted: () => Yr,
    intersection: () => t5,
    instanceof: () => H4,
    getParsedType: () => Sl,
    getErrorMap: () => Pi,
    function: () => f5,
    enum: () => h5,
    effect: () => w5,
    discriminatedUnion: () => i5,
    defaultErrorMap: () => ti,
    datetimeRegex: () => Wh,
    date: () => A4,
    custom: () => sh,
    coerce: () => O5,
    boolean: () => Eh,
    bigint: () => y4,
    array: () => T4,
    any: () => N4,
    addIssueToContext: () => x,
    ZodVoid: () => Kt,
    ZodUnknown: () => mi,
    ZodUnion: () => tt,
    ZodUndefined: () => lt,
    ZodType: () => E,
    ZodTuple: () => Cl,
    ZodTransformer: () => Fl,
    ZodSymbol: () => Vt,
    ZodString: () => Gl,
    ZodSet: () => Xi,
    ZodSchema: () => E,
    ZodRecord: () => Ht,
    ZodReadonly: () => et,
    ZodPromise: () => Wi,
    ZodPipeline: () => At,
    ZodParsedType: () => z,
    ZodOptional: () => Bl,
    ZodObject: () => tl,
    ZodNumber: () => wi,
    ZodNullable: () => ni,
    ZodNull: () => it,
    ZodNever: () => Nl,
    ZodNativeEnum: () => bt,
    ZodNaN: () => yt,
    ZodMap: () => Mt,
    ZodLiteral: () => ot,
    ZodLazy: () => nt,
    ZodIssueCode: () => p,
    ZodIntersection: () => rt,
    ZodFunction: () => Zi,
    ZodFirstPartyTypeKind: () => W,
    ZodError: () => $l,
    ZodEnum: () => ui,
    ZodEffects: () => Fl,
    ZodDiscriminatedUnion: () => Er,
    ZodDefault: () => ft,
    ZodDate: () => qi,
    ZodCatch: () => gt,
    ZodBranded: () => Gr,
    ZodBoolean: () => di,
    ZodBigInt: () => pi,
    ZodArray: () => Ll,
    ZodAny: () => Ji,
    Schema: () => E,
    ParseStatus: () => ul,
    OK: () => al,
    NEVER: () => D5,
    INVALID: () => J,
    EMPTY_PATH: () => z4,
    DIRTY: () => $i,
    BRAND: () => V4,
});
var B;
(function (l) {
    l.assertEqual = (n) => {};
    function i(n) {}
    l.assertIs = i;
    function t(n) {
        throw new Error();
    }
    (l.assertNever = t),
        (l.arrayToEnum = (n) => {
            let o = {};
            for (let b of n) o[b] = b;
            return o;
        }),
        (l.getValidEnumValues = (n) => {
            let o = l.objectKeys(n).filter((g) => typeof n[n[g]] !== 'number'),
                b = {};
            for (let g of o) b[g] = n[g];
            return l.objectValues(b);
        }),
        (l.objectValues = (n) => {
            return l.objectKeys(n).map(function (o) {
                return n[o];
            });
        }),
        (l.objectKeys =
            typeof Object.keys === 'function'
                ? (n) => Object.keys(n)
                : (n) => {
                      let o = [];
                      for (let b in n) if (Object.prototype.hasOwnProperty.call(n, b)) o.push(b);
                      return o;
                  }),
        (l.find = (n, o) => {
            for (let b of n) if (o(b)) return b;
            return;
        }),
        (l.isInteger =
            typeof Number.isInteger === 'function'
                ? (n) => Number.isInteger(n)
                : (n) => typeof n === 'number' && Number.isFinite(n) && Math.floor(n) === n);
    function r(n, o = ' | ') {
        return n.map((b) => (typeof b === 'string' ? `'${b}'` : b)).join(o);
    }
    (l.joinValues = r),
        (l.jsonStringifyReplacer = (n, o) => {
            if (typeof o === 'bigint') return o.toString();
            return o;
        });
})(B || (B = {}));
var db;
(function (l) {
    l.mergeShapes = (i, t) => {
        return { ...i, ...t };
    };
})(db || (db = {}));
var z = B.arrayToEnum([
        'string',
        'nan',
        'number',
        'integer',
        'float',
        'boolean',
        'date',
        'bigint',
        'symbol',
        'function',
        'undefined',
        'null',
        'array',
        'object',
        'unknown',
        'promise',
        'void',
        'never',
        'map',
        'set',
    ]),
    Sl = (l) => {
        switch (typeof l) {
            case 'undefined':
                return z.undefined;
            case 'string':
                return z.string;
            case 'number':
                return Number.isNaN(l) ? z.nan : z.number;
            case 'boolean':
                return z.boolean;
            case 'function':
                return z.function;
            case 'bigint':
                return z.bigint;
            case 'symbol':
                return z.symbol;
            case 'object':
                if (Array.isArray(l)) return z.array;
                if (l === null) return z.null;
                if (
                    l.then &&
                    typeof l.then === 'function' &&
                    l.catch &&
                    typeof l.catch === 'function'
                )
                    return z.promise;
                if (typeof Map !== 'undefined' && l instanceof Map) return z.map;
                if (typeof Set !== 'undefined' && l instanceof Set) return z.set;
                if (typeof Date !== 'undefined' && l instanceof Date) return z.date;
                return z.object;
            default:
                return z.unknown;
        }
    };
var p = B.arrayToEnum([
        'invalid_type',
        'invalid_literal',
        'custom',
        'invalid_union',
        'invalid_union_discriminator',
        'invalid_enum_value',
        'unrecognized_keys',
        'invalid_arguments',
        'invalid_return_type',
        'invalid_date',
        'invalid_string',
        'too_small',
        'too_big',
        'invalid_intersection_types',
        'not_multiple_of',
        'not_finite',
    ]),
    w4 = (l) => {
        return JSON.stringify(l, null, 2).replace(/"([^"]+)":/g, '$1:');
    };
class $l extends Error {
    get errors() {
        return this.issues;
    }
    constructor(l) {
        super();
        (this.issues = []),
            (this.addIssue = (t) => {
                this.issues = [...this.issues, t];
            }),
            (this.addIssues = (t = []) => {
                this.issues = [...this.issues, ...t];
            });
        let i = new.target.prototype;
        if (Object.setPrototypeOf) Object.setPrototypeOf(this, i);
        else this.__proto__ = i;
        (this.name = 'ZodError'), (this.issues = l);
    }
    format(l) {
        let i =
                l ||
                function (n) {
                    return n.message;
                },
            t = { _errors: [] },
            r = (n) => {
                for (let o of n.issues)
                    if (o.code === 'invalid_union') o.unionErrors.map(r);
                    else if (o.code === 'invalid_return_type') r(o.returnTypeError);
                    else if (o.code === 'invalid_arguments') r(o.argumentsError);
                    else if (o.path.length === 0) t._errors.push(i(o));
                    else {
                        let b = t,
                            g = 0;
                        while (g < o.path.length) {
                            let e = o.path[g];
                            if (g !== o.path.length - 1) b[e] = b[e] || { _errors: [] };
                            else (b[e] = b[e] || { _errors: [] }), b[e]._errors.push(i(o));
                            (b = b[e]), g++;
                        }
                    }
            };
        return r(this), t;
    }
    static assert(l) {
        if (!(l instanceof $l)) throw new Error(`Not a ZodError: ${l}`);
    }
    toString() {
        return this.message;
    }
    get message() {
        return JSON.stringify(this.issues, B.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
        return this.issues.length === 0;
    }
    flatten(l = (i) => i.message) {
        let i = {},
            t = [];
        for (let r of this.issues)
            if (r.path.length > 0) (i[r.path[0]] = i[r.path[0]] || []), i[r.path[0]].push(l(r));
            else t.push(l(r));
        return { formErrors: t, fieldErrors: i };
    }
    get formErrors() {
        return this.flatten();
    }
}
$l.create = (l) => {
    return new $l(l);
};
var p4 = (l, i) => {
        let t;
        switch (l.code) {
            case p.invalid_type:
                if (l.received === z.undefined) t = 'Required';
                else t = `Expected ${l.expected}, received ${l.received}`;
                break;
            case p.invalid_literal:
                t = `Invalid literal value, expected ${JSON.stringify(l.expected, B.jsonStringifyReplacer)}`;
                break;
            case p.unrecognized_keys:
                t = `Unrecognized key(s) in object: ${B.joinValues(l.keys, ', ')}`;
                break;
            case p.invalid_union:
                t = 'Invalid input';
                break;
            case p.invalid_union_discriminator:
                t = `Invalid discriminator value. Expected ${B.joinValues(l.options)}`;
                break;
            case p.invalid_enum_value:
                t = `Invalid enum value. Expected ${B.joinValues(l.options)}, received '${l.received}'`;
                break;
            case p.invalid_arguments:
                t = 'Invalid function arguments';
                break;
            case p.invalid_return_type:
                t = 'Invalid function return type';
                break;
            case p.invalid_date:
                t = 'Invalid date';
                break;
            case p.invalid_string:
                if (typeof l.validation === 'object')
                    if ('includes' in l.validation) {
                        if (
                            ((t = `Invalid input: must include "${l.validation.includes}"`),
                            typeof l.validation.position === 'number')
                        )
                            t = `${t} at one or more positions greater than or equal to ${l.validation.position}`;
                    } else if ('startsWith' in l.validation)
                        t = `Invalid input: must start with "${l.validation.startsWith}"`;
                    else if ('endsWith' in l.validation)
                        t = `Invalid input: must end with "${l.validation.endsWith}"`;
                    else B.assertNever(l.validation);
                else if (l.validation !== 'regex') t = `Invalid ${l.validation}`;
                else t = 'Invalid';
                break;
            case p.too_small:
                if (l.type === 'array')
                    t = `Array must contain ${l.exact ? 'exactly' : l.inclusive ? 'at least' : 'more than'} ${l.minimum} element(s)`;
                else if (l.type === 'string')
                    t = `String must contain ${l.exact ? 'exactly' : l.inclusive ? 'at least' : 'over'} ${l.minimum} character(s)`;
                else if (l.type === 'number')
                    t = `Number must be ${l.exact ? 'exactly equal to ' : l.inclusive ? 'greater than or equal to ' : 'greater than '}${l.minimum}`;
                else if (l.type === 'date')
                    t = `Date must be ${l.exact ? 'exactly equal to ' : l.inclusive ? 'greater than or equal to ' : 'greater than '}${new Date(Number(l.minimum))}`;
                else t = 'Invalid input';
                break;
            case p.too_big:
                if (l.type === 'array')
                    t = `Array must contain ${l.exact ? 'exactly' : l.inclusive ? 'at most' : 'less than'} ${l.maximum} element(s)`;
                else if (l.type === 'string')
                    t = `String must contain ${l.exact ? 'exactly' : l.inclusive ? 'at most' : 'under'} ${l.maximum} character(s)`;
                else if (l.type === 'number')
                    t = `Number must be ${l.exact ? 'exactly' : l.inclusive ? 'less than or equal to' : 'less than'} ${l.maximum}`;
                else if (l.type === 'bigint')
                    t = `BigInt must be ${l.exact ? 'exactly' : l.inclusive ? 'less than or equal to' : 'less than'} ${l.maximum}`;
                else if (l.type === 'date')
                    t = `Date must be ${l.exact ? 'exactly' : l.inclusive ? 'smaller than or equal to' : 'smaller than'} ${new Date(Number(l.maximum))}`;
                else t = 'Invalid input';
                break;
            case p.custom:
                t = 'Invalid input';
                break;
            case p.invalid_intersection_types:
                t = 'Intersection results could not be merged';
                break;
            case p.not_multiple_of:
                t = `Number must be a multiple of ${l.multipleOf}`;
                break;
            case p.not_finite:
                t = 'Number must be finite';
                break;
            default:
                (t = i.defaultError), B.assertNever(l);
        }
        return { message: t };
    },
    ti = p4;
var Dh = ti;
function u4(l) {
    Dh = l;
}
function Pi() {
    return Dh;
}
var Ft = (l) => {
        let { data: i, path: t, errorMaps: r, issueData: n } = l,
            o = [...t, ...(n.path || [])],
            b = { ...n, path: o };
        if (n.message !== void 0) return { ...n, path: o, message: n.message };
        let g = '',
            e = r
                .filter((f) => !!f)
                .slice()
                .reverse();
        for (let f of e) g = f(b, { data: i, defaultError: g }).message;
        return { ...n, path: o, message: g };
    },
    z4 = [];
function x(l, i) {
    let t = Pi(),
        r = Ft({
            issueData: i,
            data: l.data,
            path: l.path,
            errorMaps: [
                l.common.contextualErrorMap,
                l.schemaErrorMap,
                t,
                t === ti ? void 0 : ti,
            ].filter((n) => !!n),
        });
    l.common.issues.push(r);
}
class ul {
    constructor() {
        this.value = 'valid';
    }
    dirty() {
        if (this.value === 'valid') this.value = 'dirty';
    }
    abort() {
        if (this.value !== 'aborted') this.value = 'aborted';
    }
    static mergeArray(l, i) {
        let t = [];
        for (let r of i) {
            if (r.status === 'aborted') return J;
            if (r.status === 'dirty') l.dirty();
            t.push(r.value);
        }
        return { status: l.value, value: t };
    }
    static async mergeObjectAsync(l, i) {
        let t = [];
        for (let r of i) {
            let n = await r.key,
                o = await r.value;
            t.push({ key: n, value: o });
        }
        return ul.mergeObjectSync(l, t);
    }
    static mergeObjectSync(l, i) {
        let t = {};
        for (let r of i) {
            let { key: n, value: o } = r;
            if (n.status === 'aborted') return J;
            if (o.status === 'aborted') return J;
            if (n.status === 'dirty') l.dirty();
            if (o.status === 'dirty') l.dirty();
            if (n.value !== '__proto__' && (typeof o.value !== 'undefined' || r.alwaysSet))
                t[n.value] = o.value;
        }
        return { status: l.value, value: t };
    }
}
var J = Object.freeze({ status: 'aborted' }),
    $i = (l) => ({ status: 'dirty', value: l }),
    al = (l) => ({ status: 'valid', value: l }),
    Yr = (l) => l.status === 'aborted',
    Qr = (l) => l.status === 'dirty',
    ci = (l) => l.status === 'valid',
    Ii = (l) => typeof Promise !== 'undefined' && l instanceof Promise;
var O;
(function (l) {
    (l.errToObj = (i) => (typeof i === 'string' ? { message: i } : i || {})),
        (l.toString = (i) => (typeof i === 'string' ? i : i?.message));
})(O || (O = {}));
class Rl {
    constructor(l, i, t, r) {
        (this._cachedPath = []),
            (this.parent = l),
            (this.data = i),
            (this._path = t),
            (this._key = r);
    }
    get path() {
        if (!this._cachedPath.length)
            if (Array.isArray(this._key)) this._cachedPath.push(...this._path, ...this._key);
            else this._cachedPath.push(...this._path, this._key);
        return this._cachedPath;
    }
}
var $h = (l, i) => {
    if (ci(i)) return { success: !0, data: i.value };
    else {
        if (!l.common.issues.length) throw new Error('Validation failed but no issues detected.');
        return {
            success: !1,
            get error() {
                if (this._error) return this._error;
                let t = new $l(l.common.issues);
                return (this._error = t), this._error;
            },
        };
    }
};
function Q(l) {
    if (!l) return {};
    let { errorMap: i, invalid_type_error: t, required_error: r, description: n } = l;
    if (i && (t || r))
        throw new Error(
            `Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`,
        );
    if (i) return { errorMap: i, description: n };
    return {
        errorMap: (b, g) => {
            let { message: e } = l;
            if (b.code === 'invalid_enum_value') return { message: e ?? g.defaultError };
            if (typeof g.data === 'undefined') return { message: e ?? r ?? g.defaultError };
            if (b.code !== 'invalid_type') return { message: g.defaultError };
            return { message: e ?? t ?? g.defaultError };
        },
        description: n,
    };
}
class E {
    get description() {
        return this._def.description;
    }
    _getType(l) {
        return Sl(l.data);
    }
    _getOrReturnCtx(l, i) {
        return (
            i || {
                common: l.parent.common,
                data: l.data,
                parsedType: Sl(l.data),
                schemaErrorMap: this._def.errorMap,
                path: l.path,
                parent: l.parent,
            }
        );
    }
    _processInputParams(l) {
        return {
            status: new ul(),
            ctx: {
                common: l.parent.common,
                data: l.data,
                parsedType: Sl(l.data),
                schemaErrorMap: this._def.errorMap,
                path: l.path,
                parent: l.parent,
            },
        };
    }
    _parseSync(l) {
        let i = this._parse(l);
        if (Ii(i)) throw new Error('Synchronous parse encountered promise.');
        return i;
    }
    _parseAsync(l) {
        let i = this._parse(l);
        return Promise.resolve(i);
    }
    parse(l, i) {
        let t = this.safeParse(l, i);
        if (t.success) return t.data;
        throw t.error;
    }
    safeParse(l, i) {
        let t = {
                common: { issues: [], async: i?.async ?? !1, contextualErrorMap: i?.errorMap },
                path: i?.path || [],
                schemaErrorMap: this._def.errorMap,
                parent: null,
                data: l,
                parsedType: Sl(l),
            },
            r = this._parseSync({ data: l, path: t.path, parent: t });
        return $h(t, r);
    }
    '~validate'(l) {
        let i = {
            common: { issues: [], async: !!this['~standard'].async },
            path: [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data: l,
            parsedType: Sl(l),
        };
        if (!this['~standard'].async)
            try {
                let t = this._parseSync({ data: l, path: [], parent: i });
                return ci(t) ? { value: t.value } : { issues: i.common.issues };
            } catch (t) {
                if (t?.message?.toLowerCase()?.includes('encountered'))
                    this['~standard'].async = !0;
                i.common = { issues: [], async: !0 };
            }
        return this._parseAsync({ data: l, path: [], parent: i }).then((t) =>
            ci(t) ? { value: t.value } : { issues: i.common.issues },
        );
    }
    async parseAsync(l, i) {
        let t = await this.safeParseAsync(l, i);
        if (t.success) return t.data;
        throw t.error;
    }
    async safeParseAsync(l, i) {
        let t = {
                common: { issues: [], contextualErrorMap: i?.errorMap, async: !0 },
                path: i?.path || [],
                schemaErrorMap: this._def.errorMap,
                parent: null,
                data: l,
                parsedType: Sl(l),
            },
            r = this._parse({ data: l, path: t.path, parent: t }),
            n = await (Ii(r) ? r : Promise.resolve(r));
        return $h(t, n);
    }
    refine(l, i) {
        let t = (r) => {
            if (typeof i === 'string' || typeof i === 'undefined') return { message: i };
            else if (typeof i === 'function') return i(r);
            else return i;
        };
        return this._refinement((r, n) => {
            let o = l(r),
                b = () => n.addIssue({ code: p.custom, ...t(r) });
            if (typeof Promise !== 'undefined' && o instanceof Promise)
                return o.then((g) => {
                    if (!g) return b(), !1;
                    else return !0;
                });
            if (!o) return b(), !1;
            else return !0;
        });
    }
    refinement(l, i) {
        return this._refinement((t, r) => {
            if (!l(t)) return r.addIssue(typeof i === 'function' ? i(t, r) : i), !1;
            else return !0;
        });
    }
    _refinement(l) {
        return new Fl({
            schema: this,
            typeName: W.ZodEffects,
            effect: { type: 'refinement', refinement: l },
        });
    }
    superRefine(l) {
        return this._refinement(l);
    }
    constructor(l) {
        (this.spa = this.safeParseAsync),
            (this._def = l),
            (this.parse = this.parse.bind(this)),
            (this.safeParse = this.safeParse.bind(this)),
            (this.parseAsync = this.parseAsync.bind(this)),
            (this.safeParseAsync = this.safeParseAsync.bind(this)),
            (this.spa = this.spa.bind(this)),
            (this.refine = this.refine.bind(this)),
            (this.refinement = this.refinement.bind(this)),
            (this.superRefine = this.superRefine.bind(this)),
            (this.optional = this.optional.bind(this)),
            (this.nullable = this.nullable.bind(this)),
            (this.nullish = this.nullish.bind(this)),
            (this.array = this.array.bind(this)),
            (this.promise = this.promise.bind(this)),
            (this.or = this.or.bind(this)),
            (this.and = this.and.bind(this)),
            (this.transform = this.transform.bind(this)),
            (this.brand = this.brand.bind(this)),
            (this.default = this.default.bind(this)),
            (this.catch = this.catch.bind(this)),
            (this.describe = this.describe.bind(this)),
            (this.pipe = this.pipe.bind(this)),
            (this.readonly = this.readonly.bind(this)),
            (this.isNullable = this.isNullable.bind(this)),
            (this.isOptional = this.isOptional.bind(this)),
            (this['~standard'] = {
                version: 1,
                vendor: 'zod',
                validate: (i) => this['~validate'](i),
            });
    }
    optional() {
        return Bl.create(this, this._def);
    }
    nullable() {
        return ni.create(this, this._def);
    }
    nullish() {
        return this.nullable().optional();
    }
    array() {
        return Ll.create(this);
    }
    promise() {
        return Wi.create(this, this._def);
    }
    or(l) {
        return tt.create([this, l], this._def);
    }
    and(l) {
        return rt.create(this, l, this._def);
    }
    transform(l) {
        return new Fl({
            ...Q(this._def),
            schema: this,
            typeName: W.ZodEffects,
            effect: { type: 'transform', transform: l },
        });
    }
    default(l) {
        let i = typeof l === 'function' ? l : () => l;
        return new ft({
            ...Q(this._def),
            innerType: this,
            defaultValue: i,
            typeName: W.ZodDefault,
        });
    }
    brand() {
        return new Gr({ typeName: W.ZodBranded, type: this, ...Q(this._def) });
    }
    catch(l) {
        let i = typeof l === 'function' ? l : () => l;
        return new gt({ ...Q(this._def), innerType: this, catchValue: i, typeName: W.ZodCatch });
    }
    describe(l) {
        return new this.constructor({ ...this._def, description: l });
    }
    pipe(l) {
        return At.create(this, l);
    }
    readonly() {
        return et.create(this);
    }
    isOptional() {
        return this.safeParse(void 0).success;
    }
    isNullable() {
        return this.safeParse(null).success;
    }
}
var x4 = /^c[^\s-]{8,}$/i,
    a4 = /^[0-9a-z]+$/,
    _4 = /^[0-9A-HJKMNP-TV-Z]{26}$/i,
    v4 = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
    O4 = /^[a-z0-9_-]{21}$/i,
    D4 = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    $4 =
        /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
    q4 = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,
    J4 = '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$',
    lf,
    X4 =
        /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    W4 =
        /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
    j4 =
        /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
    s4 =
        /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    Y4 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    Q4 = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
    Jh =
        '((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))',
    E4 = new RegExp(`^${Jh}$`);
function Xh(l) {
    let i = '[0-5]\\d';
    if (l.precision) i = `${i}\\.\\d{${l.precision}}`;
    else if (l.precision == null) i = `${i}(\\.\\d+)?`;
    let t = l.precision ? '+' : '?';
    return `([01]\\d|2[0-3]):[0-5]\\d(:${i})${t}`;
}
function G4(l) {
    return new RegExp(`^${Xh(l)}$`);
}
function Wh(l) {
    let i = `${Jh}T${Xh(l)}`,
        t = [];
    if ((t.push(l.local ? 'Z?' : 'Z'), l.offset)) t.push('([+-]\\d{2}:?\\d{2})');
    return (i = `${i}(${t.join('|')})`), new RegExp(`^${i}$`);
}
function L4(l, i) {
    if ((i === 'v4' || !i) && X4.test(l)) return !0;
    if ((i === 'v6' || !i) && j4.test(l)) return !0;
    return !1;
}
function B4(l, i) {
    if (!D4.test(l)) return !1;
    try {
        let [t] = l.split('.'),
            r = t
                .replace(/-/g, '+')
                .replace(/_/g, '/')
                .padEnd(t.length + ((4 - (t.length % 4)) % 4), '='),
            n = JSON.parse(atob(r));
        if (typeof n !== 'object' || n === null) return !1;
        if ('typ' in n && n?.typ !== 'JWT') return !1;
        if (!n.alg) return !1;
        if (i && n.alg !== i) return !1;
        return !0;
    } catch {
        return !1;
    }
}
function R4(l, i) {
    if ((i === 'v4' || !i) && W4.test(l)) return !0;
    if ((i === 'v6' || !i) && s4.test(l)) return !0;
    return !1;
}
class Gl extends E {
    _parse(l) {
        if (this._def.coerce) l.data = String(l.data);
        if (this._getType(l) !== z.string) {
            let n = this._getOrReturnCtx(l);
            return x(n, { code: p.invalid_type, expected: z.string, received: n.parsedType }), J;
        }
        let t = new ul(),
            r = void 0;
        for (let n of this._def.checks)
            if (n.kind === 'min') {
                if (l.data.length < n.value)
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            code: p.too_small,
                            minimum: n.value,
                            type: 'string',
                            inclusive: !0,
                            exact: !1,
                            message: n.message,
                        }),
                        t.dirty();
            } else if (n.kind === 'max') {
                if (l.data.length > n.value)
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            code: p.too_big,
                            maximum: n.value,
                            type: 'string',
                            inclusive: !0,
                            exact: !1,
                            message: n.message,
                        }),
                        t.dirty();
            } else if (n.kind === 'length') {
                let o = l.data.length > n.value,
                    b = l.data.length < n.value;
                if (o || b) {
                    if (((r = this._getOrReturnCtx(l, r)), o))
                        x(r, {
                            code: p.too_big,
                            maximum: n.value,
                            type: 'string',
                            inclusive: !0,
                            exact: !0,
                            message: n.message,
                        });
                    else if (b)
                        x(r, {
                            code: p.too_small,
                            minimum: n.value,
                            type: 'string',
                            inclusive: !0,
                            exact: !0,
                            message: n.message,
                        });
                    t.dirty();
                }
            } else if (n.kind === 'email') {
                if (!q4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'email', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'emoji') {
                if (!lf) lf = new RegExp(J4, 'u');
                if (!lf.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'emoji', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'uuid') {
                if (!v4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'uuid', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'nanoid') {
                if (!O4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'nanoid', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'cuid') {
                if (!x4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'cuid', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'cuid2') {
                if (!a4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'cuid2', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'ulid') {
                if (!_4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'ulid', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'url')
                try {
                    new URL(l.data);
                } catch {
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'url', code: p.invalid_string, message: n.message }),
                        t.dirty();
                }
            else if (n.kind === 'regex') {
                if (((n.regex.lastIndex = 0), !n.regex.test(l.data)))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'regex', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'trim') l.data = l.data.trim();
            else if (n.kind === 'includes') {
                if (!l.data.includes(n.value, n.position))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            code: p.invalid_string,
                            validation: { includes: n.value, position: n.position },
                            message: n.message,
                        }),
                        t.dirty();
            } else if (n.kind === 'toLowerCase') l.data = l.data.toLowerCase();
            else if (n.kind === 'toUpperCase') l.data = l.data.toUpperCase();
            else if (n.kind === 'startsWith') {
                if (!l.data.startsWith(n.value))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            code: p.invalid_string,
                            validation: { startsWith: n.value },
                            message: n.message,
                        }),
                        t.dirty();
            } else if (n.kind === 'endsWith') {
                if (!l.data.endsWith(n.value))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            code: p.invalid_string,
                            validation: { endsWith: n.value },
                            message: n.message,
                        }),
                        t.dirty();
            } else if (n.kind === 'datetime') {
                if (!Wh(n).test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            code: p.invalid_string,
                            validation: 'datetime',
                            message: n.message,
                        }),
                        t.dirty();
            } else if (n.kind === 'date') {
                if (!E4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { code: p.invalid_string, validation: 'date', message: n.message }),
                        t.dirty();
            } else if (n.kind === 'time') {
                if (!G4(n).test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { code: p.invalid_string, validation: 'time', message: n.message }),
                        t.dirty();
            } else if (n.kind === 'duration') {
                if (!$4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            validation: 'duration',
                            code: p.invalid_string,
                            message: n.message,
                        }),
                        t.dirty();
            } else if (n.kind === 'ip') {
                if (!L4(l.data, n.version))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'ip', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'jwt') {
                if (!B4(l.data, n.alg))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'jwt', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'cidr') {
                if (!R4(l.data, n.version))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'cidr', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'base64') {
                if (!Y4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, { validation: 'base64', code: p.invalid_string, message: n.message }),
                        t.dirty();
            } else if (n.kind === 'base64url') {
                if (!Q4.test(l.data))
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            validation: 'base64url',
                            code: p.invalid_string,
                            message: n.message,
                        }),
                        t.dirty();
            } else B.assertNever(n);
        return { status: t.value, value: l.data };
    }
    _regex(l, i, t) {
        return this.refinement((r) => l.test(r), {
            validation: i,
            code: p.invalid_string,
            ...O.errToObj(t),
        });
    }
    _addCheck(l) {
        return new Gl({ ...this._def, checks: [...this._def.checks, l] });
    }
    email(l) {
        return this._addCheck({ kind: 'email', ...O.errToObj(l) });
    }
    url(l) {
        return this._addCheck({ kind: 'url', ...O.errToObj(l) });
    }
    emoji(l) {
        return this._addCheck({ kind: 'emoji', ...O.errToObj(l) });
    }
    uuid(l) {
        return this._addCheck({ kind: 'uuid', ...O.errToObj(l) });
    }
    nanoid(l) {
        return this._addCheck({ kind: 'nanoid', ...O.errToObj(l) });
    }
    cuid(l) {
        return this._addCheck({ kind: 'cuid', ...O.errToObj(l) });
    }
    cuid2(l) {
        return this._addCheck({ kind: 'cuid2', ...O.errToObj(l) });
    }
    ulid(l) {
        return this._addCheck({ kind: 'ulid', ...O.errToObj(l) });
    }
    base64(l) {
        return this._addCheck({ kind: 'base64', ...O.errToObj(l) });
    }
    base64url(l) {
        return this._addCheck({ kind: 'base64url', ...O.errToObj(l) });
    }
    jwt(l) {
        return this._addCheck({ kind: 'jwt', ...O.errToObj(l) });
    }
    ip(l) {
        return this._addCheck({ kind: 'ip', ...O.errToObj(l) });
    }
    cidr(l) {
        return this._addCheck({ kind: 'cidr', ...O.errToObj(l) });
    }
    datetime(l) {
        if (typeof l === 'string')
            return this._addCheck({
                kind: 'datetime',
                precision: null,
                offset: !1,
                local: !1,
                message: l,
            });
        return this._addCheck({
            kind: 'datetime',
            precision: typeof l?.precision === 'undefined' ? null : l?.precision,
            offset: l?.offset ?? !1,
            local: l?.local ?? !1,
            ...O.errToObj(l?.message),
        });
    }
    date(l) {
        return this._addCheck({ kind: 'date', message: l });
    }
    time(l) {
        if (typeof l === 'string')
            return this._addCheck({ kind: 'time', precision: null, message: l });
        return this._addCheck({
            kind: 'time',
            precision: typeof l?.precision === 'undefined' ? null : l?.precision,
            ...O.errToObj(l?.message),
        });
    }
    duration(l) {
        return this._addCheck({ kind: 'duration', ...O.errToObj(l) });
    }
    regex(l, i) {
        return this._addCheck({ kind: 'regex', regex: l, ...O.errToObj(i) });
    }
    includes(l, i) {
        return this._addCheck({
            kind: 'includes',
            value: l,
            position: i?.position,
            ...O.errToObj(i?.message),
        });
    }
    startsWith(l, i) {
        return this._addCheck({ kind: 'startsWith', value: l, ...O.errToObj(i) });
    }
    endsWith(l, i) {
        return this._addCheck({ kind: 'endsWith', value: l, ...O.errToObj(i) });
    }
    min(l, i) {
        return this._addCheck({ kind: 'min', value: l, ...O.errToObj(i) });
    }
    max(l, i) {
        return this._addCheck({ kind: 'max', value: l, ...O.errToObj(i) });
    }
    length(l, i) {
        return this._addCheck({ kind: 'length', value: l, ...O.errToObj(i) });
    }
    nonempty(l) {
        return this.min(1, O.errToObj(l));
    }
    trim() {
        return new Gl({ ...this._def, checks: [...this._def.checks, { kind: 'trim' }] });
    }
    toLowerCase() {
        return new Gl({ ...this._def, checks: [...this._def.checks, { kind: 'toLowerCase' }] });
    }
    toUpperCase() {
        return new Gl({ ...this._def, checks: [...this._def.checks, { kind: 'toUpperCase' }] });
    }
    get isDatetime() {
        return !!this._def.checks.find((l) => l.kind === 'datetime');
    }
    get isDate() {
        return !!this._def.checks.find((l) => l.kind === 'date');
    }
    get isTime() {
        return !!this._def.checks.find((l) => l.kind === 'time');
    }
    get isDuration() {
        return !!this._def.checks.find((l) => l.kind === 'duration');
    }
    get isEmail() {
        return !!this._def.checks.find((l) => l.kind === 'email');
    }
    get isURL() {
        return !!this._def.checks.find((l) => l.kind === 'url');
    }
    get isEmoji() {
        return !!this._def.checks.find((l) => l.kind === 'emoji');
    }
    get isUUID() {
        return !!this._def.checks.find((l) => l.kind === 'uuid');
    }
    get isNANOID() {
        return !!this._def.checks.find((l) => l.kind === 'nanoid');
    }
    get isCUID() {
        return !!this._def.checks.find((l) => l.kind === 'cuid');
    }
    get isCUID2() {
        return !!this._def.checks.find((l) => l.kind === 'cuid2');
    }
    get isULID() {
        return !!this._def.checks.find((l) => l.kind === 'ulid');
    }
    get isIP() {
        return !!this._def.checks.find((l) => l.kind === 'ip');
    }
    get isCIDR() {
        return !!this._def.checks.find((l) => l.kind === 'cidr');
    }
    get isBase64() {
        return !!this._def.checks.find((l) => l.kind === 'base64');
    }
    get isBase64url() {
        return !!this._def.checks.find((l) => l.kind === 'base64url');
    }
    get minLength() {
        let l = null;
        for (let i of this._def.checks)
            if (i.kind === 'min') {
                if (l === null || i.value > l) l = i.value;
            }
        return l;
    }
    get maxLength() {
        let l = null;
        for (let i of this._def.checks)
            if (i.kind === 'max') {
                if (l === null || i.value < l) l = i.value;
            }
        return l;
    }
}
Gl.create = (l) => {
    return new Gl({ checks: [], typeName: W.ZodString, coerce: l?.coerce ?? !1, ...Q(l) });
};
function F4(l, i) {
    let t = (l.toString().split('.')[1] || '').length,
        r = (i.toString().split('.')[1] || '').length,
        n = t > r ? t : r,
        o = Number.parseInt(l.toFixed(n).replace('.', '')),
        b = Number.parseInt(i.toFixed(n).replace('.', ''));
    return (o % b) / 10 ** n;
}
class wi extends E {
    constructor() {
        super(...arguments);
        (this.min = this.gte), (this.max = this.lte), (this.step = this.multipleOf);
    }
    _parse(l) {
        if (this._def.coerce) l.data = Number(l.data);
        if (this._getType(l) !== z.number) {
            let n = this._getOrReturnCtx(l);
            return x(n, { code: p.invalid_type, expected: z.number, received: n.parsedType }), J;
        }
        let t = void 0,
            r = new ul();
        for (let n of this._def.checks)
            if (n.kind === 'int') {
                if (!B.isInteger(l.data))
                    (t = this._getOrReturnCtx(l, t)),
                        x(t, {
                            code: p.invalid_type,
                            expected: 'integer',
                            received: 'float',
                            message: n.message,
                        }),
                        r.dirty();
            } else if (n.kind === 'min') {
                if (n.inclusive ? l.data < n.value : l.data <= n.value)
                    (t = this._getOrReturnCtx(l, t)),
                        x(t, {
                            code: p.too_small,
                            minimum: n.value,
                            type: 'number',
                            inclusive: n.inclusive,
                            exact: !1,
                            message: n.message,
                        }),
                        r.dirty();
            } else if (n.kind === 'max') {
                if (n.inclusive ? l.data > n.value : l.data >= n.value)
                    (t = this._getOrReturnCtx(l, t)),
                        x(t, {
                            code: p.too_big,
                            maximum: n.value,
                            type: 'number',
                            inclusive: n.inclusive,
                            exact: !1,
                            message: n.message,
                        }),
                        r.dirty();
            } else if (n.kind === 'multipleOf') {
                if (F4(l.data, n.value) !== 0)
                    (t = this._getOrReturnCtx(l, t)),
                        x(t, { code: p.not_multiple_of, multipleOf: n.value, message: n.message }),
                        r.dirty();
            } else if (n.kind === 'finite') {
                if (!Number.isFinite(l.data))
                    (t = this._getOrReturnCtx(l, t)),
                        x(t, { code: p.not_finite, message: n.message }),
                        r.dirty();
            } else B.assertNever(n);
        return { status: r.value, value: l.data };
    }
    gte(l, i) {
        return this.setLimit('min', l, !0, O.toString(i));
    }
    gt(l, i) {
        return this.setLimit('min', l, !1, O.toString(i));
    }
    lte(l, i) {
        return this.setLimit('max', l, !0, O.toString(i));
    }
    lt(l, i) {
        return this.setLimit('max', l, !1, O.toString(i));
    }
    setLimit(l, i, t, r) {
        return new wi({
            ...this._def,
            checks: [
                ...this._def.checks,
                { kind: l, value: i, inclusive: t, message: O.toString(r) },
            ],
        });
    }
    _addCheck(l) {
        return new wi({ ...this._def, checks: [...this._def.checks, l] });
    }
    int(l) {
        return this._addCheck({ kind: 'int', message: O.toString(l) });
    }
    positive(l) {
        return this._addCheck({ kind: 'min', value: 0, inclusive: !1, message: O.toString(l) });
    }
    negative(l) {
        return this._addCheck({ kind: 'max', value: 0, inclusive: !1, message: O.toString(l) });
    }
    nonpositive(l) {
        return this._addCheck({ kind: 'max', value: 0, inclusive: !0, message: O.toString(l) });
    }
    nonnegative(l) {
        return this._addCheck({ kind: 'min', value: 0, inclusive: !0, message: O.toString(l) });
    }
    multipleOf(l, i) {
        return this._addCheck({ kind: 'multipleOf', value: l, message: O.toString(i) });
    }
    finite(l) {
        return this._addCheck({ kind: 'finite', message: O.toString(l) });
    }
    safe(l) {
        return this._addCheck({
            kind: 'min',
            inclusive: !0,
            value: Number.MIN_SAFE_INTEGER,
            message: O.toString(l),
        })._addCheck({
            kind: 'max',
            inclusive: !0,
            value: Number.MAX_SAFE_INTEGER,
            message: O.toString(l),
        });
    }
    get minValue() {
        let l = null;
        for (let i of this._def.checks)
            if (i.kind === 'min') {
                if (l === null || i.value > l) l = i.value;
            }
        return l;
    }
    get maxValue() {
        let l = null;
        for (let i of this._def.checks)
            if (i.kind === 'max') {
                if (l === null || i.value < l) l = i.value;
            }
        return l;
    }
    get isInt() {
        return !!this._def.checks.find(
            (l) => l.kind === 'int' || (l.kind === 'multipleOf' && B.isInteger(l.value)),
        );
    }
    get isFinite() {
        let l = null,
            i = null;
        for (let t of this._def.checks)
            if (t.kind === 'finite' || t.kind === 'int' || t.kind === 'multipleOf') return !0;
            else if (t.kind === 'min') {
                if (i === null || t.value > i) i = t.value;
            } else if (t.kind === 'max') {
                if (l === null || t.value < l) l = t.value;
            }
        return Number.isFinite(i) && Number.isFinite(l);
    }
}
wi.create = (l) => {
    return new wi({ checks: [], typeName: W.ZodNumber, coerce: l?.coerce || !1, ...Q(l) });
};
class pi extends E {
    constructor() {
        super(...arguments);
        (this.min = this.gte), (this.max = this.lte);
    }
    _parse(l) {
        if (this._def.coerce)
            try {
                l.data = BigInt(l.data);
            } catch {
                return this._getInvalidInput(l);
            }
        if (this._getType(l) !== z.bigint) return this._getInvalidInput(l);
        let t = void 0,
            r = new ul();
        for (let n of this._def.checks)
            if (n.kind === 'min') {
                if (n.inclusive ? l.data < n.value : l.data <= n.value)
                    (t = this._getOrReturnCtx(l, t)),
                        x(t, {
                            code: p.too_small,
                            type: 'bigint',
                            minimum: n.value,
                            inclusive: n.inclusive,
                            message: n.message,
                        }),
                        r.dirty();
            } else if (n.kind === 'max') {
                if (n.inclusive ? l.data > n.value : l.data >= n.value)
                    (t = this._getOrReturnCtx(l, t)),
                        x(t, {
                            code: p.too_big,
                            type: 'bigint',
                            maximum: n.value,
                            inclusive: n.inclusive,
                            message: n.message,
                        }),
                        r.dirty();
            } else if (n.kind === 'multipleOf') {
                if (l.data % n.value !== BigInt(0))
                    (t = this._getOrReturnCtx(l, t)),
                        x(t, { code: p.not_multiple_of, multipleOf: n.value, message: n.message }),
                        r.dirty();
            } else B.assertNever(n);
        return { status: r.value, value: l.data };
    }
    _getInvalidInput(l) {
        let i = this._getOrReturnCtx(l);
        return x(i, { code: p.invalid_type, expected: z.bigint, received: i.parsedType }), J;
    }
    gte(l, i) {
        return this.setLimit('min', l, !0, O.toString(i));
    }
    gt(l, i) {
        return this.setLimit('min', l, !1, O.toString(i));
    }
    lte(l, i) {
        return this.setLimit('max', l, !0, O.toString(i));
    }
    lt(l, i) {
        return this.setLimit('max', l, !1, O.toString(i));
    }
    setLimit(l, i, t, r) {
        return new pi({
            ...this._def,
            checks: [
                ...this._def.checks,
                { kind: l, value: i, inclusive: t, message: O.toString(r) },
            ],
        });
    }
    _addCheck(l) {
        return new pi({ ...this._def, checks: [...this._def.checks, l] });
    }
    positive(l) {
        return this._addCheck({
            kind: 'min',
            value: BigInt(0),
            inclusive: !1,
            message: O.toString(l),
        });
    }
    negative(l) {
        return this._addCheck({
            kind: 'max',
            value: BigInt(0),
            inclusive: !1,
            message: O.toString(l),
        });
    }
    nonpositive(l) {
        return this._addCheck({
            kind: 'max',
            value: BigInt(0),
            inclusive: !0,
            message: O.toString(l),
        });
    }
    nonnegative(l) {
        return this._addCheck({
            kind: 'min',
            value: BigInt(0),
            inclusive: !0,
            message: O.toString(l),
        });
    }
    multipleOf(l, i) {
        return this._addCheck({ kind: 'multipleOf', value: l, message: O.toString(i) });
    }
    get minValue() {
        let l = null;
        for (let i of this._def.checks)
            if (i.kind === 'min') {
                if (l === null || i.value > l) l = i.value;
            }
        return l;
    }
    get maxValue() {
        let l = null;
        for (let i of this._def.checks)
            if (i.kind === 'max') {
                if (l === null || i.value < l) l = i.value;
            }
        return l;
    }
}
pi.create = (l) => {
    return new pi({ checks: [], typeName: W.ZodBigInt, coerce: l?.coerce ?? !1, ...Q(l) });
};
class di extends E {
    _parse(l) {
        if (this._def.coerce) l.data = Boolean(l.data);
        if (this._getType(l) !== z.boolean) {
            let t = this._getOrReturnCtx(l);
            return x(t, { code: p.invalid_type, expected: z.boolean, received: t.parsedType }), J;
        }
        return al(l.data);
    }
}
di.create = (l) => {
    return new di({ typeName: W.ZodBoolean, coerce: l?.coerce || !1, ...Q(l) });
};
class qi extends E {
    _parse(l) {
        if (this._def.coerce) l.data = new Date(l.data);
        if (this._getType(l) !== z.date) {
            let n = this._getOrReturnCtx(l);
            return x(n, { code: p.invalid_type, expected: z.date, received: n.parsedType }), J;
        }
        if (Number.isNaN(l.data.getTime())) {
            let n = this._getOrReturnCtx(l);
            return x(n, { code: p.invalid_date }), J;
        }
        let t = new ul(),
            r = void 0;
        for (let n of this._def.checks)
            if (n.kind === 'min') {
                if (l.data.getTime() < n.value)
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            code: p.too_small,
                            message: n.message,
                            inclusive: !0,
                            exact: !1,
                            minimum: n.value,
                            type: 'date',
                        }),
                        t.dirty();
            } else if (n.kind === 'max') {
                if (l.data.getTime() > n.value)
                    (r = this._getOrReturnCtx(l, r)),
                        x(r, {
                            code: p.too_big,
                            message: n.message,
                            inclusive: !0,
                            exact: !1,
                            maximum: n.value,
                            type: 'date',
                        }),
                        t.dirty();
            } else B.assertNever(n);
        return { status: t.value, value: new Date(l.data.getTime()) };
    }
    _addCheck(l) {
        return new qi({ ...this._def, checks: [...this._def.checks, l] });
    }
    min(l, i) {
        return this._addCheck({ kind: 'min', value: l.getTime(), message: O.toString(i) });
    }
    max(l, i) {
        return this._addCheck({ kind: 'max', value: l.getTime(), message: O.toString(i) });
    }
    get minDate() {
        let l = null;
        for (let i of this._def.checks)
            if (i.kind === 'min') {
                if (l === null || i.value > l) l = i.value;
            }
        return l != null ? new Date(l) : null;
    }
    get maxDate() {
        let l = null;
        for (let i of this._def.checks)
            if (i.kind === 'max') {
                if (l === null || i.value < l) l = i.value;
            }
        return l != null ? new Date(l) : null;
    }
}
qi.create = (l) => {
    return new qi({ checks: [], coerce: l?.coerce || !1, typeName: W.ZodDate, ...Q(l) });
};
class Vt extends E {
    _parse(l) {
        if (this._getType(l) !== z.symbol) {
            let t = this._getOrReturnCtx(l);
            return x(t, { code: p.invalid_type, expected: z.symbol, received: t.parsedType }), J;
        }
        return al(l.data);
    }
}
Vt.create = (l) => {
    return new Vt({ typeName: W.ZodSymbol, ...Q(l) });
};
class lt extends E {
    _parse(l) {
        if (this._getType(l) !== z.undefined) {
            let t = this._getOrReturnCtx(l);
            return x(t, { code: p.invalid_type, expected: z.undefined, received: t.parsedType }), J;
        }
        return al(l.data);
    }
}
lt.create = (l) => {
    return new lt({ typeName: W.ZodUndefined, ...Q(l) });
};
class it extends E {
    _parse(l) {
        if (this._getType(l) !== z.null) {
            let t = this._getOrReturnCtx(l);
            return x(t, { code: p.invalid_type, expected: z.null, received: t.parsedType }), J;
        }
        return al(l.data);
    }
}
it.create = (l) => {
    return new it({ typeName: W.ZodNull, ...Q(l) });
};
class Ji extends E {
    constructor() {
        super(...arguments);
        this._any = !0;
    }
    _parse(l) {
        return al(l.data);
    }
}
Ji.create = (l) => {
    return new Ji({ typeName: W.ZodAny, ...Q(l) });
};
class mi extends E {
    constructor() {
        super(...arguments);
        this._unknown = !0;
    }
    _parse(l) {
        return al(l.data);
    }
}
mi.create = (l) => {
    return new mi({ typeName: W.ZodUnknown, ...Q(l) });
};
class Nl extends E {
    _parse(l) {
        let i = this._getOrReturnCtx(l);
        return x(i, { code: p.invalid_type, expected: z.never, received: i.parsedType }), J;
    }
}
Nl.create = (l) => {
    return new Nl({ typeName: W.ZodNever, ...Q(l) });
};
class Kt extends E {
    _parse(l) {
        if (this._getType(l) !== z.undefined) {
            let t = this._getOrReturnCtx(l);
            return x(t, { code: p.invalid_type, expected: z.void, received: t.parsedType }), J;
        }
        return al(l.data);
    }
}
Kt.create = (l) => {
    return new Kt({ typeName: W.ZodVoid, ...Q(l) });
};
class Ll extends E {
    _parse(l) {
        let { ctx: i, status: t } = this._processInputParams(l),
            r = this._def;
        if (i.parsedType !== z.array)
            return x(i, { code: p.invalid_type, expected: z.array, received: i.parsedType }), J;
        if (r.exactLength !== null) {
            let o = i.data.length > r.exactLength.value,
                b = i.data.length < r.exactLength.value;
            if (o || b)
                x(i, {
                    code: o ? p.too_big : p.too_small,
                    minimum: b ? r.exactLength.value : void 0,
                    maximum: o ? r.exactLength.value : void 0,
                    type: 'array',
                    inclusive: !0,
                    exact: !0,
                    message: r.exactLength.message,
                }),
                    t.dirty();
        }
        if (r.minLength !== null) {
            if (i.data.length < r.minLength.value)
                x(i, {
                    code: p.too_small,
                    minimum: r.minLength.value,
                    type: 'array',
                    inclusive: !0,
                    exact: !1,
                    message: r.minLength.message,
                }),
                    t.dirty();
        }
        if (r.maxLength !== null) {
            if (i.data.length > r.maxLength.value)
                x(i, {
                    code: p.too_big,
                    maximum: r.maxLength.value,
                    type: 'array',
                    inclusive: !0,
                    exact: !1,
                    message: r.maxLength.message,
                }),
                    t.dirty();
        }
        if (i.common.async)
            return Promise.all(
                [...i.data].map((o, b) => {
                    return r.type._parseAsync(new Rl(i, o, i.path, b));
                }),
            ).then((o) => {
                return ul.mergeArray(t, o);
            });
        let n = [...i.data].map((o, b) => {
            return r.type._parseSync(new Rl(i, o, i.path, b));
        });
        return ul.mergeArray(t, n);
    }
    get element() {
        return this._def.type;
    }
    min(l, i) {
        return new Ll({ ...this._def, minLength: { value: l, message: O.toString(i) } });
    }
    max(l, i) {
        return new Ll({ ...this._def, maxLength: { value: l, message: O.toString(i) } });
    }
    length(l, i) {
        return new Ll({ ...this._def, exactLength: { value: l, message: O.toString(i) } });
    }
    nonempty(l) {
        return this.min(1, l);
    }
}
Ll.create = (l, i) => {
    return new Ll({
        type: l,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: W.ZodArray,
        ...Q(i),
    });
};
function Ti(l) {
    if (l instanceof tl) {
        let i = {};
        for (let t in l.shape) {
            let r = l.shape[t];
            i[t] = Bl.create(Ti(r));
        }
        return new tl({ ...l._def, shape: () => i });
    } else if (l instanceof Ll) return new Ll({ ...l._def, type: Ti(l.element) });
    else if (l instanceof Bl) return Bl.create(Ti(l.unwrap()));
    else if (l instanceof ni) return ni.create(Ti(l.unwrap()));
    else if (l instanceof Cl) return Cl.create(l.items.map((i) => Ti(i)));
    else return l;
}
class tl extends E {
    constructor() {
        super(...arguments);
        (this._cached = null), (this.nonstrict = this.passthrough), (this.augment = this.extend);
    }
    _getCached() {
        if (this._cached !== null) return this._cached;
        let l = this._def.shape(),
            i = B.objectKeys(l);
        return (this._cached = { shape: l, keys: i }), this._cached;
    }
    _parse(l) {
        if (this._getType(l) !== z.object) {
            let e = this._getOrReturnCtx(l);
            return x(e, { code: p.invalid_type, expected: z.object, received: e.parsedType }), J;
        }
        let { status: t, ctx: r } = this._processInputParams(l),
            { shape: n, keys: o } = this._getCached(),
            b = [];
        if (!(this._def.catchall instanceof Nl && this._def.unknownKeys === 'strip')) {
            for (let e in r.data) if (!o.includes(e)) b.push(e);
        }
        let g = [];
        for (let e of o) {
            let f = n[e],
                h = r.data[e];
            g.push({
                key: { status: 'valid', value: e },
                value: f._parse(new Rl(r, h, r.path, e)),
                alwaysSet: e in r.data,
            });
        }
        if (this._def.catchall instanceof Nl) {
            let e = this._def.unknownKeys;
            if (e === 'passthrough')
                for (let f of b)
                    g.push({
                        key: { status: 'valid', value: f },
                        value: { status: 'valid', value: r.data[f] },
                    });
            else if (e === 'strict') {
                if (b.length > 0) x(r, { code: p.unrecognized_keys, keys: b }), t.dirty();
            } else if (e === 'strip');
            else throw new Error('Internal ZodObject error: invalid unknownKeys value.');
        } else {
            let e = this._def.catchall;
            for (let f of b) {
                let h = r.data[f];
                g.push({
                    key: { status: 'valid', value: f },
                    value: e._parse(new Rl(r, h, r.path, f)),
                    alwaysSet: f in r.data,
                });
            }
        }
        if (r.common.async)
            return Promise.resolve()
                .then(async () => {
                    let e = [];
                    for (let f of g) {
                        let h = await f.key,
                            c = await f.value;
                        e.push({ key: h, value: c, alwaysSet: f.alwaysSet });
                    }
                    return e;
                })
                .then((e) => {
                    return ul.mergeObjectSync(t, e);
                });
        else return ul.mergeObjectSync(t, g);
    }
    get shape() {
        return this._def.shape();
    }
    strict(l) {
        return (
            O.errToObj,
            new tl({
                ...this._def,
                unknownKeys: 'strict',
                ...(l !== void 0
                    ? {
                          errorMap: (i, t) => {
                              let r = this._def.errorMap?.(i, t).message ?? t.defaultError;
                              if (i.code === 'unrecognized_keys')
                                  return { message: O.errToObj(l).message ?? r };
                              return { message: r };
                          },
                      }
                    : {}),
            })
        );
    }
    strip() {
        return new tl({ ...this._def, unknownKeys: 'strip' });
    }
    passthrough() {
        return new tl({ ...this._def, unknownKeys: 'passthrough' });
    }
    extend(l) {
        return new tl({ ...this._def, shape: () => ({ ...this._def.shape(), ...l }) });
    }
    merge(l) {
        return new tl({
            unknownKeys: l._def.unknownKeys,
            catchall: l._def.catchall,
            shape: () => ({ ...this._def.shape(), ...l._def.shape() }),
            typeName: W.ZodObject,
        });
    }
    setKey(l, i) {
        return this.augment({ [l]: i });
    }
    catchall(l) {
        return new tl({ ...this._def, catchall: l });
    }
    pick(l) {
        let i = {};
        for (let t of B.objectKeys(l)) if (l[t] && this.shape[t]) i[t] = this.shape[t];
        return new tl({ ...this._def, shape: () => i });
    }
    omit(l) {
        let i = {};
        for (let t of B.objectKeys(this.shape)) if (!l[t]) i[t] = this.shape[t];
        return new tl({ ...this._def, shape: () => i });
    }
    deepPartial() {
        return Ti(this);
    }
    partial(l) {
        let i = {};
        for (let t of B.objectKeys(this.shape)) {
            let r = this.shape[t];
            if (l && !l[t]) i[t] = r;
            else i[t] = r.optional();
        }
        return new tl({ ...this._def, shape: () => i });
    }
    required(l) {
        let i = {};
        for (let t of B.objectKeys(this.shape))
            if (l && !l[t]) i[t] = this.shape[t];
            else {
                let n = this.shape[t];
                while (n instanceof Bl) n = n._def.innerType;
                i[t] = n;
            }
        return new tl({ ...this._def, shape: () => i });
    }
    keyof() {
        return jh(B.objectKeys(this.shape));
    }
}
tl.create = (l, i) => {
    return new tl({
        shape: () => l,
        unknownKeys: 'strip',
        catchall: Nl.create(),
        typeName: W.ZodObject,
        ...Q(i),
    });
};
tl.strictCreate = (l, i) => {
    return new tl({
        shape: () => l,
        unknownKeys: 'strict',
        catchall: Nl.create(),
        typeName: W.ZodObject,
        ...Q(i),
    });
};
tl.lazycreate = (l, i) => {
    return new tl({
        shape: l,
        unknownKeys: 'strip',
        catchall: Nl.create(),
        typeName: W.ZodObject,
        ...Q(i),
    });
};
class tt extends E {
    _parse(l) {
        let { ctx: i } = this._processInputParams(l),
            t = this._def.options;
        function r(n) {
            for (let b of n) if (b.result.status === 'valid') return b.result;
            for (let b of n)
                if (b.result.status === 'dirty')
                    return i.common.issues.push(...b.ctx.common.issues), b.result;
            let o = n.map((b) => new $l(b.ctx.common.issues));
            return x(i, { code: p.invalid_union, unionErrors: o }), J;
        }
        if (i.common.async)
            return Promise.all(
                t.map(async (n) => {
                    let o = { ...i, common: { ...i.common, issues: [] }, parent: null };
                    return {
                        result: await n._parseAsync({ data: i.data, path: i.path, parent: o }),
                        ctx: o,
                    };
                }),
            ).then(r);
        else {
            let n = void 0,
                o = [];
            for (let g of t) {
                let e = { ...i, common: { ...i.common, issues: [] }, parent: null },
                    f = g._parseSync({ data: i.data, path: i.path, parent: e });
                if (f.status === 'valid') return f;
                else if (f.status === 'dirty' && !n) n = { result: f, ctx: e };
                if (e.common.issues.length) o.push(e.common.issues);
            }
            if (n) return i.common.issues.push(...n.ctx.common.issues), n.result;
            let b = o.map((g) => new $l(g));
            return x(i, { code: p.invalid_union, unionErrors: b }), J;
        }
    }
    get options() {
        return this._def.options;
    }
}
tt.create = (l, i) => {
    return new tt({ options: l, typeName: W.ZodUnion, ...Q(i) });
};
var ri = (l) => {
    if (l instanceof nt) return ri(l.schema);
    else if (l instanceof Fl) return ri(l.innerType());
    else if (l instanceof ot) return [l.value];
    else if (l instanceof ui) return l.options;
    else if (l instanceof bt) return B.objectValues(l.enum);
    else if (l instanceof ft) return ri(l._def.innerType);
    else if (l instanceof lt) return [void 0];
    else if (l instanceof it) return [null];
    else if (l instanceof Bl) return [void 0, ...ri(l.unwrap())];
    else if (l instanceof ni) return [null, ...ri(l.unwrap())];
    else if (l instanceof Gr) return ri(l.unwrap());
    else if (l instanceof et) return ri(l.unwrap());
    else if (l instanceof gt) return ri(l._def.innerType);
    else return [];
};
class Er extends E {
    _parse(l) {
        let { ctx: i } = this._processInputParams(l);
        if (i.parsedType !== z.object)
            return x(i, { code: p.invalid_type, expected: z.object, received: i.parsedType }), J;
        let t = this.discriminator,
            r = i.data[t],
            n = this.optionsMap.get(r);
        if (!n)
            return (
                x(i, {
                    code: p.invalid_union_discriminator,
                    options: Array.from(this.optionsMap.keys()),
                    path: [t],
                }),
                J
            );
        if (i.common.async) return n._parseAsync({ data: i.data, path: i.path, parent: i });
        else return n._parseSync({ data: i.data, path: i.path, parent: i });
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
    static create(l, i, t) {
        let r = new Map();
        for (let n of i) {
            let o = ri(n.shape[l]);
            if (!o.length)
                throw new Error(
                    `A discriminator value for key \`${l}\` could not be extracted from all schema options`,
                );
            for (let b of o) {
                if (r.has(b))
                    throw new Error(
                        `Discriminator property ${String(l)} has duplicate value ${String(b)}`,
                    );
                r.set(b, n);
            }
        }
        return new Er({
            typeName: W.ZodDiscriminatedUnion,
            discriminator: l,
            options: i,
            optionsMap: r,
            ...Q(t),
        });
    }
}
function tf(l, i) {
    let t = Sl(l),
        r = Sl(i);
    if (l === i) return { valid: !0, data: l };
    else if (t === z.object && r === z.object) {
        let n = B.objectKeys(i),
            o = B.objectKeys(l).filter((g) => n.indexOf(g) !== -1),
            b = { ...l, ...i };
        for (let g of o) {
            let e = tf(l[g], i[g]);
            if (!e.valid) return { valid: !1 };
            b[g] = e.data;
        }
        return { valid: !0, data: b };
    } else if (t === z.array && r === z.array) {
        if (l.length !== i.length) return { valid: !1 };
        let n = [];
        for (let o = 0; o < l.length; o++) {
            let b = l[o],
                g = i[o],
                e = tf(b, g);
            if (!e.valid) return { valid: !1 };
            n.push(e.data);
        }
        return { valid: !0, data: n };
    } else if (t === z.date && r === z.date && +l === +i) return { valid: !0, data: l };
    else return { valid: !1 };
}
class rt extends E {
    _parse(l) {
        let { status: i, ctx: t } = this._processInputParams(l),
            r = (n, o) => {
                if (Yr(n) || Yr(o)) return J;
                let b = tf(n.value, o.value);
                if (!b.valid) return x(t, { code: p.invalid_intersection_types }), J;
                if (Qr(n) || Qr(o)) i.dirty();
                return { status: i.value, value: b.data };
            };
        if (t.common.async)
            return Promise.all([
                this._def.left._parseAsync({ data: t.data, path: t.path, parent: t }),
                this._def.right._parseAsync({ data: t.data, path: t.path, parent: t }),
            ]).then(([n, o]) => r(n, o));
        else
            return r(
                this._def.left._parseSync({ data: t.data, path: t.path, parent: t }),
                this._def.right._parseSync({ data: t.data, path: t.path, parent: t }),
            );
    }
}
rt.create = (l, i, t) => {
    return new rt({ left: l, right: i, typeName: W.ZodIntersection, ...Q(t) });
};
class Cl extends E {
    _parse(l) {
        let { status: i, ctx: t } = this._processInputParams(l);
        if (t.parsedType !== z.array)
            return x(t, { code: p.invalid_type, expected: z.array, received: t.parsedType }), J;
        if (t.data.length < this._def.items.length)
            return (
                x(t, {
                    code: p.too_small,
                    minimum: this._def.items.length,
                    inclusive: !0,
                    exact: !1,
                    type: 'array',
                }),
                J
            );
        if (!this._def.rest && t.data.length > this._def.items.length)
            x(t, {
                code: p.too_big,
                maximum: this._def.items.length,
                inclusive: !0,
                exact: !1,
                type: 'array',
            }),
                i.dirty();
        let n = [...t.data]
            .map((o, b) => {
                let g = this._def.items[b] || this._def.rest;
                if (!g) return null;
                return g._parse(new Rl(t, o, t.path, b));
            })
            .filter((o) => !!o);
        if (t.common.async)
            return Promise.all(n).then((o) => {
                return ul.mergeArray(i, o);
            });
        else return ul.mergeArray(i, n);
    }
    get items() {
        return this._def.items;
    }
    rest(l) {
        return new Cl({ ...this._def, rest: l });
    }
}
Cl.create = (l, i) => {
    if (!Array.isArray(l)) throw new Error('You must pass an array of schemas to z.tuple([ ... ])');
    return new Cl({ items: l, typeName: W.ZodTuple, rest: null, ...Q(i) });
};
class Ht extends E {
    get keySchema() {
        return this._def.keyType;
    }
    get valueSchema() {
        return this._def.valueType;
    }
    _parse(l) {
        let { status: i, ctx: t } = this._processInputParams(l);
        if (t.parsedType !== z.object)
            return x(t, { code: p.invalid_type, expected: z.object, received: t.parsedType }), J;
        let r = [],
            n = this._def.keyType,
            o = this._def.valueType;
        for (let b in t.data)
            r.push({
                key: n._parse(new Rl(t, b, t.path, b)),
                value: o._parse(new Rl(t, t.data[b], t.path, b)),
                alwaysSet: b in t.data,
            });
        if (t.common.async) return ul.mergeObjectAsync(i, r);
        else return ul.mergeObjectSync(i, r);
    }
    get element() {
        return this._def.valueType;
    }
    static create(l, i, t) {
        if (i instanceof E)
            return new Ht({ keyType: l, valueType: i, typeName: W.ZodRecord, ...Q(t) });
        return new Ht({ keyType: Gl.create(), valueType: l, typeName: W.ZodRecord, ...Q(i) });
    }
}
class Mt extends E {
    get keySchema() {
        return this._def.keyType;
    }
    get valueSchema() {
        return this._def.valueType;
    }
    _parse(l) {
        let { status: i, ctx: t } = this._processInputParams(l);
        if (t.parsedType !== z.map)
            return x(t, { code: p.invalid_type, expected: z.map, received: t.parsedType }), J;
        let r = this._def.keyType,
            n = this._def.valueType,
            o = [...t.data.entries()].map(([b, g], e) => {
                return {
                    key: r._parse(new Rl(t, b, t.path, [e, 'key'])),
                    value: n._parse(new Rl(t, g, t.path, [e, 'value'])),
                };
            });
        if (t.common.async) {
            let b = new Map();
            return Promise.resolve().then(async () => {
                for (let g of o) {
                    let e = await g.key,
                        f = await g.value;
                    if (e.status === 'aborted' || f.status === 'aborted') return J;
                    if (e.status === 'dirty' || f.status === 'dirty') i.dirty();
                    b.set(e.value, f.value);
                }
                return { status: i.value, value: b };
            });
        } else {
            let b = new Map();
            for (let g of o) {
                let { key: e, value: f } = g;
                if (e.status === 'aborted' || f.status === 'aborted') return J;
                if (e.status === 'dirty' || f.status === 'dirty') i.dirty();
                b.set(e.value, f.value);
            }
            return { status: i.value, value: b };
        }
    }
}
Mt.create = (l, i, t) => {
    return new Mt({ valueType: i, keyType: l, typeName: W.ZodMap, ...Q(t) });
};
class Xi extends E {
    _parse(l) {
        let { status: i, ctx: t } = this._processInputParams(l);
        if (t.parsedType !== z.set)
            return x(t, { code: p.invalid_type, expected: z.set, received: t.parsedType }), J;
        let r = this._def;
        if (r.minSize !== null) {
            if (t.data.size < r.minSize.value)
                x(t, {
                    code: p.too_small,
                    minimum: r.minSize.value,
                    type: 'set',
                    inclusive: !0,
                    exact: !1,
                    message: r.minSize.message,
                }),
                    i.dirty();
        }
        if (r.maxSize !== null) {
            if (t.data.size > r.maxSize.value)
                x(t, {
                    code: p.too_big,
                    maximum: r.maxSize.value,
                    type: 'set',
                    inclusive: !0,
                    exact: !1,
                    message: r.maxSize.message,
                }),
                    i.dirty();
        }
        let n = this._def.valueType;
        function o(g) {
            let e = new Set();
            for (let f of g) {
                if (f.status === 'aborted') return J;
                if (f.status === 'dirty') i.dirty();
                e.add(f.value);
            }
            return { status: i.value, value: e };
        }
        let b = [...t.data.values()].map((g, e) => n._parse(new Rl(t, g, t.path, e)));
        if (t.common.async) return Promise.all(b).then((g) => o(g));
        else return o(b);
    }
    min(l, i) {
        return new Xi({ ...this._def, minSize: { value: l, message: O.toString(i) } });
    }
    max(l, i) {
        return new Xi({ ...this._def, maxSize: { value: l, message: O.toString(i) } });
    }
    size(l, i) {
        return this.min(l, i).max(l, i);
    }
    nonempty(l) {
        return this.min(1, l);
    }
}
Xi.create = (l, i) => {
    return new Xi({ valueType: l, minSize: null, maxSize: null, typeName: W.ZodSet, ...Q(i) });
};
class Zi extends E {
    constructor() {
        super(...arguments);
        this.validate = this.implement;
    }
    _parse(l) {
        let { ctx: i } = this._processInputParams(l);
        if (i.parsedType !== z.function)
            return x(i, { code: p.invalid_type, expected: z.function, received: i.parsedType }), J;
        function t(b, g) {
            return Ft({
                data: b,
                path: i.path,
                errorMaps: [i.common.contextualErrorMap, i.schemaErrorMap, Pi(), ti].filter(
                    (e) => !!e,
                ),
                issueData: { code: p.invalid_arguments, argumentsError: g },
            });
        }
        function r(b, g) {
            return Ft({
                data: b,
                path: i.path,
                errorMaps: [i.common.contextualErrorMap, i.schemaErrorMap, Pi(), ti].filter(
                    (e) => !!e,
                ),
                issueData: { code: p.invalid_return_type, returnTypeError: g },
            });
        }
        let n = { errorMap: i.common.contextualErrorMap },
            o = i.data;
        if (this._def.returns instanceof Wi) {
            let b = this;
            return al(async function (...g) {
                let e = new $l([]),
                    f = await b._def.args.parseAsync(g, n).catch((m) => {
                        throw (e.addIssue(t(g, m)), e);
                    }),
                    h = await Reflect.apply(o, this, f);
                return await b._def.returns._def.type.parseAsync(h, n).catch((m) => {
                    throw (e.addIssue(r(h, m)), e);
                });
            });
        } else {
            let b = this;
            return al(function (...g) {
                let e = b._def.args.safeParse(g, n);
                if (!e.success) throw new $l([t(g, e.error)]);
                let f = Reflect.apply(o, this, e.data),
                    h = b._def.returns.safeParse(f, n);
                if (!h.success) throw new $l([r(f, h.error)]);
                return h.data;
            });
        }
    }
    parameters() {
        return this._def.args;
    }
    returnType() {
        return this._def.returns;
    }
    args(...l) {
        return new Zi({ ...this._def, args: Cl.create(l).rest(mi.create()) });
    }
    returns(l) {
        return new Zi({ ...this._def, returns: l });
    }
    implement(l) {
        return this.parse(l);
    }
    strictImplement(l) {
        return this.parse(l);
    }
    static create(l, i, t) {
        return new Zi({
            args: l ? l : Cl.create([]).rest(mi.create()),
            returns: i || mi.create(),
            typeName: W.ZodFunction,
            ...Q(t),
        });
    }
}
class nt extends E {
    get schema() {
        return this._def.getter();
    }
    _parse(l) {
        let { ctx: i } = this._processInputParams(l);
        return this._def.getter()._parse({ data: i.data, path: i.path, parent: i });
    }
}
nt.create = (l, i) => {
    return new nt({ getter: l, typeName: W.ZodLazy, ...Q(i) });
};
class ot extends E {
    _parse(l) {
        if (l.data !== this._def.value) {
            let i = this._getOrReturnCtx(l);
            return (
                x(i, { received: i.data, code: p.invalid_literal, expected: this._def.value }), J
            );
        }
        return { status: 'valid', value: l.data };
    }
    get value() {
        return this._def.value;
    }
}
ot.create = (l, i) => {
    return new ot({ value: l, typeName: W.ZodLiteral, ...Q(i) });
};
function jh(l, i) {
    return new ui({ values: l, typeName: W.ZodEnum, ...Q(i) });
}
class ui extends E {
    _parse(l) {
        if (typeof l.data !== 'string') {
            let i = this._getOrReturnCtx(l),
                t = this._def.values;
            return (
                x(i, { expected: B.joinValues(t), received: i.parsedType, code: p.invalid_type }), J
            );
        }
        if (!this._cache) this._cache = new Set(this._def.values);
        if (!this._cache.has(l.data)) {
            let i = this._getOrReturnCtx(l),
                t = this._def.values;
            return x(i, { received: i.data, code: p.invalid_enum_value, options: t }), J;
        }
        return al(l.data);
    }
    get options() {
        return this._def.values;
    }
    get enum() {
        let l = {};
        for (let i of this._def.values) l[i] = i;
        return l;
    }
    get Values() {
        let l = {};
        for (let i of this._def.values) l[i] = i;
        return l;
    }
    get Enum() {
        let l = {};
        for (let i of this._def.values) l[i] = i;
        return l;
    }
    extract(l, i = this._def) {
        return ui.create(l, { ...this._def, ...i });
    }
    exclude(l, i = this._def) {
        return ui.create(
            this.options.filter((t) => !l.includes(t)),
            { ...this._def, ...i },
        );
    }
}
ui.create = jh;
class bt extends E {
    _parse(l) {
        let i = B.getValidEnumValues(this._def.values),
            t = this._getOrReturnCtx(l);
        if (t.parsedType !== z.string && t.parsedType !== z.number) {
            let r = B.objectValues(i);
            return (
                x(t, { expected: B.joinValues(r), received: t.parsedType, code: p.invalid_type }), J
            );
        }
        if (!this._cache) this._cache = new Set(B.getValidEnumValues(this._def.values));
        if (!this._cache.has(l.data)) {
            let r = B.objectValues(i);
            return x(t, { received: t.data, code: p.invalid_enum_value, options: r }), J;
        }
        return al(l.data);
    }
    get enum() {
        return this._def.values;
    }
}
bt.create = (l, i) => {
    return new bt({ values: l, typeName: W.ZodNativeEnum, ...Q(i) });
};
class Wi extends E {
    unwrap() {
        return this._def.type;
    }
    _parse(l) {
        let { ctx: i } = this._processInputParams(l);
        if (i.parsedType !== z.promise && i.common.async === !1)
            return x(i, { code: p.invalid_type, expected: z.promise, received: i.parsedType }), J;
        let t = i.parsedType === z.promise ? i.data : Promise.resolve(i.data);
        return al(
            t.then((r) => {
                return this._def.type.parseAsync(r, {
                    path: i.path,
                    errorMap: i.common.contextualErrorMap,
                });
            }),
        );
    }
}
Wi.create = (l, i) => {
    return new Wi({ type: l, typeName: W.ZodPromise, ...Q(i) });
};
class Fl extends E {
    innerType() {
        return this._def.schema;
    }
    sourceType() {
        return this._def.schema._def.typeName === W.ZodEffects
            ? this._def.schema.sourceType()
            : this._def.schema;
    }
    _parse(l) {
        let { status: i, ctx: t } = this._processInputParams(l),
            r = this._def.effect || null,
            n = {
                addIssue: (o) => {
                    if ((x(t, o), o.fatal)) i.abort();
                    else i.dirty();
                },
                get path() {
                    return t.path;
                },
            };
        if (((n.addIssue = n.addIssue.bind(n)), r.type === 'preprocess')) {
            let o = r.transform(t.data, n);
            if (t.common.async)
                return Promise.resolve(o).then(async (b) => {
                    if (i.value === 'aborted') return J;
                    let g = await this._def.schema._parseAsync({
                        data: b,
                        path: t.path,
                        parent: t,
                    });
                    if (g.status === 'aborted') return J;
                    if (g.status === 'dirty') return $i(g.value);
                    if (i.value === 'dirty') return $i(g.value);
                    return g;
                });
            else {
                if (i.value === 'aborted') return J;
                let b = this._def.schema._parseSync({ data: o, path: t.path, parent: t });
                if (b.status === 'aborted') return J;
                if (b.status === 'dirty') return $i(b.value);
                if (i.value === 'dirty') return $i(b.value);
                return b;
            }
        }
        if (r.type === 'refinement') {
            let o = (b) => {
                let g = r.refinement(b, n);
                if (t.common.async) return Promise.resolve(g);
                if (g instanceof Promise)
                    throw new Error(
                        'Async refinement encountered during synchronous parse operation. Use .parseAsync instead.',
                    );
                return b;
            };
            if (t.common.async === !1) {
                let b = this._def.schema._parseSync({ data: t.data, path: t.path, parent: t });
                if (b.status === 'aborted') return J;
                if (b.status === 'dirty') i.dirty();
                return o(b.value), { status: i.value, value: b.value };
            } else
                return this._def.schema
                    ._parseAsync({ data: t.data, path: t.path, parent: t })
                    .then((b) => {
                        if (b.status === 'aborted') return J;
                        if (b.status === 'dirty') i.dirty();
                        return o(b.value).then(() => {
                            return { status: i.value, value: b.value };
                        });
                    });
        }
        if (r.type === 'transform')
            if (t.common.async === !1) {
                let o = this._def.schema._parseSync({ data: t.data, path: t.path, parent: t });
                if (!ci(o)) return J;
                let b = r.transform(o.value, n);
                if (b instanceof Promise)
                    throw new Error(
                        'Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.',
                    );
                return { status: i.value, value: b };
            } else
                return this._def.schema
                    ._parseAsync({ data: t.data, path: t.path, parent: t })
                    .then((o) => {
                        if (!ci(o)) return J;
                        return Promise.resolve(r.transform(o.value, n)).then((b) => ({
                            status: i.value,
                            value: b,
                        }));
                    });
        B.assertNever(r);
    }
}
Fl.create = (l, i, t) => {
    return new Fl({ schema: l, typeName: W.ZodEffects, effect: i, ...Q(t) });
};
Fl.createWithPreprocess = (l, i, t) => {
    return new Fl({
        schema: i,
        effect: { type: 'preprocess', transform: l },
        typeName: W.ZodEffects,
        ...Q(t),
    });
};
class Bl extends E {
    _parse(l) {
        if (this._getType(l) === z.undefined) return al(void 0);
        return this._def.innerType._parse(l);
    }
    unwrap() {
        return this._def.innerType;
    }
}
Bl.create = (l, i) => {
    return new Bl({ innerType: l, typeName: W.ZodOptional, ...Q(i) });
};
class ni extends E {
    _parse(l) {
        if (this._getType(l) === z.null) return al(null);
        return this._def.innerType._parse(l);
    }
    unwrap() {
        return this._def.innerType;
    }
}
ni.create = (l, i) => {
    return new ni({ innerType: l, typeName: W.ZodNullable, ...Q(i) });
};
class ft extends E {
    _parse(l) {
        let { ctx: i } = this._processInputParams(l),
            t = i.data;
        if (i.parsedType === z.undefined) t = this._def.defaultValue();
        return this._def.innerType._parse({ data: t, path: i.path, parent: i });
    }
    removeDefault() {
        return this._def.innerType;
    }
}
ft.create = (l, i) => {
    return new ft({
        innerType: l,
        typeName: W.ZodDefault,
        defaultValue: typeof i.default === 'function' ? i.default : () => i.default,
        ...Q(i),
    });
};
class gt extends E {
    _parse(l) {
        let { ctx: i } = this._processInputParams(l),
            t = { ...i, common: { ...i.common, issues: [] } },
            r = this._def.innerType._parse({ data: t.data, path: t.path, parent: { ...t } });
        if (Ii(r))
            return r.then((n) => {
                return {
                    status: 'valid',
                    value:
                        n.status === 'valid'
                            ? n.value
                            : this._def.catchValue({
                                  get error() {
                                      return new $l(t.common.issues);
                                  },
                                  input: t.data,
                              }),
                };
            });
        else
            return {
                status: 'valid',
                value:
                    r.status === 'valid'
                        ? r.value
                        : this._def.catchValue({
                              get error() {
                                  return new $l(t.common.issues);
                              },
                              input: t.data,
                          }),
            };
    }
    removeCatch() {
        return this._def.innerType;
    }
}
gt.create = (l, i) => {
    return new gt({
        innerType: l,
        typeName: W.ZodCatch,
        catchValue: typeof i.catch === 'function' ? i.catch : () => i.catch,
        ...Q(i),
    });
};
class yt extends E {
    _parse(l) {
        if (this._getType(l) !== z.nan) {
            let t = this._getOrReturnCtx(l);
            return x(t, { code: p.invalid_type, expected: z.nan, received: t.parsedType }), J;
        }
        return { status: 'valid', value: l.data };
    }
}
yt.create = (l) => {
    return new yt({ typeName: W.ZodNaN, ...Q(l) });
};
var V4 = Symbol('zod_brand');
class Gr extends E {
    _parse(l) {
        let { ctx: i } = this._processInputParams(l),
            t = i.data;
        return this._def.type._parse({ data: t, path: i.path, parent: i });
    }
    unwrap() {
        return this._def.type;
    }
}
class At extends E {
    _parse(l) {
        let { status: i, ctx: t } = this._processInputParams(l);
        if (t.common.async)
            return (async () => {
                let n = await this._def.in._parseAsync({ data: t.data, path: t.path, parent: t });
                if (n.status === 'aborted') return J;
                if (n.status === 'dirty') return i.dirty(), $i(n.value);
                else return this._def.out._parseAsync({ data: n.value, path: t.path, parent: t });
            })();
        else {
            let r = this._def.in._parseSync({ data: t.data, path: t.path, parent: t });
            if (r.status === 'aborted') return J;
            if (r.status === 'dirty') return i.dirty(), { status: 'dirty', value: r.value };
            else return this._def.out._parseSync({ data: r.value, path: t.path, parent: t });
        }
    }
    static create(l, i) {
        return new At({ in: l, out: i, typeName: W.ZodPipeline });
    }
}
class et extends E {
    _parse(l) {
        let i = this._def.innerType._parse(l),
            t = (r) => {
                if (ci(r)) r.value = Object.freeze(r.value);
                return r;
            };
        return Ii(i) ? i.then((r) => t(r)) : t(i);
    }
    unwrap() {
        return this._def.innerType;
    }
}
et.create = (l, i) => {
    return new et({ innerType: l, typeName: W.ZodReadonly, ...Q(i) });
};
function qh(l, i) {
    let t = typeof l === 'function' ? l(i) : typeof l === 'string' ? { message: l } : l;
    return typeof t === 'string' ? { message: t } : t;
}
function sh(l, i = {}, t) {
    if (l)
        return Ji.create().superRefine((r, n) => {
            let o = l(r);
            if (o instanceof Promise)
                return o.then((b) => {
                    if (!b) {
                        let g = qh(i, r),
                            e = g.fatal ?? t ?? !0;
                        n.addIssue({ code: 'custom', ...g, fatal: e });
                    }
                });
            if (!o) {
                let b = qh(i, r),
                    g = b.fatal ?? t ?? !0;
                n.addIssue({ code: 'custom', ...b, fatal: g });
            }
            return;
        });
    return Ji.create();
}
var K4 = { object: tl.lazycreate },
    W;
(function (l) {
    (l.ZodString = 'ZodString'),
        (l.ZodNumber = 'ZodNumber'),
        (l.ZodNaN = 'ZodNaN'),
        (l.ZodBigInt = 'ZodBigInt'),
        (l.ZodBoolean = 'ZodBoolean'),
        (l.ZodDate = 'ZodDate'),
        (l.ZodSymbol = 'ZodSymbol'),
        (l.ZodUndefined = 'ZodUndefined'),
        (l.ZodNull = 'ZodNull'),
        (l.ZodAny = 'ZodAny'),
        (l.ZodUnknown = 'ZodUnknown'),
        (l.ZodNever = 'ZodNever'),
        (l.ZodVoid = 'ZodVoid'),
        (l.ZodArray = 'ZodArray'),
        (l.ZodObject = 'ZodObject'),
        (l.ZodUnion = 'ZodUnion'),
        (l.ZodDiscriminatedUnion = 'ZodDiscriminatedUnion'),
        (l.ZodIntersection = 'ZodIntersection'),
        (l.ZodTuple = 'ZodTuple'),
        (l.ZodRecord = 'ZodRecord'),
        (l.ZodMap = 'ZodMap'),
        (l.ZodSet = 'ZodSet'),
        (l.ZodFunction = 'ZodFunction'),
        (l.ZodLazy = 'ZodLazy'),
        (l.ZodLiteral = 'ZodLiteral'),
        (l.ZodEnum = 'ZodEnum'),
        (l.ZodEffects = 'ZodEffects'),
        (l.ZodNativeEnum = 'ZodNativeEnum'),
        (l.ZodOptional = 'ZodOptional'),
        (l.ZodNullable = 'ZodNullable'),
        (l.ZodDefault = 'ZodDefault'),
        (l.ZodCatch = 'ZodCatch'),
        (l.ZodPromise = 'ZodPromise'),
        (l.ZodBranded = 'ZodBranded'),
        (l.ZodPipeline = 'ZodPipeline'),
        (l.ZodReadonly = 'ZodReadonly');
})(W || (W = {}));
var H4 = (l, i = { message: `Input not instance of ${l.name}` }) => sh((t) => t instanceof l, i),
    Yh = Gl.create,
    Qh = wi.create,
    M4 = yt.create,
    y4 = pi.create,
    Eh = di.create,
    A4 = qi.create,
    U4 = Vt.create,
    k4 = lt.create,
    S4 = it.create,
    N4 = Ji.create,
    C4 = mi.create,
    P4 = Nl.create,
    I4 = Kt.create,
    T4 = Ll.create,
    Z4 = tl.create,
    d4 = tl.strictCreate,
    l5 = tt.create,
    i5 = Er.create,
    t5 = rt.create,
    r5 = Cl.create,
    n5 = Ht.create,
    o5 = Mt.create,
    b5 = Xi.create,
    f5 = Zi.create,
    g5 = nt.create,
    e5 = ot.create,
    h5 = ui.create,
    c5 = bt.create,
    m5 = Wi.create,
    w5 = Fl.create,
    p5 = Bl.create,
    u5 = ni.create,
    z5 = Fl.createWithPreprocess,
    x5 = At.create,
    a5 = () => Yh().optional(),
    _5 = () => Qh().optional(),
    v5 = () => Eh().optional(),
    O5 = {
        string: (l) => Gl.create({ ...l, coerce: !0 }),
        number: (l) => wi.create({ ...l, coerce: !0 }),
        boolean: (l) => di.create({ ...l, coerce: !0 }),
        bigint: (l) => pi.create({ ...l, coerce: !0 }),
        date: (l) => qi.create({ ...l, coerce: !0 }),
    };
var D5 = J;
var Gh = rl.object({
        type: rl.enum(['prepend', 'append']),
        targetDomId: rl.string(),
        targetOid: rl.string().nullable(),
    }),
    $5 = Gh.extend({ type: rl.literal('index'), index: rl.number(), originalIndex: rl.number() }),
    mv = rl.discriminatedUnion('type', [$5, Gh]);
var Yv = rl.object({
    title: rl
        .string()
        .describe(
            'The display title of the suggestion. This will be shown to the user. Keep it concise but descriptive.',
        ),
    prompt: rl
        .string()
        .describe(
            'The prompt for the suggestion. This will be used to generate the suggestion. Make this as detailed and specific as possible.',
        ),
});
var Gv = rl.object({
    filesDiscussed: rl
        .array(rl.string())
        .describe('List of file paths mentioned in the conversation'),
    projectContext: rl
        .string()
        .describe('Summary of what the user is building and their overall goals'),
    implementationDetails: rl
        .string()
        .describe('Summary of key code decisions, patterns, and important implementation details'),
    userPreferences: rl
        .string()
        .describe('Specific preferences the user has expressed about implementation, design, etc.'),
    currentStatus: rl.string().describe('Current state of the project and any pending work'),
});
var rO = {
        ['claude-sonnet-4-20250514']: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        ['claude-3-7-sonnet-20250219']: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        ['claude-3-5-haiku-20241022']: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    },
    nO = {
        ['claude-sonnet-4-20250514']: 'claude-sonnet-4@20250514',
        ['claude-3-7-sonnet-20250219']: 'claude-3-7-sonnet@20250219',
        ['claude-3-5-haiku-20241022']: 'claude-3-5-haiku@20241022',
    };
function Lh() {
    try {
        return window?.localStorage.getItem('theme') || 'light';
    } catch (l) {
        return console.warn('Failed to get theme', l), 'light';
    }
}
function Bh(l) {
    try {
        if (l === 'dark')
            document.documentElement.classList.add('dark'),
                window?.localStorage.setItem('theme', 'dark');
        else
            document.documentElement.classList.remove('dark'),
                window?.localStorage.setItem('theme', 'light');
        return !0;
    } catch (i) {
        return console.warn('Failed to set theme', i), !1;
    }
}
function q5(l) {
    return (...i) => {
        try {
            return l(...i);
        } catch (t) {
            return console.error(`Error in ${l.name}:`, t), null;
        }
    };
}
var J5 = {
        processDom: St,
        setFrameId: Sr,
        getComputedStyleByDomId: t0,
        updateElementInstance: e0,
        getFirstOnlookElement: v0,
        captureScreenshot: Oh,
        buildLayerTree: zl,
        getElementAtLoc: g0,
        getElementByDomId: Ct,
        getElementIndex: Ze,
        setElementType: _0,
        getElementType: a0,
        getParentElement: h0,
        getChildrenCount: c0,
        getOffsetParent: m0,
        getActionLocation: x0,
        getActionElement: Pt,
        getInsertLocation: Se,
        getRemoveAction: Ie,
        getTheme: Lh,
        setTheme: Bh,
        startDrag: nh,
        drag: bh,
        dragAbsolute: oh,
        endDrag: gh,
        endDragAbsolute: fh,
        endAllDrag: Tb,
        startEditingText: hh,
        editText: ch,
        stopEditingText: mh,
        isChildTextEditable: uh,
        updateStyle: Ae,
        insertElement: Ne,
        removeElement: Pe,
        moveElement: Te,
        groupElements: w0,
        ungroupElements: p0,
        insertImage: Ue,
        removeImage: ke,
        handleBodyReady: Zb,
    },
    Rh = Object.fromEntries(Object.entries(J5).map(([l, i]) => [l, q5(i)]));
var vl = null,
    Lr = !1,
    Kh = async () => {
        if (Lr || vl) return vl;
        (Lr = !0), console.log(`${ji} - Creating penpal connection`);
        let l = new Nf({ remoteWindow: window.parent, allowedOrigins: ['*'] }),
            i = Sf({ messenger: l, methods: Rh });
        return (
            i.promise
                .then((t) => {
                    if (!t) {
                        console.error(`${ji} - Failed to setup penpal connection: child is null`),
                            Fh();
                        return;
                    }
                    (vl = t), console.log(`${ji} - Penpal connection set`);
                })
                .finally(() => {
                    Lr = !1;
                }),
            i.promise.catch((t) => {
                console.error(`${ji} - Failed to setup penpal connection:`, t), Fh();
            }),
            vl
        );
    },
    Fh = Vh.default(() => {
        if (Lr) return;
        console.log(`${ji} - Reconnecting to penpal parent`), (vl = null), Kh();
    }, 1000);
Kh();
export { vl as penpalParent };

//# debugId=B72FEC03D0FE117364756E2164756E21
//# sourceMappingURL=index.js.map
