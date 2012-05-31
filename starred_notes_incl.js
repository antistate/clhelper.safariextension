/* (c) 2011 Ziink */
if (typeof safari === "undefined") {
    var zSafari = false
} else {
    var zSafari = true
}
if (zSafari) {
    var responseFuncs = [];
    var chrome = {
        extension: {
            sendRequest: function (b, a) {
                if (a) {
                    var c = responseFuncs.indexOf(a);
                    if (c == -1) {
                        c = responseFuncs.length;
                        responseFuncs.push(a)
                    }
                    b.responseFunc = c
                }
                safari.self.tab.dispatchMessage("ziinkcl", b)
            }
        }
    }
}
var options;
init();

function init() {
    options = JSON.parse(localStorage.options);
    document.body.style.cssText = "max-width: " + options.bodyWidth + "px; background-color: lightgray; margin-left: auto; margin-right: auto;";
    modifyJEditable();
    $("body").css("visibility", "visible")
}
function processListings() {
    var a = new Array();
    $("a[href$='.html'],a[href*='&n=']", document).each(function (b) {
        var c = adnumFromUrl(this.href);
        a.push(c);
        doLink(this, c)
    });
    if (a.length) {
        chrome.extension.sendRequest({
            op: "getStarredIds",
            ids: a
        }, function (b) {
            $("a[href$='.html'],a[href*='&n=']", document).each(function (c) {
                var d = adnumFromUrl(this.href);
                if (b.length && jQuery.inArray(parseInt(d), b) >= 0) {
                    $(this).parents("P:first").addClass("ziink_starred").children(".zStarIcon")[0].src = extPath + "images/gold_star_16.png"
                }
            })
        })
    }
}
function addRow(b) {
    var c = b.id;
    var a = $('<p class="row">' + b.adDate + ' - <a href="' + b.url + '">' + b.title + "</a> - " + b.price + ' <font size="-1">' + b.loc + "</font><br /></p>").appendTo("#content").children("a")[0]
}
function getListings(a) {
    chrome.extension.sendRequest({
        op: a
    }, function (c) {
        for (var b = 0; b < c.length; b++) {
            var d = c[b];
            addRow(d)
        }
        processListings()
    })
}
if (zSafari) {
    safari.self.addEventListener("message", safariMessageListener, true);

    function safariMessageListener(a) {
        if (a.name == "ziinkcl") {
            requestListener(a.message, null, function (b) {
                if (b && a.message.responseFunc != undefined) {
                    safari.self.tab.dispatchMessage("ziinkcl_response", {
                        responseFunc: a.message.responseFunc,
                        data: b
                    })
                }
            })
        } else {
            if (a.name == "ziinkcl_response") {
                responseFuncs[a.message.responseFunc](a.message.data)
            }
        }
    }
} else {
    chrome.extension.onRequest.addListener(requestListener)
}
function requestListener(c, b, a) {
    switch (c.op) {
    case "noteUpdated":
        if (c.note != "") {
            $("#" + c.id).html(c.note.replace(/\n/g, "<br>\n"))
        } else {
            $("#" + c.id).hide()
        }
        a();
        break
    }
};