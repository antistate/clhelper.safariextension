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
options = JSON.parse(localStorage.options);
document.body.style.cssText = 'max-width: ' + options.bodyWidth + 'px; background-color: lightgray; margin-left: auto; margin-right: auto;';

function listPhrases(b) {
	for (var a = 0; a < b.length; a++) {
		$('#blacklist').append('<div class="phrase"><img class="del" src="images/gray_delete_16.png" title="Delete" alt="Delete">' + b[a] + '</div>');
	}
	$('img.del').click(function(c) {
		chrome.extension.sendRequest({
			op: 'removeBlacklistItem',
			phrase: this.parentNode.textContent
		});
		$(this.parentNode).remove();
	});
}
chrome.extension.sendRequest({
	op: 'getBlacklist'
}, listPhrases);

function savePhrase() {
	chrome.extension.sendRequest({
		op: 'addIgnorePhrase',
		text: document.newPhraseForm.phrase.value
	});
	listPhrases([document.newPhraseForm.phrase.value]);
}
