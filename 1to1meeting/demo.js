var Demo = (function () {
    var _audioTrack;
    var _videoTrack = null;
    var _screenTrack = null;

    var connection = null;
    var _removeVideoStream = new MediaStream();
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
            else {

                if (!_rtpAudioSender && _audioTrack && connection)
                    _rtpAudioSender = connection.addTrack(_audioTrack);
            }

            if (!_audioTrack) {
                alert('problem with audio permission')
                return;
            }

            if (_audioTrack.enabled == false) {
                _audioTrack.enabled = true;
                $(this).text("Mute");
            }
            else {
                _audioTrack.enabled = false;
                $(this).text("Unmute");
            }
            console.log(_audioTrack);
        });
        $("#btnStartStopCam").on('click', async function () {

            if (_videoTrack) {
                _videoTrack.stop();
                _videoTrack = null;
                _localVideoPlayer.srcObject = null;
                $(_localVideoPlayer).hide();
                $("#btnStartStopCam").text("Start Camera");

                if (_rtpVideoSender && connection) {
                    connection.removeTrack(_rtpVideoSender);
                    _rtpVideoSender = null;
                }

                return;
            }
            try {
                var vstream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 720,
                        height: 480
                    },
                    audio: false
                });
                if (vstream && vstream.getVideoTracks().length > 0) {
                    _videoTrack = vstream.getVideoTracks()[0];
                    setLocalVideo(true);
                    //_localVideoPlayer.srcObject = new MediaStream([_videoTrack]);
                    $("#btnStartStopCam").text("Stop Camera");
                }
            } catch (e) {
                console.log(e);
                return;
            }
        });
        $("#btnStartStopScreenshare").on('click', async function () {

            if (_screenTrack) {
                _screenTrack.stop();
                _screenTrack = null;
                _localVideoPlayer.srcObject = null;
                $(_localVideoPlayer).hide();
                $(this).text("Screen Share");

                if (_rtpVideoSender && connection) {
                    connection.removeTrack(_rtpVideoSender);
                    _rtpVideoSender = null;
                }
                return;
            }
            try {
                var sc_stream = await navigator.mediaDevices.getDisplayMedia({
                    audio: false,
                    video: {
                        width: 720,
                        height: 480,
                        frameRate: 1,
                    },
                });
                if (sc_stream && sc_stream.getVideoTracks().length > 0) {
                    _screenTrack = sc_stream.getVideoTracks()[0];
                    setLocalVideo(false);
                    $(this).text("Stop Share");
                }
            } catch (e) {
                console.log(e);
                return;
            }
        });
    }

    async function startwithAudio() {

        try {
            var astream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            //_localAudioPlayer.srcObject = astream;
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

    function setLocalVideo(isVideo) {
        var currtrack;

        if (isVideo) {
            if (_screenTrack)
                $("#btnStartStopScreenshare").trigger('click');

            if (_videoTrack) {
                _localVideoPlayer.srcObject = new MediaStream([_videoTrack]);
                $(_localVideoPlayer).show();
                currtrack = _videoTrack;
            }
        }
        else
        {
            if (_videoTrack)
                $("#btnStartStopCam").trigger('click');

            if (_screenTrack) {
                _localVideoPlayer.srcObject = new MediaStream([_screenTrack]);
                $(_localVideoPlayer).show();
                currtrack = _screenTrack;
            }
        }

        if (currtrack && connection)
        {
            if (_rtpVideoSender && _rtpVideoSender.track) {
                _rtpVideoSender.replaceTrack(currtrack);
            }
            else {
                _rtpVideoSender = connection.addTrack(currtrack);
            }
        }
    }

    async function _createConnection() {

        if (connection)
            return;

        console.log('_createConnection');
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
            console.log('onconnectionstatechange', connection.connectionState)
            if (connection.connectionState === "connected") {
                alert('connected')
            }
        }
        // New remote media stream was added
        connection.ontrack = function (event) {
            alert('hello');
            if (!_removeVideoStream)
                _removeVideoStream = new MediaStream();

            if (!_remoteAudioStream)
                _remoteAudioStream = new MediaStream();

            if (event.streams.length > 0) {
                //_removeVideoStream = event.streams[0];
            }

            if (event.track.kind == 'video') {
                _removeVideoStream.getVideoTracks().forEach(t => _removeVideoStream.removeTrack(t));
                _removeVideoStream.addTrack(event.track);
                _removeVideoStream.getTracks().forEach(t => console.log(t));

                _remoteVideoPlayer.srcObject = null;
                _remoteVideoPlayer.srcObject = _removeVideoStream;
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

        //if (_videoTrack) {
        //    _rtpVideoSender = connection.addTrack(_videoTrack);
        //}

        //if (_screenTrack) {
        //    _rtpVideoSender = connection.addTrack(_screenTrack);
        //}

        //if (_audioTrack) {
        //    _rtpAudioSender = connection.addTrack(_audioTrack);
        //}
    }

    async function _createOffer() {
        //alert('create offer fn called');
        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        //Send offer to Server
        _serverFn(JSON.stringify({ 'offer': connection.localDescription }));
    }
    async function newMessageClientFn(message) {
        console.log('messag', message);
        message = JSON.parse(message);

        if (message.rejected) {
            alert('other user rejected');
        }
        else if (message.answer) {
            console.log('answer', message.answer);
            await connection.setRemoteDescription(new RTCSessionDescription(message.answer));
            setLocalVideo(true);
        }
        else if (message.offer) {
            console.log('offer', message.offer);

            if (!connection) {
                await _createConnection();
            }

            await connection.setRemoteDescription(new RTCSessionDescription(message.offer));
            var answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            _serverFn(JSON.stringify({ 'answer': answer }));
        }
        else if (message.iceCandidate) {
            console.log('iceCandidate', message.iceCandidate);
            if (!connection) {
                await _createConnection();
            }
            try {
                await connection.addIceCandidate(message.iceCandidate);
            } catch (e) {
                console.log(e);
            }
        }
    }
    return {
        init: async function (serverFn) {
            await _init(serverFn);
            await startwithAudio();
        },
        ExecuteClientFn: async function (data) {
            await newMessageClientFn(data);
        },
        _initiateFirstConn: async function () {
            //await startwithAudio();
            await _createConnection();
        }
    }
}());