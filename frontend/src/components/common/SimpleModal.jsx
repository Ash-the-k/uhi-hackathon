import React from 'react';
import './SimpleModal.css';

export default function SimpleModal({ children, title = '', onClose }) {
  return (
    <div className="sm-backdrop" onMouseDown={onClose}>
      <div className="sm-card" onMouseDown={e => e.stopPropagation()}>
        <div className="sm-head">
          <h3>{title}</h3>
          <button className="sm-close" onClick={onClose}>✕</button>
        </div>
        <div className="sm-body">{children}</div>
      </div>
    </div>
  );
}
