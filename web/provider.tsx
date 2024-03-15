import React, { useState } from 'react';
import './ui.css'; 
import { Link, redirect } from 'react-router-dom';
import AssetIssuanceForm from './issue_form';
import TableData from './provider_data';
import '../styles/main.scss';
import { ComponentDefaultprops } from './utils/constants';

interface TableRow {
  "Asset": string;
  "Collateral": string;
  "APY": string;
  'Currency': string;
  'Face value': string;
  'Issuing docs': string;
  "Collateral posted": string;
  "Status": string;
}



function Providers({web3, account, chainId, signer}: ComponentDefaultprops) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupAction, setPopupAction] = useState('');
  const [enteredNumber, setEnteredNumber] = useState<number | null>(null);
  console.log("accts: ",  account)
 

  const data: TableRow[] = TableData;

  const headerNames: (keyof TableRow)[] = [
    "Asset",
    'Collateral',
    'APY',
    'Currency',
    'Face value',
    'Issuing docs',
    'Collateral posted',
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
    if (action === 'Buy this Issue' || action === 'Redeem issue') {
      setShowPopup(true);
      setPopupAction(action);
    } else {
      // Handle other button actions
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

  return (
    
      <div  className="home__content">
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

              <div className="buttons-cont">
              
             <li className="link-container">
              <a href="/" className="link-container2">Number of issues by Issuer</a>
            </li>
            <li className="link-container">
              <a href="/" className="link-container2">Total borrowing for all issues</a>
            </li>
            <li className="link-container">
              <a href="/" className="link-container2"> Borrowing for this issue</a>
            </li>
            <li className="link-container">
              <a href="/" className="link-container2">Total repayments for all issue</a>
            </li>
            <li className="link-container">
              <a href="/" className="link-container2">Repayment of this issue</a>
            </li>
            <li className="link-container">
              <a href="/" className="link-container2">Number of issues defaulted</a>
            </li>
             
            
            
             
            
        <button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Buy this Issue')}>
          Buy this issue
        </button>
        <button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Redeem issue')}>
          Redeem issue
        </button>
        
        <Link to="/issue">
        <button className='sidebar-button button--large button--supply'>Issue New RWA</button>
      </Link>
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
      </div>

  );
}

export default Providers;
