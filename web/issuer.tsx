import React, { useState } from 'react';
import { Signer, ethers } from 'ethers';
import TableData from './issuer_data';
import '../styles/main.scss';
import '../styles/components/_button.scss';
import Modal from './Modal';
import { Link } from 'react-router-dom';
import AssetIssuanceForm from './issue_form';
import VerifierdMarkets from '../out/VerifiedMarkets.sol/VerifiedMarkets.json';

const verifiedMarketsAddress = '0x90Cc254C549fEfD8b7a0C2514d93b487d9d234f3';

interface TableRow {
  "Asset": string;
  "Collateral": string;
  "Issued value": string;
  "sold value": string;
  "Collateral posted": string;
  "Borrowed": string;
  "APY": string;
  "Status": string;
}



const Issuer: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupAction, setPopupAction] = useState('');
  const [enteredNumber, setEnteredNumber] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  const [asset, setAsset] = useState<string>('');
  const [collateral, setCollateral] = useState<string>('');
  const [borrowAmount, setBorrowAmount] = useState<number>(0);

  const data: TableRow[] = TableData;

  const headerNames: (keyof TableRow)[] = [
    'Asset',
    'Collateral',
    'Issued value',
    'sold value',
    'Collateral posted',
    'Borrowed',
    'APY',
    'Status',
  ];

  const ThData = () => {
    return headerNames.map((headerName) => {
      return <th key={headerName}>{headerName}</th>;
    });
  };

  const tdData = () => {
    return data.map((rowData, rowIndex) => {
      return (
        <tr key={rowIndex}>
          {headerNames.map((headerName) => {
            return <td key={headerName}>{rowData[headerName]}</td>;
          })}
        </tr>
      );
    });
  };


  const handleButtonClick = (action: string) => {
    if (action === 'Issue new RWA') {
      // Handle Issue new RWA action
      setShowIssuanceForm(true);
    } else {
      // Set the asset, collateral, and borrowAmount 
      setAsset('0xc3d688B66703497DAA19211EEdff47f25384cdc3'); //Asset address
      setCollateral('0xA17581A9E3356d9A858b789D68B4d866e593aE94'); //Collateral Address

      setBorrowAmount(enteredNumber !== null ? enteredNumber : 0);

      setShowPopup(true);
      setPopupAction(action);
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

      // Provider and signer from MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      //Contract instance
      const verifiedMarketsContract = new ethers.Contract(verifiedMarketsAddress, VerifierdMarkets.abi, signer);

      //Call the PostCollateral Function
      await verifiedMarketsContract.postCollateral(asset, collateral, borrowAmount, { gasLimit: 300000, gasPrice: ethers.utils.parseUnits('50', 'gwei') });


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

      // Create a provider and signer from MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      //Contract instance
      const verifiedMarketsContract = new ethers.Contract(verifiedMarketsAddress, VerifierdMarkets.abi, signer);

      // Call the BorrowBase Function
      await verifiedMarketsContract.borrowBase(asset, borrowAmount, { gasLimit: 300000 });
      console.log(`Borrowed ${borrowAmount} from Compound using asset ${asset}`);
    } catch (error) {
      console.error('Error borrowing from Compound:', error);
    }
  };

  // Calling Repayloan function
  const repayLoan = async () => {
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

      //  Provider and signer from MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();


      //Contract instance
      const verifiedMarketsContract = new ethers.Contract(verifiedMarketsAddress, VerifierdMarkets.abi, signer);

      //Call the repayBase function
      await verifiedMarketsContract.repayBase(asset, borrowAmount, { gasLimit: 300000 });

      console.log(`Repay loan for asset ${asset} with amount ${borrowAmount}`);
    } catch (error) {
      console.error('Error repaying loan:', error);
    }
  };


  const handlePopupSubmit = async () => {
    try {
      // Handle the enteredNumber based on the popupAction (e.g., perform appropriate action)
      console.log(`Action: ${popupAction}, Number: ${enteredNumber}`);

      // Reset states after submission
      setShowPopup(false);
      setPopupAction('');
      setEnteredNumber(null);

      // Call the appropriate functions based on popupAction
      if (popupAction === 'Post Collateral') {
        await postCollateral();
      } else if (popupAction === 'Borrow') {
        await postCollateral();
        await borrowBase();
      } else if (popupAction === 'Repay Loan') {
        await repayLoan()
        console.error('Invalid action:', popupAction);
      }
    } catch (error) {
      console.error('Error handling popup submit:', error);
    }
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };



  return (

    <div className="home__content">
      <div className="home__assets">
        <div className="panel panel--assets">

          <div className="assets-table">
            <table className="table">
              <thead>
                <tr>{ThData()}</tr>
              </thead>
              <tbody>{tdData()}</tbody>
            </table>
          </div>

          {null}

        </div>
      </div>

      <div className="home__sidebar">
        <div className="position-card__summary">
          <div className="panel position-card L3">
            <div className="panel__header-row">

              <label className="L1 label text-color--1">Summary</label>
            </div>
            <div className="panel__header-row">
              <p className="text-color--1">
                Verified RWA Markets allows asset managers of real world assets to sell them for collateral that can
                be used to borrow liquid digital assets, and for users to buy staked real world assets with collateral
                supported on Compound and earn income from underlying real world assets.
              </p>
            </div>


            <div className="button-container1">

              <li className="link-container">
                <a href="/" className="link-container2">Borrowing capacity left</a>
              </li>

              <button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Borrow')}>
                Borrow
              </button>

              <button
                className="sidebar-button button--large button--supply"
                onClick={() => handleButtonClick('Redeem Collateral')}
              >
                Redeem collateral
              </button>

              <button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Repay Loan')}>
                Repay loan
              </button>

              <button
                className="sidebar-button button--large button--supply"
                onClick={openModal}
              >
                Issue new RWA
              </button>

            </div>
          </div>
        </div>
      </div>

      {showPopup && (
        <div className="popup">
          <h3>Enter a number:</h3>
          <input
            type="number"
            value={enteredNumber !== null ? enteredNumber : ''}
            onChange={(e) => setEnteredNumber(parseInt(e.target.value))}
          />
          <div className="buttons-container">
            <button className="button-submit button--large button--supply" onClick={handlePopupSubmit}>
              Submit
            </button>
            <button className="button-cancel button--large button--supply" onClick={() => setShowPopup(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {showIssuanceForm && <AssetIssuanceForm />}
      {showModal && <Modal onClose={closeModal} />}
    </div>

  )
}
export default Issuer;
