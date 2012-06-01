/* (c) 2011 Ziink */
if (typeof safari === 'undefined') {
	var zSafari = false;
} else {
	var zSafari = true;
}
if (zSafari) {
	var responseFuncs = [];
	var chrome = {
		extension: {
			sendRequest: function(b, a) {
				if (a) {
					var c = responseFuncs.indexOf(a);
					if (c == -1) {
						c = responseFuncs.length;
						responseFuncs.push(a);
					}
					b.responseFunc = c;
				}
				safari.self.tab.dispatchMessage('ziinkcl', b);
			}
		}
	};
	document.addEventListener('contextmenu', handleContextMenu, false);

	function handleContextMenu(a) {
		safari.self.tab.setContextMenuEventUserInfo(a, {
			ziinkSel: window.getSelection().toString() + ' '
		});
	}
	var extPath = safari.extension.baseURI;
} else {
	var extPath = chrome.extension.getURL('');
}
var firefox = false;
var options;
var blacklist = [];
var showIgnored = false;
var ignoredCount = 0;
var multiSiteAdsLimit = 1000;
var pageSize = 100;
var isListing = false;
var isMonitored = false;
var monitorUrl = location.href;
var monitorFrequency = 1,
	monitorTimeUnit = 86400000;
var pageOne = false;
topAd = 0;
var monitorTitle = document.title.replace(/ - craigslist$/, '');
var clPostingsJsIncluded = false;
var emailHandlerSet = false;
var lazyLoadPage;
var clAdPreview = true;
var spamFlag;
var hideAdsTill = 0;

function modifyJEditable() {
	var a = $.editable.types.defaults.buttons;
	$.editable.types.defaults.buttons = function(d, c) {
		a.call(this, d, c);
		var b = $('<button>Delete</button>');
		$(this).append(b);
		$(b).click(function(e) {
			chrome.extension.sendRequest({
				op: 'putNote',
				id: c.id,
				note: ''
			});
			$(c).remove();
			$(this).remove();
		});
	}
}

function processListings() {
	var c = location.href.indexOf('?') > 0 || location.href.indexOf('&query=') > 0;
	lazyLoadPage = options.smartMode ? !c : options.lazyLoad;
	if (lazyLoadPage && $('#zLoadPreviewsButton').length == 0) {
		$('<button id="zLoadPreviewsButton" >Load Previews</button>').prependTo('blockquote:eq(1)').click(function() {
			$(this).hide();
			$('a.lazy').each(function() {
				var d = this;
				loadAndProcessAd(d, function() {
					$(d).removeClass('lazy');
					$(d).unbind('mouseover mouseout');
				});
			});
		});
	}
	var b = new Array();
	var a = $("blockquote a:not(.Ziinked):visible[href$='.html']", document);
	a.each(function(d) {
		var e = adnumFromUrl(this.href);
		b.push(e);
		if (!topAd) {
			topAd = e;
		}
	});
	if (b.length) {
		chrome.extension.sendRequest({
			op: 'getIgnored',
			ids: b
		}, function(d) {
			a.each(function(e) {
				var f = adnumFromUrl(this.href);
				if (f) {
					if (d.length && jQuery.inArray(parseInt(f), d) >= 0) {
						$(this.parentNode).addClass('ziink_ignored').hide();
					} else {
						doLink(this, f);
					}
				}
			}).addClass('Ziinked');
			updateIgnoredCount(d.length);
			chrome.extension.sendRequest({
				op: 'getStarredIds',
				ids: b
			}, function(e) {
				a.each(function(f) {
					var g = adnumFromUrl(this.href);
					if (g) {
						if (e.length && jQuery.inArray(parseInt(g), e) >= 0) {
							$(this).parents('P:first').addClass('ziink_starred').children('.zStarIcon').attr('src', extPath + 'images/gold_star_16.png');
						}
					}
				});
			});
		});
	}
	pageOne = false;
	if ((location.href.indexOf('sort=date') >= 0 || location.href.indexOf('sort=') < 0) && !(location.href.indexOf('00.html') >= 0) && !(location.href.indexOf('&s=') >= 0)) {
		pageOne = true;
	}
	monitorUrl = window.location.href;
	monitorUrl = monitorUrl.replace(/sort=[a-z]*\&?/, '');
	monitorUrl = monitorUrl.replace(/\&sort=[a-z]*/, '');
	monitorUrl = monitorUrl.replace(/index\d+\.html/, '');
	monitorUrl = monitorUrl.replace(/\&s=\d+/, '');
	monitorTitle = document.title.replace(' - craigslist', '').replace('classifieds', '');
	chrome.extension.sendRequest({
		op: 'monitorInfo',
		url: monitorUrl,
		update: pageOne,
		topAd: topAd,
		title: monitorTitle
	}, function(d) {
		if (d != null) {
			isMonitored = d.active;
			monitorFrequency = d.frequency;
			monitorTimeUnit = d.time_unit;
			if (d.title != '') {
				monitorTitle = d.title;
			}
			updateAlertStatus();
			if (options.hlNew && pageOne) {
				highlightNewAds(a, d.topAd);
			}
		}
	});
}

function positionOver(f, c, m, j) {
	var b = 10;
	var d = f.x || f.parentNode.offsetLeft;
	var k = f.y || f.parentNode.offsetTop;
	var h = d + f.width / 2;
	var g = k + f.height / 2;
	var l = Math.min(window.scrollX + window.innerWidth - b, h + Math.floor(c / 2));
	var a = Math.min(window.scrollY + window.innerHeight - b, g + Math.floor(m / 2));
	var i = Math.max(window.scrollY, a - m) - (j ? 0 : k);
	var e = Math.max(window.scrollX, l - c) - (j ? 0 : d);
	return {
		top: i,
		left: e
	};
}

