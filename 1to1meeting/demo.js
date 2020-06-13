var Demo = (function () {
    var _audioTrack;

    var connection = null;
    var _remoteVideoStream = new MediaStream();
    var _remoteAudioStream = new MediaStream();

    var _localVideoPlayer;
    var _remoteVideoPlayer;
    var _rtpVideoSender;
    var _rtpAudioSender;
    var _serverFn;
    //var _localAudioPlayer;
    var _remoteAudioPlayer;

    var VideoStates = { None: 0, Camera: 1, ScreenShare: 2 };
    var _videoState = VideoStates.None;
    var _videoCamSSTrack;
    var _isAudioMute = true;

    async function _init(serFn) {

        _serverFn = serFn;
        _localVideoPlayer = document.getElementById('localVideoCtr');
        _remoteVideoPlayer = document.getElementById('remoteVideoCtr');
        //_localAudioPlayer = document.getElementById('localAudioCtr');
        _remoteAudioPlayer = document.getElementById('remoteAudioCtr');

        eventBinding();
    }

    function eventBinding() {
        $("#btnMuteUnmute").on('click', async function () {

            if (!_audioTrack) {
                await startwithAudio();
            }

            if (!_audioTrack) {
                alert('problem with audio permission')
                return;
            }

            if (_isAudioMute) {
                _audioTrack.enabled = true;
                $(this).text("Mute");
                if (!_rtpAudioSender && _audioTrack && IsConnectionAvailable())
                    _rtpAudioSender = connection.addTrack(_audioTrack);
            }
            else {
                _audioTrack.enabled = false;
                $(this).text("Unmute");

                if (_rtpAudioSender && IsConnectionAvailable()) {
                    connection.removeTrack(_rtpAudioSender);
                    _rtpAudioSender = null;
                }
            }
            _isAudioMute = !_isAudioMute;

            console.log(_audioTrack);
        });
        $("#btnStartStopCam").on('click', async function () {

            if (_videoState == VideoStates.Camera) { //Stop case
                await ManageVideo(VideoStates.None);
            }
            else {
                await ManageVideo(VideoStates.Camera);
            }
        });
        $("#btnStartStopScreenshare").on('click', async function () {

            if (_videoState == VideoStates.ScreenShare) { //Stop case
                await ManageVideo(VideoStates.None);
            }
            else {
                await ManageVideo(VideoStates.ScreenShare);
            }
        });
    }
    //Camera or Screen Share or None
    async function ManageVideo(_newVideoState) {

        if (_videoCamSSTrack) {
            _videoCamSSTrack.stop();
            _videoCamSSTrack = null;
            _localVideoPlayer.srcObject = null;
            $(_localVideoPlayer).hide();

            if (_rtpVideoSender && IsConnectionAvailable()) {
                connection.removeTrack(_rtpVideoSender);
                _rtpVideoSender = null;
            }
        }

        if (_newVideoState == VideoStates.None) {
            $("#btnStartStopCam").text('Start Camera');
            $("#btnStartStopScreenshare").text('Screen Share');
            _videoState = _newVideoState;
            return;
        }

        try {
            var vstream = null;

            if (_newVideoState == VideoStates.Camera) {
                vstream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 720,
                        height: 480
                    },
                    audio: false
                });
            }
            else if (_newVideoState == VideoStates.ScreenShare) {
                vstream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: 720,
                        height: 480
                    },
                    audio: false
                });
            }

            _videoState = _newVideoState;

            if (_newVideoState == VideoStates.Camera) {
                $("#btnStartStopCam").text('Stop Camera');
                $("#btnStartStopScreenshare").text('Screen Share');
            }
            else if (_newVideoState == VideoStates.ScreenShare) {
                $("#btnStartStopCam").text('Start Camera');
                $("#btnStartStopScreenshare").text('Stop Screen Share');
            }

            if (vstream && vstream.getVideoTracks().length > 0) {
                _videoCamSSTrack = vstream.getVideoTracks()[0];

                if (_videoCamSSTrack) {
                    _localVideoPlayer.srcObject = new MediaStream([_videoCamSSTrack]);
                    $(_localVideoPlayer).show();

                    if (IsConnectionAvailable()) {
                        if (_rtpVideoSender && _rtpVideoSender.track) {
                            _rtpVideoSender.replaceTrack(_videoCamSSTrack);
                        }
                        else {
                            _rtpVideoSender = connection.addTrack(_videoCamSSTrack);
                        }
                    }
                }
            }
        } catch (e) {
            console.log(e);
            return;
        }
    }

    async function startwithAudio() {

        try {
            var astream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            _audioTrack = astream.getAudioTracks()[0];

            _audioTrack.onmute = function (e) {
                console.log(e);
            }
            _audioTrack.onunmute = function (e) {
                console.log(e);
            }

            _audioTrack.enabled = false;

        } catch (e) {
            console.log(e);
            return;
        }
    }

    async function _checkAndCreateConnection() {

        if (IsConnectionAvailable()) {
            //debugger;
            console.log(connection.signalingState);
            return;
        }

        console.log('_checkAndCreateConnection');

        connection = new RTCPeerConnection(null);
        connection.onicecandidate = function (event) {
            console.log('onicecandidate', event.candidate);
            if (event.candidate) {
                _serverFn(JSON.stringify({ 'iceCandidate': event.candidate }));
            }
        }
        connection.onicecandidateerror = function (event) {
            console.log('onicecandidateerror', event);

        }
        connection.onicegatheringstatechange = function (event) {
            console.log('onicegatheringstatechange', event);
        };
        connection.onnegotiationneeded = async function (event) {
            await _createOffer();
        }
        connection.onconnectionstatechange = function (event) {

            console.log('onconnectionstatechange', event.currentTarget.connectionState)
            //alert(event.currentTarget.connectionState)
            if (event.currentTarget.connectionState === "connected") {
                console.log('connected')
                $('.toolbox').show();
            }
            if (event.currentTarget.connectionState === "disconnected") {
                console.log('disconnected');
                Demo.closeConnection();
            }
        }
        // New remote media stream was added
        connection.ontrack = function (event) {

            if (!_remoteVideoStream)
                _remoteVideoStream = new MediaStream();

            if (!_remoteAudioStream)
                _remoteAudioStream = new MediaStream();

            if (event.streams.length > 0) {
                //_remoteVideoStream = event.streams[0];
            }

            if (event.track.kind == 'video') {
                _remoteVideoStream.getVideoTracks().forEach(t => _remoteVideoStream.removeTrack(t));
                _remoteVideoStream.addTrack(event.track);
                _remoteVideoStream.getTracks().forEach(t => console.log(t));

                _remoteVideoPlayer.srcObject = null;
                _remoteVideoPlayer.srcObject = _remoteVideoStream;
                _remoteVideoPlayer.load();
                $(_remoteVideoPlayer).show();
            }
            else if (event.track.kind == 'audio') {
                _remoteAudioStream.getVideoTracks().forEach(t => _remoteAudioStream.removeTrack(t));
                _remoteAudioStream.addTrack(event.track);
                _remoteAudioPlayer.srcObject = null;
                _remoteAudioPlayer.srcObject = _remoteAudioStream;
                _remoteAudioPlayer.load();
            }
        };
    }

    async function _createOffer() {

        await _checkAndCreateConnection();
        //alert('create offer fn called');
        console.log('connection.signalingState:' + connection.signalingState);
        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        //Send offer to Server
        _serverFn(JSON.stringify({ 'offer': connection.localDescription }));
    }
    async function newMessageClientFn(message) {
        console.log('messag', message);
        message = JSON.parse(message);

        if (message.userleft) {

        }
        else if (message.rejected) {
            alert('other user rejected');
        }
        else if (message.answer) {
            console.log('answer', message.answer);
            await connection.setRemoteDescription(new RTCSessionDescription(message.answer));
            console.log('connection', connection);
        }
        else if (message.offer) {
            console.log('offer', message.offer);

            //if (!connection) {
            await _checkAndCreateConnection();
            //}

            await connection.setRemoteDescription(new RTCSessionDescription(message.offer));
            var answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            _serverFn(JSON.stringify({ 'answer': answer }));
        }
        else if (message.iceCandidate) {
            console.log('iceCandidate', message.iceCandidate);
            //if (!connection) {
            await _checkAndCreateConnection();
            //}

            try {
                await connection.addIceCandidate(message.iceCandidate);
            } catch (e) {
                console.log(e);
            }
        }
    }

    function IsConnectionAvailable() {
        if (connection &&
            (connection.connectionState == "new"
            || connection.connectionState == "connecting"
            || connection.connectionState == "connected"
            )) {
            return true;
        }
        else
            return false;
    }

    return {
        init: async function (serverFn) {
            await _init(serverFn);

        },
        ExecuteClientFn: async function (data) {
            await newMessageClientFn(data);
        },
        _initiateFirstConn: async function () {
            //await startwithAudio();
            await _checkAndCreateConnection();
            //await startwithAudio();
        },
        closeConnection: function () {
            if (connection) {
                connection.close();
                connection = null;
            }
            if (_remoteAudioStream) {
                _remoteVideoStream.getTracks().forEach(t => {
                    if (t.stop)
                        t.stop();
                });

                _remoteAudioStream = null;
            }
            if (_remoteVideoStream) {
                _remoteVideoStream.getTracks().forEach(t => {
                    if (t.stop)
                        t.stop();
                });
                _remoteVideoStream = null;
            }
        }
    }
}());