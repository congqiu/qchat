(function ($) {
	$.qChat = function (options) {
		this.io = options.io || null;
	  this.beforeEmoji = options.beforeEmoji || false;
	  this.currentUser = options.currentUser || null;
	  this.tools = baseTools;
	  this.static = options.static;
	  this.gRecorder = null;
	  this.startAudio = 0;
	  var self = this;

		self.init = function() {
    	self.socket = io();
    	$('.before-login .info').text('赶紧登录/注册使用吧！');
	    self.socket.on('connect', function() {
	      self.socket.emit('init');
	    	self.tools.setCookie('chat_with', 'all');
	    });
	    $('.before-login .login-form button').click(function () {
	    	var username = $('.before-login .login-form input[name=username]').val().trim();
	    	var password = $('.before-login .login-form input[name=password]').val().trim();
	    	$.post('/login', {username: username, password: password}, function(data, textStatus, xhr) {
	    		if (data.status) {
	    			$('.before-login').hide();
	    			self.init();
	    		} else {
	    			$('.before-login .info').text(data.message);
	    		}
	    	});
	    });
	    $('.before-login .reg-form button').click(function () {
	    	var username = $('.before-login .reg-form input[name=username]').val().trim();
	    	var password = $('.before-login .reg-form input[name=password]').val().trim();
	    	$.post('/register', {username: username, password: password}, function(data, textStatus, xhr) {
	    		if (data.status) {
	    			$('.before-login').hide();
	    			self.init();
	    		} else {
	    			$('.before-login .info').text(data.message);
	    		}
	    	});
	    });
	  	$('.send-board .btn-send').click(function(event) {
	      var message_dom = $('.send-board div.message');
	  		var msg = $('.send-board div.message')[0].innerHTML;
	      var reg = /[^(<div>)?(&nbsp;)*(\s)?<br>(&nbsp;)*(</div>)?]/;
	      if (! reg.test(msg)) {
	      	message_dom[0].innerHTML = '';
          showToast('不能发送空白消息！');
          message_dom.focus();
        	return false;
	      }

	      if ($('.send-board div.message').text().length > 1000) {
          showToast('消息过长，请多条发送！');
          message_dom.focus();
	        return false;
	      }
	      self._sendMsg(msg);
	      return false;
	  	});
	    $('.send-board .message').keyup(function(event) {
	      var message_dom = $('.send-board div.message');
	      var msg = message_dom[0].innerHTML;

	      if (event.ctrlKey && event.keyCode == 13) {
	      	var msgHtml = message_dom.html();
	      	if (!/<br>$/.test(msgHtml)) {
	      		msgHtml += '<br>';
	      	}
	        message_dom.html(msgHtml + '<br>');
	        message_dom.scrollTop(message_dom[0].scrollHeight); 
	        self.tools.placeCaretAtEnd(message_dom.get(0));
	        return false;
	      }
	      var reg = /[^(<div>)?(&nbsp;)*(\s)?<br>(&nbsp;)*(</div>)?]/;	//消息中只包含换行或空格，没有其他
	      if (event.keyCode == 13 && !event.ctrlKey) {
		      if (! reg.test(msg)) {
		      	message_dom[0].innerHTML = '';
	          showToast('不能发送空白消息！');
	        	return false;
		      }
	        if (message_dom.text().length > 1000) {
	          showToast('消息过长，请多条发送！');
	          return false;
	        }
	        self._sendMsg(msg);
	        return false;
	      }
	    }).keypress(function(e) {
	    	if (e.keyCode == 13 && !e.ctrlKey) {
	    		e.preventDefault();
	    	}
	    }).focus(function(event) {
	    	self.tools.placeCaretAtEnd($(this).get(0));
	    });
	    $('.send-board').on('drop', '.message', function(event) {
	    	event.preventDefault();
	    	var file = event.dataTransfer || event.originalEvent.dataTransfer;
        var message_dom = $('.send-board div.message');
	  		var result = previewImage(file);
	  		if (!result.result) {
	  			showToast(result.message);
	  		}
	      message_dom.focus();
	      self.tools.placeCaretAtEnd(message_dom.get(0));
	    });
	    $('.send-board').on('paste', '.message', function(event) {
	      var message_dom = $('.send-board div.message');
	    	var clipboardData = event.clipboardData || event.originalEvent.clipboardData;
	    	if (clipboardData && clipboardData.items) {
	    		var items = clipboardData.items;
	        for (index in items) {
	          var item = items[index];
	          if (item.kind === 'file') {
	            if((item.type).indexOf('image') === -1) {
	            	showToast("请选择图片发送！");
						    return; 
						  } 
		    			event.preventDefault();
	          	var id = 'preview' + ($('.pre-img').length + 1);
						  $('.send-board div.message').append('<a class="to-pre-img" target="_blank"><img class="pre-img" id=' + id + ' src="" alt=""></a>');
						  var img = document.getElementById(id);
	            var blob = item.getAsFile();
	            var reader = new FileReader();
	            reader.readAsDataURL(blob);
	            reader.onload = function(evt) {
	             	img.src = evt.target.result;
	             	$('#' + id).parent('.to-pre-img').attr('href', img.src);
	            };
	          }
	        }
	    	}
        message_dom.focus();
	      self.tools.placeCaretAtEnd(message_dom.get(0));
	    });
	  	$('#sendImage').change(function(event) {
	  		var message_dom = $('.send-board div.message');
	  		var result = previewImage(event.target);
	  		if (!result.result) {
	  			showToast(result.message);
	  		}
	      $('#sendImage').val('');
	      message_dom.focus();
	      self.tools.placeCaretAtEnd(message_dom.get(0));
	  	});
	    if (self.beforeEmoji !== false && parseInt(self.beforeEmoji) > 0) {
	      setTimeout(self._initialEmoji, parseInt(self.beforeEmoji));
	    }
	    $('.send-board input[name=emoji]').click(function(event) {
	      self._initialEmoji();
	      $('.emoji-board').show();
	      event.stopPropagation();
	    });
	    $('.emoji-tabs span').click(function(event) {
	      $('.emoji-tabs span').removeClass('active');
	      var type = $(this).addClass('active').data('type');
	      $('.emoji-body .item').hide();
	      $('.emoji-body .item-' + type).show();
	      event.stopPropagation();
	    });
	    $('.emoji-body .item').on('click', 'img', function(event) {
	  		var message_dom = $('.send-board div.message');
	       message_dom.focus().html(message_dom.html() + self._showEmoji('[emoji:' + $(this).attr('title') + ']'));
	      self.tools.placeCaretAtEnd(message_dom.get(0));
	      $('.emoji-board').hide();
	    });
	    $('.send-board input[name=clear]').click(function(event) {
	    	var to = $('.send-board').attr('data-to');
	      $('#chat-' + to).empty();
	    });
	    $('.send-board input[name=audio]').mousedown(function(event) {
	    	var to = $('.send-board').attr('data-to');
	    	var audio = getUserMedia({audio: true, video: false});
	    	self.startAudio = + new Date();
	    	self.gRecorder = null;
	    	audio.then(function(stream) {
	    		self.gRecorder = new SRecorder(stream);
	        self.gRecorder.start();
				  $(this).unbind('mouseup').mouseup(function(event) {
			    	if (+ new Date() - self.startAudio > 600) {
			    		var to = $('.send-board').attr('data-to');
			    		var _blob = self.gRecorder.getBlob();
				    	self.socket.emit('audioMsg', _blob, to);
		      		self._showNewMsg('user', window.URL.createObjectURL(_blob), {owner: true, from: to, isAudio: true});
			    	}
		        $(this).unbind('mouseup');
		        self.stopAudio();
			    });
				})
				.catch(function(err) {
    			showToast('您的设备不支持语音');
				});
	    }).mouseup(function(event) {
		    if (+ new Date() - self.startAudio <= 600) {
		    	showToast('录音时间太短');
    			self.stopAudio();
		    }
	    });;
	    $('.msgs-board').on('click', 'ul li button', function(event) {
	    	var icon = $(this).find('span');
	    	var audio = $(this).find('audio');
	    	if (icon.hasClass('glyphicon-play')) {
	    		$(this).removeClass('new');
	    		audio.get(0).play();
	    		icon.removeClass('glyphicon-play').addClass('glyphicon-stop');
	    		audio.bind('ended',function () {
	    			icon.removeClass('glyphicon-stop').addClass('glyphicon-play');
					});
	    	} else {
	    		audio.get(0).pause();
	    		icon.removeClass('glyphicon-stop').addClass('glyphicon-play');
	    	}
	    });
	    $(document).click(function(event) {
	      $('.emoji-board').hide();
	    });
	    $(document).on({ 
        dragleave: function(e) {
          e.preventDefault();
        },
        drop: function(e) {
          e.preventDefault();
        },
        dragenter: function(e) {
          e.preventDefault();
        },
        dragover: function(e) {
          e.preventDefault();
        }
    	});
	    
	    $('.users-list ul').on('click', 'li', function (e) {
	    	var user = $(this).data('user');
	    	var username = $(this).find('.username').text();
	    	$('.users-list ul li').removeClass('active');
	    	$(this).addClass('active').find('.counts').hide().text(0);
	    	self.tools.setCookie('chat_with', user);
	    	$('.msgs-board ul').hide();
	    	$('#status').text('与' + username + '聊天');
	    	$('.send-board').attr('data-to', user);
	    	var msgBoard = $('.msgs-board').find('#chat-' + user);
	    	if (msgBoard.length) {
	    		msgBoard.show();
	    	} else {
	    		var newBoard = '<ul id="chat-' + user + '"></ul>';
	    		$('.msgs-board .mCSB_container').append(newBoard);
	    	}
	    	$('.send-board div.message')[0].innerHTML = '';
	    });


	    self.socket.on('loginFail', function(msg) {
	      $('.before-login').show();
	      $('.before-login .info').text(msg);
	    });
	  	self.socket.on('loginSuccess', function (user) {
	      $('.before-login').hide();
	      self.currentUser = user;
	  	});
	  	self.socket.on('systemMsg', function (msg) {
	  		self._showNewMsg('系统消息', msg);
	  	});
	  	self.socket.on('newMsg', function (user, msg) {
	  		self._showNewMsg(user, msg, {from: 'all'});
	  	});
	  	self.socket.on('newPrivateMsg', function (user, msg, from) {
	  		self._showNewMsg(user, msg, {from: from});
	  	});
	  	self.socket.on('newAudioMsg', function (user, msg, from) {
	  		var audio = document.querySelector('audio');
	  		var _blob = new Blob([msg], { type: 'audio/wav' });
	  		var src = window.URL.createObjectURL(_blob);
	  		self._showNewMsg(user, src, {from: from, isAudio: true})
	  	});
	    self.socket.on('showOnline', function(info) {
	      $(".users-list ul.private").empty();
	      var user_account = 0;
	      for(var user in info) {
	        var username = info[user].username;
	        var avatar = (info[user].avatar) ? '/avatar/' + info[user].avatar : "/avatar/default.jpg";
	        if(user != self.currentUser.uid) {
	          var online ='<li class="clearfix" data-user="' + user + '" id="user-' + user + '"><span class="avatar col-md-3"><image src="' +avatar+ '"></span>' + 
	          	'<div class="infos col-md-9">' +
	          		'<div class="username">' + username + '</div>' +
	          		'<div class="latest"></div>' +
	          		'<div class="counts">0</div>' +
	          	'</div>' +
	          '</li>';
	          $(".users-list ul.private").append(online);
	          user_account++;
	        }
	      }
	      var chat = self.tools.getCookie('chat_with') || 'all';
	      $('#user-' + chat).addClass('active');
	      $('.users-list').mCustomScrollbar({
	        theme: "minimal-dark",
	      });
	      $('#status').text(user_account + 1 + '个用户在线');
	    });
	  };

	  self._sendMsg = function (msg) {
	  	var to = $('.send-board').attr('data-to');
      if (to === 'all') {
      	self.socket.emit('groupMsg', msg, to);
      } else {
      	self.socket.emit('privateMsg', msg, to);
      }
      self._showNewMsg('user', msg, {owner: true, from: to});
      $('.send-board div.message').focus()[0].innerHTML = '';
      return true;
	  };
	  self._showNewMsg = function (user, msg, _options) {
	  	var options = _options || {};
	  	var date = new Date().toTimeString().substr(0, 8);
	  	var timeStamp = Date.parse(new Date()) / 1000;
	  	var from = options.from || 'all';
	  	var isAudio = options.isAudio || false;
	  	var msgboard_dom = $('.msgs-board');

	  	var msgBoard = msgboard_dom.find('#chat-' + from);
    	if (msgBoard.length === 0) {
    		var newBoard = '<ul id="chat-' + from + '" class="hiden"></ul>';
    		$('.msgs-board .mCSB_container').append(newBoard);
    	}

    	var from_user_dom = $('.users-list #user-' + from);
    	if (!from_user_dom.hasClass('active')) {
    		var counts_dom = from_user_dom.find('.counts');
    		var unreadCounts = options.unread || (parseInt(counts_dom.text()) + 1);
    		var unread = unreadCounts > 99 ? '99+' : unreadCounts;
    		counts_dom.show().text(unread);
    	}

	  	var msgHtml = document.createElement("li");
	    var uclass = user === '系统消息' ? 'system' : 'user';
	  	var owner = options.owner || false;
	    var msgBody = '';
	    var avatar = "/avatar/default.jpg";
 			var owner_class = owner ? 'self' : '';
 			var latest_msg = $('#chat-' + from).find('p.time').last();
 			if (latest_msg.length == 0 || (timeStamp - latest_msg.attr('data-time') > 60)) {
 				msgBody = '<p class="time" data-time="' + timeStamp + '"><span>' + date + '</span></p>';
 			}

 			if (isAudio) {
 				if (from === 'all' && !owner) {
	  			msgBody += '<div class="message-body">' +
			  								'<img class="avatar" src="' + avatar + '">' +
			  								'<div class="username">' + user + '</div>' +
			  								'<button class="text new"><span class="glyphicon glyphicon-play"></span>' +
	  											'<audio src="' + msg + '">' +
	  										'</button>' +
			  							'</div>';
		    } else {
	  			msgBody += '<div class="message-body ' + owner_class + '">' +
	  										'<img class="avatar" src="' + avatar + '">' +
	  										'<button class="text new"><span class="glyphicon glyphicon-play"></span>' +
	  											'<audio src="' + msg + '">' +
	  										'</button>' +
	  									'</div>';
		    }
 			} else {
 				msg = self.dealMsg(msg);
 				if (uclass === 'system') {
		    	msgBody = '<p class="time"><span>' + date + '</span></p>' +
		    							'<div class="message-body system">' +
		    								'<div class="text">' + msg + '</div>' +
		    							'</div>';
		    } else {
			    if (from === 'all' && !owner) {
		  			msgBody += '<div class="message-body">' +
				  								'<img class="avatar" src="' + avatar + '">' +
				  								'<div class="username">' + user + '</div>' +
				  								'<div class="text">' + msg + '</div>' +
				  							'</div>';
			    } else {
		  			msgBody += '<div class="message-body ' + owner_class + '">' +
		  										'<img class="avatar" src="' + avatar + '">' +
		  										'<div class="text">' + msg + '</div>' +
		  									'</div>';
			    }
		    }
 			}

	    
	  	msgHtml.innerHTML = msgBody;
  		$('#chat-' + from).append(self._showEmoji(msgHtml));
  		msgboard_dom.mCustomScrollbar("scrollTo", 'bottom');
	  };
	  self._initialEmoji = function() {
	    if ($('.emoji-board .emoji-body .item img').length > 0) {
	      return false;
	    }
	    var emoji_src =  self.static + '/emojis/';
	    $.getScript(emoji_src + 'info.js', function(data, textStatus) {
	    	if ((typeof emojisInfo) != 'undefined') {
	        for(var k = 0; k < emojisInfo.length; k++){
	          var docFragment = document.createDocumentFragment();
	          var emoji_info = emojisInfo[k];
	          for (var i = emoji_info.start; i < emoji_info.len + emoji_info.start; i++) {
	              var emojiItem = document.createElement('img');
	              emojiItem.src = emoji_src + k + '/' + i + '.gif';
	              emojiItem.title =  k + '-' + i;
	              docFragment.appendChild(emojiItem);
	          }
	          $('.emoji-board .emoji-body .item.item-' + k).append(docFragment);
	        }
	      }
	    });
	  };
	  self._showEmoji = function(msg) {
	    var result = msg;
	    var reg = /\[emoji:(\d+)-(\d+)\]/g;
	    var emojiTypes = $('.emoji-body .item').length;
	    var totalEmojiNum;
	    var match = reg.exec(msg);
	    while (match) {
	      if (match[1] > emojiTypes) {
	        result = result.replace(match[0], '[X]');
	      } else {
	        totalEmojiNum = $('.emoji-body .item-' + match[1] + ' img').length;
	        if (match[2] > totalEmojiNum) {
	          result = result.replace(match[0], '[X]');
	        } else {
	          result = result.replace(match[0], '<img class="emoji" src="' + self.static + '/emojis/' + match[1] + '/' + match[2] + '.gif" />');
	        }
	      }
	      match = reg.exec(msg);
	    }
	    return result;
	  };

	  self.dealMsg = function (msg) {
			if (msg.match(/id="preview(\w+)"/)) {
	      msg = msg.replace(/id="preview(\w+)"/g,"");
	      msg = msg.replace(/class="pre-img"/g,'class="msg-img"');
	    }
	    return msg;
		};
    self.stopAudio = function () {
			setTimeout(function () {
    	 	if (self.gRecorder) {
		    	self.gRecorder.clear();
	        self.gRecorder.stop();
        } else {
        	self.stopAudio()
    		};
			}, 50);
    }

	  self.init();
	};

	$.fn.qChat = function () {
		return new $.qChat(arguments[0]);
	};
})(jQuery);


