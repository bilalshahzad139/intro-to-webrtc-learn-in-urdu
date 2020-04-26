var Demo = (function () {
    var _myMediaStream; // My MediaStream instance
    var _audioTrack;
    var _mediaRecorder;
    var _recordedChunks = [];
    
    async function _init() {
        eventBindingForAudio();
        await startCall();
        
    }

    function eventBindingForAudio() {
        $("#btnMuteUnmute").on('click', function () {
            if (!_audioTrack) return;

            if (_audioTrack.enabled == false) {
                _audioTrack.enabled = true;
                $(this).text("Mute");
            }
            else {
                _audioTrack.enabled = false;
                $(this).text("UnMute");
            } 
            console.log(_audioTrack);
        });
        
        $("#btnStartReco").on('click', function () {
            setupMediaRecorder(_myMediaStream);
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
    }

    function setupMediaRecorder(stream) {
        _recordedChunks = [];
        _mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        _mediaRecorder.ondataavailable = (e) => {
            console.log(e.data.size);
            if(e.data.size > 0)
                _recordedChunks.push(e.data);
        };


        _mediaRecorder.onstart = async () => {
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
            
            var blob = new Blob(_recordedChunks, { type: 'video/webm' });

            let url = window.URL.createObjectURL(blob);
            //document.getElementById('videoCtr').src = url;

            $("#downloadRecording").attr({ href: url, download: 'test.weba' }).show();

            $("#btnStartReco").show();
            $("#btnPauseReco").hide();
            $("#btnStopReco").hide();
            //var download = document.getElementById('downloadRecording');
            //download.href = url;
            //download.download = 'test.weba';
            //download.style.display = 'block';


        };
    }

    async function startCall() {
        
        try {
            _myMediaStream = await navigator.mediaDevices.getUserMedia(
                { video: false, audio: true });

        } catch (e) {
            console.log(e);
        }

        document.getElementById('audioCtr').srcObject = _myMediaStream;

        _audioTrack = _myMediaStream.getAudioTracks()[0];

        _audioTrack.onmute = function (e) {
            console.log(e);
        }
        _audioTrack.onunmute = function (e) {
            console.log(e);
        }

        _myMediaStream.getAudioTracks().forEach(track => {
            console.log(track);
        })

    }

    return {
        init: async function () {
            await _init();
        }
    }
}());