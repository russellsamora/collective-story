var _socket,
	_name,
	_paragraphs,
	_turnTimeout,
	_time,
	_startTime,
	_turnTime,
	_inputHTML;

var $storyContainer,
	$countAuthors,
	$message,
	$contribution,
	$newParagraph,
	$inQueue,
	$onDeck,
	$countAhead,
	$countdown,
	$yourTurn;

(function() {

	var RAMBLINGS = {

		init: function() {
			setupSelectors();
			//connect socket
			_socket = io.connect();
			
			//welcome from server
			_socket.on('welcome', function (data) {
				_paragraphs = data.paragraphs;
				_turnTime = Math.floor(data.timer / 1000);
				joinPrompt('Choose a pen name.');
				updateAuthorCount(data.count);
				fillStory();
			});

			//turn queue from server
			_socket.on('sendQueue', function (data) {
				updateAuthorCount(data.count);
				if(data.turn === _name) {
					startTurn();
				} else {
					findName(data.queue);
				}
			});

			//new word to story from server
			_socket.on('addWord', function (data) {
				//if self added it, get rid of turn UI stuff
				if(data.name === _name) {
					$('#word').val('');
					$('.newText').hide();
					$message.hide();
					$contribution.hide();
					$newParagraph.hide();
					$inQueue.show();
				}
				addWord(data);

				if(data.newParagraph) {
					console.log('add para');
					addParagraph(data.currentParagraph);
				}
			});


			//if the user needs to be booted for no responses
			_socket.on('boot', function () {
				displayMessage('You have timed out twice, you are now a mere spectator.');
				$message.hide();
				$('.booted').show();
			});

			//warn user if they missed a turn
			_socket.on('warning', function () {
				displayMessage('You took too long to contribute during your turn, back of the line!');
			});

			//feedback if they can join or not
			_socket.on('joinResponse', function(data) {
				if(data.join) {
					_name = data.name;
					$('.join').hide();
				} else {
					joinPrompt(data.name + ' is taken. Try another.');
				}
			});

			//setup input events
			setupEvents();
		}
	};

	$(function() {
		RAMBLINGS.init();
	});

})();

function findName(queue) {
	for(var i = 0; i < queue.length; i++) {
		if(queue[i] === _name) {
			if(i===0) {
				$message.hide();
				$onDeck.show();
			} else {
				$countAhead.text(i);	
			}
			break;
		}
	}
}

function startTurn() {
	$message.hide();
	$countdown.text(_turnTime);
	$yourTurn.show();
	$('.newText').show();
	$contribution.show();
	_time = 0;
	_startTime = new Date().getTime();
	setTimeout(updateTime, 100);
	$('html, body').animate({ scrollTop: $(document).height()}, 'slow' );
	$('#word').focus();
}

function updateTime() {
	_time += 100;
    var elapsed = _turnTime - Math.floor(_time / 1000);

    //to keep it true to time
    var diff = (new Date().getTime() - _startTime) - _time;

    $countdown.text(elapsed);

    if(elapsed <= 0) {
		_socket.emit('timeLimit');
    } else {
        setTimeout(updateTime, (100 - diff));
    }
}

function setupEvents() {
	$('.joinButton').on('click', function (e) {
		e.preventDefault();
		joinPrompt('Choose a pen name.');
		return false;
	});

	$('.contribute').on('click', function (e) {
		e.preventDefault();

		var val = $('#word').val().trim();

		verifyAndSend(val);
		return false;
    });

    $('.newParaButton').on('click', function(e) {
		e.preventDefault();

		var val = $('#word').val().trim();

		verifyAndSend(val, true);
		return false;
    });
}

function displayMessage(text) {
	$('.appriseOuter, .appriseOverlay').remove();
	apprise(text);
}

function verifyAndSend(val, para) {
	if(val.length < 1) {
		displayMessage('You must enter more than nothing.');
		return;
	}

	//check if it is more than 1 word
	var split = val.split(' ');
	if(split.length > 1) {
		displayMessage('You must enter a single word.');
		return;
	}

	var	data = {
		word: split[0],
		name: _name,
		newParagraph: para
	};

	$('.contribute, .newParaButton').removeClass('btn-primary');
	_socket.emit('contribute', data);
}

function joinPrompt(p) {
	apprise(p + ' (3-15 characters)', {'input':'nomdeplume', 'textOk':'Join'}, function(r) {

		if(r.length > 0) {
			var tempName = r.trim();
			var check = /^[a-zA-Z]*$/.test(r);
			if(check) {
				if(tempName.length > 15 || tempName.length < 3) {
					joinPrompt('Stay within the lines! Try again.');
				} else {
					_socket.emit('join', tempName);
				}
			} else {
				joinPrompt('Only letters please. Try again.');
			}	
		}
	});
}

function fillStory() {
	$('.story').remove();
	for(var p = _paragraphs.length - 1; p > -1; p--) {
		
		var newPara = '<p class="story index' + p + '"><span class="text">';
		newPara += _paragraphs[p] + '</span></p>';
		$('.storyContainer').prepend(newPara);
	}
	addInputBox();
}

function setupSelectors() {
	$storyContainer = $('.storyContainer');
	$countAuthors = $('.countAuthors');
	$message = $('.message');
	$contribution = $('.contribution');
	$newParagraph = $('.newParagraph');
	$inQueue = $('.inQueue');
	$onDeck = $('.onDeck');
	$countAhead = $('.countAhead');
	$countdown = $('.countdown');
	$yourTurn = $('.yourTurn');

	_inputHTML = '<span class="newText"><input id="word" placeholder="enter word here..." maxlength="23"></input></span>';
}

function addWord(data) {
	console.log(data);
	var selector = $('.index' + data.currentParagraph + ' .text');
	var text = $(selector).text() + data.word;
	$(selector).text(text);
}

function addParagraph(index) {
	var afterSelector = $('.index' + index),
		newIndex = index + 1;
	var newPara = '<p class="story index' + newIndex + '"><span class="text"></span></p>';

	afterSelector.after(newPara);
	addInputBox();
}

function bindWordCheck() {
    $('#word').on('input', function (e) {
		e.preventDefault();
		var val = $(this).val().trim();

		//check if it is more than 1 word
		var split = val.split(' ');
		if(split.length === 1) {
			var word = split[0];
				wordLength = split[0].length;
			//make sure it is not nothing
			if(wordLength > 0) {
				$('.contribute, .newParaButton').addClass('btn-primary');

				//check if last char should prompt new Para
				var lastChar = word.charAt(wordLength-1);
				
				//TODO use regex!
				if(lastChar === '.' || lastChar === '!' || lastChar === '?') {
					$newParagraph.show();
				} else {
					$newParagraph.hide();
				}
				return;
			}
		}

		$('.contribute, .newParaButton').removeClass('btn-primary');
		return false;
	});

    $('#word').on('keypress', function (e) {
		if(e.keyCode === 13) {
			e.preventDefault();
			var val = $('#word').val().trim();
			verifyAndSend(val);
			return false;
		}
	});
}

function updateAuthorCount(count) {
	$countAuthors.text(count);
}

function addInputBox() {
	$('.newText').remove();
	$('p.story').last().append(_inputHTML);
	bindWordCheck();
}