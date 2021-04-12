// require('../../../../jquery')
// let appID;   // from  /src/KeyCenter.js
// let server;  // from  /src/KeyCenter.js
// let tokenUrl;  // from  /src/KeyCenter.js
let userID = Util.getBrow() + '_' + new Date().getTime();
let roomID = '0005'
let streamID = '0005'

let zg = null;
let isChecked = false;
let isLoginRoom = false;
let localStream = null;
let remoteStream = null;
let published = false;
let played = false;

function createZegoExpressEngine() {
  zg = new ZegoExpressEngine(appID, server);
  window.zg = zg
}

async function checkSystemRequirements() {
  console.log('sdk version is', zg.getVersion());
  try {
      const result = await zg.checkSystemRequirements();

      console.warn('checkSystemRequirements ', result);
      !result.videoCodec.H264 && $('#videoCodeType option:eq(1)').attr('disabled', 'disabled');
      !result.videoCodec.VP8 && $('#videoCodeType option:eq(2)').attr('disabled', 'disabled');

      if (!result.webRTC) {
          console.log('browser is not support webrtc!!');
          return false;
      } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
        console.log('browser is not support H264 and VP8');
          return false;
      } else if (result.videoCodec.H264) {
          supportScreenSharing = result.screenSharing;
          if (!supportScreenSharing) console.log('browser is not support screenSharing');
          previewVideo = $('#previewVideo')[0];
          // start();
      } else {
        console.log('不支持H264，请前往混流转码测试');
      }

      return true;
  } catch (err) {
      console.error('checkSystemRequirements', err);
      return false;
  }
}

function setLogConfig() {
  let config = localStorage.getItem('logConfig')
  const DebugVerbose = localStorage.getItem('DebugVerbose') === 'true' ? true : false
  if(config) {
    config = JSON.parse(config)
    zg.setLogConfig({
      logLevel: config.logLevel,
      remoteLogLevel: config.remoteLogLevel,
      logURL: '',
  });
  }
  zg.setDebugVerbose(DebugVerbose);
}

function loginRoom(roomId, userId, userName) {
  return new Promise((resolve, reject) => {
    $.get(
      tokenUrl,
      {
        app_id: appID,
        id_name: userID
      },
      async (token) => {
        try {
          await zg.loginRoom(roomId, token, {
            userID: userId,
            userName
          });
          resolve()
        } catch (err) {
          reject()
        }
      }
    );
  })
}

function logoutRoom(roomId) {
  if(localStream) {
    stopPublishingStream($('#pushlishInfo-id').text())
  }
  if(remoteStream) {
    stopPlayingStream($('#playInfo-id').text())
  }
  zg.logoutRoom(roomId)
  clearStream('room')
}

async function startPublishingStream (streamId, config) {
  try {
    localStream = await zg.createStream(config);
    zg.startPublishingStream(streamId, localStream);
    $('#pubshlishVideo')[0].srcObject = localStream;
    return true
  } catch(err) {
    return false
  }
  
}

async function stopPublishingStream(streamId) {
  zg.stopPublishingStream(streamId)
  if(remoteStream) {
    stopPlayingStream($('#playInfo-id').text())
  }
  clearStream('publish')
}

async function startPlayingStream(streamId, options = {}) {
  try {
    remoteStream = await zg.startPlayingStream(streamId, options)
    $('#playVideo')[0].srcObject = remoteStream;
    return true
  } catch (err) {
    return false
  }
}

async function stopPlayingStream(streamId) {
  zg.stopPlayingStream(streamId)
  clearStream()
}

async function sendBroadcastMessage(roomId, message) {
  try {
    const data = await zg.sendBroadcastMessage(roomId, message)
    return data
  } catch (err) {
    return {errorCode: 1, extendedData: JSON.stringify(err)}
  }
}

async function sendBarrageMessage(roomId, message) {
  try {
    const data = await zg.sendBarrageMessage(roomId, message)
    return data
  } catch (err) {
    return {errorCode: 1, extendedData: JSON.stringify(err)}
  }
}

async function sendCustomCommand(roomId, message, userId) {
  try {
    const data = await zg.sendCustomCommand(roomId, message, [userId])
    return data
  } catch (err) {
    return {errorCode: 1, extendedData: JSON.stringify(err)}
  }
}

async function setRoomExtraInfo(roomId, key, value) {
  try {
    const data = await zg.setRoomExtraInfo(roomId, key, value)
    return data
  } catch (err) {
    return {errorCode: 1, extendedData: JSON.stringify(err)}
  }
}


