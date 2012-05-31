if (typeof safari === 'undefined') {
    var zSafari = false;
} else {
    var zSafari = true;
}
var extPath = zSafari ? safari.extension.baseURI : chrome.extension.getURL('');
var options = {
    emailProvider: 'unset',
    smartMode: false,
    lazyLoad: false,
    showTn: true,
    hlNew: true,
    showAdTextChars: 0,
    hideNotificationTime: 0,
    tnMaxWidth: 300,
    tnMaxHeight: 100,
    tnMax: 6,
    imgMinWidth: 300,
    imgMinHeight: 300,
    imgMaxWidth: 500,
    imgMaxHeight: 500,
    adWidth: 880,
    mapWidth: 350,
    mapHeight: 350,
    highlightColor: 'FFFFD8',
    notesBgColor: 'E5FFE5',
    bodyWidth: 1280,
    autoExpandSearch: true,
    searchFormExpanded: false,
    excludeSig: false
};
var timeOut, blacklist = new Array();
var notification = null,
    newAlerts = new Array();
var db;
var userPos, sitesNearUser = [],
    userSite = {
        url: 'unset',
        lat: 0,
        lon: 0
    };
var nearSitesRadius = 300;
var debug = true;
var abPresent = false;
init();

function init() {
    initDb();
    readBlacklist();
    if (zSafari) {
        safari.application.addEventListener('message', safariMessageListener, true);
    } else {
        chrome.extension.onRequest.addListener(requestListener);
    }
    setupMonitor();
    addContextMenus();
    if (localStorage.options) {
        $.extend(options, JSON.parse(localStorage.options));
    }
    localStorage.options = JSON.stringify(options);
    window.addEventListener('storage', storageChanged, false);
    navigator.geolocation.getCurrentPosition(function(d) {
        userPos = d;
        getSitesNear(userPos.coords.latitude, userPos.coords.longitude, nearSitesRadius, function(e) {
            userSite = e[0];
            sitesNearUser = e;
        });
    });
    if (localStorage.clsites != 'inDb') {
        loadJsFile('site_locations.js');
    }
    _gaq.push(['_trackPageview', '/adblock_check']);
    var c = new Image();
    c.onload = function() {
        _gaq.push(['_trackPageview', '/adblock_plus']);
        abPresent = true;
        options.abPresent = abPresent;
    };
    var b = new Image();
    b.onload = function() {
        _gaq.push(['_trackPageview', '/adblock']);
        abPresent = true;
        options.abPresent = abPresent;
    };
    try {
        c.src = 'chrome-extension://cfhdojbkjhnklbpkdaibdccddilifddb/icons/abp-16.png';
        b.src = 'chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/img/icon16.png';
    } catch (a) {}
}
function storageChanged() {
    options = JSON.parse(localStorage.options);
    broadcastMessage({
        op: 'optionsUpdated',
        options: options
    });
}
function addContextMenus() {
    if (zSafari) {
        safari.application.addEventListener('contextmenu', a, false);

        function a(b) {
            if (b.userInfo) {
                b.contextMenu.appendContextMenuItem('zIgnorePhrase', 'Ignore Ads Containing Selected Phrase');
            }
        }
    } else {
        chrome.contextMenus.create({
            title: 'Ignore Ads Containing Selected Phrase',
            contexts: ['selection'],
            documentUrlPatterns: ['http://*.craigslist.org/*', 'http://*.craigslist.ca/*', 'http://*.craigslist.hk/*', 'http://*.craigslist.co.uk/*'],
            onclick: ignorePhrase
        });
        chrome.contextMenus.create({
            title: 'Do Not Show In Preview',
            contexts: ['image'],
            documentUrlPatterns: ['http://*.craigslist.org/*', 'http://*.craigslist.ca/*', 'http://*.craigslist.hk/*', 'http://*.craigslist.co.uk/*'],
            onclick: ignorePreviewImage
        });
    }
}
function initDb() {
    db = openDatabase('cl_helper', '0.01', 'Craigslist Helper', 5 * 1024 * 1024);
    db.transaction(function(a) {
        a.executeSql('CREATE TABLE IF NOT EXISTS starred(id INTEGER PRIMARY KEY ASC, adDate TEXT, title TEXT, price TEXT, loc TEXT, url TEXT, timeStamp INTEGER)', null, null, onDbError);
        a.executeSql('CREATE INDEX IF NOT EXISTS timeStamp ON starred (timeStamp)', null, null, onDbError);
        a.executeSql('CREATE TABLE IF NOT EXISTS ignored(id INTEGER PRIMARY KEY ASC, timeStamp INTEGER)', null, null, onDbError);
        a.executeSql('CREATE INDEX IF NOT EXISTS timeStamp ON ignored (timeStamp)', null, null, onDbError);
        a.executeSql('CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY ASC, note TEXT, adDate TEXT, title TEXT, price TEXT, loc TEXT, url TEXT, timeStamp INTEGER)', null, null, onDbError);
        a.executeSql('CREATE INDEX IF NOT EXISTS timeStamp ON notes (timeStamp)', null, null, onDbError);
        a.executeSql('CREATE TABLE IF NOT EXISTS blacklist(phrase TEXT PRIMARY KEY ASC, timeStamp INTEGER)', null, null, onDbError);
        a.executeSql('CREATE INDEX IF NOT EXISTS timeStamp ON blacklist (timeStamp)', null, null, onDbError);
        a.executeSql('CREATE TABLE IF NOT EXISTS monitor(url TEXT PRIMARY KEY ASC, active INTEGER DEFAULT 0, topAd INTEGER DEFAULT 0, title TEXT DEFAULT "", frequency INTEGER DEFAULT 0, time_unit INTEGER DEFAULT 0, check_at INTEGER DEFAULT 0, last_checked INTEGER, timeStamp INTEGER)', null, null, onDbError);
        a.executeSql('CREATE INDEX IF NOT EXISTS timeStamp ON monitor (timeStamp)', null, null, onDbError);
        a.executeSql('CREATE TABLE IF NOT EXISTS clsites(url TEXT PRIMARY KEY ASC, title TEXT NOT NULL, state TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL)', null, null, onDbError);
        a.executeSql('CREATE INDEX IF NOT EXISTS lat ON clsites (lat)', null, null, onDbError);
        a.executeSql('CREATE INDEX IF NOT EXISTS lon ON clsites (lon)', null, null, onDbError);
        var b = new Date().getTime() - 5184000000;
        a.executeSql('DELETE FROM ignored WHERE timeStamp < ' + b, null, null, onDbError);
        a.executeSql('DELETE FROM starred WHERE timeStamp < ' + b, null, null, onDbError);
        a.executeSql('DELETE FROM notes WHERE timeStamp < ' + b, null, null, onDbError);
        a.executeSql('DELETE FROM monitor WHERE active = 0 AND timeStamp < ' + b, null, null, onDbError);
        a.executeSql('SELECT * FROM clsites LIMIT 1', null, function(c, d) {
            if (d.rows.length == 0) {
                loadJsFile('site_locations.js');
            }
        }, onDbError);
    });
}
function readBlacklist() {
    db.readTransaction(function(a) {
        a.executeSql('SELECT phrase FROM blacklist', null, function(b, c) {
            var e = new Array();
            var d = c.rows.length;
            for (i = 0; i < d; i++) {
                e.push(c.rows.item(i).phrase);
            }
            blacklist = e;
        }, onDbError);
    });
}
function checkBlacklist(a) {
    for (i = 0; i < blacklist.length; i++) {
        if (a.match(new RegExp(blacklist[i], 'i'))) {
            return true;
        }
    }
    return false;
}
function checkForNewAdMulti(d) {
    function e(h, g, k) {
        g = g ? g : function() {};
        if (!h || !h.length) {
            return g(k);
        }
        var f = h.shift();
        var j = f.match(/\/(\d{8,})\.html/)[1];
        if (j * 1 <= d.topAd * 1) {
            return g(k);
        }
        $.get(f, function(l) {
            if (l.indexOf('page will be removed in just a few minutes') > 0) {
                e(h, g, k);
                return;
            }
            l = l.substring(l.indexOf('<h2>'));
            if (!checkBlacklist(l)) {
                console.log('New ad found: ' + j + ', oldTop: ' + d.topAd);
                newAlerts.push({
                    url: d.url,
                    title: d.title
                });
                if (notification == null) {
                    notification = webkitNotifications.createHTMLNotification(extPath + 'notification.html');
                    notification.onclose = function() {
                        notification = null;
                    };
                    notification.show();
                }
                return;
            }
            e(h, g, k);
        });
    }
    function b(f) {
        var g = f.match(/http:\/\/[^\/]+\/(.*)/)[1].replace(/index\d+\.html/, '').replace(/\&s=\d+/, '');
        g = g.replace(/^(search\/[^\/]+)\/[^?]+/, '$1');
        g = g.replace(/^[^\/]+\/([^\/]+\/)$/, '$1');
        g = g.replace(/#.*/, '');
        return g;
    }
    function c(h) {
        if (h.length == 0) {
            return;
        }
        var g = b(d.url);
        var f = h.shift();
        requestListener({
            op: 'getUrl',
            url: f.url + g
        }, null, function(j) {
            if (!j) {
                return;
            }
            j = j.replace(/Here are some from NEARBY areas[\s\S]*/, '');
            e(j.match(/http:\/\/[\/.a-zA-Z0-9]*\d{8,}\.html/g), c, h);
        });
    }
    if (d.url.indexOf('#sw') > 0) {
        var a = d.url.match(/#sw=(\d+)/)[1];
        requestListener({
            op: 'getNearbySites',
            url: d.url,
            radius: a
        }, null, c);
    } else {
        if (d.url.indexOf('#st') > 0) {
            requestListener({
                op: 'getStateSites',
                url: d.url
            }, null, c);
        } else {
            jQuery.get(d.url, function(f) {
                if (!f) {
                    return;
                }
                e(f.match(/http:\/\/[\/.a-zA-Z0-9]*\d{8,}\.html/g));
            });
        }
    }
    db.transaction(function(f) {
        f.executeSql('UPDATE monitor SET check_at = ? WHERE url = ?', [d.frequency * d.time_unit + new Date().getTime(), d.url], null, onDbError);
    });
    setupMonitor();
}
function checkMonitors(a) {
    console.log('Check Monitors : ' + new Date());
    var b = a ? 'SELECT url, title, topAd, frequency, time_unit FROM monitor WHERE active > 0 AND 0 < ?' : 'SELECT url, title, topAd, frequency, time_unit FROM monitor WHERE active > 0 AND check_at < ? ORDER BY check_at ASC';
    db.readTransaction(function(c) {
        c.executeSql(b, [new Date().getTime()], function(e, f) {
            var d = f.rows.length;
            if (d < 1) {
                setupMonitor();
                return;
            }
            for (var g = 0; g < d; g++) {
                console.log('Check for new ads');
                checkForNewAdMulti(f.rows.item(g));
            }
        }, onDbError);
    });
}
function setupMonitor() {
    if (timeOut) {
        clearTimeout(timeOut);
    }
    db.readTransaction(function(a) {
        a.executeSql('SELECT url, topAd, check_at, frequency, time_unit FROM monitor WHERE active > 0 ORDER BY check_at ASC LIMIT 1', null, function(b, c) {
            if (c.rows.length) {
                var d = c.rows.item(0);
                if (d.check_at <= new Date().getTime()) {
                    checkMonitors();
                } else {
                    timeOut = setTimeout(checkMonitors, Math.abs(d.check_at - new Date().getTime()));
                }
            }
        }, onDbError);
    });
}
function broadcastMessage(f) {
    if (zSafari) {
        var g = safari.application.browserWindows;
        for (var e = 0, a = g.length; e < a; e++) {
            var d = g[e].tabs;
            for (var c = 0, b = d.length; c < b; c++) {
                d[c].page.dispatchMessage('ziinkcl', f);
            }
        }
    } else {
        chrome.windows.getAll(null, function(h) {
            for (e = 0; e < h.length; e++) {
                chrome.tabs.getAllInWindow(h[e].id, function(j) {
                    for (c = 0; c < j.length; c++) {
                        chrome.tabs.sendRequest(j[c].id, f);
                    }
                });
            }
        });
    }
}
function ignorePhrase(a) {
    db.transaction(function(c) {
        var b = a.selectionText.toLowerCase().replace(/^\s+/, '').replace(/\s+$/, '');
        if (b == '') {
            return;
        }
        c.executeSql('REPLACE INTO blacklist VALUES(?,?)', [b, new Date().getTime()], null, onDbError);
        if (jQuery.inArray(b, blacklist) == -1) {
            blacklist.push(b);
        }
        broadcastMessage({
            op: 'ignorePhrase',
            phrases: [b]
        });
    });
}
function crc(b) {
    var a = 0;
    for (i = 0; i < b.length; i++) {
        var d = b.charCodeAt(i);
        a += d;
        if (a < 0) {
            a <<= 1;
            a += 1;
        } else {
            a <<= 1;
        }
    }
    return a;
}
function ignorePreviewImage(a) {
    var b = b(a.srcUrl);
}
function onDbError(a, b) {
    console.log('Database Error: ' + b.message);
}
function getSiteLocation(a, b) {
    if (a.indexOf('http://') != 0 || a[a.length - 1] != '/') {
        console.log('url sent to getSiteLocation should begin http:// and contain the trailing slash.');
        return;
    }
    db.readTransaction(function(c) {
        c.executeSql('SELECT * FROM clsites WHERE url = ?', [a], function(d, e) {
            if (e.rows.length) {
                b(e.rows.item(0));
            }
        }, onDbError);
    });
}
function getSitesNear(k, b, a, d) {
    var c = 69.04;
    var j = c * Math.cos(k * 0.0174532925199433);
    var f = k - a / c;
    var e = k + a / c;
    var h = b - a / j;
    var g = b + a / j;
    db.readTransaction(function(l) {
        l.executeSql('SELECT * FROM clsites WHERE lat > ? AND lat < ? AND lon > ? AND lon < ?', [f, e, h, g], function(n, o) {
            var r = [];
            var m = o.rows.length;
            if (m) {
                for (var q = 0; q < m; q++) {
                    var p = o.rows.item(q);
                    var s = calculateDistance(p.lat, p.lon, k, b);
                    if (s > a) {
                        continue;
                    }
                    p.distance = s;
                    r.push(p);
                }
                r.sort(function(u, t) {
                    return u.distance - t.distance;
                });
                d(r);
            }
        }, onDbError);
    });
}
function calculateDistance(f, j, e, h) {
    var g = 3958.755;
    var l = (e - f) * Math.PI / 180;
    var b = (h - j) * Math.PI / 180;
    var n = Math.sin(l / 2) * Math.sin(l / 2) + Math.cos(f * Math.PI / 180) * Math.cos(e * Math.PI / 180) * Math.sin(b / 2) * Math.sin(b / 2);
    var m = 2 * Math.atan2(Math.sqrt(n), Math.sqrt(1 - n));
    var k = g * m;
    return k;
}
function loadJsFile(a) {
    var b = document.createElement('script');
    b.setAttribute('type', 'text/javascript');
    b.setAttribute('src', a);
    document.getElementsByTagName('head')[0].appendChild(b);
}
function loadCssFile(a) {
    var b = document.createElement('link');
    b.setAttribute('rel', 'stylesheet');
    b.setAttribute('type', 'text/css');
    b.setAttribute('href', a);
    document.getElementsByTagName('head')[0].appendChild(b);
}
function loadJsCssFile(a, b) {
    if (b == 'js') {
        var c = document.createElement('script');
        c.setAttribute('type', 'text/javascript');
        c.setAttribute('src', a);
    } else {
        if (b == 'css') {
            var c = document.createElement('link');
            c.setAttribute('rel', 'stylesheet');
            c.setAttribute('type', 'text/css');
            c.setAttribute('href', a);
        }
    }
    if (typeof c != 'undefined') {
        document.getElementsByTagName('head')[0].appendChild(c);
    }
}
function safariMessageListener(a) {
    if (a.name == 'ziinkcl') {
        requestListener(a.message, null, function(b) {
            if (a.message.responseFunc != undefined) {
                a.target.page.dispatchMessage('ziinkcl_response', {
                    responseFunc: a.message.responseFunc,
                    data: b
                });
            }
        });
    }
}
function requestListener(g, h, d) {
    switch (g.op) {
    case 'putNote':
        db.transaction(function(e) {
            if ('' == g.note) {
                e.executeSql('DELETE FROM notes WHERE id = ?', [g.id], null, onDbError);
            } else {
                e.executeSql('REPLACE INTO notes VALUES(?, ?, ?, ?, ?, ?, ?, ?)', [g.id, g.note, g.date, g.title, g.price, g.loc, g.url, new Date().getTime()], null, onDbError);
            }
            broadcastMessage({
                op: 'noteUpdated',
                id: g.id,
                note: g.note
            });
        });
        d();
        break;
    case 'getNote':
        db.readTransaction(function(e) {
            e.executeSql('SELECT note FROM notes WHERE id = ?', [g.id], function(m, n) {
                if (n.rows.length) {
                    d(n.rows.item(0).note);
                } else {
                    d();
                }
            }, onDbError);
        });
        break;
    case 'getIgnored':
        db.readTransaction(function(e) {
            var n = '(';
            for (var m = 0; m < g.ids.length; m++) {
                n += g.ids[m] + ',';
            }
            n += '0)';
            e.executeSql('SELECT id FROM ignored WHERE id IN ' + n, null, function(o, p) {
                var r = new Array();
                var q = p.rows.length;
                for (m = 0; m < q; m++) {
                    r.push(p.rows.item(m).id);
                }
                d(r);
            }, onDbError);
        });
        break;
    case 'ignore':
        db.transaction(function(e) {
            e.executeSql('REPLACE INTO ignored VALUES(?,?)', [g.id, new Date().getTime()], null, onDbError);
        });
        d();
        break;
    case 'removeIgnore':
        db.transaction(function(e) {
            e.executeSql('DELETE FROM ignored WHERE id = ?', [g.id], null, onDbError);
        });
        d();
        break;
    case 'getStarredIds':
        db.readTransaction(function(e) {
            var n = '(';
            for (var m = 0; m < g.ids.length; m++) {
                n += g.ids[m] + ',';
            }
            n += '0)';
            e.executeSql('SELECT id FROM starred WHERE id IN ' + n, null, function(p, q) {
                var o = new Array();
                var r = q.rows.length;
                for (m = 0; m < r; m++) {
                    o.push(q.rows.item(m).id);
                }
                d(o);
            }, onDbError);
        });
        break;
    case 'getStarred':
        db.readTransaction(function(e) {
            e.executeSql('SELECT * FROM starred ORDER BY id DESC', null, function(m, n) {
                var p = new Array();
                var o = n.rows.length;
                for (i = 0; i < o; i++) {
                    p.push(n.rows.item(i));
                }
                d(p);
            }, onDbError);
        });
        break;
    case 'star':
        db.transaction(function(e) {
            var m = g.info;
            e.executeSql('REPLACE INTO starred VALUES(?,?,?,?,?,?,?)', [m.id, m.date, m.title, m.price, m.loc, m.url, new Date().getTime()], null, onDbError);
        });
        d();
        break;
    case 'removeStar':
        db.transaction(function(e) {
            e.executeSql('DELETE FROM starred WHERE id = ?', [g.id], null, onDbError);
        });
        d();
        break;
    case 'getNotes':
        db.readTransaction(function(e) {
            var m = 0;
            e.executeSql('SELECT * FROM notes ORDER BY timeStamp DESC LIMIT 101 OFFSET ?', [m], function(n, o) {
                var q = new Array();
                var p = o.rows.length;
                for (i = 0; i < p; i++) {
                    q.push(o.rows.item(i));
                }
                d(q);
            }, onDbError);
        });
        break;
    case 'getBlacklist':
        d(blacklist);
        break;
    case 'removeBlacklistItem':
        var a = jQuery.inArray(g.phrase, blacklist);
        if (a > -1) {
            blacklist.splice(a, 1);
        }
        db.transaction(function(e) {
            e.executeSql('DELETE FROM blacklist WHERE phrase = ?', [g.phrase], null, onDbError);
        });
        d();
        break;
    case 'addIgnorePhrase':
        ignorePhrase({
            selectionText: g.text
        });
        d();
        break;
    case 'monitorInfo':
        db.transaction(function(e) {
            e.executeSql('SELECT * FROM monitor WHERE url = ?', [g.url], function(n, p) {
                var m = p.rows.length > 0;
                var o = null;
                if (m) {
                    o = p.rows.item(0);
                }
                if (g.update) {
                    if (m) {
                        n.executeSql('UPDATE monitor SET topAd = ?, timeStamp = ? WHERE url = ?', [g.topAd, new Date().getTime(), g.url], null, onDbError);
                    } else {
                        n.executeSql('REPLACE INTO monitor (url, title, topAd, timeStamp) VALUES(?,?,?,?)', [g.url, g.title, g.topAd, new Date().getTime()], null, onDbError);
                    }
                }
                d(o);
            }, onDbError);
        });
        break;
    case 'setMonitor':
        db.transaction(function(e) {
            var n = new Date().getTime();
            var m = g.frequency * g.timeUnit + n;
            e.executeSql('REPLACE INTO monitor (url, topAd, active, title, frequency, time_unit, check_at, last_checked, timeStamp) VALUES(?,?,?,?,?,?,?,?,?)', [g.url, g.topAd, g.active, g.title, g.frequency, g.timeUnit, m, n, n], function() {
                setupMonitor();
            }, onDbError);
        });
        d();
        break;
    case 'deactivateMonitor':
        db.transaction(function(e) {
            e.executeSql('UPDATE monitor SET active = 0 WHERE url = ?', [g.url], function() {
                setupMonitor();
            }, onDbError);
        });
        d();
        break;
    case 'getMonitors':
        db.readTransaction(function(e) {
            e.executeSql('SELECT url, title, frequency, time_unit FROM monitor WHERE active > 0 ORDER BY title ASC', null, function(n, o) {
                if (o.rows.length) {
                    var p = new Array();
                    var m = o.rows.length;
                    for (i = 0; i < m; i++) {
                        p.push(o.rows.item(i));
                    }
                    d(p);
                } else {
                    d();
                }
            }, onDbError);
        });
        break;
    case 'checkMonitors':
        checkMonitors(true);
        break;
    case 'getSearches':
        db.readTransaction(function(e) {
            e.executeSql('SELECT url, active, title, timeStamp FROM monitor ORDER BY timeStamp DESC LIMIT 100', null, function(n, o) {
                if (o.rows.length) {
                    var p = new Array();
                    var m = o.rows.length;
                    for (i = 0; i < m; i++) {
                        p.push(o.rows.item(i));
                    }
                    d(p);
                } else {
                    d();
                }
            }, onDbError);
        });
        break;
    case 'removeSearchItem':
        if (g.url) {
            db.transaction(function(e) {
                e.executeSql('DELETE FROM monitor WHERE url = ?', [g.url], null, onDbError);
            });
        }
        break;
    case 'getAlerts':
        d(newAlerts);
        newAlerts = new Array();
        break;
    case 'closeNotification':
        notification.cancel();
        d();
        break;
    case 'getOptions':
        d(options);
        break;
    case 'getNearbySites':
        var b = g.url.match(/http:\/\/[^\/]+\//)[0];
        b.replace('.en.craigslist', '.craigslist').replace('.es.craigslist', '.craigslist');
        if (b == userSite.url && !g.radius) {
            d(sitesNearUser.slice(0));
            break;
        }
        var j = g.radius ? g.radius : nearSitesRadius;
        if (b == userSite.url) {
            getSitesNear(userSite.lat, userSite.lon, j, function(e) {
                d(e);
            });
        } else {
            getSiteLocation(b, function(e) {
                getSitesNear(e.lat, e.lon, j, function(m) {
                    d(m);
                });
            });
        }
        break;
    case 'getStateSites':
        var b = g.url.match(/http:\/\/[^\/]+\//)[0];
        b.replace('.en.craigslist', '.craigslist').replace('.es.craigslist', '.craigslist');
        getSiteLocation(b, function(e) {
            db.readTransaction(function(m) {
                m.executeSql('SELECT * FROM clsites WHERE state = ?', [e.state], function(o, p) {
                    var s = [];
                    var n = p.rows.length;
                    if (n) {
                        for (var r = 0; r < n; r++) {
                            var q = p.rows.item(r);
                            s.push(q);
                        }
                        d(s);
                    }
                }, onDbError);
            });
        });
        break;
    case 'getUrl':
        try {
            $.ajax({
                url: g.url,
                success: function(e) {
                    d(e);
                },
                error: function() {
                    d(null);
                }
            });
        } catch (l) {
            console.log('Caught an exception on getUrl');
            d(null);
        }
        break;
    case 'optionsUpdated':
        options = JSON.parse(localStorage.options);
        options.abPresent = abPresent;
        break;
    case 'saveOptions':
        options = g.options;
        localStorage.options = JSON.stringify(options);
        break;
    case 'saveLocalStorage':
        localStorage[g.key] = JSON.stringify(g.data);
        break;
    case 'getLocalStorage':
        if (localStorage[g.key]) {
            d(JSON.parse(localStorage[g.key]));
        }
        break;
    case 'openOptionsTab':
        if (zSafari) {
            var f = safari.application.activeBrowserWindow.openTab();
            f.url = extPath + 'options.html';
        } else {
            chrome.tabs.create({
                url: extPath + 'options.html'
            });
        }
        break;
    case 'sendMail':
        sendHotmail(g, d);
        return;
        var k = 'https://mail.google.com/mail/h/' + Math.random() + '/';
        var c = k + '?v=b&pv=tl&cs=b';
        $.ajax({
            url: c,
            success: function(m) {
                if (m.indexOf('<form id="gaia_loginform"') > 0) {
                    d({
                        status: 'Not logged in. Please log into your webmail provider and try again.'
                    });
                    return;
                }
                console.log(m);
                var e = m.match(/<form action="\?(v=b&fv=[^\"]+)/);
                if (e.length == 0) {
                    d({
                        status: 'Unknown Problem'
                    });
                    return;
                }
                $.ajax({
                    url: k + '?' + e[1],
                    type: 'POST',
                    data: {
                        redir: '?',
                        nvp_bu_send: 'Send',
                        to: 'ziinkaddon@gmail.com',
                        subject: g.subject,
                        body: g.body
                    },
                    success: function(n) {
                        console.log(n);
                        d({
                            status: 'Success'
                        });
                    },
                    error: function() {
                        d({
                            status: 'Network Problem'
                        });
                    }
                });
            },
            error: function() {
                d({
                    status: 'Network Problem'
                });
            }
        });
        break;
    case 'openMailTab':
        chrome.tabs.create({
            url: g.url
        });
        break;
    case 'test':
        console.log(g.msg);
        d();
        break;
    default:
        d();
        break;
    }
}
function sendYahooMail(c, a) {
    var b = 'http://us.mg1.mail.yahoo.com/mc/';
    var d = b + 'compose?&ymv=0&.rand=' + Math.random();
    $.ajax({
        url: d,
        success: function(j) {
            if (j.indexOf('action="https://login.yahoo.com/config/login?"') > 0) {
                a({
                    status: 'Not logged in. Please log into Yahoo! Mail and try again.'
                });
                return;
            }
            var e = j.match(/value="([^"]+)" name="mcrumb/);
            if (e.length == 0) {
                a({
                    status: 'Unknown Problem'
                });
                return;
            }
            var f = e[1];
            e = j.match(/value="({&quot;[^"]+)" name="fromAddresses/);
            var g = e[1];
            e = j.match(/value="([^"]+)" name="defFromAddress/);
            var h = e[1];
            e = j.match(/"(compose\?&ymv=0&.rand=[^"]+)/);
            var k = b + e[1];
            $.ajax({
                url: k,
                type: 'POST',
                data: {
                    cmd: 'mask',
                    jsonEmails: '',
                    attachment: '',
                    msgFlag: 'compose',
                    startMid: '',
                    sMid: '0',
                    psize: '',
                    nextMid: '',
                    prevMid: '',
                    fid: 'Inbox',
                    mid: '',
                    oFid: '',
                    oMid: '',
                    sort: '',
                    filterBy: '',
                    order: '',
                    msgID: '',
                    ymcjs: '0',
                    signatureAdded: '1',
                    sUseRichText: 'plain',
                    sReplyToAddress: '',
                    mcrumb: f,
                    embstyle: '',
                    st_desc: '',
                    showBcc: 'false',
                    fromAddresses: g.replace(/&quot;/g, '"'),
                    defFromAddress: h,
                    to: 'ziinkaddon@gmail.com',
                    cc: '',
                    bcc: '',
                    Subj: c.subject,
                    toggleRTE: '1',
                    Content: c.body,
                    action_msg_send: 'Send'
                },
                success: function(l) {
                    console.log(l);
                    a({
                        status: 'Success'
                    });
                },
                error: function() {
                    a({
                        status: 'Network Problem'
                    });
                }
            });
        },
        error: function() {
            a({
                status: 'Network Problem'
            });
        }
    });
}
function sendHotmail(d, a) {
    function b() {
        a({
            status: 'Network Problem'
        });
    }
    function f(l) {
        var j = l.match(/rurl:"([^"]+)/);
        if (j.length == 0) {
            a({
                status: 'Unknown Problem'
            });
        } else {
            var k = j[1];
            h = k.replace('ext', '_ec');
            $.ajax({
                url: k,
                success: g,
                error: b
            });
        }
    }
    function g(m) {
        var l = m.match(/&mt=([^"]{80,})/);
        if (l.length == 0) {
            a({
                status: 'Unknown Problem'
            });
            return;
        }
        var j = unescape(l[1]);
        var k = m.match(/"fFrom" value="([^"]+)/)[1].replace('&#64;', '@');
        $.ajax({
            url: h,
            type: 'POST',
            data: {
                __VIEWSTATE: '',
                mt: j,
                MsgPriority: '0',
                ToolbarActionItem: 'SendMessage',
                folderCache: '00000000-0000-0000-0000-000000000001/1/Inbox/1:00000000-0000-0000-0000-000000000005/0/Junk/1:00000000-0000-0000-0000-000000000004/1/Drafts/1:00000000-0000-0000-0000-000000000003/0/Sent/1:00000000-0000-0000-0000-000000000002/0/Deleted/1',
                categoriesCache: '3/0:4/0:7/0:9/0',
                SkyDriveLibrary: '',
                fMsgSentState: 'NOACTION',
                IsSpellChecked: 'false',
                fFrom: k,
                cpselectedAutoCompleteTo: '[;;ziinkaddon%26%2364%3Bgmail.com;false;false;0]',
                fTo: '"" <ziinkaddon@gmail.com>;',
                cpselectedAutoCompleteCc: '',
                fCc: '',
                cpselectedAutoCompleteBcc: '',
                fBcc: '',
                fSubject: d.subject,
                fAttachments_data: '',
                isFirstPL: '',
                RTE_MessageType: 'RichText',
                fMessageBody: d.body
            },
            success: function(n) {
                console.log(n);
                a({
                    status: 'Success'
                });
            },
            error: b
        });
    }
    var c = 'http://mail.live.com/default.aspx?rru=compose';
    var h = '';
    $.ajax({
        url: c,
        success: f,
        error: b
    });
    return;
    var e = c;
    $.ajax({
        url: e,
        success: function(n) {
            if (n.indexOf('action="https://login.yahoo.com/config/login?"') > 0) {
                a({
                    status: 'Not logged in. Please log into Yahoo! Mail and try again.'
                });
                return;
            }
            var j = n.match(/value="([^"]+)" name="mcrumb/);
            if (j.length == 0) {
                a({
                    status: 'Unknown Problem'
                });
                return;
            }
            var k = j[1];
            j = n.match(/value="({&quot;[^"]+)" name="fromAddresses/);
            var l = j[1];
            j = n.match(/value="([^"]+)" name="defFromAddress/);
            var m = j[1];
            j = n.match(/"(compose\?&ymv=0&.rand=[^"]+)/);
            var o = c + j[1];
            $.ajax({
                url: o,
                type: 'POST',
                data: {
                    cmd: 'mask',
                    jsonEmails: '',
                    attachment: '',
                    msgFlag: 'compose',
                    startMid: '',
                    sMid: '0',
                    psize: '',
                    nextMid: '',
                    prevMid: '',
                    fid: 'Inbox',
                    mid: '',
                    oFid: '',
                    oMid: '',
                    sort: '',
                    filterBy: '',
                    order: '',
                    msgID: '',
                    ymcjs: '0',
                    signatureAdded: '1',
                    sUseRichText: 'plain',
                    sReplyToAddress: '',
                    mcrumb: k,
                    embstyle: '',
                    st_desc: '',
                    showBcc: 'false',
                    fromAddresses: l.replace(/&quot;/g, '"'),
                    defFromAddress: m,
                    to: 'ziinkaddon@gmail.com',
                    cc: '',
                    bcc: '',
                    Subj: d.subject,
                    toggleRTE: '1',
                    Content: d.body,
                    action_msg_send: 'Send'
                },
                success: function(p) {
                    console.log(p);
                    a({
                        status: 'Success'
                    });
                },
                error: function() {
                    a({
                        status: 'Network Problem'
                    });
                }
            });
        },
        error: function() {
            a({
                status: 'Network Problem'
            });
        }
    });
}
function log(a) {
    if (debug) {
        console.log(a);
    }
}
if (zSafari) {
    safari.application.addEventListener('command', commandListener, false);

    function commandListener(b) {
        if (b.command === 'tbbClHelper') {
            var a = safari.application.activeBrowserWindow.openTab();
            a.url = extPath + 'options.html';
        } else {
            if (b.command === 'zIgnorePhrase') {
                var c = b.userInfo.ziinkSel.replace(/\s+$/, '');
                ignorePhrase({
                    selectionText: c
                });
            }
        }
    }
}
