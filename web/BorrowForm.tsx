import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Compound } from '@verified-network/verified-sdk';
import VerifiedContractAddress from '@verified-network/verified-sdk/dist/contractAddress'
import ERC20 from '../abis/ERC20';
import './form.css';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';

const CurrencyOptions = ['USD', 'EUR', 'GBP', 'INR']; // Add more currency options as needed
const steps = ['Post Collateral', 'Borrow'];

const RepayLoanForm: React.FC = function () {
	const [assetAddress, setAssetAddress] = useState('');
	const [baseAddress, setBaseAddress] = useState('');
	const [collateralAddress, setCollateralAddress] = useState('');
	const [borrowAmount, setBorrowAmount] = useState<number>(0);
	const [activeStep, setActiveStep] = React.useState(0);

	const handleBack = () => {
		setActiveStep((prevActiveStep) => prevActiveStep - 1);
	};

	const handleMore = () => {
		setActiveStep(0);
	};

	const handleSubmit = async (event: React.FormEvent) => {
		try {
			if (!assetAddress || !collateralAddress) {
				return;
			}

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

			const collateralTokenContract = new ethers.Contract(collateralAddress, ERC20, signer);
			const collateralTokenDecimals = await collateralTokenContract.decimals();
			if (activeStep == 0) {
				await verifiedMarketsContract.postCollateral(assetAddress, collateralAddress, ethers.utils.parseUnits(borrowAmount.toString(), collateralTokenDecimals), { gasLimit: 300000 });
				console.log(`Collateral posted for asset ${assetAddress} with collateral ${collateralAddress} and amount ${borrowAmount}`);
			} else if (activeStep == 1) {
				if (!borrowAmount || !baseAddress) {
					return;
				}
				await verifiedMarketsContract.borrowBase(baseAddress, ethers.utils.parseUnits(borrowAmount.toString(), collateralTokenDecimals), { gasLimit: 300000 });
				console.log(`Borrowed ${borrowAmount} from Compound using base ${baseAddress}`);
			}
			setActiveStep((prevActiveStep) => prevActiveStep + 1);
		} catch (error) {
			console.error('Error submitting transaction:', error);
		}
	};

	return (
		<div className='main'>
			<h4>Borrow Form</h4>
			<Box sx={{ width: '100%' }}>
				<Stepper activeStep={activeStep}>
					{steps.map((label, index) => {
						const stepProps: { completed?: boolean } = {};
						const labelProps: {
							optional?: React.ReactNode;
						} = {};
						return (
							<Step key={label} {...stepProps}>
								<StepLabel className='step-label--white' {...labelProps}>{label}</StepLabel>
							</Step>
						);
					})}
				</Stepper>
				{activeStep === steps.length ? (
					<>
						<Typography sx={{ mt: 2, mb: 1 }}>
							All steps completed - you&apos;re finished
						</Typography>
						<Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
							<Box sx={{ flex: '1 1 auto' }} />
							<button className='button--large button--supply' onClick={handleMore}>More</button>
						</Box>
					</>
				) : (
					<>
						<Typography sx={{ mt: 2, mb: 1 }}>
							{activeStep === 0 &&
								<div className='main2'>
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
										<label>Amount</label>
										<input
											type='number'
											value={borrowAmount}
											onChange={(e) => setBorrowAmount(e.target.valueAsNumber)}
											required
										/>
									</div>
								</div>
							}
							{activeStep === 1 && (
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
											value={borrowAmount}
											onChange={(e) => setBorrowAmount(e.target.valueAsNumber)}
											required
										/>
									</div>
								</div>
							)}
						</Typography>
						<Box sx={{ display: 'flex', flexDirection: 'row' }}>
							<button
								disabled={activeStep === 0}
								className='button--back'
								onClick={handleBack}
							>
								Back
							</button>
							<Box sx={{ flex: '1 1 auto' }} />
							<button className='button--large button--supply' onClick={handleSubmit}>
								{activeStep === steps.length - 1 ? 'Finish' : 'Next'}
							</button>
						</Box>
					</>
				)}
			</Box>
		</div>
	);
};

export default RepayLoanForm;