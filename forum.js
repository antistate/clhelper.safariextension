/* (c) 2011 Ziink */
if (typeof safari !== 'undefined') {
	var extPath = safari.extension.baseURI;
} else {
	var extPath = chrome.extension.getURL('');
}
var collapseThread = false;
var activeThread;

function fetchThread(e) {
	function a(g) {
		if (g.length == 0) {
			return;
		}
		var f = g.shift().substring(6);
		$.get(f, function(i) {
			var j = i.match(/<body>([\s\S]+)<\/body>/)[1];
			j = j.replace(/<script type.*?\/script>/g, '');
			var k = $('<div style="border: 1px lightgray solid; margin: 5px; padding: 10px;">' + j + '</div>').appendTo(d);
			$('a.pln:not(.hnd)', k).prev().remove();
			$('a.pln:not(.hnd)', k).prev().remove();
			$('a.pln:not(.hnd)', k).prev('br').remove();
			$('a.pln:not(.hnd)', k).remove();
			k.children(':last').remove();
			var h = $('#barDiv', k).html();
			$('#barDiv', k).next().remove();
			$('#barDiv', k).remove();
			h = h.replace('reply to this post', '<img src="' + extPath + 'images/comment_bubble_16.png" title="reply to this post" alt="reply to this post" />').replace('email it', '<img src="' + extPath + 'images/email_forward_16.png" title="email it" alt="email it" />').replace('>rate<', '><img src="' + extPath + 'images/gray_star_16.png" title="rate" alt="rate" /><').replace('>flag<', '><img src="' + extPath + 'images/gray_flag_16.png" title="flag" alt="flag" /><');
			$('#titleLine br:first', k).before('<span style="margin-left:10px">' + h + '</span>');
			if ($('.quote', k).length == 0) {
				$('#titleLine br:last', k).remove();
				$('#titleLine br:last', k).remove();
			}
			if (activeThread == d[0].parentNode) {
				$('body', c).append(k[0].outerHTML);
			}
			a(g);
		});
	}
	var c = jQuery('#R')[0].contentDocument;
	var d = $('<div class="threadContent" style="display: none;"></div>').appendTo(e);
	var b = e.innerHTML.match(/href="\?act=Q[^"]+/g);
	a(b);
}
function inForum() {
	$('#L').load(function() {
		var c;

		function b(j, k, h) {
			var i = j.indexOf('<br>', k);
			c += '<span class="thread">' + j.substring(k, i + 4) + '<span style="display: ' + (collapseThread ? 'none' : 'inline') + ';">' + j.substring(i + 4, h) + '</span></span>';
			return j.indexOf('<span title="', h + 10);
		}
		var g = jQuery('#L')[0].contentDocument;
		var d = $('.threads td', g)[0].innerHTML;
		$('.threads td', g).empty();
		var f = d.indexOf('<span title="');
		var a = d.indexOf('<span title="', f + 10);
		var e;
		c = d.substring(0, f);
		while ((e = b(d, f, a)) != -1) {
			f = a;
			a = e;
		}
		b(d, a, d.length);
		$('.threads td', g)[0].innerHTML = c;
		$('span.thread', g).hoverIntent({
			over: function(i) {
				activeThread = this;
				var h = jQuery('#R')[0].contentDocument;
				$('body', h).empty();
				if ($('div.threadContent', this).length == 0) {
					fetchThread(this);
				} else {
					$('body', h).append($('div.threadContent', this).html());
				}
			},
			out: function(h) {},
			sensitivity: 2,
			interval: 250,
			timeout: 100
		});
	});
}
inForum();
