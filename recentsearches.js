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
}
var options;
if (zSafari) {
	safari.self.addEventListener('message', safariMessageListener, true);

	function safariMessageListener(a) {
		if (a.name == 'ziinkcl') {
			requestListener(a.message, null, function(b) {
				if (b && a.message.responseFunc != undefined) {
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
} else {
	chrome.extension.onRequest.addListener(requestListener);
}
init();

function init() {
	options = JSON.parse(localStorage.options);
	document.body.style.cssText = 'max-width: ' + options.bodyWidth + 'px; background-color: lightgray; margin-left: auto; margin-right: auto;';
	$('body').css('visibility', 'visible');
}
function listSearches(c) {
	if (!c) {
		return;
	}
	var a = new Date();
	for (var b = 0; b < c.length; b++) {
		a.setTime(c[b].timeStamp);
		var d = c[b].title.replace(/".*"/, '<b>$&</b>');
		if (d == '') {
			continue;
		}
		$('#content').append('<span><img class="del" src="images/gray_delete_16.png" title="Delete" alt="Delete" height="10px"> ' + a.getFullYear() + '-' + (a.getMonth() + 1) + '-' + a.getDate() + ' &nbsp;&nbsp;<a href="' + c[b].url + '">' + d + '</a>' + (c[b].active ? ' <font color="orange">(Alert set)</font>' : '') + '</span><br />');
	}
	$('img.del').click(function(g) {
		var f = $(this).siblings('a').attr('href');
		if ($(this).siblings('font').length) {
			if (confirm('This will delete the alert too.') == false) {
				return;
			}
		}
		chrome.extension.sendRequest({
			op: 'removeSearchItem',
			url: f
		});
		$(this.parentNode).next().remove();
		$(this.parentNode).remove();
	});
}
chrome.extension.sendRequest({
	op: 'getSearches'
}, listSearches);

function requestListener(c, b, a) {
	switch (c.op) {}
}
