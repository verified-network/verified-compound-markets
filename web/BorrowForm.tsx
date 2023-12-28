import React, { useState } from 'react';
import { ethers } from 'ethers';
import VerifierdMarkets from '@verified-network/verified-sdk/dist/abi/loans/compound/VerifiedMarkets.json';
import { VerifiedWallet, Bond, Compound, Provider } from '@verified-network/verified-sdk';
import VerifiedContractAddress from '@verified-network/verified-sdk/dist/contractAddress'
import ERC20 from '../abis/ERC20';
import './issue_form.css';


const CurrencyOptions = ['USD', 'EUR', 'GBP', 'INR']; // Add more currency options as needed

const RepayLoanForm: React.FC = function () {
  const [assetAddress, setAssetAddress] = useState('');
  const [collateralAddress, setCollateralAddress] = useState('');
  const [faceValue, setFaceValue] = useState<number | ''>('');
  const [apyOffered, setApyOffered] = useState<number | ''>('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [verifiedContractAddress, setVerifiedContractAddress] = useState<string | null>(null);

  const [asset, setAsset] = useState<string>('');
  const [collateral, setCollateral] = useState<string>('');
  const [borrowAmount, setBorrowAmount] = useState<number>(0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Handle form submission here

    if (!assetAddress || !collateralAddress || !faceValue || !apyOffered || !selectedCurrency) {
      return;
    }

    try {
		await postCollateral();
		await borrowBase();
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }

  };

  // Calling PostCollateral function
  const postCollateral = async () => {
    try {
      // Connect to MetaMask
      if (!window.ethereum) {
        console.error('MetaMask not detected');
        return;
      }
      console.log('Before eth_requestAccounts');

      // Request accounts using ethereum.request
      await (window.ethereum as any).request({ method: 'eth_requestAccounts' });
      console.log('After eth_requestAccounts');

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      // Get the network information
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();

      // Fetch contract addresses dynamically
      const contractAddress = await VerifiedContractAddress[networkId];
      if (!contractAddress || !contractAddress.Compound) {
        console.error(`Contract addresses not found for network ID: ${networkId}`);
        return;
      }
      const signer = provider.getSigner();
      //Contract instance
	  const verifiedMarketsContract = new Compound(signer, contractAddress.Compound);
      console.log('Verified Markets Contract Address:', contractAddress);
      //Call the PostCollateral Function
      const postCollateral = await verifiedMarketsContract.postCollateral(asset, collateral, borrowAmount, { gasLimit: 300000 });
      console.log(`Collateral posted for asset ${asset} with collateral ${collateral} and amount ${borrowAmount}`);
    } catch (error) {
      console.error('Error posting collateral:', error);
    }
  }



  // Calling BorrowBase function
  const borrowBase = async () => {
    try {
      // Connect to MetaMask
      if (!window.ethereum) {
        console.error('MetaMask not detected');
        return;
      }
      console.log('Before eth_requestAccounts');

      // Request accounts using ethereum.request
      await (window.ethereum as any).request({ method: 'eth_requestAccounts' });
      console.log('After eth_requestAccounts');

      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Get the network information
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();

      // Fetch contract addresses dynamically
      const contractAddress = await VerifiedContractAddress[networkId];

      if (!contractAddress || !contractAddress.Compound) {
        console.error(`Contract addresses not found for network ID: ${networkId}`);
        return;
      }
      const signer = provider.getSigner();

      //Contract instance
	  const verifiedMarketsContract = new Compound(signer, contractAddress.Compound);
      await verifiedMarketsContract.borrowBase(asset, borrowAmount, { gasLimit: 300000 });

      console.log(`Borrowed ${borrowAmount} from Compound using asset ${asset}`);
    } catch (error) {
      console.error('Error borrowing from Compound:', error);
    }
  };

  return (
    <div className='main'>
      <h4>Borrow Form</h4>
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

          <button className='button button--large button--supply' type='submit'>Submit</button>
        </form>
      </div>
    </div>
  );
};

export default RepayLoanForm;