$('#startPublishing').on('click', util.throttle( async function () {
  const id = $('#PublishID').val();
  if(!id) return alert('PublishID is empty')
  this.classList.add('border-primary')
  if(!published) {
      const flag =  await startPublishingStream(id);
      if(flag) {
        updateButton(this, 'Start Publishing', 'Stop Publishing');
        published = true
        $('#PublishID')[0].disabled = true
        changeVideo()
      } else {
        changeVideo(true)
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Publishing Fail'
      }

  } else {
      if(remoteStream && id === $('#PlayID').val()) {
      $('#PlayID')[0].disabled = false
        updateButton($('#startPlaying')[0], 'Start Playing', 'Stop Playing')
        reSetVideoInfo()
      }
      stopPublishingStream(streamID);
      updateButton(this, 'Start Publishing', 'Stop Publishing')
      published = false
      $('#PublishID')[0].disabled = false
      reSetVideoInfo('publish')
  }
}, 500))

$('#startPlaying').on('click', util.throttle( async function () {
  const id = $('#PlayID').val();
  if(!id) return alert('PublishID is empty')
  this.classList.add('border-primary')
  if(!played) {
      const flag =  await startPlayingStream(id);
      if(flag) {
        updateButton(this, 'Start Playing', 'Stop Playing');
        played = true
      $('#PlayID')[0].disabled = true
        changeVideo()
      } else {
        this.classList.remove('border-primary');
        this.classList.add('border-error')
        this.innerText = 'Playing Fail'
        changeVideo(true)
      }

  } else {
      stopPlayingStream(streamID);
      updateButton(this, 'Start Playing', 'Stop Playing')
      played = false
      $('#PlayID')[0].disabled = false
      reSetVideoInfo('play')
  }
}, 500))

$('#BoradcastMessageBtn').on('click', util.throttle(async function() {
  const message = $('#BoradcastMessage').val()
  if(!message) return alert('message is empty')

  updateLogger('[action] sendBroadcastMessage')
  const result = await sendBroadcastMessage(roomID, message)
  if(result.errorCode === 0) {
    updateLogger('[info] sendBroadcastMessage success')
    updateLogger(`[BroadcastMessage] ${userID}: ${message}`)
    $('#BoradcastMessage').val('')
  } else {
    updateLogger(`[info] sendBroadcastMessage fail, extendedData: ${result.extendedData || ''}`)
  }
}, 500))

$('#BarrageMessageBtn').on('click', util.throttle(async function() {
  const message = $('#BarrageMessage').val()
  if(!message) return alert('message is empty')

  updateLogger('[action] sendBarrageMessage')
  const result = await sendBarrageMessage(roomID, message)
  if(result.errorCode  === 0) {
    updateLogger('[info] sendBarrageMessage success')
    updateLogger(`[BarrageMessage] ${userID}: ${message}`)
    $('#BarrageMessage').val('')
  } else {
    updateLogger(`[info] sendBarrageMessage fail, extendedData: ${result.extendedData || ''}`)
  }
}, 500))

$('#CustomCommandBtn').on('click', util.throttle(async function() {
  const message = $('#CustomCommand').val()
  const userId = $('#CustomCommandUserId').val()
  if(!message) return alert('message is empty')
  if(!userId) return alert('userId is empty')

  updateLogger('[action] sendCustomCommand')
  const result = await sendCustomCommand(roomID, message, userId)
  if(result.errorCode  === 0) {
    updateLogger('[info] sendCustomCommand success')
    updateLogger(`[sendCustomCommand] ${userID}: ${message}`)
    $('#CustomCommand').val('')
    $('#CustomCommandUserId').val('')
  } else {
    updateLogger(`[info] sendCustomCommand fail, extendedData: ${result.extendedData || ''}`)
  }
}, 500))

$('#RoomExtraInfoBtn').on('click', util.throttle(async function() {

  const key = $('#RoomExtraInfoKey').val()
  const value = $('#RoomExtraInfoValue').val()
  if(!key) return alert('key is empty')
  if(!value) return alert('value is empty')

  updateLogger('[action] setRoomExtraInfo')
  const result = await setRoomExtraInfo(roomID, key, value)
  if(result.errorCode  === 0) {
    updateLogger('[info] setRoomExtraInfo success')
  } else {
    updateLogger(`[info] setRoomExtraInfo fail, extendedData: ${result.extendedData || ''}`)
  }
}, 500))


