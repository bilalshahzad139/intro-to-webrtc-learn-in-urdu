var Demo = (function () {
    var _audioTrack;
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

        var stream = new MediaStream([_audioTrack]);
        
        if (_screenTrack && _screenTrack.readyState === "live") {
           stream.addTrack(_screenTrack);
        }

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
            
            var videoRecPlayer = document.getElementById('videoCtrRec');
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