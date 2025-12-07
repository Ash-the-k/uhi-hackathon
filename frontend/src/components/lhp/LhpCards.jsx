import React, { useEffect, useState } from 'react';
import lhpApi from '../../api/lhpApi';

export default function LhpCards({ patientId }) {
  const [lhpData, setLhpData] = useState({
    chronic: [],
    allergies: [],
    currentMedications: [],
    pastProcedures: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (patientId) {
      fetchLhp();
    }
  }, [patientId]);

  const fetchLhp = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await lhpApi.getLhp(patientId);
      if (response.data.success) {
        setLhpData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching LHP:', err);
      setError(err?.response?.data?.message || 'Failed to load LHP data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'VERIFIED_DOCTOR') {
      return (
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold',
          background: '#28a745',
          color: '#fff'
        }}>
          ✓ Verified
        </span>
      );
    } else if (status === 'UNVERIFIED') {
      return (
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold',
          background: '#ffc107',
          color: '#000'
        }}>
          ⏳ Pending
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#ddd' }}>
        Loading LHP data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#ff6b6b', background: '#ffe6e6', borderRadius: '4px' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
      {/* Chronic Conditions Card */}
      <div style={{ padding: '20px', background: '#172033', borderRadius: '8px', border: '1px solid #2b3a4a' }}>
        <h4 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px', fontSize: '16px' }}>
          Chronic Conditions
        </h4>
        {lhpData.chronic && lhpData.chronic.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lhpData.chronic.map((condition) => (
              <div
                key={condition._id}
                style={{
                  padding: '12px',
                  background: '#1a2332',
                  borderRadius: '6px',
                  border: '1px solid #2b3a4a'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ color: '#fff', fontSize: '14px' }}>{condition.label}</strong>
                  {getStatusBadge(condition.status)}
                </div>
                {condition.notes && (
                  <p style={{ color: '#bbb', fontSize: '12px', margin: '4px 0 0 0' }}>{condition.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic', fontSize: '14px' }}>No chronic conditions recorded</p>
        )}
      </div>

      {/* Allergies Card */}
      <div style={{ padding: '20px', background: '#172033', borderRadius: '8px', border: '1px solid #2b3a4a' }}>
        <h4 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px', fontSize: '16px' }}>
          Allergies
        </h4>
        {lhpData.allergies && lhpData.allergies.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lhpData.allergies.map((allergy) => (
              <div
                key={allergy._id}
                style={{
                  padding: '12px',
                  background: '#1a2332',
                  borderRadius: '6px',
                  border: '1px solid #2b3a4a'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ color: '#fff', fontSize: '14px' }}>{allergy.substance}</strong>
                  {getStatusBadge(allergy.status)}
                </div>
                {allergy.reaction && (
                  <p style={{ color: '#bbb', fontSize: '12px', margin: '4px 0' }}>
                    <strong style={{ color: '#ddd' }}>Reaction:</strong> {allergy.reaction}
                  </p>
                )}
                {allergy.severity && (
                  <p style={{ color: '#bbb', fontSize: '12px', margin: '4px 0' }}>
                    <strong style={{ color: '#ddd' }}>Severity:</strong> {allergy.severity}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic', fontSize: '14px' }}>No allergies recorded</p>
        )}
      </div>

      {/* Current Medications Card */}
      <div style={{ padding: '20px', background: '#172033', borderRadius: '8px', border: '1px solid #2b3a4a' }}>
        <h4 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px', fontSize: '16px' }}>
          Current Medications
        </h4>
        {lhpData.currentMedications && lhpData.currentMedications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lhpData.currentMedications.map((med) => (
              <div
                key={med._id}
                style={{
                  padding: '12px',
                  background: '#1a2332',
                  borderRadius: '6px',
                  border: '1px solid #2b3a4a'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ color: '#fff', fontSize: '14px' }}>{med.name}</strong>
                  {getStatusBadge(med.status)}
                </div>
                <div style={{ color: '#bbb', fontSize: '12px' }}>
                  {med.dosage && (
                    <p style={{ margin: '4px 0' }}>
                      <strong style={{ color: '#ddd' }}>Dosage:</strong> {med.dosage}
                    </p>
                  )}
                  {med.frequency && (
                    <p style={{ margin: '4px 0' }}>
                      <strong style={{ color: '#ddd' }}>Frequency:</strong> {med.frequency}
                    </p>
                  )}
                  {med.route && (
                    <p style={{ margin: '4px 0' }}>
                      <strong style={{ color: '#ddd' }}>Route:</strong> {med.route}
                    </p>
                  )}
                  {med.startDate && (
                    <p style={{ margin: '4px 0' }}>
                      <strong style={{ color: '#ddd' }}>Start:</strong> {formatDate(med.startDate)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic', fontSize: '14px' }}>No current medications recorded</p>
        )}
      </div>

      {/* Past Procedures Card */}
      <div style={{ padding: '20px', background: '#172033', borderRadius: '8px', border: '1px solid #2b3a4a' }}>
        <h4 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px', fontSize: '16px' }}>
          Past Procedures
        </h4>
        {lhpData.pastProcedures && lhpData.pastProcedures.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lhpData.pastProcedures.map((procedure) => (
              <div
                key={procedure._id}
                style={{
                  padding: '12px',
                  background: '#1a2332',
                  borderRadius: '6px',
                  border: '1px solid #2b3a4a'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ color: '#fff', fontSize: '14px' }}>{procedure.procedure}</strong>
                  {getStatusBadge(procedure.status)}
                </div>
                {procedure.date && (
                  <p style={{ color: '#bbb', fontSize: '12px', margin: '4px 0' }}>
                    <strong style={{ color: '#ddd' }}>Date:</strong> {formatDate(procedure.date)}
                  </p>
                )}
                {procedure.notes && (
                  <p style={{ color: '#bbb', fontSize: '12px', margin: '4px 0' }}>{procedure.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic', fontSize: '14px' }}>No past procedures recorded</p>
        )}
      </div>
    </div>
  );
}

