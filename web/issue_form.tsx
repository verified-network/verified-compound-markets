// @ts-ignore
import React, { useState } from 'react';
import './issue_form.css';
import { CurrenciesToBondMapping, ComponentDefaultprops, pinataDedicatedGateway, pinataDefaultGateway, subgraphConfig } from './utils/constants';
import { Bond, Compound, contractAddress} from '@verified-network/verified-sdk';
import { Contract } from '@ethersproject/contracts';
import {parseUnits} from '@ethersproject/units'
import ERC20 from '../abis/ERC20';
import { fetchUserDetails, pinToIpfs } from './utils/utils';
import { toast } from 'react-toastify';
import { Loader } from './utils/loader';



const AssetIssuanceForm: React.FC<ComponentDefaultprops> = ({web3, chainId, account, signer,  setIsLoading}) => {
  const [assetAddress, setAssetAddress] = useState('');
  const [collateralAddress, setCollateralAddress] = useState('');
  const [faceValue, setFaceValue] = useState<number | ''>('');
  const [apyOffered, setApyOffered] = useState<number | ''>('');
  const [selectedCurrencyBond, setSelectedCurrencyBond] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [issuingDocument, setIssuingDocument] = useState<File | null>(null);
  const [formLoader, setFormLoader] = useState<boolean>(false);


  let chainContractAddresses: any = contractAddress;
  chainContractAddresses = chainContractAddresses[chainId!]


  const handleRequestIssue = async(collateralContract: any, collateralSymbol: string, collateralDecimals: number) => {
    if(collateralContract && collateralSymbol && collateralDecimals) {
      const bondContractAddresses = chainContractAddresses["BOND"];
      if (!bondContractAddresses) {
        console.error(`Bond contract for chain id: ${chainId} does not exist`)
        return;
      }
      return await collateralContract.approve(bondContractAddresses[selectedCurrencyBond], parseUnits(faceValue.toString(), collateralDecimals)).then(async() => {
        //Todo: check contract behaviour to handle toast
        const bondContract = new Bond(signer!, bondContractAddresses[selectedCurrencyBond]);
        return await bondContract.requestIssue(parseUnits(faceValue.toString(), collateralDecimals).toString(), account!, collateralSymbol, collateralAddress);
      }).catch((err: any) => {
        console.error("Approval transaction failed with error: ", err);
        //Toast here
        return;
      });
    }
  }

  const handleSubmitNewRWA = async(collateralDecimals: number, issueingDocUrl: string, bondTokenAddress: string) => {
    const compoundAddress = chainContractAddresses["Compound"];
    if(!compoundAddress) {
      console.error(`Compound/operator contract for chain id: ${chainId} does not exist`)
      return;
    }
    const operatorContract = new Compound(signer!, compoundAddress);
    const apyOfferedFmt = parseUnits(apyOffered.toString(), collateralDecimals).toString();
    const faceValueFmt = parseUnits(faceValue.toString(), collateralDecimals).toString(); 
    return await operatorContract.submitNewRWA(assetAddress!, bondTokenAddress, apyOfferedFmt, issueingDocUrl, faceValueFmt)
  }

  const handleSubmit = async(event: React.FormEvent) => {
    event.preventDefault();
    if(chainId && account && signer) {
      if(
        collateralAddress !== '' && assetAddress !== '' && selectedCurrencyBond !== '' 
        && faceValue !== '' && apyOffered !== '' && issuingDocument
      ) { 
        setFormLoader(true)   
        const collateralContract = new Contract(collateralAddress, ERC20, signer!);
        const collateralSymbol = await collateralContract.symbol().catch((err: any) =>  {
          //Todo: toast here
          console.error("Error  while getting provided collateral symbol: ", err)
          return null
        });
        const collateralDecimals = await collateralContract.decimals().catch((err: any) =>  {
          //Todo: toast here
          console.error("Error  while getting provided collateral decimals: ", err)
          return null
        });
        await handleRequestIssue(collateralContract, collateralSymbol, collateralDecimals).then(async(res: any) => {
         if(res && res.status === 0) {
          console.log("Successful RequestIssue transaction with hash: ", res.response?.hash)
          toast.success("Bond Issued Succesfully")
          //pin issue docs to ipfs(todo: should this be done first??)
          const bondContractAddresses = chainContractAddresses["BOND"];
          const bondContract = new Bond(signer!, bondContractAddresses[selectedCurrencyBond]);
          const bondsIssued: any = await bondContract.getBonds().then((res: any) => {
            return res?.response?.result
          })
          const issuedBond = bondsIssued[bondsIssued.length - 1];
          console.log("bonds: ", issuedBond )
          const issueingDocHash = await pinToIpfs(issuingDocument, collateralAddress, chainId!, account!);
          if(issuedBond && issueingDocHash) {
            const issueingDocUrl = `${pinataDedicatedGateway || pinataDefaultGateway}/ipfs/${issueingDocHash}`;
            console.log("ipfs url: ", issueingDocUrl)
            //call submitNewRWA
            await handleSubmitNewRWA(collateralDecimals, issueingDocUrl, issuedBond).then((_res: any) => {
              if(_res && _res.status === 0) {
                console.log("Successful SubmitNewRWA transaction with hash: ", _res.response?.hash)
                toast.success("Transaction succesful")
              }else{
                _res && _res.message ?
                console.error("Error from SubmitNewRWA: ", _res.message)
                : console.error("Error from SubmitNewRWA: Transaction Failed");
                toast.error("Transaction failed")
                //Todo: toast here
                
               }
            });
          }else{
            console.error("Error while getting last bond issued")
          }
         }else{
          res && res.message ?
          console.error("Error from request Issue: ", res.message)
          //Todo: toast here
          : console.error("Error from request Issue: Transaction Failed");
          toast.error("Transaction failed")

          //Todo: toast here
          
         }
        });
        setFormLoader(false)
      }else{
        toast.error("Fill all form to proceed")
      }
    }else{
      console.error("No Wallet found. Connect wallet and try again")
      //Todo: Toast here
    }
  };

  // console.log("secCur: ", selectedCurrency, "secB: ", selectedCurrencyBond)
  

  return (
    <div className='main'>
      <h4>Asset Issuance Form</h4>
      {formLoader && (<Loader/>)}
      <div className='main2'>
        <form onSubmit={handleSubmit}>
          <div className='form-field'>
            <label>Asset Address</label>
            <input
              type='text'
              value={assetAddress}
              onChange={(e) => setAssetAddress(e.target.value)}
              required
            />
          </div>

          <div className='form-field'>
            <label>Collateral Address</label>
            <input
              type='text'
              value={collateralAddress}
              onChange={(e) => setCollateralAddress(e.target.value)}
              required
            />
          </div>

          <div className='form-field'>
            <label>Face Value of Asset to Issue</label>
            <input
              type='number'
              value={faceValue}
              onChange={(e) => setFaceValue(e.target.valueAsNumber)}
              required
            />
          </div>

          <div className='form-field'>
            <label>APY Offered</label>
            <input
              type='number'
              value={apyOffered}
              onChange={(e) => setApyOffered(e.target.valueAsNumber)}
              required
            />
          </div>

          <div className='form-field'>
            <label>APY Offered for Currency</label>
            <select
              value={selectedCurrency}
              onChange={(e) => {
                setSelectedCurrencyBond(CurrenciesToBondMapping[e.target.value])
                setSelectedCurrency(e.target.value)
              }}
              required
            >
              <option value='' disabled>
                Select Currency
              </option>
              {Object.keys(CurrenciesToBondMapping).map((currency: string) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          <div className='form-field'>
            <label>Issuing Document</label>
            <input
              type='file'
              onChange={(e) => setIssuingDocument(e.target.files?.[0] || null)}
              required
            />
             <label style={{paddingLeft: "1rem"}}>{issuingDocument?.name}</label>
          </div>

          <button className ='button button--large button--supply'>Submit</button>
        </form>
      </div>
    </div>
  );
};

export default AssetIssuanceForm;
