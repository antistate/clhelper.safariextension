function inAdPage() {
	showBasicTopbar();
	if (hideAdsTill < (new Date().getTime() - (23 * 60 * 60 * 1000))) {
		hideAdEnable();
	} else {
		if (hideAdsTill > new Date().getTime()) {
			$('.gad').hide();
		}
	}
	modifyJEditable();
	var d = adnumFromUrl(location.href);
	var a = $('a:last')[0].href;
	var c = $('<div id="ziinkBottomBar"><a href="http://ziink.com" style="margin-right: 5px"><img src="' + extPath + 'images/peace_icon_s.png"> Craigslist Helper</a> It took weeks to develop this extension, but it will take only seconds to <iframe src="http://www.facebook.com/plugins/like.php?href=http%3A%2F%2Fwww.facebook.com%2Fpages%2FCraigslist-Helper-Browser-Extension%2F218753694806954&amp;layout=button_count&amp;show_faces=true&amp;width=90&amp;action=recommend&amp;font&amp;colorscheme=light&amp;height=21" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:90px; height:21px; position: relative; top: 3px" allowTransparency="true"></iframe> it. Please spread the word.</div>').appendTo('#wrapper');
	$('#clTxt').html($('#clTxt').html().replace(/\b\d{3}\D{1,2}\d{3}\D{1,2}\d{4}\b|\b\d{3}\D{1,2}\d{7}\b/g, '<span style="background-color: yellow;"><a href=\'http://www.google.com/search?hl=en&safe=off&q="$&"+-intitle%3Aphone+-intitle%3Areverse+-intitle%3Aowner+-intitle%3Alookup+-intitle%3Atrack+-0000+-xxxx\'>$&</a></span>'));
	chrome.extension.sendRequest({
		op: 'getNote',
		id: d
	}, function(e) {
		if (!e) {
			e = '';
		}
		makeEditable($("<div class='ziink_top_note' id='" + d + "' style='background-color: #" + options.notesBgColor + '; border-color: ' + darkerColor(options.notesBgColor, 0.2) + "'>" + e.replace(/\n/g, '<br>\n') + '</div>').insertBefore('h2:first'));
	});
	if (options.emailProvider != 'unset' && options.emailProvider != 'none') {
		setupEmailLinkDom('#mailtoSpan');
	}
	var b = a.replace(/([a-z]\/).*/, '$1');
	adPageFlagsAndIcons(b, d);
	$('#hideZAdsForHour_1').click(function() {
		$(this).hide();
		$('.gad').hide();
		chrome.extension.sendRequest({
			op: 'saveLocalStorage',
			key: 'hideAdsTill',
			data: new Date().getTime() + 60 * 1000 * 60
		});
	});
	chrome.extension.sendRequest({
		op: 'getUrl',
		url: a
	}, function(f) {
		if (!f) {
			return;
		}
		var g = f.match(/id="ef" href="\/([^"]*)/);
		var e = b + g[1];
		$('#zNewFlags').prepend('<a href="' + e + '"><img title="email this posting to a friend" src="' + extPath + 'images/email_forward.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
	});
}

function hideAdEnable() {
	var a = $('#lowergad');
	if (a.length == 0 || a.height() == 0) {
		a = $('.gad:first');
	}
	if (a.length == 0 || a.height() == 0) {
		a = $('.gad:last');
	}
	if (a.length > 0 && a.height() > 0) {
		a.append('<div id="hideZAdsForHour_1" style="font-family: verdana,arial,sans-serif;font-size: 8px; ">hide ads for an hour</div>');
	}
}

function init1() {
	chrome.extension.sendRequest({
		op: 'getLocalStorage',
		key: 'hideAdsTill'
	}, function(a) {
		if (a) {
			hideAdsTill = a;
		}
	});
	chrome.extension.sendRequest({
		op: 'getOptions'
	}, function(a) {
		options = a;
		inAdPage();
	});
}
init1();
