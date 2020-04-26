var Demo = (function () {
    var _audioTrack;
    var _videoTrack = null;
    var _screenTrack = null;

    var _mediaRecorder;
    var _recordedChunks = [];
    
    async function _init() {

        await startwithAudio();
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
                document.getElementById('videoCtr').srcObject = null;
                $("#btnStartStopCam").text("Start Camera");
                return;
            }
            try {
                var vstream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 200,
                        height: 200
                    },
                    audio:false
                });
                
                if (vstream && vstream.getVideoTracks().length > 0) {
                    _videoTrack = vstream.getVideoTracks()[0];
                    document.getElementById('videoCtr').srcObject = new MediaStream([_videoTrack]);    
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
                document.getElementById('screenShare').srcObject = null;
                $(this).text("Screen Share");
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
                    document.getElementById('screenShare').srcObject = new MediaStream([_screenTrack]);
                    $(this).text("Stop Share");
                }
                _screenStream = sc_stream;
            } catch (e) {
                console.log(e);
                return;
            }
        });
    }

    function setupMediaRecorder() {
        debugger;

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

        //stream.addTrack(_audioTrack);
        //var stream = new MediaStream([_audioTrack]);
        
        //if (_videoTrack && _videoTrack.readyState === "live") {
        //    stream.addTrack(_videoTrack);
        //}
        
        //if (_screenTrack && _screenTrack.readyState === "live") {
        //    stream.addTrack(_screenTrack);
        //}

        stream.getTracks().forEach(track => {
            console.log(track);
        })

        _recordedChunks = [];
        _mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8,opus' });
        _mediaRecorder.ondataavailable = (e) => {
            console.log(e.data.size);
            if(e.data.size > 0)
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
            var astream = await navigator.mediaDevices.getUserMedia({ video: false, audio:  true });

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

    return {
        init: async function () {
            await _init();
        }
    }
}());