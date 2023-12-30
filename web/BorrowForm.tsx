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

// Define the steps for the Stepper component
const steps = ['Post Collateral', 'Borrow'];

// Main component for the RepayLoanForm
const RepayLoanForm: React.FC = function () {
    // State variables to manage form inputs and stepper state
    const [assetAddress, setAssetAddress] = useState('');
    const [baseAddress, setBaseAddress] = useState('');
    const [collateralAddress, setCollateralAddress] = useState('');
    const [borrowAmount, setBorrowAmount] = useState<number>(0);
    const [activeStep, setActiveStep] = React.useState(0);

    // Function to handle going back in the stepper
    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    // Function to handle going to the first step in the stepper
    const handleMore = () => {
        setActiveStep(0);
    };

    // Function to handle form submission
    const handleSubmit = async () => {
        try {
            // Check if required form fields are filled
            if (!assetAddress || !collateralAddress) {
                return;
            }

            // Check if MetaMask is available
            if (!window.ethereum) {
                console.error('MetaMask not detected');
                return;
            }

            console.log('Before eth_requestAccounts');

            // Request accounts using ethereum.request
            await (window.ethereum as any).request({ method: 'eth_requestAccounts' });
            console.log('After eth_requestAccounts');

            // Initialize Ethereum provider
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

            // Get signer and instantiate Verified Markets Contract
            const signer = provider.getSigner();
            const verifiedMarketsContract = new Compound(signer, contractAddress.Compound);
            console.log('Verified Markets Contract Address:', contractAddress);

            // Instantiate ERC20 contract for collateral token
            const collateralTokenContract = new ethers.Contract(collateralAddress, ERC20, signer);
            const collateralTokenDecimals = await collateralTokenContract.decimals();

            // Check active step and perform corresponding action
            if (activeStep === 0) {
                await verifiedMarketsContract.postCollateral(assetAddress, collateralAddress, ethers.utils.parseUnits(borrowAmount.toString(), collateralTokenDecimals), { gasLimit: 300000 });
                console.log(`Collateral posted for asset ${assetAddress} with collateral ${collateralAddress} and amount ${borrowAmount}`);
            } else if (activeStep === 1) {
                // Check if required form fields are filled for the Borrow step
                if (!borrowAmount || !baseAddress) {
                    return;
                }
                console.log(baseAddress, ethers.utils.parseUnits(borrowAmount.toString(), collateralTokenDecimals), { gasLimit: 300000 });
                await verifiedMarketsContract.borrowBase(baseAddress, ethers.utils.parseUnits(borrowAmount.toString(), collateralTokenDecimals), { gasLimit: 300000 });
                console.log(`Borrowed ${borrowAmount} from Compound using base ${baseAddress}`);
            }

            // Move to the next step in the stepper
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        } catch (error) {
            console.error('Error submitting transaction:', error);
        }
    };

    // JSX structure for the form component
    return (
        <div className='main'>
            <h4>Borrow Form</h4>
            <Box sx={{ width: '100%' }}>
                {/* Stepper component for multi-step form */}
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

                {/* Conditional rendering based on the active step */}
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
                        {/* Form fields for each step */}
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

                        {/* Navigation buttons */}
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