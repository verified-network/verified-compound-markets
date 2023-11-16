import React, { useState } from 'react';
import './issue_form.css';
import { ethers } from 'ethers';
import VerifierdMarkets from '../out/VerifiedMarkets.sol/VerifiedMarkets.json';

const verifiedMarketsAddress = '0x90Cc254C549fEfD8b7a0C2514d93b487d9d234f3';

const CurrencyOptions = ['USD', 'EUR', 'GBP']; // Add more currency options as needed

const AssetIssuanceForm: React.FC = () => {
  const [assetAddress, setAssetAddress] = useState('');
  const [collateralAddress, setCollateralAddress] = useState('');
  const [faceValue, setFaceValue] = useState<number | ''>('');
  const [apyOffered, setApyOffered] = useState<number | ''>('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [issuingDocument, setIssuingDocument] = useState<File | null>(null);

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

        // Provider and signer from MetaMask
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // Create a contract instance
        const verifiedMarketsContract = new ethers.Contract(verifiedMarketsAddress, VerifierdMarkets.abi, signer);

        // Convert APY and face value to wei
        const _apy = ethers.utils.parseUnits((apyOffered / 100).toString(), 'ether');
        const _faceValue = ethers.utils.parseUnits((faceValue / 100).toString(), 'ether');

        console.log('Calling submitNewRWA function...');

        // Call the submitNewRWA function
        const transaction = await verifiedMarketsContract.submitNewRWA(assetAddress, collateralAddress, _apy, issuingDocument, { gasLimit: 300000 });

        // '/doc/Verified_Compound_Markets_v1.pdf', // Replace with actual issuingDocs_faceValue,

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
    } catch (error) {
      console.error('Error submitting form:', error);
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
