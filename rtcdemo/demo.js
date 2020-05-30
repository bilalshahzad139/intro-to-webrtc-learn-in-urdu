var Demo = (function () {
    var _audioTrack;
    var _videoTrack = null;
    var _screenTrack = null;

    var _mediaRecorder;
    var _recordedChunks = [];

    var connection = null;
    var _remoteStream = new MediaStream();

    var _localVideo;

    var _rtpSender;

    var socket = io.connect('http://localhost:3000');

    async function _init() {

        _localVideo = document.getElementById('videoCtr');

        eventBinding();
    }

    function eventBinding() {

        $("#btnMuteUnmute").on('click', function () {
            if (!_audioTrack) return;

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
        $("#btnStartReco").on('click', function () {
            setupMediaRecorder();
            _mediaRecorder.start(1000);
        });
        $("#btnPauseReco").on('click', function () {
            _mediaRecorder.pause();
        });
        $("#btnResumeReco").on('click', function () {
            _mediaRecorder.resume();
        });
        $("#btnStopReco").on('click', function () {
            _mediaRecorder.stop();
        });

        $("#btnStartStopCam").on('click', async function () {

            if (_videoTrack) {
                _videoTrack.stop();
                _videoTrack = null;
                _localVideo.srcObject = null;
                $("#btnStartStopCam").text("Start Camera");

                if (_rtpSender && connection) {
                    connection.removeTrack(_rtpSender);
                    _rtpSender = null;
                }

                return;
            }
            try {
                var vstream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 200,
                        height: 200
                    },
                    audio: false
                });
                if (vstream && vstream.getVideoTracks().length > 0) {
                    _videoTrack = vstream.getVideoTracks()[0];
                    setLocalVideo(true);
                    //_localVideo.srcObject = new MediaStream([_videoTrack]);
                    $("#btnStartStopCam").text("Stop Camera");
                }
                //debugger;
                //if (_rtpSender && _rtpSender.track && _videoTrack && connection) {
                //    _rtpSender.replaceTrack(_videoTrack);
                //}
                //else {
                //    if (_videoTrack && connection)
                //        _rtpSender = connection.addTrack(_videoTrack);
                //}


            } catch (e) {
                console.log(e);
                return;
            }
        });

        $("#btnStartStopScreenshare").on('click', async function () {

            if (_screenTrack) {
                _screenTrack.stop();
                _screenTrack = null;
                _localVideo.srcObject = null;
                $(this).text("Screen Share");

                if (_rtpSender && connection) {
                    connection.removeTrack(_rtpSender);
                    _rtpSender = null;
                }
                return;
            }
            try {
                var sc_stream = await navigator.mediaDevices.getDisplayMedia({
                    audio: false,
                    video: {
                        frameRate: 1,
                    },
                });
                if (sc_stream && sc_stream.getVideoTracks().length > 0) {
                    _screenTrack = sc_stream.getVideoTracks()[0];
                    setLocalVideo(false);
                    //_localVideo.srcObject = new MediaStream([_screenTrack]);
                    $(this).text("Stop Share");
                }

                //if (_videoTrack) {
                //    connection.removeTrack(_videoTrack);
                //}

                //if (_screenTrack && connection)
                //    connection.addTrack(_screenTrack);

                //if (_rtpSender && _rtpSender.track && _screenTrack && connection) {
                //    _rtpSender.replaceTrack(_screenTrack);
                //}
                //else {
                //    if (_screenTrack && connection)
                //        _rtpSender = connection.addTrack(_screenTrack);
                //}

            } catch (e) {
                console.log(e);
                return;
            }
        });

        $("#startConnection").on('click', async function () {
            await startwithAudio();
            await _createConnection();
            //await _createOffer();
        });
    }

    function setLocalVideo(isVideo) {
        var currtrack;

        if (isVideo) {
            if (_screenTrack) 
                $("#btnStartStopScreenshare").trigger('click');
            
            if (_videoTrack) {
                _localVideo.srcObject = new MediaStream([_videoTrack]);
                currtrack = _videoTrack;
            }
            
        }
        else {
            if (_videoTrack)
                $("#btnStartStopCam").trigger('click');

            if (_screenTrack) {
                _localVideo.srcObject = new MediaStream([_screenTrack]);
                currtrack = _screenTrack;
            }
        }

        if (_rtpSender && _rtpSender.track && currtrack && connection) {
            _rtpSender.replaceTrack(currtrack);
        }
        else {
            if (currtrack && connection)
                _rtpSender = connection.addTrack(currtrack);
        }
    }

    function setupMediaRecorder() {

        var _width = 0;
        var _height = 0;

        if (_screenTrack) {
            _width = _screenTrack.getSettings().width;
            _height = _screenTrack.getSettings().height;
        }
        else if (_videoTrack) {
            _width = _videoTrack.getSettings().width;
            _height = _videoTrack.getSettings().height;
        }

        var merger = new VideoStreamMerger({
            width: _width,   // Width of the output video
            height: _height,  // Height of the output video
            //fps: 1,       // Video capture frames per second
            audioContext: null,
        })

        if (_screenTrack && _screenTrack.readyState === "live") {
            // Add the screen capture.Position it to fill the whole stream (the default)
            merger.addStream(new MediaStream([_screenTrack]), {
                x: 0, // position of the topleft corner
                y: 0,
                //width: _screenTrack.getSettings().width,
                //height: _screenTrack.getSettings().height,
                mute: true // we don't want sound from the screen (if there is any)
            });

            if (_videoTrack && _videoTrack.readyState === "live") {
                // Add the webcam stream. Position it on the bottom left and resize it to 100x100.
                merger.addStream(new MediaStream([_videoTrack]), {
                    x: 0,
                    y: merger.height - 100,
                    width: 100,
                    height: 100,
                    mute: true
                });
            }
        }
        else {
            if (_videoTrack && _videoTrack.readyState === "live") {
                // Add the webcam stream.
                merger.addStream(new MediaStream([_videoTrack]), {
                    x: 0,
                    y: 0,
                    width: _width,
                    height: _height,
                    mute: true
                });
            }
        }


        if (_audioTrack && _audioTrack.readyState === "live") {
            // Add the webcam stream. Position it on the bottom left and resize it to 100x100.
            merger.addStream(new MediaStream([_audioTrack]), {
                mute: false
            });
        }

        // Start the merging. Calling this makes the result available to us
        merger.start()

        // We now have a merged MediaStream!
        var stream = merger.result;
        var videoRecPlayer = document.getElementById('videoCtrRec');
        videoRecPlayer.srcObject = stream;
        videoRecPlayer.load();
        $(videoRecPlayer).show();

        stream.getTracks().forEach(track => {
            console.log(track);
        })

        _recordedChunks = [];
        _mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8,opus' });
        _mediaRecorder.ondataavailable = (e) => {
            console.log(e.data.size);
            if (e.data.size > 0)
                _recordedChunks.push(e.data);
        };
        _mediaRecorder.onstart = async () => {
            console.log('onstart');
            $("#btnStartReco").hide();
            $("#btnPauseReco").show();
            $("#btnStopReco").show();
            $("#downloadRecording").hide();
        };
        _mediaRecorder.onpause = async () => {
            $("#btnPauseReco").hide();
            $("#btnResumeReco").show();
        };
        _mediaRecorder.onresume = async () => {
            $("#btnResumeReco").hide();
            $("#btnPauseReco").show();
            $("#btnStopReco").show();
        };

        _mediaRecorder.onstop = async () => {
            console.log('onstop');
            var blob = new Blob(_recordedChunks, { type: 'video/webm' });
            let url = window.URL.createObjectURL(blob);


            videoRecPlayer.srcObject = null;
            videoRecPlayer.load();
            videoRecPlayer.src = url;
            videoRecPlayer.play();
            $(videoRecPlayer).show();

            $("#downloadRecording").attr({ href: url, download: 'video.webm' }).show();

            $("#btnStartReco").show();
            $("#btnPauseReco").hide();
            $("#btnStopReco").hide();
            //var download = document.getElementById('downloadRecording');
            //download.href = url;
            //download.download = 'test.weba';
            //download.style.display = 'block';


        };
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

    socket.on("new_message1", async function (message) {
        console.log('messag', message);
        message = JSON.parse(message);

        if (message.rejected) {
            alert('other user rejected');
        }
        else if (message.answer) {
            console.log('answer', message.answer);
            await connection.setRemoteDescription(new RTCSessionDescription(message.answer));
        }
        else if (message.offer) {
            console.log('offer', message.offer);
            var r = true;

            if (!_audioTrack) {
                r = confirm('want to continue?');
                if (r) {
                    await startwithAudio();
                    if (_audioTrack) {
                        connection.addTrack(_audioTrack);
                    }
                }
                else {
                    
                    socket.emit('new_message1',JSON.stringify({ 'rejected': 'true' }));
                }
            }
            if (_audioTrack) {

                if (!connection) {
                    await _createConnection();
                }

                await connection.setRemoteDescription(new RTCSessionDescription(message.offer));
                var answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                socket.emit('new_message1',JSON.stringify({ 'answer': answer }));
            }
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
    });

    async function _createConnection() {

        console.log('_createConnection');

        connection = new RTCPeerConnection(null);
        connection.onicecandidate = function (event) {
            console.log('onicecandidate', event.candidate);
            if (event.candidate) {
                socket.emit('new_message1',JSON.stringify({ 'iceCandidate': event.candidate }));
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
            //if (connection.connectionState === "connected") {
            //    console.log('connected')
            //}
        }
        // New remote media stream was added
        connection.ontrack = function (event) {

            
            if (!_remoteStream)
                _remoteStream = new MediaStream();

            if (event.streams.length > 0) {
                
                //_remoteStream = event.streams[0];
            }

            if (event.track.kind == 'video') {
                _remoteStream.getVideoTracks().forEach(t => _remoteStream.removeTrack(t));
            }

            _remoteStream.addTrack(event.track);

            _remoteStream.getTracks().forEach(t => console.log(t));

            var newVideoElement = document.getElementById('remoteVideoCtr');


            newVideoElement.srcObject = null;
            newVideoElement.srcObject = _remoteStream;
            newVideoElement.load();
            //newVideoElement.play();
        };

        
        if (_videoTrack) {
            _rtpSender = connection.addTrack(_videoTrack);
        }

        if (_screenTrack) {
            _rtpSender = connection.addTrack(_screenTrack);
        }

        if (_audioTrack) {
            connection.addTrack(_audioTrack, _remoteStream);
        }

    }

    async function _createOffer() {
        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        console.log('offer', offer);
        console.log('localDescription', connection.localDescription);
        //Send offer to Server
        socket.emit('new_message1',JSON.stringify({ 'offer': connection.localDescription }));
    }

    return {
        init: async function () {
            await _init();
        }
    }
}());