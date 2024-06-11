import React, { useEffect, useState } from 'react';
import TableData from './issuer_data';
import '../styles/components/_button.scss';
import Modal from './Modal';
import AssetIssuanceForm from './issue_form';
import { ComponentDefaultprops, subgraphConfig } from './utils/constants';
import { Token, Compound, contractAddress, ERC20} from '@verified-network/verified-sdk';
import { Contract } from 'ethers';
import {parseUnits} from '@ethersproject/units'
import COMETABI from '../abis/Comet';
import OPERATORABI from '../abis/Operator';
import { fetchRwas, fetchTokens, fetchUserDetails } from './utils/utils';
import { toast } from 'react-toastify';

interface TableRow {
  "Asset": string;
  "Issuer": string;
  "Collateral": string;
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
  const [issuerBondIndex, setIssuerBondIndex] = useState<null | string>(null);
  const [selectedCollateral, setSelectedCollateral] = useState<string>("");
  const [collateralName, setCollateralName] = useState<string>("");

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

  const handleButtonClick = (action: string) => {
    if (action === 'Issue new RWA') {
      // Handle Issue new RWA action
      setShowIssuanceForm(true);
    } else if(action.startsWith("Issuer Details")) {
      setShowIssuerDetails(true)
      setIssuerBondIndex(action.split("-")[1])
    }else{
      setShowPopup(true);
      setPopupAction(action);
    }
  };

  const postCollateral = async (assest: string, collateral: string, compoundAddress: string) => {
    const collateralContract = new ERC20(signer!, collateral);
    const collateralDecimals = await collateralContract.decimals().then((res: any) => {return Number(res?.response?.result)
    })
    let permissionHandled = false;
    const compoundExtAddress = subgraphConfig[chainId!]?.cUSDCExt;
    if(compoundExtAddress) {
      const compoundExtensionContract = new web3.eth.Contract(COMETABI, subgraphConfig[chainId!].cUSDCv3);
      const isPermitted = await compoundExtensionContract.methods.hasPermission(account, compoundAddress).call();
      if(!isPermitted) {
        await compoundExtensionContract.methods.allow(compoundAddress, true).send({from: account!}).then(() => {
          permissionHandled = true;
        }).catch((err: any) => {
           console.error("allow transaction failed with error: ", err)
           toast.error("Allow Operator Transaction failed")
           setIsLoading(false)
        })
      }else{
        permissionHandled = true;
      }
      if(permissionHandled) {
        return await collateralContract.approve(subgraphConfig[chainId!]?.cUSDCv3, parseUnits(enteredNumber.toString(), collateralDecimals).toString()).then(async(res: any) => {
          if(res?.status === 0) {
            toast.success("Approve Transaction Successful")
            const compoundContract = new Compound(signer!, compoundAddress);
            return await compoundContract.postCollateral(assest, collateral, parseUnits(enteredNumber.toString(), collateralDecimals).toString());
          }else{
            res && res.message ?
            console.error("Error from approve transaction: ", res?.message || res?.reason)
            //Todo: toast here
            : console.error("Error from approve: Transaction Failed")
            //Todo: toast here
            toast.error("Approve Transaction Failed")
          }
        })
      }
    }else{
      console.error("Compound extension address not found for network")
      toast.error("Error with connected network. Change network and try again.")
    }
  }

  const borrowBase = async (assest: string, baseToken: string, compoundAddress: string) => {
    if(enteredNumber === '') {
      return null;
    }
    const baseContract = new ERC20(signer!, baseToken) 
    const baseDecimals= await baseContract.decimals().then((res: any) => {
      return Number(res?.response?.result)
    })
    //Todo: fix sdk and change to sdk
    const compoundContract = new web3.eth.Contract(OPERATORABI, compoundAddress);
    return await compoundContract.methods.borrowBase(assest, baseToken, parseUnits(enteredNumber.toString(), baseDecimals).toString()).send({from: account!}).then((res: any) => {
      return {
        status : 0,
        response: {
          hash: ""
        }
      }
    }).catch((err: any) => {
      return {
        status : 1,
        response: null,
        message: err
      }
    });
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
        const compoundAddress = "0x593cF24a170aE5359E14507EC2776D66f8494D40"  //chainContractAddresses["Compound"];
        console.log("operatoe address: ", compoundAddress)
        if(!compoundAddress) {
          console.error(`Compound/operator contract for chain id: ${chainId} does not exist`)
          setIsLoading(false)
        }else{
          const bondIndex = popupAction.split("-")[1];
          const collateral = selectedCollateral;
          const assest = data[bondIndex].BondTokenAddress;
          await postCollateral(assest, collateral, compoundAddress).then(async(res: any) => {
            if(res && res.status === 0 && res.response && res.response.hash) {
              console.log("Successful postCollateral transaction with hash: ", res.response.hash)
              toast.success("Collateral Posted Succesfully")
              const base = subgraphConfig[chainId!].baseToken 
              await borrowBase(assest, base, compoundAddress).then((_res: any) => {
                if(_res && _res?.status === 0 ) {
                  console.log("Successful borrow base transaction with hash: ", _res?.response?.hash)
                  toast.success("Borrow Transaction Succesful")
                }else{
                  _res && _res.message ?
                  console.error("Error from borrow base: ", _res.message)
                  //Todo: toast here
                  : console.error("Error from borrow base: Transaction Failed")
                  //Todo: toast here
                  toast.error("Post Collateral Transaction Failed")
                  setIsLoading(false)
                 }
              })
            }else{
              res && res.message ?
            console.error("Error from post collateral: ", res.message)
            //Todo: toast here
            : console.error("Error from post collateral: Transaction Failed")
            //Todo: toast here
            toast.error("Borrow Transaction Failed")
            setIsLoading(false)
            }
          })      
        }
      }
      
