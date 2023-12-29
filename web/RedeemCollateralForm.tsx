import React, { useState } from 'react';
import { ethers } from 'ethers';
import VerifiedContractAddress from '@verified-network/verified-sdk/dist/contractAddress';
import { Token } from '@verified-network/verified-sdk';
import ERC20 from '../abis/ERC20';
import './form.css';

// Define interface for collateral addresses
interface CollateralAddressesInterface {
  [key: string]: {
    LINK: string;
    COMP: string;
    ETH: string;
    UNI: string;
    WBTC: string;
  };
}

// List of available collateral options
const CollateralOptions = ['LINK', 'COMP', 'ETH', 'UNI', 'WBTC'];

// Predefined collateral addresses based on network ID
const CollateralAddresses: CollateralAddressesInterface = {
  '5': {
    LINK: '0x326C977E6efc84E512bB9C30f76E30c160eD06FB',
    COMP: '0x20572e4c090f15667cf7378e16fad2ea0e2f3eff',
    ETH: '0xdD69DB25F6D620A7baD3023c5d32761D353D3De9',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    WBTC: '0xC04B0d3107736C32e19F1c62b2aF67BE61d63a05',
  }
};

// Component for providing collateral
const ProvideCollateralForm: React.FC = function () {
  // State variables for form data
  const [collateralToken, setCollateralToken] = useState<string>('');
  const [faceValue, setFaceValue] = useState<number | ''>('');
  const [verifiedContractAddress, setVerifiedContractAddress] = useState<string | null>(null);

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!collateralToken || !faceValue) {
      return;
    }

    try {
      // Connect to MetaMask
      if (window.ethereum) {
        console.log('MetaMask detected...');

        // Request accounts using ethereum.request
        await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

        // Initialize Web3 provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);

        // Get the current network
        const network = await provider.getNetwork();
        const networkId = network.chainId;

        // Use the VerifiedContractAddress function to fetch contract addresses dynamically
        const ContractAddresses = await VerifiedContractAddress;
        const networkContractAddresses = ContractAddresses[networkId];
        const tokenContractAddress = networkContractAddresses?.Token;
        const collateralTokenAddress = (CollateralAddresses[networkId] as any)?.[collateralToken];

        if (!tokenContractAddress) {
          console.error(`Bond contract address not found for network ID: ${networkId}`);
          return;
        }

        setVerifiedContractAddress(tokenContractAddress || null);

        if (verifiedContractAddress !== null) {
          const signer = provider.getSigner();

          // Instantiate Bond contract instance
          const tokenContract = new Token(signer, tokenContractAddress);
          const signerAddress = await signer.getAddress();

          // Instantiate ERC-20 token contract for the selected currency
          const collateralTokenContract = new ethers.Contract(collateralTokenAddress, ERC20, signer);
          const collateralTokenDecimals = await collateralTokenContract.decimals();
          const collateralTokenSymbol = await collateralTokenContract.symbol();

          // Request a transaction from the Bond contract
          const requestTransaction = await tokenContract.contract.requestTransaction(
            ethers.utils.parseUnits(faceValue.toString(), collateralTokenDecimals),
            signerAddress,
            ethers.utils.formatBytes32String(collateralTokenSymbol),
            collateralTokenAddress,
            { gasLimit: 300000 }
          );

          // Reset the form after successful submission
          setCollateralToken('');
          setFaceValue('');

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
      <h4>Redeem Collateral Form</h4>
      <form onSubmit={handleSubmit}>
        <div className='main2'>
          {/* Form input for face value */}
          <div className='form-field'>
            <label>Amount</label>
            <input
              type='number'
              value={faceValue}
              onChange={(e) => setFaceValue(e.target.valueAsNumber)}
              required
            />
          </div>

          {/* Form dropdown for selecting collateral token */}
          <div className='form-field'>
            <label>Collateral Token</label>
            <select
              value={collateralToken}
              onChange={(e) => setCollateralToken(e.target.value)}
              required
            >
              <option value='' disabled>
                Collateral Token
              </option>
              {CollateralOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Submit button */}
        <button className='button button--large button--supply' type='submit'>
          Submit
        </button>
      </form>
    </div>
  );
};

export default ProvideCollateralForm;
