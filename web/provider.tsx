import React, { useState } from 'react';
import './ui.css'; 
import { Link, redirect } from 'react-router-dom';
import AssetIssuanceForm from './issue_form';
import TableData from './provider_data';
import '../styles/main.scss';
import { ComponentDefaultprops } from './utils/constants';
import { Token, contractAddress } from '@verified-network/verified-sdk';
import { parseUnits } from '@ethersproject/units';

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
  const [enteredNumber, setEnteredNumber] = useState<number | ''>('');
  // console.log("accts: ",  account)
 

  const data: TableRow[] = TableData; ////todo: update to subgraph rwa after RWA has been issued

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
    if (action === 'Provide Collateral' || action === 'Liquidate Collateral') {
      setShowPopup(true);
      setPopupAction(action);
    } else {
      // Handle other button actions
    }
  };

  const handlePopupSubmit = async() => {
    // Handle the enteredNumber based on the popupAction (e.g., perform appropriate action)
    console.log(`Action: ${popupAction}, Number: ${enteredNumber}`);
    if(enteredNumber === '' || enteredNumber === 0) {
      console.error("amount must be greater than 0")
      //toast here
    }else{
      //handle provide collateral
      if(popupAction.toLowerCase() === "Provide Collateral".toLowerCase()) {
        const tokenAddress = '' //todo: update this. fetch userDetails can't be used since 
        //account is not issuer or is there a way to know issuer?
        if(tokenAddress) {
          const tokenContract = new Token(signer!, tokenAddress);
          // const tokenDecimals = await tokenContract.decimals().then((res: any) => {return res.response.result});
          const tokenDecimals = 6; //todo: change this when sdk includes decimals in token functions
          const payer = '' //todo: update payer
          const collateralName = '' //todo: update collateral name
          const collateralAddress = '' //todo: update collateral address
          await tokenContract.requestTransaction(parseUnits(enteredNumber.toString(), tokenDecimals).toString(), payer, collateralName, collateralAddress).then((res: any) => {
            if(res && res.status === 0 && res.response && res.response.hash) {
              console.log("Successful request transaction with hash: ", res.response.hash)
              //toast here
            }else{
              res && res.message ?
            console.error("Error from request transaction: ", res.message)
            //Todo: toast here
            : console.error("Error from request transaction: Transaction Failed")
            //Todo: toast here
            }
          })
        }else{
          console.error("Bond token Address does not exist")
          //Toast here
        }
      }

      //handle Liquidate collateral
      if(popupAction.toLowerCase() === "Liquidate Collateral".toLowerCase()) {
        const tokenAddress = '' //todo: update this. fetch userDetails can't be used since 
        //account is not issuer or is there a way to know issuer?
        if(tokenAddress) {
          const tokenContract = new Token(signer!, tokenAddress);
          // const tokenDecimals = await tokenContract.decimals().then((res: any) => {return res.response.result});
          const tokenDecimals = 6; //todo: change this when sdk includes decimals in token functions
          const receiver = '' //todo: update receiver to bond address
          await tokenContract.transferFrom(account!, receiver, parseUnits(enteredNumber.toString(), tokenDecimals).toString()).then((res: any) => {
            if(res && res.status === 0 && res.response && res.response.hash) {
              console.log("Successful transfer from transaction with hash: ", res.response.hash)
              //toast here
            }else{
              res && res.message ?
            console.error("Error from transferFrom: ", res.message)
            //Todo: toast here
            : console.error("Error from transferFrom: Transaction Failed")
            //Todo: toast here
            }
          })
        }else{
          console.error("Bond token Address does not exist")
          //Toast here
        }
      }
      // Reset states after submission
      setShowPopup(false);
      setPopupAction('');
      setEnteredNumber('');
    }
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
             
            
            
             
            
        <button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Provide Collateral')}>
          Provide Collateral
        </button>
        <button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Liquidate Collateral')}>
          Liquidate Collateral
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
