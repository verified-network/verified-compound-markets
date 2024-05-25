import React, { useState } from 'react';
import './ui.css'; 
import { Link, redirect } from 'react-router-dom';
import TableData from './provider_data';
import { ComponentDefaultprops } from './utils/constants';
import { Token, contractAddress } from '@verified-network/verified-sdk';
import { parseUnits } from '@ethersproject/units';

interface TableRow {
  "Asset": string;
  "Issuer": string,
  "Collateral": string;
  "APY": string;
  'Currency': string;
  'Face Value': string;
  'Issuing Docs': string;
  "Collateral Posted": string;
  "Status": string;
  "Action": string
}



function Providers({web3, account, chainId, signer, page, setPage}: ComponentDefaultprops) {
  setPage("/")
  const [showPopup, setShowPopup] = useState(false);
  const [showIssuerDetails, setShowIssuerDetails] = useState(false);
  const [popupAction, setPopupAction] = useState('');
  const [enteredNumber, setEnteredNumber] = useState<number | ''>('');
  // console.log("accts: ",  account)
 

  const data: TableRow[] = TableData; //todo: update to subgraph rwa after RWA has been issued

  const headerNames: (keyof TableRow)[] = [
    "Asset",
    "Issuer",
    'Collateral',
    'APY',
    'Currency',
    'Face Value',
    'Issuing Docs',
    'Collateral Posted',
    'Status',
    'Action'
  ];


  const ThData = () => {
    return headerNames.map((headerName) => {
      if(account) {
        return <th key={headerName}>{headerName}</th>;
      }else if(!headerName.startsWith("Action")){
        return <th key={headerName}>{headerName}</th>;
      }
    });
  };

  const tdData = () => {
    return data.map((rowData, rowIndex) => {
      return (
        <tr  key={rowIndex}>
          {headerNames.map((headerName, idx) => {
            if(!headerName.startsWith("Action")) {
              return <td key={headerName}>{rowData[headerName]}</td>;
            }else if(account){
              return <td>
                 <button
                  id="dropdown-button"
                  onClick={() => {
                    document.getElementById(`dropdown-content-${rowIndex}`)?.classList.toggle("show-dropdown")
                  }}
                className='sidebar-button button--large button--supply'>
                  Actions
                </button>
                <div id={`dropdown-content-${rowIndex}`} className="dropdown-content">
                <div
                 className="dropdown-action"
                onClick={() => handleButtonClick("Provide Collateral")}   
                >
                  Provide Collateral
                </div>
                <div 
                className="dropdown-action"
                onClick={() => handleButtonClick("Liquidate Collateral")}   
                >
                  Liquidate Collateral
                </div>
                <div
                 className="dropdown-action"
                onClick={() => handleButtonClick("Issuer Details")}
                >
                  Issuer Details
                </div>
                </div>
              </td>
            }
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
      setShowIssuerDetails(true)
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
              {data.length === 0 && (<div style={{paddingTop: "6px"}}>
              Zero(0) Verified RWA(Real World Assets) Found. Click Issue New RWA Button to Issue New RWA/Bonds
            </div>)}
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
      {showIssuerDetails && (
          <div className="popup">
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Issuer Name</b></div>
              <div style={{paddingLeft: "10px"}}>Moses Adeolu</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Issuer Country</b></div>
              <div style={{paddingLeft: "10px"}}>Nigeria</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Number of issues by Issuer</b></div>
              <div style={{paddingLeft: "10px"}}>100</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Total borrowing for all issues</b></div>
              <div style={{paddingLeft: "10px"}}>20</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Borrowing for this issue</b></div>
              <div style={{paddingLeft: "10px"}}>5</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Total repayments for all issue</b></div>
              <div style={{paddingLeft: "10px"}}>30</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: 1}}><b>Repayment of this issue</b></div>
              <div style={{paddingLeft: "10px"}}>10</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: 1}}><b>Number of issues defaulted</b></div>
              <div style={{paddingLeft: "10px", }}>90000000000</div>
            </div>
            <div style={{paddingTop: "10px"}} className="buttons-container">
                  <button className="button-cancel button--large button--supply" onClick={() => setShowIssuerDetails(false)}>
                    Close
                  </button>
                </div>
          </div>
      )}
      </div>

  );
}

export default Providers;
