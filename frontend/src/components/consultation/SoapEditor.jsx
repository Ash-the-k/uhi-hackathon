import React, { useState, useEffect } from 'react';
import consultationsApi from '../../api/consultationsApi';

export default function SoapEditor({ consultation, onVerify, onUpdate, appointment }) {
  const [soap, setSoap] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allConsultations, setAllConsultations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Load existing SOAP draft (current) if available, otherwise load final
    if (consultation?.soap?.current) {
      // Show draft (editable)
      setSoap({
        subjective: consultation.soap.current.subjective || '',
        objective: consultation.soap.current.objective || '',
        assessment: consultation.soap.current.assessment || '',
        plan: consultation.soap.current.plan || ''
      });
    } else if (consultation?.soap?.final) {
      // If no draft, show final (read-only until doctor edits)
      setSoap({
        subjective: consultation.soap.final.subjective || '',
        objective: consultation.soap.final.objective || '',
        assessment: consultation.soap.final.assessment || '',
        plan: consultation.soap.final.plan || ''
      });
    }
  }, [consultation]);

  // Fetch all consultations for this patient-doctor pair for history
  useEffect(() => {
    const fetchAllConsultations = async () => {
      if (!consultation?.patientId || !consultation?.doctorId) return;
      
      try {
        const res = await consultationsApi.list();
        const consultations = res.data.data || res.data || [];
        // Filter by patientId and doctorId
        const filtered = consultations.filter(
          c => String(c.patientId) === String(consultation.patientId) &&
               String(c.doctorId) === String(consultation.doctorId)
        );
        setAllConsultations(filtered);
      } catch (err) {
        console.error('Error fetching consultation history:', err);
      }
    };

    fetchAllConsultations();
  }, [consultation?.patientId, consultation?.doctorId]);

  const handleChange = (field, value) => {
    setSoap(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleSaveDraft = async () => {
    // Update current draft without verifying
    if (!consultation?._id) return;
    
    try {
      await consultationsApi.updateSoapDraft(consultation._id, soap);
      setSuccess('Draft saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      // Refresh consultation data
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save draft');
    }
  };

  const handleVerify = async () => {
    // Basic validation
    if (!soap.subjective && !soap.objective && !soap.assessment && !soap.plan) {
      setError('Please fill at least one SOAP field');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      if (onVerify) {
        await onVerify(soap);
        setSuccess('SOAP verified successfully!');
        // Clear form after successful verification
        setTimeout(() => {
          setSoap({ subjective: '', objective: '', assessment: '', plan: '' });
        }, 2000);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to verify SOAP');
    } finally {
      setIsVerifying(false);
    }
  };

  const isVerified = consultation?.status === 'VERIFIED';
  const hasDraft = consultation?.soap?.current && Object.keys(consultation.soap.current).length > 0;
  const hasFinal = consultation?.soap?.final && Object.keys(consultation.soap.final).length > 0;
  const transcriptionStatus = consultation?.transcriptionStatus || 'pending';
  const isReadOnly = hasFinal && !hasDraft; // Read-only when showing final without draft

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h4 style={{ color: '#fff', margin: 0 }}>
          {hasDraft ? 'SOAP Notes (Draft - Editable)' : hasFinal ? 'SOAP Notes (Final - Verified)' : 'SOAP Notes'}
        </h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {transcriptionStatus === 'pending' && (
            <span style={{ 
              padding: '4px 12px', 
              background: '#ffc107', 
              color: '#000', 
              borderRadius: '4px', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              ⏳ Waiting for Transcription
            </span>
          )}
          {transcriptionStatus === 'transcribing' && (
            <span style={{ 
              padding: '4px 12px', 
              background: '#17a2b8', 
              color: 'white', 
              borderRadius: '4px', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              🔄 Transcribing...
            </span>
          )}
          {transcriptionStatus === 'completed' && !hasDraft && !hasFinal && (
            <span style={{ 
              padding: '4px 12px', 
              background: '#17a2b8', 
              color: 'white', 
              borderRadius: '4px', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              🤖 Generating SOAP...
            </span>
          )}
          {isVerified && (
            <span style={{ 
              padding: '4px 12px', 
              background: '#28a745', 
              color: 'white', 
              borderRadius: '4px', 
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              ✓ VERIFIED
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ 
          color: '#dc3545', 
          marginBottom: '15px', 
          padding: '10px', 
          background: '#ffe6e6', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          color: '#28a745', 
          marginBottom: '15px', 
          padding: '10px', 
          background: '#e6ffe6', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gap: '15px' }}>
        {/* Subjective */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#ddd', fontWeight: 'bold' }}>
            Subjective (S)
          </label>
          <textarea
            value={soap.subjective}
            onChange={(e) => handleChange('subjective', e.target.value)}
            placeholder="Patient's symptoms, complaints, and history..."
            disabled={isVerifying || isReadOnly}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              background: '#0b1220',
              color: '#fff',
              border: '1px solid #2b3a4a',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Objective */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#ddd', fontWeight: 'bold' }}>
            Objective (O)
          </label>
          <textarea
            value={soap.objective}
            onChange={(e) => handleChange('objective', e.target.value)}
            placeholder="Observations, vital signs, physical examination findings..."
            disabled={isVerifying || isReadOnly}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              background: '#0b1220',
              color: '#fff',
              border: '1px solid #2b3a4a',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Assessment */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#ddd', fontWeight: 'bold' }}>
            Assessment (A)
          </label>
          <textarea
            value={soap.assessment}
            onChange={(e) => handleChange('assessment', e.target.value)}
            placeholder="Diagnosis, differential diagnosis, clinical impression..."
            disabled={isVerifying || isReadOnly}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              background: '#0b1220',
              color: '#fff',
              border: '1px solid #2b3a4a',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Plan */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#ddd', fontWeight: 'bold' }}>
            Plan (P)
          </label>
          <textarea
            value={soap.plan}
            onChange={(e) => handleChange('plan', e.target.value)}
            placeholder="Treatment plan, medications, follow-up, patient education..."
            disabled={isVerifying || isReadOnly}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              background: '#0b1220',
              color: '#fff',
              border: '1px solid #2b3a4a',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleVerify}
          disabled={isVerifying || isVerified || !hasDraft}
          style={{
            padding: '12px 24px',
            background: (isVerifying || isVerified || !hasDraft) ? '#6c757d' : '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (isVerifying || isVerified || !hasDraft) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: (isVerifying || isVerified || !hasDraft) ? 0.6 : 1
          }}
        >
          {isVerifying ? 'Verifying...' : isVerified ? 'Already Verified' : !hasDraft ? 'No Draft to Verify' : '✓ Verify & Save SOAP'}
        </button>
        {hasDraft && (
          <button
            onClick={handleSaveDraft}
            style={{
              padding: '12px 24px',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            💾 Save Draft
          </button>
        )}
        {hasFinal && !hasDraft && (
          <button
            onClick={async () => {
              // Create new draft from final for editing
              if (consultation?.soap?.final) {
                const draftSoap = {
                  subjective: consultation.soap.final.subjective || '',
                  objective: consultation.soap.final.objective || '',
                  assessment: consultation.soap.final.assessment || '',
                  plan: consultation.soap.final.plan || ''
                };
                setSoap(draftSoap);
                
                // Update consultation with new draft
                try {
                  await consultationsApi.updateSoapDraft(consultation._id, draftSoap);
                  setSuccess('Draft created from verified SOAP. You can now edit it.');
                  setTimeout(() => setSuccess(''), 3000);
                  // Refresh consultation data
                  if (onUpdate) {
                    onUpdate();
                  }
                } catch (err) {
                  setError(err?.response?.data?.message || 'Failed to create draft');
                }
              }
            }}
            style={{
              padding: '12px 24px',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            ✏️ Edit Verified SOAP
          </button>
        )}
      </div>

      {/* Show SOAP History from all consultations */}
      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #2b3a4a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h5 style={{ color: '#fff', margin: 0 }}>SOAP History (All Consultations)</h5>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '6px 12px',
              background: showHistory ? '#6c757d' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showHistory ? '▼ Hide' : '▶ Show'} History
          </button>
        </div>
        
        {showHistory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {allConsultations.length === 0 ? (
              <div style={{ color: '#999', fontStyle: 'italic' }}>No previous SOAP reports found.</div>
            ) : (
              allConsultations.map((consult) => {
                // Show final SOAP from each consultation
                const finalSoap = consult.soap?.final;
                const historySoaps = consult.soap?.history || [];
                const allSoaps = finalSoap ? [finalSoap, ...historySoaps] : historySoaps;
                
                if (allSoaps.length === 0) return null;
                
                return (
                  <div key={consult._id} style={{ marginBottom: '20px' }}>
                    <div style={{ color: '#999', fontSize: '12px', marginBottom: '10px' }}>
                      Consultation: {consult.createdAt ? new Date(consult.createdAt).toLocaleString() : 'N/A'}
                      {consult.status === 'VERIFIED' && <span style={{ color: '#28a745', marginLeft: '10px' }}>✓ Verified</span>}
                    </div>
                    {allSoaps.map((version, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          background: '#0b1220', 
                          padding: '15px', 
                          borderRadius: '6px',
                          border: '1px solid #2b3a4a',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ color: '#999', fontSize: '12px', marginBottom: '10px' }}>
                          {index === 0 && finalSoap ? 'Final SOAP' : `Version ${index + 1}`} - {version.editedAt ? new Date(version.editedAt).toLocaleString() : 'Previous version'}
                        </div>
                        {version.subjective && (
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#ddd' }}>S:</strong> <span style={{ color: '#bbb' }}>{version.subjective}</span>
                          </div>
                        )}
                        {version.objective && (
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#ddd' }}>O:</strong> <span style={{ color: '#bbb' }}>{version.objective}</span>
                          </div>
                        )}
                        {version.assessment && (
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#ddd' }}>A:</strong> <span style={{ color: '#bbb' }}>{version.assessment}</span>
                          </div>
                        )}
                        {version.plan && (
                          <div>
                            <strong style={{ color: '#ddd' }}>P:</strong> <span style={{ color: '#bbb' }}>{version.plan}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