      //handle redeem collateral
      if(popupAction.startsWith("Redeem Collateral")) {
        const bondIndex = popupAction.split("-")[1];
        const collateralAddress = selectedCollateral
        const bondTokenAddress = data[bondIndex].BondTokenAddress;
        const asset = data[bondIndex].Asset;
        if(collateralAddress && bondTokenAddress) {
          const collateralContract = new ERC20(signer!, collateralAddress);
          const bondTokenContract = new Token(signer!, bondTokenAddress);
          const collateraldecimals = await collateralContract.decimals().then((res: any) => {return Number(res?.response?.result)});
          const payer = account!;
          await collateralContract.approve(chainContractAddresses["BOND"][asset], parseUnits(enteredNumber.toString(), collateraldecimals).toString()).then(async(res: any) => {
            if(res?.status === 0) {
              console.log("Successful approve transaction with hash: ", res?.response?.hash)
              console.log("name: ", collateralName, "add: ", collateralAddress)
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
        const compoundAddress = "0x593cF24a170aE5359E14507EC2776D66f8494D40"  //chainContractAddresses["Compound"];
        if(!compoundAddress) {
          console.error(`Compound/operator contract for chain id: ${chainId} does not exist`)
        }else{
          const base = subgraphConfig[chainId!].baseToken
          const baseContract = new ERC20(signer!, base); 
          const baseDecimals= await baseContract.decimals().then((res: any) => {return Number(res?.response?.result)})
          const bondIndex = popupAction.split("-")[1];
          const assest = data[bondIndex].BondTokenAddress;
          let permissionHandled = false;
          const compoundExtAddress = subgraphConfig[chainId!]?.cUSDCExt;
          if(compoundExtAddress) {
            const compoundExtensionContract = new web3.eth.Contract(COMETABI, subgraphConfig[chainId!].cUSDCv3);
            const isPermitted = await compoundExtensionContract.methods.hasPermission(account, compoundAddress).call();
            if(!isPermitted) {
              await compoundExtensionContract.methods.allow(compoundAddress, true).send({from: account!}).then(() => {
                permissionHandled = true;
              }).catch((err: any) => {
                console.error("allow transaction failed with error: ", err)
                toast.error("Allow Operator Transaction failed")
                setIsLoading(false)
              })
            }else{
              permissionHandled = true;
            }
            if(permissionHandled) {
              return await baseContract.approve(subgraphConfig[chainId!]?.cUSDCv3, parseUnits(enteredNumber.toString(), baseDecimals).toString()).then(async(res: any) => {
                if(res?.status === 0) {
                  toast.success("Approve Transaction Successful")
                  //Todo: fix sdk and change to sdk
                  const compoundContract = new web3.eth.Contract(OPERATORABI, compoundAddress);
                  await compoundContract.methods.repayBase(assest, base, parseUnits(enteredNumber.toString(), baseDecimals).toString()).send({from: account!}).then((res: any) => {
                    console.log("Successful repayBase transaction with hash: ",)
                    toast.success("Loan Repaid Succesfully")
                    // if(res && res.status === 0 && res.response && res.response.hash) {
                    //   console.log("Successful repayBase transaction with hash: ", res.response.hash)
                    //   //toast here
                    // }else{
                    //   res && res.message ?
                    // console.error("Error from repay base: ", res.message)
                    // //Todo: toast here
                    // : console.error("Error from repay base: Transaction Failed")
                    // //Todo: toast here
                    // }
                  }).catch((err: any) => {
                    console.error("Error from repay base: ", err)
                    toast.error("Transaction failed")
                    setIsLoading(false)
                  })
                }else{
                  res && res.message ?
                  console.error("Error from approve transaction: ", res?.message || res?.reason)
                  //Todo: toast here
                  : console.error("Error from approve: Transaction Failed")
                  //Todo: toast here
                  toast.error("Approve Transaction Failed")
                  setIsLoading(false)
                }
              })
            }
          }else{
            console.error("Compound extension address not found for network")
            toast.error("Error with connected network. Change network and try again.")
            setIsLoading(false)
          }
        }
      }
  
      // Reset states after submission
      setShowPopup(false);
      setPopupAction('');
      setEnteredNumber('');
      setCollateralName("")
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
          {!popupAction.startsWith("Repay Loan") && (
            <>
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
            </>
          )}
          <h3>Enter a number:</h3>
          <input
            type="number"
            value={enteredNumber !== null ? enteredNumber : ''}
            onChange={(e: any) => setEnteredNumber(e.target.value)}
            placeholder={collateralName.length > 0? collateralName + " " + "Amount" : "Amount"}
          />
          <div className="buttons-container">
            <button className="button-submit button--large button--supply" onClick={handlePopupSubmit}>
              Submit
            </button>
            <button className="button-cancel button--large button--supply" onClick={() => {
              setShowPopup(false)
              setCollateralName("")
            }}>
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
        {showIssuanceForm && <AssetIssuanceForm web3={web3}  chainId={chainId}  account={account} signer={signer} setIsLoading={setIsLoading}/>}
        {showModal && <Modal onClose={closeModal} web3={web3}  chainId={chainId}  account={account} signer={signer} setIsLoading={setIsLoading} />}
      </div>

  );
}

export default Issuer;
