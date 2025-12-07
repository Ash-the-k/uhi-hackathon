import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import appointmentsApi from '../../api/appointmentsApi';
import consultationsApi from '../../api/consultationsApi';
import Navbar from '../../components/layout/Navbar';
import LhpCards from '../../components/lhp/LhpCards';
import LhpSuggestions from '../../components/lhp/LhpSuggestions';

export default function ConsultationPage() {
  const { appointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [audioSaved, setAudioSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [generatingSOAP, setGeneratingSOAP] = useState(false);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    fetchData();
    return () => {
      // Cleanup: stop recording if component unmounts
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [appointmentId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch appointment details
      const appointmentRes = await appointmentsApi.getById(appointmentId);
      const appointmentData = appointmentRes.data.appointment;
      setAppointment(appointmentData);
      setPatient(appointmentData.patient);
      setDoctor(appointmentData.doctor);

      // Get consultation ID from URL params (set when starting consultation)
      const consultationIdFromUrl = searchParams.get('consultationId');
      
      let consultationData;
      
      if (consultationIdFromUrl) {
        // Use the consultation ID from URL (created when Start button was clicked)
        try {
          const consultationRes = await consultationsApi.getById(consultationIdFromUrl);
          consultationData = consultationRes.data.data;
        } catch (err) {
          console.error('Error fetching consultation by ID:', err);
          // Fallback: create new consultation
          const createRes = await consultationsApi.create({
            patientId: appointmentData.patientId,
            doctorId: appointmentData.doctorId
          });
          consultationData = createRes.data.data;
        }
      } else {
        // No consultation ID in URL, try to find existing or create new
        try {
          const consultationsRes = await consultationsApi.list();
          const consultations = consultationsRes.data.data || consultationsRes.data || [];
          const existingConsultation = consultations.find(
            (c) => String(c.patientId) === String(appointmentData.patientId) && 
                   String(c.doctorId) === String(appointmentData.doctorId)
          );

          if (existingConsultation) {
            consultationData = existingConsultation;
          } else {
            // Create new consultation
            const createRes = await consultationsApi.create({
              patientId: appointmentData.patientId,
              doctorId: appointmentData.doctorId
            });
            consultationData = createRes.data.data;
          }
        } catch (err) {
          console.error('Error fetching/creating consultation:', err);
          // If consultation doesn't exist, create it
          try {
            const createRes = await consultationsApi.create({
              patientId: appointmentData.patientId,
              doctorId: appointmentData.doctorId
            });
            consultationData = createRes.data.data;
          } catch (createErr) {
            console.error('Error creating consultation:', createErr);
            throw createErr;
          }
        }
      }

      setConsultation(consultationData);
      // Don't set audioSaved on initial load - only set it when we actually save
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err?.response?.data?.message || 'Failed to load consultation data');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      // Reset states when starting new recording
      setJustSaved(false);
      setAudioSaved(false);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      // Stop the timer but keep the current time
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      // Resume timer from current time
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      }
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} sec`;
  };

  const handleSaveAudio = async () => {
    if (!audioBlob || !consultation) {
      setError('No audio to save');
      return;
    }

    setSaving(true);
    setError('');
    setAudioSaved(false);
    try {
      // Convert blob to file - backend will save as .mp3
      const audioFile = new File([audioBlob], `consultation-${consultation._id}-${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      await consultationsApi.uploadAudio(consultation._id, audioFile);
      
      // Refresh consultation data
      const consultationRes = await consultationsApi.getById(consultation._id);
      setConsultation(consultationRes.data.data);
      
      // Mark as saved
      setAudioSaved(true);
      setJustSaved(true);
      
      // Wait a few seconds before starting SOAP generation (to show audio saved first)
      setTimeout(() => {
        // Start polling for transcript and SOAP updates
        startPollingForUpdates(consultation._id);
      }, 3000); // 3 second delay
      
      // Reset audio state
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setRecordingTime(0);
    } catch (err) {
      console.error('Error saving audio:', err);
      setError(err?.response?.data?.message || 'Failed to save audio');
      setAudioSaved(false);
    } finally {
      setSaving(false);
    }
  };

  const startPollingForUpdates = (consultationId) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setGeneratingSOAP(true);
    setGeneratingSuggestions(false);
    
    let pollCount = 0;
    const maxPolls = 120; // Poll for up to 10 minutes (5 second intervals)
    let soapGenerated = false;

    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      if (pollCount >= maxPolls) {
        clearInterval(pollingIntervalRef.current);
        setGeneratingSOAP(false);
        setGeneratingSuggestions(false);
        return;
      }

      try {
        const consultationRes = await consultationsApi.getById(consultationId);
        const updatedConsultation = consultationRes.data.data;
        
        // Check if transcript or SOAP has been updated
        const hasTranscript = updatedConsultation.transcript && updatedConsultation.transcript.trim().length > 0;
        const hasSOAP = updatedConsultation.soap?.current && (
          updatedConsultation.soap.current.subjective ||
          updatedConsultation.soap.current.objective ||
          updatedConsultation.soap.current.assessment ||
          updatedConsultation.soap.current.plan
        );

        if (hasTranscript || hasSOAP) {
          setConsultation(updatedConsultation);
          
          // Once SOAP is generated, wait a few seconds then start checking for suggestions
          if (hasSOAP && !soapGenerated) {
            soapGenerated = true;
            setGeneratingSOAP(false);
            // Wait a few seconds before showing suggestions generation
            setTimeout(() => {
              setGeneratingSuggestions(true);
              console.log('SOAP generated, now waiting for LHP suggestions...');
            }, 3000); // 3 second delay
          }
          
          // Stop polling once we have both transcript and SOAP
          // (Suggestions will appear automatically when they're created)
          if (hasTranscript && hasSOAP && soapGenerated) {
            // Continue polling for a bit more to catch suggestions, then stop
            if (pollCount > 20) { // After SOAP is ready, poll for ~2 more minutes for suggestions
              clearInterval(pollingIntervalRef.current);
              setGeneratingSuggestions(false);
            }
          }
        }
      } catch (err) {
        console.error('Error polling for updates:', err);
        // Continue polling even on error
      }
    }, 5000); // Poll every 5 seconds
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>
          Loading consultation...
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: '20px', color: '#fff' }}>
          <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>
          <button onClick={() => navigate('/doctor/dashboard')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: '#fff', backgroundColor: '#0b1220', minHeight: '100vh' }}>
        <h2 style={{ color: '#fff', marginBottom: '10px' }}>Consultation</h2>
        
        {error && (
          <div style={{ color: 'red', marginBottom: '15px', padding: '10px', background: '#ffe6e6', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {/* Patient and Doctor Details Side by Side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Patient Details */}
          <div style={{ padding: '20px', background: '#172033', borderRadius: '8px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px' }}>
              Patient Details
            </h3>
            {patient ? (
              <div style={{ color: '#ddd' }}>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Name:</strong> {patient.name || 'N/A'}
                </p>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Age:</strong> {patient.age || 'N/A'}
                </p>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Gender:</strong> {patient.gender || 'N/A'}
                </p>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Phone:</strong> {patient.phone || 'N/A'}
                </p>
              </div>
            ) : appointment ? (
              <div style={{ color: '#ddd' }}>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Name:</strong> {appointment.patientName || 'N/A'}
                </p>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Email:</strong> {appointment.patientEmail || 'N/A'}
                </p>
              </div>
            ) : (
              <p style={{ color: '#999' }}>Patient details not available</p>
            )}
          </div>

          {/* Doctor Details */}
          <div style={{ padding: '20px', background: '#172033', borderRadius: '8px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px' }}>
              Doctor Details
            </h3>
            {doctor ? (
              <div style={{ color: '#ddd' }}>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Name:</strong> {doctor.name || 'N/A'}
                </p>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Specialization:</strong> {doctor.specialization || 'N/A'}
                </p>
              </div>
            ) : appointment ? (
              <div style={{ color: '#ddd' }}>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Name:</strong> {appointment.doctorName || 'N/A'}
                </p>
                <p style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#fff' }}>Specialization:</strong> {appointment.specialization || 'N/A'}
                </p>
              </div>
            ) : (
              <p style={{ color: '#999' }}>Doctor details not available</p>
            )}
          </div>
        </div>

        {/* LHP Section - Right after Patient/Doctor Details */}
        {(patient?._id || appointment?.patientId) && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px' }}>
              LHP (Longitudinal Health Profile)
            </h3>
            <LhpCards patientId={patient?._id || appointment?.patientId} />
          </div>
        )}

        {/* Audio Recording Section */}
        <div style={{ padding: '20px', background: '#172033', borderRadius: '8px' }}>
          <h3 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px' }}>
            Audio Recording
          </h3>

          <div style={{ marginBottom: '20px' }}>
            {(isRecording || isPaused || (audioBlob && !audioSaved)) && (
              <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
                {formatTime(recordingTime)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
              {!isRecording && !audioBlob && (
                <button
                  onClick={startRecording}
                  style={{
                    padding: '10px 20px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Start Recording
                </button>
              )}

              {isRecording && (
                <>
                  {!isPaused ? (
                    <button
                      onClick={pauseRecording}
                      style={{
                        padding: '10px 20px',
                        background: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeRecording}
                      style={{
                        padding: '10px 20px',
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={stopRecording}
                    style={{
                      padding: '10px 20px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    Stop
                  </button>
                </>
              )}

              {audioBlob && !isRecording && (
                <button
                  onClick={handleSaveAudio}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    background: saving ? '#6c757d' : '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Audio'}
                </button>
              )}
            </div>

            {audioUrl && !audioSaved && (
              <div style={{ marginTop: '15px' }}>
                <p style={{ color: '#ddd', marginBottom: '5px', fontSize: '14px' }}>Preview (not saved yet):</p>
                <audio controls src={audioUrl} style={{ width: '100%', maxWidth: '500px' }} />
              </div>
            )}

            {justSaved && consultation?.audioPath && (
              <div style={{ marginTop: '15px', padding: '10px', background: '#2b3a4a', borderRadius: '4px' }}>
                <p style={{ color: '#28a745', marginBottom: '5px', fontWeight: 'bold' }}>✓ File saved successfully</p>
                <audio controls src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000'}${consultation.audioPath}`} style={{ width: '100%', maxWidth: '500px' }} />
              </div>
            )}
          </div>
        </div>

        {/* SOAP Section - Below Audio */}
        <div style={{ marginTop: '20px', padding: '20px', background: '#172033', borderRadius: '8px' }}>
          <h3 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px' }}>
            SOAP Notes
          </h3>
          
          {generatingSOAP && (
            <div style={{ 
              padding: '30px', 
              background: '#1a2332', 
              borderRadius: '8px', 
              border: '1px solid #2b3a4a',
              textAlign: 'center'
            }}>
              <div style={{ color: '#17a2b8', fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>
                🔄 Generating SOAP from audio...
              </div>
              <div style={{ color: '#999', fontSize: '14px' }}>
                This may take a few minutes. Please wait...
              </div>
            </div>
          )}

          {!generatingSOAP && consultation?.soap?.current && (
            <div style={{ background: '#1a2332', borderRadius: '8px', padding: '20px', border: '1px solid #2b3a4a' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                <div>
                  <h4 style={{ color: '#17a2b8', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Subjective (S)
                  </h4>
                  <div style={{ 
                    padding: '15px', 
                    background: '#172033', 
                    borderRadius: '6px', 
                    color: '#ddd', 
                    fontSize: '14px',
                    minHeight: '80px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {consultation.soap.current.subjective || 'N/A'}
                  </div>
                </div>
                
                <div>
                  <h4 style={{ color: '#28a745', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Objective (O)
                  </h4>
                  <div style={{ 
                    padding: '15px', 
                    background: '#172033', 
                    borderRadius: '6px', 
                    color: '#ddd', 
                    fontSize: '14px',
                    minHeight: '80px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {consultation.soap.current.objective || 'N/A'}
                  </div>
                </div>
                
                <div>
                  <h4 style={{ color: '#ffc107', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Assessment (A)
                  </h4>
                  <div style={{ 
                    padding: '15px', 
                    background: '#172033', 
                    borderRadius: '6px', 
                    color: '#ddd', 
                    fontSize: '14px',
                    minHeight: '80px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {consultation.soap.current.assessment || 'N/A'}
                  </div>
                </div>
                
                <div>
                  <h4 style={{ color: '#dc3545', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Plan (P)
                  </h4>
                  <div style={{ 
                    padding: '15px', 
                    background: '#172033', 
                    borderRadius: '6px', 
                    color: '#ddd', 
                    fontSize: '14px',
                    minHeight: '80px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {consultation.soap.current.plan || 'N/A'}
                  </div>
                </div>
              </div>
              
              {consultation.soap.current.editedAt && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #2b3a4a', color: '#999', fontSize: '12px' }}>
                  Generated: {new Date(consultation.soap.current.editedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {!generatingSOAP && !consultation?.soap?.current && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
              SOAP notes will appear here after audio is processed
            </div>
          )}
        </div>

        {/* LHP Suggestions Section - Below SOAP */}
        {(patient?._id || appointment?.patientId) && (
          <div style={{ marginTop: '20px' }}>
            {generatingSuggestions && !generatingSOAP && (
              <div style={{ 
                padding: '20px', 
                background: '#172033', 
                borderRadius: '8px', 
                border: '1px solid #2b3a4a',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <div style={{ color: '#17a2b8', fontSize: '16px', marginBottom: '10px', fontWeight: 'bold' }}>
                  🤖 Generating LHP Suggestions from SOAP...
                </div>
                <div style={{ color: '#999', fontSize: '12px' }}>
                  Analyzing consultation data. This may take a few minutes.
                </div>
              </div>
            )}
            {!generatingSOAP && <LhpSuggestions patientId={patient?._id || appointment?.patientId} />}
          </div>
        )}
      </div>
    </div>
  );
}

