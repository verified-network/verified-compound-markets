import React, { useState } from 'react';
import './issue_form.css';
import { ethers } from 'ethers';
import VerifierdMarkets from '@verified-network/verified-sdk/dist/abi/loans/compound/VerifiedMarkets.json';
import VerifiedContractAddress from '@verified-network/verified-sdk/dist/contractAddress'
import { VerifiedWallet, Bond, Compound, Provider } from '@verified-network/verified-sdk';
import axios from 'axios';
import ERC20 from '../abis/ERC20';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';

const CurrencyOptions = ['USD', 'EUR', 'GBP', 'INR']; // Add more currency options as needed
const pinataApiKey = import.meta.env.VITE_APP_PINANA_API_KEY;
const pinataSecretKey = import.meta.env.VITE_APP_PINANA_API_SECRET;
const steps = ['Issue New RWA', 'Submit New RWA'];

const AssetIssuanceForm: React.FC = function () {
	const [assetAddress, setAssetAddress] = useState('');
	const [collateralAddress, setCollateralAddress] = useState('');
	const [faceValue, setFaceValue] = useState<number | ''>('');
	const [apyOffered, setApyOffered] = useState<number | ''>('');
	const [selectedCurrency, setSelectedCurrency] = useState('');
	const [issuingDocumentIPFSURL, setIssuingDocumentIPFSURL] = useState(``)
	const [issuingDocument, setIssuingDocument] = useState<File | null>(null);
	const [activeStep, setActiveStep] = React.useState(0);
	const [RWAList, setRWAList] = React.useState([]);

	const handleBack = () => {
		setActiveStep((prevActiveStep) => prevActiveStep - 1);
	};

	const handleMore = () => {
		setActiveStep(0);
	};

	const handleChangeFile = async (e: any) => {
		const file = e.target.files[0];
		setIssuingDocument(file);
	}

	const uploadingFileToIPFS = async (data: File) => {
		const formData = new FormData()
		formData.append('file', data)
		try {
			const resFile = await axios({
				method: "post",
				url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
				data: formData,
				headers: {
					'pinata_api_key': `${pinataApiKey}`,
					'pinata_secret_api_key': `${pinataSecretKey}`,
					"Content-Type": "multipart/form-data"
				},
			});
			setIssuingDocumentIPFSURL(`https://ipfs.io/ipfs/${resFile.data.IpfsHash}`);
		} catch (error) {
			console.log(error)
		}
	}

	const handleSubmit = async () => {
		// Handle form submission here
		if (!assetAddress || !collateralAddress || !faceValue || !apyOffered || !selectedCurrency || !issuingDocument) {
			return;
		}
		await uploadingFileToIPFS(issuingDocument);

		try {
			// Connect to MetaMask
			if (window.ethereum) {
				console.log('MetaMask detected...');

				// Request accounts using ethereum.request
				await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

				const provider = new ethers.providers.Web3Provider(window.ethereum);
				const network = await provider.getNetwork();
				const networkId = network.chainId;

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

				const verifiedContractAddress = networkContractAddresses?.Compound;
				if (verifiedContractAddress) {
					const signer = provider.getSigner();
					const bondContract = new Bond(signer, bondContractAddress);

					const signerAddress = await signer.getAddress();

					const collateralTokenContract = new ethers.Contract(collateralAddress, ERC20, signer);
					const collateralTokenDecimals = await collateralTokenContract.decimals();
					const collateralTokenSymbol = await collateralTokenContract.symbol();

					if(activeStep === 0) {
						const approvalTransaction = await collateralTokenContract.approve(bondContractAddress, ethers.utils.parseUnits(faceValue.toString(), collateralTokenDecimals));
						await approvalTransaction.wait();
						console.log('Tokens approved successfully.');
	
						const issueTransaction = await bondContract.requestIssue(
							ethers.utils.parseUnits(faceValue.toString(), collateralTokenDecimals),
							signerAddress,
							collateralTokenSymbol,
							collateralAddress
						);
	
						// console.log('issueTransaction', issueTransaction);
						console.log('Form submitted successfully');

						const result = await fetch(`https://api.thegraph.com/subgraphs/name/verified-network/payments`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							query: `{
							users(where: {bondIssues_: {id_gt: "0"}}) {
								accountid
								bondIssues(orderBy: issueTime, orderDirection: desc) {
								bondName
								id
								issueTime
								issuedAmount
								collateralAmount
								}
								id
							}
							}`
						}),
						}).then((res) => res.json());
						setRWAList(result?.data?.users[0]?.bondIssues);
						console.log(result?.data?.users[0].bondIssues);
					}
					if(activeStep === 1) {

						const _apy = ethers.utils.parseUnits((apyOffered / 100).toString(), collateralTokenDecimals);
						const _faceValue = ethers.utils.parseUnits((faceValue / 100).toString(), collateralTokenDecimals);

						console.log('Calling submitNewRWA function...', assetAddress, collateralAddress, _apy, issuingDocumentIPFSURL, _faceValue);
						const verifiedMarketsContract = new Compound(signer, verifiedContractAddress);
						const submitNewRWATransaction = await verifiedMarketsContract.submitNewRWA(assetAddress, collateralAddress, _apy, issuingDocumentIPFSURL, _faceValue, { gasLimit: 300000 })
					}
					setActiveStep((prevActiveStep) => prevActiveStep + 1);
					// Reset the form after successful submission
					setAssetAddress('');
					setCollateralAddress('');
					setFaceValue('');
					setApyOffered('');
					setSelectedCurrency('');
					setIssuingDocument(null);
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
							{activeStep === 0 && (
								<div className='main2'>
									<form>
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
												onChange={handleChangeFile}
												required
											/>
										</div>
									</form>
								</div>
							)}
							{activeStep === 1 && RWAList.map((rwa: any, index:number) => {
								return <h1 key={index}>{ethers.utils.parseBytes32String(rwa?.bondName)}</h1>;
							})}
						</Typography>
						<Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
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

export default AssetIssuanceForm;