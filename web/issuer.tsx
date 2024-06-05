import React, { useEffect, useState } from 'react';
import TableData from './issuer_data';
import '../styles/components/_button.scss';
import Modal from './Modal';
import AssetIssuanceForm from './issue_form';
import { ComponentDefaultprops, subgraphConfig } from './utils/constants';
import { Token, Compound, contractAddress, ERC20} from '@verified-network/verified-sdk';
import { Contract } from 'ethers';
import {parseUnits} from '@ethersproject/units'
import ERC20Abi from '../abis/ERC20';
import { fetchTokens, fetchUserDetails } from './utils/utils';

interface TableRow {
  "Asset": string;
  "Issuer": string;
  "Collateral": string;
  "Issued Value": string;
  "Sold Value": string;
  "Collateral Posted": string;
  "Borrowed": string;
  // "APY": string;
  "Status": string;
  "Action": string;
}

function Issuer({web3, chainId, account, signer, page, setPage, setIsLoading}: ComponentDefaultprops) {
  const [showPopup, setShowPopup] = useState(false);
  const [showIssuerDetails, setShowIssuerDetails] = useState(false);
  const [popupAction, setPopupAction] = useState('');
  const [enteredNumber, setEnteredNumber] = useState<number | ''>('');
  const [data, setData] = useState<any>([]);
  const [issuerBondIndex, setIsuuerBondIndex] = useState<null | string>(null);

  let chainContractAddresses: any = contractAddress;
  chainContractAddresses = chainContractAddresses[chainId!]

  useEffect(() => {
    setPage("/issue")
  }, [account])

  useEffect(() => {
    const getRWAMarkets = async() => {
      if(subgraphConfig && subgraphConfig[chainId!]?.subgraphUrl && web3 && signer) {
        const resData = await fetchTokens(subgraphConfig[chainId!].subgraphUrl, web3, signer);
        setData(resData);
      }
    }
    getRWAMarkets()
  }, [account, web3, chainId, subgraphConfig, signer])

  const headerNames: (keyof TableRow)[] = [
    'Asset',
    'Issuer',
    'Collateral',
    'Issued Value',
    'Sold Value',
    'Collateral Posted',
    'Borrowed',
    // 'APY',
    'Status',
    "Action"
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
    return data.map((rowData: any, rowIndex: any) => {
      return (
        <tr  key={rowIndex}>
          {headerNames.map((headerName, idx) => {
            if(!headerName.startsWith("Action")) {
              if(headerName.startsWith("Asset") && chainId) {
                return <td key={`${headerName}-${rowIndex}`}><a 
                className='asset-url'
                target='_blank'
                href={`${subgraphConfig[chainId!].explorerUrl}address/${rowData["BondTokenAddress"]}`}
                >
                  {rowData[headerName]}
                </a></td>;
              }else{
                return <td key={`${headerName}-${rowIndex}`}>{rowData[headerName]}</td>;
              }
            }else if(account){
              return <td key={rowIndex}>
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
                onClick={() => handleButtonClick(`Borrow-${rowIndex}`)}   
                >
                  Borrow
                </div>
                <div 
                className="dropdown-action"
                onClick={() => handleButtonClick(`Redeem Collateral-${rowIndex}`)}   
                >
                  Redeem Collateral
                </div>
                <div
                 className="dropdown-action"
                onClick={() => handleButtonClick(`Repay Loan-${rowIndex}`)}
                >
                  Repay Loan
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
    if (action === 'Issue new RWA') {
      // Handle Issue new RWA action
      setShowIssuanceForm(true);
    } else if(action === "Issuer Details") {
      setShowIssuerDetails(true)
      setIsuuerBondIndex(action.split("-")[1])
    }else{
      setShowPopup(true);
      setPopupAction(action);
    }
  };

  const postCollateral = async (assest: string, collateral: string, compoundAddress: string) => {
    const collateralContract = new Contract(collateral, ERC20Abi, signer!); //todo: verify if collateral or assest is to be used
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
    const baseContract = new Contract(base, ERC20Abi, signer!); 
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
      setIsLoading(true)
      //handle borrow
      if(popupAction.startsWith("Borrow")) {
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
      if(popupAction.startsWith("Redeem Collateral")) {
        const bondIndex = popupAction.split("-")[1];
        const collateralAddress = data[bondIndex].CollateralAddress;
        const bondTokenAddress = data[bondIndex].BondTokenAddress;
        const asset = data[bondIndex].Asset;
        if(collateralAddress && bondTokenAddress) {
          const collateralContract = new ERC20(signer!, collateralAddress);
          const bondTokenContract = new Token(signer!, bondTokenAddress);
          // const tokenDecimals = await tokenContract.decimals().then((res: any) => {return res.response.result});
          const collateraldecimals = await collateralContract.decimals().then((res: any) => {return Number(res.response.result)}); //todo: change this when sdk includes decimals in token functions
          const payer = account!;
          const collateralName =  data[bondIndex].Collateral;
          await collateralContract.approve(chainContractAddresses["BOND"][asset], parseUnits(enteredNumber.toString(), collateraldecimals).toString()).then(async(res: any) => {
            if(res?.status === 0) {
              console.log("Successful approve transaction with hash: ", res?.response?.hash)
              await bondTokenContract.requestTransaction(parseUnits(enteredNumber.toString(), collateraldecimals).toString(), payer, collateralName, collateralAddress).then((_res: any) => {
                if(_res?.status === 0) {
                  console.log("Successful request transaction with hash: ", _res?.response?.hash)
                  //toast here
                }else{
                  _res && _res.message ?
                console.error("Error from request transaction: ", _res.message)
                //Todo: toast here
                : console.error("Error from request transaction: Transaction Failed")
                //Todo: toast here
                }
  
              })
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
        }
      }
      
      //handle repay loan
      if(popupAction.startsWith("Repay Loan")) {
        const compoundAddress = chainContractAddresses["Compound"];
        if(!compoundAddress) {
          console.error(`Compound/operator contract for chain id: ${chainId} does not exist`)
        }else{
          const compoundContract = new Compound(signer!, compoundAddress);
          const base = '' //todo: update base
          const baseContract = new Contract(base, ERC20Abi, signer!); 
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
      setIsLoading(false)
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
        {/* {data.length === 0 && (<div style={{paddingTop: "6px"}}>
              You Have Zero(0) Verified RWA(Real World Assets). Click Issue New RWA Button to Issue New RWA/Bonds
            </div>)} */}
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
            onChange={(e: any) => setEnteredNumber(e.target.value)}
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
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: 1}}><b>Borrowing capacity left</b></div>
              <div style={{paddingLeft: "10px", }}>50000</div>
            </div>
            <div style={{paddingTop: "10px"}} className="buttons-container">
                  <button className="button-cancel button--large button--supply" onClick={() => setShowIssuerDetails(false)}>
                    Close
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
