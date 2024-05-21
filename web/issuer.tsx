import React, { useState } from 'react';
import TableData from './issuer_data';
import '../styles/main.scss';
import '../styles/components/_button.scss';
import Modal from './Modal';
import { Link } from 'react-router-dom';
import AssetIssuanceForm from './issue_form';
import { ComponentDefaultprops, subgraphConfig } from './utils/constants';
import { Token, Compound, contractAddress} from '@verified-network/verified-sdk';
import { Contract } from 'ethers';
import {parseUnits} from '@ethersproject/units'
import ERC20 from '../abis/ERC20';
import { fetchUserDetails } from './utils/utils';

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

function Issuer({web3, chainId, account, signer}: ComponentDefaultprops) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupAction, setPopupAction] = useState('');
  const [enteredNumber, setEnteredNumber] = useState<number | ''>('');
  const data: TableRow[] = TableData; //todo: update to subgraph rwa after RWA has been issued
  let chainContractAddresses: any = contractAddress;
  chainContractAddresses = chainContractAddresses[chainId!]

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

  const postCollateral = async (assest: string, collateral: string, compoundAddress: string) => {
    const collateralContract = new Contract(collateral, ERC20, signer!); //todo: verify if collateral or assest is to be used
    const collateralDecimals = await collateralContract.decimals().catch((err: any) =>  {
      //Todo: toast here
      console.error("Error  while getting provided collateral decimals: ", err)
      return 0
    });
    const compoundContract = new Compound(signer!, compoundAddress);
    return await compoundContract.postCollateral(assest, collateral, parseUnits(enteredNumber.toString(), collateralDecimals).toString());
  }

  const borrowBase = async (base: string, compoundAddress: string) => {
    if(enteredNumber === '') {
      return null;
    }
    const baseContract = new Contract(base, ERC20, signer!); 
    const baseDecimals= await baseContract.decimals().catch((err: any) =>  {
      //Todo: toast here
      console.error("Error  while getting provided base decimals: ", err)
      return 0
    });
    const compoundContract = new Compound(signer!, compoundAddress);
    return await compoundContract.borrowBase(base, parseUnits(enteredNumber.toString(), baseDecimals).toString());
  }
 

  const handlePopupSubmit = async() => {
    // Handle the enteredNumber based on the popupAction (e.g., perform appropriate action)
    console.log(`Action: ${popupAction}, Number: ${enteredNumber}`);
    if(enteredNumber === '' || enteredNumber === 0) {
      console.error("amount entered must be greater than 0")
      //toast here
    }else{
      //handle borrow
      if(popupAction.toLowerCase() === "borrow") {
        const compoundAddress = chainContractAddresses["Compound"];
        if(!compoundAddress) {
          console.error(`Compound/operator contract for chain id: ${chainId} does not exist`)
        }else{
          const assest = '' //todo: update assest
          const collateral = '' //todo: update collateral
          await postCollateral(assest, collateral, compoundAddress).then(async(res: any) => {
            if(res && res.status === 0 && res.response && res.response.hash) {
              console.log("Successful postCollateral transaction with hash: ", res.response.hash)
              //toast here
              const base = '' //Todo update base
              await borrowBase(base, compoundAddress).then((_res: any) => {
                if(_res && _res.status === 0 && _res.response && _res.response.hash) {
                  console.log("Successful borrow base transaction with hash: ", _res.response.hash)
                  //toast here
                }else{
                  _res && _res.message ?
                  console.error("Error from borrow base: ", _res.message)
                  //Todo: toast here
                  : console.error("Error from borrow base: Transaction Failed")
                  //Todo: toast here
                  
                 }
              })
            }else{
              res && res.message ?
            console.error("Error from post collateral: ", res.message)
            //Todo: toast here
            : console.error("Error from post collateral: Transaction Failed")
            //Todo: toast here
            }
          })
        }
      }
      
      //handle redeem collateral
      if(popupAction.toLowerCase() === "redeem collateral") {
        const userDetails = await fetchUserDetails(subgraphConfig[chainId!].subgraphUrl, account!);
        if(userDetails) {
          const tokenAddress = userDetails.bondIssues.token.id; //todo: verify this
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
            console.error("Bond token address does not exist")
            //toast here
          }
        }
      }
      
      //handle repay loan
      if(popupAction.toLowerCase() === "repay loan") {
        const compoundAddress = chainContractAddresses["Compound"];
        if(!compoundAddress) {
          console.error(`Compound/operator contract for chain id: ${chainId} does not exist`)
        }else{
          const compoundContract = new Compound(signer!, compoundAddress);
          const base = '' //todo: update base
          const baseContract = new Contract(base, ERC20, signer!); 
          const baseDecimals= await baseContract.decimals().catch((err: any) =>  {
            //Todo: toast here
            console.error("Error  while getting provided base decimals: ", err)
            return 0
          });
          await compoundContract.repayBase(base, parseUnits(enteredNumber.toString(), baseDecimals).toString()).then((res: any) => {
            if(res && res.status === 0 && res.response && res.response.hash) {
              console.log("Successful repayBase transaction with hash: ", res.response.hash)
              //toast here
            }else{
              res && res.message ?
            console.error("Error from repay base: ", res.message)
            //Todo: toast here
            : console.error("Error from repay base: Transaction Failed")
            //Todo: toast here
            }
          })
        }
      }
  
      // Reset states after submission
      setShowPopup(false);
      setPopupAction('');
      setEnteredNumber('');
    }
    
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
        {showIssuanceForm && <AssetIssuanceForm web3={web3}  chainId={chainId}  account={account} signer={signer}/>}
        {showModal && <Modal onClose={closeModal} web3={web3}  chainId={chainId}  account={account} signer={signer} />}
      </div>

  );
}

export default Issuer;
