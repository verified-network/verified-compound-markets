import React from 'react';
import './modal.css'; 
import AssetIssuanceForm from './issue_form'; 

interface ModalProps {
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button button--large button--supply" onClick={onClose}>
          Close
        </button>
        <AssetIssuanceForm />
      </div>
    </div>
  );
};

export default Modal;
