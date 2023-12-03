import React, { useState } from 'react';
import './issue_form.css';
import { ethers } from 'ethers';
import Bond from '@verified-network/verified-sdk/dist/abi/payments/Bond.json'
import VerifierdMarkets from '../out/VerifiedMarkets.sol/VerifiedMarkets.json';
import VerifiedContractAddress from '@verified-network/verified-sdk/dist/contractAddress'


const CurrencyOptions = ['USD', 'EUR', 'GBP']; // Add more currency options as needed

const AssetIssuanceForm: React.FC = function () {
  const [assetAddress, setAssetAddress] = useState('');
  const [collateralAddress, setCollateralAddress] = useState('');
  const [faceValue, setFaceValue] = useState<number | ''>('');
  const [apyOffered, setApyOffered] = useState<number | ''>('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [issuingDocument, setIssuingDocument] = useState<File | null>(null);
  const [verifiedContractAddress, setVerifiedContractAddress] = useState<string | null>(null);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Handle form submission here

    if (!assetAddress || !collateralAddress || !faceValue || !apyOffered || !selectedCurrency || !issuingDocument) {
      return;
    }

    try {
      // Connect to MetaMask
      if (window.ethereum) {
        console.log('MetaMask detected...');

        // Request accounts using ethereum.request
        await (window.ethereum as any).request({ method: 'eth_requestAccounts' });


        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        const networkId = network.chainId;



        // Use the function to fetch contract addresses dynamically
        const ContractAddresses = await VerifiedContractAddress;
        const networkContractAddresses = ContractAddresses[networkId];
        const bondContractAddress = networkContractAddresses?.Bond;

        if (!bondContractAddress) {
          console.error(`Bond contract address not found for network ID: ${networkId}`);
          return;
        }

        setVerifiedContractAddress(bondContractAddress || null);

        if (verifiedContractAddress !== null) {
          const signer = provider.getSigner();

          // Bond contract instance
          const bondContract = new ethers.Contract(bondContractAddress, (Bond as any).abi, signer);

          // Issue the bond by calling the requestIssue function
          const issueTransaction = await bondContract.requestIssue(
            ethers.utils.parseUnits(faceValue.toString(), 'ether'),
            signer.getAddress(),
            ethers.utils.formatBytes32String(selectedCurrency),
            collateralAddress,
            { gasLimit: 300000 }
          );

          const code = await provider.getCode(bondContractAddress);

          if (code === "0x") {
            console.error("No code found at the specified address. Double-check the contract address.");
          } else {
            console.log("Contract code found at the specified address.");
            // Proceed with interacting with the contract
          }
          console.log('Bond Issued. Transaction hash:', issueTransaction.hash);
          await issueTransaction.wait();

          // VerifiedMarkets contract instance
          const verifiedMarketsContract = new ethers.Contract(verifiedContractAddress, VerifierdMarkets.abi, signer);

          // Convert APY and face value to wei
          const _apy = ethers.utils.parseUnits((apyOffered / 100).toString(), 'ether');
          const _faceValue = ethers.utils.parseUnits((faceValue / 100).toString(), 'ether');

          console.log('Calling submitNewRWA function...');


          // Call the submitNewRWA function
          const transaction = await verifiedMarketsContract.submitNewRWA(
            assetAddress, collateralAddress, _apy, issuingDocument, _faceValue, { gasLimit: 300000 }
          );

          console.log('Transaction hash:', transaction.hash);

          // Wait for transaction confirmation
          await transaction.wait();

          // Reset the form after successful submission
          setAssetAddress('');
          setCollateralAddress('');
          setFaceValue('');
          setApyOffered('');
          setSelectedCurrency('');
          setIssuingDocument(null);

          console.log('Form submitted successfully');
        } else {
          throw new Error('MetaMask not detected');
        }
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }

  };

  return (
    <div className='main'>
      <h4>Asset Issuance Form</h4>
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
              onChange={(e) => setSelectedCurrency(e.target.value)}
              required
            >
              <option value='' disabled>
                Select Currency
              </option>
              {CurrencyOptions.map((currency) => (
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
          </div>

          <button className='button button--large button--supply' type='submit'>Submit</button>
        </form>
      </div>
    </div>
  );
};

export default AssetIssuanceForm;


