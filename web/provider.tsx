import React, { useEffect, useState } from 'react';
import './ui.css'; 
import { Link, redirect } from 'react-router-dom';
import TableData from './provider_data';
import { ComponentDefaultprops, subgraphConfig } from './utils/constants';
import { Bond, ERC20, Token, contractAddress } from '@verified-network/verified-sdk';
import { parseUnits } from '@ethersproject/units';
import { fetchRwas, fetchTokens } from './utils/utils';
import {toast} from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export interface TableRow {
  "Asset": string;
  "Issuer": string,
  "Collateral": string;
  "APY": string;
  'Currency': string;
  // 'Face Value': string;
  'Issuing Docs': string;
  "Collateral Posted": string;
  "Status": string;
  "Action": string
}



function Providers({web3, account, chainId, signer, page, setPage, setIsLoading}: ComponentDefaultprops) {
  const [showPopup, setShowPopup] = useState(false);
  const [showIssuerDetails, setShowIssuerDetails] = useState(false);
  const [popupAction, setPopupAction] = useState('');
  const [issuerBondIndex, setIssuerBondIndex] = useState<null | string>(null);
  const [data, setData] = useState<any>([]);
  const [enteredNumber, setEnteredNumber] = useState<number | ''>('');
  const [selectedCollateral, setSelectedCollateral] = useState<string>("");
  const [collateralName, setCollateralName] = useState<string>("");

  useEffect(() => {
    setPage("/")
  }, [account])


  useEffect(() => {
    const getRWAMarkets = async() => {
      if(subgraphConfig && subgraphConfig[chainId!] && subgraphConfig[chainId!].subgraphUrl && web3 && signer) {
        const resData = await fetchRwas(subgraphConfig[chainId!].subgraphUrl, web3, signer);
        setData(resData);
      }
    }
    getRWAMarkets()
  }, [account, web3, chainId, subgraphConfig, signer])


  const headerNames: (keyof TableRow)[] = [
    "Asset",
    "Issuer",
    'Collateral',
    'APY',
    'Currency',
    // 'Face Value',
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
    return data.map((rowData: any, rowIndex: any) => {
      return (
        <tr  key={rowIndex}>
          {headerNames.map((headerName, idx) => {
            if(!headerName.startsWith("Action")) {
              if(headerName.startsWith("Asset") && chainId) {
                return <td key={headerName}><a 
                className='asset-url'
                target='_blank'
                href={`${subgraphConfig[chainId!].explorerUrl}address/${rowData["BondTokenAddress"]}`}
                >
                  {rowData[headerName]}
                </a></td>;
              }else if(headerName.startsWith("Issuing Docs")){
                return <td key={headerName}><a 
                className='asset-url'
                target='_blank'
                href= {rowData["DocUrl"]}
                >
                  {rowData[headerName]}
                </a></td>;
              }else{
                return <td key={headerName}>{rowData[headerName]}</td>;
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
                onClick={() => handleButtonClick(`Provide Collateral-${rowIndex}`)}   
                >
                  Provide Collateral
                </div>
                <div 
                className="dropdown-action"
                onClick={() => handleButtonClick(`Liquidate Collateral-${rowIndex}`)}   
                >
                  Liquidate Collateral
                </div>
                <div
                 className="dropdown-action"
                onClick={() => handleButtonClick(`Issuer Details-${rowIndex}`)}
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

  const handleLiquidateCollateral = async(bondTokenAddress: string) => {
    if(bondTokenAddress) {
      setIsLoading(true)
      const bondERC20Contract = new ERC20(signer!, bondTokenAddress);
      const bondTokenContract = new Token(signer!, bondTokenAddress);
      const investorBalance = await bondERC20Contract.balanceOf(account!).then((res: any) => {return Number(res.response.result)});
      if(investorBalance > 0) {
        const tokenDecimals = await bondERC20Contract.decimals().then((res: any) => {return Number(res.response.result)});
        console.log("balance: ", parseUnits(investorBalance.toString(), tokenDecimals).toString())
        await bondTokenContract.transferFrom(account!, bondTokenAddress, parseUnits(investorBalance.toString(), tokenDecimals).toString()).then((res: any) => {
          if(res && res.status === 0 && res.response && res.response.hash) {
            console.log("Successful transfer from transaction with hash: ", res.response.hash)
            toast.success("Bond Liquidated succesfully")
            //toast here
          }else{
            res && res.message ?
          console.error("Error from transferFrom: ", res.message)
          //Todo: toast here
          : console.error("Error from transferFrom: Transaction Failed")
          //Todo: toast here
          toast.error("Transaction failed")
          }
          setIsLoading(false)
        })
      }else{
        console.error("Bond Token balance is 0")
        toast.error("Insufficient Bond Balance")
        setIsLoading(false)
      }
      
    }else{
      console.error("Bond token Address does not exist")
      toast.error("Transaction failed")
    }
  }

  const handleButtonClick = async(action: string) => {
    if (action.startsWith('Provide Collateral')) {
      setShowPopup(true);
      setPopupAction(action);
    }else if(action.startsWith('Liquidate Collateral')) {
      const bondIndex = action.split("-")[1];
      const bondTokenAddress = data[bondIndex].BondTokenAddress
      console.log("bondToken: ", bondTokenAddress)
      await handleLiquidateCollateral(bondTokenAddress);
    } 
    else {
      setShowIssuerDetails(true)
      setIssuerBondIndex(action.split("-")[1])
    }
  };

  console.log("data: ", data)

  const handlePopupSubmit = async() => {
    // Handle the enteredNumber based on the popupAction (e.g., perform appropriate action)
    console.log(`Action: ${popupAction}, Number: ${enteredNumber}`);
    if(enteredNumber === '' || enteredNumber === 0 || selectedCollateral === "") {
      console.error("Form Not filled")
      enteredNumber === '' || enteredNumber === 0 ? toast.error("Amount must be greater than 0") : 
      toast.error("Select Collateral");
    }else{
      setIsLoading(true);
      //handle provide collateral
      let chainContractAddresses: any = contractAddress;
      chainContractAddresses = chainContractAddresses[chainId!]
      const bondIndex = popupAction.split("-")[1];
        const collateralAddress = selectedCollateral;
        const bondTokenAddress = data[bondIndex].BondTokenAddress;
        const asset = data[bondIndex].Asset;
      if(popupAction.startsWith("Provide Collateral")) {
        if(collateralAddress && bondTokenAddress) {
          const collateralContract = new ERC20(signer!, collateralAddress);
          const bondTokenContract = new Token(signer!, bondTokenAddress);
          // const tokenDecimals = await tokenContract.decimals().then((res: any) => {return res.response.result});
          const collateraldecimals = await collateralContract.decimals().then((res: any) => {return Number(res.response.result)}); //todo: change this when sdk includes decimals in token functions
          const payer = account!;
          await collateralContract.approve(chainContractAddresses["BOND"][asset], parseUnits(enteredNumber.toString(), collateraldecimals).toString())
          .then(async(res: any) => {
            if(res?.status === 0) {
              console.log("Successful approve transaction with hash: ", res?.response?.hash)
              toast.success("Approve transaction succesful");
              console.log("name: ", collateralName, collateralAddress)
              await bondTokenContract.requestTransaction(parseUnits(enteredNumber.toString(), collateraldecimals).toString(), payer, collateralName, collateralAddress).then((_res: any) => {
                if(_res?.status === 0) {
                  console.log("Successful request transaction with hash: ", _res?.response?.hash)
                  toast.success("Collateral Provided Succesfully");
                }else{
                  _res && _res.message ?
                console.error("Error from request transaction: ", _res.message)
                //Todo: toast here
                : console.error("Error from request transaction: Transaction Failed");
                toast.error("Transaction failed");
                }
  
              })
            }else{
                res && res.message ?
              console.error("Error from request transaction: ", res.message)
              : console.error("Error from request transaction: Transaction Failed");
              toast.error("Transaction failed");

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
      setIsLoading(false);
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
              {/* {data.length === 0 && (<div style={{paddingTop: "6px"}}>
              Zero(0) Verified RWA(Real World Assets) Found. Click Issue New RWA Button to Issue New RWA/Bonds
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

              <div className="buttons-cont">
        </div>
      
              
            </div>
          </div>
        </div>
        {showPopup && (
        <div className="popup">
          <h3>Select Collateral:</h3>
          <select
              value={collateralName}
              onChange={(e) => {
                const collateral = subgraphConfig[chainId!].acceptedCollaterals[e.target.value];
                setSelectedCollateral(collateral.address)
                setCollateralName(e.target.value)
              }}
              required
            >
              <option value='' disabled>
                Select Collateral
              </option>
              {Object.keys(subgraphConfig[chainId!].acceptedCollaterals).map((coltr: string) => (
                <option key={coltr} value={coltr}>
                  {coltr}
                </option>
              ))}
            </select>
          <h3>Enter a number:</h3>
          <input
            type="number"
            value={enteredNumber !== null ? enteredNumber : ''}
            onChange={(e: any) => setEnteredNumber(e.target.value)}
            placeholder={collateralName.length > 0? collateralName + " " + "Amount" : "Collateral Amount"}
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
              <div style={{paddingRight: "10px", flex: "1"}}><b>Issuer Address</b></div>
              <div style={{paddingLeft: "10px"}}>
              <a 
                className='asset-url'
                target='_blank'
                href= {issuerBondIndex && chainId ? `${subgraphConfig[chainId!].explorerUrl}address/${data[issuerBondIndex].IssuerAddress}` : ""}
                >
                  {issuerBondIndex ? 
                  data[issuerBondIndex].IssuerAddress.substring(0, 5) + 
                  "..." +
                  data[issuerBondIndex].IssuerAddress.substring(data[issuerBondIndex].IssuerAddress.length - 3, data[issuerBondIndex].IssuerAddress.length)
                  : ""}
                </a>
                </div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Issuer Name</b></div>
              <div style={{paddingLeft: "10px"}}>{issuerBondIndex ? data[issuerBondIndex].Issuer: ""}</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Issuer Country</b></div>
              <div style={{paddingLeft: "10px"}}>{issuerBondIndex ? data[issuerBondIndex].IssuerCountry: ""}</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Number of issues by Issuer</b></div>
              <div style={{paddingLeft: "10px"}}>{issuerBondIndex ? data[issuerBondIndex].IssuerTotalIssues: 0}</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Total borrowing for all issues</b></div>
              <div style={{paddingLeft: "10px"}}>{issuerBondIndex ? data[issuerBondIndex].IssuerTotalIssuesBorrowed: 0}</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Borrowing for this issue</b></div>
              <div style={{paddingLeft: "10px"}}>{issuerBondIndex ? data[issuerBondIndex].Borrowed: 0}</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: "1"}}><b>Total repayments for all issue</b></div>
              <div style={{paddingLeft: "10px"}}>{issuerBondIndex ? data[issuerBondIndex].IssuerTotalIssuesRepaid: 0}</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: 1}}><b>Repayment of this issue</b></div>
              <div style={{paddingLeft: "10px"}}>{issuerBondIndex ? data[issuerBondIndex].Repaid : 0}</div>
            </div>
            <div style={{display: "flex", paddingBottom: "10px"}}>
              <div style={{paddingRight: "10px", flex: 1}}><b>Number of issues defaulted</b></div>
              <div style={{paddingLeft: "10px", }}>0</div>
            </div>
            <div style={{paddingTop: "10px"}} className="buttons-container">
                  <button className="button-cancel button--large button--supply" onClick={() => {
                    setIssuerBondIndex(null)
                    setShowIssuerDetails(false)
                  }}>
                    Close
                  </button>
                </div>
          </div>
      )}
      </div>

  );
}

export default Providers;
