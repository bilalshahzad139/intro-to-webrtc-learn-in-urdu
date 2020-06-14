var Demo = (function () {
    var _audioTrack;

    var peers_conns = [];
    var peers_con_ids = [];

    var _remoteVideoStreams = [];
    var _remoteAudioStream = new MediaStream();

    var _localVideoPlayer;
    //var _remoteVideoPlayer;

    var _rtpVideoSenders = [];
    var _rtpAudioSender;

    var _serverFn;
    //var _localAudioPlayer;
    var _remoteAudioPlayer;

    var VideoStates = { None: 0, Camera: 1, ScreenShare: 2 };
    var _videoState = VideoStates.None;
    var _videoCamSSTrack;
    var _isAudioMute = true;
    var _my_connid = '';

    async function _init(serFn, myconnid) {
        _my_connid = myconnid;
        _serverFn = serFn;
        _localVideoPlayer = document.getElementById('localVideoCtr');
        //_remoteVideoPlayer = document.getElementById('remoteVideoCtr');
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

            RemoveVideoSender();

            //if (_rtpVideoSenders && IsConnectionAvailable()) {
            //    connection.removeTrack(_rtpVideoSenders);
            //    _rtpVideoSenders = null;
            //}
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

                    AddUpdateVideoSender(_videoCamSSTrack);

                }

            }
        } catch (e) {
            console.log(e);
            return;
        }
    }

    async function RemoveVideoSender() {
        for (var con_id in peers_con_ids) {
            debugger;
            if (_rtpVideoSenders[con_id] && IsConnectionAvailable(peers_conns[con_id])) {
                peers_conns[con_id].removeTrack(_rtpVideoSenders[con_id]);
                _rtpVideoSenders[con_id] = null;
            }
        }
    }

    async function AddUpdateVideoSender(track) {
        for (var con_id in peers_con_ids) {
            //var con_id = peers_con_ids[i];
            if (IsConnectionAvailable(peers_conns[con_id])) {
                if (_rtpVideoSenders[con_id] && _rtpVideoSenders[con_id].track) {
                    _rtpVideoSenders[con_id].replaceTrack(track);
                }
                else {
                    _rtpVideoSenders[con_id] = peers_conns[con_id].addTrack(track);
                }
            }
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

    async function createConnection(connid) {

        var connection = new RTCPeerConnection(null);
        connection.onicecandidate = function (event) {
            console.log('onicecandidate', event.candidate);
            if (event.candidate) {
                _serverFn(JSON.stringify({ 'iceCandidate': event.candidate }), connid, _my_connid);
            }
        }
        connection.onicecandidateerror = function (event) {
            console.log('onicecandidateerror', event);

        }
        connection.onicegatheringstatechange = function (event) {
            console.log('onicegatheringstatechange', event);
        };
        connection.onnegotiationneeded = async function (event) {
            console.log('onnegotiationneeded', event);
            await _createOffer(connid);
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
                //Demo.closeConnection(connection);
            }
        }
        // New remote media stream was added
        connection.ontrack = function (event) {

            if (!_remoteVideoStreams[connid])
                _remoteVideoStreams[connid] = new MediaStream();

            if (!_remoteAudioStream)
                _remoteAudioStream = new MediaStream();

            if (event.streams.length > 0) {
                //_remoteVideoStream = event.streams[0];
            }

            if (event.track.kind == 'video') {
                _remoteVideoStreams[connid].getVideoTracks().forEach(t => _remoteVideoStreams[connid].removeTrack(t));
                _remoteVideoStreams[connid].addTrack(event.track);
                _remoteVideoStreams[connid].getTracks().forEach(t => console.log(t));

                var _remoteVideoPlayer = document.getElementById('v_' + connid)
                _remoteVideoPlayer.srcObject = null;
                _remoteVideoPlayer.srcObject = _remoteVideoStreams[connid];
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

        peers_con_ids[connid] = connid;
        peers_conns[connid] = connection;

        if (_videoState == VideoStates.Camera || _videoState == VideoStates.ScreenShare) {
            if (_videoCamSSTrack) {
                AddUpdateVideoSender(_videoCamSSTrack);
            }
        }

        return connection;
    }

    async function _createOffer(connid) {

        //await createConnection();
        var connection = peers_conns[connid];

        console.log('connection.signalingState:' + connection.signalingState);
        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        //Send offer to Server
        _serverFn(JSON.stringify({ 'offer': connection.localDescription }), connid, _my_connid);
    }
    async function exchangeSDP(message, from_connid) {
        console.log('messag', message);
        message = JSON.parse(message);

        if (message.answer) {
            console.log('answer', message.answer);
            await peers_conns[from_connid].setRemoteDescription(new RTCSessionDescription(message.answer));
            console.log('connection', peers_conns[from_connid]);
        }
        else if (message.offer) {
            console.log('offer', message.offer);

            if (!peers_conns[from_connid]) {
                await createConnection(from_connid);
            }

            await peers_conns[from_connid].setRemoteDescription(new RTCSessionDescription(message.offer));
            var answer = await peers_conns[from_connid].createAnswer();
            await peers_conns[from_connid].setLocalDescription(answer);
            _serverFn(JSON.stringify({ 'answer': answer }), from_connid, _my_connid);
        }
        else if (message.iceCandidate) {
            console.log('iceCandidate', message.iceCandidate);
            if (!peers_conns[from_connid]) {
                await createConnection(from_connid);
            }

            try {
                await peers_conns[from_connid].addIceCandidate(message.iceCandidate);
            } catch (e) {
                console.log(e);
            }
        }
    }

    function IsConnectionAvailable(connection) {
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
    function closeConnection(connid) {

        peers_con_ids[connid] = null;

        if (peers_conns[connid]) {
            peers_conns[connid].close();
            peers_conns[connid] = null;
        }
        //if (_remoteAudioStream) {
        //    _remoteVideoStream.getTracks().forEach(t => {
        //        if (t.stop)
        //            t.stop();
        //    });

        //    _remoteAudioStream = null;
        //}
        if (_remoteVideoStreams[connid]) {
            _remoteVideoStreams[connid].getTracks().forEach(t => {
                if (t.stop)
                    t.stop();
            });
            _remoteVideoStreams[connid] = null;
        }
    }
    return {
        init: async function (serverFn, my_connid) {
            await _init(serverFn, my_connid);

        },
        ExecuteClientFn: async function (data, from_connid) {
            await exchangeSDP(data, from_connid);
        },
        createNewConnection: async function (connid) {
            await createConnection(connid);
            //await _createOffer(connid);
        },
        closeExistingConnection: function (connid) {
            closeConnection(connid);
        }
    }
}());