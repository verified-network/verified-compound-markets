import React from 'react';
import './modal.css'; 
import AssetIssuanceForm from './issue_form'; 
import { ComponentDefaultprops } from './utils/constants';

interface ModalProps extends ComponentDefaultprops {
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ onClose,  web3, chainId, account, signer }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button button--large button--supply" onClick={onClose}>
          Close
        </button>
        <AssetIssuanceForm web3={web3} chainId={chainId} account={account} signer={signer} />
      </div>
    </div>
  );
};

export default Modal;
