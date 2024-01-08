import React, { useState } from 'react';
import './form.css';
import { ethers } from 'ethers';
import VerifiedContractAddress from '@verified-network/verified-sdk/dist/contractAddress'
import { Bond, Compound } from '@verified-network/verified-sdk';
import axios from 'axios';
import ERC20 from '../abis/ERC20';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

// Define available currency options
const CurrencyOptions = ['USD', 'EUR', 'GBP', 'INR']; // Add more currency options as needed

// Retrieve Pinata API keys from environment variables
const pinataApiKey = import.meta.env.VITE_APP_PINANA_API_KEY;
const pinataSecretKey = import.meta.env.VITE_APP_PINANA_API_SECRET;

// Define the steps for the Stepper component
const steps = ['Issue New RWA', 'Submit New RWA'];

// AssetIssuanceForm component
const AssetIssuanceForm: React.FC = function () {
  // State variables to manage form input and component state
  const [assetAddress, setAssetAddress] = useState('');
  const [collateralAddress, setCollateralAddress] = useState('');
  const [faceValue, setFaceValue] = useState<number | ''>('');
  const [apyOffered, setApyOffered] = useState<number | ''>('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [issuingDocumentIPFSURL, setIssuingDocumentIPFSURL] = useState(``)
  const [issuingDocument, setIssuingDocument] = useState<File | null>(null);
  const [activeStep, setActiveStep] = React.useState(0);
  const [RWAList, setRWAList] = React.useState([]);
  const [selectedRWA, setSelectedRWA] = React.useState('');

  // Function to handle going back in the Stepper
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Function to handle restarting the Stepper
  const handleMore = () => {
    setActiveStep(0);
  };

  // Function to handle file input change
  const handleChangeFile = async (e: any) => {
    const file = e.target.files[0];
    setIssuingDocument(file);
  }

  // Function to upload file to IPFS
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

  // Function to handle form submission
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

        // Create a Web3 provider using MetaMask
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Get the current network information
        const network = await provider.getNetwork();
        const networkId = network.chainId;

        // Retrieve contract addresses based on the network
        const ContractAddresses = await VerifiedContractAddress;
        const networkContractAddresses = ContractAddresses[networkId];
        
        // Determine the selected currency contract key
        const selectedCurrencyContractKey = selectedCurrency === 'USD' ? 'VBUSD' :
          selectedCurrency === 'EUR' ? 'VBEUR' :
          selectedCurrency === 'INR' ? 'VBINR' : 'VCCHF';

        // Get the bond contract address for the selected currency
        const bondContractAddress = networkContractAddresses?.BOND?.[selectedCurrencyContractKey];
        if (!bondContractAddress) {
          console.error(`Bond contract address not found for network ID: ${networkId}`);
          return;
        }

        // Get the verified contract address
        const verifiedContractAddress = networkContractAddresses?.Compound;

        // Check if the verified contract address is available
        if (verifiedContractAddress) {
          // Create a signer using the MetaMask provider
          const signer = provider.getSigner();
          
          // Create instances of the Bond and Compound contracts
          const bondContract = new Bond(signer, bondContractAddress);
          const verifiedMarketsContract = new Compound(signer, verifiedContractAddress);

          // Get the signer's address
          const signerAddress = await signer.getAddress();

          // Create a contract instance for the collateral token
          const collateralTokenContract = new ethers.Contract(collateralAddress, ERC20, signer);
          const collateralTokenDecimals = await collateralTokenContract.decimals();
          const collateralTokenSymbol = await collateralTokenContract.symbol();

          // Step 1: Issue New RWA
          if (activeStep === 0) {
            // Approve the transfer of collateral tokens to the bond contract
            const approvalTransaction = await collateralTokenContract.approve(bondContractAddress, ethers.utils.parseUnits(faceValue.toString(), collateralTokenDecimals));
            await approvalTransaction.wait();
            console.log('Tokens approved successfully.');

            // Request the issuance of a new bond
            const issueTransaction = await bondContract.requestIssue(
              ethers.utils.parseUnits(faceValue.toString(), collateralTokenDecimals),
              signerAddress,
              collateralTokenSymbol,
              collateralAddress
            );

            console.log('Form submitted successfully');
            
            // Fetch and display updated RWA list
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

          // Step 2: Submit New RWA
          if (activeStep === 1) {
            // Convert APY and face value to BigNumber with correct decimal places
            const _apy = ethers.utils.parseUnits((apyOffered / 100).toString(), collateralTokenDecimals);
            const _faceValue = ethers.utils.parseUnits((faceValue / 100).toString(), collateralTokenDecimals);

            // Submit the new RWA
            console.log('Calling submitNewRWA function...', assetAddress, collateralAddress, _apy, issuingDocumentIPFSURL, _faceValue);
            const submitNewRWATransaction = await verifiedMarketsContract.submitNewRWA(assetAddress, collateralAddress, _apy, issuingDocumentIPFSURL, _faceValue, { gasLimit: 300000 })
          }

          // Move to the next step in the Stepper
          setActiveStep((prevActiveStep) => prevActiveStep + 1);
        } else {
          throw new Error('MetaMask not detected');
        }
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }
  };

  // Function to handle RWA selection change
  const handleChangeRWA = (event: SelectChangeEvent) => {
    setSelectedRWA(event.target.value as string);
  };

  return (
    <div className='main'>
      <h4>Asset Issuance Form</h4>
      <Box sx={{ width: '100%' }}>
        {/* Stepper component to display current step in the form */}
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
        {/* Display form or completion message based on the current step */}
        {activeStep === steps.length ? (
          <>
            <Typography sx={{ mt: 2, mb: 1 }}>
              All steps completed - you&apos;re finished
            </Typography>
            {/* Additional action button for navigating to more steps */}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
              <Box sx={{ flex: '1 1 auto' }} />
              <button className='button--large button--supply' onClick={handleMore}>More</button>
            </Box>
          </>
        ) : (
          <>
            {/* Display form fields based on the current step */}
            <Typography sx={{ mt: 2, mb: 1 }}>
              {activeStep === 0 && (
                <div className='main2'>
                  {/* Form for entering details for the first step */}
                  <form>
                    {/* Asset Address input field */}
                    <div className='form-field'>
                      <label>Asset Address</label>
                      <input
                        type='text'
                        value={assetAddress}
                        onChange={(e) => setAssetAddress(e.target.value)}
                        required
                      />
                    </div>

                    {/* Collateral Address input field */}
                    <div className='form-field'>
                      <label>Collateral Address</label>
                      <input
                        type='text'
                        value={collateralAddress}
                        onChange={(e) => setCollateralAddress(e.target.value)}
                        required
                      />
                    </div>

                    {/* Face Value input field */}
                    <div className='form-field'>
                      <label>Face Value of Asset to Issue</label>
                      <input
                        type='number'
                        value={faceValue}
                        onChange={(e) => setFaceValue(e.target.valueAsNumber)}
                        required
                      />
                    </div>

                    {/* APY Offered input field */}
                    <div className='form-field'>
                      <label>APY Offered</label>
                      <input
                        type='number'
                        value={apyOffered}
                        onChange={(e) => setApyOffered(e.target.valueAsNumber)}
                        required
                      />
                    </div>

                    {/* Currency selection field */}
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
                        {/* Map currency options to dropdown options */}
                        {CurrencyOptions.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Issuing Document file input field */}
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
              {/* RWA selection field for the second step */}
              {activeStep === 1 && <FormControl sx={{marginTop: '30px'}} fullWidth>
                <InputLabel id="demo-simple-select-label">RWA</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={selectedRWA}
                  label="RWA"
                  sx={{color:'white'}}
                  onChange={handleChangeRWA}
                >
                  {/* Map RWA options to dropdown options */}
                  {RWAList.map((rwa: any, index: number) => {
                    return <MenuItem key={index} value={rwa?.id}>{ethers.utils.parseBytes32String(rwa?.bondName)}</MenuItem>;
                  })}
                </Select>
              </FormControl>}
            </Typography>
            {/* Navigation buttons for moving between steps */}
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              {/* Back button for navigating to the previous step */}
              <button
                disabled={activeStep === 0}
                className='button--back'
                onClick={handleBack}
              >
                Back
              </button>
              <Box sx={{ flex: '1 1 auto' }} />
              {/* Next/Finish button for proceeding to the next step or completing the form */}
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