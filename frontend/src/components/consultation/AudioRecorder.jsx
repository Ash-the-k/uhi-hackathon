import React, { useState, useRef, useEffect } from 'react';

export default function AudioRecorder({ onRecordingStart, onAudioSaved }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setIsSaved(false);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Call onRecordingStart callback to create consultation
      if (onRecordingStart) {
        onRecordingStart();
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSave = async () => {
    if (!audioBlob) return;
    
    setIsSaving(true);
    try {
      if (onAudioSaved) {
        await onAudioSaved(audioBlob, audioUrl);
      }
      setIsSaved(true);
    } catch (error) {
      console.error('Error saving audio:', error);
      alert('Failed to save audio. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const playAudio = () => {
    if (audioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <div style={{ color: '#fff' }}>
      <div style={{ marginBottom: '20px' }}>
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            style={{
              padding: '12px 24px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginRight: '10px'
            }}
          >
            🎤 Start Recording
          </button>
        )}

        {isRecording && !isPaused && (
          <>
            <button
              onClick={pauseRecording}
              style={{
                padding: '12px 24px',
                background: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              ⏸ Pause
            </button>
            <button
              onClick={stopRecording}
              style={{
                padding: '12px 24px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              ⏹ Stop
            </button>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc3545' }}>
              🔴 Recording: {formatTime(recordingTime)}
            </span>
          </>
        )}

        {isRecording && isPaused && (
          <>
            <button
              onClick={resumeRecording}
              style={{
                padding: '12px 24px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              ▶ Resume
            </button>
            <button
              onClick={stopRecording}
              style={{
                padding: '12px 24px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >
              ⏹ Stop
            </button>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffc107' }}>
              ⏸ Paused: {formatTime(recordingTime)}
            </span>
          </>
        )}

        {audioBlob && !isRecording && (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <button
                onClick={isPlaying ? pauseAudio : playAudio}
                disabled={isSaving}
                style={{
                  padding: '12px 24px',
                  background: isPlaying ? '#ffc107' : '#17a2b8',
                  color: isPlaying ? '#000' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginRight: '10px',
                  opacity: isSaving ? 0.6 : 1
                }}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              {!isSaved && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    padding: '12px 24px',
                    background: isSaving ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginRight: '10px'
                  }}
                >
                  {isSaving ? '💾 Saving...' : '💾 Save'}
                </button>
              )}
              {isSaved && (
                <span style={{ color: '#28a745', fontSize: '14px', fontWeight: 'bold', marginLeft: '10px' }}>
                  ✓ Audio saved ({Math.round(audioBlob.size / 1024)} KB)
                </span>
              )}
            </div>
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              style={{ width: '100%', marginTop: '10px' }}
              controls
            />
          </div>
        )}
      </div>
    </div>
  );
}
