import React, { useState } from 'react';
import { ethers } from 'ethers';
import VerifiedContractAddress from '@verified-network/verified-sdk/dist/contractAddress'
import { Compound } from '@verified-network/verified-sdk';
import ERC20 from '../abis/ERC20';
import './form.css';

const CurrencyOptions = ['USD', 'EUR', 'GBP', 'INR']; // Add more currency options as needed

const RepayLoanForm: React.FC = function () {
	const [baseAddress, setBaseAddress] = useState('');
	const [faceValue, setFaceValue] = useState<number | ''>('');

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		// Handle form submission here
		if (!baseAddress || !faceValue) {
			return;
		}
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

			const tokenContract = new ethers.Contract(baseAddress, ERC20, signer);
			const tokenDecimals = await tokenContract.decimals();

			//Contract instance
			const verifiedMarketsContract = new Compound(signer, contractAddress.Compound);

			//Call the repayBase function
			await verifiedMarketsContract.repayBase(baseAddress, ethers.utils.parseUnits(faceValue.toString(), tokenDecimals), { gasLimit: 300000 });

			console.log(`Repay loan for asset ${baseAddress} with amount ${faceValue}`);

		} catch (error) {
			console.error('Error repaying loan:', error);
		}
	};

	return (
		<div className='main'>
			<h4>Repay Loan Form</h4>
			<form onSubmit={handleSubmit}>
				<div className='main2'>
					<div className='form-field'>
						<label>Base Address</label>
						<input
							type='text'
							value={baseAddress}
							onChange={(e) => setBaseAddress(e.target.value)}
							required
						/>
					</div>

					<div className='form-field'>
						<label>Amount</label>
						<input
							type='number'
							value={faceValue}
							onChange={(e) => setFaceValue(e.target.valueAsNumber)}
							required
						/>
					</div>

				</div>
				<button className='button button--large button--supply' type='submit'>Submit</button>
			</form>
		</div>
	);
};

export default RepayLoanForm;