function initEvent() {
  zg.on('publisherStateUpdate', result => {
    if(result.state === "PUBLISHING") {
      $('#pushlishInfo-id').text(result.streamID)
    } else if(result.state === "NO_PUBLISH") {
      $('#pushlishInfo-id').text('')
    }
  })

  zg.on('playerStateUpdate', result => {
    if(result.state === "PLAYING") {
      $('#playInfo-id').text(result.streamID)
    } else if(result.state === "NO_PLAY") {
      $('#playInfo-id').text('')
    }
  })

  zg.on('publishQualityUpdate', (streamId, stats) => {
    $('#publishResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`) 
    $('#sendBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps')
    $('#sendFPS').text(parseInt(stats.video.videoFPS) + ' f/s')
    $('#sendPacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%')
  })

  zg.on('playQualityUpdate', (streamId, stats) => {
      $('#playResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`) 
      $('#receiveBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps')
      $('#receiveFPS').text(parseInt(stats.video.videoFPS) + ' f/s')
      $('#receivePacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%')
  })

  zg.on('IMRecvBroadcastMessage', (roomID, messageInfo) => {
    for(let i = 0; i < messageInfo.length; i++) {
      updateLogger(`[BroadcastMessage] ${messageInfo[i].fromUser.userName}: ${messageInfo[i].message}`)
    }
  })
  zg.on('IMRecvBarrageMessage', (roomID, chatData) => {
    for(let i = 0; i < chatData.length; i++) {
      updateLogger(`[BroadcastMessage] ${chatData[i].fromUser.userName}: ${chatData[i].message}`)
    }
  })
  zg.on('IMRecvCustomCommand', (roomID, fromUser, command) => {
    updateLogger(`[CustomCommand] ${fromUser.userName}: ${command}`)
  })
  zg.on('roomExtraInfoUpdate', (roomID, roomExtraInfoList) => {
    for(let i = 0 ; i< roomExtraInfoList.length; i++) {
      updateLogger(`[roomExtraInfo] ${roomExtraInfoList[i].updateUser.userName} 
      set key: ${roomExtraInfoList[i].key } value: ${roomExtraInfoList[i].value}`)
    }
  })

  zg.on('roomUserUpdate', (roomID, updateType, userList) => {
    console.log(userList);
  })
}

function clearStream(flag) {
  if(localStream && flag) {
    zg.destroyStream(localStream);
  }
  if(remoteStream) {
    zg.destroyStream(remoteStream);
  }
  if(flag) {
    $('#pubshlishVideo')[0].srcObject = null;
    localStream = null;
  }
  if(flag === 'publish' && $('#PublishID').val() === $('#PlayID').val()) {
    $('#playVideo')[0].srcObject = null;
    remoteStream = null;
    played = false
  }
  if(flag === 'room') {
    isLoginRoom = false
  }
  if(flag === 'room' || flag === 'publish') {
    published = false
  }
}

function updateButton(button, preText, afterText) {
  if (button.classList.contains('playing')) {
    button.classList.remove('paused', 'playing', 'border-error', 'border-primary');
    button.classList.add('paused');
    button.innerText = afterText
  } else {
    if (button.classList.contains('paused')) {
      button.classList.remove('border-error', 'border-primary');
      button.classList.add('playing');
      button.innerText = preText
    }
  }
  if (!button.classList.contains('paused')) {
    button.classList.remove('border-error', 'border-primary');
    button.classList.add('paused');
    button.innerText = afterText
  }
}

function updateLogger(text) {
  $('#roomMessage').append(`
    <div>${text}</div>
  `)
}

function changeVideo(flag) {
  if(flag) {
    $('#pubshlishVideo').css('transform', 'none')
    $('#playVideo').css('transform', 'none')
    return
  }
  const value =  $('#Mirror').val()
  if(value === 'onlyPreview') {
    $('#pubshlishVideo').css('transform', 'scale(-1, 1)')
  } else if(value === 'onlyPlay'){
    $('#playVideo').css('transform', 'scale(-1, 1)')
  } else if(value === 'both') {
    $('#pubshlishVideo').css('transform', 'scale(-1, 1)')
    $('#playVideo').css('transform', 'scale(-1, 1)')
  }
}

function reSetVideoInfo(flag) {
  if(flag === 'publish' || !flag) {
    $('#publishResolution').text('') 
    $('#sendBitrate').text('')
    $('#sendFPS').text('')
    $('#sendPacket').text('')
  }
  if(flag === 'play' || !flag) {
    $('#playResolution').text('') 
    $('#receiveBitrate').text('')
    $('#receiveFPS').text('')
    $('#receivePacket').text('')
  }
}

async function render() {
  $('#roomInfo-id').text(roomID)
  $('#RoomID').val(roomID)
  $('#UserName').val(userID)
  $('#UserID').val(userID)
  $('#PublishID').val(streamID)
  $('#PlayID').val(streamID)
  updateLogger(`[action] create ExpressEngine`)
  createZegoExpressEngine()
  updateLogger(`[action] checkSystemRequirements`)
  await checkSystemRequirements()
  initEvent()
  setLogConfig()
  try {
    updateLogger(`[action] LoginRoom RoomID: ${roomID}`)
    await loginRoom(roomID, userID, userID)
    $('#roomStateSuccessSvg').css('display', 'inline-block')
    $('#roomStateErrorSvg').css('display', 'none')
  } catch (err) {
    $('#roomStateSuccessSvg').css('display', 'none')
    $('#roomStateErrorSvg').css('display', 'inline-block')
  }
}

render()