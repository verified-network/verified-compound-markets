import React, { useState } from 'react';
import { ethers } from 'ethers';
import Bond from '@verified-network/verified-sdk/dist/abi/payments/Bond.json'
import VerifierdMarkets from '@verified-network/verified-sdk/dist/abi/loans/compound/VerifiedMarkets.json';
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
          const bondContract = new ethers.Contract(bondContractAddress, (Bond as any).abi, signer);
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
          
          console.log(ethers.utils.parseUnits(faceValue.toString(), collateralTokenDecimals),
          signerAddress,
          collateralTokenSymbol,
          collateralAddress)
          // Issue the bond by calling the requestIssue function
          const issueTransaction = await bondContract.requestIssue(
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
          console.log('Bond Issued. Transaction hash:', issueTransaction.hash);
          await issueTransaction.wait();

          // VerifiedMarkets contract instance
          const verifiedMarketsContract = new ethers.Contract(verifiedContractAddress, VerifierdMarkets.abi, signer);

          // Convert APY and face value to wei
          const _apy = ethers.utils.parseUnits((apyOffered / 100).toString(), collateralTokenDecimals);
          const _faceValue = ethers.utils.parseUnits((faceValue / 100).toString(), collateralTokenDecimals);

          console.log('Calling submitNewRWA function...');


          // Call the submitNewRWA function
          // const transaction = await verifiedMarketsContract.submitNewRWA(
          //   assetAddress, collateralAddress, _apy, _faceValue, { gasLimit: 300000 }
          // );

          // console.log('Transaction hash:', transaction.hash);

          // // Wait for transaction confirmation
          // await transaction.wait();

          // Reset the form after successful submission
          setAssetAddress('');
          setCollateralAddress('');
          setFaceValue('');
          setApyOffered('');
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

      if (!contractAddress || !contractAddress.Client) {
        console.error(`Contract addresses not found for network ID: ${networkId}`);
        return;
      }

      const signer = provider.getSigner();

      //Contract instance
      const verifiedMarketsContract = new ethers.Contract(contractAddress.Client, VerifierdMarkets.abi, signer);
      console.log('Verified Markets Contract Address:', contractAddress);


      //Call the PostCollateral Function
      const postCollateral = await verifiedMarketsContract.postCollateral(asset, collateral, borrowAmount, { gasLimit: 300000 });
      await postCollateral.wait();

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
      const verifiedMarketsContract = new ethers.Contract(contractAddress.Compound, VerifierdMarkets.abi, signer);


      // Call the BorrowBase Function
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