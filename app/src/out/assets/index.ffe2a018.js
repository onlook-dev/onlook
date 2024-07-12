const rc = function () {
    const t = document.createElement('link').relList;
    if (t && t.supports && t.supports('modulepreload')) return;
    for (const l of document.querySelectorAll('link[rel="modulepreload"]')) r(l);
    new MutationObserver((l) => {
        for (const o of l)
            if (o.type === 'childList')
                for (const i of o.addedNodes)
                    i.tagName === 'LINK' && i.rel === 'modulepreload' && r(i);
    }).observe(document, { childList: !0, subtree: !0 });
    function n(l) {
        const o = {};
        return (
            l.integrity && (o.integrity = l.integrity),
            l.referrerpolicy && (o.referrerPolicy = l.referrerpolicy),
            l.crossorigin === 'use-credentials'
                ? (o.credentials = 'include')
                : l.crossorigin === 'anonymous'
                  ? (o.credentials = 'omit')
                  : (o.credentials = 'same-origin'),
            o
        );
    }
    function r(l) {
        if (l.ep) return;
        l.ep = !0;
        const o = n(l);
        fetch(l.href, o);
    }
};
rc();
var j = { exports: {} },
    F = {};
/*
object-assign
(c) Sindre Sorhus
@license MIT
*/ var Ti = Object.getOwnPropertySymbols,
    lc = Object.prototype.hasOwnProperty,
    oc = Object.prototype.propertyIsEnumerable;
function ic(e) {
    if (e == null) throw new TypeError('Object.assign cannot be called with null or undefined');
    return Object(e);
}
function uc() {
    try {
        if (!Object.assign) return !1;
        var e = new String('abc');
        if (((e[5] = 'de'), Object.getOwnPropertyNames(e)[0] === '5')) return !1;
        for (var t = {}, n = 0; n < 10; n++) t['_' + String.fromCharCode(n)] = n;
        var r = Object.getOwnPropertyNames(t).map(function (o) {
            return t[o];
        });
        if (r.join('') !== '0123456789') return !1;
        var l = {};
        return (
            'abcdefghijklmnopqrst'.split('').forEach(function (o) {
                l[o] = o;
            }),
            Object.keys(Object.assign({}, l)).join('') === 'abcdefghijklmnopqrst'
        );
    } catch {
        return !1;
    }
}
var bu = uc()
    ? Object.assign
    : function (e, t) {
          for (var n, r = ic(e), l, o = 1; o < arguments.length; o++) {
              n = Object(arguments[o]);
              for (var i in n) lc.call(n, i) && (r[i] = n[i]);
              if (Ti) {
                  l = Ti(n);
                  for (var u = 0; u < l.length; u++) oc.call(n, l[u]) && (r[l[u]] = n[l[u]]);
              }
          }
          return r;
      };
