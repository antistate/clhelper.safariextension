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
	safari.self.addEventListener('message', safariMessageListener, true);

	function safariMessageListener(a) {
		if (a.name == 'ziinkcl_response') {
			responseFuncs[a.message.responseFunc](a.message.data);
		}
	}
}
init();

function init() {
	options = JSON.parse(localStorage.options);
	document.body.style.cssText = 'max-width: ' + options.bodyWidth + 'px; background-color: lightgray; margin-left: auto; margin-right: auto;';
	$('#checkAlerts').click(checkAlerts);
	chrome.extension.sendRequest({
		op: 'getMonitors'
	}, listMonitors);
	$('body').css('visibility', 'visible');
}
function checkAlerts() {
	chrome.extension.sendRequest({
		op: 'checkMonitors'
	});
	$('#zMsg').text('Checking for new ads. Notification will be displayed if any new ad found.');
}
function listMonitors(b) {
	if (!b) {
		return;
	}
	for (var a = 0; a < b.length; a++) {
		$('#content').append('<p style="background-color: #f4f4f4;"><a href="' + b[a].url + '">' + b[a].title + '</a><br>Checked every ' + b[a].frequency + (b[a].time_unit < 3600000 ? ' minute' : (b[a].time_unit > 3600000 ? ' day' : ' hour')) + ' <button class="zButton">Remove Alert</button><br></p>');
	}
	$('.zButton').click(function() {
		var c = $(this).siblings('a').attr('href');
		chrome.extension.sendRequest({
			op: 'deactivateMonitor',
			url: c
		});
		$(this).parent().hide();
	});
}
