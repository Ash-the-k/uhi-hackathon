import React, { useEffect, useState } from 'react';
import lhpApi from '../../api/lhpApi';

export default function LhpSuggestions({ patientId, onSuggestionUpdate }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editedEntries, setEditedEntries] = useState({});

  useEffect(() => {
    fetchSuggestions();
    // Auto-refresh every 10 seconds when patientId is set
    const interval = setInterval(() => {
      if (patientId) {
        fetchSuggestions();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [patientId]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await lhpApi.listSuggestions();
      if (response.data.success) {
        let filtered = response.data.data || [];
        // If patientId is provided, filter suggestions for that patient
        if (patientId) {
          filtered = filtered.filter(s => String(s.patientId) === String(patientId));
        }
        setSuggestions(filtered);
      }
    } catch (err) {
      console.error('Error fetching LHP suggestions:', err);
      setError(err?.response?.data?.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (suggestionId, currentEntry) => {
    setEditingId(suggestionId);
    setEditedEntries({ [suggestionId]: { ...currentEntry } });
  };

  const handleEditChange = (suggestionId, field, value) => {
    setEditedEntries(prev => ({
      ...prev,
      [suggestionId]: {
        ...prev[suggestionId],
        [field]: value
      }
    }));
  };

  const handleCancelEdit = (suggestionId) => {
    setEditingId(null);
    setEditedEntries(prev => {
      const newEntries = { ...prev };
      delete newEntries[suggestionId];
      return newEntries;
    });
  };

  const handleAction = async (suggestionId, action) => {
    setActingOn(suggestionId);
    setError('');
    try {
      // If we're accepting and there are edits, send the edited entry
      const editedEntry = editedEntries[suggestionId];
      const isEditing = editingId === suggestionId;
      
      // Prepare the request body
      const requestBody = { action };
      if (action === 'accept' && editedEntry && isEditing) {
        requestBody.editedEntry = editedEntry;
      }
      
      await lhpApi.actOnSuggestion(suggestionId, action, requestBody.editedEntry);
      
      // Remove the suggestion from list
      setSuggestions(prev => prev.filter(s => s._id !== suggestionId));
      setEditingId(null);
      setEditedEntries(prev => {
        const newEntries = { ...prev };
        delete newEntries[suggestionId];
        return newEntries;
      });
      
      // Notify parent to refresh LHP data
      if (onSuggestionUpdate) {
        onSuggestionUpdate();
      }
    } catch (err) {
      console.error('Error acting on suggestion:', err);
      setError(err?.response?.data?.message || `Failed to ${action} suggestion`);
    } finally {
      setActingOn(null);
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

  const getSectionLabel = (section) => {
    switch (section) {
      case 'CHRONIC_CONDITION':
        return 'Chronic Condition';
      case 'ALLERGY':
        return 'Allergy';
      case 'CURRENT_MED':
        return 'Current Medication';
      case 'PAST_PROCEDURE':
        return 'Past Procedure';
      default:
        return section;
    }
  };

  const renderProposedEntry = (suggestion) => {
    const isEditing = editingId === suggestion._id;
    const entry = isEditing && editedEntries[suggestion._id] 
      ? editedEntries[suggestion._id] 
      : (suggestion.proposedEntry || {});
    
    switch (suggestion.section) {
      case 'CHRONIC_CONDITION':
        return (
          <div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Label:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={entry.label || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'label', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.label || 'N/A'}</p>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Notes:</strong>
              {isEditing ? (
                <textarea
                  value={entry.notes || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'notes', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.notes || 'N/A'}</p>
              )}
            </div>
          </div>
        );
      case 'ALLERGY':
        return (
          <div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Substance:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={entry.substance || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'substance', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.substance || 'N/A'}</p>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Reaction:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={entry.reaction || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'reaction', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.reaction || 'N/A'}</p>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Severity:</strong>
              {isEditing ? (
                <select
                  value={entry.severity || 'mild'}
                  onChange={(e) => handleEditChange(suggestion._id, 'severity', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.severity || 'N/A'}</p>
              )}
            </div>
          </div>
        );
      case 'CURRENT_MED':
        return (
          <div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Name:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={entry.name || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.name || 'N/A'}</p>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Dosage:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={entry.dosage || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'dosage', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.dosage || 'N/A'}</p>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Frequency:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={entry.frequency || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'frequency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.frequency || 'N/A'}</p>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Route:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={entry.route || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'route', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.route || 'N/A'}</p>
              )}
            </div>
          </div>
        );
      case 'PAST_PROCEDURE':
        return (
          <div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Procedure:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={entry.procedure || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'procedure', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.procedure || 'N/A'}</p>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Date:</strong>
              {isEditing ? (
                <input
                  type="date"
                  value={entry.date ? new Date(entry.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.date ? formatDate(entry.date) : 'N/A'}</p>
              )}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Notes:</strong>
              {isEditing ? (
                <textarea
                  value={entry.notes || ''}
                  onChange={(e) => handleEditChange(suggestion._id, 'notes', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #2b3a4a',
                    background: '#1a2332',
                    color: '#fff',
                    fontSize: '12px',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <p style={{ margin: '4px 0', color: '#bbb' }}>{entry.notes || 'N/A'}</p>
              )}
            </div>
          </div>
        );
      default:
        return <pre style={{ color: '#bbb' }}>{JSON.stringify(entry, null, 2)}</pre>;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#ddd' }}>
        Loading suggestions...
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div style={{ padding: '20px', color: '#ff6b6b', background: '#ffe6e6', borderRadius: '4px' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#172033', borderRadius: '8px', border: '1px solid #2b3a4a' }}>
      <h4 style={{ color: '#fff', marginBottom: '15px', borderBottom: '2px solid #2b3a4a', paddingBottom: '10px', fontSize: '16px' }}>
        LHP Suggestions 
      </h4>
      
      {suggestions.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic', fontSize: '14px' }}>Loading LHP.....</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {suggestions.map((suggestion) => (
            <div
              key={suggestion._id}
              style={{
                padding: '15px',
                background: '#1a2332',
                borderRadius: '6px',
                border: '1px solid #2b3a4a'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <strong style={{ color: '#fff', fontSize: '14px' }}>
                    {getSectionLabel(suggestion.section)}
                  </strong>
                  <span style={{ 
                    display: 'inline-block',
                    marginLeft: '10px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: '#ffc107',
                    color: '#000'
                  }}>
                    PENDING
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {formatDate(suggestion.createdAt)}
                </div>
              </div>
              
              <div style={{ color: '#bbb', fontSize: '12px', marginBottom: '12px' }}>
                {renderProposedEntry(suggestion)}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                {editingId === suggestion._id ? (
                  <>
                    <button
                      onClick={() => handleCancelEdit(suggestion._id)}
                      style={{
                        padding: '6px 12px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        // Save the edited entry before accepting
                        const editedEntry = editedEntries[suggestion._id];
                        setEditingId(null);
                        await handleAction(suggestion._id, 'accept');
                      }}
                      disabled={actingOn === suggestion._id}
                      style={{
                        padding: '6px 12px',
                        background: actingOn === suggestion._id ? '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actingOn === suggestion._id ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {actingOn === suggestion._id ? 'Processing...' : '✓ Verify & Accept'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEdit(suggestion._id, suggestion.proposedEntry)}
                      disabled={actingOn === suggestion._id}
                      style={{
                        padding: '6px 12px',
                        background: actingOn === suggestion._id ? '#6c757d' : '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actingOn === suggestion._id ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleAction(suggestion._id, 'accept')}
                      disabled={actingOn === suggestion._id}
                      style={{
                        padding: '6px 12px',
                        background: actingOn === suggestion._id ? '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actingOn === suggestion._id ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {actingOn === suggestion._id ? 'Processing...' : '✓ Accept'}
                    </button>
                    <button
                      onClick={() => handleAction(suggestion._id, 'reject')}
                      disabled={actingOn === suggestion._id}
                      style={{
                        padding: '6px 12px',
                        background: actingOn === suggestion._id ? '#6c757d' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actingOn === suggestion._id ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {actingOn === suggestion._id ? 'Processing...' : '✗ Reject'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