/** @license React v17.0.2
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var zo = bu,
    qt = 60103,
    Ju = 60106;
F.Fragment = 60107;
F.StrictMode = 60108;
F.Profiler = 60114;
var qu = 60109,
    es = 60110,
    ts = 60112;
F.Suspense = 60113;
var ns = 60115,
    rs = 60116;
if (typeof Symbol == 'function' && Symbol.for) {
    var we = Symbol.for;
    (qt = we('react.element')),
        (Ju = we('react.portal')),
        (F.Fragment = we('react.fragment')),
        (F.StrictMode = we('react.strict_mode')),
        (F.Profiler = we('react.profiler')),
        (qu = we('react.provider')),
        (es = we('react.context')),
        (ts = we('react.forward_ref')),
        (F.Suspense = we('react.suspense')),
        (ns = we('react.memo')),
        (rs = we('react.lazy'));
}
var Li = typeof Symbol == 'function' && Symbol.iterator;
function sc(e) {
    return e === null || typeof e != 'object'
        ? null
        : ((e = (Li && e[Li]) || e['@@iterator']), typeof e == 'function' ? e : null);
}
function er(e) {
    for (
        var t = 'https://reactjs.org/docs/error-decoder.html?invariant=' + e, n = 1;
        n < arguments.length;
        n++
    )
        t += '&args[]=' + encodeURIComponent(arguments[n]);
    return (
        'Minified React error #' +
        e +
        '; visit ' +
        t +
        ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
    );
}
var ls = {
        isMounted: function () {
            return !1;
        },
        enqueueForceUpdate: function () {},
        enqueueReplaceState: function () {},
        enqueueSetState: function () {},
    },
    os = {};
function en(e, t, n) {
    (this.props = e), (this.context = t), (this.refs = os), (this.updater = n || ls);
}
en.prototype.isReactComponent = {};
en.prototype.setState = function (e, t) {
    if (typeof e != 'object' && typeof e != 'function' && e != null) throw Error(er(85));
    this.updater.enqueueSetState(this, e, t, 'setState');
};
en.prototype.forceUpdate = function (e) {
    this.updater.enqueueForceUpdate(this, e, 'forceUpdate');
};
function is() {}
is.prototype = en.prototype;
function Ro(e, t, n) {
    (this.props = e), (this.context = t), (this.refs = os), (this.updater = n || ls);
}
var Oo = (Ro.prototype = new is());
Oo.constructor = Ro;
zo(Oo, en.prototype);
Oo.isPureReactComponent = !0;
var Mo = { current: null },
    us = Object.prototype.hasOwnProperty,
    ss = { key: !0, ref: !0, __self: !0, __source: !0 };
function as(e, t, n) {
    var r,
        l = {},
        o = null,
        i = null;
    if (t != null)
        for (r in (t.ref !== void 0 && (i = t.ref), t.key !== void 0 && (o = '' + t.key), t))
            us.call(t, r) && !ss.hasOwnProperty(r) && (l[r] = t[r]);
    var u = arguments.length - 2;
    if (u === 1) l.children = n;
    else if (1 < u) {
        for (var s = Array(u), f = 0; f < u; f++) s[f] = arguments[f + 2];
        l.children = s;
    }
    if (e && e.defaultProps) for (r in ((u = e.defaultProps), u)) l[r] === void 0 && (l[r] = u[r]);
    return {
        $$typeof: qt,
        type: e,
        key: o,
        ref: i,
        props: l,
        _owner: Mo.current,
    };
}
function ac(e, t) {
    return {
        $$typeof: qt,
        type: e.type,
        key: t,
        ref: e.ref,
        props: e.props,
        _owner: e._owner,
    };
}
function jo(e) {
    return typeof e == 'object' && e !== null && e.$$typeof === qt;
}
function cc(e) {
    var t = { '=': '=0', ':': '=2' };
    return (
        '$' +
        e.replace(/[=:]/g, function (n) {
            return t[n];
        })
    );
}
var zi = /\/+/g;
function vl(e, t) {
    return typeof e == 'object' && e !== null && e.key != null ? cc('' + e.key) : t.toString(36);
}
function kr(e, t, n, r, l) {
    var o = typeof e;
    (o === 'undefined' || o === 'boolean') && (e = null);
    var i = !1;
    if (e === null) i = !0;
    else
        switch (o) {
            case 'string':
            case 'number':
                i = !0;
                break;
            case 'object':
                switch (e.$$typeof) {
                    case qt:
                    case Ju:
                        i = !0;
                }
        }
    if (i)
        return (
            (i = e),
            (l = l(i)),
            (e = r === '' ? '.' + vl(i, 0) : r),
            Array.isArray(l)
                ? ((n = ''),
                  e != null && (n = e.replace(zi, '$&/') + '/'),
                  kr(l, t, n, '', function (f) {
                      return f;
                  }))
                : l != null &&
                  (jo(l) &&
                      (l = ac(
                          l,
                          n +
                              (!l.key || (i && i.key === l.key)
                                  ? ''
                                  : ('' + l.key).replace(zi, '$&/') + '/') +
                              e,
                      )),
                  t.push(l)),
            1
        );
    if (((i = 0), (r = r === '' ? '.' : r + ':'), Array.isArray(e)))
        for (var u = 0; u < e.length; u++) {
            o = e[u];
            var s = r + vl(o, u);
            i += kr(o, t, n, s, l);
        }
    else if (((s = sc(e)), typeof s == 'function'))
        for (e = s.call(e), u = 0; !(o = e.next()).done; )
            (o = o.value), (s = r + vl(o, u++)), (i += kr(o, t, n, s, l));
    else if (o === 'object')
        throw (
            ((t = '' + e),
            Error(
                er(
                    31,
                    t === '[object Object]'
                        ? 'object with keys {' + Object.keys(e).join(', ') + '}'
                        : t,
                ),
            ))
        );
    return i;
}
function sr(e, t, n) {
    if (e == null) return e;
    var r = [],
        l = 0;
    return (
        kr(e, r, '', '', function (o) {
            return t.call(n, o, l++);
        }),
        r
    );
}
function fc(e) {
    if (e._status === -1) {
        var t = e._result;
        (t = t()),
            (e._status = 0),
            (e._result = t),
            t.then(
                function (n) {
                    e._status === 0 && ((n = n.default), (e._status = 1), (e._result = n));
                },
                function (n) {
                    e._status === 0 && ((e._status = 2), (e._result = n));
                },
            );
    }
    if (e._status === 1) return e._result;
    throw e._result;
}
var cs = { current: null };
function Ve() {
    var e = cs.current;
    if (e === null) throw Error(er(321));
    return e;
}
var dc = {
    ReactCurrentDispatcher: cs,
    ReactCurrentBatchConfig: { transition: 0 },
    ReactCurrentOwner: Mo,
    IsSomeRendererActing: { current: !1 },
    assign: zo,
};
F.Children = {
    map: sr,
    forEach: function (e, t, n) {
        sr(
            e,
            function () {
                t.apply(this, arguments);
            },
            n,
        );
    },
    count: function (e) {
        var t = 0;
        return (
            sr(e, function () {
                t++;
            }),
            t
        );
    },
    toArray: function (e) {
        return (
            sr(e, function (t) {
                return t;
            }) || []
        );
    },
    only: function (e) {
        if (!jo(e)) throw Error(er(143));
        return e;
    },
};
F.Component = en;
F.PureComponent = Ro;
F.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = dc;
F.cloneElement = function (e, t, n) {
    if (e == null) throw Error(er(267, e));
    var r = zo({}, e.props),
        l = e.key,
        o = e.ref,
        i = e._owner;
    if (t != null) {
        if (
            (t.ref !== void 0 && ((o = t.ref), (i = Mo.current)),
            t.key !== void 0 && (l = '' + t.key),
            e.type && e.type.defaultProps)
        )
            var u = e.type.defaultProps;
        for (s in t)
            us.call(t, s) &&
                !ss.hasOwnProperty(s) &&
                (r[s] = t[s] === void 0 && u !== void 0 ? u[s] : t[s]);
    }
    var s = arguments.length - 2;
    if (s === 1) r.children = n;
    else if (1 < s) {
        u = Array(s);
        for (var f = 0; f < s; f++) u[f] = arguments[f + 2];
        r.children = u;
    }
    return { $$typeof: qt, type: e.type, key: l, ref: o, props: r, _owner: i };
};
F.createContext = function (e, t) {
    return (
        t === void 0 && (t = null),
        (e = {
            $$typeof: es,
            _calculateChangedBits: t,
            _currentValue: e,
            _currentValue2: e,
            _threadCount: 0,
            Provider: null,
            Consumer: null,
        }),
        (e.Provider = { $$typeof: qu, _context: e }),
        (e.Consumer = e)
    );
};
F.createElement = as;
F.createFactory = function (e) {
    var t = as.bind(null, e);
    return (t.type = e), t;
};
F.createRef = function () {
    return { current: null };
};
F.forwardRef = function (e) {
    return { $$typeof: ts, render: e };
};
F.isValidElement = jo;
F.lazy = function (e) {
    return { $$typeof: rs, _payload: { _status: -1, _result: e }, _init: fc };
};
F.memo = function (e, t) {
    return { $$typeof: ns, type: e, compare: t === void 0 ? null : t };
};
F.useCallback = function (e, t) {
    return Ve().useCallback(e, t);
};
F.useContext = function (e, t) {
    return Ve().useContext(e, t);
};
F.useDebugValue = function () {};
F.useEffect = function (e, t) {
    return Ve().useEffect(e, t);
};
F.useImperativeHandle = function (e, t, n) {
    return Ve().useImperativeHandle(e, t, n);
};
F.useLayoutEffect = function (e, t) {
    return Ve().useLayoutEffect(e, t);
};
F.useMemo = function (e, t) {
    return Ve().useMemo(e, t);
};
F.useReducer = function (e, t, n) {
    return Ve().useReducer(e, t, n);
};
F.useRef = function (e) {
    return Ve().useRef(e);
};
F.useState = function (e) {
    return Ve().useState(e);
};
F.version = '17.0.2';
j.exports = F;
var pc = j.exports,
    fs = { exports: {} },
    ye = {},
    ds = { exports: {} },
    ps = {};
/** @license React v0.20.2
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ (function (e) {
    var t, n, r, l;
    if (typeof performance == 'object' && typeof performance.now == 'function') {
        var o = performance;
        e.unstable_now = function () {
            return o.now();
        };
    } else {
        var i = Date,
            u = i.now();
        e.unstable_now = function () {
            return i.now() - u;
        };
    }
    if (typeof window == 'undefined' || typeof MessageChannel != 'function') {
        var s = null,
            f = null,
            g = function () {
                if (s !== null)
                    try {
                        var k = e.unstable_now();
                        s(!0, k), (s = null);
                    } catch (T) {
                        throw (setTimeout(g, 0), T);
                    }
            };
        (t = function (k) {
            s !== null ? setTimeout(t, 0, k) : ((s = k), setTimeout(g, 0));
        }),
            (n = function (k, T) {
                f = setTimeout(k, T);
            }),
            (r = function () {
                clearTimeout(f);
            }),
            (e.unstable_shouldYield = function () {
                return !1;
            }),
            (l = e.unstable_forceFrameRate = function () {});
    } else {
        var E = window.setTimeout,
            m = window.clearTimeout;
        if (typeof console != 'undefined') {
            var S = window.cancelAnimationFrame;
            typeof window.requestAnimationFrame != 'function' &&
                console.error(
                    "This browser doesn't support requestAnimationFrame. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills",
                ),
                typeof S != 'function' &&
                    console.error(
                        "This browser doesn't support cancelAnimationFrame. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills",
                    );
        }
        var x = !1,
            y = null,
            c = -1,
            a = 5,
            d = 0;
        (e.unstable_shouldYield = function () {
            return e.unstable_now() >= d;
        }),
            (l = function () {}),
            (e.unstable_forceFrameRate = function (k) {
                0 > k || 125 < k
                    ? console.error(
                          'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported',
                      )
                    : (a = 0 < k ? Math.floor(1e3 / k) : 5);
            });
        var p = new MessageChannel(),
            h = p.port2;
        (p.port1.onmessage = function () {
            if (y !== null) {
                var k = e.unstable_now();
                d = k + a;
                try {
                    y(!0, k) ? h.postMessage(null) : ((x = !1), (y = null));
                } catch (T) {
                    throw (h.postMessage(null), T);
                }
            } else x = !1;
        }),
            (t = function (k) {
                (y = k), x || ((x = !0), h.postMessage(null));
            }),
            (n = function (k, T) {
                c = E(function () {
                    k(e.unstable_now());
                }, T);
            }),
            (r = function () {
                m(c), (c = -1);
            });
    }
    function P(k, T) {
        var M = k.length;
        k.push(T);
        e: for (;;) {
            var Q = (M - 1) >>> 1,
                b = k[Q];
            if (b !== void 0 && 0 < L(b, T)) (k[Q] = T), (k[M] = b), (M = Q);
            else break e;
        }
    }
    function w(k) {
        return (k = k[0]), k === void 0 ? null : k;
    }
    function N(k) {
        var T = k[0];
        if (T !== void 0) {
            var M = k.pop();
            if (M !== T) {
                k[0] = M;
                e: for (var Q = 0, b = k.length; Q < b; ) {
                    var ct = 2 * (Q + 1) - 1,
                        ft = k[ct],
                        sn = ct + 1,
                        Lt = k[sn];
                    if (ft !== void 0 && 0 > L(ft, M))
                        Lt !== void 0 && 0 > L(Lt, ft)
                            ? ((k[Q] = Lt), (k[sn] = M), (Q = sn))
                            : ((k[Q] = ft), (k[ct] = M), (Q = ct));
                    else if (Lt !== void 0 && 0 > L(Lt, M)) (k[Q] = Lt), (k[sn] = M), (Q = sn);
                    else break e;
                }
            }
            return T;
        }
        return null;
    }
    function L(k, T) {
        var M = k.sortIndex - T.sortIndex;
        return M !== 0 ? M : k.id - T.id;
    }
    var _ = [],
        H = [],
        st = 1,
        O = null,
        Y = 3,
        ze = !1,
        Se = !1,
        Ee = !1;
    function Tt(k) {
        for (var T = w(H); T !== null; ) {
            if (T.callback === null) N(H);
            else if (T.startTime <= k) N(H), (T.sortIndex = T.expirationTime), P(_, T);
            else break;
            T = w(H);
        }
    }
    function at(k) {
        if (((Ee = !1), Tt(k), !Se))
            if (w(_) !== null) (Se = !0), t(Re);
            else {
                var T = w(H);
                T !== null && n(at, T.startTime - k);
            }
    }
    function Re(k, T) {
        (Se = !1), Ee && ((Ee = !1), r()), (ze = !0);
        var M = Y;
        try {
            for (
                Tt(T), O = w(_);
                O !== null && (!(O.expirationTime > T) || (k && !e.unstable_shouldYield()));

            ) {
                var Q = O.callback;
                if (typeof Q == 'function') {
                    (O.callback = null), (Y = O.priorityLevel);
                    var b = Q(O.expirationTime <= T);
                    (T = e.unstable_now()),
                        typeof b == 'function' ? (O.callback = b) : O === w(_) && N(_),
                        Tt(T);
                } else N(_);
                O = w(_);
            }
            if (O !== null) var ct = !0;
            else {
                var ft = w(H);
                ft !== null && n(at, ft.startTime - T), (ct = !1);
            }
            return ct;
        } finally {
            (O = null), (Y = M), (ze = !1);
        }
    }
    var ur = l;
    (e.unstable_IdlePriority = 5),
        (e.unstable_ImmediatePriority = 1),
        (e.unstable_LowPriority = 4),
        (e.unstable_NormalPriority = 3),
        (e.unstable_Profiling = null),
        (e.unstable_UserBlockingPriority = 2),
        (e.unstable_cancelCallback = function (k) {
            k.callback = null;
        }),
        (e.unstable_continueExecution = function () {
            Se || ze || ((Se = !0), t(Re));
        }),
        (e.unstable_getCurrentPriorityLevel = function () {
            return Y;
        }),
        (e.unstable_getFirstCallbackNode = function () {
            return w(_);
        }),
        (e.unstable_next = function (k) {
            switch (Y) {
                case 1:
                case 2:
                case 3:
                    var T = 3;
                    break;
                default:
                    T = Y;
            }
            var M = Y;
            Y = T;
            try {
                return k();
            } finally {
                Y = M;
            }
        }),
        (e.unstable_pauseExecution = function () {}),
        (e.unstable_requestPaint = ur),
        (e.unstable_runWithPriority = function (k, T) {
            switch (k) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    break;
                default:
                    k = 3;
            }
            var M = Y;
            Y = k;
            try {
                return T();
            } finally {
                Y = M;
            }
        }),
        (e.unstable_scheduleCallback = function (k, T, M) {
            var Q = e.unstable_now();
            switch (
                (typeof M == 'object' && M !== null
                    ? ((M = M.delay), (M = typeof M == 'number' && 0 < M ? Q + M : Q))
                    : (M = Q),
                k)
            ) {
                case 1:
                    var b = -1;
                    break;
                case 2:
                    b = 250;
                    break;
                case 5:
                    b = 1073741823;
                    break;
                case 4:
                    b = 1e4;
                    break;
                default:
                    b = 5e3;
            }
            return (
                (b = M + b),
                (k = {
                    id: st++,
                    callback: T,
                    priorityLevel: k,
                    startTime: M,
                    expirationTime: b,
                    sortIndex: -1,
                }),
                M > Q
                    ? ((k.sortIndex = M),
                      P(H, k),
                      w(_) === null && k === w(H) && (Ee ? r() : (Ee = !0), n(at, M - Q)))
                    : ((k.sortIndex = b), P(_, k), Se || ze || ((Se = !0), t(Re))),
                k
            );
        }),
        (e.unstable_wrapCallback = function (k) {
            var T = Y;
            return function () {
                var M = Y;
                Y = T;
                try {
                    return k.apply(this, arguments);
                } finally {
                    Y = M;
                }
            };
        });
})(ps);
ds.exports = ps;
/** @license React v17.0.2
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var nl = j.exports,
    $ = bu,
    Z = ds.exports;
function v(e) {
    for (
        var t = 'https://reactjs.org/docs/error-decoder.html?invariant=' + e, n = 1;
        n < arguments.length;
        n++
    )
        t += '&args[]=' + encodeURIComponent(arguments[n]);
    return (
        'Minified React error #' +
        e +
        '; visit ' +
        t +
        ' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
    );
}
if (!nl) throw Error(v(227));
var ms = new Set(),
    An = {};
function Ct(e, t) {
    Xt(e, t), Xt(e + 'Capture', t);
}
function Xt(e, t) {
    for (An[e] = t, e = 0; e < t.length; e++) ms.add(t[e]);
}
var Ue = !(
        typeof window == 'undefined' ||
        typeof window.document == 'undefined' ||
        typeof window.document.createElement == 'undefined'
    ),
    mc =
        /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
    Ri = Object.prototype.hasOwnProperty,
    Oi = {},
    Mi = {};
function hc(e) {
    return Ri.call(Mi, e)
        ? !0
        : Ri.call(Oi, e)
          ? !1
          : mc.test(e)
            ? (Mi[e] = !0)
            : ((Oi[e] = !0), !1);
}
function gc(e, t, n, r) {
    if (n !== null && n.type === 0) return !1;
    switch (typeof t) {
        case 'function':
        case 'symbol':
            return !0;
        case 'boolean':
            return r
                ? !1
                : n !== null
                  ? !n.acceptsBooleans
                  : ((e = e.toLowerCase().slice(0, 5)), e !== 'data-' && e !== 'aria-');
        default:
            return !1;
    }
}
function vc(e, t, n, r) {
    if (t === null || typeof t == 'undefined' || gc(e, t, n, r)) return !0;
    if (r) return !1;
    if (n !== null)
        switch (n.type) {
            case 3:
                return !t;
            case 4:
                return t === !1;
            case 5:
                return isNaN(t);
            case 6:
                return isNaN(t) || 1 > t;
        }
    return !1;
}
function ie(e, t, n, r, l, o, i) {
    (this.acceptsBooleans = t === 2 || t === 3 || t === 4),
        (this.attributeName = r),
        (this.attributeNamespace = l),
        (this.mustUseProperty = n),
        (this.propertyName = e),
        (this.type = t),
        (this.sanitizeURL = o),
        (this.removeEmptyString = i);
}
var ee = {};
'children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style'
    .split(' ')
    .forEach(function (e) {
        ee[e] = new ie(e, 0, !1, e, null, !1, !1);
    });
[
    ['acceptCharset', 'accept-charset'],
    ['className', 'class'],
    ['htmlFor', 'for'],
    ['httpEquiv', 'http-equiv'],
].forEach(function (e) {
    var t = e[0];
    ee[t] = new ie(t, 1, !1, e[1], null, !1, !1);
});
['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (e) {
    ee[e] = new ie(e, 2, !1, e.toLowerCase(), null, !1, !1);
});
['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(function (e) {
    ee[e] = new ie(e, 2, !1, e, null, !1, !1);
});
'allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope'
    .split(' ')
    .forEach(function (e) {
        ee[e] = new ie(e, 3, !1, e.toLowerCase(), null, !1, !1);
    });
['checked', 'multiple', 'muted', 'selected'].forEach(function (e) {
    ee[e] = new ie(e, 3, !0, e, null, !1, !1);
});
['capture', 'download'].forEach(function (e) {
    ee[e] = new ie(e, 4, !1, e, null, !1, !1);
});
['cols', 'rows', 'size', 'span'].forEach(function (e) {
    ee[e] = new ie(e, 6, !1, e, null, !1, !1);
});
['rowSpan', 'start'].forEach(function (e) {
    ee[e] = new ie(e, 5, !1, e.toLowerCase(), null, !1, !1);
});
var Io = /[\-:]([a-z])/g;
function Fo(e) {
    return e[1].toUpperCase();
}
'accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height'
    .split(' ')
    .forEach(function (e) {
        var t = e.replace(Io, Fo);
        ee[t] = new ie(t, 1, !1, e, null, !1, !1);
    });
'xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type'
    .split(' ')
    .forEach(function (e) {
        var t = e.replace(Io, Fo);
        ee[t] = new ie(t, 1, !1, e, 'http://www.w3.org/1999/xlink', !1, !1);
    });
['xml:base', 'xml:lang', 'xml:space'].forEach(function (e) {
    var t = e.replace(Io, Fo);
    ee[t] = new ie(t, 1, !1, e, 'http://www.w3.org/XML/1998/namespace', !1, !1);
});
['tabIndex', 'crossOrigin'].forEach(function (e) {
    ee[e] = new ie(e, 1, !1, e.toLowerCase(), null, !1, !1);
});
ee.xlinkHref = new ie('xlinkHref', 1, !1, 'xlink:href', 'http://www.w3.org/1999/xlink', !0, !1);
['src', 'href', 'action', 'formAction'].forEach(function (e) {
    ee[e] = new ie(e, 1, !1, e.toLowerCase(), null, !0, !0);
});
function Do(e, t, n, r) {
    var l = ee.hasOwnProperty(t) ? ee[t] : null,
        o =
            l !== null
                ? l.type === 0
                : r
                  ? !1
                  : !(
                        !(2 < t.length) ||
                        (t[0] !== 'o' && t[0] !== 'O') ||
                        (t[1] !== 'n' && t[1] !== 'N')
                    );
    o ||
        (vc(t, n, l, r) && (n = null),
        r || l === null
            ? hc(t) && (n === null ? e.removeAttribute(t) : e.setAttribute(t, '' + n))
            : l.mustUseProperty
              ? (e[l.propertyName] = n === null ? (l.type === 3 ? !1 : '') : n)
              : ((t = l.attributeName),
                (r = l.attributeNamespace),
                n === null
                    ? e.removeAttribute(t)
                    : ((l = l.type),
                      (n = l === 3 || (l === 4 && n === !0) ? '' : '' + n),
                      r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
}
var _t = nl.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
    En = 60103,
    pt = 60106,
    We = 60107,
    Uo = 60108,
    Tn = 60114,
    Vo = 60109,
    Ao = 60110,
    rl = 60112,
    Ln = 60113,
    Mr = 60120,
    ll = 60115,
    $o = 60116,
    Bo = 60121,
    Wo = 60128,
    hs = 60129,
    Ho = 60130,
    $l = 60131;
if (typeof Symbol == 'function' && Symbol.for) {
    var X = Symbol.for;
    (En = X('react.element')),
        (pt = X('react.portal')),
        (We = X('react.fragment')),
        (Uo = X('react.strict_mode')),
        (Tn = X('react.profiler')),
        (Vo = X('react.provider')),
        (Ao = X('react.context')),
        (rl = X('react.forward_ref')),
        (Ln = X('react.suspense')),
        (Mr = X('react.suspense_list')),
        (ll = X('react.memo')),
        ($o = X('react.lazy')),
        (Bo = X('react.block')),
        X('react.scope'),
        (Wo = X('react.opaque.id')),
        (hs = X('react.debug_trace_mode')),
        (Ho = X('react.offscreen')),
        ($l = X('react.legacy_hidden'));
}
var ji = typeof Symbol == 'function' && Symbol.iterator;
function an(e) {
    return e === null || typeof e != 'object'
        ? null
        : ((e = (ji && e[ji]) || e['@@iterator']), typeof e == 'function' ? e : null);
}
var yl;
function Cn(e) {
    if (yl === void 0)
        try {
            throw Error();
        } catch (n) {
            var t = n.stack.trim().match(/\n( *(at )?)/);
            yl = (t && t[1]) || '';
        }
    return (
        `
` +
        yl +
        e
    );
}
var wl = !1;
function ar(e, t) {
    if (!e || wl) return '';
    wl = !0;
    var n = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
        if (t)
            if (
                ((t = function () {
                    throw Error();
                }),
                Object.defineProperty(t.prototype, 'props', {
                    set: function () {
                        throw Error();
                    },
                }),
                typeof Reflect == 'object' && Reflect.construct)
            ) {
                try {
                    Reflect.construct(t, []);
                } catch (s) {
                    var r = s;
                }
                Reflect.construct(e, [], t);
            } else {
                try {
                    t.call();
                } catch (s) {
                    r = s;
                }
                e.call(t.prototype);
            }
        else {
            try {
                throw Error();
            } catch (s) {
                r = s;
            }
            e();
        }
    } catch (s) {
        if (s && r && typeof s.stack == 'string') {
            for (
                var l = s.stack.split(`
`),
                    o = r.stack.split(`
`),
                    i = l.length - 1,
                    u = o.length - 1;
                1 <= i && 0 <= u && l[i] !== o[u];

            )
                u--;
            for (; 1 <= i && 0 <= u; i--, u--)
                if (l[i] !== o[u]) {
                    if (i !== 1 || u !== 1)
                        do
                            if ((i--, u--, 0 > u || l[i] !== o[u]))
                                return (
                                    `
` + l[i].replace(' at new ', ' at ')
                                );
                        while (1 <= i && 0 <= u);
                    break;
                }
        }
    } finally {
        (wl = !1), (Error.prepareStackTrace = n);
    }
    return (e = e ? e.displayName || e.name : '') ? Cn(e) : '';
}
function yc(e) {
    switch (e.tag) {
        case 5:
            return Cn(e.type);
        case 16:
            return Cn('Lazy');
        case 13:
            return Cn('Suspense');
        case 19:
            return Cn('SuspenseList');
        case 0:
        case 2:
        case 15:
            return (e = ar(e.type, !1)), e;
        case 11:
            return (e = ar(e.type.render, !1)), e;
        case 22:
            return (e = ar(e.type._render, !1)), e;
        case 1:
            return (e = ar(e.type, !0)), e;
        default:
            return '';
    }
}
function Vt(e) {
    if (e == null) return null;
    if (typeof e == 'function') return e.displayName || e.name || null;
    if (typeof e == 'string') return e;
    switch (e) {
        case We:
            return 'Fragment';
        case pt:
            return 'Portal';
        case Tn:
            return 'Profiler';
        case Uo:
            return 'StrictMode';
        case Ln:
            return 'Suspense';
        case Mr:
            return 'SuspenseList';
    }
    if (typeof e == 'object')
        switch (e.$$typeof) {
            case Ao:
                return (e.displayName || 'Context') + '.Consumer';
            case Vo:
                return (e._context.displayName || 'Context') + '.Provider';
            case rl:
                var t = e.render;
                return (
                    (t = t.displayName || t.name || ''),
                    e.displayName || (t !== '' ? 'ForwardRef(' + t + ')' : 'ForwardRef')
                );
            case ll:
                return Vt(e.type);
            case Bo:
                return Vt(e._render);
            case $o:
                (t = e._payload), (e = e._init);
                try {
                    return Vt(e(t));
                } catch {}
        }
    return null;
}
function tt(e) {
    switch (typeof e) {
        case 'boolean':
        case 'number':
        case 'object':
        case 'string':
        case 'undefined':
            return e;
        default:
            return '';
    }
}
function gs(e) {
    var t = e.type;
    return (e = e.nodeName) && e.toLowerCase() === 'input' && (t === 'checkbox' || t === 'radio');
}
function wc(e) {
    var t = gs(e) ? 'checked' : 'value',
        n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
        r = '' + e[t];
    if (
        !e.hasOwnProperty(t) &&
        typeof n != 'undefined' &&
        typeof n.get == 'function' &&
        typeof n.set == 'function'
    ) {
        var l = n.get,
            o = n.set;
        return (
            Object.defineProperty(e, t, {
                configurable: !0,
                get: function () {
                    return l.call(this);
                },
                set: function (i) {
                    (r = '' + i), o.call(this, i);
                },
            }),
            Object.defineProperty(e, t, { enumerable: n.enumerable }),
            {
                getValue: function () {
                    return r;
                },
                setValue: function (i) {
                    r = '' + i;
                },
                stopTracking: function () {
                    (e._valueTracker = null), delete e[t];
                },
            }
        );
    }
}
function cr(e) {
    e._valueTracker || (e._valueTracker = wc(e));
}
function vs(e) {
    if (!e) return !1;
    var t = e._valueTracker;
    if (!t) return !0;
    var n = t.getValue(),
        r = '';
    return (
        e && (r = gs(e) ? (e.checked ? 'true' : 'false') : e.value),
        (e = r),
        e !== n ? (t.setValue(e), !0) : !1
    );
}
function jr(e) {
    if (((e = e || (typeof document != 'undefined' ? document : void 0)), typeof e == 'undefined'))
        return null;
    try {
        return e.activeElement || e.body;
    } catch {
        return e.body;
    }
}
function Bl(e, t) {
    var n = t.checked;
    return $({}, t, {
        defaultChecked: void 0,
        defaultValue: void 0,
        value: void 0,
        checked: n != null ? n : e._wrapperState.initialChecked,
    });
}
function Ii(e, t) {
    var n = t.defaultValue == null ? '' : t.defaultValue,
        r = t.checked != null ? t.checked : t.defaultChecked;
    (n = tt(t.value != null ? t.value : n)),
        (e._wrapperState = {
            initialChecked: r,
            initialValue: n,
            controlled:
                t.type === 'checkbox' || t.type === 'radio' ? t.checked != null : t.value != null,
        });
}
function ys(e, t) {
    (t = t.checked), t != null && Do(e, 'checked', t, !1);
}
function Wl(e, t) {
    ys(e, t);
    var n = tt(t.value),
        r = t.type;
    if (n != null)
        r === 'number'
            ? ((n === 0 && e.value === '') || e.value != n) && (e.value = '' + n)
            : e.value !== '' + n && (e.value = '' + n);
    else if (r === 'submit' || r === 'reset') {
        e.removeAttribute('value');
        return;
    }
    t.hasOwnProperty('value')
        ? Hl(e, t.type, n)
        : t.hasOwnProperty('defaultValue') && Hl(e, t.type, tt(t.defaultValue)),
        t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked);
}
function Fi(e, t, n) {
    if (t.hasOwnProperty('value') || t.hasOwnProperty('defaultValue')) {
        var r = t.type;
        if (!((r !== 'submit' && r !== 'reset') || (t.value !== void 0 && t.value !== null)))
            return;
        (t = '' + e._wrapperState.initialValue),
            n || t === e.value || (e.value = t),
            (e.defaultValue = t);
    }
    (n = e.name),
        n !== '' && (e.name = ''),
        (e.defaultChecked = !!e._wrapperState.initialChecked),
        n !== '' && (e.name = n);
}
function Hl(e, t, n) {
    (t !== 'number' || jr(e.ownerDocument) !== e) &&
        (n == null
            ? (e.defaultValue = '' + e._wrapperState.initialValue)
            : e.defaultValue !== '' + n && (e.defaultValue = '' + n));
}
function xc(e) {
    var t = '';
    return (
        nl.Children.forEach(e, function (n) {
            n != null && (t += n);
        }),
        t
    );
}
function Ql(e, t) {
    return (e = $({ children: void 0 }, t)), (t = xc(t.children)) && (e.children = t), e;
}
function At(e, t, n, r) {
    if (((e = e.options), t)) {
        t = {};
        for (var l = 0; l < n.length; l++) t['$' + n[l]] = !0;
        for (n = 0; n < e.length; n++)
            (l = t.hasOwnProperty('$' + e[n].value)),
                e[n].selected !== l && (e[n].selected = l),
                l && r && (e[n].defaultSelected = !0);
    } else {
        for (n = '' + tt(n), t = null, l = 0; l < e.length; l++) {
            if (e[l].value === n) {
                (e[l].selected = !0), r && (e[l].defaultSelected = !0);
                return;
            }
            t !== null || e[l].disabled || (t = e[l]);
        }
        t !== null && (t.selected = !0);
    }
}
function Gl(e, t) {
    if (t.dangerouslySetInnerHTML != null) throw Error(v(91));
    return $({}, t, {
        value: void 0,
        defaultValue: void 0,
        children: '' + e._wrapperState.initialValue,
    });
}
function Di(e, t) {
    var n = t.value;
    if (n == null) {
        if (((n = t.children), (t = t.defaultValue), n != null)) {
            if (t != null) throw Error(v(92));
            if (Array.isArray(n)) {
                if (!(1 >= n.length)) throw Error(v(93));
                n = n[0];
            }
            t = n;
        }
        t == null && (t = ''), (n = t);
    }
    e._wrapperState = { initialValue: tt(n) };
}
function ws(e, t) {
    var n = tt(t.value),
        r = tt(t.defaultValue);
    n != null &&
        ((n = '' + n),
        n !== e.value && (e.value = n),
        t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)),
        r != null && (e.defaultValue = '' + r);
}
function Ui(e) {
    var t = e.textContent;
    t === e._wrapperState.initialValue && t !== '' && t !== null && (e.value = t);
}
var Yl = {
    html: 'http://www.w3.org/1999/xhtml',
    mathml: 'http://www.w3.org/1998/Math/MathML',
    svg: 'http://www.w3.org/2000/svg',
};
function xs(e) {
    switch (e) {
        case 'svg':
            return 'http://www.w3.org/2000/svg';
        case 'math':
            return 'http://www.w3.org/1998/Math/MathML';
        default:
            return 'http://www.w3.org/1999/xhtml';
    }
}
function Kl(e, t) {
    return e == null || e === 'http://www.w3.org/1999/xhtml'
        ? xs(t)
        : e === 'http://www.w3.org/2000/svg' && t === 'foreignObject'
          ? 'http://www.w3.org/1999/xhtml'
          : e;
}
var fr,
    ks = (function (e) {
        return typeof MSApp != 'undefined' && MSApp.execUnsafeLocalFunction
            ? function (t, n, r, l) {
                  MSApp.execUnsafeLocalFunction(function () {
                      return e(t, n, r, l);
                  });
              }
            : e;
    })(function (e, t) {
        if (e.namespaceURI !== Yl.svg || 'innerHTML' in e) e.innerHTML = t;
        else {
            for (
                fr = fr || document.createElement('div'),
                    fr.innerHTML = '<svg>' + t.valueOf().toString() + '</svg>',
                    t = fr.firstChild;
                e.firstChild;

            )
                e.removeChild(e.firstChild);
            for (; t.firstChild; ) e.appendChild(t.firstChild);
        }
    });
function $n(e, t) {
    if (t) {
        var n = e.firstChild;
        if (n && n === e.lastChild && n.nodeType === 3) {
            n.nodeValue = t;
            return;
        }
    }
    e.textContent = t;
}
var zn = {
        animationIterationCount: !0,
        borderImageOutset: !0,
        borderImageSlice: !0,
        borderImageWidth: !0,
        boxFlex: !0,
        boxFlexGroup: !0,
        boxOrdinalGroup: !0,
        columnCount: !0,
        columns: !0,
        flex: !0,
        flexGrow: !0,
        flexPositive: !0,
        flexShrink: !0,
        flexNegative: !0,
        flexOrder: !0,
        gridArea: !0,
        gridRow: !0,
        gridRowEnd: !0,
        gridRowSpan: !0,
        gridRowStart: !0,
        gridColumn: !0,
        gridColumnEnd: !0,
        gridColumnSpan: !0,
        gridColumnStart: !0,
        fontWeight: !0,
        lineClamp: !0,
        lineHeight: !0,
        opacity: !0,
        order: !0,
        orphans: !0,
        tabSize: !0,
        widows: !0,
        zIndex: !0,
        zoom: !0,
        fillOpacity: !0,
        floodOpacity: !0,
        stopOpacity: !0,
        strokeDasharray: !0,
        strokeDashoffset: !0,
        strokeMiterlimit: !0,
        strokeOpacity: !0,
        strokeWidth: !0,
    },
    kc = ['Webkit', 'ms', 'Moz', 'O'];
Object.keys(zn).forEach(function (e) {
    kc.forEach(function (t) {
        (t = t + e.charAt(0).toUpperCase() + e.substring(1)), (zn[t] = zn[e]);
    });
});
function Ss(e, t, n) {
    return t == null || typeof t == 'boolean' || t === ''
        ? ''
        : n || typeof t != 'number' || t === 0 || (zn.hasOwnProperty(e) && zn[e])
          ? ('' + t).trim()
          : t + 'px';
}
function Es(e, t) {
    e = e.style;
    for (var n in t)
        if (t.hasOwnProperty(n)) {
            var r = n.indexOf('--') === 0,
                l = Ss(n, t[n], r);
            n === 'float' && (n = 'cssFloat'), r ? e.setProperty(n, l) : (e[n] = l);
        }
}
var Sc = $(
    { menuitem: !0 },
    {
        area: !0,
        base: !0,
        br: !0,
        col: !0,
        embed: !0,
        hr: !0,
        img: !0,
        input: !0,
        keygen: !0,
        link: !0,
        meta: !0,
        param: !0,
        source: !0,
        track: !0,
        wbr: !0,
    },
);
function Xl(e, t) {
    if (t) {
        if (Sc[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
            throw Error(v(137, e));
        if (t.dangerouslySetInnerHTML != null) {
            if (t.children != null) throw Error(v(60));
            if (
                !(
                    typeof t.dangerouslySetInnerHTML == 'object' &&
                    '__html' in t.dangerouslySetInnerHTML
                )
            )
                throw Error(v(61));
        }
        if (t.style != null && typeof t.style != 'object') throw Error(v(62));
    }
}
function Zl(e, t) {
    if (e.indexOf('-') === -1) return typeof t.is == 'string';
    switch (e) {
        case 'annotation-xml':
        case 'color-profile':
        case 'font-face':
        case 'font-face-src':
        case 'font-face-uri':
        case 'font-face-format':
        case 'font-face-name':
        case 'missing-glyph':
            return !1;
        default:
            return !0;
    }
}
function Qo(e) {
    return (
        (e = e.target || e.srcElement || window),
        e.correspondingUseElement && (e = e.correspondingUseElement),
        e.nodeType === 3 ? e.parentNode : e
    );
}
var bl = null,
    $t = null,
    Bt = null;
function Vi(e) {
    if ((e = nr(e))) {
        if (typeof bl != 'function') throw Error(v(280));
        var t = e.stateNode;
        t && ((t = cl(t)), bl(e.stateNode, e.type, t));
    }
}
function Cs(e) {
    $t ? (Bt ? Bt.push(e) : (Bt = [e])) : ($t = e);
}
function _s() {
    if ($t) {
        var e = $t,
            t = Bt;
        if (((Bt = $t = null), Vi(e), t)) for (e = 0; e < t.length; e++) Vi(t[e]);
    }
}
function Go(e, t) {
    return e(t);
}
function Ps(e, t, n, r, l) {
    return e(t, n, r, l);
}
function Yo() {}
var Ns = Go,
    mt = !1,
    xl = !1;
function Ko() {
    ($t !== null || Bt !== null) && (Yo(), _s());
}
function Ec(e, t, n) {
    if (xl) return e(t, n);
    xl = !0;
    try {
        return Ns(e, t, n);
    } finally {
        (xl = !1), Ko();
    }
}
function Bn(e, t) {
    var n = e.stateNode;
    if (n === null) return null;
    var r = cl(n);
    if (r === null) return null;
    n = r[t];
    e: switch (t) {
        case 'onClick':
        case 'onClickCapture':
        case 'onDoubleClick':
        case 'onDoubleClickCapture':
        case 'onMouseDown':
        case 'onMouseDownCapture':
        case 'onMouseMove':
        case 'onMouseMoveCapture':
        case 'onMouseUp':
        case 'onMouseUpCapture':
        case 'onMouseEnter':
            (r = !r.disabled) ||
                ((e = e.type),
                (r = !(e === 'button' || e === 'input' || e === 'select' || e === 'textarea'))),
                (e = !r);
            break e;
        default:
            e = !1;
    }
    if (e) return null;
    if (n && typeof n != 'function') throw Error(v(231, t, typeof n));
    return n;
}
var Jl = !1;
if (Ue)
    try {
        var cn = {};
        Object.defineProperty(cn, 'passive', {
            get: function () {
                Jl = !0;
            },
        }),
            window.addEventListener('test', cn, cn),
            window.removeEventListener('test', cn, cn);
    } catch {
        Jl = !1;
    }
function Cc(e, t, n, r, l, o, i, u, s) {
    var f = Array.prototype.slice.call(arguments, 3);
    try {
        t.apply(n, f);
    } catch (g) {
        this.onError(g);
    }
}
var Rn = !1,
    Ir = null,
    Fr = !1,
    ql = null,
    _c = {
        onError: function (e) {
            (Rn = !0), (Ir = e);
        },
    };
function Pc(e, t, n, r, l, o, i, u, s) {
    (Rn = !1), (Ir = null), Cc.apply(_c, arguments);
}
function Nc(e, t, n, r, l, o, i, u, s) {
    if ((Pc.apply(this, arguments), Rn)) {
        if (Rn) {
            var f = Ir;
            (Rn = !1), (Ir = null);
        } else throw Error(v(198));
        Fr || ((Fr = !0), (ql = f));
    }
}
function Pt(e) {
    var t = e,
        n = e;
    if (e.alternate) for (; t.return; ) t = t.return;
    else {
        e = t;
        do (t = e), (t.flags & 1026) !== 0 && (n = t.return), (e = t.return);
        while (e);
    }
    return t.tag === 3 ? n : null;
}
function Ts(e) {
    if (e.tag === 13) {
        var t = e.memoizedState;
        if ((t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null))
            return t.dehydrated;
    }
    return null;
}
function Ai(e) {
    if (Pt(e) !== e) throw Error(v(188));
}
function Tc(e) {
    var t = e.alternate;
    if (!t) {
        if (((t = Pt(e)), t === null)) throw Error(v(188));
        return t !== e ? null : e;
    }
    for (var n = e, r = t; ; ) {
        var l = n.return;
        if (l === null) break;
        var o = l.alternate;
        if (o === null) {
            if (((r = l.return), r !== null)) {
                n = r;
                continue;
            }
            break;
        }
        if (l.child === o.child) {
            for (o = l.child; o; ) {
                if (o === n) return Ai(l), e;
                if (o === r) return Ai(l), t;
                o = o.sibling;
            }
            throw Error(v(188));
        }
        if (n.return !== r.return) (n = l), (r = o);
        else {
            for (var i = !1, u = l.child; u; ) {
                if (u === n) {
                    (i = !0), (n = l), (r = o);
                    break;
                }
                if (u === r) {
                    (i = !0), (r = l), (n = o);
                    break;
                }
                u = u.sibling;
            }
            if (!i) {
                for (u = o.child; u; ) {
                    if (u === n) {
                        (i = !0), (n = o), (r = l);
                        break;
                    }
                    if (u === r) {
                        (i = !0), (r = o), (n = l);
                        break;
                    }
                    u = u.sibling;
                }
                if (!i) throw Error(v(189));
            }
        }
        if (n.alternate !== r) throw Error(v(190));
    }
    if (n.tag !== 3) throw Error(v(188));
    return n.stateNode.current === n ? e : t;
}
function Ls(e) {
    if (((e = Tc(e)), !e)) return null;
    for (var t = e; ; ) {
        if (t.tag === 5 || t.tag === 6) return t;
        if (t.child) (t.child.return = t), (t = t.child);
        else {
            if (t === e) break;
            for (; !t.sibling; ) {
                if (!t.return || t.return === e) return null;
                t = t.return;
            }
            (t.sibling.return = t.return), (t = t.sibling);
        }
    }
    return null;
}
function $i(e, t) {
    for (var n = e.alternate; t !== null; ) {
        if (t === e || t === n) return !0;
        t = t.return;
    }
    return !1;
}
var zs,
    Xo,
    Rs,
    Os,
    eo = !1,
    Ce = [],
    Ye = null,
    Ke = null,
    Xe = null,
    Wn = new Map(),
    Hn = new Map(),
    fn = [],
    Bi =
        'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit'.split(
            ' ',
        );
function to(e, t, n, r, l) {
    return {
        blockedOn: e,
        domEventName: t,
        eventSystemFlags: n | 16,
        nativeEvent: l,
        targetContainers: [r],
    };
}
function Wi(e, t) {
    switch (e) {
        case 'focusin':
        case 'focusout':
            Ye = null;
            break;
        case 'dragenter':
        case 'dragleave':
            Ke = null;
            break;
        case 'mouseover':
        case 'mouseout':
            Xe = null;
            break;
        case 'pointerover':
        case 'pointerout':
            Wn.delete(t.pointerId);
            break;
        case 'gotpointercapture':
        case 'lostpointercapture':
            Hn.delete(t.pointerId);
    }
}
function dn(e, t, n, r, l, o) {
    return e === null || e.nativeEvent !== o
        ? ((e = to(t, n, r, l, o)), t !== null && ((t = nr(t)), t !== null && Xo(t)), e)
        : ((e.eventSystemFlags |= r),
          (t = e.targetContainers),
          l !== null && t.indexOf(l) === -1 && t.push(l),
          e);
}
function Lc(e, t, n, r, l) {
    switch (t) {
        case 'focusin':
            return (Ye = dn(Ye, e, t, n, r, l)), !0;
        case 'dragenter':
            return (Ke = dn(Ke, e, t, n, r, l)), !0;
        case 'mouseover':
            return (Xe = dn(Xe, e, t, n, r, l)), !0;
        case 'pointerover':
            var o = l.pointerId;
            return Wn.set(o, dn(Wn.get(o) || null, e, t, n, r, l)), !0;
        case 'gotpointercapture':
            return (o = l.pointerId), Hn.set(o, dn(Hn.get(o) || null, e, t, n, r, l)), !0;
    }
    return !1;
}
function zc(e) {
    var t = ht(e.target);
    if (t !== null) {
        var n = Pt(t);
        if (n !== null) {
            if (((t = n.tag), t === 13)) {
                if (((t = Ts(n)), t !== null)) {
                    (e.blockedOn = t),
                        Os(e.lanePriority, function () {
                            Z.unstable_runWithPriority(e.priority, function () {
                                Rs(n);
                            });
                        });
                    return;
                }
            } else if (t === 3 && n.stateNode.hydrate) {
                e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
                return;
            }
        }
    }
    e.blockedOn = null;
}
function Sr(e) {
    if (e.blockedOn !== null) return !1;
    for (var t = e.targetContainers; 0 < t.length; ) {
        var n = qo(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
        if (n !== null) return (t = nr(n)), t !== null && Xo(t), (e.blockedOn = n), !1;
        t.shift();
    }
    return !0;
}
function Hi(e, t, n) {
    Sr(e) && n.delete(t);
}
function Rc() {
    for (eo = !1; 0 < Ce.length; ) {
        var e = Ce[0];
        if (e.blockedOn !== null) {
            (e = nr(e.blockedOn)), e !== null && zs(e);
            break;
        }
        for (var t = e.targetContainers; 0 < t.length; ) {
            var n = qo(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
            if (n !== null) {
                e.blockedOn = n;
                break;
            }
            t.shift();
        }
        e.blockedOn === null && Ce.shift();
    }
    Ye !== null && Sr(Ye) && (Ye = null),
        Ke !== null && Sr(Ke) && (Ke = null),
        Xe !== null && Sr(Xe) && (Xe = null),
        Wn.forEach(Hi),
        Hn.forEach(Hi);
}
function pn(e, t) {
    e.blockedOn === t &&
        ((e.blockedOn = null),
        eo || ((eo = !0), Z.unstable_scheduleCallback(Z.unstable_NormalPriority, Rc)));
}
function Ms(e) {
    function t(l) {
        return pn(l, e);
    }
    if (0 < Ce.length) {
        pn(Ce[0], e);
        for (var n = 1; n < Ce.length; n++) {
            var r = Ce[n];
            r.blockedOn === e && (r.blockedOn = null);
        }
    }
    for (
        Ye !== null && pn(Ye, e),
            Ke !== null && pn(Ke, e),
            Xe !== null && pn(Xe, e),
            Wn.forEach(t),
            Hn.forEach(t),
            n = 0;
        n < fn.length;
        n++
    )
        (r = fn[n]), r.blockedOn === e && (r.blockedOn = null);
    for (; 0 < fn.length && ((n = fn[0]), n.blockedOn === null); )
        zc(n), n.blockedOn === null && fn.shift();
}
function dr(e, t) {
    var n = {};
    return (
        (n[e.toLowerCase()] = t.toLowerCase()),
        (n['Webkit' + e] = 'webkit' + t),
        (n['Moz' + e] = 'moz' + t),
        n
    );
}
var Mt = {
        animationend: dr('Animation', 'AnimationEnd'),
        animationiteration: dr('Animation', 'AnimationIteration'),
        animationstart: dr('Animation', 'AnimationStart'),
        transitionend: dr('Transition', 'TransitionEnd'),
    },
    kl = {},
    js = {};
Ue &&
    ((js = document.createElement('div').style),
    'AnimationEvent' in window ||
        (delete Mt.animationend.animation,
        delete Mt.animationiteration.animation,
        delete Mt.animationstart.animation),
    'TransitionEvent' in window || delete Mt.transitionend.transition);
function ol(e) {
    if (kl[e]) return kl[e];
    if (!Mt[e]) return e;
    var t = Mt[e],
        n;
    for (n in t) if (t.hasOwnProperty(n) && n in js) return (kl[e] = t[n]);
    return e;
}
var Is = ol('animationend'),
    Fs = ol('animationiteration'),
    Ds = ol('animationstart'),
    Us = ol('transitionend'),
    Vs = new Map(),
    Zo = new Map(),
    Oc = [
        'abort',
        'abort',
        Is,
        'animationEnd',
        Fs,
        'animationIteration',
        Ds,
        'animationStart',
        'canplay',
        'canPlay',
        'canplaythrough',
        'canPlayThrough',
        'durationchange',
        'durationChange',
        'emptied',
        'emptied',
        'encrypted',
        'encrypted',
        'ended',
        'ended',
        'error',
        'error',
        'gotpointercapture',
        'gotPointerCapture',
        'load',
        'load',
        'loadeddata',
        'loadedData',
        'loadedmetadata',
        'loadedMetadata',
        'loadstart',
        'loadStart',
        'lostpointercapture',
        'lostPointerCapture',
        'playing',
        'playing',
        'progress',
        'progress',
        'seeking',
        'seeking',
        'stalled',
        'stalled',
        'suspend',
        'suspend',
        'timeupdate',
        'timeUpdate',
        Us,
        'transitionEnd',
        'waiting',
        'waiting',
    ];
function bo(e, t) {
    for (var n = 0; n < e.length; n += 2) {
        var r = e[n],
            l = e[n + 1];
        (l = 'on' + (l[0].toUpperCase() + l.slice(1))), Zo.set(r, t), Vs.set(r, l), Ct(l, [r]);
    }
}
var Mc = Z.unstable_now;
Mc();
var D = 8;
function Rt(e) {
    if ((1 & e) !== 0) return (D = 15), 1;
    if ((2 & e) !== 0) return (D = 14), 2;
    if ((4 & e) !== 0) return (D = 13), 4;
    var t = 24 & e;
    return t !== 0
        ? ((D = 12), t)
        : (e & 32) !== 0
          ? ((D = 11), 32)
          : ((t = 192 & e),
            t !== 0
                ? ((D = 10), t)
                : (e & 256) !== 0
                  ? ((D = 9), 256)
                  : ((t = 3584 & e),
                    t !== 0
                        ? ((D = 8), t)
                        : (e & 4096) !== 0
                          ? ((D = 7), 4096)
                          : ((t = 4186112 & e),
                            t !== 0
                                ? ((D = 6), t)
                                : ((t = 62914560 & e),
                                  t !== 0
                                      ? ((D = 5), t)
                                      : e & 67108864
                                        ? ((D = 4), 67108864)
                                        : (e & 134217728) !== 0
                                          ? ((D = 3), 134217728)
                                          : ((t = 805306368 & e),
                                            t !== 0
                                                ? ((D = 2), t)
                                                : (1073741824 & e) !== 0
                                                  ? ((D = 1), 1073741824)
                                                  : ((D = 8), e))))));
}
function jc(e) {
    switch (e) {
        case 99:
            return 15;
        case 98:
            return 10;
        case 97:
        case 96:
            return 8;
        case 95:
            return 2;
        default:
            return 0;
    }
}
function Ic(e) {
    switch (e) {
        case 15:
        case 14:
            return 99;
        case 13:
        case 12:
        case 11:
        case 10:
            return 98;
        case 9:
        case 8:
        case 7:
        case 6:
        case 4:
        case 5:
            return 97;
        case 3:
        case 2:
        case 1:
            return 95;
        case 0:
            return 90;
        default:
            throw Error(v(358, e));
    }
}
function Qn(e, t) {
    var n = e.pendingLanes;
    if (n === 0) return (D = 0);
    var r = 0,
        l = 0,
        o = e.expiredLanes,
        i = e.suspendedLanes,
        u = e.pingedLanes;
    if (o !== 0) (r = o), (l = D = 15);
    else if (((o = n & 134217727), o !== 0)) {
        var s = o & ~i;
        s !== 0 ? ((r = Rt(s)), (l = D)) : ((u &= o), u !== 0 && ((r = Rt(u)), (l = D)));
    } else (o = n & ~i), o !== 0 ? ((r = Rt(o)), (l = D)) : u !== 0 && ((r = Rt(u)), (l = D));
    if (r === 0) return 0;
    if (
        ((r = 31 - nt(r)),
        (r = n & (((0 > r ? 0 : 1 << r) << 1) - 1)),
        t !== 0 && t !== r && (t & i) === 0)
    ) {
        if ((Rt(t), l <= D)) return t;
        D = l;
    }
    if (((t = e.entangledLanes), t !== 0))
        for (e = e.entanglements, t &= r; 0 < t; )
            (n = 31 - nt(t)), (l = 1 << n), (r |= e[n]), (t &= ~l);
    return r;
}
function As(e) {
    return (e = e.pendingLanes & -1073741825), e !== 0 ? e : e & 1073741824 ? 1073741824 : 0;
}
function Dr(e, t) {
    switch (e) {
        case 15:
            return 1;
        case 14:
            return 2;
        case 12:
            return (e = Ot(24 & ~t)), e === 0 ? Dr(10, t) : e;
        case 10:
            return (e = Ot(192 & ~t)), e === 0 ? Dr(8, t) : e;
        case 8:
            return (
                (e = Ot(3584 & ~t)), e === 0 && ((e = Ot(4186112 & ~t)), e === 0 && (e = 512)), e
            );
        case 2:
            return (t = Ot(805306368 & ~t)), t === 0 && (t = 268435456), t;
    }
    throw Error(v(358, e));
}
function Ot(e) {
    return e & -e;
}
function Sl(e) {
    for (var t = [], n = 0; 31 > n; n++) t.push(e);
    return t;
}
function il(e, t, n) {
    e.pendingLanes |= t;
    var r = t - 1;
    (e.suspendedLanes &= r), (e.pingedLanes &= r), (e = e.eventTimes), (t = 31 - nt(t)), (e[t] = n);
}
var nt = Math.clz32 ? Math.clz32 : Uc,
    Fc = Math.log,
    Dc = Math.LN2;
function Uc(e) {
    return e === 0 ? 32 : (31 - ((Fc(e) / Dc) | 0)) | 0;
}
var Vc = Z.unstable_UserBlockingPriority,
    Ac = Z.unstable_runWithPriority,
    Er = !0;
function $c(e, t, n, r) {
    mt || Yo();
    var l = Jo,
        o = mt;
    mt = !0;
    try {
        Ps(l, e, t, n, r);
    } finally {
        (mt = o) || Ko();
    }
}
function Bc(e, t, n, r) {
    Ac(Vc, Jo.bind(null, e, t, n, r));
}
function Jo(e, t, n, r) {
    if (Er) {
        var l;
        if ((l = (t & 4) === 0) && 0 < Ce.length && -1 < Bi.indexOf(e))
            (e = to(null, e, t, n, r)), Ce.push(e);
        else {
            var o = qo(e, t, n, r);
            if (o === null) l && Wi(e, r);
            else {
                if (l) {
                    if (-1 < Bi.indexOf(e)) {
                        (e = to(o, e, t, n, r)), Ce.push(e);
                        return;
                    }
                    if (Lc(o, e, t, n, r)) return;
                    Wi(e, r);
                }
                qs(e, t, r, null, n);
            }
        }
    }
}
function qo(e, t, n, r) {
    var l = Qo(r);
    if (((l = ht(l)), l !== null)) {
        var o = Pt(l);
        if (o === null) l = null;
        else {
            var i = o.tag;
            if (i === 13) {
                if (((l = Ts(o)), l !== null)) return l;
                l = null;
            } else if (i === 3) {
                if (o.stateNode.hydrate) return o.tag === 3 ? o.stateNode.containerInfo : null;
                l = null;
            } else o !== l && (l = null);
        }
    }
    return qs(e, t, r, l, n), null;
}
var He = null,
    ei = null,
    Cr = null;
function $s() {
    if (Cr) return Cr;
    var e,
        t = ei,
        n = t.length,
        r,
        l = 'value' in He ? He.value : He.textContent,
        o = l.length;
    for (e = 0; e < n && t[e] === l[e]; e++);
    var i = n - e;
    for (r = 1; r <= i && t[n - r] === l[o - r]; r++);
    return (Cr = l.slice(e, 1 < r ? 1 - r : void 0));
}
function _r(e) {
    var t = e.keyCode;
    return (
        'charCode' in e ? ((e = e.charCode), e === 0 && t === 13 && (e = 13)) : (e = t),
        e === 10 && (e = 13),
        32 <= e || e === 13 ? e : 0
    );
}
function pr() {
    return !0;
}
function Qi() {
    return !1;
}
function de(e) {
    function t(n, r, l, o, i) {
        (this._reactName = n),
            (this._targetInst = l),
            (this.type = r),
            (this.nativeEvent = o),
            (this.target = i),
            (this.currentTarget = null);
        for (var u in e) e.hasOwnProperty(u) && ((n = e[u]), (this[u] = n ? n(o) : o[u]));
        return (
            (this.isDefaultPrevented = (
                o.defaultPrevented != null ? o.defaultPrevented : o.returnValue === !1
            )
                ? pr
                : Qi),
            (this.isPropagationStopped = Qi),
            this
        );
    }
    return (
        $(t.prototype, {
            preventDefault: function () {
                this.defaultPrevented = !0;
                var n = this.nativeEvent;
                n &&
                    (n.preventDefault
                        ? n.preventDefault()
                        : typeof n.returnValue != 'unknown' && (n.returnValue = !1),
                    (this.isDefaultPrevented = pr));
            },
            stopPropagation: function () {
                var n = this.nativeEvent;
                n &&
                    (n.stopPropagation
                        ? n.stopPropagation()
                        : typeof n.cancelBubble != 'unknown' && (n.cancelBubble = !0),
                    (this.isPropagationStopped = pr));
            },
            persist: function () {},
            isPersistent: pr,
        }),
        t
    );
}
var tn = {
        eventPhase: 0,
        bubbles: 0,
        cancelable: 0,
        timeStamp: function (e) {
            return e.timeStamp || Date.now();
        },
        defaultPrevented: 0,
        isTrusted: 0,
    },
    ti = de(tn),
    tr = $({}, tn, { view: 0, detail: 0 }),
    Wc = de(tr),
    El,
    Cl,
    mn,
    ul = $({}, tr, {
        screenX: 0,
        screenY: 0,
        clientX: 0,
        clientY: 0,
        pageX: 0,
        pageY: 0,
        ctrlKey: 0,
        shiftKey: 0,
        altKey: 0,
        metaKey: 0,
        getModifierState: ni,
        button: 0,
        buttons: 0,
        relatedTarget: function (e) {
            return e.relatedTarget === void 0
                ? e.fromElement === e.srcElement
                    ? e.toElement
                    : e.fromElement
                : e.relatedTarget;
        },
        movementX: function (e) {
            return 'movementX' in e
                ? e.movementX
                : (e !== mn &&
                      (mn && e.type === 'mousemove'
                          ? ((El = e.screenX - mn.screenX), (Cl = e.screenY - mn.screenY))
                          : (Cl = El = 0),
                      (mn = e)),
                  El);
        },
        movementY: function (e) {
            return 'movementY' in e ? e.movementY : Cl;
        },
    }),
    Gi = de(ul),
    Hc = $({}, ul, { dataTransfer: 0 }),
    Qc = de(Hc),
    Gc = $({}, tr, { relatedTarget: 0 }),
    _l = de(Gc),
    Yc = $({}, tn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
    Kc = de(Yc),
    Xc = $({}, tn, {
        clipboardData: function (e) {
            return 'clipboardData' in e ? e.clipboardData : window.clipboardData;
        },
    }),
    Zc = de(Xc),
    bc = $({}, tn, { data: 0 }),
    Yi = de(bc),
    Jc = {
        Esc: 'Escape',
        Spacebar: ' ',
        Left: 'ArrowLeft',
        Up: 'ArrowUp',
        Right: 'ArrowRight',
        Down: 'ArrowDown',
        Del: 'Delete',
        Win: 'OS',
        Menu: 'ContextMenu',
        Apps: 'ContextMenu',
        Scroll: 'ScrollLock',
        MozPrintableKey: 'Unidentified',
    },
    qc = {
        8: 'Backspace',
        9: 'Tab',
        12: 'Clear',
        13: 'Enter',
        16: 'Shift',
        17: 'Control',
        18: 'Alt',
        19: 'Pause',
        20: 'CapsLock',
        27: 'Escape',
        32: ' ',
        33: 'PageUp',
        34: 'PageDown',
        35: 'End',
        36: 'Home',
        37: 'ArrowLeft',
        38: 'ArrowUp',
        39: 'ArrowRight',
        40: 'ArrowDown',
        45: 'Insert',
        46: 'Delete',
        112: 'F1',
        113: 'F2',
        114: 'F3',
        115: 'F4',
        116: 'F5',
        117: 'F6',
        118: 'F7',
        119: 'F8',
        120: 'F9',
        121: 'F10',
        122: 'F11',
        123: 'F12',
        144: 'NumLock',
        145: 'ScrollLock',
        224: 'Meta',
    },
    ef = {
        Alt: 'altKey',
        Control: 'ctrlKey',
        Meta: 'metaKey',
        Shift: 'shiftKey',
    };
function tf(e) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(e) : (e = ef[e]) ? !!t[e] : !1;
}
function ni() {
    return tf;
}
var nf = $({}, tr, {
        key: function (e) {
            if (e.key) {
                var t = Jc[e.key] || e.key;
                if (t !== 'Unidentified') return t;
            }
            return e.type === 'keypress'
                ? ((e = _r(e)), e === 13 ? 'Enter' : String.fromCharCode(e))
                : e.type === 'keydown' || e.type === 'keyup'
                  ? qc[e.keyCode] || 'Unidentified'
                  : '';
        },
        code: 0,
        location: 0,
        ctrlKey: 0,
        shiftKey: 0,
        altKey: 0,
        metaKey: 0,
        repeat: 0,
        locale: 0,
        getModifierState: ni,
        charCode: function (e) {
            return e.type === 'keypress' ? _r(e) : 0;
        },
        keyCode: function (e) {
            return e.type === 'keydown' || e.type === 'keyup' ? e.keyCode : 0;
        },
        which: function (e) {
            return e.type === 'keypress'
                ? _r(e)
                : e.type === 'keydown' || e.type === 'keyup'
                  ? e.keyCode
                  : 0;
        },
    }),
    rf = de(nf),
    lf = $({}, ul, {
        pointerId: 0,
        width: 0,
        height: 0,
        pressure: 0,
        tangentialPressure: 0,
        tiltX: 0,
        tiltY: 0,
        twist: 0,
        pointerType: 0,
        isPrimary: 0,
    }),
    Ki = de(lf),
    of = $({}, tr, {
        touches: 0,
        targetTouches: 0,
        changedTouches: 0,
        altKey: 0,
        metaKey: 0,
        ctrlKey: 0,
        shiftKey: 0,
        getModifierState: ni,
    }),
    uf = de(of),
    sf = $({}, tn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
    af = de(sf),
    cf = $({}, ul, {
        deltaX: function (e) {
            return 'deltaX' in e ? e.deltaX : 'wheelDeltaX' in e ? -e.wheelDeltaX : 0;
        },
        deltaY: function (e) {
            return 'deltaY' in e
                ? e.deltaY
                : 'wheelDeltaY' in e
                  ? -e.wheelDeltaY
                  : 'wheelDelta' in e
                    ? -e.wheelDelta
                    : 0;
        },
        deltaZ: 0,
        deltaMode: 0,
    }),
    ff = de(cf),
    df = [9, 13, 27, 32],
    ri = Ue && 'CompositionEvent' in window,
    On = null;
Ue && 'documentMode' in document && (On = document.documentMode);
var pf = Ue && 'TextEvent' in window && !On,
    Bs = Ue && (!ri || (On && 8 < On && 11 >= On)),
    Xi = String.fromCharCode(32),
    Zi = !1;
function Ws(e, t) {
    switch (e) {
        case 'keyup':
            return df.indexOf(t.keyCode) !== -1;
        case 'keydown':
            return t.keyCode !== 229;
        case 'keypress':
        case 'mousedown':
        case 'focusout':
            return !0;
        default:
            return !1;
    }
}
function Hs(e) {
    return (e = e.detail), typeof e == 'object' && 'data' in e ? e.data : null;
}
var jt = !1;
function mf(e, t) {
    switch (e) {
        case 'compositionend':
            return Hs(t);
        case 'keypress':
            return t.which !== 32 ? null : ((Zi = !0), Xi);
        case 'textInput':
            return (e = t.data), e === Xi && Zi ? null : e;
        default:
            return null;
    }
}
function hf(e, t) {
    if (jt)
        return e === 'compositionend' || (!ri && Ws(e, t))
            ? ((e = $s()), (Cr = ei = He = null), (jt = !1), e)
            : null;
    switch (e) {
        case 'paste':
            return null;
        case 'keypress':
            if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
                if (t.char && 1 < t.char.length) return t.char;
                if (t.which) return String.fromCharCode(t.which);
            }
            return null;
        case 'compositionend':
            return Bs && t.locale !== 'ko' ? null : t.data;
        default:
            return null;
    }
}
var gf = {
    color: !0,
    date: !0,
    datetime: !0,
    'datetime-local': !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0,
};
function bi(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return t === 'input' ? !!gf[e.type] : t === 'textarea';
}
function Qs(e, t, n, r) {
    Cs(r),
        (t = Ur(t, 'onChange')),
        0 < t.length &&
            ((n = new ti('onChange', 'change', null, n, r)), e.push({ event: n, listeners: t }));
}
var Mn = null,
    Gn = null;
function vf(e) {
    Zs(e, 0);
}
function sl(e) {
    var t = Ft(e);
    if (vs(t)) return e;
}
function yf(e, t) {
    if (e === 'change') return t;
}
var Gs = !1;
if (Ue) {
    var Pl;
    if (Ue) {
        var Nl = 'oninput' in document;
        if (!Nl) {
            var Ji = document.createElement('div');
            Ji.setAttribute('oninput', 'return;'), (Nl = typeof Ji.oninput == 'function');
        }
        Pl = Nl;
    } else Pl = !1;
    Gs = Pl && (!document.documentMode || 9 < document.documentMode);
}
function qi() {
    Mn && (Mn.detachEvent('onpropertychange', Ys), (Gn = Mn = null));
}
function Ys(e) {
    if (e.propertyName === 'value' && sl(Gn)) {
        var t = [];
        if ((Qs(t, Gn, e, Qo(e)), (e = vf), mt)) e(t);
        else {
            mt = !0;
            try {
                Go(e, t);
            } finally {
                (mt = !1), Ko();
            }
        }
    }
}
function wf(e, t, n) {
    e === 'focusin'
        ? (qi(), (Mn = t), (Gn = n), Mn.attachEvent('onpropertychange', Ys))
        : e === 'focusout' && qi();
}
function xf(e) {
    if (e === 'selectionchange' || e === 'keyup' || e === 'keydown') return sl(Gn);
}
function kf(e, t) {
    if (e === 'click') return sl(t);
}
function Sf(e, t) {
    if (e === 'input' || e === 'change') return sl(t);
}
function Ef(e, t) {
    return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
}
var pe = typeof Object.is == 'function' ? Object.is : Ef,
    Cf = Object.prototype.hasOwnProperty;
function Yn(e, t) {
    if (pe(e, t)) return !0;
    if (typeof e != 'object' || e === null || typeof t != 'object' || t === null) return !1;
    var n = Object.keys(e),
        r = Object.keys(t);
    if (n.length !== r.length) return !1;
    for (r = 0; r < n.length; r++) if (!Cf.call(t, n[r]) || !pe(e[n[r]], t[n[r]])) return !1;
    return !0;
}
function eu(e) {
    for (; e && e.firstChild; ) e = e.firstChild;
    return e;
}
function tu(e, t) {
    var n = eu(e);
    e = 0;
    for (var r; n; ) {
        if (n.nodeType === 3) {
            if (((r = e + n.textContent.length), e <= t && r >= t))
                return { node: n, offset: t - e };
            e = r;
        }
        e: {
            for (; n; ) {
                if (n.nextSibling) {
                    n = n.nextSibling;
                    break e;
                }
                n = n.parentNode;
            }
            n = void 0;
        }
        n = eu(n);
    }
}
function Ks(e, t) {
    return e && t
        ? e === t
            ? !0
            : e && e.nodeType === 3
              ? !1
              : t && t.nodeType === 3
                ? Ks(e, t.parentNode)
                : 'contains' in e
                  ? e.contains(t)
                  : e.compareDocumentPosition
                    ? !!(e.compareDocumentPosition(t) & 16)
                    : !1
        : !1;
}
function nu() {
    for (var e = window, t = jr(); t instanceof e.HTMLIFrameElement; ) {
        try {
            var n = typeof t.contentWindow.location.href == 'string';
        } catch {
            n = !1;
        }
        if (n) e = t.contentWindow;
        else break;
        t = jr(e.document);
    }
    return t;
}
function no(e) {
    var t = e && e.nodeName && e.nodeName.toLowerCase();
    return (
        t &&
        ((t === 'input' &&
            (e.type === 'text' ||
                e.type === 'search' ||
                e.type === 'tel' ||
                e.type === 'url' ||
                e.type === 'password')) ||
            t === 'textarea' ||
            e.contentEditable === 'true')
    );
}
var _f = Ue && 'documentMode' in document && 11 >= document.documentMode,
    It = null,
    ro = null,
    jn = null,
    lo = !1;
function ru(e, t, n) {
    var r = n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
    lo ||
        It == null ||
        It !== jr(r) ||
        ((r = It),
        'selectionStart' in r && no(r)
            ? (r = { start: r.selectionStart, end: r.selectionEnd })
            : ((r = ((r.ownerDocument && r.ownerDocument.defaultView) || window).getSelection()),
              (r = {
                  anchorNode: r.anchorNode,
                  anchorOffset: r.anchorOffset,
                  focusNode: r.focusNode,
                  focusOffset: r.focusOffset,
              })),
        (jn && Yn(jn, r)) ||
            ((jn = r),
            (r = Ur(ro, 'onSelect')),
            0 < r.length &&
                ((t = new ti('onSelect', 'select', null, t, n)),
                e.push({ event: t, listeners: r }),
                (t.target = It))));
}
bo(
    'cancel cancel click click close close contextmenu contextMenu copy copy cut cut auxclick auxClick dblclick doubleClick dragend dragEnd dragstart dragStart drop drop focusin focus focusout blur input input invalid invalid keydown keyDown keypress keyPress keyup keyUp mousedown mouseDown mouseup mouseUp paste paste pause pause play play pointercancel pointerCancel pointerdown pointerDown pointerup pointerUp ratechange rateChange reset reset seeked seeked submit submit touchcancel touchCancel touchend touchEnd touchstart touchStart volumechange volumeChange'.split(
        ' ',
    ),
    0,
);
bo(
    'drag drag dragenter dragEnter dragexit dragExit dragleave dragLeave dragover dragOver mousemove mouseMove mouseout mouseOut mouseover mouseOver pointermove pointerMove pointerout pointerOut pointerover pointerOver scroll scroll toggle toggle touchmove touchMove wheel wheel'.split(
        ' ',
    ),
    1,
);
bo(Oc, 2);
for (
    var lu =
            'change selectionchange textInput compositionstart compositionend compositionupdate'.split(
                ' ',
            ),
        Tl = 0;
    Tl < lu.length;
    Tl++
)
    Zo.set(lu[Tl], 0);
Xt('onMouseEnter', ['mouseout', 'mouseover']);
Xt('onMouseLeave', ['mouseout', 'mouseover']);
Xt('onPointerEnter', ['pointerout', 'pointerover']);
Xt('onPointerLeave', ['pointerout', 'pointerover']);
Ct('onChange', 'change click focusin focusout input keydown keyup selectionchange'.split(' '));
Ct(
    'onSelect',
    'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(
        ' ',
    ),
);
Ct('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']);
Ct('onCompositionEnd', 'compositionend focusout keydown keypress keyup mousedown'.split(' '));
Ct('onCompositionStart', 'compositionstart focusout keydown keypress keyup mousedown'.split(' '));
Ct('onCompositionUpdate', 'compositionupdate focusout keydown keypress keyup mousedown'.split(' '));
var _n =
        'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange seeked seeking stalled suspend timeupdate volumechange waiting'.split(
            ' ',
        ),
    Xs = new Set('cancel close invalid load scroll toggle'.split(' ').concat(_n));
function ou(e, t, n) {
    var r = e.type || 'unknown-event';
    (e.currentTarget = n), Nc(r, t, void 0, e), (e.currentTarget = null);
}
function Zs(e, t) {
    t = (t & 4) !== 0;
    for (var n = 0; n < e.length; n++) {
        var r = e[n],
            l = r.event;
        r = r.listeners;
        e: {
            var o = void 0;
            if (t)
                for (var i = r.length - 1; 0 <= i; i--) {
                    var u = r[i],
                        s = u.instance,
                        f = u.currentTarget;
                    if (((u = u.listener), s !== o && l.isPropagationStopped())) break e;
                    ou(l, u, f), (o = s);
                }
            else
                for (i = 0; i < r.length; i++) {
                    if (
                        ((u = r[i]),
                        (s = u.instance),
                        (f = u.currentTarget),
                        (u = u.listener),
                        s !== o && l.isPropagationStopped())
                    )
                        break e;
                    ou(l, u, f), (o = s);
                }
        }
    }
    if (Fr) throw ((e = ql), (Fr = !1), (ql = null), e);
}
function V(e, t) {
    var n = ta(t),
        r = e + '__bubble';
    n.has(r) || (Js(t, e, 2, !1), n.add(r));
}
var iu = '_reactListening' + Math.random().toString(36).slice(2);
function bs(e) {
    e[iu] ||
        ((e[iu] = !0),
        ms.forEach(function (t) {
            Xs.has(t) || uu(t, !1, e, null), uu(t, !0, e, null);
        }));
}
function uu(e, t, n, r) {
    var l = 4 < arguments.length && arguments[4] !== void 0 ? arguments[4] : 0,
        o = n;
    if (
        (e === 'selectionchange' && n.nodeType !== 9 && (o = n.ownerDocument),
        r !== null && !t && Xs.has(e))
    ) {
        if (e !== 'scroll') return;
        (l |= 2), (o = r);
    }
    var i = ta(o),
        u = e + '__' + (t ? 'capture' : 'bubble');
    i.has(u) || (t && (l |= 4), Js(o, e, l, t), i.add(u));
}
function Js(e, t, n, r) {
    var l = Zo.get(t);
    switch (l === void 0 ? 2 : l) {
        case 0:
            l = $c;
            break;
        case 1:
            l = Bc;
            break;
        default:
            l = Jo;
    }
    (n = l.bind(null, t, n, e)),
        (l = void 0),
        !Jl || (t !== 'touchstart' && t !== 'touchmove' && t !== 'wheel') || (l = !0),
        r
            ? l !== void 0
                ? e.addEventListener(t, n, { capture: !0, passive: l })
                : e.addEventListener(t, n, !0)
            : l !== void 0
              ? e.addEventListener(t, n, { passive: l })
              : e.addEventListener(t, n, !1);
}
function qs(e, t, n, r, l) {
    var o = r;
    if ((t & 1) === 0 && (t & 2) === 0 && r !== null)
        e: for (;;) {
            if (r === null) return;
            var i = r.tag;
            if (i === 3 || i === 4) {
                var u = r.stateNode.containerInfo;
                if (u === l || (u.nodeType === 8 && u.parentNode === l)) break;
                if (i === 4)
                    for (i = r.return; i !== null; ) {
                        var s = i.tag;
                        if (
                            (s === 3 || s === 4) &&
                            ((s = i.stateNode.containerInfo),
                            s === l || (s.nodeType === 8 && s.parentNode === l))
                        )
                            return;
                        i = i.return;
                    }
                for (; u !== null; ) {
                    if (((i = ht(u)), i === null)) return;
                    if (((s = i.tag), s === 5 || s === 6)) {
                        r = o = i;
                        continue e;
                    }
                    u = u.parentNode;
                }
            }
            r = r.return;
        }
    Ec(function () {
        var f = o,
            g = Qo(n),
            E = [];
        e: {
            var m = Vs.get(e);
            if (m !== void 0) {
                var S = ti,
                    x = e;
                switch (e) {
                    case 'keypress':
                        if (_r(n) === 0) break e;
                    case 'keydown':
                    case 'keyup':
                        S = rf;
                        break;
                    case 'focusin':
                        (x = 'focus'), (S = _l);
                        break;
                    case 'focusout':
                        (x = 'blur'), (S = _l);
                        break;
                    case 'beforeblur':
                    case 'afterblur':
                        S = _l;
                        break;
                    case 'click':
                        if (n.button === 2) break e;
                    case 'auxclick':
                    case 'dblclick':
                    case 'mousedown':
                    case 'mousemove':
                    case 'mouseup':
                    case 'mouseout':
                    case 'mouseover':
                    case 'contextmenu':
                        S = Gi;
                        break;
                    case 'drag':
                    case 'dragend':
                    case 'dragenter':
                    case 'dragexit':
                    case 'dragleave':
                    case 'dragover':
                    case 'dragstart':
                    case 'drop':
                        S = Qc;
                        break;
                    case 'touchcancel':
                    case 'touchend':
                    case 'touchmove':
                    case 'touchstart':
                        S = uf;
                        break;
                    case Is:
                    case Fs:
                    case Ds:
                        S = Kc;
                        break;
                    case Us:
                        S = af;
                        break;
                    case 'scroll':
                        S = Wc;
                        break;
                    case 'wheel':
                        S = ff;
                        break;
                    case 'copy':
                    case 'cut':
                    case 'paste':
                        S = Zc;
                        break;
                    case 'gotpointercapture':
                    case 'lostpointercapture':
                    case 'pointercancel':
                    case 'pointerdown':
                    case 'pointermove':
                    case 'pointerout':
                    case 'pointerover':
                    case 'pointerup':
                        S = Ki;
                }
                var y = (t & 4) !== 0,
                    c = !y && e === 'scroll',
                    a = y ? (m !== null ? m + 'Capture' : null) : m;
                y = [];
                for (var d = f, p; d !== null; ) {
                    p = d;
                    var h = p.stateNode;
                    if (
                        (p.tag === 5 &&
                            h !== null &&
                            ((p = h),
                            a !== null && ((h = Bn(d, a)), h != null && y.push(Kn(d, h, p)))),
                        c)
                    )
                        break;
                    d = d.return;
                }
                0 < y.length && ((m = new S(m, x, null, n, g)), E.push({ event: m, listeners: y }));
            }
        }
        if ((t & 7) === 0) {
            e: {
                if (
                    ((m = e === 'mouseover' || e === 'pointerover'),
                    (S = e === 'mouseout' || e === 'pointerout'),
                    m &&
                        (t & 16) === 0 &&
                        (x = n.relatedTarget || n.fromElement) &&
                        (ht(x) || x[nn]))
                )
                    break e;
                if (
                    (S || m) &&
                    ((m =
                        g.window === g
                            ? g
                            : (m = g.ownerDocument)
                              ? m.defaultView || m.parentWindow
                              : window),
                    S
                        ? ((x = n.relatedTarget || n.toElement),
                          (S = f),
                          (x = x ? ht(x) : null),
                          x !== null &&
                              ((c = Pt(x)), x !== c || (x.tag !== 5 && x.tag !== 6)) &&
                              (x = null))
                        : ((S = null), (x = f)),
                    S !== x)
                ) {
                    if (
                        ((y = Gi),
                        (h = 'onMouseLeave'),
                        (a = 'onMouseEnter'),
                        (d = 'mouse'),
                        (e === 'pointerout' || e === 'pointerover') &&
                            ((y = Ki),
                            (h = 'onPointerLeave'),
                            (a = 'onPointerEnter'),
                            (d = 'pointer')),
                        (c = S == null ? m : Ft(S)),
                        (p = x == null ? m : Ft(x)),
                        (m = new y(h, d + 'leave', S, n, g)),
                        (m.target = c),
                        (m.relatedTarget = p),
                        (h = null),
                        ht(g) === f &&
                            ((y = new y(a, d + 'enter', x, n, g)),
                            (y.target = p),
                            (y.relatedTarget = c),
                            (h = y)),
                        (c = h),
                        S && x)
                    )
                        t: {
                            for (y = S, a = x, d = 0, p = y; p; p = zt(p)) d++;
                            for (p = 0, h = a; h; h = zt(h)) p++;
                            for (; 0 < d - p; ) (y = zt(y)), d--;
                            for (; 0 < p - d; ) (a = zt(a)), p--;
                            for (; d--; ) {
                                if (y === a || (a !== null && y === a.alternate)) break t;
                                (y = zt(y)), (a = zt(a));
                            }
                            y = null;
                        }
                    else y = null;
                    S !== null && su(E, m, S, y, !1),
                        x !== null && c !== null && su(E, c, x, y, !0);
                }
            }
            e: {
                if (
                    ((m = f ? Ft(f) : window),
                    (S = m.nodeName && m.nodeName.toLowerCase()),
                    S === 'select' || (S === 'input' && m.type === 'file'))
                )
                    var P = yf;
                else if (bi(m))
                    if (Gs) P = Sf;
                    else {
                        P = xf;
                        var w = wf;
                    }
                else
                    (S = m.nodeName) &&
                        S.toLowerCase() === 'input' &&
                        (m.type === 'checkbox' || m.type === 'radio') &&
                        (P = kf);
                if (P && (P = P(e, f))) {
                    Qs(E, P, n, g);
                    break e;
                }
                w && w(e, m, f),
                    e === 'focusout' &&
                        (w = m._wrapperState) &&
                        w.controlled &&
                        m.type === 'number' &&
                        Hl(m, 'number', m.value);
            }
            switch (((w = f ? Ft(f) : window), e)) {
                case 'focusin':
                    (bi(w) || w.contentEditable === 'true') && ((It = w), (ro = f), (jn = null));
                    break;
                case 'focusout':
                    jn = ro = It = null;
                    break;
                case 'mousedown':
                    lo = !0;
                    break;
                case 'contextmenu':
                case 'mouseup':
                case 'dragend':
                    (lo = !1), ru(E, n, g);
                    break;
                case 'selectionchange':
                    if (_f) break;
                case 'keydown':
                case 'keyup':
                    ru(E, n, g);
            }
            var N;
            if (ri)
                e: {
                    switch (e) {
                        case 'compositionstart':
                            var L = 'onCompositionStart';
                            break e;
                        case 'compositionend':
                            L = 'onCompositionEnd';
                            break e;
                        case 'compositionupdate':
                            L = 'onCompositionUpdate';
                            break e;
                    }
                    L = void 0;
                }
            else
                jt
                    ? Ws(e, n) && (L = 'onCompositionEnd')
                    : e === 'keydown' && n.keyCode === 229 && (L = 'onCompositionStart');
            L &&
                (Bs &&
                    n.locale !== 'ko' &&
                    (jt || L !== 'onCompositionStart'
                        ? L === 'onCompositionEnd' && jt && (N = $s())
                        : ((He = g), (ei = 'value' in He ? He.value : He.textContent), (jt = !0))),
                (w = Ur(f, L)),
                0 < w.length &&
                    ((L = new Yi(L, e, null, n, g)),
                    E.push({ event: L, listeners: w }),
                    N ? (L.data = N) : ((N = Hs(n)), N !== null && (L.data = N)))),
                (N = pf ? mf(e, n) : hf(e, n)) &&
                    ((f = Ur(f, 'onBeforeInput')),
                    0 < f.length &&
                        ((g = new Yi('onBeforeInput', 'beforeinput', null, n, g)),
                        E.push({ event: g, listeners: f }),
                        (g.data = N)));
        }
        Zs(E, t);
    });
}
function Kn(e, t, n) {
    return { instance: e, listener: t, currentTarget: n };
}
function Ur(e, t) {
    for (var n = t + 'Capture', r = []; e !== null; ) {
        var l = e,
            o = l.stateNode;
        l.tag === 5 &&
            o !== null &&
            ((l = o),
            (o = Bn(e, n)),
            o != null && r.unshift(Kn(e, o, l)),
            (o = Bn(e, t)),
            o != null && r.push(Kn(e, o, l))),
            (e = e.return);
    }
    return r;
}
function zt(e) {
    if (e === null) return null;
    do e = e.return;
    while (e && e.tag !== 5);
    return e || null;
}
function su(e, t, n, r, l) {
    for (var o = t._reactName, i = []; n !== null && n !== r; ) {
        var u = n,
            s = u.alternate,
            f = u.stateNode;
        if (s !== null && s === r) break;
        u.tag === 5 &&
            f !== null &&
            ((u = f),
            l
                ? ((s = Bn(n, o)), s != null && i.unshift(Kn(n, s, u)))
                : l || ((s = Bn(n, o)), s != null && i.push(Kn(n, s, u)))),
            (n = n.return);
    }
    i.length !== 0 && e.push({ event: t, listeners: i });
}
function Vr() {}
var Ll = null,
    zl = null;
function ea(e, t) {
    switch (e) {
        case 'button':
        case 'input':
        case 'select':
        case 'textarea':
            return !!t.autoFocus;
    }
    return !1;
}
function oo(e, t) {
    return (
        e === 'textarea' ||
        e === 'option' ||
        e === 'noscript' ||
        typeof t.children == 'string' ||
        typeof t.children == 'number' ||
        (typeof t.dangerouslySetInnerHTML == 'object' &&
            t.dangerouslySetInnerHTML !== null &&
            t.dangerouslySetInnerHTML.__html != null)
    );
}
var au = typeof setTimeout == 'function' ? setTimeout : void 0,
    Pf = typeof clearTimeout == 'function' ? clearTimeout : void 0;
function li(e) {
    e.nodeType === 1
        ? (e.textContent = '')
        : e.nodeType === 9 && ((e = e.body), e != null && (e.textContent = ''));
}
function Wt(e) {
    for (; e != null; e = e.nextSibling) {
        var t = e.nodeType;
        if (t === 1 || t === 3) break;
    }
    return e;
}
function cu(e) {
    e = e.previousSibling;
    for (var t = 0; e; ) {
        if (e.nodeType === 8) {
            var n = e.data;
            if (n === '$' || n === '$!' || n === '$?') {
                if (t === 0) return e;
                t--;
            } else n === '/$' && t++;
        }
        e = e.previousSibling;
    }
    return null;
}
var Rl = 0;
function Nf(e) {
    return { $$typeof: Wo, toString: e, valueOf: e };
}
var al = Math.random().toString(36).slice(2),
    Qe = '__reactFiber$' + al,
    Ar = '__reactProps$' + al,
    nn = '__reactContainer$' + al,
    fu = '__reactEvents$' + al;
function ht(e) {
    var t = e[Qe];
    if (t) return t;
    for (var n = e.parentNode; n; ) {
        if ((t = n[nn] || n[Qe])) {
            if (((n = t.alternate), t.child !== null || (n !== null && n.child !== null)))
                for (e = cu(e); e !== null; ) {
                    if ((n = e[Qe])) return n;
                    e = cu(e);
                }
            return t;
        }
        (e = n), (n = e.parentNode);
    }
    return null;
}
function nr(e) {
    return (
        (e = e[Qe] || e[nn]),
        !e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
    );
}
function Ft(e) {
    if (e.tag === 5 || e.tag === 6) return e.stateNode;
    throw Error(v(33));
}
function cl(e) {
    return e[Ar] || null;
}
function ta(e) {
    var t = e[fu];
    return t === void 0 && (t = e[fu] = new Set()), t;
}
var io = [],
    Dt = -1;
function it(e) {
    return { current: e };
}
function A(e) {
    0 > Dt || ((e.current = io[Dt]), (io[Dt] = null), Dt--);
}
function W(e, t) {
    Dt++, (io[Dt] = e.current), (e.current = t);
}
var rt = {},
    le = it(rt),
    ae = it(!1),
    xt = rt;
function Zt(e, t) {
    var n = e.type.contextTypes;
    if (!n) return rt;
    var r = e.stateNode;
    if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
        return r.__reactInternalMemoizedMaskedChildContext;
    var l = {},
        o;
    for (o in n) l[o] = t[o];
    return (
        r &&
            ((e = e.stateNode),
            (e.__reactInternalMemoizedUnmaskedChildContext = t),
            (e.__reactInternalMemoizedMaskedChildContext = l)),
        l
    );
}
function ce(e) {
    return (e = e.childContextTypes), e != null;
}
function $r() {
    A(ae), A(le);
}
function du(e, t, n) {
    if (le.current !== rt) throw Error(v(168));
    W(le, t), W(ae, n);
}
function na(e, t, n) {
    var r = e.stateNode;
    if (((e = t.childContextTypes), typeof r.getChildContext != 'function')) return n;
    r = r.getChildContext();
    for (var l in r) if (!(l in e)) throw Error(v(108, Vt(t) || 'Unknown', l));
    return $({}, n, r);
}
function Pr(e) {
    return (
        (e = ((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) || rt),
        (xt = le.current),
        W(le, e),
        W(ae, ae.current),
        !0
    );
}
function pu(e, t, n) {
    var r = e.stateNode;
    if (!r) throw Error(v(169));
    n
        ? ((e = na(e, t, xt)),
          (r.__reactInternalMemoizedMergedChildContext = e),
          A(ae),
          A(le),
          W(le, e))
        : A(ae),
        W(ae, n);
}
var oi = null,
    wt = null,
    Tf = Z.unstable_runWithPriority,
    ii = Z.unstable_scheduleCallback,
    uo = Z.unstable_cancelCallback,
    Lf = Z.unstable_shouldYield,
    mu = Z.unstable_requestPaint,
    so = Z.unstable_now,
    zf = Z.unstable_getCurrentPriorityLevel,
    fl = Z.unstable_ImmediatePriority,
    ra = Z.unstable_UserBlockingPriority,
    la = Z.unstable_NormalPriority,
    oa = Z.unstable_LowPriority,
    ia = Z.unstable_IdlePriority,
    Ol = {},
    Rf = mu !== void 0 ? mu : function () {},
    Me = null,
    Nr = null,
    Ml = !1,
    hu = so(),
    ne =
        1e4 > hu
            ? so
            : function () {
                  return so() - hu;
              };
function bt() {
    switch (zf()) {
        case fl:
            return 99;
        case ra:
            return 98;
        case la:
            return 97;
        case oa:
            return 96;
        case ia:
            return 95;
        default:
            throw Error(v(332));
    }
}
function ua(e) {
    switch (e) {
        case 99:
            return fl;
        case 98:
            return ra;
        case 97:
            return la;
        case 96:
            return oa;
        case 95:
            return ia;
        default:
            throw Error(v(332));
    }
}
function kt(e, t) {
    return (e = ua(e)), Tf(e, t);
}
function Xn(e, t, n) {
    return (e = ua(e)), ii(e, t, n);
}
function Le() {
    if (Nr !== null) {
        var e = Nr;
        (Nr = null), uo(e);
    }
    sa();
}
function sa() {
    if (!Ml && Me !== null) {
        Ml = !0;
        var e = 0;
        try {
            var t = Me;
            kt(99, function () {
                for (; e < t.length; e++) {
                    var n = t[e];
                    do n = n(!0);
                    while (n !== null);
                }
            }),
                (Me = null);
        } catch (n) {
            throw (Me !== null && (Me = Me.slice(e + 1)), ii(fl, Le), n);
        } finally {
            Ml = !1;
        }
    }
}
var Of = _t.ReactCurrentBatchConfig;
function xe(e, t) {
    if (e && e.defaultProps) {
        (t = $({}, t)), (e = e.defaultProps);
        for (var n in e) t[n] === void 0 && (t[n] = e[n]);
        return t;
    }
    return t;
}
var Br = it(null),
    Wr = null,
    Ut = null,
    Hr = null;
function ui() {
    Hr = Ut = Wr = null;
}
function si(e) {
    var t = Br.current;
    A(Br), (e.type._context._currentValue = t);
}
function aa(e, t) {
    for (; e !== null; ) {
        var n = e.alternate;
        if ((e.childLanes & t) === t) {
            if (n === null || (n.childLanes & t) === t) break;
            n.childLanes |= t;
        } else (e.childLanes |= t), n !== null && (n.childLanes |= t);
        e = e.return;
    }
}
function Ht(e, t) {
    (Wr = e),
        (Hr = Ut = null),
        (e = e.dependencies),
        e !== null &&
            e.firstContext !== null &&
            ((e.lanes & t) !== 0 && (ke = !0), (e.firstContext = null));
}
function ge(e, t) {
    if (Hr !== e && t !== !1 && t !== 0)
        if (
            ((typeof t != 'number' || t === 1073741823) && ((Hr = e), (t = 1073741823)),
            (t = { context: e, observedBits: t, next: null }),
            Ut === null)
        ) {
            if (Wr === null) throw Error(v(308));
            (Ut = t),
                (Wr.dependencies = {
                    lanes: 0,
                    firstContext: t,
                    responders: null,
                });
        } else Ut = Ut.next = t;
    return e._currentValue;
}
var Be = !1;
function ai(e) {
    e.updateQueue = {
        baseState: e.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: { pending: null },
        effects: null,
    };
}
function ca(e, t) {
    (e = e.updateQueue),
        t.updateQueue === e &&
            (t.updateQueue = {
                baseState: e.baseState,
                firstBaseUpdate: e.firstBaseUpdate,
                lastBaseUpdate: e.lastBaseUpdate,
                shared: e.shared,
                effects: e.effects,
            });
}
function Ze(e, t) {
    return {
        eventTime: e,
        lane: t,
        tag: 0,
        payload: null,
        callback: null,
        next: null,
    };
}
function be(e, t) {
    if (((e = e.updateQueue), e !== null)) {
        e = e.shared;
        var n = e.pending;
        n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)), (e.pending = t);
    }
}
function gu(e, t) {
    var n = e.updateQueue,
        r = e.alternate;
    if (r !== null && ((r = r.updateQueue), n === r)) {
        var l = null,
            o = null;
        if (((n = n.firstBaseUpdate), n !== null)) {
            do {
                var i = {
                    eventTime: n.eventTime,
                    lane: n.lane,
                    tag: n.tag,
                    payload: n.payload,
                    callback: n.callback,
                    next: null,
                };
                o === null ? (l = o = i) : (o = o.next = i), (n = n.next);
            } while (n !== null);
            o === null ? (l = o = t) : (o = o.next = t);
        } else l = o = t;
        (n = {
            baseState: r.baseState,
            firstBaseUpdate: l,
            lastBaseUpdate: o,
            shared: r.shared,
            effects: r.effects,
        }),
            (e.updateQueue = n);
        return;
    }
    (e = n.lastBaseUpdate),
        e === null ? (n.firstBaseUpdate = t) : (e.next = t),
        (n.lastBaseUpdate = t);
}
function Zn(e, t, n, r) {
    var l = e.updateQueue;
    Be = !1;
    var o = l.firstBaseUpdate,
        i = l.lastBaseUpdate,
        u = l.shared.pending;
    if (u !== null) {
        l.shared.pending = null;
        var s = u,
            f = s.next;
        (s.next = null), i === null ? (o = f) : (i.next = f), (i = s);
        var g = e.alternate;
        if (g !== null) {
            g = g.updateQueue;
            var E = g.lastBaseUpdate;
            E !== i &&
                (E === null ? (g.firstBaseUpdate = f) : (E.next = f), (g.lastBaseUpdate = s));
        }
    }
    if (o !== null) {
        (E = l.baseState), (i = 0), (g = f = s = null);
        do {
            u = o.lane;
            var m = o.eventTime;
            if ((r & u) === u) {
                g !== null &&
                    (g = g.next =
                        {
                            eventTime: m,
                            lane: 0,
                            tag: o.tag,
                            payload: o.payload,
                            callback: o.callback,
                            next: null,
                        });
                e: {
                    var S = e,
                        x = o;
                    switch (((u = t), (m = n), x.tag)) {
                        case 1:
                            if (((S = x.payload), typeof S == 'function')) {
                                E = S.call(m, E, u);
                                break e;
                            }
                            E = S;
                            break e;
                        case 3:
                            S.flags = (S.flags & -4097) | 64;
                        case 0:
                            if (
                                ((S = x.payload),
                                (u = typeof S == 'function' ? S.call(m, E, u) : S),
                                u == null)
                            )
                                break e;
                            E = $({}, E, u);
                            break e;
                        case 2:
                            Be = !0;
                    }
                }
                o.callback !== null &&
                    ((e.flags |= 32), (u = l.effects), u === null ? (l.effects = [o]) : u.push(o));
            } else
                (m = {
                    eventTime: m,
                    lane: u,
                    tag: o.tag,
                    payload: o.payload,
                    callback: o.callback,
                    next: null,
                }),
                    g === null ? ((f = g = m), (s = E)) : (g = g.next = m),
                    (i |= u);
            if (((o = o.next), o === null)) {
                if (((u = l.shared.pending), u === null)) break;
                (o = u.next), (u.next = null), (l.lastBaseUpdate = u), (l.shared.pending = null);
            }
        } while (1);
        g === null && (s = E),
            (l.baseState = s),
            (l.firstBaseUpdate = f),
            (l.lastBaseUpdate = g),
            (lr |= i),
            (e.lanes = i),
            (e.memoizedState = E);
    }
}
function vu(e, t, n) {
    if (((e = t.effects), (t.effects = null), e !== null))
        for (t = 0; t < e.length; t++) {
            var r = e[t],
                l = r.callback;
            if (l !== null) {
                if (((r.callback = null), (r = n), typeof l != 'function')) throw Error(v(191, l));
                l.call(r);
            }
        }
}
var fa = new nl.Component().refs;
function Qr(e, t, n, r) {
    (t = e.memoizedState),
        (n = n(r, t)),
        (n = n == null ? t : $({}, t, n)),
        (e.memoizedState = n),
        e.lanes === 0 && (e.updateQueue.baseState = n);
}
var dl = {
    isMounted: function (e) {
        return (e = e._reactInternals) ? Pt(e) === e : !1;
    },
    enqueueSetState: function (e, t, n) {
        e = e._reactInternals;
        var r = fe(),
            l = Je(e),
            o = Ze(r, l);
        (o.payload = t), n != null && (o.callback = n), be(e, o), qe(e, l, r);
    },
    enqueueReplaceState: function (e, t, n) {
        e = e._reactInternals;
        var r = fe(),
            l = Je(e),
            o = Ze(r, l);
        (o.tag = 1), (o.payload = t), n != null && (o.callback = n), be(e, o), qe(e, l, r);
    },
    enqueueForceUpdate: function (e, t) {
        e = e._reactInternals;
        var n = fe(),
            r = Je(e),
            l = Ze(n, r);
        (l.tag = 2), t != null && (l.callback = t), be(e, l), qe(e, r, n);
    },
};
function yu(e, t, n, r, l, o, i) {
    return (
        (e = e.stateNode),
        typeof e.shouldComponentUpdate == 'function'
            ? e.shouldComponentUpdate(r, o, i)
            : t.prototype && t.prototype.isPureReactComponent
              ? !Yn(n, r) || !Yn(l, o)
              : !0
    );
}
function da(e, t, n) {
    var r = !1,
        l = rt,
        o = t.contextType;
    return (
        typeof o == 'object' && o !== null
            ? (o = ge(o))
            : ((l = ce(t) ? xt : le.current),
              (r = t.contextTypes),
              (o = (r = r != null) ? Zt(e, l) : rt)),
        (t = new t(n, o)),
        (e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null),
        (t.updater = dl),
        (e.stateNode = t),
        (t._reactInternals = e),
        r &&
            ((e = e.stateNode),
            (e.__reactInternalMemoizedUnmaskedChildContext = l),
            (e.__reactInternalMemoizedMaskedChildContext = o)),
        t
    );
}
function wu(e, t, n, r) {
    (e = t.state),
        typeof t.componentWillReceiveProps == 'function' && t.componentWillReceiveProps(n, r),
        typeof t.UNSAFE_componentWillReceiveProps == 'function' &&
            t.UNSAFE_componentWillReceiveProps(n, r),
        t.state !== e && dl.enqueueReplaceState(t, t.state, null);
}
function ao(e, t, n, r) {
    var l = e.stateNode;
    (l.props = n), (l.state = e.memoizedState), (l.refs = fa), ai(e);
    var o = t.contextType;
    typeof o == 'object' && o !== null
        ? (l.context = ge(o))
        : ((o = ce(t) ? xt : le.current), (l.context = Zt(e, o))),
        Zn(e, n, l, r),
        (l.state = e.memoizedState),
        (o = t.getDerivedStateFromProps),
        typeof o == 'function' && (Qr(e, t, o, n), (l.state = e.memoizedState)),
        typeof t.getDerivedStateFromProps == 'function' ||
            typeof l.getSnapshotBeforeUpdate == 'function' ||
            (typeof l.UNSAFE_componentWillMount != 'function' &&
                typeof l.componentWillMount != 'function') ||
            ((t = l.state),
            typeof l.componentWillMount == 'function' && l.componentWillMount(),
            typeof l.UNSAFE_componentWillMount == 'function' && l.UNSAFE_componentWillMount(),
            t !== l.state && dl.enqueueReplaceState(l, l.state, null),
            Zn(e, n, l, r),
            (l.state = e.memoizedState)),
        typeof l.componentDidMount == 'function' && (e.flags |= 4);
}
var mr = Array.isArray;
function hn(e, t, n) {
    if (((e = n.ref), e !== null && typeof e != 'function' && typeof e != 'object')) {
        if (n._owner) {
            if (((n = n._owner), n)) {
                if (n.tag !== 1) throw Error(v(309));
                var r = n.stateNode;
            }
            if (!r) throw Error(v(147, e));
            var l = '' + e;
            return t !== null &&
                t.ref !== null &&
                typeof t.ref == 'function' &&
                t.ref._stringRef === l
                ? t.ref
                : ((t = function (o) {
                      var i = r.refs;
                      i === fa && (i = r.refs = {}), o === null ? delete i[l] : (i[l] = o);
                  }),
                  (t._stringRef = l),
                  t);
        }
        if (typeof e != 'string') throw Error(v(284));
        if (!n._owner) throw Error(v(290, e));
    }
    return e;
}
function hr(e, t) {
    if (e.type !== 'textarea')
        throw Error(
            v(
                31,
                Object.prototype.toString.call(t) === '[object Object]'
                    ? 'object with keys {' + Object.keys(t).join(', ') + '}'
                    : t,
            ),
        );
}
function pa(e) {
    function t(c, a) {
        if (e) {
            var d = c.lastEffect;
            d !== null
                ? ((d.nextEffect = a), (c.lastEffect = a))
                : (c.firstEffect = c.lastEffect = a),
                (a.nextEffect = null),
                (a.flags = 8);
        }
    }
    function n(c, a) {
        if (!e) return null;
        for (; a !== null; ) t(c, a), (a = a.sibling);
        return null;
    }
    function r(c, a) {
        for (c = new Map(); a !== null; )
            a.key !== null ? c.set(a.key, a) : c.set(a.index, a), (a = a.sibling);
        return c;
    }
    function l(c, a) {
        return (c = ot(c, a)), (c.index = 0), (c.sibling = null), c;
    }
    function o(c, a, d) {
        return (
            (c.index = d),
            e
                ? ((d = c.alternate),
                  d !== null ? ((d = d.index), d < a ? ((c.flags = 2), a) : d) : ((c.flags = 2), a))
                : a
        );
    }
    function i(c) {
        return e && c.alternate === null && (c.flags = 2), c;
    }
    function u(c, a, d, p) {
        return a === null || a.tag !== 6
            ? ((a = Ul(d, c.mode, p)), (a.return = c), a)
            : ((a = l(a, d)), (a.return = c), a);
    }
    function s(c, a, d, p) {
        return a !== null && a.elementType === d.type
            ? ((p = l(a, d.props)), (p.ref = hn(c, a, d)), (p.return = c), p)
            : ((p = Rr(d.type, d.key, d.props, null, c.mode, p)),
              (p.ref = hn(c, a, d)),
              (p.return = c),
              p);
    }
    function f(c, a, d, p) {
        return a === null ||
            a.tag !== 4 ||
            a.stateNode.containerInfo !== d.containerInfo ||
            a.stateNode.implementation !== d.implementation
            ? ((a = Vl(d, c.mode, p)), (a.return = c), a)
            : ((a = l(a, d.children || [])), (a.return = c), a);
    }
    function g(c, a, d, p, h) {
        return a === null || a.tag !== 7
            ? ((a = Kt(d, c.mode, p, h)), (a.return = c), a)
            : ((a = l(a, d)), (a.return = c), a);
    }
    function E(c, a, d) {
        if (typeof a == 'string' || typeof a == 'number')
            return (a = Ul('' + a, c.mode, d)), (a.return = c), a;
        if (typeof a == 'object' && a !== null) {
            switch (a.$$typeof) {
                case En:
                    return (
                        (d = Rr(a.type, a.key, a.props, null, c.mode, d)),
                        (d.ref = hn(c, null, a)),
                        (d.return = c),
                        d
                    );
                case pt:
                    return (a = Vl(a, c.mode, d)), (a.return = c), a;
            }
            if (mr(a) || an(a)) return (a = Kt(a, c.mode, d, null)), (a.return = c), a;
            hr(c, a);
        }
        return null;
    }
    function m(c, a, d, p) {
        var h = a !== null ? a.key : null;
        if (typeof d == 'string' || typeof d == 'number')
            return h !== null ? null : u(c, a, '' + d, p);
        if (typeof d == 'object' && d !== null) {
            switch (d.$$typeof) {
                case En:
                    return d.key === h
                        ? d.type === We
                            ? g(c, a, d.props.children, p, h)
                            : s(c, a, d, p)
                        : null;
                case pt:
                    return d.key === h ? f(c, a, d, p) : null;
            }
            if (mr(d) || an(d)) return h !== null ? null : g(c, a, d, p, null);
            hr(c, d);
        }
        return null;
    }
    function S(c, a, d, p, h) {
        if (typeof p == 'string' || typeof p == 'number')
            return (c = c.get(d) || null), u(a, c, '' + p, h);
        if (typeof p == 'object' && p !== null) {
            switch (p.$$typeof) {
                case En:
                    return (
                        (c = c.get(p.key === null ? d : p.key) || null),
                        p.type === We ? g(a, c, p.props.children, h, p.key) : s(a, c, p, h)
                    );
                case pt:
                    return (c = c.get(p.key === null ? d : p.key) || null), f(a, c, p, h);
            }
            if (mr(p) || an(p)) return (c = c.get(d) || null), g(a, c, p, h, null);
            hr(a, p);
        }
        return null;
    }
    function x(c, a, d, p) {
        for (
            var h = null, P = null, w = a, N = (a = 0), L = null;
            w !== null && N < d.length;
            N++
        ) {
            w.index > N ? ((L = w), (w = null)) : (L = w.sibling);
            var _ = m(c, w, d[N], p);
            if (_ === null) {
                w === null && (w = L);
                break;
            }
            e && w && _.alternate === null && t(c, w),
                (a = o(_, a, N)),
                P === null ? (h = _) : (P.sibling = _),
                (P = _),
                (w = L);
        }
        if (N === d.length) return n(c, w), h;
        if (w === null) {
            for (; N < d.length; N++)
                (w = E(c, d[N], p)),
                    w !== null &&
                        ((a = o(w, a, N)), P === null ? (h = w) : (P.sibling = w), (P = w));
            return h;
        }
        for (w = r(c, w); N < d.length; N++)
            (L = S(w, c, N, d[N], p)),
                L !== null &&
                    (e && L.alternate !== null && w.delete(L.key === null ? N : L.key),
                    (a = o(L, a, N)),
                    P === null ? (h = L) : (P.sibling = L),
                    (P = L));
        return (
            e &&
                w.forEach(function (H) {
                    return t(c, H);
                }),
            h
        );
    }
    function y(c, a, d, p) {
        var h = an(d);
        if (typeof h != 'function') throw Error(v(150));
        if (((d = h.call(d)), d == null)) throw Error(v(151));
        for (
            var P = (h = null), w = a, N = (a = 0), L = null, _ = d.next();
            w !== null && !_.done;
            N++, _ = d.next()
        ) {
            w.index > N ? ((L = w), (w = null)) : (L = w.sibling);
            var H = m(c, w, _.value, p);
            if (H === null) {
                w === null && (w = L);
                break;
            }
            e && w && H.alternate === null && t(c, w),
                (a = o(H, a, N)),
                P === null ? (h = H) : (P.sibling = H),
                (P = H),
                (w = L);
        }
        if (_.done) return n(c, w), h;
        if (w === null) {
            for (; !_.done; N++, _ = d.next())
                (_ = E(c, _.value, p)),
                    _ !== null &&
                        ((a = o(_, a, N)), P === null ? (h = _) : (P.sibling = _), (P = _));
            return h;
        }
        for (w = r(c, w); !_.done; N++, _ = d.next())
            (_ = S(w, c, N, _.value, p)),
                _ !== null &&
                    (e && _.alternate !== null && w.delete(_.key === null ? N : _.key),
                    (a = o(_, a, N)),
                    P === null ? (h = _) : (P.sibling = _),
                    (P = _));
        return (
            e &&
                w.forEach(function (st) {
                    return t(c, st);
                }),
            h
        );
    }
    return function (c, a, d, p) {
        var h = typeof d == 'object' && d !== null && d.type === We && d.key === null;
        h && (d = d.props.children);
        var P = typeof d == 'object' && d !== null;
        if (P)
            switch (d.$$typeof) {
                case En:
                    e: {
                        for (P = d.key, h = a; h !== null; ) {
                            if (h.key === P) {
                                switch (h.tag) {
                                    case 7:
                                        if (d.type === We) {
                                            n(c, h.sibling),
                                                (a = l(h, d.props.children)),
                                                (a.return = c),
                                                (c = a);
                                            break e;
                                        }
                                        break;
                                    default:
                                        if (h.elementType === d.type) {
                                            n(c, h.sibling),
                                                (a = l(h, d.props)),
                                                (a.ref = hn(c, h, d)),
                                                (a.return = c),
                                                (c = a);
                                            break e;
                                        }
                                }
                                n(c, h);
                                break;
                            } else t(c, h);
                            h = h.sibling;
                        }
                        d.type === We
                            ? ((a = Kt(d.props.children, c.mode, p, d.key)),
                              (a.return = c),
                              (c = a))
                            : ((p = Rr(d.type, d.key, d.props, null, c.mode, p)),
                              (p.ref = hn(c, a, d)),
                              (p.return = c),
                              (c = p));
                    }
                    return i(c);
                case pt:
                    e: {
                        for (h = d.key; a !== null; ) {
                            if (a.key === h)
                                if (
                                    a.tag === 4 &&
                                    a.stateNode.containerInfo === d.containerInfo &&
                                    a.stateNode.implementation === d.implementation
                                ) {
                                    n(c, a.sibling),
                                        (a = l(a, d.children || [])),
                                        (a.return = c),
                                        (c = a);
                                    break e;
                                } else {
                                    n(c, a);
                                    break;
                                }
                            else t(c, a);
                            a = a.sibling;
                        }
                        (a = Vl(d, c.mode, p)), (a.return = c), (c = a);
                    }
                    return i(c);
            }
        if (typeof d == 'string' || typeof d == 'number')
            return (
                (d = '' + d),
                a !== null && a.tag === 6
                    ? (n(c, a.sibling), (a = l(a, d)), (a.return = c), (c = a))
                    : (n(c, a), (a = Ul(d, c.mode, p)), (a.return = c), (c = a)),
                i(c)
            );
        if (mr(d)) return x(c, a, d, p);
        if (an(d)) return y(c, a, d, p);
        if ((P && hr(c, d), typeof d == 'undefined' && !h))
            switch (c.tag) {
                case 1:
                case 22:
                case 0:
                case 11:
                case 15:
                    throw Error(v(152, Vt(c.type) || 'Component'));
            }
        return n(c, a);
    };
}
var Gr = pa(!0),
    ma = pa(!1),
    rr = {},
    Ne = it(rr),
    bn = it(rr),
    Jn = it(rr);
function gt(e) {
    if (e === rr) throw Error(v(174));
    return e;
}
function co(e, t) {
    switch ((W(Jn, t), W(bn, e), W(Ne, rr), (e = t.nodeType), e)) {
        case 9:
        case 11:
            t = (t = t.documentElement) ? t.namespaceURI : Kl(null, '');
            break;
        default:
            (e = e === 8 ? t.parentNode : t),
                (t = e.namespaceURI || null),
                (e = e.tagName),
                (t = Kl(t, e));
    }
    A(Ne), W(Ne, t);
}
function Jt() {
    A(Ne), A(bn), A(Jn);
}
function xu(e) {
    gt(Jn.current);
    var t = gt(Ne.current),
        n = Kl(t, e.type);
    t !== n && (W(bn, e), W(Ne, n));
}
function ci(e) {
    bn.current === e && (A(Ne), A(bn));
}
var B = it(0);
function Yr(e) {
    for (var t = e; t !== null; ) {
        if (t.tag === 13) {
            var n = t.memoizedState;
            if (
                n !== null &&
                ((n = n.dehydrated), n === null || n.data === '$?' || n.data === '$!')
            )
                return t;
        } else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
            if ((t.flags & 64) !== 0) return t;
        } else if (t.child !== null) {
            (t.child.return = t), (t = t.child);
            continue;
        }
        if (t === e) break;
        for (; t.sibling === null; ) {
            if (t.return === null || t.return === e) return null;
            t = t.return;
        }
        (t.sibling.return = t.return), (t = t.sibling);
    }
    return null;
}
var Ie = null,
    Ge = null,
    Te = !1;
function ha(e, t) {
    var n = me(5, null, null, 0);
    (n.elementType = 'DELETED'),
        (n.type = 'DELETED'),
        (n.stateNode = t),
        (n.return = e),
        (n.flags = 8),
        e.lastEffect !== null
            ? ((e.lastEffect.nextEffect = n), (e.lastEffect = n))
            : (e.firstEffect = e.lastEffect = n);
}
function ku(e, t) {
    switch (e.tag) {
        case 5:
            var n = e.type;
            return (
                (t = t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase() ? null : t),
                t !== null ? ((e.stateNode = t), !0) : !1
            );
        case 6:
            return (
                (t = e.pendingProps === '' || t.nodeType !== 3 ? null : t),
                t !== null ? ((e.stateNode = t), !0) : !1
            );
        case 13:
            return !1;
        default:
            return !1;
    }
}
function fo(e) {
    if (Te) {
        var t = Ge;
        if (t) {
            var n = t;
            if (!ku(e, t)) {
                if (((t = Wt(n.nextSibling)), !t || !ku(e, t))) {
                    (e.flags = (e.flags & -1025) | 2), (Te = !1), (Ie = e);
                    return;
                }
                ha(Ie, n);
            }
            (Ie = e), (Ge = Wt(t.firstChild));
        } else (e.flags = (e.flags & -1025) | 2), (Te = !1), (Ie = e);
    }
}
function Su(e) {
    for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return;
    Ie = e;
}
function gr(e) {
    if (e !== Ie) return !1;
    if (!Te) return Su(e), (Te = !0), !1;
    var t = e.type;
    if (e.tag !== 5 || (t !== 'head' && t !== 'body' && !oo(t, e.memoizedProps)))
        for (t = Ge; t; ) ha(e, t), (t = Wt(t.nextSibling));
    if ((Su(e), e.tag === 13)) {
        if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
            throw Error(v(317));
        e: {
            for (e = e.nextSibling, t = 0; e; ) {
                if (e.nodeType === 8) {
                    var n = e.data;
                    if (n === '/$') {
                        if (t === 0) {
                            Ge = Wt(e.nextSibling);
                            break e;
                        }
                        t--;
                    } else (n !== '$' && n !== '$!' && n !== '$?') || t++;
                }
                e = e.nextSibling;
            }
            Ge = null;
        }
    } else Ge = Ie ? Wt(e.stateNode.nextSibling) : null;
    return !0;
}
function jl() {
    (Ge = Ie = null), (Te = !1);
}
var Qt = [];
function fi() {
    for (var e = 0; e < Qt.length; e++) Qt[e]._workInProgressVersionPrimary = null;
    Qt.length = 0;
}
var In = _t.ReactCurrentDispatcher,
    he = _t.ReactCurrentBatchConfig,
    qn = 0,
    G = null,
    te = null,
    J = null,
    Kr = !1,
    Fn = !1;
function ue() {
    throw Error(v(321));
}
function di(e, t) {
    if (t === null) return !1;
    for (var n = 0; n < t.length && n < e.length; n++) if (!pe(e[n], t[n])) return !1;
    return !0;
}
function pi(e, t, n, r, l, o) {
    if (
        ((qn = o),
        (G = t),
        (t.memoizedState = null),
        (t.updateQueue = null),
        (t.lanes = 0),
        (In.current = e === null || e.memoizedState === null ? jf : If),
        (e = n(r, l)),
        Fn)
    ) {
        o = 0;
        do {
            if (((Fn = !1), !(25 > o))) throw Error(v(301));
            (o += 1), (J = te = null), (t.updateQueue = null), (In.current = Ff), (e = n(r, l));
        } while (Fn);
    }
    if (
        ((In.current = Jr),
        (t = te !== null && te.next !== null),
        (qn = 0),
        (J = te = G = null),
        (Kr = !1),
        t)
    )
        throw Error(v(300));
    return e;
}
function vt() {
    var e = {
        memoizedState: null,
        baseState: null,
        baseQueue: null,
        queue: null,
        next: null,
    };
    return J === null ? (G.memoizedState = J = e) : (J = J.next = e), J;
}
function Nt() {
    if (te === null) {
        var e = G.alternate;
        e = e !== null ? e.memoizedState : null;
    } else e = te.next;
    var t = J === null ? G.memoizedState : J.next;
    if (t !== null) (J = t), (te = e);
    else {
        if (e === null) throw Error(v(310));
        (te = e),
            (e = {
                memoizedState: te.memoizedState,
                baseState: te.baseState,
                baseQueue: te.baseQueue,
                queue: te.queue,
                next: null,
            }),
            J === null ? (G.memoizedState = J = e) : (J = J.next = e);
    }
    return J;
}
function _e(e, t) {
    return typeof t == 'function' ? t(e) : t;
}
function gn(e) {
    var t = Nt(),
        n = t.queue;
    if (n === null) throw Error(v(311));
    n.lastRenderedReducer = e;
    var r = te,
        l = r.baseQueue,
        o = n.pending;
    if (o !== null) {
        if (l !== null) {
            var i = l.next;
            (l.next = o.next), (o.next = i);
        }
        (r.baseQueue = l = o), (n.pending = null);
    }
    if (l !== null) {
        (l = l.next), (r = r.baseState);
        var u = (i = o = null),
            s = l;
        do {
            var f = s.lane;
            if ((qn & f) === f)
                u !== null &&
                    (u = u.next =
                        {
                            lane: 0,
                            action: s.action,
                            eagerReducer: s.eagerReducer,
                            eagerState: s.eagerState,
                            next: null,
                        }),
                    (r = s.eagerReducer === e ? s.eagerState : e(r, s.action));
            else {
                var g = {
                    lane: f,
                    action: s.action,
                    eagerReducer: s.eagerReducer,
                    eagerState: s.eagerState,
                    next: null,
                };
                u === null ? ((i = u = g), (o = r)) : (u = u.next = g), (G.lanes |= f), (lr |= f);
            }
            s = s.next;
        } while (s !== null && s !== l);
        u === null ? (o = r) : (u.next = i),
            pe(r, t.memoizedState) || (ke = !0),
            (t.memoizedState = r),
            (t.baseState = o),
            (t.baseQueue = u),
            (n.lastRenderedState = r);
    }
    return [t.memoizedState, n.dispatch];
}
function vn(e) {
    var t = Nt(),
        n = t.queue;
    if (n === null) throw Error(v(311));
    n.lastRenderedReducer = e;
    var r = n.dispatch,
        l = n.pending,
        o = t.memoizedState;
    if (l !== null) {
        n.pending = null;
        var i = (l = l.next);
        do (o = e(o, i.action)), (i = i.next);
        while (i !== l);
        pe(o, t.memoizedState) || (ke = !0),
            (t.memoizedState = o),
            t.baseQueue === null && (t.baseState = o),
            (n.lastRenderedState = o);
    }
    return [o, r];
}
function Eu(e, t, n) {
    var r = t._getVersion;
    r = r(t._source);
    var l = t._workInProgressVersionPrimary;
    if (
        (l !== null
            ? (e = l === r)
            : ((e = e.mutableReadLanes),
              (e = (qn & e) === e) && ((t._workInProgressVersionPrimary = r), Qt.push(t))),
        e)
    )
        return n(t._source);
    throw (Qt.push(t), Error(v(350)));
}
function ga(e, t, n, r) {
    var l = oe;
    if (l === null) throw Error(v(349));
    var o = t._getVersion,
        i = o(t._source),
        u = In.current,
        s = u.useState(function () {
            return Eu(l, t, n);
        }),
        f = s[1],
        g = s[0];
    s = J;
    var E = e.memoizedState,
        m = E.refs,
        S = m.getSnapshot,
        x = E.source;
    E = E.subscribe;
    var y = G;
    return (
        (e.memoizedState = { refs: m, source: t, subscribe: r }),
        u.useEffect(
            function () {
                (m.getSnapshot = n), (m.setSnapshot = f);
                var c = o(t._source);
                if (!pe(i, c)) {
                    (c = n(t._source)),
                        pe(g, c) || (f(c), (c = Je(y)), (l.mutableReadLanes |= c & l.pendingLanes)),
                        (c = l.mutableReadLanes),
                        (l.entangledLanes |= c);
                    for (var a = l.entanglements, d = c; 0 < d; ) {
                        var p = 31 - nt(d),
                            h = 1 << p;
                        (a[p] |= c), (d &= ~h);
                    }
                }
            },
            [n, t, r],
        ),
        u.useEffect(
            function () {
                return r(t._source, function () {
                    var c = m.getSnapshot,
                        a = m.setSnapshot;
                    try {
                        a(c(t._source));
                        var d = Je(y);
                        l.mutableReadLanes |= d & l.pendingLanes;
                    } catch (p) {
                        a(function () {
                            throw p;
                        });
                    }
                });
            },
            [t, r],
        ),
        (pe(S, n) && pe(x, t) && pe(E, r)) ||
            ((e = {
                pending: null,
                dispatch: null,
                lastRenderedReducer: _e,
                lastRenderedState: g,
            }),
            (e.dispatch = f = gi.bind(null, G, e)),
            (s.queue = e),
            (s.baseQueue = null),
            (g = Eu(l, t, n)),
            (s.memoizedState = s.baseState = g)),
        g
    );
}
function va(e, t, n) {
    var r = Nt();
    return ga(r, e, t, n);
}
function yn(e) {
    var t = vt();
    return (
        typeof e == 'function' && (e = e()),
        (t.memoizedState = t.baseState = e),
        (e = t.queue =
            {
                pending: null,
                dispatch: null,
                lastRenderedReducer: _e,
                lastRenderedState: e,
            }),
        (e = e.dispatch = gi.bind(null, G, e)),
        [t.memoizedState, e]
    );
}
function Xr(e, t, n, r) {
    return (
        (e = { tag: e, create: t, destroy: n, deps: r, next: null }),
        (t = G.updateQueue),
        t === null
            ? ((t = { lastEffect: null }), (G.updateQueue = t), (t.lastEffect = e.next = e))
            : ((n = t.lastEffect),
              n === null
                  ? (t.lastEffect = e.next = e)
                  : ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e))),
        e
    );
}
function Cu(e) {
    var t = vt();
    return (e = { current: e }), (t.memoizedState = e);
}
function Zr() {
    return Nt().memoizedState;
}
function po(e, t, n, r) {
    var l = vt();
    (G.flags |= e), (l.memoizedState = Xr(1 | t, n, void 0, r === void 0 ? null : r));
}
function mi(e, t, n, r) {
    var l = Nt();
    r = r === void 0 ? null : r;
    var o = void 0;
    if (te !== null) {
        var i = te.memoizedState;
        if (((o = i.destroy), r !== null && di(r, i.deps))) {
            Xr(t, n, o, r);
            return;
        }
    }
    (G.flags |= e), (l.memoizedState = Xr(1 | t, n, o, r));
}
function _u(e, t) {
    return po(516, 4, e, t);
}
function br(e, t) {
    return mi(516, 4, e, t);
}
function ya(e, t) {
    return mi(4, 2, e, t);
}
function wa(e, t) {
    if (typeof t == 'function')
        return (
            (e = e()),
            t(e),
            function () {
                t(null);
            }
        );
    if (t != null)
        return (
            (e = e()),
            (t.current = e),
            function () {
                t.current = null;
            }
        );
}
function xa(e, t, n) {
    return (n = n != null ? n.concat([e]) : null), mi(4, 2, wa.bind(null, t, e), n);
}
function hi() {}
function ka(e, t) {
    var n = Nt();
    t = t === void 0 ? null : t;
    var r = n.memoizedState;
    return r !== null && t !== null && di(t, r[1]) ? r[0] : ((n.memoizedState = [e, t]), e);
}
function Sa(e, t) {
    var n = Nt();
    t = t === void 0 ? null : t;
    var r = n.memoizedState;
    return r !== null && t !== null && di(t, r[1])
        ? r[0]
        : ((e = e()), (n.memoizedState = [e, t]), e);
}
function Mf(e, t) {
    var n = bt();
    kt(98 > n ? 98 : n, function () {
        e(!0);
    }),
        kt(97 < n ? 97 : n, function () {
            var r = he.transition;
            he.transition = 1;
            try {
                e(!1), t();
            } finally {
                he.transition = r;
            }
        });
}
function gi(e, t, n) {
    var r = fe(),
        l = Je(e),
        o = {
            lane: l,
            action: n,
            eagerReducer: null,
            eagerState: null,
            next: null,
        },
        i = t.pending;
    if (
        (i === null ? (o.next = o) : ((o.next = i.next), (i.next = o)),
        (t.pending = o),
        (i = e.alternate),
        e === G || (i !== null && i === G))
    )
        Fn = Kr = !0;
    else {
        if (
            e.lanes === 0 &&
            (i === null || i.lanes === 0) &&
            ((i = t.lastRenderedReducer), i !== null)
        )
            try {
                var u = t.lastRenderedState,
                    s = i(u, n);
                if (((o.eagerReducer = i), (o.eagerState = s), pe(s, u))) return;
            } catch {
            } finally {
            }
        qe(e, l, r);
    }
}
var Jr = {
        readContext: ge,
        useCallback: ue,
        useContext: ue,
        useEffect: ue,
        useImperativeHandle: ue,
        useLayoutEffect: ue,
        useMemo: ue,
        useReducer: ue,
        useRef: ue,
        useState: ue,
        useDebugValue: ue,
        useDeferredValue: ue,
        useTransition: ue,
        useMutableSource: ue,
        useOpaqueIdentifier: ue,
        unstable_isNewReconciler: !1,
    },
    jf = {
        readContext: ge,
        useCallback: function (e, t) {
            return (vt().memoizedState = [e, t === void 0 ? null : t]), e;
        },
        useContext: ge,
        useEffect: _u,
        useImperativeHandle: function (e, t, n) {
            return (n = n != null ? n.concat([e]) : null), po(4, 2, wa.bind(null, t, e), n);
        },
        useLayoutEffect: function (e, t) {
            return po(4, 2, e, t);
        },
        useMemo: function (e, t) {
            var n = vt();
            return (t = t === void 0 ? null : t), (e = e()), (n.memoizedState = [e, t]), e;
        },
        useReducer: function (e, t, n) {
            var r = vt();
            return (
                (t = n !== void 0 ? n(t) : t),
                (r.memoizedState = r.baseState = t),
                (e = r.queue =
                    {
                        pending: null,
                        dispatch: null,
                        lastRenderedReducer: e,
                        lastRenderedState: t,
                    }),
                (e = e.dispatch = gi.bind(null, G, e)),
                [r.memoizedState, e]
            );
        },
        useRef: Cu,
        useState: yn,
        useDebugValue: hi,
        useDeferredValue: function (e) {
            var t = yn(e),
                n = t[0],
                r = t[1];
            return (
                _u(
                    function () {
                        var l = he.transition;
                        he.transition = 1;
                        try {
                            r(e);
                        } finally {
                            he.transition = l;
                        }
                    },
                    [e],
                ),
                n
            );
        },
        useTransition: function () {
            var e = yn(!1),
                t = e[0];
            return (e = Mf.bind(null, e[1])), Cu(e), [e, t];
        },
        useMutableSource: function (e, t, n) {
            var r = vt();
            return (
                (r.memoizedState = {
                    refs: { getSnapshot: t, setSnapshot: null },
                    source: e,
                    subscribe: n,
                }),
                ga(r, e, t, n)
            );
        },
        useOpaqueIdentifier: function () {
            if (Te) {
                var e = !1,
                    t = Nf(function () {
                        throw (e || ((e = !0), n('r:' + (Rl++).toString(36))), Error(v(355)));
                    }),
                    n = yn(t)[1];
                return (
                    (G.mode & 2) === 0 &&
                        ((G.flags |= 516),
                        Xr(
                            5,
                            function () {
                                n('r:' + (Rl++).toString(36));
                            },
                            void 0,
                            null,
                        )),
                    t
                );
            }
            return (t = 'r:' + (Rl++).toString(36)), yn(t), t;
        },
        unstable_isNewReconciler: !1,
    },
    If = {
        readContext: ge,
        useCallback: ka,
        useContext: ge,
        useEffect: br,
        useImperativeHandle: xa,
        useLayoutEffect: ya,
        useMemo: Sa,
        useReducer: gn,
        useRef: Zr,
        useState: function () {
            return gn(_e);
        },
        useDebugValue: hi,
        useDeferredValue: function (e) {
            var t = gn(_e),
                n = t[0],
                r = t[1];
            return (
                br(
                    function () {
                        var l = he.transition;
                        he.transition = 1;
                        try {
                            r(e);
                        } finally {
                            he.transition = l;
                        }
                    },
                    [e],
                ),
                n
            );
        },
        useTransition: function () {
            var e = gn(_e)[0];
            return [Zr().current, e];
        },
        useMutableSource: va,
        useOpaqueIdentifier: function () {
            return gn(_e)[0];
        },
        unstable_isNewReconciler: !1,
    },
    Ff = {
        readContext: ge,
        useCallback: ka,
        useContext: ge,
        useEffect: br,
        useImperativeHandle: xa,
        useLayoutEffect: ya,
        useMemo: Sa,
        useReducer: vn,
        useRef: Zr,
        useState: function () {
            return vn(_e);
        },
        useDebugValue: hi,
        useDeferredValue: function (e) {
            var t = vn(_e),
                n = t[0],
                r = t[1];
            return (
                br(
                    function () {
                        var l = he.transition;
                        he.transition = 1;
                        try {
                            r(e);
                        } finally {
                            he.transition = l;
                        }
                    },
                    [e],
                ),
                n
            );
        },
        useTransition: function () {
            var e = vn(_e)[0];
            return [Zr().current, e];
        },
        useMutableSource: va,
        useOpaqueIdentifier: function () {
            return vn(_e)[0];
        },
        unstable_isNewReconciler: !1,
    },
    Df = _t.ReactCurrentOwner,
    ke = !1;
function se(e, t, n, r) {
    t.child = e === null ? ma(t, null, n, r) : Gr(t, e.child, n, r);
}
function Pu(e, t, n, r, l) {
    n = n.render;
    var o = t.ref;
    return (
        Ht(t, l),
        (r = pi(e, t, n, r, o, l)),
        e !== null && !ke
            ? ((t.updateQueue = e.updateQueue), (t.flags &= -517), (e.lanes &= ~l), Fe(e, t, l))
            : ((t.flags |= 1), se(e, t, r, l), t.child)
    );
}
function Nu(e, t, n, r, l, o) {
    if (e === null) {
        var i = n.type;
        return typeof i == 'function' &&
            !Si(i) &&
            i.defaultProps === void 0 &&
            n.compare === null &&
            n.defaultProps === void 0
            ? ((t.tag = 15), (t.type = i), Ea(e, t, i, r, l, o))
            : ((e = Rr(n.type, null, r, t, t.mode, o)),
              (e.ref = t.ref),
              (e.return = t),
              (t.child = e));
    }
    return (
        (i = e.child),
        (l & o) === 0 &&
        ((l = i.memoizedProps),
        (n = n.compare),
        (n = n !== null ? n : Yn),
        n(l, r) && e.ref === t.ref)
            ? Fe(e, t, o)
            : ((t.flags |= 1), (e = ot(i, r)), (e.ref = t.ref), (e.return = t), (t.child = e))
    );
}
function Ea(e, t, n, r, l, o) {
    if (e !== null && Yn(e.memoizedProps, r) && e.ref === t.ref)
        if (((ke = !1), (o & l) !== 0)) (e.flags & 16384) !== 0 && (ke = !0);
        else return (t.lanes = e.lanes), Fe(e, t, o);
    return mo(e, t, n, r, o);
}
function Il(e, t, n) {
    var r = t.pendingProps,
        l = r.children,
        o = e !== null ? e.memoizedState : null;
    if (r.mode === 'hidden' || r.mode === 'unstable-defer-without-hiding')
        if ((t.mode & 4) === 0) (t.memoizedState = { baseLanes: 0 }), yr(t, n);
        else if ((n & 1073741824) !== 0)
            (t.memoizedState = { baseLanes: 0 }), yr(t, o !== null ? o.baseLanes : n);
        else
            return (
                (e = o !== null ? o.baseLanes | n : n),
                (t.lanes = t.childLanes = 1073741824),
                (t.memoizedState = { baseLanes: e }),
                yr(t, e),
                null
            );
    else o !== null ? ((r = o.baseLanes | n), (t.memoizedState = null)) : (r = n), yr(t, r);
    return se(e, t, l, n), t.child;
}
function Ca(e, t) {
    var n = t.ref;
    ((e === null && n !== null) || (e !== null && e.ref !== n)) && (t.flags |= 128);
}
function mo(e, t, n, r, l) {
    var o = ce(n) ? xt : le.current;
    return (
        (o = Zt(t, o)),
        Ht(t, l),
        (n = pi(e, t, n, r, o, l)),
        e !== null && !ke
            ? ((t.updateQueue = e.updateQueue), (t.flags &= -517), (e.lanes &= ~l), Fe(e, t, l))
            : ((t.flags |= 1), se(e, t, n, l), t.child)
    );
}
function Tu(e, t, n, r, l) {
    if (ce(n)) {
        var o = !0;
        Pr(t);
    } else o = !1;
    if ((Ht(t, l), t.stateNode === null))
        e !== null && ((e.alternate = null), (t.alternate = null), (t.flags |= 2)),
            da(t, n, r),
            ao(t, n, r, l),
            (r = !0);
    else if (e === null) {
        var i = t.stateNode,
            u = t.memoizedProps;
        i.props = u;
        var s = i.context,
            f = n.contextType;
        typeof f == 'object' && f !== null
            ? (f = ge(f))
            : ((f = ce(n) ? xt : le.current), (f = Zt(t, f)));
        var g = n.getDerivedStateFromProps,
            E = typeof g == 'function' || typeof i.getSnapshotBeforeUpdate == 'function';
        E ||
            (typeof i.UNSAFE_componentWillReceiveProps != 'function' &&
                typeof i.componentWillReceiveProps != 'function') ||
            ((u !== r || s !== f) && wu(t, i, r, f)),
            (Be = !1);
        var m = t.memoizedState;
        (i.state = m),
            Zn(t, r, i, l),
            (s = t.memoizedState),
            u !== r || m !== s || ae.current || Be
                ? (typeof g == 'function' && (Qr(t, n, g, r), (s = t.memoizedState)),
                  (u = Be || yu(t, n, u, r, m, s, f))
                      ? (E ||
                            (typeof i.UNSAFE_componentWillMount != 'function' &&
                                typeof i.componentWillMount != 'function') ||
                            (typeof i.componentWillMount == 'function' && i.componentWillMount(),
                            typeof i.UNSAFE_componentWillMount == 'function' &&
                                i.UNSAFE_componentWillMount()),
                        typeof i.componentDidMount == 'function' && (t.flags |= 4))
                      : (typeof i.componentDidMount == 'function' && (t.flags |= 4),
                        (t.memoizedProps = r),
                        (t.memoizedState = s)),
                  (i.props = r),
                  (i.state = s),
                  (i.context = f),
                  (r = u))
                : (typeof i.componentDidMount == 'function' && (t.flags |= 4), (r = !1));
    } else {
        (i = t.stateNode),
            ca(e, t),
            (u = t.memoizedProps),
            (f = t.type === t.elementType ? u : xe(t.type, u)),
            (i.props = f),
            (E = t.pendingProps),
            (m = i.context),
            (s = n.contextType),
            typeof s == 'object' && s !== null
                ? (s = ge(s))
                : ((s = ce(n) ? xt : le.current), (s = Zt(t, s)));
        var S = n.getDerivedStateFromProps;
        (g = typeof S == 'function' || typeof i.getSnapshotBeforeUpdate == 'function') ||
            (typeof i.UNSAFE_componentWillReceiveProps != 'function' &&
                typeof i.componentWillReceiveProps != 'function') ||
            ((u !== E || m !== s) && wu(t, i, r, s)),
            (Be = !1),
            (m = t.memoizedState),
            (i.state = m),
            Zn(t, r, i, l);
        var x = t.memoizedState;
        u !== E || m !== x || ae.current || Be
            ? (typeof S == 'function' && (Qr(t, n, S, r), (x = t.memoizedState)),
              (f = Be || yu(t, n, f, r, m, x, s))
                  ? (g ||
                        (typeof i.UNSAFE_componentWillUpdate != 'function' &&
                            typeof i.componentWillUpdate != 'function') ||
                        (typeof i.componentWillUpdate == 'function' &&
                            i.componentWillUpdate(r, x, s),
                        typeof i.UNSAFE_componentWillUpdate == 'function' &&
                            i.UNSAFE_componentWillUpdate(r, x, s)),
                    typeof i.componentDidUpdate == 'function' && (t.flags |= 4),
                    typeof i.getSnapshotBeforeUpdate == 'function' && (t.flags |= 256))
                  : (typeof i.componentDidUpdate != 'function' ||
                        (u === e.memoizedProps && m === e.memoizedState) ||
                        (t.flags |= 4),
                    typeof i.getSnapshotBeforeUpdate != 'function' ||
                        (u === e.memoizedProps && m === e.memoizedState) ||
                        (t.flags |= 256),
                    (t.memoizedProps = r),
                    (t.memoizedState = x)),
              (i.props = r),
              (i.state = x),
              (i.context = s),
              (r = f))
            : (typeof i.componentDidUpdate != 'function' ||
                  (u === e.memoizedProps && m === e.memoizedState) ||
                  (t.flags |= 4),
              typeof i.getSnapshotBeforeUpdate != 'function' ||
                  (u === e.memoizedProps && m === e.memoizedState) ||
                  (t.flags |= 256),
              (r = !1));
    }
    return ho(e, t, n, r, o, l);
}
function ho(e, t, n, r, l, o) {
    Ca(e, t);
    var i = (t.flags & 64) !== 0;
    if (!r && !i) return l && pu(t, n, !1), Fe(e, t, o);
    (r = t.stateNode), (Df.current = t);
    var u = i && typeof n.getDerivedStateFromError != 'function' ? null : r.render();
    return (
        (t.flags |= 1),
        e !== null && i
            ? ((t.child = Gr(t, e.child, null, o)), (t.child = Gr(t, null, u, o)))
            : se(e, t, u, o),
        (t.memoizedState = r.state),
        l && pu(t, n, !0),
        t.child
    );
}
function Lu(e) {
    var t = e.stateNode;
    t.pendingContext
        ? du(e, t.pendingContext, t.pendingContext !== t.context)
        : t.context && du(e, t.context, !1),
        co(e, t.containerInfo);
}
var vr = { dehydrated: null, retryLane: 0 };
function zu(e, t, n) {
    var r = t.pendingProps,
        l = B.current,
        o = !1,
        i;
    return (
        (i = (t.flags & 64) !== 0) ||
            (i = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0),
        i
            ? ((o = !0), (t.flags &= -65))
            : (e !== null && e.memoizedState === null) ||
              r.fallback === void 0 ||
              r.unstable_avoidThisFallback === !0 ||
              (l |= 1),
        W(B, l & 1),
        e === null
            ? (r.fallback !== void 0 && fo(t),
              (e = r.children),
              (l = r.fallback),
              o
                  ? ((e = Ru(t, e, l, n)),
                    (t.child.memoizedState = { baseLanes: n }),
                    (t.memoizedState = vr),
                    e)
                  : typeof r.unstable_expectedLoadTime == 'number'
                    ? ((e = Ru(t, e, l, n)),
                      (t.child.memoizedState = { baseLanes: n }),
                      (t.memoizedState = vr),
                      (t.lanes = 33554432),
                      e)
                    : ((n = Ei({ mode: 'visible', children: e }, t.mode, n, null)),
                      (n.return = t),
                      (t.child = n)))
            : e.memoizedState !== null
              ? o
                  ? ((r = Mu(e, t, r.children, r.fallback, n)),
                    (o = t.child),
                    (l = e.child.memoizedState),
                    (o.memoizedState =
                        l === null ? { baseLanes: n } : { baseLanes: l.baseLanes | n }),
                    (o.childLanes = e.childLanes & ~n),
                    (t.memoizedState = vr),
                    r)
                  : ((n = Ou(e, t, r.children, n)), (t.memoizedState = null), n)
              : o
                ? ((r = Mu(e, t, r.children, r.fallback, n)),
                  (o = t.child),
                  (l = e.child.memoizedState),
                  (o.memoizedState =
                      l === null ? { baseLanes: n } : { baseLanes: l.baseLanes | n }),
                  (o.childLanes = e.childLanes & ~n),
                  (t.memoizedState = vr),
                  r)
                : ((n = Ou(e, t, r.children, n)), (t.memoizedState = null), n)
    );
}
function Ru(e, t, n, r) {
    var l = e.mode,
        o = e.child;
    return (
        (t = { mode: 'hidden', children: t }),
        (l & 2) === 0 && o !== null
            ? ((o.childLanes = 0), (o.pendingProps = t))
            : (o = Ei(t, l, 0, null)),
        (n = Kt(n, l, r, null)),
        (o.return = e),
        (n.return = e),
        (o.sibling = n),
        (e.child = o),
        n
    );
}
function Ou(e, t, n, r) {
    var l = e.child;
    return (
        (e = l.sibling),
        (n = ot(l, { mode: 'visible', children: n })),
        (t.mode & 2) === 0 && (n.lanes = r),
        (n.return = t),
        (n.sibling = null),
        e !== null && ((e.nextEffect = null), (e.flags = 8), (t.firstEffect = t.lastEffect = e)),
        (t.child = n)
    );
}
function Mu(e, t, n, r, l) {
    var o = t.mode,
        i = e.child;
    e = i.sibling;
    var u = { mode: 'hidden', children: n };
    return (
        (o & 2) === 0 && t.child !== i
            ? ((n = t.child),
              (n.childLanes = 0),
              (n.pendingProps = u),
              (i = n.lastEffect),
              i !== null
                  ? ((t.firstEffect = n.firstEffect), (t.lastEffect = i), (i.nextEffect = null))
                  : (t.firstEffect = t.lastEffect = null))
            : (n = ot(i, u)),
        e !== null ? (r = ot(e, r)) : ((r = Kt(r, o, l, null)), (r.flags |= 2)),
        (r.return = t),
        (n.return = t),
        (n.sibling = r),
        (t.child = n),
        r
    );
}
function ju(e, t) {
    e.lanes |= t;
    var n = e.alternate;
    n !== null && (n.lanes |= t), aa(e.return, t);
}
function Fl(e, t, n, r, l, o) {
    var i = e.memoizedState;
    i === null
        ? (e.memoizedState = {
              isBackwards: t,
              rendering: null,
              renderingStartTime: 0,
              last: r,
              tail: n,
              tailMode: l,
              lastEffect: o,
          })
        : ((i.isBackwards = t),
          (i.rendering = null),
          (i.renderingStartTime = 0),
          (i.last = r),
          (i.tail = n),
          (i.tailMode = l),
          (i.lastEffect = o));
}
function Iu(e, t, n) {
    var r = t.pendingProps,
        l = r.revealOrder,
        o = r.tail;
    if ((se(e, t, r.children, n), (r = B.current), (r & 2) !== 0))
        (r = (r & 1) | 2), (t.flags |= 64);
    else {
        if (e !== null && (e.flags & 64) !== 0)
            e: for (e = t.child; e !== null; ) {
                if (e.tag === 13) e.memoizedState !== null && ju(e, n);
                else if (e.tag === 19) ju(e, n);
                else if (e.child !== null) {
                    (e.child.return = e), (e = e.child);
                    continue;
                }
                if (e === t) break e;
                for (; e.sibling === null; ) {
                    if (e.return === null || e.return === t) break e;
                    e = e.return;
                }
                (e.sibling.return = e.return), (e = e.sibling);
            }
        r &= 1;
    }
    if ((W(B, r), (t.mode & 2) === 0)) t.memoizedState = null;
    else
        switch (l) {
            case 'forwards':
                for (n = t.child, l = null; n !== null; )
                    (e = n.alternate), e !== null && Yr(e) === null && (l = n), (n = n.sibling);
                (n = l),
                    n === null
                        ? ((l = t.child), (t.child = null))
                        : ((l = n.sibling), (n.sibling = null)),
                    Fl(t, !1, l, n, o, t.lastEffect);
                break;
            case 'backwards':
                for (n = null, l = t.child, t.child = null; l !== null; ) {
                    if (((e = l.alternate), e !== null && Yr(e) === null)) {
                        t.child = l;
                        break;
                    }
                    (e = l.sibling), (l.sibling = n), (n = l), (l = e);
                }
                Fl(t, !0, n, null, o, t.lastEffect);
                break;
            case 'together':
                Fl(t, !1, null, null, void 0, t.lastEffect);
                break;
            default:
                t.memoizedState = null;
        }
    return t.child;
}
function Fe(e, t, n) {
    if (
        (e !== null && (t.dependencies = e.dependencies), (lr |= t.lanes), (n & t.childLanes) !== 0)
    ) {
        if (e !== null && t.child !== e.child) throw Error(v(153));
        if (t.child !== null) {
            for (
                e = t.child, n = ot(e, e.pendingProps), t.child = n, n.return = t;
                e.sibling !== null;

            )
                (e = e.sibling), (n = n.sibling = ot(e, e.pendingProps)), (n.return = t);
            n.sibling = null;
        }
        return t.child;
    }
    return null;
}
var _a, go, Pa, Na;
_a = function (e, t) {
    for (var n = t.child; n !== null; ) {
        if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
        else if (n.tag !== 4 && n.child !== null) {
            (n.child.return = n), (n = n.child);
            continue;
        }
        if (n === t) break;
        for (; n.sibling === null; ) {
            if (n.return === null || n.return === t) return;
            n = n.return;
        }
        (n.sibling.return = n.return), (n = n.sibling);
    }
};
go = function () {};
Pa = function (e, t, n, r) {
    var l = e.memoizedProps;
    if (l !== r) {
        (e = t.stateNode), gt(Ne.current);
        var o = null;
        switch (n) {
            case 'input':
                (l = Bl(e, l)), (r = Bl(e, r)), (o = []);
                break;
            case 'option':
                (l = Ql(e, l)), (r = Ql(e, r)), (o = []);
                break;
            case 'select':
                (l = $({}, l, { value: void 0 })), (r = $({}, r, { value: void 0 })), (o = []);
                break;
            case 'textarea':
                (l = Gl(e, l)), (r = Gl(e, r)), (o = []);
                break;
            default:
                typeof l.onClick != 'function' &&
                    typeof r.onClick == 'function' &&
                    (e.onclick = Vr);
        }
        Xl(n, r);
        var i;
        n = null;
        for (f in l)
            if (!r.hasOwnProperty(f) && l.hasOwnProperty(f) && l[f] != null)
                if (f === 'style') {
                    var u = l[f];
                    for (i in u) u.hasOwnProperty(i) && (n || (n = {}), (n[i] = ''));
                } else
                    f !== 'dangerouslySetInnerHTML' &&
                        f !== 'children' &&
                        f !== 'suppressContentEditableWarning' &&
                        f !== 'suppressHydrationWarning' &&
                        f !== 'autoFocus' &&
                        (An.hasOwnProperty(f) ? o || (o = []) : (o = o || []).push(f, null));
        for (f in r) {
            var s = r[f];
            if (
                ((u = l != null ? l[f] : void 0),
                r.hasOwnProperty(f) && s !== u && (s != null || u != null))
            )
                if (f === 'style')
                    if (u) {
                        for (i in u)
                            !u.hasOwnProperty(i) ||
                                (s && s.hasOwnProperty(i)) ||
                                (n || (n = {}), (n[i] = ''));
                        for (i in s)
                            s.hasOwnProperty(i) && u[i] !== s[i] && (n || (n = {}), (n[i] = s[i]));
                    } else n || (o || (o = []), o.push(f, n)), (n = s);
                else
                    f === 'dangerouslySetInnerHTML'
                        ? ((s = s ? s.__html : void 0),
                          (u = u ? u.__html : void 0),
                          s != null && u !== s && (o = o || []).push(f, s))
                        : f === 'children'
                          ? (typeof s != 'string' && typeof s != 'number') ||
                            (o = o || []).push(f, '' + s)
                          : f !== 'suppressContentEditableWarning' &&
                            f !== 'suppressHydrationWarning' &&
                            (An.hasOwnProperty(f)
                                ? (s != null && f === 'onScroll' && V('scroll', e),
                                  o || u === s || (o = []))
                                : typeof s == 'object' && s !== null && s.$$typeof === Wo
                                  ? s.toString()
                                  : (o = o || []).push(f, s));
        }
        n && (o = o || []).push('style', n);
        var f = o;
        (t.updateQueue = f) && (t.flags |= 4);
    }
};
Na = function (e, t, n, r) {
    n !== r && (t.flags |= 4);
};
function wn(e, t) {
    if (!Te)
        switch (e.tailMode) {
            case 'hidden':
                t = e.tail;
                for (var n = null; t !== null; ) t.alternate !== null && (n = t), (t = t.sibling);
                n === null ? (e.tail = null) : (n.sibling = null);
                break;
            case 'collapsed':
                n = e.tail;
                for (var r = null; n !== null; ) n.alternate !== null && (r = n), (n = n.sibling);
                r === null
                    ? t || e.tail === null
                        ? (e.tail = null)
                        : (e.tail.sibling = null)
                    : (r.sibling = null);
        }
}
function Uf(e, t, n) {
    var r = t.pendingProps;
    switch (t.tag) {
        case 2:
        case 16:
        case 15:
        case 0:
        case 11:
        case 7:
        case 8:
        case 12:
        case 9:
        case 14:
            return null;
        case 1:
            return ce(t.type) && $r(), null;
        case 3:
            return (
                Jt(),
                A(ae),
                A(le),
                fi(),
                (r = t.stateNode),
                r.pendingContext && ((r.context = r.pendingContext), (r.pendingContext = null)),
                (e === null || e.child === null) &&
                    (gr(t) ? (t.flags |= 4) : r.hydrate || (t.flags |= 256)),
                go(t),
                null
            );
        case 5:
            ci(t);
            var l = gt(Jn.current);
            if (((n = t.type), e !== null && t.stateNode != null))
                Pa(e, t, n, r, l), e.ref !== t.ref && (t.flags |= 128);
            else {
                if (!r) {
                    if (t.stateNode === null) throw Error(v(166));
                    return null;
                }
                if (((e = gt(Ne.current)), gr(t))) {
                    (r = t.stateNode), (n = t.type);
                    var o = t.memoizedProps;
                    switch (((r[Qe] = t), (r[Ar] = o), n)) {
                        case 'dialog':
                            V('cancel', r), V('close', r);
                            break;
                        case 'iframe':
                        case 'object':
                        case 'embed':
                            V('load', r);
                            break;
                        case 'video':
                        case 'audio':
                            for (e = 0; e < _n.length; e++) V(_n[e], r);
                            break;
                        case 'source':
                            V('error', r);
                            break;
                        case 'img':
                        case 'image':
                        case 'link':
                            V('error', r), V('load', r);
                            break;
                        case 'details':
                            V('toggle', r);
                            break;
                        case 'input':
                            Ii(r, o), V('invalid', r);
                            break;
                        case 'select':
                            (r._wrapperState = { wasMultiple: !!o.multiple }), V('invalid', r);
                            break;
                        case 'textarea':
                            Di(r, o), V('invalid', r);
                    }
                    Xl(n, o), (e = null);
                    for (var i in o)
                        o.hasOwnProperty(i) &&
                            ((l = o[i]),
                            i === 'children'
                                ? typeof l == 'string'
                                    ? r.textContent !== l && (e = ['children', l])
                                    : typeof l == 'number' &&
                                      r.textContent !== '' + l &&
                                      (e = ['children', '' + l])
                                : An.hasOwnProperty(i) &&
                                  l != null &&
                                  i === 'onScroll' &&
                                  V('scroll', r));
                    switch (n) {
                        case 'input':
                            cr(r), Fi(r, o, !0);
                            break;
                        case 'textarea':
                            cr(r), Ui(r);
                            break;
                        case 'select':
                        case 'option':
                            break;
                        default:
                            typeof o.onClick == 'function' && (r.onclick = Vr);
                    }
                    (r = e), (t.updateQueue = r), r !== null && (t.flags |= 4);
                } else {
                    switch (
                        ((i = l.nodeType === 9 ? l : l.ownerDocument),
                        e === Yl.html && (e = xs(n)),
                        e === Yl.html
                            ? n === 'script'
                                ? ((e = i.createElement('div')),
                                  (e.innerHTML = '<script></script>'),
                                  (e = e.removeChild(e.firstChild)))
                                : typeof r.is == 'string'
                                  ? (e = i.createElement(n, { is: r.is }))
                                  : ((e = i.createElement(n)),
                                    n === 'select' &&
                                        ((i = e),
                                        r.multiple
                                            ? (i.multiple = !0)
                                            : r.size && (i.size = r.size)))
                            : (e = i.createElementNS(e, n)),
                        (e[Qe] = t),
                        (e[Ar] = r),
                        _a(e, t, !1, !1),
                        (t.stateNode = e),
                        (i = Zl(n, r)),
                        n)
                    ) {
                        case 'dialog':
                            V('cancel', e), V('close', e), (l = r);
                            break;
                        case 'iframe':
                        case 'object':
                        case 'embed':
                            V('load', e), (l = r);
                            break;
                        case 'video':
                        case 'audio':
                            for (l = 0; l < _n.length; l++) V(_n[l], e);
                            l = r;
                            break;
                        case 'source':
                            V('error', e), (l = r);
                            break;
                        case 'img':
                        case 'image':
                        case 'link':
                            V('error', e), V('load', e), (l = r);
                            break;
                        case 'details':
                            V('toggle', e), (l = r);
                            break;
                        case 'input':
                            Ii(e, r), (l = Bl(e, r)), V('invalid', e);
                            break;
                        case 'option':
                            l = Ql(e, r);
                            break;
                        case 'select':
                            (e._wrapperState = { wasMultiple: !!r.multiple }),
                                (l = $({}, r, { value: void 0 })),
                                V('invalid', e);
                            break;
                        case 'textarea':
                            Di(e, r), (l = Gl(e, r)), V('invalid', e);
                            break;
                        default:
                            l = r;
                    }
                    Xl(n, l);
                    var u = l;
                    for (o in u)
                        if (u.hasOwnProperty(o)) {
                            var s = u[o];
                            o === 'style'
                                ? Es(e, s)
                                : o === 'dangerouslySetInnerHTML'
                                  ? ((s = s ? s.__html : void 0), s != null && ks(e, s))
                                  : o === 'children'
                                    ? typeof s == 'string'
                                        ? (n !== 'textarea' || s !== '') && $n(e, s)
                                        : typeof s == 'number' && $n(e, '' + s)
                                    : o !== 'suppressContentEditableWarning' &&
                                      o !== 'suppressHydrationWarning' &&
                                      o !== 'autoFocus' &&
                                      (An.hasOwnProperty(o)
                                          ? s != null && o === 'onScroll' && V('scroll', e)
                                          : s != null && Do(e, o, s, i));
                        }
                    switch (n) {
                        case 'input':
                            cr(e), Fi(e, r, !1);
                            break;
                        case 'textarea':
                            cr(e), Ui(e);
                            break;
                        case 'option':
                            r.value != null && e.setAttribute('value', '' + tt(r.value));
                            break;
                        case 'select':
                            (e.multiple = !!r.multiple),
                                (o = r.value),
                                o != null
                                    ? At(e, !!r.multiple, o, !1)
                                    : r.defaultValue != null &&
                                      At(e, !!r.multiple, r.defaultValue, !0);
                            break;
                        default:
                            typeof l.onClick == 'function' && (e.onclick = Vr);
                    }
                    ea(n, r) && (t.flags |= 4);
                }
                t.ref !== null && (t.flags |= 128);
            }
            return null;
        case 6:
            if (e && t.stateNode != null) Na(e, t, e.memoizedProps, r);
            else {
                if (typeof r != 'string' && t.stateNode === null) throw Error(v(166));
                (n = gt(Jn.current)),
                    gt(Ne.current),
                    gr(t)
                        ? ((r = t.stateNode),
                          (n = t.memoizedProps),
                          (r[Qe] = t),
                          r.nodeValue !== n && (t.flags |= 4))
                        : ((r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r)),
                          (r[Qe] = t),
                          (t.stateNode = r));
            }
            return null;
        case 13:
            return (
                A(B),
                (r = t.memoizedState),
                (t.flags & 64) !== 0
                    ? ((t.lanes = n), t)
                    : ((r = r !== null),
                      (n = !1),
                      e === null
                          ? t.memoizedProps.fallback !== void 0 && gr(t)
                          : (n = e.memoizedState !== null),
                      r &&
                          !n &&
                          (t.mode & 2) !== 0 &&
                          ((e === null && t.memoizedProps.unstable_avoidThisFallback !== !0) ||
                          (B.current & 1) !== 0
                              ? q === 0 && (q = 3)
                              : ((q === 0 || q === 3) && (q = 4),
                                oe === null ||
                                    ((lr & 134217727) === 0 && (ln & 134217727) === 0) ||
                                    Gt(oe, re))),
                      (r || n) && (t.flags |= 4),
                      null)
            );
        case 4:
            return Jt(), go(t), e === null && bs(t.stateNode.containerInfo), null;
        case 10:
            return si(t), null;
        case 17:
            return ce(t.type) && $r(), null;
        case 19:
            if ((A(B), (r = t.memoizedState), r === null)) return null;
            if (((o = (t.flags & 64) !== 0), (i = r.rendering), i === null))
                if (o) wn(r, !1);
                else {
                    if (q !== 0 || (e !== null && (e.flags & 64) !== 0))
                        for (e = t.child; e !== null; ) {
                            if (((i = Yr(e)), i !== null)) {
                                for (
                                    t.flags |= 64,
                                        wn(r, !1),
                                        o = i.updateQueue,
                                        o !== null && ((t.updateQueue = o), (t.flags |= 4)),
                                        r.lastEffect === null && (t.firstEffect = null),
                                        t.lastEffect = r.lastEffect,
                                        r = n,
                                        n = t.child;
                                    n !== null;

                                )
                                    (o = n),
                                        (e = r),
                                        (o.flags &= 2),
                                        (o.nextEffect = null),
                                        (o.firstEffect = null),
                                        (o.lastEffect = null),
                                        (i = o.alternate),
                                        i === null
                                            ? ((o.childLanes = 0),
                                              (o.lanes = e),
                                              (o.child = null),
                                              (o.memoizedProps = null),
                                              (o.memoizedState = null),
                                              (o.updateQueue = null),
                                              (o.dependencies = null),
                                              (o.stateNode = null))
                                            : ((o.childLanes = i.childLanes),
                                              (o.lanes = i.lanes),
                                              (o.child = i.child),
                                              (o.memoizedProps = i.memoizedProps),
                                              (o.memoizedState = i.memoizedState),
                                              (o.updateQueue = i.updateQueue),
                                              (o.type = i.type),
                                              (e = i.dependencies),
                                              (o.dependencies =
                                                  e === null
                                                      ? null
                                                      : {
                                                            lanes: e.lanes,
                                                            firstContext: e.firstContext,
                                                        })),
                                        (n = n.sibling);
                                return W(B, (B.current & 1) | 2), t.child;
                            }
                            e = e.sibling;
                        }
                    r.tail !== null &&
                        ne() > So &&
                        ((t.flags |= 64), (o = !0), wn(r, !1), (t.lanes = 33554432));
                }
            else {
                if (!o)
                    if (((e = Yr(i)), e !== null)) {
                        if (
                            ((t.flags |= 64),
                            (o = !0),
                            (n = e.updateQueue),
                            n !== null && ((t.updateQueue = n), (t.flags |= 4)),
                            wn(r, !0),
                            r.tail === null && r.tailMode === 'hidden' && !i.alternate && !Te)
                        )
                            return (
                                (t = t.lastEffect = r.lastEffect),
                                t !== null && (t.nextEffect = null),
                                null
                            );
                    } else
                        2 * ne() - r.renderingStartTime > So &&
                            n !== 1073741824 &&
                            ((t.flags |= 64), (o = !0), wn(r, !1), (t.lanes = 33554432));
                r.isBackwards
                    ? ((i.sibling = t.child), (t.child = i))
                    : ((n = r.last), n !== null ? (n.sibling = i) : (t.child = i), (r.last = i));
            }
            return r.tail !== null
                ? ((n = r.tail),
                  (r.rendering = n),
                  (r.tail = n.sibling),
                  (r.lastEffect = t.lastEffect),
                  (r.renderingStartTime = ne()),
                  (n.sibling = null),
                  (t = B.current),
                  W(B, o ? (t & 1) | 2 : t & 1),
                  n)
                : null;
        case 23:
        case 24:
            return (
                ki(),
                e !== null &&
                    (e.memoizedState !== null) != (t.memoizedState !== null) &&
                    r.mode !== 'unstable-defer-without-hiding' &&
                    (t.flags |= 4),
                null
            );
    }
    throw Error(v(156, t.tag));
}
function Vf(e) {
    switch (e.tag) {
        case 1:
            ce(e.type) && $r();
            var t = e.flags;
            return t & 4096 ? ((e.flags = (t & -4097) | 64), e) : null;
        case 3:
            if ((Jt(), A(ae), A(le), fi(), (t = e.flags), (t & 64) !== 0)) throw Error(v(285));
            return (e.flags = (t & -4097) | 64), e;
        case 5:
            return ci(e), null;
        case 13:
            return A(B), (t = e.flags), t & 4096 ? ((e.flags = (t & -4097) | 64), e) : null;
        case 19:
            return A(B), null;
        case 4:
            return Jt(), null;
        case 10:
            return si(e), null;
        case 23:
        case 24:
            return ki(), null;
        default:
            return null;
    }
}
function vi(e, t) {
    try {
        var n = '',
            r = t;
        do (n += yc(r)), (r = r.return);
        while (r);
        var l = n;
    } catch (o) {
        l =
            `
Error generating stack: ` +
            o.message +
            `
` +
            o.stack;
    }
    return { value: e, source: t, stack: l };
}
function vo(e, t) {
    try {
        console.error(t.value);
    } catch (n) {
        setTimeout(function () {
            throw n;
        });
    }
}
var Af = typeof WeakMap == 'function' ? WeakMap : Map;
function Ta(e, t, n) {
    (n = Ze(-1, n)), (n.tag = 3), (n.payload = { element: null });
    var r = t.value;
    return (
        (n.callback = function () {
            el || ((el = !0), (Eo = r)), vo(e, t);
        }),
        n
    );
}
function La(e, t, n) {
    (n = Ze(-1, n)), (n.tag = 3);
    var r = e.type.getDerivedStateFromError;
    if (typeof r == 'function') {
        var l = t.value;
        n.payload = function () {
            return vo(e, t), r(l);
        };
    }
    var o = e.stateNode;
    return (
        o !== null &&
            typeof o.componentDidCatch == 'function' &&
            (n.callback = function () {
                typeof r != 'function' &&
                    (Pe === null ? (Pe = new Set([this])) : Pe.add(this), vo(e, t));
                var i = t.stack;
                this.componentDidCatch(t.value, {
                    componentStack: i !== null ? i : '',
                });
            }),
        n
    );
}
var $f = typeof WeakSet == 'function' ? WeakSet : Set;
function Fu(e) {
    var t = e.ref;
    if (t !== null)
        if (typeof t == 'function')
            try {
                t(null);
            } catch (n) {
                et(e, n);
            }
        else t.current = null;
}
function Bf(e, t) {
    switch (t.tag) {
        case 0:
        case 11:
        case 15:
        case 22:
            return;
        case 1:
            if (t.flags & 256 && e !== null) {
                var n = e.memoizedProps,
                    r = e.memoizedState;
                (e = t.stateNode),
                    (t = e.getSnapshotBeforeUpdate(
                        t.elementType === t.type ? n : xe(t.type, n),
                        r,
                    )),
                    (e.__reactInternalSnapshotBeforeUpdate = t);
            }
            return;
        case 3:
            t.flags & 256 && li(t.stateNode.containerInfo);
            return;
        case 5:
        case 6:
        case 4:
        case 17:
            return;
    }
    throw Error(v(163));
}
function Wf(e, t, n) {
    switch (n.tag) {
        case 0:
        case 11:
        case 15:
        case 22:
            if (((t = n.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)) {
                e = t = t.next;
                do {
                    if ((e.tag & 3) === 3) {
                        var r = e.create;
                        e.destroy = r();
                    }
                    e = e.next;
                } while (e !== t);
            }
            if (((t = n.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)) {
                e = t = t.next;
                do {
                    var l = e;
                    (r = l.next),
                        (l = l.tag),
                        (l & 4) !== 0 && (l & 1) !== 0 && (Ua(n, e), bf(n, e)),
                        (e = r);
                } while (e !== t);
            }
            return;
        case 1:
            (e = n.stateNode),
                n.flags & 4 &&
                    (t === null
                        ? e.componentDidMount()
                        : ((r =
                              n.elementType === n.type
                                  ? t.memoizedProps
                                  : xe(n.type, t.memoizedProps)),
                          e.componentDidUpdate(
                              r,
                              t.memoizedState,
                              e.__reactInternalSnapshotBeforeUpdate,
                          ))),
                (t = n.updateQueue),
                t !== null && vu(n, t, e);
            return;
        case 3:
            if (((t = n.updateQueue), t !== null)) {
                if (((e = null), n.child !== null))
                    switch (n.child.tag) {
                        case 5:
                            e = n.child.stateNode;
                            break;
                        case 1:
                            e = n.child.stateNode;
                    }
                vu(n, t, e);
            }
            return;
        case 5:
            (e = n.stateNode),
                t === null && n.flags & 4 && ea(n.type, n.memoizedProps) && e.focus();
            return;
        case 6:
            return;
        case 4:
            return;
        case 12:
            return;
        case 13:
            n.memoizedState === null &&
                ((n = n.alternate),
                n !== null &&
                    ((n = n.memoizedState),
                    n !== null && ((n = n.dehydrated), n !== null && Ms(n))));
            return;
        case 19:
        case 17:
        case 20:
        case 21:
        case 23:
        case 24:
            return;
    }
    throw Error(v(163));
}
function Du(e, t) {
    for (var n = e; ; ) {
        if (n.tag === 5) {
            var r = n.stateNode;
            if (t)
                (r = r.style),
                    typeof r.setProperty == 'function'
                        ? r.setProperty('display', 'none', 'important')
                        : (r.display = 'none');
            else {
                r = n.stateNode;
                var l = n.memoizedProps.style;
                (l = l != null && l.hasOwnProperty('display') ? l.display : null),
                    (r.style.display = Ss('display', l));
            }
        } else if (n.tag === 6) n.stateNode.nodeValue = t ? '' : n.memoizedProps;
        else if (
            ((n.tag !== 23 && n.tag !== 24) || n.memoizedState === null || n === e) &&
            n.child !== null
        ) {
            (n.child.return = n), (n = n.child);
            continue;
        }
        if (n === e) break;
        for (; n.sibling === null; ) {
            if (n.return === null || n.return === e) return;
            n = n.return;
        }
        (n.sibling.return = n.return), (n = n.sibling);
    }
}
function Uu(e, t) {
    if (wt && typeof wt.onCommitFiberUnmount == 'function')
        try {
            wt.onCommitFiberUnmount(oi, t);
        } catch {}
    switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
        case 22:
            if (((e = t.updateQueue), e !== null && ((e = e.lastEffect), e !== null))) {
                var n = (e = e.next);
                do {
                    var r = n,
                        l = r.destroy;
                    if (((r = r.tag), l !== void 0))
                        if ((r & 4) !== 0) Ua(t, n);
                        else {
                            r = t;
                            try {
                                l();
                            } catch (o) {
                                et(r, o);
                            }
                        }
                    n = n.next;
                } while (n !== e);
            }
            break;
        case 1:
            if ((Fu(t), (e = t.stateNode), typeof e.componentWillUnmount == 'function'))
                try {
                    (e.props = t.memoizedProps),
                        (e.state = t.memoizedState),
                        e.componentWillUnmount();
                } catch (o) {
                    et(t, o);
                }
            break;
        case 5:
            Fu(t);
            break;
        case 4:
            za(e, t);
    }
}
function Vu(e) {
    (e.alternate = null),
        (e.child = null),
        (e.dependencies = null),
        (e.firstEffect = null),
        (e.lastEffect = null),
        (e.memoizedProps = null),
        (e.memoizedState = null),
        (e.pendingProps = null),
        (e.return = null),
        (e.updateQueue = null);
}
function Au(e) {
    return e.tag === 5 || e.tag === 3 || e.tag === 4;
}
function $u(e) {
    e: {
        for (var t = e.return; t !== null; ) {
            if (Au(t)) break e;
            t = t.return;
        }
        throw Error(v(160));
    }
    var n = t;
    switch (((t = n.stateNode), n.tag)) {
        case 5:
            var r = !1;
            break;
        case 3:
            (t = t.containerInfo), (r = !0);
            break;
        case 4:
            (t = t.containerInfo), (r = !0);
            break;
        default:
            throw Error(v(161));
    }
    n.flags & 16 && ($n(t, ''), (n.flags &= -17));
    e: t: for (n = e; ; ) {
        for (; n.sibling === null; ) {
            if (n.return === null || Au(n.return)) {
                n = null;
                break e;
            }
            n = n.return;
        }
        for (
            n.sibling.return = n.return, n = n.sibling;
            n.tag !== 5 && n.tag !== 6 && n.tag !== 18;

        ) {
            if (n.flags & 2 || n.child === null || n.tag === 4) continue t;
            (n.child.return = n), (n = n.child);
        }
        if (!(n.flags & 2)) {
            n = n.stateNode;
            break e;
        }
    }
    r ? yo(e, n, t) : wo(e, n, t);
}
function yo(e, t, n) {
    var r = e.tag,
        l = r === 5 || r === 6;
    if (l)
        (e = l ? e.stateNode : e.stateNode.instance),
            t
                ? n.nodeType === 8
                    ? n.parentNode.insertBefore(e, t)
                    : n.insertBefore(e, t)
                : (n.nodeType === 8
                      ? ((t = n.parentNode), t.insertBefore(e, n))
                      : ((t = n), t.appendChild(e)),
                  (n = n._reactRootContainer),
                  n != null || t.onclick !== null || (t.onclick = Vr));
    else if (r !== 4 && ((e = e.child), e !== null))
        for (yo(e, t, n), e = e.sibling; e !== null; ) yo(e, t, n), (e = e.sibling);
}
function wo(e, t, n) {
    var r = e.tag,
        l = r === 5 || r === 6;
    if (l)
        (e = l ? e.stateNode : e.stateNode.instance), t ? n.insertBefore(e, t) : n.appendChild(e);
    else if (r !== 4 && ((e = e.child), e !== null))
        for (wo(e, t, n), e = e.sibling; e !== null; ) wo(e, t, n), (e = e.sibling);
}
function za(e, t) {
    for (var n = t, r = !1, l, o; ; ) {
        if (!r) {
            r = n.return;
            e: for (;;) {
                if (r === null) throw Error(v(160));
                switch (((l = r.stateNode), r.tag)) {
                    case 5:
                        o = !1;
                        break e;
                    case 3:
                        (l = l.containerInfo), (o = !0);
                        break e;
                    case 4:
                        (l = l.containerInfo), (o = !0);
                        break e;
                }
                r = r.return;
            }
            r = !0;
        }
        if (n.tag === 5 || n.tag === 6) {
            e: for (var i = e, u = n, s = u; ; )
                if ((Uu(i, s), s.child !== null && s.tag !== 4))
                    (s.child.return = s), (s = s.child);
                else {
                    if (s === u) break e;
                    for (; s.sibling === null; ) {
                        if (s.return === null || s.return === u) break e;
                        s = s.return;
                    }
                    (s.sibling.return = s.return), (s = s.sibling);
                }
            o
                ? ((i = l),
                  (u = n.stateNode),
                  i.nodeType === 8 ? i.parentNode.removeChild(u) : i.removeChild(u))
                : l.removeChild(n.stateNode);
        } else if (n.tag === 4) {
            if (n.child !== null) {
                (l = n.stateNode.containerInfo), (o = !0), (n.child.return = n), (n = n.child);
                continue;
            }
        } else if ((Uu(e, n), n.child !== null)) {
            (n.child.return = n), (n = n.child);
            continue;
        }
        if (n === t) break;
        for (; n.sibling === null; ) {
            if (n.return === null || n.return === t) return;
            (n = n.return), n.tag === 4 && (r = !1);
        }
        (n.sibling.return = n.return), (n = n.sibling);
    }
}
function Dl(e, t) {
    switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
        case 22:
            var n = t.updateQueue;
            if (((n = n !== null ? n.lastEffect : null), n !== null)) {
                var r = (n = n.next);
                do
                    (r.tag & 3) === 3 &&
                        ((e = r.destroy), (r.destroy = void 0), e !== void 0 && e()),
                        (r = r.next);
                while (r !== n);
            }
            return;
        case 1:
            return;
        case 5:
            if (((n = t.stateNode), n != null)) {
                r = t.memoizedProps;
                var l = e !== null ? e.memoizedProps : r;
                e = t.type;
                var o = t.updateQueue;
                if (((t.updateQueue = null), o !== null)) {
                    for (
                        n[Ar] = r,
                            e === 'input' && r.type === 'radio' && r.name != null && ys(n, r),
                            Zl(e, l),
                            t = Zl(e, r),
                            l = 0;
                        l < o.length;
                        l += 2
                    ) {
                        var i = o[l],
                            u = o[l + 1];
                        i === 'style'
                            ? Es(n, u)
                            : i === 'dangerouslySetInnerHTML'
                              ? ks(n, u)
                              : i === 'children'
                                ? $n(n, u)
                                : Do(n, i, u, t);
                    }
                    switch (e) {
                        case 'input':
                            Wl(n, r);
                            break;
                        case 'textarea':
                            ws(n, r);
                            break;
                        case 'select':
                            (e = n._wrapperState.wasMultiple),
                                (n._wrapperState.wasMultiple = !!r.multiple),
                                (o = r.value),
                                o != null
                                    ? At(n, !!r.multiple, o, !1)
                                    : e !== !!r.multiple &&
                                      (r.defaultValue != null
                                          ? At(n, !!r.multiple, r.defaultValue, !0)
                                          : At(n, !!r.multiple, r.multiple ? [] : '', !1));
                    }
                }
            }
            return;
        case 6:
            if (t.stateNode === null) throw Error(v(162));
            t.stateNode.nodeValue = t.memoizedProps;
            return;
        case 3:
            (n = t.stateNode), n.hydrate && ((n.hydrate = !1), Ms(n.containerInfo));
            return;
        case 12:
            return;
        case 13:
            t.memoizedState !== null && ((xi = ne()), Du(t.child, !0)), Bu(t);
            return;
        case 19:
            Bu(t);
            return;
        case 17:
            return;
        case 23:
        case 24:
            Du(t, t.memoizedState !== null);
            return;
    }
    throw Error(v(163));
}
function Bu(e) {
    var t = e.updateQueue;
    if (t !== null) {
        e.updateQueue = null;
        var n = e.stateNode;
        n === null && (n = e.stateNode = new $f()),
            t.forEach(function (r) {
                var l = ed.bind(null, e, r);
                n.has(r) || (n.add(r), r.then(l, l));
            });
    }
}
function Hf(e, t) {
    return e !== null && ((e = e.memoizedState), e === null || e.dehydrated !== null)
        ? ((t = t.memoizedState), t !== null && t.dehydrated === null)
        : !1;
}
var Qf = Math.ceil,
    qr = _t.ReactCurrentDispatcher,
    yi = _t.ReactCurrentOwner,
    z = 0,
    oe = null,
    K = null,
    re = 0,
    St = 0,
    xo = it(0),
    q = 0,
    pl = null,
    rn = 0,
    lr = 0,
    ln = 0,
    wi = 0,
    ko = null,
    xi = 0,
    So = 1 / 0;
function on() {
    So = ne() + 500;
}
var C = null,
    el = !1,
    Eo = null,
    Pe = null,
    lt = !1,
    Dn = null,
    Pn = 90,
    Co = [],
    _o = [],
    De = null,
    Un = 0,
    Po = null,
    Tr = -1,
    je = 0,
    Lr = 0,
    Vn = null,
    zr = !1;
function fe() {
    return (z & 48) !== 0 ? ne() : Tr !== -1 ? Tr : (Tr = ne());
}
function Je(e) {
    if (((e = e.mode), (e & 2) === 0)) return 1;
    if ((e & 4) === 0) return bt() === 99 ? 1 : 2;
    if ((je === 0 && (je = rn), Of.transition !== 0)) {
        Lr !== 0 && (Lr = ko !== null ? ko.pendingLanes : 0), (e = je);
        var t = 4186112 & ~Lr;
        return (t &= -t), t === 0 && ((e = 4186112 & ~e), (t = e & -e), t === 0 && (t = 8192)), t;
    }
    return (
        (e = bt()), (z & 4) !== 0 && e === 98 ? (e = Dr(12, je)) : ((e = jc(e)), (e = Dr(e, je))), e
    );
}
function qe(e, t, n) {
    if (50 < Un) throw ((Un = 0), (Po = null), Error(v(185)));
    if (((e = ml(e, t)), e === null)) return null;
    il(e, t, n), e === oe && ((ln |= t), q === 4 && Gt(e, re));
    var r = bt();
    t === 1
        ? (z & 8) !== 0 && (z & 48) === 0
            ? No(e)
            : (ve(e, n), z === 0 && (on(), Le()))
        : ((z & 4) === 0 ||
              (r !== 98 && r !== 99) ||
              (De === null ? (De = new Set([e])) : De.add(e)),
          ve(e, n)),
        (ko = e);
}
function ml(e, t) {
    e.lanes |= t;
    var n = e.alternate;
    for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; )
        (e.childLanes |= t),
            (n = e.alternate),
            n !== null && (n.childLanes |= t),
            (n = e),
            (e = e.return);
    return n.tag === 3 ? n.stateNode : null;
}
function ve(e, t) {
    for (
        var n = e.callbackNode,
            r = e.suspendedLanes,
            l = e.pingedLanes,
            o = e.expirationTimes,
            i = e.pendingLanes;
        0 < i;

    ) {
        var u = 31 - nt(i),
            s = 1 << u,
            f = o[u];
        if (f === -1) {
            if ((s & r) === 0 || (s & l) !== 0) {
                (f = t), Rt(s);
                var g = D;
                o[u] = 10 <= g ? f + 250 : 6 <= g ? f + 5e3 : -1;
            }
        } else f <= t && (e.expiredLanes |= s);
        i &= ~s;
    }
    if (((r = Qn(e, e === oe ? re : 0)), (t = D), r === 0))
        n !== null && (n !== Ol && uo(n), (e.callbackNode = null), (e.callbackPriority = 0));
    else {
        if (n !== null) {
            if (e.callbackPriority === t) return;
            n !== Ol && uo(n);
        }
        t === 15
            ? ((n = No.bind(null, e)),
              Me === null ? ((Me = [n]), (Nr = ii(fl, sa))) : Me.push(n),
              (n = Ol))
            : t === 14
              ? (n = Xn(99, No.bind(null, e)))
              : ((n = Ic(t)), (n = Xn(n, Ra.bind(null, e)))),
            (e.callbackPriority = t),
            (e.callbackNode = n);
    }
}
function Ra(e) {
    if (((Tr = -1), (Lr = je = 0), (z & 48) !== 0)) throw Error(v(327));
    var t = e.callbackNode;
    if (ut() && e.callbackNode !== t) return null;
    var n = Qn(e, e === oe ? re : 0);
    if (n === 0) return null;
    var r = n,
        l = z;
    z |= 16;
    var o = Ia();
    (oe !== e || re !== r) && (on(), Yt(e, r));
    do
        try {
            Kf();
            break;
        } catch (u) {
            ja(e, u);
        }
    while (1);
    if (
        (ui(),
        (qr.current = o),
        (z = l),
        K !== null ? (r = 0) : ((oe = null), (re = 0), (r = q)),
        (rn & ln) !== 0)
    )
        Yt(e, 0);
    else if (r !== 0) {
        if (
            (r === 2 &&
                ((z |= 64),
                e.hydrate && ((e.hydrate = !1), li(e.containerInfo)),
                (n = As(e)),
                n !== 0 && (r = Nn(e, n))),
            r === 1)
        )
            throw ((t = pl), Yt(e, 0), Gt(e, n), ve(e, ne()), t);
        switch (((e.finishedWork = e.current.alternate), (e.finishedLanes = n), r)) {
            case 0:
            case 1:
                throw Error(v(345));
            case 2:
                dt(e);
                break;
            case 3:
                if ((Gt(e, n), (n & 62914560) === n && ((r = xi + 500 - ne()), 10 < r))) {
                    if (Qn(e, 0) !== 0) break;
                    if (((l = e.suspendedLanes), (l & n) !== n)) {
                        fe(), (e.pingedLanes |= e.suspendedLanes & l);
                        break;
                    }
                    e.timeoutHandle = au(dt.bind(null, e), r);
                    break;
                }
                dt(e);
                break;
            case 4:
                if ((Gt(e, n), (n & 4186112) === n)) break;
                for (r = e.eventTimes, l = -1; 0 < n; ) {
                    var i = 31 - nt(n);
                    (o = 1 << i), (i = r[i]), i > l && (l = i), (n &= ~o);
                }
                if (
                    ((n = l),
                    (n = ne() - n),
                    (n =
                        (120 > n
                            ? 120
                            : 480 > n
                              ? 480
                              : 1080 > n
                                ? 1080
                                : 1920 > n
                                  ? 1920
                                  : 3e3 > n
                                    ? 3e3
                                    : 4320 > n
                                      ? 4320
                                      : 1960 * Qf(n / 1960)) - n),
                    10 < n)
                ) {
                    e.timeoutHandle = au(dt.bind(null, e), n);
                    break;
                }
                dt(e);
                break;
            case 5:
                dt(e);
                break;
            default:
                throw Error(v(329));
        }
    }
    return ve(e, ne()), e.callbackNode === t ? Ra.bind(null, e) : null;
}
function Gt(e, t) {
    for (
        t &= ~wi, t &= ~ln, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes;
        0 < t;

    ) {
        var n = 31 - nt(t),
            r = 1 << n;
        (e[n] = -1), (t &= ~r);
    }
}
function No(e) {
    if ((z & 48) !== 0) throw Error(v(327));
    if ((ut(), e === oe && (e.expiredLanes & re) !== 0)) {
        var t = re,
            n = Nn(e, t);
        (rn & ln) !== 0 && ((t = Qn(e, t)), (n = Nn(e, t)));
    } else (t = Qn(e, 0)), (n = Nn(e, t));
    if (
        (e.tag !== 0 &&
            n === 2 &&
            ((z |= 64),
            e.hydrate && ((e.hydrate = !1), li(e.containerInfo)),
            (t = As(e)),
            t !== 0 && (n = Nn(e, t))),
        n === 1)
    )
        throw ((n = pl), Yt(e, 0), Gt(e, t), ve(e, ne()), n);
    return (e.finishedWork = e.current.alternate), (e.finishedLanes = t), dt(e), ve(e, ne()), null;
}
function Gf() {
    if (De !== null) {
        var e = De;
        (De = null),
            e.forEach(function (t) {
                (t.expiredLanes |= 24 & t.pendingLanes), ve(t, ne());
            });
    }
    Le();
}
function Oa(e, t) {
    var n = z;
    z |= 1;
    try {
        return e(t);
    } finally {
        (z = n), z === 0 && (on(), Le());
    }
}
function Ma(e, t) {
    var n = z;
    (z &= -2), (z |= 8);
    try {
        return e(t);
    } finally {
        (z = n), z === 0 && (on(), Le());
    }
}
function yr(e, t) {
    W(xo, St), (St |= t), (rn |= t);
}
function ki() {
    (St = xo.current), A(xo);
}
function Yt(e, t) {
    (e.finishedWork = null), (e.finishedLanes = 0);
    var n = e.timeoutHandle;
    if ((n !== -1 && ((e.timeoutHandle = -1), Pf(n)), K !== null))
        for (n = K.return; n !== null; ) {
            var r = n;
            switch (r.tag) {
                case 1:
                    (r = r.type.childContextTypes), r != null && $r();
                    break;
                case 3:
                    Jt(), A(ae), A(le), fi();
                    break;
                case 5:
                    ci(r);
                    break;
                case 4:
                    Jt();
                    break;
                case 13:
                    A(B);
                    break;
                case 19:
                    A(B);
                    break;
                case 10:
                    si(r);
                    break;
                case 23:
                case 24:
                    ki();
            }
            n = n.return;
        }
    (oe = e),
        (K = ot(e.current, null)),
        (re = St = rn = t),
        (q = 0),
        (pl = null),
        (wi = ln = lr = 0);
}
function ja(e, t) {
    do {
        var n = K;
        try {
            if ((ui(), (In.current = Jr), Kr)) {
                for (var r = G.memoizedState; r !== null; ) {
                    var l = r.queue;
                    l !== null && (l.pending = null), (r = r.next);
                }
                Kr = !1;
            }
            if (
                ((qn = 0),
                (J = te = G = null),
                (Fn = !1),
                (yi.current = null),
                n === null || n.return === null)
            ) {
                (q = 1), (pl = t), (K = null);
                break;
            }
            e: {
                var o = e,
                    i = n.return,
                    u = n,
                    s = t;
                if (
                    ((t = re),
                    (u.flags |= 2048),
                    (u.firstEffect = u.lastEffect = null),
                    s !== null && typeof s == 'object' && typeof s.then == 'function')
                ) {
                    var f = s;
                    if ((u.mode & 2) === 0) {
                        var g = u.alternate;
                        g
                            ? ((u.updateQueue = g.updateQueue),
                              (u.memoizedState = g.memoizedState),
                              (u.lanes = g.lanes))
                            : ((u.updateQueue = null), (u.memoizedState = null));
                    }
                    var E = (B.current & 1) !== 0,
                        m = i;
                    do {
                        var S;
                        if ((S = m.tag === 13)) {
                            var x = m.memoizedState;
                            if (x !== null) S = x.dehydrated !== null;
                            else {
                                var y = m.memoizedProps;
                                S =
                                    y.fallback === void 0
                                        ? !1
                                        : y.unstable_avoidThisFallback !== !0
                                          ? !0
                                          : !E;
                            }
                        }
                        if (S) {
                            var c = m.updateQueue;
                            if (c === null) {
                                var a = new Set();
                                a.add(f), (m.updateQueue = a);
                            } else c.add(f);
                            if ((m.mode & 2) === 0) {
                                if (
                                    ((m.flags |= 64),
                                    (u.flags |= 16384),
                                    (u.flags &= -2981),
                                    u.tag === 1)
                                )
                                    if (u.alternate === null) u.tag = 17;
                                    else {
                                        var d = Ze(-1, 1);
                                        (d.tag = 2), be(u, d);
                                    }
                                u.lanes |= 1;
                                break e;
                            }
                            (s = void 0), (u = t);
                            var p = o.pingCache;
                            if (
                                (p === null
                                    ? ((p = o.pingCache = new Af()), (s = new Set()), p.set(f, s))
                                    : ((s = p.get(f)),
                                      s === void 0 && ((s = new Set()), p.set(f, s))),
                                !s.has(u))
                            ) {
                                s.add(u);
                                var h = qf.bind(null, o, f, u);
                                f.then(h, h);
                            }
                            (m.flags |= 4096), (m.lanes = t);
                            break e;
                        }
                        m = m.return;
                    } while (m !== null);
                    s = Error(
                        (Vt(u.type) || 'A React component') +
                            ` suspended while rendering, but no fallback UI was specified.

Add a <Suspense fallback=...> component higher in the tree to provide a loading indicator or placeholder to display.`,
                    );
                }
                q !== 5 && (q = 2), (s = vi(s, u)), (m = i);
                do {
                    switch (m.tag) {
                        case 3:
                            (o = s), (m.flags |= 4096), (t &= -t), (m.lanes |= t);
                            var P = Ta(m, o, t);
                            gu(m, P);
                            break e;
                        case 1:
                            o = s;
                            var w = m.type,
                                N = m.stateNode;
                            if (
                                (m.flags & 64) === 0 &&
                                (typeof w.getDerivedStateFromError == 'function' ||
                                    (N !== null &&
                                        typeof N.componentDidCatch == 'function' &&
                                        (Pe === null || !Pe.has(N))))
                            ) {
                                (m.flags |= 4096), (t &= -t), (m.lanes |= t);
                                var L = La(m, o, t);
                                gu(m, L);
                                break e;
                            }
                    }
                    m = m.return;
                } while (m !== null);
            }
            Da(n);
        } catch (_) {
            (t = _), K === n && n !== null && (K = n = n.return);
            continue;
        }
        break;
    } while (1);
}
function Ia() {
    var e = qr.current;
    return (qr.current = Jr), e === null ? Jr : e;
}
function Nn(e, t) {
    var n = z;
    z |= 16;
    var r = Ia();
    (oe === e && re === t) || Yt(e, t);
    do
        try {
            Yf();
            break;
        } catch (l) {
            ja(e, l);
        }
    while (1);
    if ((ui(), (z = n), (qr.current = r), K !== null)) throw Error(v(261));
    return (oe = null), (re = 0), q;
}
function Yf() {
    for (; K !== null; ) Fa(K);
}
function Kf() {
    for (; K !== null && !Lf(); ) Fa(K);
}
function Fa(e) {
    var t = Va(e.alternate, e, St);
    (e.memoizedProps = e.pendingProps), t === null ? Da(e) : (K = t), (yi.current = null);
}
function Da(e) {
    var t = e;
    do {
        var n = t.alternate;
        if (((e = t.return), (t.flags & 2048) === 0)) {
            if (((n = Uf(n, t, St)), n !== null)) {
                K = n;
                return;
            }
            if (
                ((n = t),
                (n.tag !== 24 && n.tag !== 23) ||
                    n.memoizedState === null ||
                    (St & 1073741824) !== 0 ||
                    (n.mode & 4) === 0)
            ) {
                for (var r = 0, l = n.child; l !== null; )
                    (r |= l.lanes | l.childLanes), (l = l.sibling);
                n.childLanes = r;
            }
            e !== null &&
                (e.flags & 2048) === 0 &&
                (e.firstEffect === null && (e.firstEffect = t.firstEffect),
                t.lastEffect !== null &&
                    (e.lastEffect !== null && (e.lastEffect.nextEffect = t.firstEffect),
                    (e.lastEffect = t.lastEffect)),
                1 < t.flags &&
                    (e.lastEffect !== null ? (e.lastEffect.nextEffect = t) : (e.firstEffect = t),
                    (e.lastEffect = t)));
        } else {
            if (((n = Vf(t)), n !== null)) {
                (n.flags &= 2047), (K = n);
                return;
            }
            e !== null && ((e.firstEffect = e.lastEffect = null), (e.flags |= 2048));
        }
        if (((t = t.sibling), t !== null)) {
            K = t;
            return;
        }
        K = t = e;
    } while (t !== null);
    q === 0 && (q = 5);
}
function dt(e) {
    var t = bt();
    return kt(99, Xf.bind(null, e, t)), null;
}
function Xf(e, t) {
    do ut();
    while (Dn !== null);
    if ((z & 48) !== 0) throw Error(v(327));
    var n = e.finishedWork;
    if (n === null) return null;
    if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current)) throw Error(v(177));
    e.callbackNode = null;
    var r = n.lanes | n.childLanes,
        l = r,
        o = e.pendingLanes & ~l;
    (e.pendingLanes = l),
        (e.suspendedLanes = 0),
        (e.pingedLanes = 0),
        (e.expiredLanes &= l),
        (e.mutableReadLanes &= l),
        (e.entangledLanes &= l),
        (l = e.entanglements);
    for (var i = e.eventTimes, u = e.expirationTimes; 0 < o; ) {
        var s = 31 - nt(o),
            f = 1 << s;
        (l[s] = 0), (i[s] = -1), (u[s] = -1), (o &= ~f);
    }
    if (
        (De !== null && (r & 24) === 0 && De.has(e) && De.delete(e),
        e === oe && ((K = oe = null), (re = 0)),
        1 < n.flags
            ? n.lastEffect !== null
                ? ((n.lastEffect.nextEffect = n), (r = n.firstEffect))
                : (r = n)
            : (r = n.firstEffect),
        r !== null)
    ) {
        if (((l = z), (z |= 32), (yi.current = null), (Ll = Er), (i = nu()), no(i))) {
            if ('selectionStart' in i) u = { start: i.selectionStart, end: i.selectionEnd };
            else
                e: if (
                    ((u = ((u = i.ownerDocument) && u.defaultView) || window),
                    (f = u.getSelection && u.getSelection()) && f.rangeCount !== 0)
                ) {
                    (u = f.anchorNode),
                        (o = f.anchorOffset),
                        (s = f.focusNode),
                        (f = f.focusOffset);
                    try {
                        u.nodeType, s.nodeType;
                    } catch {
                        u = null;
                        break e;
                    }
                    var g = 0,
                        E = -1,
                        m = -1,
                        S = 0,
                        x = 0,
                        y = i,
                        c = null;
                    t: for (;;) {
                        for (
                            var a;
                            y !== u || (o !== 0 && y.nodeType !== 3) || (E = g + o),
                                y !== s || (f !== 0 && y.nodeType !== 3) || (m = g + f),
                                y.nodeType === 3 && (g += y.nodeValue.length),
                                (a = y.firstChild) !== null;

                        )
                            (c = y), (y = a);
                        for (;;) {
                            if (y === i) break t;
                            if (
                                (c === u && ++S === o && (E = g),
                                c === s && ++x === f && (m = g),
                                (a = y.nextSibling) !== null)
                            )
                                break;
                            (y = c), (c = y.parentNode);
                        }
                        y = a;
                    }
                    u = E === -1 || m === -1 ? null : { start: E, end: m };
                } else u = null;
            u = u || { start: 0, end: 0 };
        } else u = null;
        (zl = { focusedElem: i, selectionRange: u }), (Er = !1), (Vn = null), (zr = !1), (C = r);
        do
            try {
                Zf();
            } catch (_) {
                if (C === null) throw Error(v(330));
                et(C, _), (C = C.nextEffect);
            }
        while (C !== null);
        (Vn = null), (C = r);
        do
            try {
                for (i = e; C !== null; ) {
                    var d = C.flags;
                    if ((d & 16 && $n(C.stateNode, ''), d & 128)) {
                        var p = C.alternate;
                        if (p !== null) {
                            var h = p.ref;
                            h !== null && (typeof h == 'function' ? h(null) : (h.current = null));
                        }
                    }
                    switch (d & 1038) {
                        case 2:
                            $u(C), (C.flags &= -3);
                            break;
                        case 6:
                            $u(C), (C.flags &= -3), Dl(C.alternate, C);
                            break;
                        case 1024:
                            C.flags &= -1025;
                            break;
                        case 1028:
                            (C.flags &= -1025), Dl(C.alternate, C);
                            break;
                        case 4:
                            Dl(C.alternate, C);
                            break;
                        case 8:
                            (u = C), za(i, u);
                            var P = u.alternate;
                            Vu(u), P !== null && Vu(P);
                    }
                    C = C.nextEffect;
                }
            } catch (_) {
                if (C === null) throw Error(v(330));
                et(C, _), (C = C.nextEffect);
            }
        while (C !== null);
        if (
            ((h = zl),
            (p = nu()),
            (d = h.focusedElem),
            (i = h.selectionRange),
            p !== d && d && d.ownerDocument && Ks(d.ownerDocument.documentElement, d))
        ) {
            for (
                i !== null &&
                    no(d) &&
                    ((p = i.start),
                    (h = i.end),
                    h === void 0 && (h = p),
                    ('selectionStart' in d)
                        ? ((d.selectionStart = p), (d.selectionEnd = Math.min(h, d.value.length)))
                        : ((h = ((p = d.ownerDocument || document) && p.defaultView) || window),
                          h.getSelection &&
                              ((h = h.getSelection()),
                              (u = d.textContent.length),
                              (P = Math.min(i.start, u)),
                              (i = i.end === void 0 ? P : Math.min(i.end, u)),
                              !h.extend && P > i && ((u = i), (i = P), (P = u)),
                              (u = tu(d, P)),
                              (o = tu(d, i)),
                              u &&
                                  o &&
                                  (h.rangeCount !== 1 ||
                                      h.anchorNode !== u.node ||
                                      h.anchorOffset !== u.offset ||
                                      h.focusNode !== o.node ||
                                      h.focusOffset !== o.offset) &&
                                  ((p = p.createRange()),
                                  p.setStart(u.node, u.offset),
                                  h.removeAllRanges(),
                                  P > i
                                      ? (h.addRange(p), h.extend(o.node, o.offset))
                                      : (p.setEnd(o.node, o.offset), h.addRange(p)))))),
                    p = [],
                    h = d;
                (h = h.parentNode);

            )
                h.nodeType === 1 &&
                    p.push({
                        element: h,
                        left: h.scrollLeft,
                        top: h.scrollTop,
                    });
            for (typeof d.focus == 'function' && d.focus(), d = 0; d < p.length; d++)
                (h = p[d]), (h.element.scrollLeft = h.left), (h.element.scrollTop = h.top);
        }
        (Er = !!Ll), (zl = Ll = null), (e.current = n), (C = r);
        do
            try {
                for (d = e; C !== null; ) {
                    var w = C.flags;
                    if ((w & 36 && Wf(d, C.alternate, C), w & 128)) {
                        p = void 0;
                        var N = C.ref;
                        if (N !== null) {
                            var L = C.stateNode;
                            switch (C.tag) {
                                case 5:
                                    p = L;
                                    break;
                                default:
                                    p = L;
                            }
                            typeof N == 'function' ? N(p) : (N.current = p);
                        }
                    }
                    C = C.nextEffect;
                }
            } catch (_) {
                if (C === null) throw Error(v(330));
                et(C, _), (C = C.nextEffect);
            }
        while (C !== null);
        (C = null), Rf(), (z = l);
    } else e.current = n;
    if (lt) (lt = !1), (Dn = e), (Pn = t);
    else
        for (C = r; C !== null; )
            (t = C.nextEffect),
                (C.nextEffect = null),
                C.flags & 8 && ((w = C), (w.sibling = null), (w.stateNode = null)),
                (C = t);
    if (
        ((r = e.pendingLanes),
        r === 0 && (Pe = null),
        r === 1 ? (e === Po ? Un++ : ((Un = 0), (Po = e))) : (Un = 0),
        (n = n.stateNode),
        wt && typeof wt.onCommitFiberRoot == 'function')
    )
        try {
            wt.onCommitFiberRoot(oi, n, void 0, (n.current.flags & 64) === 64);
        } catch {}
    if ((ve(e, ne()), el)) throw ((el = !1), (e = Eo), (Eo = null), e);
    return (z & 8) !== 0 || Le(), null;
}
function Zf() {
    for (; C !== null; ) {
        var e = C.alternate;
        zr ||
            Vn === null ||
            ((C.flags & 8) !== 0
                ? $i(C, Vn) && (zr = !0)
                : C.tag === 13 && Hf(e, C) && $i(C, Vn) && (zr = !0));
        var t = C.flags;
        (t & 256) !== 0 && Bf(e, C),
            (t & 512) === 0 ||
                lt ||
                ((lt = !0),
                Xn(97, function () {
                    return ut(), null;
                })),
            (C = C.nextEffect);
    }
}
function ut() {
    if (Pn !== 90) {
        var e = 97 < Pn ? 97 : Pn;
        return (Pn = 90), kt(e, Jf);
    }
    return !1;
}
function bf(e, t) {
    Co.push(t, e),
        lt ||
            ((lt = !0),
            Xn(97, function () {
                return ut(), null;
            }));
}
function Ua(e, t) {
    _o.push(t, e),
        lt ||
            ((lt = !0),
            Xn(97, function () {
                return ut(), null;
            }));
}
function Jf() {
    if (Dn === null) return !1;
    var e = Dn;
    if (((Dn = null), (z & 48) !== 0)) throw Error(v(331));
    var t = z;
    z |= 32;
    var n = _o;
    _o = [];
    for (var r = 0; r < n.length; r += 2) {
        var l = n[r],
            o = n[r + 1],
            i = l.destroy;
        if (((l.destroy = void 0), typeof i == 'function'))
            try {
                i();
            } catch (s) {
                if (o === null) throw Error(v(330));
                et(o, s);
            }
    }
    for (n = Co, Co = [], r = 0; r < n.length; r += 2) {
        (l = n[r]), (o = n[r + 1]);
        try {
            var u = l.create;
            l.destroy = u();
        } catch (s) {
            if (o === null) throw Error(v(330));
            et(o, s);
        }
    }
    for (u = e.current.firstEffect; u !== null; )
        (e = u.nextEffect),
            (u.nextEffect = null),
            u.flags & 8 && ((u.sibling = null), (u.stateNode = null)),
            (u = e);
    return (z = t), Le(), !0;
}
function Wu(e, t, n) {
    (t = vi(n, t)),
        (t = Ta(e, t, 1)),
        be(e, t),
        (t = fe()),
        (e = ml(e, 1)),
        e !== null && (il(e, 1, t), ve(e, t));
}
function et(e, t) {
    if (e.tag === 3) Wu(e, e, t);
    else
        for (var n = e.return; n !== null; ) {
            if (n.tag === 3) {
                Wu(n, e, t);
                break;
            } else if (n.tag === 1) {
                var r = n.stateNode;
                if (
                    typeof n.type.getDerivedStateFromError == 'function' ||
                    (typeof r.componentDidCatch == 'function' && (Pe === null || !Pe.has(r)))
                ) {
                    e = vi(t, e);
                    var l = La(n, e, 1);
                    if ((be(n, l), (l = fe()), (n = ml(n, 1)), n !== null)) il(n, 1, l), ve(n, l);
                    else if (
                        typeof r.componentDidCatch == 'function' &&
                        (Pe === null || !Pe.has(r))
                    )
                        try {
                            r.componentDidCatch(t, e);
                        } catch {}
                    break;
                }
            }
            n = n.return;
        }
}
function qf(e, t, n) {
    var r = e.pingCache;
    r !== null && r.delete(t),
        (t = fe()),
        (e.pingedLanes |= e.suspendedLanes & n),
        oe === e &&
            (re & n) === n &&
            (q === 4 || (q === 3 && (re & 62914560) === re && 500 > ne() - xi)
                ? Yt(e, 0)
                : (wi |= n)),
        ve(e, t);
}
function ed(e, t) {
    var n = e.stateNode;
    n !== null && n.delete(t),
        (t = 0),
        t === 0 &&
            ((t = e.mode),
            (t & 2) === 0
                ? (t = 1)
                : (t & 4) === 0
                  ? (t = bt() === 99 ? 1 : 2)
                  : (je === 0 && (je = rn), (t = Ot(62914560 & ~je)), t === 0 && (t = 4194304))),
        (n = fe()),
        (e = ml(e, t)),
        e !== null && (il(e, t, n), ve(e, n));
}
var Va;
Va = function (e, t, n) {
    var r = t.lanes;
    if (e !== null)
        if (e.memoizedProps !== t.pendingProps || ae.current) ke = !0;
        else if ((n & r) !== 0) ke = (e.flags & 16384) !== 0;
        else {
            switch (((ke = !1), t.tag)) {
                case 3:
                    Lu(t), jl();
                    break;
                case 5:
                    xu(t);
                    break;
                case 1:
                    ce(t.type) && Pr(t);
                    break;
                case 4:
                    co(t, t.stateNode.containerInfo);
                    break;
                case 10:
                    r = t.memoizedProps.value;
                    var l = t.type._context;
                    W(Br, l._currentValue), (l._currentValue = r);
                    break;
                case 13:
                    if (t.memoizedState !== null)
                        return (n & t.child.childLanes) !== 0
                            ? zu(e, t, n)
                            : (W(B, B.current & 1),
                              (t = Fe(e, t, n)),
                              t !== null ? t.sibling : null);
                    W(B, B.current & 1);
                    break;
                case 19:
                    if (((r = (n & t.childLanes) !== 0), (e.flags & 64) !== 0)) {
                        if (r) return Iu(e, t, n);
                        t.flags |= 64;
                    }
                    if (
                        ((l = t.memoizedState),
                        l !== null &&
                            ((l.rendering = null), (l.tail = null), (l.lastEffect = null)),
                        W(B, B.current),
                        r)
                    )
                        break;
                    return null;
                case 23:
                case 24:
                    return (t.lanes = 0), Il(e, t, n);
            }
            return Fe(e, t, n);
        }
    else ke = !1;
    switch (((t.lanes = 0), t.tag)) {
        case 2:
            if (
                ((r = t.type),
                e !== null && ((e.alternate = null), (t.alternate = null), (t.flags |= 2)),
                (e = t.pendingProps),
                (l = Zt(t, le.current)),
                Ht(t, n),
                (l = pi(null, t, r, e, l, n)),
                (t.flags |= 1),
                typeof l == 'object' &&
                    l !== null &&
                    typeof l.render == 'function' &&
                    l.$$typeof === void 0)
            ) {
                if (((t.tag = 1), (t.memoizedState = null), (t.updateQueue = null), ce(r))) {
                    var o = !0;
                    Pr(t);
                } else o = !1;
                (t.memoizedState = l.state !== null && l.state !== void 0 ? l.state : null), ai(t);
                var i = r.getDerivedStateFromProps;
                typeof i == 'function' && Qr(t, r, i, e),
                    (l.updater = dl),
                    (t.stateNode = l),
                    (l._reactInternals = t),
                    ao(t, r, e, n),
                    (t = ho(null, t, r, !0, o, n));
            } else (t.tag = 0), se(null, t, l, n), (t = t.child);
            return t;
        case 16:
            l = t.elementType;
            e: {
                switch (
                    (e !== null && ((e.alternate = null), (t.alternate = null), (t.flags |= 2)),
                    (e = t.pendingProps),
                    (o = l._init),
                    (l = o(l._payload)),
                    (t.type = l),
                    (o = t.tag = nd(l)),
                    (e = xe(l, e)),
                    o)
                ) {
                    case 0:
                        t = mo(null, t, l, e, n);
                        break e;
                    case 1:
                        t = Tu(null, t, l, e, n);
                        break e;
                    case 11:
                        t = Pu(null, t, l, e, n);
                        break e;
                    case 14:
                        t = Nu(null, t, l, xe(l.type, e), r, n);
                        break e;
                }
                throw Error(v(306, l, ''));
            }
            return t;
        case 0:
            return (
                (r = t.type),
                (l = t.pendingProps),
                (l = t.elementType === r ? l : xe(r, l)),
                mo(e, t, r, l, n)
            );
        case 1:
            return (
                (r = t.type),
                (l = t.pendingProps),
                (l = t.elementType === r ? l : xe(r, l)),
                Tu(e, t, r, l, n)
            );
        case 3:
            if ((Lu(t), (r = t.updateQueue), e === null || r === null)) throw Error(v(282));
            if (
                ((r = t.pendingProps),
                (l = t.memoizedState),
                (l = l !== null ? l.element : null),
                ca(e, t),
                Zn(t, r, null, n),
                (r = t.memoizedState.element),
                r === l)
            )
                jl(), (t = Fe(e, t, n));
            else {
                if (
                    ((l = t.stateNode),
                    (o = l.hydrate) &&
                        ((Ge = Wt(t.stateNode.containerInfo.firstChild)), (Ie = t), (o = Te = !0)),
                    o)
                ) {
                    if (((e = l.mutableSourceEagerHydrationData), e != null))
                        for (l = 0; l < e.length; l += 2)
                            (o = e[l]), (o._workInProgressVersionPrimary = e[l + 1]), Qt.push(o);
                    for (n = ma(t, null, r, n), t.child = n; n; )
                        (n.flags = (n.flags & -3) | 1024), (n = n.sibling);
                } else se(e, t, r, n), jl();
                t = t.child;
            }
            return t;
        case 5:
            return (
                xu(t),
                e === null && fo(t),
                (r = t.type),
                (l = t.pendingProps),
                (o = e !== null ? e.memoizedProps : null),
                (i = l.children),
                oo(r, l) ? (i = null) : o !== null && oo(r, o) && (t.flags |= 16),
                Ca(e, t),
                se(e, t, i, n),
                t.child
            );
        case 6:
            return e === null && fo(t), null;
        case 13:
            return zu(e, t, n);
        case 4:
            return (
                co(t, t.stateNode.containerInfo),
                (r = t.pendingProps),
                e === null ? (t.child = Gr(t, null, r, n)) : se(e, t, r, n),
                t.child
            );
        case 11:
            return (
                (r = t.type),
                (l = t.pendingProps),
                (l = t.elementType === r ? l : xe(r, l)),
                Pu(e, t, r, l, n)
            );
        case 7:
            return se(e, t, t.pendingProps, n), t.child;
        case 8:
            return se(e, t, t.pendingProps.children, n), t.child;
        case 12:
            return se(e, t, t.pendingProps.children, n), t.child;
        case 10:
            e: {
                (r = t.type._context), (l = t.pendingProps), (i = t.memoizedProps), (o = l.value);
                var u = t.type._context;
                if ((W(Br, u._currentValue), (u._currentValue = o), i !== null))
                    if (
                        ((u = i.value),
                        (o = pe(u, o)
                            ? 0
                            : (typeof r._calculateChangedBits == 'function'
                                  ? r._calculateChangedBits(u, o)
                                  : 1073741823) | 0),
                        o === 0)
                    ) {
                        if (i.children === l.children && !ae.current) {
                            t = Fe(e, t, n);
                            break e;
                        }
                    } else
                        for (u = t.child, u !== null && (u.return = t); u !== null; ) {
                            var s = u.dependencies;
                            if (s !== null) {
                                i = u.child;
                                for (var f = s.firstContext; f !== null; ) {
                                    if (f.context === r && (f.observedBits & o) !== 0) {
                                        u.tag === 1 &&
                                            ((f = Ze(-1, n & -n)), (f.tag = 2), be(u, f)),
                                            (u.lanes |= n),
                                            (f = u.alternate),
                                            f !== null && (f.lanes |= n),
                                            aa(u.return, n),
                                            (s.lanes |= n);
                                        break;
                                    }
                                    f = f.next;
                                }
                            } else i = u.tag === 10 && u.type === t.type ? null : u.child;
                            if (i !== null) i.return = u;
                            else
                                for (i = u; i !== null; ) {
                                    if (i === t) {
                                        i = null;
                                        break;
                                    }
                                    if (((u = i.sibling), u !== null)) {
                                        (u.return = i.return), (i = u);
                                        break;
                                    }
                                    i = i.return;
                                }
                            u = i;
                        }
                se(e, t, l.children, n), (t = t.child);
            }
            return t;
        case 9:
            return (
                (l = t.type),
                (o = t.pendingProps),
                (r = o.children),
                Ht(t, n),
                (l = ge(l, o.unstable_observedBits)),
                (r = r(l)),
                (t.flags |= 1),
                se(e, t, r, n),
                t.child
            );
        case 14:
            return (
                (l = t.type), (o = xe(l, t.pendingProps)), (o = xe(l.type, o)), Nu(e, t, l, o, r, n)
            );
        case 15:
            return Ea(e, t, t.type, t.pendingProps, r, n);
        case 17:
            return (
                (r = t.type),
                (l = t.pendingProps),
                (l = t.elementType === r ? l : xe(r, l)),
                e !== null && ((e.alternate = null), (t.alternate = null), (t.flags |= 2)),
                (t.tag = 1),
                ce(r) ? ((e = !0), Pr(t)) : (e = !1),
                Ht(t, n),
                da(t, r, l),
                ao(t, r, l, n),
                ho(null, t, r, !0, e, n)
            );
        case 19:
            return Iu(e, t, n);
        case 23:
            return Il(e, t, n);
        case 24:
            return Il(e, t, n);
    }
    throw Error(v(156, t.tag));
};
function td(e, t, n, r) {
    (this.tag = e),
        (this.key = n),
        (this.sibling =
            this.child =
            this.return =
            this.stateNode =
            this.type =
            this.elementType =
                null),
        (this.index = 0),
        (this.ref = null),
        (this.pendingProps = t),
        (this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
        (this.mode = r),
        (this.flags = 0),
        (this.lastEffect = this.firstEffect = this.nextEffect = null),
        (this.childLanes = this.lanes = 0),
        (this.alternate = null);
}
function me(e, t, n, r) {
    return new td(e, t, n, r);
}
function Si(e) {
    return (e = e.prototype), !(!e || !e.isReactComponent);
}
function nd(e) {
    if (typeof e == 'function') return Si(e) ? 1 : 0;
    if (e != null) {
        if (((e = e.$$typeof), e === rl)) return 11;
        if (e === ll) return 14;
    }
    return 2;
}
function ot(e, t) {
    var n = e.alternate;
    return (
        n === null
            ? ((n = me(e.tag, t, e.key, e.mode)),
              (n.elementType = e.elementType),
              (n.type = e.type),
              (n.stateNode = e.stateNode),
              (n.alternate = e),
              (e.alternate = n))
            : ((n.pendingProps = t),
              (n.type = e.type),
              (n.flags = 0),
              (n.nextEffect = null),
              (n.firstEffect = null),
              (n.lastEffect = null)),
        (n.childLanes = e.childLanes),
        (n.lanes = e.lanes),
        (n.child = e.child),
        (n.memoizedProps = e.memoizedProps),
        (n.memoizedState = e.memoizedState),
        (n.updateQueue = e.updateQueue),
        (t = e.dependencies),
        (n.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
        (n.sibling = e.sibling),
        (n.index = e.index),
        (n.ref = e.ref),
        n
    );
}
function Rr(e, t, n, r, l, o) {
    var i = 2;
    if (((r = e), typeof e == 'function')) Si(e) && (i = 1);
    else if (typeof e == 'string') i = 5;
    else
        e: switch (e) {
            case We:
                return Kt(n.children, l, o, t);
            case hs:
                (i = 8), (l |= 16);
                break;
            case Uo:
                (i = 8), (l |= 1);
                break;
            case Tn:
                return (
                    (e = me(12, n, t, l | 8)), (e.elementType = Tn), (e.type = Tn), (e.lanes = o), e
                );
            case Ln:
                return (e = me(13, n, t, l)), (e.type = Ln), (e.elementType = Ln), (e.lanes = o), e;
            case Mr:
                return (e = me(19, n, t, l)), (e.elementType = Mr), (e.lanes = o), e;
            case Ho:
                return Ei(n, l, o, t);
            case $l:
                return (e = me(24, n, t, l)), (e.elementType = $l), (e.lanes = o), e;
            default:
                if (typeof e == 'object' && e !== null)
                    switch (e.$$typeof) {
                        case Vo:
                            i = 10;
                            break e;
                        case Ao:
                            i = 9;
                            break e;
                        case rl:
                            i = 11;
                            break e;
                        case ll:
                            i = 14;
                            break e;
                        case $o:
                            (i = 16), (r = null);
                            break e;
                        case Bo:
                            i = 22;
                            break e;
                    }
                throw Error(v(130, e == null ? e : typeof e, ''));
        }
    return (t = me(i, n, t, l)), (t.elementType = e), (t.type = r), (t.lanes = o), t;
}
function Kt(e, t, n, r) {
    return (e = me(7, e, r, t)), (e.lanes = n), e;
}
function Ei(e, t, n, r) {
    return (e = me(23, e, r, t)), (e.elementType = Ho), (e.lanes = n), e;
}
function Ul(e, t, n) {
    return (e = me(6, e, null, t)), (e.lanes = n), e;
}
function Vl(e, t, n) {
    return (
        (t = me(4, e.children !== null ? e.children : [], e.key, t)),
        (t.lanes = n),
        (t.stateNode = {
            containerInfo: e.containerInfo,
            pendingChildren: null,
            implementation: e.implementation,
        }),
        t
    );
}
function rd(e, t, n) {
    (this.tag = t),
        (this.containerInfo = e),
        (this.finishedWork = this.pingCache = this.current = this.pendingChildren = null),
        (this.timeoutHandle = -1),
        (this.pendingContext = this.context = null),
        (this.hydrate = n),
        (this.callbackNode = null),
        (this.callbackPriority = 0),
        (this.eventTimes = Sl(0)),
        (this.expirationTimes = Sl(-1)),
        (this.entangledLanes =
            this.finishedLanes =
            this.mutableReadLanes =
            this.expiredLanes =
            this.pingedLanes =
            this.suspendedLanes =
            this.pendingLanes =
                0),
        (this.entanglements = Sl(0)),
        (this.mutableSourceEagerHydrationData = null);
}
function ld(e, t, n) {
    var r = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
        $$typeof: pt,
        key: r == null ? null : '' + r,
        children: e,
        containerInfo: t,
        implementation: n,
    };
}
function tl(e, t, n, r) {
    var l = t.current,
        o = fe(),
        i = Je(l);
    e: if (n) {
        n = n._reactInternals;
        t: {
            if (Pt(n) !== n || n.tag !== 1) throw Error(v(170));
            var u = n;
            do {
                switch (u.tag) {
                    case 3:
                        u = u.stateNode.context;
                        break t;
                    case 1:
                        if (ce(u.type)) {
                            u = u.stateNode.__reactInternalMemoizedMergedChildContext;
                            break t;
                        }
                }
                u = u.return;
            } while (u !== null);
            throw Error(v(171));
        }
        if (n.tag === 1) {
            var s = n.type;
            if (ce(s)) {
                n = na(n, s, u);
                break e;
            }
        }
        n = u;
    } else n = rt;
    return (
        t.context === null ? (t.context = n) : (t.pendingContext = n),
        (t = Ze(o, i)),
        (t.payload = { element: e }),
        (r = r === void 0 ? null : r),
        r !== null && (t.callback = r),
        be(l, t),
        qe(l, i, o),
        i
    );
}
function Al(e) {
    if (((e = e.current), !e.child)) return null;
    switch (e.child.tag) {
        case 5:
            return e.child.stateNode;
        default:
            return e.child.stateNode;
    }
}
function Hu(e, t) {
    if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
        var n = e.retryLane;
        e.retryLane = n !== 0 && n < t ? n : t;
    }
}
function Ci(e, t) {
    Hu(e, t), (e = e.alternate) && Hu(e, t);
}
function od() {
    return null;
}
function _i(e, t, n) {
    var r = (n != null && n.hydrationOptions != null && n.hydrationOptions.mutableSources) || null;
    if (
        ((n = new rd(e, t, n != null && n.hydrate === !0)),
        (t = me(3, null, null, t === 2 ? 7 : t === 1 ? 3 : 0)),
        (n.current = t),
        (t.stateNode = n),
        ai(t),
        (e[nn] = n.current),
        bs(e.nodeType === 8 ? e.parentNode : e),
        r)
    )
        for (e = 0; e < r.length; e++) {
            t = r[e];
            var l = t._getVersion;
            (l = l(t._source)),
                n.mutableSourceEagerHydrationData == null
                    ? (n.mutableSourceEagerHydrationData = [t, l])
                    : n.mutableSourceEagerHydrationData.push(t, l);
        }
    this._internalRoot = n;
}
_i.prototype.render = function (e) {
    tl(e, this._internalRoot, null, null);
};
_i.prototype.unmount = function () {
    var e = this._internalRoot,
        t = e.containerInfo;
    tl(null, e, null, function () {
        t[nn] = null;
    });
};
function or(e) {
    return !(
        !e ||
        (e.nodeType !== 1 &&
            e.nodeType !== 9 &&
            e.nodeType !== 11 &&
            (e.nodeType !== 8 || e.nodeValue !== ' react-mount-point-unstable '))
    );
}
function id(e, t) {
    if (
        (t ||
            ((t = e ? (e.nodeType === 9 ? e.documentElement : e.firstChild) : null),
            (t = !(!t || t.nodeType !== 1 || !t.hasAttribute('data-reactroot')))),
        !t)
    )
        for (var n; (n = e.lastChild); ) e.removeChild(n);
    return new _i(e, 0, t ? { hydrate: !0 } : void 0);
}
function hl(e, t, n, r, l) {
    var o = n._reactRootContainer;
    if (o) {
        var i = o._internalRoot;
        if (typeof l == 'function') {
            var u = l;
            l = function () {
                var f = Al(i);
                u.call(f);
            };
        }
        tl(t, i, e, l);
    } else {
        if (
            ((o = n._reactRootContainer = id(n, r)), (i = o._internalRoot), typeof l == 'function')
        ) {
            var s = l;
            l = function () {
                var f = Al(i);
                s.call(f);
            };
        }
        Ma(function () {
            tl(t, i, e, l);
        });
    }
    return Al(i);
}
zs = function (e) {
    if (e.tag === 13) {
        var t = fe();
        qe(e, 4, t), Ci(e, 4);
    }
};
Xo = function (e) {
    if (e.tag === 13) {
        var t = fe();
        qe(e, 67108864, t), Ci(e, 67108864);
    }
};
Rs = function (e) {
    if (e.tag === 13) {
        var t = fe(),
            n = Je(e);
        qe(e, n, t), Ci(e, n);
    }
};
Os = function (e, t) {
    return t();
};
bl = function (e, t, n) {
    switch (t) {
        case 'input':
            if ((Wl(e, n), (t = n.name), n.type === 'radio' && t != null)) {
                for (n = e; n.parentNode; ) n = n.parentNode;
                for (
                    n = n.querySelectorAll(
                        'input[name=' + JSON.stringify('' + t) + '][type="radio"]',
                    ),
                        t = 0;
                    t < n.length;
                    t++
                ) {
                    var r = n[t];
                    if (r !== e && r.form === e.form) {
                        var l = cl(r);
                        if (!l) throw Error(v(90));
                        vs(r), Wl(r, l);
                    }
                }
            }
            break;
        case 'textarea':
            ws(e, n);
            break;
        case 'select':
            (t = n.value), t != null && At(e, !!n.multiple, t, !1);
    }
};
Go = Oa;
Ps = function (e, t, n, r, l) {
    var o = z;
    z |= 4;
    try {
        return kt(98, e.bind(null, t, n, r, l));
    } finally {
        (z = o), z === 0 && (on(), Le());
    }
};
Yo = function () {
    (z & 49) === 0 && (Gf(), ut());
};
Ns = function (e, t) {
    var n = z;
    z |= 2;
    try {
        return e(t);
    } finally {
        (z = n), z === 0 && (on(), Le());
    }
};
function Aa(e, t) {
    var n = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!or(t)) throw Error(v(200));
    return ld(e, t, null, n);
}
var ud = { Events: [nr, Ft, cl, Cs, _s, ut, { current: !1 }] },
    xn = {
        findFiberByHostInstance: ht,
        bundleType: 0,
        version: '17.0.2',
        rendererPackageName: 'react-dom',
    },
    sd = {
        bundleType: xn.bundleType,
        version: xn.version,
        rendererPackageName: xn.rendererPackageName,
        rendererConfig: xn.rendererConfig,
        overrideHookState: null,
        overrideHookStateDeletePath: null,
        overrideHookStateRenamePath: null,
        overrideProps: null,
        overridePropsDeletePath: null,
        overridePropsRenamePath: null,
        setSuspenseHandler: null,
        scheduleUpdate: null,
        currentDispatcherRef: _t.ReactCurrentDispatcher,
        findHostInstanceByFiber: function (e) {
            return (e = Ls(e)), e === null ? null : e.stateNode;
        },
        findFiberByHostInstance: xn.findFiberByHostInstance || od,
        findHostInstancesForRefresh: null,
        scheduleRefresh: null,
        scheduleRoot: null,
        setRefreshHandler: null,
        getCurrentFiber: null,
    };
if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ != 'undefined') {
    var wr = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!wr.isDisabled && wr.supportsFiber)
        try {
            (oi = wr.inject(sd)), (wt = wr);
        } catch {}
}
ye.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ud;
ye.createPortal = Aa;
ye.findDOMNode = function (e) {
    if (e == null) return null;
    if (e.nodeType === 1) return e;
    var t = e._reactInternals;
    if (t === void 0)
        throw typeof e.render == 'function' ? Error(v(188)) : Error(v(268, Object.keys(e)));
    return (e = Ls(t)), (e = e === null ? null : e.stateNode), e;
};
ye.flushSync = function (e, t) {
    var n = z;
    if ((n & 48) !== 0) return e(t);
    z |= 1;
    try {
        if (e) return kt(99, e.bind(null, t));
    } finally {
        (z = n), Le();
    }
};
ye.hydrate = function (e, t, n) {
    if (!or(t)) throw Error(v(200));
    return hl(null, e, t, !0, n);
};
ye.render = function (e, t, n) {
    if (!or(t)) throw Error(v(200));
    return hl(null, e, t, !1, n);
};
ye.unmountComponentAtNode = function (e) {
    if (!or(e)) throw Error(v(40));
    return e._reactRootContainer
        ? (Ma(function () {
              hl(null, null, e, !1, function () {
                  (e._reactRootContainer = null), (e[nn] = null);
              });
          }),
          !0)
        : !1;
};
ye.unstable_batchedUpdates = Oa;
ye.unstable_createPortal = function (e, t) {
    return Aa(e, t, 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null);
};
ye.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
    if (!or(n)) throw Error(v(200));
    if (e == null || e._reactInternals === void 0) throw Error(v(38));
    return hl(e, t, n, !1, r);
};
ye.version = '17.0.2';
function $a() {
    if (
        !(
            typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ == 'undefined' ||
            typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
        )
    )
        try {
            __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE($a);
        } catch (e) {
            console.error(e);
        }
}
$a(), (fs.exports = ye);
var ad = fs.exports;
function Ba(e, t) {
    if (e == null) return {};
    var n = {},
        r = Object.keys(e),
        l,
        o;
    for (o = 0; o < r.length; o++) (l = r[o]), !(t.indexOf(l) >= 0) && (n[l] = e[l]);
    return n;
}
var cd = ['color'],
    fd = j.exports.forwardRef(function (e, t) {
        var n = e.color,
            r = n === void 0 ? 'currentColor' : n,
            l = Ba(e, cd);
        return j.exports.createElement(
            'svg',
            Object.assign(
                {
                    width: '15',
                    height: '15',
                    viewBox: '0 0 15 15',
                    fill: 'none',
                    xmlns: 'http://www.w3.org/2000/svg',
                },
                l,
                { ref: t },
            ),
            j.exports.createElement('path', {
                d: 'M7.07926 0.222253C7.31275 -0.007434 7.6873 -0.007434 7.92079 0.222253L14.6708 6.86227C14.907 7.09465 14.9101 7.47453 14.6778 7.71076C14.4454 7.947 14.0655 7.95012 13.8293 7.71773L13 6.90201V12.5C13 12.7761 12.7762 13 12.5 13H2.50002C2.22388 13 2.00002 12.7761 2.00002 12.5V6.90201L1.17079 7.71773C0.934558 7.95012 0.554672 7.947 0.32229 7.71076C0.0899079 7.47453 0.0930283 7.09465 0.32926 6.86227L7.07926 0.222253ZM7.50002 1.49163L12 5.91831V12H10V8.49999C10 8.22385 9.77617 7.99999 9.50002 7.99999H6.50002C6.22388 7.99999 6.00002 8.22385 6.00002 8.49999V12H3.00002V5.91831L7.50002 1.49163ZM7.00002 12H9.00002V8.99999H7.00002V12Z',
                fill: r,
                fillRule: 'evenodd',
                clipRule: 'evenodd',
            }),
        );
    }),
    dd = ['color'],
    pd = j.exports.forwardRef(function (e, t) {
        var n = e.color,
            r = n === void 0 ? 'currentColor' : n,
            l = Ba(e, dd);
        return j.exports.createElement(
            'svg',
            Object.assign(
                {
                    width: '15',
                    height: '15',
                    viewBox: '0 0 15 15',
                    fill: 'none',
                    xmlns: 'http://www.w3.org/2000/svg',
                },
                l,
                { ref: t },
            ),
            j.exports.createElement('path', {
                d: 'M8 2.75C8 2.47386 7.77614 2.25 7.5 2.25C7.22386 2.25 7 2.47386 7 2.75V7H2.75C2.47386 7 2.25 7.22386 2.25 7.5C2.25 7.77614 2.47386 8 2.75 8H7V12.25C7 12.5261 7.22386 12.75 7.5 12.75C7.77614 12.75 8 12.5261 8 12.25V8H12.25C12.5261 8 12.75 7.77614 12.75 7.5C12.75 7.22386 12.5261 7 12.25 7H8V2.75Z',
                fill: r,
                fillRule: 'evenodd',
                clipRule: 'evenodd',
            }),
        );
    }),
    gl = { exports: {} },
    ir = {};
/** @license React v17.0.2
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var md = j.exports,
    Wa = 60103;
ir.Fragment = 60107;
if (typeof Symbol == 'function' && Symbol.for) {
    var Qu = Symbol.for;
    (Wa = Qu('react.element')), (ir.Fragment = Qu('react.fragment'));
}
var hd = md.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
    gd = Object.prototype.hasOwnProperty,
    vd = { key: !0, ref: !0, __self: !0, __source: !0 };
function Ha(e, t, n) {
    var r,
        l = {},
        o = null,
        i = null;
    n !== void 0 && (o = '' + n),
        t.key !== void 0 && (o = '' + t.key),
        t.ref !== void 0 && (i = t.ref);
    for (r in t) gd.call(t, r) && !vd.hasOwnProperty(r) && (l[r] = t[r]);
    if (e && e.defaultProps) for (r in ((t = e.defaultProps), t)) l[r] === void 0 && (l[r] = t[r]);
    return {
        $$typeof: Wa,
        type: e,
        key: o,
        ref: i,
        props: l,
        _owner: hd.current,
    };
}
ir.jsx = Ha;
ir.jsxs = Ha;
gl.exports = ir;
const I = gl.exports.jsx,
    Et = gl.exports.jsxs,
    yd = gl.exports.Fragment;
function wd() {
    const e = 'flex items-center justify-center hover:bg-stone-900 h-10 w-12';
    return Et('div', {
        className: 'flex flex-row items-center pl-20 border-b h-10',
        children: [
            I('button', { className: e, children: I(fd, {}) }),
            I('div', {
                className:
                    'min-w-40 max-w-52 border border-b-black px-4 text-xs flex items-center h-[41px]',
                children: I('h1', {
                    className: 'text-bold',
                    children: 'Current Tab',
                }),
            }),
            I('button', { className: e, children: I(pd, {}) }),
            I('div', { className: 'appbar w-full h-full' }),
        ],
    });
}
const xd = { theme: 'system', setTheme: () => null },
    kd = j.exports.createContext(xd);
function Sd({ children: e, defaultTheme: t = 'system', storageKey: n = 'vite-ui-theme', ...r }) {
    const [l, o] = j.exports.useState(() => localStorage.getItem(n) || t);
    j.exports.useEffect(() => {
        const u = window.document.documentElement;
        if ((u.classList.remove('light', 'dark'), l === 'system')) {
            const s = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            u.classList.add(s);
            return;
        }
        u.classList.add(l);
    }, [l]);
    const i = {
        theme: l,
        setTheme: (u) => {
            localStorage.setItem(n, u), o(u);
        },
    };
    return I(kd.Provider, { ...r, value: i, children: e });
}
function Ed({ children: e }) {
    const [t, n] = j.exports.useState({ x: 20, y: 20 }),
        [r, l] = j.exports.useState(0.5),
        [o, i] = j.exports.useState(!1),
        u = j.exports.useRef(null),
        s = j.exports.useRef(null),
        f = 0.002,
        g = 0.4,
        E = (x) => {
            x.ctrlKey ? m(x) : S(x);
        },
        m = (x) => {
            if (!u.current) return;
            x.preventDefault();
            const y = -x.deltaY * f,
                c = u.current.getBoundingClientRect(),
                a = x.clientX - c.left,
                d = x.clientY - c.top,
                p = r * (1 + y),
                h = (a - t.x) * y,
                P = (d - t.y) * y;
            l(p), n((w) => ({ x: w.x - h, y: w.y - P }));
        },
        S = (x) => {
            const y = (x.deltaX + (x.shiftKey ? x.deltaY : 0)) * g,
                c = (x.shiftKey ? 0 : x.deltaY) * g;
            n((a) => ({ x: a.x - y, y: a.y - c }));
        };
    return (
        j.exports.useEffect(() => {
            const x = u.current;
            if (x)
                return (
                    x.addEventListener('wheel', E, { passive: !1 }),
                    () => x.removeEventListener('wheel', E)
                );
        }, [E]),
        Et('div', {
            ref: u,
            className: 'overflow-hidden bg-stone-800',
            children: [
                o &&
                    I('div', {
                        ref: s,
                        style: {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                            backgroundColor: 'transparent',
                            pointerEvents: 'auto',
                        },
                    }),
                I('div', {
                    style: {
                        transition: 'transform ease',
                        transform: `translate(${t.x}px, ${t.y}px) scale(${r})`,
                        transformOrigin: '0 0',
                    },
                    children: e,
                }),
            ],
        })
    );
}
const Gu = () => I('div', { className: 'w-80 ' });
function Cd(e, t) {
    typeof e == 'function' ? e(t) : e != null && (e.current = t);
}
function _d(...e) {
    return (t) => e.forEach((n) => Cd(n, t));
}
var Pi = j.exports.forwardRef((e, t) => {
    const { children: n, ...r } = e,
        l = j.exports.Children.toArray(n),
        o = l.find(Nd);
    if (o) {
        const i = o.props.children,
            u = l.map((s) =>
                s === o
                    ? j.exports.Children.count(i) > 1
                        ? j.exports.Children.only(null)
                        : j.exports.isValidElement(i)
                          ? i.props.children
                          : null
                    : s,
            );
        return I(To, {
            ...r,
            ref: t,
            children: j.exports.isValidElement(i) ? j.exports.cloneElement(i, void 0, u) : null,
        });
    }
    return I(To, { ...r, ref: t, children: n });
});
Pi.displayName = 'Slot';
var To = j.exports.forwardRef((e, t) => {
    const { children: n, ...r } = e;
    if (j.exports.isValidElement(n)) {
        const l = Ld(n);
        return j.exports.cloneElement(n, {
            ...Td(r, n.props),
            ref: t ? _d(t, l) : l,
        });
    }
    return j.exports.Children.count(n) > 1 ? j.exports.Children.only(null) : null;
});
To.displayName = 'SlotClone';
var Pd = ({ children: e }) => I(yd, { children: e });
function Nd(e) {
    return j.exports.isValidElement(e) && e.type === Pd;
}
function Td(e, t) {
    const n = { ...t };
    for (const r in t) {
        const l = e[r],
            o = t[r];
        /^on[A-Z]/.test(r)
            ? l && o
                ? (n[r] = (...u) => {
                      o(...u), l(...u);
                  })
                : l && (n[r] = l)
            : r === 'style'
              ? (n[r] = { ...l, ...o })
              : r === 'className' && (n[r] = [l, o].filter(Boolean).join(' '));
    }
    return { ...e, ...n };
}
function Ld(e) {
    var r, l;
    let t = (r = Object.getOwnPropertyDescriptor(e.props, 'ref')) == null ? void 0 : r.get,
        n = t && 'isReactWarning' in t && t.isReactWarning;
    return n
        ? e.ref
        : ((t = (l = Object.getOwnPropertyDescriptor(e, 'ref')) == null ? void 0 : l.get),
          (n = t && 'isReactWarning' in t && t.isReactWarning),
          n ? e.props.ref : e.props.ref || e.ref);
}
function Qa(e) {
    var t,
        n,
        r = '';
    if (typeof e == 'string' || typeof e == 'number') r += e;
    else if (typeof e == 'object')
        if (Array.isArray(e))
            for (t = 0; t < e.length; t++) e[t] && (n = Qa(e[t])) && (r && (r += ' '), (r += n));
        else for (t in e) e[t] && (r && (r += ' '), (r += t));
    return r;
}
function zd() {
    for (var e, t, n = 0, r = ''; n < arguments.length; )
        (e = arguments[n++]) && (t = Qa(e)) && (r && (r += ' '), (r += t));
    return r;
}
const Yu = (e) => (typeof e == 'boolean' ? ''.concat(e) : e === 0 ? '0' : e),
    Ku = zd,
    Ga = (e, t) => (n) => {
        var r;
        if ((t == null ? void 0 : t.variants) == null)
            return Ku(e, n == null ? void 0 : n.class, n == null ? void 0 : n.className);
        const { variants: l, defaultVariants: o } = t,
            i = Object.keys(l).map((f) => {
                const g = n == null ? void 0 : n[f],
                    E = o == null ? void 0 : o[f];
                if (g === null) return null;
                const m = Yu(g) || Yu(E);
                return l[f][m];
            }),
            u =
                n &&
                Object.entries(n).reduce((f, g) => {
                    let [E, m] = g;
                    return m === void 0 || (f[E] = m), f;
                }, {}),
            s =
                t == null || (r = t.compoundVariants) === null || r === void 0
                    ? void 0
                    : r.reduce((f, g) => {
                          let { class: E, className: m, ...S } = g;
                          return Object.entries(S).every((x) => {
                              let [y, c] = x;
                              return Array.isArray(c)
                                  ? c.includes({ ...o, ...u }[y])
                                  : { ...o, ...u }[y] === c;
                          })
                              ? [...f, E, m]
                              : f;
                      }, []);
        return Ku(e, i, s, n == null ? void 0 : n.class, n == null ? void 0 : n.className);
    };
function Ya(e) {
    var t,
        n,
        r = '';
    if (typeof e == 'string' || typeof e == 'number') r += e;
    else if (typeof e == 'object')
        if (Array.isArray(e)) {
            var l = e.length;
            for (t = 0; t < l; t++) e[t] && (n = Ya(e[t])) && (r && (r += ' '), (r += n));
        } else for (n in e) e[n] && (r && (r += ' '), (r += n));
    return r;
}
function Rd() {
    for (var e, t, n = 0, r = '', l = arguments.length; n < l; n++)
        (e = arguments[n]) && (t = Ya(e)) && (r && (r += ' '), (r += t));
    return r;
}
const Ni = '-';
function Od(e) {
    const t = jd(e),
        { conflictingClassGroups: n, conflictingClassGroupModifiers: r } = e;
    function l(i) {
        const u = i.split(Ni);
        return u[0] === '' && u.length !== 1 && u.shift(), Ka(u, t) || Md(i);
    }
    function o(i, u) {
        const s = n[i] || [];
        return u && r[i] ? [...s, ...r[i]] : s;
    }
    return { getClassGroupId: l, getConflictingClassGroupIds: o };
}
function Ka(e, t) {
    var i;
    if (e.length === 0) return t.classGroupId;
    const n = e[0],
        r = t.nextPart.get(n),
        l = r ? Ka(e.slice(1), r) : void 0;
    if (l) return l;
    if (t.validators.length === 0) return;
    const o = e.join(Ni);
    return (i = t.validators.find(({ validator: u }) => u(o))) == null ? void 0 : i.classGroupId;
}
const Xu = /^\[(.+)\]$/;
function Md(e) {
    if (Xu.test(e)) {
        const t = Xu.exec(e)[1],
            n = t == null ? void 0 : t.substring(0, t.indexOf(':'));
        if (n) return 'arbitrary..' + n;
    }
}
function jd(e) {
    const { theme: t, prefix: n } = e,
        r = { nextPart: new Map(), validators: [] };
    return (
        Fd(Object.entries(e.classGroups), n).forEach(([o, i]) => {
            Lo(i, r, o, t);
        }),
        r
    );
}
function Lo(e, t, n, r) {
    e.forEach((l) => {
        if (typeof l == 'string') {
            const o = l === '' ? t : Zu(t, l);
            o.classGroupId = n;
            return;
        }
        if (typeof l == 'function') {
            if (Id(l)) {
                Lo(l(r), t, n, r);
                return;
            }
            t.validators.push({ validator: l, classGroupId: n });
            return;
        }
        Object.entries(l).forEach(([o, i]) => {
            Lo(i, Zu(t, o), n, r);
        });
    });
}
function Zu(e, t) {
    let n = e;
    return (
        t.split(Ni).forEach((r) => {
            n.nextPart.has(r) || n.nextPart.set(r, { nextPart: new Map(), validators: [] }),
                (n = n.nextPart.get(r));
        }),
        n
    );
}
function Id(e) {
    return e.isThemeGetter;
}
function Fd(e, t) {
    return t
        ? e.map(([n, r]) => {
              const l = r.map((o) =>
                  typeof o == 'string'
                      ? t + o
                      : typeof o == 'object'
                        ? Object.fromEntries(Object.entries(o).map(([i, u]) => [t + i, u]))
                        : o,
              );
              return [n, l];
          })
        : e;
}
function Dd(e) {
    if (e < 1) return { get: () => {}, set: () => {} };
    let t = 0,
        n = new Map(),
        r = new Map();
    function l(o, i) {
        n.set(o, i), t++, t > e && ((t = 0), (r = n), (n = new Map()));
    }
    return {
        get(o) {
            let i = n.get(o);
            if (i !== void 0) return i;
            if ((i = r.get(o)) !== void 0) return l(o, i), i;
        },
        set(o, i) {
            n.has(o) ? n.set(o, i) : l(o, i);
        },
    };
}
const Xa = '!';
function Ud(e) {
    const t = e.separator,
        n = t.length === 1,
        r = t[0],
        l = t.length;
    return function (i) {
        const u = [];
        let s = 0,
            f = 0,
            g;
        for (let y = 0; y < i.length; y++) {
            let c = i[y];
            if (s === 0) {
                if (c === r && (n || i.slice(y, y + l) === t)) {
                    u.push(i.slice(f, y)), (f = y + l);
                    continue;
                }
                if (c === '/') {
                    g = y;
                    continue;
                }
            }
            c === '[' ? s++ : c === ']' && s--;
        }
        const E = u.length === 0 ? i : i.substring(f),
            m = E.startsWith(Xa),
            S = m ? E.substring(1) : E,
            x = g && g > f ? g - f : void 0;
        return {
            modifiers: u,
            hasImportantModifier: m,
            baseClassName: S,
            maybePostfixModifierPosition: x,
        };
    };
}
function Vd(e) {
    if (e.length <= 1) return e;
    const t = [];
    let n = [];
    return (
        e.forEach((r) => {
            r[0] === '[' ? (t.push(...n.sort(), r), (n = [])) : n.push(r);
        }),
        t.push(...n.sort()),
        t
    );
}
function Ad(e) {
    return { cache: Dd(e.cacheSize), splitModifiers: Ud(e), ...Od(e) };
}
const $d = /\s+/;
function Bd(e, t) {
    const { splitModifiers: n, getClassGroupId: r, getConflictingClassGroupIds: l } = t,
        o = new Set();
    return e
        .trim()
        .split($d)
        .map((i) => {
            const {
                modifiers: u,
                hasImportantModifier: s,
                baseClassName: f,
                maybePostfixModifierPosition: g,
            } = n(i);
            let E = r(g ? f.substring(0, g) : f),
                m = Boolean(g);
            if (!E) {
                if (!g) return { isTailwindClass: !1, originalClassName: i };
                if (((E = r(f)), !E)) return { isTailwindClass: !1, originalClassName: i };
                m = !1;
            }
            const S = Vd(u).join(':'),
                x = s ? S + Xa : S;
            return {
                isTailwindClass: !0,
                modifierId: x,
                classGroupId: E,
                originalClassName: i,
                hasPostfixModifier: m,
            };
        })
        .reverse()
        .filter((i) => {
            if (!i.isTailwindClass) return !0;
            const { modifierId: u, classGroupId: s, hasPostfixModifier: f } = i,
                g = u + s;
            return o.has(g) ? !1 : (o.add(g), l(s, f).forEach((E) => o.add(u + E)), !0);
        })
        .reverse()
        .map((i) => i.originalClassName)
        .join(' ');
}
function Wd() {
    let e = 0,
        t,
        n,
        r = '';
    for (; e < arguments.length; )
        (t = arguments[e++]) && (n = Za(t)) && (r && (r += ' '), (r += n));
    return r;
}
function Za(e) {
    if (typeof e == 'string') return e;
    let t,
        n = '';
    for (let r = 0; r < e.length; r++) e[r] && (t = Za(e[r])) && (n && (n += ' '), (n += t));
    return n;
}
function Hd(e, ...t) {
    let n,
        r,
        l,
        o = i;
    function i(s) {
        const f = t.reduce((g, E) => E(g), e());
        return (n = Ad(f)), (r = n.cache.get), (l = n.cache.set), (o = u), u(s);
    }
    function u(s) {
        const f = r(s);
        if (f) return f;
        const g = Bd(s, n);
        return l(s, g), g;
    }
    return function () {
        return o(Wd.apply(null, arguments));
    };
}
function U(e) {
    const t = (n) => n[e] || [];
    return (t.isThemeGetter = !0), t;
}
const ba = /^\[(?:([a-z-]+):)?(.+)\]$/i,
    Qd = /^\d+\/\d+$/,
    Gd = new Set(['px', 'full', 'screen']),
    Yd = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,
    Kd =
        /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,
    Xd = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/,
    Zd = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,
    bd =
        /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
function Oe(e) {
    return yt(e) || Gd.has(e) || Qd.test(e);
}
function Ae(e) {
    return un(e, 'length', op);
}
function yt(e) {
    return Boolean(e) && !Number.isNaN(Number(e));
}
function xr(e) {
    return un(e, 'number', yt);
}
function kn(e) {
    return Boolean(e) && Number.isInteger(Number(e));
}
function Jd(e) {
    return e.endsWith('%') && yt(e.slice(0, -1));
}
function R(e) {
    return ba.test(e);
}
function $e(e) {
    return Yd.test(e);
}
const qd = new Set(['length', 'size', 'percentage']);
function ep(e) {
    return un(e, qd, Ja);
}
function tp(e) {
    return un(e, 'position', Ja);
}
const np = new Set(['image', 'url']);
function rp(e) {
    return un(e, np, up);
}
function lp(e) {
    return un(e, '', ip);
}
function Sn() {
    return !0;
}
function un(e, t, n) {
    const r = ba.exec(e);
    return r ? (r[1] ? (typeof t == 'string' ? r[1] === t : t.has(r[1])) : n(r[2])) : !1;
}
function op(e) {
    return Kd.test(e) && !Xd.test(e);
}
function Ja() {
    return !1;
}
function ip(e) {
    return Zd.test(e);
}
function up(e) {
    return bd.test(e);
}
function sp() {
    const e = U('colors'),
        t = U('spacing'),
        n = U('blur'),
        r = U('brightness'),
        l = U('borderColor'),
        o = U('borderRadius'),
        i = U('borderSpacing'),
        u = U('borderWidth'),
        s = U('contrast'),
        f = U('grayscale'),
        g = U('hueRotate'),
        E = U('invert'),
        m = U('gap'),
        S = U('gradientColorStops'),
        x = U('gradientColorStopPositions'),
        y = U('inset'),
        c = U('margin'),
        a = U('opacity'),
        d = U('padding'),
        p = U('saturate'),
        h = U('scale'),
        P = U('sepia'),
        w = U('skew'),
        N = U('space'),
        L = U('translate'),
        _ = () => ['auto', 'contain', 'none'],
        H = () => ['auto', 'hidden', 'clip', 'visible', 'scroll'],
        st = () => ['auto', R, t],
        O = () => [R, t],
        Y = () => ['', Oe, Ae],
        ze = () => ['auto', yt, R],
        Se = () => [
            'bottom',
            'center',
            'left',
            'left-bottom',
            'left-top',
            'right',
            'right-bottom',
            'right-top',
            'top',
        ],
        Ee = () => ['solid', 'dashed', 'dotted', 'double', 'none'],
        Tt = () => [
            'normal',
            'multiply',
            'screen',
            'overlay',
            'darken',
            'lighten',
            'color-dodge',
            'color-burn',
            'hard-light',
            'soft-light',
            'difference',
            'exclusion',
            'hue',
            'saturation',
            'color',
            'luminosity',
        ],
        at = () => ['start', 'end', 'center', 'between', 'around', 'evenly', 'stretch'],
        Re = () => ['', '0', R],
        ur = () => ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column'],
        k = () => [yt, xr],
        T = () => [yt, R];
    return {
        cacheSize: 500,
        separator: ':',
        theme: {
            colors: [Sn],
            spacing: [Oe, Ae],
            blur: ['none', '', $e, R],
            brightness: k(),
            borderColor: [e],
            borderRadius: ['none', '', 'full', $e, R],
            borderSpacing: O(),
            borderWidth: Y(),
            contrast: k(),
            grayscale: Re(),
            hueRotate: T(),
            invert: Re(),
            gap: O(),
            gradientColorStops: [e],
            gradientColorStopPositions: [Jd, Ae],
            inset: st(),
            margin: st(),
            opacity: k(),
            padding: O(),
            saturate: k(),
            scale: k(),
            sepia: Re(),
            skew: T(),
            space: O(),
            translate: O(),
        },
        classGroups: {
            aspect: [{ aspect: ['auto', 'square', 'video', R] }],
            container: ['container'],
            columns: [{ columns: [$e] }],
            'break-after': [{ 'break-after': ur() }],
            'break-before': [{ 'break-before': ur() }],
            'break-inside': [
                {
                    'break-inside': ['auto', 'avoid', 'avoid-page', 'avoid-column'],
                },
            ],
            'box-decoration': [{ 'box-decoration': ['slice', 'clone'] }],
            box: [{ box: ['border', 'content'] }],
            display: [
                'block',
                'inline-block',
                'inline',
                'flex',
                'inline-flex',
                'table',
                'inline-table',
                'table-caption',
                'table-cell',
                'table-column',
                'table-column-group',
                'table-footer-group',
                'table-header-group',
                'table-row-group',
                'table-row',
                'flow-root',
                'grid',
                'inline-grid',
                'contents',
                'list-item',
                'hidden',
            ],
            float: [{ float: ['right', 'left', 'none', 'start', 'end'] }],
            clear: [{ clear: ['left', 'right', 'both', 'none', 'start', 'end'] }],
            isolation: ['isolate', 'isolation-auto'],
            'object-fit': [{ object: ['contain', 'cover', 'fill', 'none', 'scale-down'] }],
            'object-position': [{ object: [...Se(), R] }],
            overflow: [{ overflow: H() }],
            'overflow-x': [{ 'overflow-x': H() }],
            'overflow-y': [{ 'overflow-y': H() }],
            overscroll: [{ overscroll: _() }],
            'overscroll-x': [{ 'overscroll-x': _() }],
            'overscroll-y': [{ 'overscroll-y': _() }],
            position: ['static', 'fixed', 'absolute', 'relative', 'sticky'],
            inset: [{ inset: [y] }],
            'inset-x': [{ 'inset-x': [y] }],
            'inset-y': [{ 'inset-y': [y] }],
            start: [{ start: [y] }],
            end: [{ end: [y] }],
            top: [{ top: [y] }],
            right: [{ right: [y] }],
            bottom: [{ bottom: [y] }],
            left: [{ left: [y] }],
            visibility: ['visible', 'invisible', 'collapse'],
            z: [{ z: ['auto', kn, R] }],
            basis: [{ basis: st() }],
            'flex-direction': [{ flex: ['row', 'row-reverse', 'col', 'col-reverse'] }],
            'flex-wrap': [{ flex: ['wrap', 'wrap-reverse', 'nowrap'] }],
            flex: [{ flex: ['1', 'auto', 'initial', 'none', R] }],
            grow: [{ grow: Re() }],
            shrink: [{ shrink: Re() }],
            order: [{ order: ['first', 'last', 'none', kn, R] }],
            'grid-cols': [{ 'grid-cols': [Sn] }],
            'col-start-end': [{ col: ['auto', { span: ['full', kn, R] }, R] }],
            'col-start': [{ 'col-start': ze() }],
            'col-end': [{ 'col-end': ze() }],
            'grid-rows': [{ 'grid-rows': [Sn] }],
            'row-start-end': [{ row: ['auto', { span: [kn, R] }, R] }],
            'row-start': [{ 'row-start': ze() }],
            'row-end': [{ 'row-end': ze() }],
            'grid-flow': [
                {
                    'grid-flow': ['row', 'col', 'dense', 'row-dense', 'col-dense'],
                },
            ],
            'auto-cols': [{ 'auto-cols': ['auto', 'min', 'max', 'fr', R] }],
            'auto-rows': [{ 'auto-rows': ['auto', 'min', 'max', 'fr', R] }],
            gap: [{ gap: [m] }],
            'gap-x': [{ 'gap-x': [m] }],
            'gap-y': [{ 'gap-y': [m] }],
            'justify-content': [{ justify: ['normal', ...at()] }],
            'justify-items': [{ 'justify-items': ['start', 'end', 'center', 'stretch'] }],
            'justify-self': [
                {
                    'justify-self': ['auto', 'start', 'end', 'center', 'stretch'],
                },
            ],
            'align-content': [{ content: ['normal', ...at(), 'baseline'] }],
            'align-items': [{ items: ['start', 'end', 'center', 'baseline', 'stretch'] }],
            'align-self': [
                {
                    self: ['auto', 'start', 'end', 'center', 'stretch', 'baseline'],
                },
            ],
            'place-content': [{ 'place-content': [...at(), 'baseline'] }],
            'place-items': [
                {
                    'place-items': ['start', 'end', 'center', 'baseline', 'stretch'],
                },
            ],
            'place-self': [{ 'place-self': ['auto', 'start', 'end', 'center', 'stretch'] }],
            p: [{ p: [d] }],
            px: [{ px: [d] }],
            py: [{ py: [d] }],
            ps: [{ ps: [d] }],
            pe: [{ pe: [d] }],
            pt: [{ pt: [d] }],
            pr: [{ pr: [d] }],
            pb: [{ pb: [d] }],
            pl: [{ pl: [d] }],
            m: [{ m: [c] }],
            mx: [{ mx: [c] }],
            my: [{ my: [c] }],
            ms: [{ ms: [c] }],
            me: [{ me: [c] }],
            mt: [{ mt: [c] }],
            mr: [{ mr: [c] }],
            mb: [{ mb: [c] }],
            ml: [{ ml: [c] }],
            'space-x': [{ 'space-x': [N] }],
            'space-x-reverse': ['space-x-reverse'],
            'space-y': [{ 'space-y': [N] }],
            'space-y-reverse': ['space-y-reverse'],
            w: [{ w: ['auto', 'min', 'max', 'fit', 'svw', 'lvw', 'dvw', R, t] }],
            'min-w': [{ 'min-w': [R, t, 'min', 'max', 'fit'] }],
            'max-w': [
                {
                    'max-w': [
                        R,
                        t,
                        'none',
                        'full',
                        'min',
                        'max',
                        'fit',
                        'prose',
                        { screen: [$e] },
                        $e,
                    ],
                },
            ],
            h: [{ h: [R, t, 'auto', 'min', 'max', 'fit', 'svh', 'lvh', 'dvh'] }],
            'min-h': [{ 'min-h': [R, t, 'min', 'max', 'fit', 'svh', 'lvh', 'dvh'] }],
            'max-h': [{ 'max-h': [R, t, 'min', 'max', 'fit', 'svh', 'lvh', 'dvh'] }],
            size: [{ size: [R, t, 'auto', 'min', 'max', 'fit'] }],
            'font-size': [{ text: ['base', $e, Ae] }],
            'font-smoothing': ['antialiased', 'subpixel-antialiased'],
            'font-style': ['italic', 'not-italic'],
            'font-weight': [
                {
                    font: [
                        'thin',
                        'extralight',
                        'light',
                        'normal',
                        'medium',
                        'semibold',
                        'bold',
                        'extrabold',
                        'black',
                        xr,
                    ],
                },
            ],
            'font-family': [{ font: [Sn] }],
            'fvn-normal': ['normal-nums'],
            'fvn-ordinal': ['ordinal'],
            'fvn-slashed-zero': ['slashed-zero'],
            'fvn-figure': ['lining-nums', 'oldstyle-nums'],
            'fvn-spacing': ['proportional-nums', 'tabular-nums'],
            'fvn-fraction': ['diagonal-fractions', 'stacked-fractons'],
            tracking: [
                {
                    tracking: ['tighter', 'tight', 'normal', 'wide', 'wider', 'widest', R],
                },
            ],
            'line-clamp': [{ 'line-clamp': ['none', yt, xr] }],
            leading: [
                {
                    leading: ['none', 'tight', 'snug', 'normal', 'relaxed', 'loose', Oe, R],
                },
            ],
            'list-image': [{ 'list-image': ['none', R] }],
            'list-style-type': [{ list: ['none', 'disc', 'decimal', R] }],
            'list-style-position': [{ list: ['inside', 'outside'] }],
            'placeholder-color': [{ placeholder: [e] }],
            'placeholder-opacity': [{ 'placeholder-opacity': [a] }],
            'text-alignment': [
                {
                    text: ['left', 'center', 'right', 'justify', 'start', 'end'],
                },
            ],
            'text-color': [{ text: [e] }],
            'text-opacity': [{ 'text-opacity': [a] }],
            'text-decoration': ['underline', 'overline', 'line-through', 'no-underline'],
            'text-decoration-style': [{ decoration: [...Ee(), 'wavy'] }],
            'text-decoration-thickness': [{ decoration: ['auto', 'from-font', Oe, Ae] }],
            'underline-offset': [{ 'underline-offset': ['auto', Oe, R] }],
            'text-decoration-color': [{ decoration: [e] }],
            'text-transform': ['uppercase', 'lowercase', 'capitalize', 'normal-case'],
            'text-overflow': ['truncate', 'text-ellipsis', 'text-clip'],
            'text-wrap': [{ text: ['wrap', 'nowrap', 'balance', 'pretty'] }],
            indent: [{ indent: O() }],
            'vertical-align': [
                {
                    align: [
                        'baseline',
                        'top',
                        'middle',
                        'bottom',
                        'text-top',
                        'text-bottom',
                        'sub',
                        'super',
                        R,
                    ],
                },
            ],
            whitespace: [
                {
                    whitespace: ['normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap', 'break-spaces'],
                },
            ],
            break: [{ break: ['normal', 'words', 'all', 'keep'] }],
            hyphens: [{ hyphens: ['none', 'manual', 'auto'] }],
            content: [{ content: ['none', R] }],
            'bg-attachment': [{ bg: ['fixed', 'local', 'scroll'] }],
            'bg-clip': [{ 'bg-clip': ['border', 'padding', 'content', 'text'] }],
            'bg-opacity': [{ 'bg-opacity': [a] }],
            'bg-origin': [{ 'bg-origin': ['border', 'padding', 'content'] }],
            'bg-position': [{ bg: [...Se(), tp] }],
            'bg-repeat': [
                {
                    bg: ['no-repeat', { repeat: ['', 'x', 'y', 'round', 'space'] }],
                },
            ],
            'bg-size': [{ bg: ['auto', 'cover', 'contain', ep] }],
            'bg-image': [
                {
                    bg: [
                        'none',
                        {
                            'gradient-to': ['t', 'tr', 'r', 'br', 'b', 'bl', 'l', 'tl'],
                        },
                        rp,
                    ],
                },
            ],
            'bg-color': [{ bg: [e] }],
            'gradient-from-pos': [{ from: [x] }],
            'gradient-via-pos': [{ via: [x] }],
            'gradient-to-pos': [{ to: [x] }],
            'gradient-from': [{ from: [S] }],
            'gradient-via': [{ via: [S] }],
            'gradient-to': [{ to: [S] }],
            rounded: [{ rounded: [o] }],
            'rounded-s': [{ 'rounded-s': [o] }],
            'rounded-e': [{ 'rounded-e': [o] }],
            'rounded-t': [{ 'rounded-t': [o] }],
            'rounded-r': [{ 'rounded-r': [o] }],
            'rounded-b': [{ 'rounded-b': [o] }],
            'rounded-l': [{ 'rounded-l': [o] }],
            'rounded-ss': [{ 'rounded-ss': [o] }],
            'rounded-se': [{ 'rounded-se': [o] }],
            'rounded-ee': [{ 'rounded-ee': [o] }],
            'rounded-es': [{ 'rounded-es': [o] }],
            'rounded-tl': [{ 'rounded-tl': [o] }],
            'rounded-tr': [{ 'rounded-tr': [o] }],
            'rounded-br': [{ 'rounded-br': [o] }],
            'rounded-bl': [{ 'rounded-bl': [o] }],
            'border-w': [{ border: [u] }],
            'border-w-x': [{ 'border-x': [u] }],
            'border-w-y': [{ 'border-y': [u] }],
            'border-w-s': [{ 'border-s': [u] }],
            'border-w-e': [{ 'border-e': [u] }],
            'border-w-t': [{ 'border-t': [u] }],
            'border-w-r': [{ 'border-r': [u] }],
            'border-w-b': [{ 'border-b': [u] }],
            'border-w-l': [{ 'border-l': [u] }],
            'border-opacity': [{ 'border-opacity': [a] }],
            'border-style': [{ border: [...Ee(), 'hidden'] }],
            'divide-x': [{ 'divide-x': [u] }],
            'divide-x-reverse': ['divide-x-reverse'],
            'divide-y': [{ 'divide-y': [u] }],
            'divide-y-reverse': ['divide-y-reverse'],
            'divide-opacity': [{ 'divide-opacity': [a] }],
            'divide-style': [{ divide: Ee() }],
            'border-color': [{ border: [l] }],
            'border-color-x': [{ 'border-x': [l] }],
            'border-color-y': [{ 'border-y': [l] }],
            'border-color-t': [{ 'border-t': [l] }],
            'border-color-r': [{ 'border-r': [l] }],
            'border-color-b': [{ 'border-b': [l] }],
            'border-color-l': [{ 'border-l': [l] }],
            'divide-color': [{ divide: [l] }],
            'outline-style': [{ outline: ['', ...Ee()] }],
            'outline-offset': [{ 'outline-offset': [Oe, R] }],
            'outline-w': [{ outline: [Oe, Ae] }],
            'outline-color': [{ outline: [e] }],
            'ring-w': [{ ring: Y() }],
            'ring-w-inset': ['ring-inset'],
            'ring-color': [{ ring: [e] }],
            'ring-opacity': [{ 'ring-opacity': [a] }],
            'ring-offset-w': [{ 'ring-offset': [Oe, Ae] }],
            'ring-offset-color': [{ 'ring-offset': [e] }],
            shadow: [{ shadow: ['', 'inner', 'none', $e, lp] }],
            'shadow-color': [{ shadow: [Sn] }],
            opacity: [{ opacity: [a] }],
            'mix-blend': [{ 'mix-blend': [...Tt(), 'plus-lighter', 'plus-darker'] }],
            'bg-blend': [{ 'bg-blend': Tt() }],
            filter: [{ filter: ['', 'none'] }],
            blur: [{ blur: [n] }],
            brightness: [{ brightness: [r] }],
            contrast: [{ contrast: [s] }],
            'drop-shadow': [{ 'drop-shadow': ['', 'none', $e, R] }],
            grayscale: [{ grayscale: [f] }],
            'hue-rotate': [{ 'hue-rotate': [g] }],
            invert: [{ invert: [E] }],
            saturate: [{ saturate: [p] }],
            sepia: [{ sepia: [P] }],
            'backdrop-filter': [{ 'backdrop-filter': ['', 'none'] }],
            'backdrop-blur': [{ 'backdrop-blur': [n] }],
            'backdrop-brightness': [{ 'backdrop-brightness': [r] }],
            'backdrop-contrast': [{ 'backdrop-contrast': [s] }],
            'backdrop-grayscale': [{ 'backdrop-grayscale': [f] }],
            'backdrop-hue-rotate': [{ 'backdrop-hue-rotate': [g] }],
            'backdrop-invert': [{ 'backdrop-invert': [E] }],
            'backdrop-opacity': [{ 'backdrop-opacity': [a] }],
            'backdrop-saturate': [{ 'backdrop-saturate': [p] }],
            'backdrop-sepia': [{ 'backdrop-sepia': [P] }],
            'border-collapse': [{ border: ['collapse', 'separate'] }],
            'border-spacing': [{ 'border-spacing': [i] }],
            'border-spacing-x': [{ 'border-spacing-x': [i] }],
            'border-spacing-y': [{ 'border-spacing-y': [i] }],
            'table-layout': [{ table: ['auto', 'fixed'] }],
            caption: [{ caption: ['top', 'bottom'] }],
            transition: [
                {
                    transition: ['none', 'all', '', 'colors', 'opacity', 'shadow', 'transform', R],
                },
            ],
            duration: [{ duration: T() }],
            ease: [{ ease: ['linear', 'in', 'out', 'in-out', R] }],
            delay: [{ delay: T() }],
            animate: [{ animate: ['none', 'spin', 'ping', 'pulse', 'bounce', R] }],
            transform: [{ transform: ['', 'gpu', 'none'] }],
            scale: [{ scale: [h] }],
            'scale-x': [{ 'scale-x': [h] }],
            'scale-y': [{ 'scale-y': [h] }],
            rotate: [{ rotate: [kn, R] }],
            'translate-x': [{ 'translate-x': [L] }],
            'translate-y': [{ 'translate-y': [L] }],
            'skew-x': [{ 'skew-x': [w] }],
            'skew-y': [{ 'skew-y': [w] }],
            'transform-origin': [
                {
                    origin: [
                        'center',
                        'top',
                        'top-right',
                        'right',
                        'bottom-right',
                        'bottom',
                        'bottom-left',
                        'left',
                        'top-left',
                        R,
                    ],
                },
            ],
            accent: [{ accent: ['auto', e] }],
            appearance: [{ appearance: ['none', 'auto'] }],
            cursor: [
                {
                    cursor: [
                        'auto',
                        'default',
                        'pointer',
                        'wait',
                        'text',
                        'move',
                        'help',
                        'not-allowed',
                        'none',
                        'context-menu',
                        'progress',
                        'cell',
                        'crosshair',
                        'vertical-text',
                        'alias',
                        'copy',
                        'no-drop',
                        'grab',
                        'grabbing',
                        'all-scroll',
                        'col-resize',
                        'row-resize',
                        'n-resize',
                        'e-resize',
                        's-resize',
                        'w-resize',
                        'ne-resize',
                        'nw-resize',
                        'se-resize',
                        'sw-resize',
                        'ew-resize',
                        'ns-resize',
                        'nesw-resize',
                        'nwse-resize',
                        'zoom-in',
                        'zoom-out',
                        R,
                    ],
                },
            ],
            'caret-color': [{ caret: [e] }],
            'pointer-events': [{ 'pointer-events': ['none', 'auto'] }],
            resize: [{ resize: ['none', 'y', 'x', ''] }],
            'scroll-behavior': [{ scroll: ['auto', 'smooth'] }],
            'scroll-m': [{ 'scroll-m': O() }],
            'scroll-mx': [{ 'scroll-mx': O() }],
            'scroll-my': [{ 'scroll-my': O() }],
            'scroll-ms': [{ 'scroll-ms': O() }],
            'scroll-me': [{ 'scroll-me': O() }],
            'scroll-mt': [{ 'scroll-mt': O() }],
            'scroll-mr': [{ 'scroll-mr': O() }],
            'scroll-mb': [{ 'scroll-mb': O() }],
            'scroll-ml': [{ 'scroll-ml': O() }],
            'scroll-p': [{ 'scroll-p': O() }],
            'scroll-px': [{ 'scroll-px': O() }],
            'scroll-py': [{ 'scroll-py': O() }],
            'scroll-ps': [{ 'scroll-ps': O() }],
            'scroll-pe': [{ 'scroll-pe': O() }],
            'scroll-pt': [{ 'scroll-pt': O() }],
            'scroll-pr': [{ 'scroll-pr': O() }],
            'scroll-pb': [{ 'scroll-pb': O() }],
            'scroll-pl': [{ 'scroll-pl': O() }],
            'snap-align': [{ snap: ['start', 'end', 'center', 'align-none'] }],
            'snap-stop': [{ snap: ['normal', 'always'] }],
            'snap-type': [{ snap: ['none', 'x', 'y', 'both'] }],
            'snap-strictness': [{ snap: ['mandatory', 'proximity'] }],
            touch: [{ touch: ['auto', 'none', 'manipulation'] }],
            'touch-x': [{ 'touch-pan': ['x', 'left', 'right'] }],
            'touch-y': [{ 'touch-pan': ['y', 'up', 'down'] }],
            'touch-pz': ['touch-pinch-zoom'],
            select: [{ select: ['none', 'text', 'all', 'auto'] }],
            'will-change': [
                {
                    'will-change': ['auto', 'scroll', 'contents', 'transform', R],
                },
            ],
            fill: [{ fill: [e, 'none'] }],
            'stroke-w': [{ stroke: [Oe, Ae, xr] }],
            stroke: [{ stroke: [e, 'none'] }],
            sr: ['sr-only', 'not-sr-only'],
            'forced-color-adjust': [{ 'forced-color-adjust': ['auto', 'none'] }],
        },
        conflictingClassGroups: {
            overflow: ['overflow-x', 'overflow-y'],
            overscroll: ['overscroll-x', 'overscroll-y'],
            inset: ['inset-x', 'inset-y', 'start', 'end', 'top', 'right', 'bottom', 'left'],
            'inset-x': ['right', 'left'],
            'inset-y': ['top', 'bottom'],
            flex: ['basis', 'grow', 'shrink'],
            gap: ['gap-x', 'gap-y'],
            p: ['px', 'py', 'ps', 'pe', 'pt', 'pr', 'pb', 'pl'],
            px: ['pr', 'pl'],
            py: ['pt', 'pb'],
            m: ['mx', 'my', 'ms', 'me', 'mt', 'mr', 'mb', 'ml'],
            mx: ['mr', 'ml'],
            my: ['mt', 'mb'],
            size: ['w', 'h'],
            'font-size': ['leading'],
            'fvn-normal': [
                'fvn-ordinal',
                'fvn-slashed-zero',
                'fvn-figure',
                'fvn-spacing',
                'fvn-fraction',
            ],
            'fvn-ordinal': ['fvn-normal'],
            'fvn-slashed-zero': ['fvn-normal'],
            'fvn-figure': ['fvn-normal'],
            'fvn-spacing': ['fvn-normal'],
            'fvn-fraction': ['fvn-normal'],
            'line-clamp': ['display', 'overflow'],
            rounded: [
                'rounded-s',
                'rounded-e',
                'rounded-t',
                'rounded-r',
                'rounded-b',
                'rounded-l',
                'rounded-ss',
                'rounded-se',
                'rounded-ee',
                'rounded-es',
                'rounded-tl',
                'rounded-tr',
                'rounded-br',
                'rounded-bl',
            ],
            'rounded-s': ['rounded-ss', 'rounded-es'],
            'rounded-e': ['rounded-se', 'rounded-ee'],
            'rounded-t': ['rounded-tl', 'rounded-tr'],
            'rounded-r': ['rounded-tr', 'rounded-br'],
            'rounded-b': ['rounded-br', 'rounded-bl'],
            'rounded-l': ['rounded-tl', 'rounded-bl'],
            'border-spacing': ['border-spacing-x', 'border-spacing-y'],
            'border-w': [
                'border-w-s',
                'border-w-e',
                'border-w-t',
                'border-w-r',
                'border-w-b',
                'border-w-l',
            ],
            'border-w-x': ['border-w-r', 'border-w-l'],
            'border-w-y': ['border-w-t', 'border-w-b'],
            'border-color': [
                'border-color-t',
                'border-color-r',
                'border-color-b',
                'border-color-l',
            ],
            'border-color-x': ['border-color-r', 'border-color-l'],
            'border-color-y': ['border-color-t', 'border-color-b'],
            'scroll-m': [
                'scroll-mx',
                'scroll-my',
                'scroll-ms',
                'scroll-me',
                'scroll-mt',
                'scroll-mr',
                'scroll-mb',
                'scroll-ml',
            ],
            'scroll-mx': ['scroll-mr', 'scroll-ml'],
            'scroll-my': ['scroll-mt', 'scroll-mb'],
            'scroll-p': [
                'scroll-px',
                'scroll-py',
                'scroll-ps',
                'scroll-pe',
                'scroll-pt',
                'scroll-pr',
                'scroll-pb',
                'scroll-pl',
            ],
            'scroll-px': ['scroll-pr', 'scroll-pl'],
            'scroll-py': ['scroll-pt', 'scroll-pb'],
            touch: ['touch-x', 'touch-y', 'touch-pz'],
            'touch-x': ['touch'],
            'touch-y': ['touch'],
            'touch-pz': ['touch'],
        },
        conflictingClassGroupModifiers: { 'font-size': ['leading'] },
    };
}
const ap = Hd(sp);
function qa(...e) {
    return ap(Rd(e));
}
const cp = Ga(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        {
            variants: {
                variant: {
                    default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
                    destructive:
                        'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
                    outline:
                        'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
                    secondary:
                        'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
                    ghost: 'hover:bg-accent hover:text-accent-foreground',
                    link: 'text-primary underline-offset-4 hover:underline',
                },
                size: {
                    default: 'h-9 px-4 py-2',
                    sm: 'h-8 rounded-md px-3 text-xs',
                    lg: 'h-10 rounded-md px-8',
                    icon: 'h-9 w-9',
                },
            },
            defaultVariants: { variant: 'default', size: 'default' },
        },
    ),
    Or = j.exports.forwardRef(({ className: e, variant: t, size: n, asChild: r = !1, ...l }, o) =>
        I(r ? Pi : 'button', {
            className: qa(cp({ variant: t, size: n, className: e })),
            ref: o,
            ...l,
        }),
    );
Or.displayName = 'Button';
var fp = [
        'a',
        'button',
        'div',
        'form',
        'h2',
        'h3',
        'img',
        'input',
        'label',
        'li',
        'nav',
        'ol',
        'p',
        'span',
        'svg',
        'ul',
    ],
    dp = fp.reduce((e, t) => {
        const n = j.exports.forwardRef((r, l) => {
            const { asChild: o, ...i } = r,
                u = o ? Pi : t;
            return (
                typeof window != 'undefined' && (window[Symbol.for('radix-ui')] = !0),
                I(u, { ...i, ref: l })
            );
        });
        return (n.displayName = `Primitive.${t}`), { ...e, [t]: n };
    }, {}),
    pp = 'Label',
    ec = j.exports.forwardRef((e, t) =>
        I(dp.label, {
            ...e,
            ref: t,
            onMouseDown: (n) => {
                var l;
                n.target.closest('button, input, select, textarea') ||
                    ((l = e.onMouseDown) == null || l.call(e, n),
                    !n.defaultPrevented && n.detail > 1 && n.preventDefault());
            },
        }),
    );
ec.displayName = pp;
var tc = ec;
const mp = Ga(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    ),
    nc = j.exports.forwardRef(({ className: e, ...t }, n) =>
        I(tc, { ref: n, className: qa(mp(), e), ...t }),
    );
nc.displayName = tc.displayName;
const hp = () =>
    Et('div', {
        className: 'flex flex-row w-full h-full justify-center px-1',
        children: [
            I('div', {
                className: 'flex-grow basis-0',
                children: I(Or, {
                    variant: 'ghost',
                    size: 'sm',
                    className: '',
                    children: 'Actions',
                }),
            }),
            I(nc, {
                className: 'my-auto font-normal',
                children: 'Your Project',
            }),
            Et('div', {
                className: 'flex space-x-2 flex-grow basis-0 justify-end',
                children: [
                    I(Or, {
                        variant: 'ghost',
                        size: 'sm',
                        className: '',
                        children: 'Share',
                    }),
                    I(Or, {
                        variant: 'outline',
                        size: 'sm',
                        className: '',
                        children: 'Publish',
                    }),
                ],
            }),
        ],
    });
function gp() {
    const e = j.exports.useRef(null);
    return I('webview', {
        ref: e,
        className: 'w-[96rem] h-[54rem]',
        src: 'https://www.framer.com/',
    });
}
function vp() {
    return Et('div', {
        className: 'flex flex-col',
        children: [
            I('div', {
                className: 'p-2 flex items-center border-b-stone-800 border-b',
                children: I(hp, {}),
            }),
            Et('div', {
                className: 'flex flex-row overflow-hidden',
                children: [I(Gu, {}), I(Ed, { children: I(gp, {}) }), I(Gu, {})],
            }),
        ],
    });
}
function yp() {
    return I(Sd, {
        defaultTheme: 'dark',
        storageKey: 'vite-ui-theme',
        children: Et('div', {
            className: 'flex flex-col h-screen w-screen bg-black',
            children: [
                window.Main && I('div', { className: 'flex-none', children: I(wd, {}) }),
                I('div', {
                    className: 'flex-grow overflow-hidden',
                    children: I(vp, {}),
                }),
            ],
        }),
    });
}
ad.render(I(pc.StrictMode, { children: I(yp, {}) }), document.getElementById('root'));
