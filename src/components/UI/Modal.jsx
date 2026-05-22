import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '600px', 
          width: '90%', 
          animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        <div className="modal-header flex align-center justify-between" style={{ marginBottom: '20px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '14px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--white)' }}>
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="tab-btn" 
            style={{ 
              padding: '6px', 
              borderRadius: 'var(--radius-sm)', 
              color: 'var(--gray-400)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(10, 15, 30, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background-color: rgba(20, 25, 45, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;
