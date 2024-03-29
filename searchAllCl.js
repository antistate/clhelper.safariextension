/* (c) 2011 Ziink */
if (typeof safari !== 'undefined') {
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
}
var options;
var links = [];
var fetched;
init();

function init() {
	if (typeof safari !== 'undefined') {
		safari.self.addEventListener('message', b, true);

		function b(d) {
			if (d.name == 'ziinkcl') {
				requestListener(d.message, null, function(e) {
					if (e && d.message.responseFunc != undefined) {
						safari.self.tab.dispatchMessage('ziinkcl_response', {
							responseFunc: d.message.responseFunc,
							data: e
						});
					}
				});
			} else {
				if (d.name == 'ziinkcl_response') {
					responseFuncs[d.message.responseFunc](d.message.data);
				}
			}
		}
	} else {
		chrome.extension.onRequest.addListener(requestListener);
	}
	options = JSON.parse(localStorage.options);
	document.body.style.cssText = 'max-width: ' + options.bodyWidth + 'px; background-color: lightgray; margin-left: auto; margin-right: auto; cursor: wait;';
	modifyJEditable();
	$('body').css('visibility', 'visible');
	var c = location.href.match(/query=(.*)/)[1];
	var a = location.href.match(/cat=(\w*)/)[1];
	$('#query').val(c);
	$('#catAbb').val(a);
	$('#query').keypress(function(d) {
		if (d.which == '13') {
			$('#searchButton').click();
		}
	});
	$('#searchButton').click(function() {
		if ($('#query').val() == '') {
			$('#statusMsg').text('No search string specified');
			return;
		}
		$('#statusMsg').text('');
		$('#listings').prepend('<span>Searching, please wait ...</span><br><br>');
		var d = location.href.replace(/#.*/, '');
		location.href = d + '#cat=' + encodeURIComponent($('#catAbb').val()) + '&query=' + encodeURIComponent($('#query').val());
		links = [];
		document.body.style.cursor = 'wait';
		$('#content')[0].style.cursor = 'wait';
		gUrl();
	});
	gUrl();
}
function unique(c) {
	var e = new Array();
	o: for (var d = 0, g = c.length; d < g; d++) {
		for (var b = 0, f = e.length; b < f; b++) {
			if (e[b] == c[d]) {
				continue o;
			}
		}
		e[e.length] = c[d];
	}
	return e;
}
function displayPageful() {
	var a = $('p.row');
	if (a.length > pageSize) {
		$('<button>Show more ads</button>').insertBefore(a[pageSize]).click(function() {
			var c = $(this);
			var e = c.nextAll('p.row:not(.ziink_ignored)');
			for (var d = 0, b = pageSize; d < b; d++) {
				$(e[d]).show();
			}
			if (e.length > pageSize) {
				c.detach();
				c.insertBefore(e[pageSize]);
			} else {
				c.remove();
			}
			processListings();
		});
	}
	processListings();
}
function renderLinks() {
	links = unique(links).sort(function(e, d) {
		return d.id - e.id;
	});
	var c = '<br>';
	for (var b = 0, a = links.length; b < a; b++) {
		c += ((b < pageSize) ? '<p class="row">' : '<p class="row" style="display: none;" >') + links[b].a + '<br /></p>';
	}
	$('#listings').html(c);
	displayPageful();
}
function processData(a) {
	if (!a) {
		document.body.style.cursor = 'auto';
		$('#content')[0].style.cursor = 'auto';
		return;
	}
	extractLinks(a);
	if (++fetched == 2) {
		renderLinks();
		document.body.style.cursor = 'auto';
		$('#content')[0].style.cursor = 'auto';
	}
}
function extractLinks(f) {
	if (!f) {
		return;
	}
	f = f.replace(/<em>/g, '').replace(/<\/em>/g, '').replace(/class=l [^>]*/g, 'class="bare" ');
	var d = f.match(/<a href="http:\/\/[a-z]+\.craigslist\.[^>]+>.*?<\/a>/g);
	if (!d) {
		return;
	}
	for (var e = 0, c = d.length; e < c; e++) {
		var b = d[e].match(/\/(\d+)\.html/);
		if (!b) {
			continue;
		}
		var g = b[1];
		links.push({
			id: g,
			a: d[e]
		});
	}
}
function gUrl() {
	var b = location.href.match(/query=(.*)/)[1];
	var a = location.href.match(/cat=(\w*)/)[1];
	switch (a) {
	case '':
		break;
	case 'sss':
		a = '';
		break;
	case 'cta':
		a = 'inurl:cto|ctd';
		break;
	case 'fua':
		a = 'inurl:fuo|fud';
		break;
	case 'mca':
		a = 'inurl:mcy|mcd';
		break;
	case 'tia':
		a = 'inurl:tix|tid';
		break;
	default:
		a = 'inurl:' + a;
	}
	fetched = 0;
	var c = 'http://www.google.com/search?num=100&as_qdr=all&tbs=sbd:1,qdr:m&q=' + b + '+-classifieds+site:craigslist.org+' + a;
	getUrl(c, processData);
	var c = 'http://www.google.com/search?num=100&as_qdr=all&q=' + b + '+-classifieds+site:craigslist.org+' + a;
	getUrl(c, processData);
}
function getUrl(a, c) {
	try {
		$.ajax({
			url: a,
			success: function(d) {
				c(d);
			},
			error: function() {
				c(null);
			}
		});
	} catch (b) {
		console.log('Caught an exception on getUrl');
		c(null);
	}
}
function inListingPage() {
	var a = new Array();
	$("a[href$='.html']", document).each(function(b) {
		var c = adnumFromUrl(this.href);
		if (c) {
			a.push(c);
			doLink(this, c);
		}
	});
	if (a.length) {
		chrome.extension.sendRequest({
			op: 'getStarredIds',
			ids: a
		}, function(b) {
			$("a[href$='.html']", document).each(function(c) {
				var d = adnumFromUrl(this.href);
				if (d) {
					if (b.length && jQuery.inArray(parseInt(d), b) >= 0) {
						$(this).parents('P:first').addClass('ziink_starred').children('.zStarIcon')[0].src = extPath + 'images/gold_star_16.png';
					}
				}
			});
		});
	}
}
function requestListener(c, b, a) {
	switch (c.op) {
	case 'noteUpdated':
		if (c.note != '') {
			$('#' + c.id).html(c.note.replace(/\n/g, '<br>\n'));
		} else {
			$('#' + c.id).hide();
		}
		a();
		break;
	}
}
