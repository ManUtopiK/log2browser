function checkGoBottomButton() {
	var currentPosition = $(document).scrollTop();
	var bottomPosition = $(document).height() - $(window).height();

	if(currentPosition < bottomPosition) {

		/* this a trick to handle bad float management from javascript */
		if(Math.floor($('#to-bottom').css('opacity')*10) == 1) {
			$('#to-bottom').fadeTo(400, 1);
		}
	}
	else if (currentPosition == bottomPosition) {

		if($('#to-bottom').css('opacity') == 1) {
			$('#to-bottom').fadeTo(400, 0.1);
		}
	}
}

function isScrolledIntoView(elem) {
	var docViewTop = $(window).scrollTop();
	var docViewBottom = docViewTop + $(window).height();

	var elemTop = $(elem).offset().top;
	var elemBottom = elemTop + $(elem).height();

	return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom)
	  && (elemBottom <= docViewBottom) &&  (elemTop >= docViewTop) );
}

function checkIfElementIsViewed() {
	$('.tab-pane.active tr.new').each(function() {
		if(isScrolledIntoView($(this))) {
			$(this).fadeTo(400, 1, function() {
				$(this).removeClass('new');
			});
		}
	});

	$('.separator').each(function() {
		if($(this).css('opacity') == 1 && isScrolledIntoView($(this))) {
			$(this).fadeTo(5000, 0.2);
		}
	});
}
var aa;
$(document).ready(function() {

	checkGoBottomButton();

	var socket = io.connect(document.location.origin),
		container = $('#container .tab-content'),
		monitors = [],
		regX = {};

	$(document).scroll(function(event) {

		var slug = $('.tab-content .active').attr('id');
		var currentPosition = $(document).scrollTop();
		monitors[slug].scrollPos = currentPosition;

		checkGoBottomButton();
		checkIfElementIsViewed();
	});


	$('#go-to-bottom').click(function(event) {
		checkGoBottomButton();
	});

	$('#clear-output a').click(function(event) {
		$('.tab-pane.active tr, .tab-pane .nav-pills li').remove();
	});

	$('.tab-content').on('click', 'tr .label', function() {
		$(this).closest('tr').toggleClass('pin');
	});

	$('.tab-content').on('click', '.nav-pills .label', function(e) {
		var $tabPane = $(this).closest('.tab-pane');

		if (e.metaKey) {
			$(this).closest('ul').find('.label').addClass('active');
			$(this).removeClass('active');
			$tabPane.find('tr').hide();
			$tabPane.find('tr.'+$(this).attr('class').match(/(label-type-\S*)/)[0]).show();
		} else {
			var labelType = $(this).attr('class').match(/(label-type-\S*)/)[0];
			if ($(this).hasClass('active')) {
				$tabPane.find('tr.'+labelType).show();
				$(this).removeClass('active');
			} else {
				$tabPane.find('tr.'+labelType).hide();
				$(this).addClass('active');
			}
		}
	});


	socket.on('new-data', function(data) {
		var $doc = $(document),
			fileSlug = data.fileData.file.replace(/\/.*\//g, '').replace(/\./g, '-'),
			$fileSlug = $('#' + fileSlug),
			parseItem = function(value) {
				var ret = {},
					value = (data.fileData.replace && $.isArray(data.fileData.replace)) ? value.replace(new RegExp(data.fileData.replace[0], 'ig'), data.fileData.replace[1]) : value,
					dataItem;

				regX[fileSlug] = regX[fileSlug] || XRegExp(data.fileData.regexData, 'x');
				dataItem = XRegExp.exec(value, regX[fileSlug]);

				if (dataItem.length > 1) {
					// time
					var time = new Date(dataItem.date),
						leadingZeros = function(num, length) {
							length = length || 2;
							num = String(num);
							while (num.length < length) {
								num = "0" + num;
							}
							return num;
						};

					ret.time = leadingZeros(time.getHours()) +':'+ leadingZeros(time.getMinutes()) +':'+ leadingZeros(time.getSeconds()) +':'+ leadingZeros(time.getMilliseconds(), 3);

					// info // Default Primary Success Info Warning Danger
					ret.info = dataItem.info;
					switch(ret.info) {
						case 'INFO':
							ret.type = 'info';
							break;
						case '200':
							ret.type = 'info';
							break;
						case 'NOTICE':
							ret.type = 'warning';
							break;
						default:
							ret.type = 'danger'
					}

					// message
					ret.message = $.trim(dataItem.message.replace(/(\/[^./:]+.[a-zA-Z]+(?: on line |:)[0-9]+)/, '<span class="file">$1</span>').linkify());

					return ret;
				} else {
					return {message: value, time: '??:??:??:???', info: 'NONE', type: 'info'};
				}
			},
			returnItem = function(item, $fileSlug) {
				var item = parseItem(item),
					labelTypeClass = 'label-type-'+ item.info.replace(/\s/g, ''),
					nl2br = function(str, is_xhtml) {
						var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
						return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
					};

				//return $('<li>' + nl2br(data.value) + '</li>');
				// add label
				if (!$fileSlug.find('.nav-pills .'+labelTypeClass).length && item.info !== 'NONE') {
					$fileSlug.find('.nav-pills').append('<li class=""><span class="label label-' + item.type + ' mrs ' + labelTypeClass + '">' + item.info + '</span></li>');
				}
				return $('<tr class="item ' + labelTypeClass + '"><td><small class="mrs">' + item.time + '</small></td><td><span class="label label-' + item.type + ' mrs">' + item.info + '</span></td><td>' + nl2br(item.message) + '</td></tr>');
			};

		if ($fileSlug.length == 0) {

			var newMonitor = $('<div class="tab-pane" id="' + fileSlug + '"></div>');
			newMonitor.append($('<ul class="nav nav-pills"></ul><table></table>'));
			var newMonitorTitle = $('<li id="title-' + fileSlug + '"></li>');

			var newMonitorTitleLink = $('<a data-toggle="tab"></a>');
			newMonitorTitleLink.attr('href', '#' + fileSlug);
			newMonitorTitleLink.html(fileSlug + ' ');
			newMonitorTitleLink.append($('<span class="badge badge-important mls"></span>'));
			newMonitorTitleLink.appendTo(newMonitorTitle);

			newMonitorTitleLink.on('shown', function(event) {
				var id = $(event.target).attr('href');
				var slug = id.substr(1, id.length);
				$doc.scrollTop(monitors[slug].scrollPos);
				checkGoBottomButton();
				checkIfElementIsViewed();
			});

			newMonitor.appendTo(container);
			newMonitorTitle.appendTo($('#menu ul'));
			newMonitorTitleLink.click();

			monitors[fileSlug] = {
				'scrollPos': 0
			};

			newMonitorTitle.click(function() {
				counter = $('#title-' + fileSlug + ' span').html('');
				checkGoBottomButton();
			});

			$fileSlug = $('#' + fileSlug);

			// parse value to check if there is multiple item
			/*var vCheck = data.value.split("\n");

			if (vCheck.length > 1) {
				data.value = vCheck.pop();
				$.each(vCheck, function(i, elem) {
					if (elem.length) $fileSlug.find('table').append(returnItem(elem, $fileSlug));
				});
			}*/
		} else {
			if (!$fileSlug.hasClass('active') && $fileSlug.find('tr.new').length == 0 && $fileSlug.find('tr').length > 0) {
				$fileSlug.find('table').append($('<tr class="separator">#############################################################################</tr>'));
			}
		}

		var values = data.value.split('\n'),//newItem = returnItem(data.value, $fileSlug),
			maxScrollPosition = $doc.height() - $(window).height(),
			mustAutoScroll = maxScrollPosition == monitors[fileSlug].scrollPos;

		$.each(values, function(i, elem) {
			if (elem.length) {
				var newItem = returnItem(elem, $fileSlug);
				$fileSlug.find('table').append(newItem);
				if(!$fileSlug.hasClass('active') || !isScrolledIntoView(newItem)) {
					if($fileSlug.find('tr').length == 0) {
						newItem.addClass('old');
					}
					else {
						newItem.addClass('new');
					}
				}
			}
		});

		if(!$fileSlug.hasClass('active') && $fileSlug.find('li').length > 1) {
			var counter = $('#title-' + fileSlug + ' span');
			if(counter.html() == '') {
				counter.html('0');
			}
			counter.html(parseInt(counter.html()) + 1);
			var $t = $('title'),
				val = parseInt($t.html()) || 0;

			$t.html(val+1 + ' | Logs');
		} else {
			if(mustAutoScroll) {
				$doc.scrollTop($doc.height());
				monitors[fileSlug].scrollPos = $doc.scrollTop();
			}
		}
	});
});


if(!String.linkify) {
	String.prototype.linkify = function() {

		// http://, https://, ftp://
		var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

		// www. sans http:// or https://
		var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

		// Email addresses
		var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;

		return this
			.replace(urlPattern, '<a class="aInLog" target="_blank" href="$&">$&</a>')
			.replace(pseudoUrlPattern, '$1<a class="aInLog" target="_blank" href="http://$2">$2</a>')
			.replace(emailAddressPattern, '<a class="aInLog" target="_blank" href="mailto:$&">$&</a>');
	};
}