/* (c) 2011 Ziink */

function init() {
    injectCssFile(extPath + "cl_helper.css", document);
    if (zSafari) {
        safari.self.addEventListener("message", safariMessageListener, true)
    } else {
        chrome.extension.onRequest.addListener(requestListener)
    }
    chrome.extension.sendRequest({
        op: "getLocalStorage",
        key: "hideAdsTill"
    }, function (a) {
        if (a) {
            hideAdsTill = a
        }
    });
    chrome.extension.sendRequest({
        op: "getOptions"
    }, function (a) {
        options = a;
        useOptions();
        init2()
    });
    modifyJEditable();
    $("blockquote > p").addClass("row")
}
function init2() {
    try {
        //loadJsFile(extPath + "gan.js");
        if (location.href.search(/\/forums\/\?/) > 0) {
            inForum()
        } else {
            if (location.href.search(/\/\d+\.html$/) >= 0) {
                inAdPage()
            } else {
                if (location.href == ("http://" + location.host + "/")) {
                    inHomePage()
                } else {
                    if (location.href == ("https://" + location.host + "/")) {
                        showBasicTopbar()
                    } else {
                        if (location.protocol == "https:") {
                            inPostPage()
                        } else {
                            if ($("body.toc").length == 1) {
                                inListingPage()
                            }
                        }
                    }
                }
            }
        }
    } catch (a) {
        console.log("Exeption: " + a.message)
    } finally {
        $("body").css("visibility", "visible")
    }
}
function useOptions() {
    if (window !== top) {
        return
    }
    if (document.body.tagName == "FRAMESET") {
        return
    }
    if (options.bodyWidth) {
        document.body.style.cssText = "max-width: " + options.bodyWidth + "px; background-color: lightgray; margin-left: auto; margin-right: auto;";
        if ($("body.toc").length == 1) {
            $("body blockquote").css({
                "background-color": "white",
                "border-radius": "10px",
                margin: "20px 10px 10px 10px",
                padding: "20px"
            })
        } else {
            $("body").append('<div style="clear:both;"></div>');
            $("body").wrapInner('<div id="bodyWrapper" style="min-height:' + (document.body.scrollHeight - 70) + '"/>')
        }
    }
    if (options.showTn) {
        $(".p").remove();
        $(".ih").remove();
        $(".i").remove()
    }
}
function inAdPage() {
    showBasicTopbar();
    var h = adnumFromUrl(location.href);
    if ($("#userbody").length == 0) {
        return
    }
    $("#userbody").html($("#userbody").html().replace(/\b\d{3}\D{1,2}\d{3}\D{1,2}\d{4}\b|\b\d{3}\D{1,2}\d{7}\b/g, '<span style="background-color: yellow;"><a href=\'http://www.google.com/search?hl=en&safe=off&q="$&"+-intitle%3Aphone+-intitle%3Areverse+-intitle%3Aowner+-intitle%3Alookup+-intitle%3Atrack+-0000+-xxxx\'>$&</a></span>'));
	
    $("#tsb").addClass("zHiddenElem").hide();
    $("#flagMsg").addClass("zHiddenElem").hide();
    $("#flags").addClass("zHiddenElem").hide();
    $("sup").addClass("zHiddenElem").hide();
    var d = location.href.replace(/([a-z]\/).*/, "$1");
    $('<div style="position: absolute; right: 0; margin-right: 20px;"><a id="zShowHidden" href="#"><img src="' + extPath + 'images/show.png"></a></div>').insertBefore("hr:last");
    $("#zShowHidden").click(function () {
        $("#zNewFlags").toggle();
        $(".zHiddenElem").toggle();
        return false
    });
    chrome.extension.sendRequest({
        op: "getNote",
        id: h
    }, function (i) {
        if (!i) {
            i = ""
        }
        makeEditable($("<div class='ziink_top_note' id='" + h + "' style='background-color: #" + options.notesBgColor + "; border-color: " + darkerColor(options.notesBgColor, 0.2) + "'>" + i.replace(/\n/g, "<br>\n") + "</div>").insertAfter(".bchead"))
    });
    if ($("#reply").length) {
        $("#reply").parent().mouseenter(function (i) {
            if ($("#reply").length == 0 && $("#repCapt").length == 0) {
                $(this).unbind();
                setupEmailLinkDom(document)
            }
        })
    } else {
        if (options.emailProvider != "none") {
            setupEmailLinkDom(document)
        }
    }
    var e = $('<div id="ziinkBottomBar"><a href="http://ziink.com" style="margin-right: 5px"><img src="' + extPath + 'images/peace_icon_s.png"> Craigslist Helper</a> It took weeks to develop this extension, but it will take only seconds to <iframe src="http://www.facebook.com/plugins/like.php?href=http%3A%2F%2Fwww.facebook.com%2Fpages%2FCraigslist-Helper-Browser-Extension%2F218753694806954&amp;layout=button_count&amp;show_faces=true&amp;width=90&amp;action=recommend&amp;font&amp;colorscheme=light&amp;height=21" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:90px; height:21px; position: relative; top: 3px" allowTransparency="true"></iframe> it. Please spread the word.</div>').appendTo("#bodyWrapper");
    $("body").next("style").remove();
    if (location.href.search(/cas|stp|w4w|w4m|m4w|m4m|msr|mis|rnr/) < 0 && hideAdsTill < new Date().getTime()) {
        var g = encodeURIComponent($("title").text());
        var c = $("#userbody").text().replace(/Location:[\s\S]*/, "");
        if (c.length > 5555) {
            c = c.substr(0, 5555)
        }
        c = encodeURIComponent(c);
        var f = $("h2:first").text();
        var b = f.match(/\((.+)\)/);
        f = (b && b.length) ? encodeURIComponent(b[1]) : "";
        var a = encodeURIComponent($(".bchead > a:last").text());
        $("#hideZAdsForHour_1").click(function () {
            $(this).parent().hide();
            chrome.extension.sendRequest({
                op: "saveLocalStorage",
                key: "hideAdsTill",
                data: new Date().getTime() + 60 * 1000 * 60
            })
        })
    }
    adPageFlagsAndIcons(d, h)
}
function hideAdString() {
    if (hideAdsTill < (new Date().getTime() - (23 * 60 * 60 * 1000))) {
        return ""
    } else {
        return ""
    }
}
function inPostPage() {
    showBasicTopbar();
    if ($("textarea.req").length) {
        injectJs("var CKEDITOR_BASEPATH = '" + extPath + "' + 'ckeditor/';");
        loadJsFile(extPath + "ckeditor/ckeditor.js");
        loadJsFile(extPath + "ckedit.js")
    }
}
function inHomePage() {
    showBasicTopbar()
}
function initializeListingPage() {
    isListing = true;
    chrome.extension.sendRequest({
        op: "getBlacklist"
    }, function (c) {
        blacklist = c
    });
    $("#hoodtitle").click(function () {
        $("#nh").css("z-index", "500")
    });
    addMultiSiteSearch();
    chrome.extension.sendRequest({
        op: "getNearbySites",
        url: location.href
    }, function (j) {
        if (j && j.length > 1) {
            var h = Math.floor((j[1].distance + 10) / 10) * 10;
            $("#slider").slider("option", "min", h);
            if ($("#searchRadius").val() < h) {
                $("#searchRadius").val(h)
            }
        }
        var e = j.shift();
        if ($("#satabs").length == 0) {
            var d = $('<div id="satabs"></div>').appendTo($(".bchead"));
            d.append("<b>" + e.title + "</b>")
        } else {
            var d = $("#satabs")
        }
        var g = getUrlQueryPart();
        for (var f = 0, c = j.length; f < c; f++) {
            if (f >= 7) {
                break
            }
            d.append('<a href="' + j[f].url + g + '">' + j[f].title + "</a>")
        }
    });
    $("#searchfieldset").prepend("<div class=\"search_tip\"><b>CL Helper Search Tip:</b> To exclude ads that contain a term, precede the exclusion terms with a '-'. For example: <b>ford -rebuilt -accident</b> will find all ads that contain <b>ford</b> but DO NOT contain <b>rebuilt</b> or <b>accident</b>. </div>");
    var b = $('<div class="ziink_topBar"><div class="ziink_topStatus"><div style="position: absolute; right: 0; margin-right: 10px;"><a href="http://ziink.com" style="margin-right: 5px"><img src="' + extPath + 'images/peace_icon_s.png"></a> <iframe src="http://www.facebook.com/plugins/like.php?href=http%3A%2F%2Fwww.facebook.com%2Fpages%2FCraigslist-Helper-Browser-Extension%2F218753694806954&amp;layout=button_count&amp;show_faces=true&amp;width=90&amp;action=like&amp;font&amp;colorscheme=light&amp;height=21" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:90px; height:21px; position: relative; top: 3px" allowTransparency="true"></iframe>&nbsp;&nbsp;<span title="Improve performance by using on-demand previews for some pages. Overrides pre-fetch & thumbnail settings." ><label for="zSmartMode">Smart Mode:</label><input type="checkbox" id="zSmartMode" /></span>  &nbsp;&nbsp;&nbsp;&nbsp;<span title="Toggle display of hidden ads" id="zIgnoredStatus"><label for="zShowHidden" id="zShowHiddenLabel">Show Hidden Ads (0):</label><input type="checkbox" id="zShowHidden" /></span>  &nbsp;&nbsp;&nbsp;&nbsp;<span title="Set alert for new ads" id="zAlertStatus"><label for="zAlert">Alert:</label><input type="checkbox" id="zAlert" /></span>&nbsp;&nbsp;&nbsp;&nbsp;<span id="zMenuHover">Menu</span></div><div><a href="/" style="margin-right: 15px"><img src="' + extPath + 'images/clfavicon.png"></a>  <span id="zExpandMsg" title="Click to show search form by default." ><img src="' + extPath + 'images/arrow-down.png"> Expand Search Form</span><span id="zCollapseMsg" title="Click to hide search form by default." style="display: none;"><img src="' + extPath + 'images/arrow-up.png"> Collapse Search Form</span></div></div><div id="zMenuBar"><a class="zMenu" href="' + extPath + 'notes.html" target="_blank">Notes</a><a class="zMenu" href="' + extPath + 'starred.html" target="_blank">Starred</a><a class="zMenu" href="' + extPath + 'blacklist.html" target="_blank">Blacklist</a><a class="zMenu" href="' + extPath + 'monitors.html" target="_blank">Alerts</a><a class="zMenu" href="' + extPath + 'recentsearches.html" target="_blank">Recent Searches</a><a class="zMenu" href="' + extPath + 'options.html" target="_blank">Options</a></div><div id="zAlertBox"><span style="color: orange; font-weight: bold; font-size: 12pt;" id="zSaveMsg"></span>&nbsp;&nbsp;&nbsp;<label for="zAlertTitle">Alert Name:</label><input type="text" id="zAlertTitle" size="30" value="1" />&nbsp;&nbsp;&nbsp;<label for="zAlertFrequency">Check Every:</label><input type="text" id="zAlertFrequency" size="1" maxlength="2" value="1" />&nbsp;&nbsp;&nbsp;<label for="min">Min</label><input type="radio" id="min" name="timeUnit" value="60000">&nbsp;&nbsp;&nbsp;<label for="hour">Hour</label><input type="radio" id="hour" name="timeUnit" value="3600000">&nbsp;&nbsp;&nbsp;<label for="day">Day</label><input type="radio" id="day" name="timeUnit" checked value="86400000">&nbsp;&nbsp;&nbsp;<img src="' + extPath + 'images/save_icon_24.png" id="zAlertSaveBtn" alt="Save Changes" title="Save Changes"></div><div id="zSearchContainer" style="display: none;"></div></div>').prependTo("body");
    $("div.bchead").detach().appendTo("#zSearchContainer");
    $("blockquote:first").detach().appendTo("#zSearchContainer");
    $("blockquote > table").detach().appendTo("#zSearchContainer");
    $("#zMenuHover").mouseenter(function () {
        $("#zMenuBar").show()
    });
    $("#zMenuBar").mouseleave(function () {
        $("#zMenuBar").hide()
    });
    $("#zExpandMsg").click(function () {
        $("#zSearchContainer").show();
        $("#zExpandMsg").hide();
        $("#zCollapseMsg").show();
        $("#zSearchContainer").unbind("mouseleave");
        options.searchFormExpanded = true;
        chrome.extension.sendRequest({
            op: "saveOptions",
            options: options
        })
    });
    $("#zCollapseMsg").click(function () {
        $("#zCollapseMsg").hide();
        $("#zExpandMsg").show();
        $("#zSearchContainer").hide();
        $("#zSearchContainer").unbind("mouseleave");
        if (!$("#zExpandMsg").data("noskip")) {
            $("#zExpandMsg").data("skiponce", "true")
        }
        $("#zExpandMsg").data("noskip", false);
        options.searchFormExpanded = false;
        chrome.extension.sendRequest({
            op: "saveOptions",
            options: options
        })
    });
    $("#zAlert").bind("change", function () {
        if (this.checked) {
            $("#zAlertTitle").val(monitorTitle)
        }
        requestListener({
            op: "setMonitor",
            active: this.checked ? 1 : 0,
            title: $("#zAlertTitle").val(),
            frequency: $("#zAlertFrequency").val(),
            timeUnit: $("input[name=timeUnit]:checked").val()
        }, null, function () {});
        $("#zSaveMsg").text("Alert Set");
        window.setTimeout(function () {
            jQuery("#zSaveMsg").text("")
        }, 2000)
    });
    $("#zAlertTitle").click(function () {
        this.select()
    });
    $("#zAlertTitle").keypress(function (c) {
        if (c.which == "13") {
            $("#zAlertSaveBtn").click()
        }
    });
    $("#zAlertSaveBtn").click(function () {
        requestListener({
            op: "setMonitor",
            active: 1,
            title: $("#zAlertTitle").val(),
            frequency: $("#zAlertFrequency").val(),
            timeUnit: $("input[name=timeUnit]:checked").val()
        }, null, function () {});
        $("#zSaveMsg").text("Alert Updated");
        window.setTimeout(function () {
            jQuery("#zSaveMsg").text("")
        }, 2000)
    });
    $("#zShowHidden").bind("change", function () {
        requestListener({
            op: "toggleIgnored"
        }, null, function () {})
    });
    $("#zSmartMode").attr("checked", options.smartMode);
    $("#zSmartMode").bind("change", function () {
        options.smartMode = this.checked;
        chrome.extension.sendRequest({
            op: "saveOptions",
            options: options
        })
    });
    if (options.searchFormExpanded) {
        $("#zSearchContainer").show();
        $("#zExpandMsg").hide();
        $("#zCollapseMsg").show()
    }
    if (options.autoExpandSearch) {
        $("#zExpandMsg").hoverIntent({
            over: function () {
                if ($("#zExpandMsg").data("skiponce")) {
                    $("#zExpandMsg").removeData("skiponce");
                    return
                }
                $("#zSearchContainer").show();
                $("#zSearchContainer").mouseleave(function (c) {
                    if (c.pageY >= this.offsetHeight + this.offsetTop || c.pageX <= this.offsetLeft || c.pageX >= this.offsetLeft + this.offsetWidth) {
                        $("#zSearchContainer").hide();
                        $("#zSearchContainer").unbind("mouseleave")
                    }
                });
                $("#query")[0].focus()
            },
            out: function () {},
            sensitivity: 2,
            interval: 150
        })
    }
    var a = $('<div id="ziinkBottomBar"><a href="http://ziink.com" style="margin-right: 5px"><img src="' + extPath + 'images/peace_icon_s.png"> Craigslist Helper</a> It took weeks to develop this extension, but it will take only seconds to <iframe src="http://www.facebook.com/plugins/like.php?href=http%3A%2F%2Fwww.facebook.com%2Fpages%2FCraigslist-Helper-Browser-Extension%2F218753694806954&amp;layout=button_count&amp;show_faces=true&amp;width=90&amp;action=recommend&amp;font&amp;colorscheme=light&amp;height=21" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:90px; height:21px; position: relative; top: 3px" allowTransparency="true"></iframe> it. Please spread the word.</div>').appendTo("blockquote:last");
    spamFlag = $('<a id="spamFlag" href="" style="position: absolute; z-index: 1001;"><img title="spam/overpost" src="' + extPath + 'images/spam-16.png" /></a>');
    spamFlag.click(function () {
        $.get(this.href, function (d) {});
        updateIgnoredCount(1);
        $(this).parents("P:first").addClass("ziink_post_ignored").hide();
        var c = this.href.match(/postingID=(\d+)/)[1];
        chrome.extension.sendRequest({
            op: "ignore",
            id: c
        });
        return false
    })
}
function gAdsInListingPage() {
    if (location.href.search(/cas|stp|w4w|w4m|m4w|m4m|msr|mis|rnr/) < 0 && hideAdsTill < new Date().getTime()) {
        var j = encodeURIComponent($("title").text());
        var d = "";
        var h = encodeURIComponent($(".bchead > a:last").text());
        var k = "Ads for " + $("title").text() + "<br>";
        var c = $("p.row");
        for (var b = 0, e = c.length; b < 10 && b < e; b++) {
            k += $("a:first", c[b]).text() + "<br>"
        }
        if (k.length > 5555) {
            k = k.substr(0, 5555)
        }
        k = encodeURIComponent(k);
        var g = location.href.replace(/\.*\?/, "");
        var f = $("body > blockquote");
        var a = $('<div id="zNavRight" style="float: right;"></div>').prependTo(f);
        $('div:contains("sort by"):first', f).detach().appendTo(a);
        $("h4.ban:first", f).detach().appendTo(a);
        $("#hideZAdsForHour_1").click(function () {
            $(this).parent().hide();
            chrome.extension.sendRequest({
                op: "saveLocalStorage",
                key: "hideAdsTill",
                data: new Date().getTime() + 60 * 1000 * 60
            })
        })
    }
}
function inListingPage() {
    initializeListingPage();
    gAdsInListingPage();
    processListings();
    expandSearch()
}
init();