function afterImageLoad() {
	if (this.naturalWidth < 50 || this.naturalHeight < 50) {
		$(this.parentNode).hide();
	} else {
		var a = Math.floor((this.naturalWidth / this.naturalHeight) * options.tnMaxHeight);
		this.style.cssText = 'max-height: ' + options.tnMaxHeight + '; max-width: ' + options.tnMaxWidth + '; position: absolute; width: ' + a + ';top: 0; left: 0;';

		$('<img src="' + extPath + 'images/1x1.png" class="zImage" style="z-index: 200; position: relative; opacity: 0; max-width: ' + options.tnMaxWidth + 'px; max-height: ' + options.tnMaxHeight + 'px; width: ' + a + 'px; height: ' + this.height + 'px;" />').insertAfter(this).hoverIntent({
			over: function() {
				var c = this.previousSibling;
				var b, d;

				d = Math.min(Math.max(c.naturalWidth, options.imgMinWidth), options.imgMaxWidth);
				b = Math.floor((c.naturalHeight / c.naturalWidth) * d);
				b = Math.min(Math.max(b, options.imgMinHeight), options.imgMaxHeight);
				d = Math.floor((c.naturalWidth / c.naturalHeight) * b);
				if (d > options.imgMaxWidth) {
					d = options.imgMaxWidth;
					b = Math.floor((c.naturalHeight / c.naturalWidth) * d);
				}
				var e = positionOver(c, d, b);
				this.style.zIndex = 400;
				c.style.zIndex = 300;

				$(c).stop().animate({
					'max-width': d,
					'max-height': b,
					width: d,
					height: b,
					top: e.top,
					left: e.left
				}, 'fast');

				var src = $(this).attr('src').match(/<img src=\"http:\/\/\S+\.\S+\.org\/thumb([^>]+)\">/gi);
				src = $(this).attr('src').replace('/thumb', '');
				$(this).attr('src', src);
			},
			out: function() {
				this.style.zIndex = 200;
				var b = Math.floor((this.previousSibling.naturalWidth / this.previousSibling.naturalHeight) * options.tnMaxHeight);
				$(this.previousSibling).css('height', '');
				$(this.previousSibling).stop().animate({
					'max-width': options.tnMaxWidth,
					'max-height': options.tnMaxHeight,
					width: b,
					top: 0,
					left: 0
				}, 'fast').queue('fx', function(c) {
					this.style.zIndex = '';
					c();
				});

				var src = $(this).attr('src').match(/<img src=\"http:\/\/images\.craigslist+\.org([^>]+)\">/gi);
				if ($(this).attr('src').indexOf('thumb', 25) == -1) {
					src = $(this).attr('src').replace('org', 'org/thumb');
				} else {
					src = $(this).attr('src');
				}
				$(this).attr('src', src);
			},
			sensitivity: 5,
			interval: 250
		});
	}

	$(this).removeClass('ziink_loading').addClass('zImage');
}

function imagePreview(e, a) {
	var d = $(e.parentNode);
	var b = Math.min(options.tnMax, a.length);

	for (var c = 0; c < b; c++) {
		if (a[c].indexOf('thumb') == -1) {
			d.append("<div class='ziink' style='position: relative; float: left;'>" + a[c].replace('org', 'org/thumb').replace('alt', 'style="width:' + options.tnMaxWidth + 'px; height:' + options.tnMaxHeight + 'px;" alt') + '</div> ');
			c = c + 1;
		} else {
			d.append("<div class='ziink' style='position: relative; float: left;'>" + a[c].replace('alt', 'style="width:' + options.tnMaxWidth + 'px; height:' + options.tnMaxHeight + 'px;" alt') + '</div> ');
		}
	}
	d.append('<div class="zFloatClear" ></div>');

	$('div.ziink > img').hoverIntent({
		//.mouseover(function() {
		over: function() {
			var c = this;
			var b, d;

			d = Math.min(Math.max(c.naturalWidth, options.imgMinWidth), options.imgMaxWidth);
			b = Math.floor((c.naturalHeight / c.naturalWidth) * d);
			b = Math.min(Math.max(b, options.imgMinHeight), options.imgMaxHeight);
			d = Math.floor((c.naturalWidth / c.naturalHeight) * b);
			if (d > options.imgMaxWidth) {
				d = options.imgMaxWidth;
				b = Math.floor((c.naturalHeight / c.naturalWidth) * d);
			}
			var e = positionOver(c, d, b);
			this.style.zIndex = 300;

			$(this).stop().animate({
				'max-width': d,
				'max-height': b,
				width: d,
				height: b,
				top: e.top,
				left: e.left
			}, 'fast');

			var src = $(this).attr('src').match(/<img src=\"http:\/\/\S+\.\S+\.org\/thumb([^>]+)\">/gi);
			src = $(this).attr('src').replace('/thumb', '');
			$(this).attr('src', src);
		},
		//})
		//.mouseout(function() {
		out: function() {
			var b = Math.floor((this.naturalWidth / this.naturalHeight) * options.tnMaxHeight);

			$(this).css('height', '');
			$(this).stop().animate({
				'max-width': options.tnMaxWidth,
				'max-height': options.tnMaxHeight,
				top: 0,
				left: 0
			}, 'fast').queue('fx', function(c) {
				c();
			});

			var src = $(this).attr('src').match(/<img src=\"http:\/\/images\.craigslist+\.org([^>]+)\">/gi);
			if ($(this).attr('src').indexOf('thumb', 25) == -1) {
				src = $(this).attr('src').replace('org', 'org/thumb');
			} else {
				src = $(this).attr('src');
			}
			$(this).attr('src', src);
		},
		sensitivity: 5,
		interval: 250
	});
	//$("div.ziink > img", d).addClass("ziink_loading").load(afterImageLoad)
}

function showAdPreview(g) {
	var c = $('.zTip', this);
	if (c.is(':visible')) {
		return;
	}
	if (spamFlag) {
		var b = $('.zSpamFlag', this).attr('href');
		spamFlag.attr('href', b);
		spamFlag.prependTo(this).css({
			top: '1px',
			left: '-18px'
		}).show();
	}
	var f = $(this).parent().offset().left;
	$('img', c).load(function() {
		c.stop();
		if (this.height == 0) {
			this.height = this.naturalHeight;
		}
		c.animate({
			height: c[0].scrollHeight
		}, function() {
			this.style.overflow = 'auto';
		});
	});
	if (g.clientY < window.innerHeight / 2) {
		var d = $(this).offset().top + $(this).height() - document.body.scrollTop;
		c.css({
			top: d,
			bottom: '',
			left: f,
			width: options.adWidth,
			'max-height': window.innerHeight - d - 70,
			'max-width': window.innerWidth - f - 30
		});
	} else {
		var a = window.innerHeight - ($(this).offset().top - document.body.scrollTop);
		c.css({
			top: '',
			bottom: a,
			left: f,
			width: options.adWidth,
			'max-height': g.clientY - 70,
			'max-width': window.innerWidth - f - 30
		});
	}
	c.height(0).show().animate({
		height: c[0].scrollHeight
	}, function() {
		var e = $('.gad > iframe', c);
		if (e.length && e.attr('src') == '') {
			e.attr('src', e.attr('href'));
		}
		this.style.overflow = 'auto';
	});
}

function makeCacheLink(f, s, t, u, b) {
	var g, o, v, j = '',
		p = '',
		l = '',
		e = '',
		m, a, n;
	g = s.match(/"mailto:([^\?]+)/);
	o = g ? g[1] : '';
	v = f.textContent.replace(/\//g, '~`~');
	m = u.replace(/[\s\S]+<div id="userbody">/, '');
	var h = -1;
	if (h < 0) {
		h = m.indexOf('<!-- END CLTAGS -->');
	}
	if (h < 0) {
		h = m.indexOf('<ul class="clfooter">');
	}
	m = m.substring(0, h);
	var k = f.nextSibling;
	if (k) {
		g = k.textContent.match(/^[-\s]+(\S+)/);
		p = g ? g[1] : '';
		var d = k.nextSibling;
		if (d) {
			g = d.textContent.match(/\((.+)\)/);
			j = g ? g[1] : '';
		}
	}
	if (!j) {
		g = u.match(/<h2>.*?<\/h2>/);
		if (g) {
			g = g[0].match(/\(.*?\)/);
			if (g) {
				j = g[1];
			}
		}
	}
	//if (t) {
	//T is the matching of <img tags....
	//for (var q = 0, r = t.length; q < r; q++) {
	//if (t[q].indexOf("http://images.craigslist.org/") >= 0) {
	//    l += t[q].match(/images.craigslist.org\/([^.]+)/)[1] + ","
	//}
	//}
	//}
	g = u.match(/"bchead">[\s\S]*?<\/div>/);
	if (g) {
		g = g[0].match(/[\s\S]*">([^<]+)/);
		if (g) {
			e = g[1];
		}
	}
	e = e.replace(/\//g, '~`~');
	return {
		cat: e,
		loc: j
	};
}

function previewFromCache(e) {
	var b = e.match(/txt=([^&]*)&img=[^&]*&n=([^&]*)&price=[^&]*&em=([^&]*)&dt=([^&]*)/);
	if (!b) {
		console.log('Invalid Cache Href');
		return '';
	}
	var a = decodeURIComponent(b[1]),
		g = b[2],
		c = b[3],
		f = decodeURIComponent(b[4]);
	var d = 'Date: ' + f + '<br>Reply to: <span id="mailtoSpan">' + (c ? c + '-' + g + '@craigslist.org <span style="font-size: 9pt;">(cached data: email may no longer be valid)</span>' : 'see below') + '</span><hr><div id="userbody">' + a + '</div>';
	return d;
}

function getPreviewGad(e, b, d) {
	var c = encodeURIComponent(e.textContent).replace(/%20/g, '+');
	var a = '<div class="gad" style="width: 736px; height: 98px; overflow: hidden; margin-left: -10px;"><iframe src= height="910px" width="800px" frameborder="0" scrolling="no"></iframe></div>';
	return a;
}

function setupAdPreview(g, r, p, l) {
	var f = null;
	var m = g.href;
	var b = adnumFromUrl(g.href);
	var a = g.href.replace(/([a-z]\/).*/, '$1');
	if (l && r.indexOf('page will be removed in just a few minutes') > 0) {
		var o = previewFromCache(l);
		g.href = l;
	} else {
		const k = '<div id="tsb">';
		var c = -1,
			d = r.indexOf(k);
		d = r.indexOf('<hr>', d) + 4;
		if (lazyLoadPage || !options.showTn) {
			c = r.indexOf('PostingID:', d) - 7;
		}
		if (c < 0) {
			c = r.indexOf('<br><br><ul>\n<li>', d);
		}
		if (c < 0) {
			c = r.indexOf('<!-- START CLTAGS -->', d);
		}
		if (c < 0) {
			c = r.indexOf('<ul class="blurbs">', d);
		}
		if (c < 0) {
			c = r.indexOf('<ul class="clfooter">', d);
		}
		var o = r.substring(d, c);
		o = o.replace('<sup>[<a href="http://www.craigslist.org/about/help/replying_to_posts" target="_blank">Errors when replying to ads?</a>]</sup>', '');
		o = o.replace(/(<br>\s)+$/g, '');
		if (o.indexOf('value="Reply To This Post"') < 0) {
			f = makeCacheLink(g, o, p, r, b);
			if (f.href) {
				g.href = f.href;
			}
		}
		o = '<div class="zFlagDiv" style="position: absolute; right: 0; margin-right: 20px;"><span id="zFlagStatus"></span>  <a class="zAdFlag" href="' + a + 'flag/?flagCode=16&postingID=' + b + '"><img title="miscategorized" src="' + extPath + 'images/miscat-16.png" /></a><a class="zAdFlag" href="' + a + 'flag/?flagCode=28&postingID=' + b + '"><img title="prohibited" src="' + extPath + 'images/stop-16.png" /></a><a class="zAdFlag zSpamFlag" href="' + a + 'flag/?flagCode=15&postingID=' + b + '"><img title="spam/overpost" src="' + extPath + 'images/spam-16.png" /></a><a class="zAdFlag" href="' + a + 'flag/?flagCode=9&postingID=' + b + '"><img title="best of craigslist" src="' + extPath + 'images/red-heart-16.png" /></a></div>' + o;
	}
	if (options.emailProvider != 'unset' && options.emailProvider != 'none') {
		o = setupEmailLink(o);
	}
	var i = o.split('<div id="userbody">');
	var q = '';
	if (i.length == 2) {
		if (hideAdsTill < new Date().getTime()) {
			if (Math.random() < 0.2 && m.search(/cas|stp|w4w|w4m|m4w|m4m|msr|mis|rnr/) < 0) {
				if (f) {
					q = getPreviewGad(g, f, i[1]);
				}
				if (q) {
					q = '<br><br>' + q;
				}
			} else {
				if (f && m.search(/\/(hab|bts|fns|lgs|sks|trv|lgl|hea|spa|ofc|fbh|mar|ret|sls|off)\//) > 0) {
					q = getPreviewGad(g, f, i[1]);
					if (q) {
						q = '<br><br>' + q;
					}
				}
			}
		}
		o = i[0] + '<div class="zUserBody">' + i[1].replace(/\b\d{3}\D{1,2}\d{3}\D{1,2}\d{4}\b|\b\d{3}\D{1,2}\d{7}\b/g, '<span style="background-color: yellow;"><a href=\'http://www.google.com/search?hl=en&safe=off&q="$&"+-intitle%3Aphone+-intitle%3Areverse+-intitle%3Aowner+-intitle%3Alookup+-intitle%3Atrack+-0000+-xxxx\'>$&</a></span>') + '</div>' + q;
	}
	var n = $('<span class="previewWrapper"></span>')[0];
	g.parentNode.replaceChild(n, g);
	n.appendChild(g);
	var j = $('<div class="zTip">' + o + '</div>').appendTo($(n));
	j.bind('mousewheel', function(s) {
		if ((s.wheelDelta > 0 && this.scrollTop == 0) || (s.wheelDelta <= 0 && this.scrollTop + this.clientHeight >= this.scrollHeight)) {
			s.preventDefault();
			return false;
		}
	});
	if (options.showAdTextChars > 0) {
		var e = $('.zUserBody', j).text().substr(0, options.showAdTextChars) + '...';
		var h = e.match(/[a-z]/);
		if (!h) {
			e = e.toLowerCase();
		}
		$(n).siblings('br').after('<span class="zAdText">' + e + '</span><br />');
	}
	doPhoneNumbers(g);
	$(n).hoverIntent({
		over: showAdPreview,
		out: function() {
			$('.zTip', this).hide();
			if (spamFlag) {
				spamFlag.hide().detach();
			}
			if ($('#repCapt', this).length) {
				$('#repCapt', this).replaceWith('<form id="reply" action="' + $('#repCapt', this).attr('action') + '" method="GET"><button type="submit" value="Reply To This Post">Reply To This Post</button></form>');
			}
		},
		sensitivity: 2,
		interval: 250,
		timeout: 100
	});
	if (!clPostingsJsIncluded && $('#reply').length) {
		clPostingsJsIncluded = true;
		$.ajaxSetup({
			cache: true
		});
		$.getScript('http://api.recaptcha.net/js/recaptcha_ajax.js');
		$.ajaxSetup({
			cache: false
		});
		$('<script>' + buildReplyForm + sendRepCaptcha + makeCaptcha + reCaptchaInit + ' reCaptchaInit();<\/script>').appendTo('head');
	}
	if (!emailHandlerSet) {
		emailHandlerSet = true;
		$('body').delegate('div.zTip a[href^="mailto"]', 'click', function(s) {
			if (options.emailProvider == 'unset') {
				setTimeout(function() {
					alert('Craigslist Helper can direct you to GMail, Yahoo Mail, Hotmail or Aol Mail. Please select your preference first.');
					chrome.extension.sendRequest({
						op: 'openOptionsTab'
					});
				}, 20);
				s.preventDefault();
				return false;
			} else {
				setupEmailLinkDom(this.parentNode);
			}
		});
	}
	$('a.zAdFlag', j).click(function() {
		$.get(this.href, function(s) {});
		$('#zFlagStatus').text('Flagged  ');
		if (this.href.search(/=16|=28|=15/) != -1) {
			updateIgnoredCount(1);
			$(this).parents('P:first').addClass('ziink_post_ignored').hide();
			chrome.extension.sendRequest({
				op: 'ignore',
				id: b
			});
		}
		return false;
	});
}

function makeEditable(c, b) {
	var a;
	c.editable(function(d) {
		if ('' == d && b) {
			$(this).remove();
		}
		if (a != d) {
			if (b) {
				var e = getLinkInfo(b);
				chrome.extension.sendRequest({
					op: 'putNote',
					id: this.id,
					note: d,
					title: e.title,
					date: e.date,
					price: e.price,
					loc: e.loc,
					url: b.href
				});
			} else {
				var e = getAdInfo(document.body.innerHTML, location.href);
				chrome.extension.sendRequest({
					op: 'putNote',
					id: this.id,
					note: d,
					title: e.title,
					date: e.date,
					price: e.price,
					loc: e.loc,
					url: location.href
				});
			}
		}
		return d.replace(/\n/g, '<br>\n');
	}, {
		type: 'textarea',
		onblur: 'ignore',
		cancel: 'Cancel',
		submit: 'Save',
		placeholder: 'Click To Add A Note',
		tooltip: 'Click To Edit Note',
		onreset: function() {
			if (a == '') {
				if (b) {
					c.remove();
					return false;
				}
			}
		},
		data: function(d) {
			a = d.replace(/<br>/g, '');
			return a;
		}
	});
}

function doLink(d, h, e) {
	if ($(d.parentNode).hasClass('i')) {
		return;
	}
	var a = $(d).text();
	var b = a.match(/[A-Z]{4,}/g);
	if (b && b.length >= 3) {
		a = $(d).text().toLowerCase();
	}
	a = a.replace(/\W{3,}/, ' ');
	if (a != $(d).text()) {
		$(d).text(a);
	}

	function c(j, k) {
		$("<img class='ziink_action_icon' src='" + extPath + "images/remove_ignore_icon.png' title='Stop Hiding This Ad'>").insertBefore(j).bind('click', function() {
			updateIgnoredCount(-1);
			$(this).hide().siblings(':first').show();
			$(this.parentNode).removeClass('ziink_post_ignored');
			chrome.extension.sendRequest({
				op: 'removeIgnore',
				id: k
			});
		});
	}
	if ($(d).siblings(':last').length == 0 || $(d).siblings(':last').get(0).nodeName != 'BR') {
		$(d.parentNode).append('<br />');
	}
	var i = $("<button class='zButton' >Edit Note</button>").insertBefore($(d).siblings(':last')).bind('click', function() {
		if ($(this).siblings('.ziink_note').length == 0) {
			makeEditable($("<div class='ziink_note' id='" + h + "' style='background-color: #" + options.notesBgColor + '; border-color: ' + darkerColor(options.notesBgColor, 0.2) + "'></div>").insertAfter($(this).siblings('br:first')), d);
		}
		$(this).siblings('.ziink_note').trigger('click');
	});
	chrome.extension.sendRequest({
		op: 'getNote',
		id: h
	}, function(j) {
		if (j) {
			makeEditable($("<div class='ziink_note' id='" + h + "' style='background-color: #" + options.notesBgColor + '; border-color: ' + darkerColor(options.notesBgColor, 0.2) + "'>" + j.replace(/\n/g, '<br>\n') + '</div>').insertAfter(i.siblings('br')[0]), d);
		}
	});
	var f = $("<button class='zHideButton' title='Do not show this ad again.'>Hide</button>").prependTo(d.parentNode).bind('click', function() {
		updateIgnoredCount(1);
		c($(this).siblings('br')[0], h);
		$(this).hide();
		$(this.parentNode).addClass('ziink_post_ignored').hide();
		chrome.extension.sendRequest({
			op: 'ignore',
			id: h
		});
	});
	var g = $("<img title='Bookmark' class='zStarIcon' src='" + extPath + "images/gray_star_16.png' >").insertBefore($(d).siblings(':last')).bind('click', function() {
		if (this.src.indexOf('gray_star') > 0) {
			var j = getLinkInfo($('a:first', this.parentNode)[0]);
			$(this.parentNode).addClass('ziink_starred');
			chrome.extension.sendRequest({
				op: 'star',
				info: j
			});
			this.src = extPath + 'images/gold_star_16.png';
		} else {
			$(this.parentNode).removeClass('ziink_starred');
			chrome.extension.sendRequest({
				op: 'removeStar',
				id: h
			});
			this.src = extPath + 'images/gray_star_16.png';
		}
	});
	if (e) {
		f.hide();
		c(i.siblings('br')[0], h);
	}
	if (lazyLoadPage) {
		if (!checkBlacklist(d, blacklist)) {
			$(d).addClass('lazy').hoverIntent({
				over: function(j) {
					loadAndProcessAd(d, function() {
						$(d).removeClass('lazy');
						$(d).unbind('mouseover mouseout');
						var l = d.parentNode;
						showAdPreview.call(l, j);
						var k = function() {
								$('.zTip', l).hide();
								spamFlag.hide().detach();
								$(l).unbind('mouseleave', k);
							};
						$(l).bind('mouseleave', k);
					});
				},
				out: function() {},
				sensitivity: 2,
				interval: 250,
				timeout: 100
			});
		}
	} else {
		loadAndProcessAd(d);
	}
}

function adnumFromUrl(b) {
	var a = b.match(/&n=(\d+)/);
	if (!a) {
		a = b.match(/(\d{8,})\.html/);
	}
	var c = a ? a[1] : 0;
	return c;
}

function getLinkInfo(d) {
	var b = d.textContent.replace(/\s+-\s*$/, '');
	var e = d.parentNode.nodeName == 'SPAN' ? d.parentNode : d;
	var a = e.previousSibling.nodeName == '#text' ? e.previousSibling.textContent.replace(/\s+-\s*$/, '').replace(/^\s+/, '') : $(e.parentNode).siblings('h4.ban:first').text().replace(/^\w+\s/, '');
	if (a == '') {
		a = $(e.parentNode).siblings('h4.ban:first').text().replace(/^\w+\s/, '');
	}
	var c = e.nextSibling.nodeName == '#text' ? e.nextSibling.textContent : '';
	var f = '';
	if ($(e).siblings('font').length) {
		f = $(e).siblings('font').text();
	}
	var g = adnumFromUrl(d.href);
	return {
		id: g,
		url: d.href,
		title: b,
		date: a,
		price: c,
		loc: f
	};
}

function getAdInfo(k, a) {
	var b = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	if (k) {
		var f = k.match(/<h2>(.*?)<\/h2>/);
		if (!f) {
			return null;
		}
		var g = f[1];
	} else {
		if ($('h2:first').length == 0) {
			return null;
		}
		var g = $('h2:first').text();
	}
	var d = g.match(/([^-]+) - (\$[^\(]+) (.*)/);
	d = d ? d : g.match(/([^\(]+)()(.*)/);
	d = d ? d : g.match(/(.*)()()/);
	var m = d[1];
	var h = d[2];
	var i = d[3];
	try {
		var l = k ? k.match(/Date: ([0-9\-]+)/)[1] : $('hr')[0].nextSibling.textContent.match(/Date: ([0-9\-]+)/)[1];
		var n = l.match(/\d{4}-(\d{2})-(\d{2})/);
		var c = b[parseInt(n[1]) - 1] + ' ' + n[2];
		var o = adnumFromUrl(a);
	} catch (j) {
		var c = '';
		var o = 0;
	}
	return {
		id: o,
		url: location.href,
		title: m,
		date: c,
		price: h,
		loc: i
	};
}
/*function fcl2clUrl(c) {
    var b = c.match(/&cl=(.*)/);
    if (!b) {
        return ""
    }
    var a = decodeURIComponent(b[1]).replace("CLO/", ".craigslist.org/");
    b = c.match(/&n=(\d{8,})/);
    a = "http://" + a + "/" + b[1] + ".html";
    return a
}*/
function loadAndProcessAd(b, a) {
	if (b.parentNode.tagName == 'SPAN') {
		return;
	}
	var c = '';
	chrome.extension.sendRequest({
		op: 'getUrl',
		url: b.href
	}, function(e) {
		if (e) {
			if (b.className.indexOf('bare') != -1) {
				var f = getAdInfo(e, b.href);
				if (f && f.id) {
					$(b).before(f.date + ' - ').after(' - ' + f.price + ' <font size="-1">' + f.loc + '</font>').removeClass('bare');
				}
			}
			var d;
			if (options.showTn) {
				//if (d = e.match((/<img src=\"http:\/\/\images\.craigslist\.org([^>]+)\">/gi)||(/<img src=\"http:\/\/\images\.craigslist\.org\/\S+\.jpg([^>]+)\">/gi))) {
				//if (d = e.match(/<img ([^>]+)>/gi)) {
				if (d = e.match(/<img src=\"http:\/\/images\.craigslist\.org\/thumb\/([^>]+)\">/gi)) {
					imagePreview(b, d);
				} else {
					if (d = e.match(/<img id=\"iwi\" src=\"http:\/\/images\.craigslist\.org\/([^>]+)\">/gi)) imagePreview(b, d);
				}
			}
			if (clAdPreview) {
				setupAdPreview(b, e, d, c);
			}
			if (!checkBlacklist(b, blacklist)) {
				if (b.href.search(/catAbb=ct|\/ct(a|o|d)\/|d\/cars/) > 0) {
					doCarInfo(b);
				}
				doMap(b, e);
			}
		} else {
			if (c) {
				b.href = c;
			}
		}
		if (a) {
			a();
		}
	});
}

function searchSites(k) {
	function a(o) {
		if (!o || o.length == 0) {
			return null;
		}
		var n = o.shift();
		var i = n.match(/(\d+)\.html/)[1];
		n = n.replace(/^<p>/, '<p class="row">');
		return {
			id: i,
			p: n
		};
	}

	function d() {
		var q = $('p.row');
		if (q.length > multiSiteAdsLimit) {
			$('h4').html(searchSites.total + ' sites searched; ' + $('p.row').length + ' ads found;' + multiSiteAdsLimit + ' ads loaded<br><font size="-2">A max of 100 ads per site</font>');
			for (var o = multiSiteAdsLimit, n = q.length; o < n; o++) {
				$(q[o]).remove();
			}
		}
		q = $('p.row:not(.ziink_ignored)');
		for (var o = pageSize, n = q.length; o < n; o++) {
			$(q[o]).hide();
		}
		if (q.length > pageSize) {
			$('<button>Show more ads</button>').insertBefore(q[pageSize]).click(function() {
				var s = $(this);
				var u = s.nextAll('p.row:not(.ziink_ignored)');
				for (var t = 0, r = pageSize; t < r; t++) {
					$(u[t]).show();
				}
				if (u.length > pageSize) {
					s.detach();
					s.insertBefore(u[pageSize]);
				} else {
					s.remove();
				}
				processListings();
			});
		}
		processListings();
	}

	function b() {
		if (m) {
			return;
		}
		m = true;
		if ($('blockquote p').length == 0) {
			$('blockquote > br:first')[0].nextSibling.textContent = '';
			if ($('blockquote > br:first').next('h4').length == 0) {
				$('blockquote > br:first').after('<h4>');
			}
			var r = $('#footer');
		} else {
			var r = $('blockquote p:last').next();
		}
		if (g.length) {
			var i = g.shift();
			var n = a(i);
			$("a[href$='.html']").each(function(p) {
				if (this.href.search(/\d+\.html$/) < 0) {
					return;
				}
				var s = this.href.match(/(\d+)\.html/)[1];
				if (n && n.id == s) {
					n = a(i);
					return;
				}
				while (n && n.id > s) {
					$(this).parents('p').before(n.p);
					n = a(i);
				}
			});
			if (n) {
				i.unshift(n.p);
			}
			while (i && i.length) {
				var q = i.shift();
				q = q.replace(/^<p>/, '<p class="row">');
				r.before(q);
			}
		}
		$('h4').html(searchSites.total + ' sites searched; ' + $('p.row').length + ' ads found<br><font size="-2">A max of 100 ads per site</font>');
		m = false;
		if (g.length) {
			b();
		}
		if (l == c) {
			c = 0;
			try {
				topAd = $('p.row a[href$=html]')[0].href.match(/(\d+)\.html$/)[1];
			} catch (o) {}
			monitorTitle = 'Multi-site: ' + document.title.replace(' - craigslist', '').replace('classifieds', '');
			chrome.extension.sendRequest({
				op: 'monitorInfo',
				url: monitorUrl,
				update: true,
				topAd: topAd
			});
			d();
		}
		return;
	}
	if (!k || !k.length) {
		return;
	}
	topAd = 0;
	var m = false;
	var g = [];
	var l = k.length;
	var c = 0;
	var h = location.href.match(/http:\/\/[^\/]+\//)[0];
	var f = getUrlQueryPart();
	if (k.length > 1 && $('h4').length > 2) {
		$($('h4')[1]).remove();
	}
	for (var e = 0, j = k.length; e < j; e++) {
		if (k[e].url == h) {
			c++;
			continue;
		}
		chrome.extension.sendRequest({
			op: 'getUrl',
			url: k[e].url + f
		}, function(r) {
			c++;
			if (!r) {
				b();
				return;
			}
			r = r.replace(/Here are some from NEARBY areas[\s\S]*/, '');
			var q = r.match(/<p[\s\S]*?<\/p>/g);
			if (q && q.length) {
				var o = q[0].indexOf('<br') > -1;
				for (var p = 0, n = q.length; p < n; p++) {
					if (q[p].indexOf('<font size=') == -1) {
						var s = q[p].match(/http:\/\/([^\.]+)/)[1];
						if (o) {
							q[p] = q[p].replace(/<br.*?>/, '<font size="-1"> [' + s + ']</font>$&');
						} else {
							q[p] = q[p].replace(/<\/p>/, '<font size="-1"> [' + s + ']</font>$&');
						}
					}
				}
				g.push(q);
			}
			b();
		});
	}
}

function expandSearch() {
	function b(h) {
		if (!h || !h.length) {
			return;
		}
		var g = h;
		if (expandSearch.prevSites != undefined && $('h4')[0].textContent.indexOf('sites searched') > 0) {
			g = [];
			if (expandSearch.prevSites.length > h.length) {
				$('blockquote a[href$=html]').addClass('delete');
				for (var f = 0, c = h.length; f < c; f++) {
					$('a.delete[href^="' + h[f].url + '"]').removeClass('delete');
				}
				$('a.delete').parents('p').remove();
				$('h4').html(h.length + ' sites searched; ' + $('p.row').length + ' ads loaded<br><font size="-2">A max of 100 ads per site</font>');
			} else {
				for (var f = 0, c = h.length; f < c; f++) {
					for (var e = 0, d = expandSearch.prevSites.length; e < d; e++) {
						if (h[f].url == expandSearch.prevSites[e].url) {
							break;
						}
					}
					if (e == d) {
						g.push(h[f]);
					}
				}
			}
		}
		expandSearch.prevSites = h.slice(0);
		if (h.length <= 1) {
			return;
		}
		searchSites.total = h.length;
		if (g.length) {
			$($('h4')[1]).nextAll('p').remove();
			searchSites(g);
		}
	}
	if (location.href.indexOf('#sw') > 0) {
		var a = location.href.match(/#sw=(\d+)/)[1];
		chrome.extension.sendRequest({
			op: 'getNearbySites',
			url: location.href,
			radius: a
		}, b);
	} else {
		if (location.href.indexOf('#st') > 0) {
			chrome.extension.sendRequest({
				op: 'getStateSites',
				url: location.href
			}, b);
		}
	}
}

function addMultiSiteSearch() {
	if (location.href.search('sort=price') > 0) {
		$('#searchform').append('<br><fieldset id="ziinkSearchFieldset"> <legend id="ziinkSearchLegend">Multi-site search : Expand current search</legend> Multi-site search is not available when results are sorted by price.</fieldset>');
		return;
	}
	$('#searchtable tbody').append('<tr><td colspan="4"><fieldset id="ziinkSearchFieldset"> <legend id="ziinkSearchLegend">Multi-city search</legend> <label><input type="radio" name="zSearchType" checked="checked" value="none" title="Do not include additional CL cities">none </label><label><input type="radio" name="zSearchType" value="allcl" title="Search all of Craigslist">all of CL </label><label><input type="radio" name="zSearchType" value="state" title="Include all cities in state">by state </label><label><input type="radio" name="zSearchType" value="distance" title="Include additional CL cities">by distance </label><span style="position: relative;">&nbsp;<div id="slider"></div><img id="sliderspace"></span> <span id="radiusDisplay" style="color: orange"> </span> &nbsp;&nbsp;<input id="searchRadius" type="text" size="2" maxlength="3" value="76" />miles</fieldset></td></tr>');
	var b = 50;
	if (location.href.indexOf('#sw=') > 0) {
		var a = location.href.match(/#sw=(\d+)/);
		var b = a ? a[1] : 50;
		b = b < 50 ? 50 : b;
		$('input:radio[value="distance"]').attr('checked', true);
	} else {
		if (location.href.indexOf('#st') > 0) {
			$('input:radio[value="state"]').attr('checked', true);
		}
	}
	$('#slider').slider({
		value: b,
		min: 50,
		max: 500,
		step: 10,
		slide: function(c, d) {
			$('#searchRadius').val(d.value);
			$('input:radio[value="distance"]').attr('checked', true);
		}
	});
	$('#searchRadius').val($('#slider').slider('value'));
	$('#searchform :submit').click(function(j) {
		var g = $('input[name=zSearchType]:checked').val();
		if (g == 'none') {
			$('input[name=zSearchType]').attr('disabled', true);
			return true;
		}
		j.preventDefault();
		var i = jQuery('#searchform')[0].action;
		var d = i + '?' + $('#searchform').serialize().replace(/\&zSearchType=[^&]*/, '');
		if (g == 'allcl' && $('#query').val() != '') {
			searchAllCL();
			return false;
		}
		var f = i.match(/search\/(\w{3})$/);
		var c = f ? f[1] : '';
		if ($('#catAbb').val() == c) {
			d = d.replace(/&catAbb=[^&]+/, '');
		}
		d = d.replace('&minAsk=min', '&minAsk=').replace('&maxAsk=max', '&maxAsk=');
		var h = location.href.replace(/#.*/, '');
		if (g == 'state') {
			location.href = d + '#st';
		} else {
			if (g == 'distance') {
				location.href = d + '#sw=' + $('#searchRadius').val();
			}
		}
		if (h == d) {
			monitorUrl = location.href;
			expandSearch();
		}
		return false;
	});
}

function searchAllCL() {
	var c = extPath + 'searchAllCl.html';
	var a = $('#catAbb').val();
	var b = $('#query').val();
	c += '#cat=' + a + '&query=' + b;
	location.href = c;
}

function doMap(c, d) {
	if (match = d.match(/http:\/\/maps.google.com\/\?q=loc\%3A([^"]+)/)) {
		var b = match[1];
		var a = $("<span class='zMapSpan'><img class='mapmarker' src='" + extPath + "images/mapmarker.png'></span>").insertBefore($(c.parentNode).siblings('br:first'));
		a.hoverIntent({
			over: function() {
				var f = positionOver(this.firstElementChild, options.mapWidth, options.mapHeight, true);
				var e = $(('<div class="zMapDiv"><iframe width="' + options.mapWidth + '" height="' + options.mapHeight + '" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="http://maps.google.com/maps?f=q&amp;iwloc=near&amp;q=loc:' + b + '&amp;output=embed"></iframe></div>')).appendTo(this);
				e.css({
					top: this.firstChild.y,
					left: this.firstChild.x
				});
				e.animate({
					width: options.mapWidth,
					height: options.mapHeight,
					top: f.top,
					left: f.left
				}, 'fast');
			},
			out: function() {
				$(this.lastChild).animate({
					top: this.firstChild.y,
					left: this.firstChild.x,
					width: 0,
					height: 0
				}, 'fast', function() {
					this.parentNode.removeChild(this.parentNode.lastChild);
				});
			},
			sensitivity: 2,
			interval: 250
		});
	}
}

function doCarInfo(b) {
	if (b.text.search(/\b(19|20)\d{2}\b/) == -1) {
		if (match = b.parentNode.textContent.match(/\b(19|20)\d{2}\b(?!-)/)) {
			$(b).before(match[0] + ' ');
			b.nextElementSibling.innerHTML = b.nextElementSibling.innerHTML.replace(/\b(19|20)\d{2}\b(?!-)/, "<span style='background-color: lightgreen;'>$&</span>");
		}
	}
	if (match = b.parentNode.textContent.match(/\b(\d{2,3}k)\b|\b([0-9, ]+)\smiles?|\bmiles:\s+([0-9,]+\b)/i)) {
		var a = match[1] || match[2] || match[3];
		if (a != '000') {
			$(b).after(' (' + a + ' miles) ');
			b.nextElementSibling.innerHTML = b.nextElementSibling.innerHTML.replace(/\b(\d{2,3}k)\b|\b([0-9,]+)\smiles?|\bmiles:\s+([0-9,]+\b)/i, "<span style='background-color: lightgreen;'>$&</span>");
		}
	}
}

function doPhoneNumbers(a) {
	if (match = a.parentNode.textContent.match(/\b\d{3}\D{1,2}\d{3}\D{1,2}\d{4}\b|\b\d{3}\D{1,2}\d{7}\b|\s\d{10}\b/)) {
		$(a.parentNode).siblings('br:first').before("<img class='phoneImage' src='" + extPath + "images/phone_icon.png' title='" + match[0] + "'>");
	}
}

function updateIgnoredCount(a) {
	ignoredCount = ignoredCount + a;
	$('#zShowHiddenLabel').text('Show Hidden Ads (' + ignoredCount + '):');
}

function updateAlertStatus() {
	$('#zAlert').attr('checked', isMonitored);
	$('#zAlertBox').toggle(isMonitored == true);
	$('#zAlertTitle').val(monitorTitle);
	$('#zAlertFrequency').val(monitorFrequency);
	$('input:radio[value="' + monitorTimeUnit + '"]').attr('checked', true);
}

function checkBlacklist(e, c) {
	if (!c) {
		return;
	}
	var f = e.parentNode.tagName == 'P' ? e.parentNode : e.parentNode.parentNode;
	if (f.className == 'row') {
		var b = e.parentNode.textContent;
		if (f == e.parentNode) {
			b = e.textContent;
		}
		b += ' ' + $('font', f).text();
		if (b.indexOf('page will be removed in just a few minutes') > 0) {
			updateIgnoredCount(1);
			$(f).addClass('ziink_post_ignored').hide();
			chrome.extension.sendRequest({
				op: 'ignore',
				id: adnumFromUrl(e.href)
			});
			return true;
		}
		for (var d = 0; d < c.length; d++) {
			var a = c[d];
			if (a[0] == '/') {
				a = a.substring(1);
			} else {
				a = a.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
			}
			if (b.match(new RegExp(a, 'i'))) {
				updateIgnoredCount(1);
				$(f).addClass('ziink_post_ignored').hide();
				return true;
			}
		}
	}
	return false;
}

function ignorePhrases(a) {
	$('span > a.ziinked').each(function(b) {
		checkBlacklist(this, a);
	});
}

function safariMessageListener(a) {
	if (a.name == 'ziinkcl') {
		requestListener(a.message, null, function(b) {
			if (a.message.responseFunc != undefined) {
				safari.self.tab.dispatchMessage('ziinkcl_response', {
					responseFunc: a.message.responseFunc,
					data: b
				});
			}
		});
	} else {
		if (a.name == 'ziinkcl_response') {
			responseFuncs[a.message.responseFunc](a.message.data);
		}
	}
}

function requestListener(c, b, a) {

	switch (c.op) {
	case 'getIgnoredState':
		a({
			count: ignoredCount,
			visible: showIgnored
		});
		break;
	case 'toggleIgnored':
		showIgnored = !showIgnored;
		if (showIgnored) {
			$('.ziink_post_ignored').show();
			$('.ziink_ignored > a', document).each(function(d) {
				var e = adnumFromUrl(this.href);
				if (e) {
					doLink(this, e, true);
				}
				$('.ziink_ignored').removeClass('ziink_ignored').addClass('ziink_post_ignored').show();
			});
		} else {
			$('.ziink_post_ignored').hide();
			$('.ziink_ignored').hide();
		}
		a();
		break;
	case 'noteUpdated':
		if (c.note != '') {
			if ($('#' + c.id + ' textarea').length) {} else {
				$('#' + c.id).html(c.note.replace(/\n/g, '<br>\n'));
			}
		} else {
			if ($('body.toc').length == 1) {
				$('#' + c.id).remove();
			}
		}
		a();
		break;
	case 'ignorePhrase':
		if (location.href.search(/\/\d+\.html$/) < 0) {
			ignorePhrases(c.phrases);
		}
		a();
		break;
	case 'getMonitorInfo':
		console.log(monitorTitle);
		a({
			isListing: isListing,
			active: isMonitored,
			frequency: monitorFrequency,
			timeUnit: monitorTimeUnit,
			title: monitorTitle
		});
		break;
	case 'setMonitor':
		monitorFrequency = c.frequency > 0 ? c.frequency : 1;
		monitorTimeUnit = c.timeUnit >= 60000 ? c.timeUnit : 24 * 60 * 60 * 1000;
		monitorTitle = c.title;
		isMonitored = c.active;
		updateAlertStatus();
		chrome.extension.sendRequest({
			op: 'setMonitor',
			url: monitorUrl,
			active: c.active,
			topAd: topAd,
			title: c.title,
			frequency: monitorFrequency,
			timeUnit: monitorTimeUnit
		});
		a();
		break;
	case 'optionsUpdated':
		options = c.options;
		a();
		break;
	case 'test':
		alert('content page listener');
		a();
		break;
	case 'default':
		a();
		break;
	}
}

var pad = function(b, a) {
		var c = '0';
		b = b + '';
		while (b.length < a) {
			b = c + b;
		}
		return b;
	};
var changeColor = function(b, e, h) {
		b = b.replace(/^\s*|\s*$/, '');
		b = b.replace(/^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i, '#$1$1$2$2$3$3');
		var g = Math.round(e * 256) * (h ? -1 : 1),
			c = b.match(new RegExp('^rgba?\\(\\s*(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])\\s*,\\s*(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])\\s*,\\s*(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])(?:\\s*,\\s*(0|1|0?\\.\\d+))?\\s*\\)$', 'i')),
			f = !! c && c[4] != null ? c[4] : null,
			a = !! c ? [c[1], c[2], c[3]] : b.replace(/^#?([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])/i, function() {
				return parseInt(arguments[1], 16) + ',' + parseInt(arguments[2], 16) + ',' + parseInt(arguments[3], 16);
			}).split(/,/),
			d;
		return !!c ? 'rgb' + (f !== null ? 'a' : '') + '(' + Math[h ? 'max' : 'min'](parseInt(a[0], 10) + g, h ? 0 : 255) + ', ' + Math[h ? 'max' : 'min'](parseInt(a[1], 10) + g, h ? 0 : 255) + ', ' + Math[h ? 'max' : 'min'](parseInt(a[2], 10) + g, h ? 0 : 255) + (f !== null ? ', ' + f : '') + ')' : ['#', pad(Math[h ? 'max' : 'min'](parseInt(a[0], 10) + g, h ? 0 : 255).toString(16), 2), pad(Math[h ? 'max' : 'min'](parseInt(a[1], 10) + g, h ? 0 : 255).toString(16), 2), pad(Math[h ? 'max' : 'min'](parseInt(a[2], 10) + g, h ? 0 : 255).toString(16), 2)].join('');
	};
var lighterColor = function(a, b) {
		return changeColor(a, b, false);
	};
var darkerColor = function(a, b) {
		return changeColor(a, b, true);
	};

function getUrlQueryPart() {
	var a = window.location.href.match(/http:\/\/[^\/]+\/(.*)/)[1].replace(/index\d+\.html/, '').replace(/\&s=\d+/, '');
	a = a.replace(/^(search\/[^\/]+)\/[^?]+/, '$1');
	a = a.replace(/^[^\/]+\/([^\/]+\/)$/, '$1');
	a = a.replace(/#.*/, '');
	return a;
}
var realOldTop = -1;

function highlightNewAds(b, a) {
	if (realOldTop == -1) {
		realOldTop = a;
	}
	a = realOldTop;
	console.log('oldTop:' + a);
	b.each(function(c) {
		var d = adnumFromUrl(this.href);
		if (a >= d) {
			return false;
		}
		$(this).parents('p:first').css('background-color', '#' + options.highlightColor);
	});
}

function buildReplyForm(a) {
	$.ajax({
		url: $(a.currentTarget).attr('action') + '?a=y',
		dataType: 'html',
		success: function(c, b) {
			if (c != '') {
				$(a.currentTarget).replaceWith(c);
			}
			makeCaptcha();
		},
		error: function(c, b) {
			$(a.currentTarget).submit();
		}
	});
	a.preventDefault();
	return false;
}

function sendRepCaptcha(a) {
	$.post($(a.currentTarget).attr('action'), {
		a: 'y',
		replyKey: $('#replyKey').val(),
		recaptcha_response_field: $('#recaptcha_response_field').val(),
		recaptcha_challenge_field: $('#recaptcha_challenge_field').val()
	}, function(b) {
		$('#repCapt').replaceWith(b);
		if ($('#captcha').length) {
			makeCaptcha();
		}
	});
	a.preventDefault();
}

function makeCaptcha() {
	Recaptcha.create('6Lf5YAcAAAAAAILdm73fp007vvmaaDpFb6A5HLJP', 'captcha', {
		theme: 'clean',
		callback: function() {
			$('#recaptcha_response_field').focus();
		}
	});
	$('#repCapt').submit(sendRepCaptcha);
}

function reCaptchaInit() {
	$('body').delegate('#reply', 'click', function(a) {
		buildReplyForm(a);
		$(this).parents('.zTip').height($(this).parents('.zTip').height() + 130);
	});
}

function removeEmailForm() {
	$('.zCenterForm').remove();
	$('.zGrayoutAll').remove();
}

function buildEmailForm(a, e, d, c) {
	var b = '<div class="zGrayoutAll"></div><div class="zCenterForm" style="width: 500px"><div style="background-color: lightgreen; padding: 8px; border-radius: 5px 5px 2px 2px;">Reply To Ad Via Email<img id="zCloseEmail" style="margin-right: 2px; margin-bottom: -2px; cursor: pointer; float: right;" src="' + extPath + 'images/gray_delete_16.png" title="Close"></div><br /><div id="zSendingEmailMsg" style="color: orange; font-size: x-large; display: none;">Sending Email...</div>Re: ' + e + '<form><textarea style="height: 200px; width:490px;" id="emailBody" name="emailBody"></textarea><div style="height: 5px; clear:both;"></div><label for="gmail">GMail</label><input checked type="radio" id="gmail" name="webmail" value="gmail">&nbsp;&nbsp;<button class="zButton" id="zSendEmail">Send Email</button><button class="zButton" id="zOpenWebmail">Open Email Tab</button></form><div style="height: 10px; clear:both;"></div><div style="overflow: auto; height: 150px; border: 1px solid gray; padding: 8px; background-color: lightgray;">' + c + '</div></div>';
	$(b).appendTo('body');
	$('#zCloseEmail').click(function(f) {
		removeEmailForm();
	});
	$('#zOpenWebmail').click(function(f) {
		removeEmailForm();
		f.preventDefault();
		chrome.extension.sendRequest({
			op: 'openMailTab',
			url: 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&source=mailto&to=' + encodeURIComponent(a) + '&su=Re: ' + encodeURIComponent(e) + '&body=' + encodeURIComponent($('#emailBody').val()) + '%0a%0a' + encodeURIComponent(d)
		});
		return false;
	});
	$('#zSendEmail').click(function(f) {
		$('#zSendingEmailMsg').show();
		chrome.extension.sendRequest({
			op: 'sendMail',
			to: a,
			subject: 'Re: ' + e,
			body: $('#emailBody').val() + '\n\n' + d
		}, function(g) {
			if (g.status == 'Success') {
				removeEmailForm();
			} else {
				alert(g.status);
				$('#zSendingEmailMsg').hide();
			}
		});
		f.preventDefault();
		return false;
	});
}

function setupEmailLinkDom(a) {
	var c = options.excludeSig ? '' : encodeURIComponent('\n\nCraigslist Helper : Get your free browser extension for image preview, bookmarks, notes and alerts on Craigslist\nhttp://ziink.com').replace(/%20/g, '+');
	var d = $('a[href^="mailto"]', a);
	if (d.length == 0) {
		return;
	}
	switch (options.emailProvider) {
	case 'unset':
		d.click(function(e) {
			if (options.emailProvider == 'unset') {
				setTimeout(function() {
					alert('Craigslist Helper can direct you to GMail, Yahoo Mail, Hotmail or Aol Mail. Please select your preference first.');
					chrome.extension.sendRequest({
						op: 'openOptionsTab'
					});
				}, 20);
				e.preventDefault();
				return false;
			} else {
				setupEmailLinkDom(this.parentNode);
			}
		});
		break;
	case 'gmail':
		var b = 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&source=mailto&to=' + d.attr('href').replace('mailto:', '').replace('?subject=', '&su=');
		d.attr('href', b + c);
		d.attr('target', '_blank');
		break;
	case 'yahoo':
		var b = 'http://us.mg1.mail.yahoo.com/mc/compose?&ymv=0&.rand=12345639&action=compose&to=' + d.attr('href').replace('mailto:', '').replace('?subject=', '&Subj=');
		d.attr('href', b + c);
		d.attr('target', '_blank');
		break;
	case 'hotmail':
		var b = 'http://mail.live.com/default.aspx?rru=compose&to=' + d.attr('href').replace('mailto:', '').replace('?subject=', '&subject=');
		d.attr('href', b + c);
		d.attr('target', '_blank');
		break;
	case 'aol':
		var b = 'http://mail.aol.com/33490-311/aim-6/en-us/mail/compose-message.aspx?to=' + d.attr('href').replace('mailto:', '').replace('?subject=', '&subject=');
		b += c;
		b = b.replace(/\%0a/gi, '+^^^^+');
		d.attr('href', b);
		d.attr('target', '_blank');
		break;
	}
}

function setupEmailLink(b) {
	var a = options.excludeSig ? '' : encodeURIComponent('\n\nCraigslist Helper : Get your free browser extension for image preview, bookmarks, notes and alerts on Craigslist.').replace(/%20/g, '+');
	switch (options.emailProvider) {
	case 'gmail':
		return b.replace(/href="mailto:[^"]+"/, function(c) {
			return 'target="_blank" ' + c.replace('mailto:', 'https://mail.google.com/mail/?view=cm&fs=1&tf=1&source=mailto&to=').replace('?subject=', '&su=');
		});
		break;
	case 'yahoo':
		return b.replace(/href="mailto:[^"]+"/, function(c) {
			return 'target="_blank" ' + c.replace('mailto:', 'http://us.mg1.mail.yahoo.com/mc/compose?&ymv=0&.rand=12345639&action=compose&to=').replace('?subject=', '&Subj=');
		});
		break;
	case 'hotmail':
		return b.replace(/href="mailto:[^"]+"/, function(c) {
			return 'target="_blank" ' + c.replace('mailto:', 'http://mail.live.com/default.aspx?rru=compose&to=').replace('?subject=', '&subject=');
		});
		break;
	case 'aol':
		return b.replace(/href="mailto:[^"]+"/, function(c) {
			return 'target="_blank" ' + c.replace('mailto:', 'http://mail.aol.com/33490-311/aim-6/en-us/mail/compose-message.aspx?to=').replace('?subject=', '&subject=').replace(/\%0a/gi, '+^^^^+');
		});
		break;
	}
	return b;
}

function loadJsFile(a) {
	var b = document.createElement('script');
	b.setAttribute('type', 'text/javascript');
	b.setAttribute('src', a);
	document.getElementsByTagName('head')[0].appendChild(b);
}

function injectCssFile(b, a) {
	var c = a.createElement('link');
	c.type = 'text/css';
	c.rel = 'stylesheet';
	c.href = b;
	a.getElementsByTagName('head')[0].appendChild(c);
}

function injectJs(b) {
	var a = document.createElement('script');
	a.type = 'text/javascript';
	a.text = b;
	document.getElementsByTagName('head')[0].appendChild(a);
}

function adPageFlagsAndIcons(b, d) {
	var a = $('<div id="zNewFlags" style="position: absolute; right: 0; margin-right: 20px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: orange; font-weight: bold; font-size: 12pt;" id="zFlagStatus"></span>&nbsp;&nbsp;&nbsp;<a class="zAdFlag" href="' + b + 'flag/?flagCode=16&postingID=' + d + '"><img title="miscategorized" src="' + extPath + 'images/miscat-16.png" /></a><a class="zAdFlag" href="' + b + 'flag/?flagCode=28&postingID=' + d + '"><img title="prohibited" src="' + extPath + 'images/stop-16.png" /></a><a class="zAdFlag" href="' + b + 'flag/?flagCode=15&postingID=' + d + '"><img title="spam/overpost" src="' + extPath + 'images/spam-16.png" /></a><a class="zAdFlag" href="' + b + 'flag/?flagCode=9&postingID=' + d + '"><img title="best of craigslist" src="' + extPath + 'images/red-heart-16.png" /></a></div>').insertAfter('hr:eq(0)');
	$('a.zAdFlag', a).click(function() {
		$.get(this.href, function(e) {});
		$('#zFlagStatus').text('Flagged');
		if (this.href.search(/=16|=28|=15/) != -1) {
			chrome.extension.sendRequest({
				op: 'ignore',
				id: d
			});
		}
		return false;
	});
	var c = $("<img title='Bookmark' class='zStarIcon' style='float: none;' src='" + extPath + "images/gray_star_16.png' >").bind('click', function() {
		if (this.src.indexOf('gray_star') > 0) {
			var e = getAdInfo(document.body.innerHTML, location.href);
			chrome.extension.sendRequest({
				op: 'star',
				info: e
			});
			this.src = extPath + 'images/gold_star_16.png';
		} else {
			chrome.extension.sendRequest({
				op: 'removeStar',
				id: d
			});
			this.src = extPath + 'images/gray_star_16.png';
		}
	});
	$('#zNewFlags').prepend(c);
	chrome.extension.sendRequest({
		op: 'getStarredIds',
		ids: [d]
	}, function(e) {
		if (e.length) {
			$('.zStarIcon')[0].src = extPath + 'images/gold_star_16.png';
		}
	});
}

function showBasicTopbar() {
	var a = $('<div class="ziink_topBar"><div class="ziink_topStatus"><div style="position: absolute; right: 0; margin-right: 10px;"><iframe src="//www.facebook.com/plugins/like.php?href=http%3A%2F%2Fwww.facebook.com%2Fpages%2FCraigslist-Helper-Browser-Extension%2F218753694806954&amp;layout=button_count&amp;show_faces=true&amp;width=90&amp;action=like&amp;font&amp;colorscheme=light&amp;height=21" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:90px; height:21px; position: relative; top: 3px" allowTransparency="true"></iframe>&nbsp;&nbsp;&nbsp;&nbsp;<span id="zMenuHover">Menu</span></div><div><a href="http://ziink.com" style="margin-right: 5px"><img src="' + extPath + 'images/peace_icon_s.png"></a> Craigslist Helper</div></div><div id="zMenuBar"><a class="zMenu" href="' + extPath + 'notes.html" target="_blank">Notes</a><a class="zMenu" href="' + extPath + 'starred.html" target="_blank">Starred</a><a class="zMenu" href="' + extPath + 'blacklist.html" target="_blank">Blacklist</a><a class="zMenu" href="' + extPath + 'monitors.html" target="_blank">Alerts</a><a class="zMenu" href="' + extPath + 'recentsearches.html" target="_blank">Recent Searches</a><a class="zMenu" href="' + extPath + 'options.html" target="_blank">Options</a></div></div>').prependTo('body');
	$('#zMenuHover').mouseenter(function() {
		$('#zMenuBar').show();
	});
	$('#zMenuBar').mouseleave(function() {
		$('#zMenuBar').hide();
	});
	$('#zSmartMode').attr('checked', options.smartMode);
	$('#zSmartMode').bind('change', function() {
		options.smartMode = this.checked;
		chrome.extension.sendRequest({
			op: 'saveOptions',
			options: options
		});
	});
}
