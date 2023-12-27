import React, { ReactNode } from 'react';
import './modal.css'; 
import AssetIssuanceForm from './issue_form'; 

interface ModalProps {
  onClose: () => void,
  children: ReactNode
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button button--large button--supply" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
