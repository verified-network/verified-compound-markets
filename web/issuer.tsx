import React, { useState } from 'react';
import TableData from './issuer_data';
import '../styles/main.scss';
import '../styles/components/_button.scss';
import Modal from './Modal';
import { Link } from 'react-router-dom';
import AssetIssuanceForm from './issue_form';

interface TableRow {
  "Asset": string;
  "Collateral": string;
  "Issued value": string;
  "sold value": string;
  "Collateral posted": string;
  "Borrowed": string;
  "APY": string;
  "Status": string;
}

function Issuer() {
  const [showPopup, setShowPopup] = useState(false);
  const [popupAction, setPopupAction] = useState('');
  const [enteredNumber, setEnteredNumber] = useState<number | null>(null);

  const data: TableRow[] = TableData;

  const headerNames: (keyof TableRow)[] = [
    'Asset',
    'Collateral',
    'Issued value',
    'sold value',
    'Collateral posted',
    'Borrowed',
    'APY',
    'Status',
  ];

  const ThData = () => {
    return headerNames.map((headerName) => {
      return <th key={headerName}>{headerName}</th>;
    });
  };

  const tdData = () => {
    return data.map((rowData, rowIndex) => {
      return (
        <tr key={rowIndex}>
          {headerNames.map((headerName) => {
            return <td key={headerName}>{rowData[headerName]}</td>;
          })}
        </tr>
      );
    });
  };

  const handleButtonClick = (action: string) => {
    if (action === 'Issue new RWA') {
      // Handle Issue new RWA action
      setShowIssuanceForm(true);
    } else {
      setShowPopup(true);
      setPopupAction(action);
    }
  };
 

  const handlePopupSubmit = () => {
    // Handle the enteredNumber based on the popupAction (e.g., perform appropriate action)
    console.log(`Action: ${popupAction}, Number: ${enteredNumber}`);

    // Reset states after submission
    setShowPopup(false);
    setPopupAction('');
    setEnteredNumber(null);
  };
  const [showModal, setShowModal] = useState(false);
  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  
  
  return (
    
    <div className="home__content">
      <div className="home__assets">
        <div className="panel panel--assets">
          
        <div className="assets-table">
        <table className="table">
          <thead>
            <tr>{ThData()}</tr>
          </thead>
          <tbody>{tdData()}</tbody>
        </table>
      </div>
            
            { null }
            
          </div>
        </div>
       
        <div className="home__sidebar">
          <div className="position-card__summary">
            <div className="panel position-card L3">
              <div className="panel__header-row">
                
                <label className="L1 label text-color--1">Summary</label>
              </div>
              <div className="panel__header-row">
                <p className="text-color--1">
                  Verified RWA Markets allows asset managers of real world assets to sell them for collateral that can 
                  be used to borrow liquid digital assets, and for users to buy staked real world assets with collateral 
                  supported on Compound and earn income from underlying real world assets. 
                </p>
              </div>


              <div className="button-container1">

              <li className="link-container">
              <a href="/" className="link-container2">Borrowing capacity left</a>
            </li>

             <button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Borrow')}>
              Borrow
             </button>

             <button
                 className="sidebar-button button--large button--supply"
                onClick={() => handleButtonClick('Redeem Collateral')}
             >
             Redeem collateral
             </button>

              <button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Repay Loan')}>
               Repay loan
               </button>
        
             <button
              className="sidebar-button button--large button--supply"
              onClick={openModal}
              >
                Issue new RWA
            </button>

            </div>  
            </div>
          </div>
        </div>

        {showPopup && (
        <div className="popup">
          <h3>Enter a number:</h3>
          <input
            type="number"
            value={enteredNumber !== null ? enteredNumber : ''}
            onChange={(e) => setEnteredNumber(parseInt(e.target.value))}
          />
          <div className="buttons-container">
            <button className="button-submit button--large button--supply" onClick={handlePopupSubmit}>
              Submit
            </button>
            <button className="button-cancel button--large button--supply" onClick={() => setShowPopup(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
        {showIssuanceForm && <AssetIssuanceForm />}
        {showModal && <Modal onClose={closeModal} />}
      </div>

  );
}

export default Issuer;