function previewImage(file) {
  var id = 'preview' + ($('.pre-img').length + 1);
  $('.send-board div.message').append('<a class="to-pre-img" target="_blank"><img class="pre-img" id=' + id + ' src="" alt=""></a>');
  var img = document.getElementById(id);
  if(file.files[0].type.indexOf('image') === -1) { 
    return {result: false, message: "请选择图片发送！"}; 
  } 
  if(file.files[0].size > 2 * 1024 * 1024) { 
    return {result: false, message: "图片大小不能超过2M"}; 
  } 
  if (window.FileReader) {
    var reader = new FileReader();
    reader.readAsDataURL(file.files[0]);
    reader.onload = function (evt) {
      img.src = evt.target.result;
      $('#' + id).parent('.to-pre-img').attr('href', img.src);
    };
  } else { 
    return {result: false, message: "抱歉，您的浏览器不支持文件处理，请使用最新版本浏览器！"}; 
  }
  return {result: true, message: "成功"}; 
}

function showToast(content, dom, time) {
	var toast_dom = dom || $('.toast-board');
	var _time = time || 3000;
	toast_dom.html(content).show();
	var t = setTimeout(function () {
		toast_dom.hide();
		clearTimeout(t);
	}, _time);
}

function getUserMedia(constraints) {
	var promisifiedOldGUM = function () {
	  var getUserMedia = (navigator.getUserMedia ||
	      navigator.webkitGetUserMedia ||
	      navigator.mozGetUserMedia);
	  if(!getUserMedia) {
	    return false;
	  }
	  return getUserMedia;
	}

	if(navigator.mediaDevices === undefined) {
	  navigator.mediaDevices = {};
	}

	if(navigator.mediaDevices.getUserMedia === undefined) {
	  navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
	}
	return navigator.mediaDevices.getUserMedia(constraints);
}

