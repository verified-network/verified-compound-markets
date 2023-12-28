import React, { useState } from 'react';
import { ethers } from 'ethers';
import VerifiedContractAddress from '@verified-network/verified-sdk/dist/contractAddress'
import { Bond } from '@verified-network/verified-sdk';
import ERC20 from '../abis/ERC20';
import './issue_form.css';


const CurrencyOptions = ['USD', 'EUR', 'GBP', 'INR']; // Add more currency options as needed

const ProvideCollateralForm: React.FC = function () {
  const [collateralAddress, setCollateralAddress] = useState('');
  const [faceValue, setFaceValue] = useState<number | ''>('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [verifiedContractAddress, setVerifiedContractAddress] = useState<string | null>(null);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Handle form submission here

    if (!collateralAddress || !faceValue || !selectedCurrency) {
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
        const selectedCurrencyContractKey = selectedCurrency === 'USD' ? 'VBUSD' :
          selectedCurrency === 'EUR' ? 'VBEUR' :
          selectedCurrency === 'INR' ? 'VBINR' : 'VCCHF';

        const bondContractAddress = networkContractAddresses?.BOND?.[selectedCurrencyContractKey];

        if (!bondContractAddress) {
          console.error(`Bond contract address not found for network ID: ${networkId}`);
          return;
        }

        setVerifiedContractAddress(bondContractAddress || null);

        if (verifiedContractAddress !== null) {
          const signer = provider.getSigner();

          // Bond contract instance
		  const bondContract = new Bond(signer, bondContractAddress);
          const signerAddress = await signer.getAddress();

          // ERC-20 token contract instance for the selected currency
          const collateralTokenContract = new ethers.Contract(collateralAddress, ERC20, signer);
          const collateralTokenDecimals = await collateralTokenContract.decimals();
          const collateralTokenSymbol = await collateralTokenContract.symbol();
          // Approve the Bond contract to spend tokens on behalf of the owner
          const approvalTransaction = await collateralTokenContract.approve(bondContractAddress, ethers.constants.MaxUint256);
          
          console.log('Approval transaction hash:', approvalTransaction.hash);
          await approvalTransaction.wait();
          console.log('Tokens approved successfully.');
          
          const requestTransaction = await bondContract.requestTransaction(
            ethers.utils.parseUnits(faceValue.toString(), collateralTokenDecimals),
            signerAddress,
            collateralTokenSymbol,
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

          await requestTransaction.wait();

          // Reset the form after successful submission
          setCollateralAddress('');
          setFaceValue('');
          setSelectedCurrency('');

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
      <h4>Provide Collateral Form</h4>
      <div className='main2'>
        <form onSubmit={handleSubmit}>
          <div className='form-field'>
            <label>Amount</label>
            <input
              type='number'
              value={faceValue}
              onChange={(e) => setFaceValue(e.target.valueAsNumber)}
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

export default ProvideCollateralForm;