//参考http://web.jobbole.com/84706/
//处理获取到的音频数据
function SRecorder(stream) {
  config = {};

  config.sampleBits = config.smapleBits || 8;
  config.sampleRate = config.sampleRate || (44100 / 6);

  AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
  if (!AudioContext) {
  	return false;
  }
  var context = new AudioContext();
  var audioInput = context.createMediaStreamSource(stream);
  var recorder = context.createScriptProcessor(4096, 1, 1);
 
  var audioData = {
    size: 0,
    buffer: [],
    inputSampleRate: context.sampleRate,
    inputSampleBits: 16,
    outputSampleRate: config.sampleRate,
    oututSampleBits: config.sampleBits,
    clear: function() {
      this.buffer = [];
      this.size = 0;
    },
    input: function (data) {
      this.buffer.push(new Float32Array(data));
      this.size += data.length;
    },
    compress: function () {
      //合并
      var data = new Float32Array(this.size);
      var offset = 0;
      for (var i = 0; i < this.buffer.length; i++) {
        data.set(this.buffer[i], offset);
        offset += this.buffer[i].length;
      }
      //压缩
      var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
      var length = data.length / compression;
      var result = new Float32Array(length);
      var index = 0, j = 0;
      while (index < length) {
        result[index] = data[j];
        j += compression;
        index++;
      }
      return result;
    },
    encodeWAV: function () {
      var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
      var sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits);
      var bytes = this.compress();
      var dataLength = bytes.length * (sampleBits / 8);
      var buffer = new ArrayBuffer(44 + dataLength);
      var data = new DataView(buffer);

      var channelCount = 1;//单声道
      var offset = 0;

      var writeString = function (str) {
        for (var i = 0; i < str.length; i++) {
          data.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      // 资源交换文件标识符 
      writeString('RIFF'); offset += 4;
      // 下个地址开始到文件尾总字节数,即文件大小-8 
      data.setUint32(offset, 36 + dataLength, true); offset += 4;
      // WAV文件标志
      writeString('WAVE'); offset += 4;
      // 波形格式标志 
      writeString('fmt '); offset += 4;
      // 过滤字节,一般为 0x10 = 16 
      data.setUint32(offset, 16, true); offset += 4;
      // 格式类别 (PCM形式采样数据) 
      data.setUint16(offset, 1, true); offset += 2;
      // 通道数 
      data.setUint16(offset, channelCount, true); offset += 2;
      // 采样率,每秒样本数,表示每个通道的播放速度 
      data.setUint32(offset, sampleRate, true); offset += 4;
      // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8 
      data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true); offset += 4;
      // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8 
      data.setUint16(offset, channelCount * (sampleBits / 8), true); offset += 2;
      // 每样本数据位数 
      data.setUint16(offset, sampleBits, true); offset += 2;
      // 数据标识符 
      writeString('data'); offset += 4;
      // 采样数据总数,即数据总大小-44 
      data.setUint32(offset, dataLength, true); offset += 4;
      // 写入采样数据 
      if (sampleBits === 8) {
        for (var i = 0; i < bytes.length; i++, offset++) {
          var s = Math.max(-1, Math.min(1, bytes[i]));
          var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
          val = parseInt(255 / (65535 / (val + 32768)));
          data.setInt8(offset, val, true);
        }
      } else {
        for (var i = 0; i < bytes.length; i++, offset += 2) {
          var s = Math.max(-1, Math.min(1, bytes[i]));
          data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
      }

      return new Blob([data], { type: 'audio/wav' });
    }
  };

  this.start = function () {
    audioInput.connect(recorder);
    recorder.connect(context.destination);
  }

  this.stop = function () {
  	var streamTracks = stream.getAudioTracks();
  	for(var i = 0, length1 = streamTracks.length; i < length1; i++){
  		streamTracks[i].stop();
  	}
    recorder.disconnect();
  }

  this.getBlob = function () {
    return audioData.encodeWAV();
  }

  this.clear = function() {
    audioData.clear();
  }

  recorder.onaudioprocess = function (e) {
    audioData.input(e.inputBuffer.getChannelData(0));
  }
};

