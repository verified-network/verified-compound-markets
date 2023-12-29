import React, { useState } from 'react';
import TableData from './issuer_data';
import '../styles/main.scss';
import '../styles/components/_button.scss';
import Modal from './Modal';
import AssetIssuanceForm from './issue_form';
import BorrowForm from './BorrowForm';
import RepayLoanForm from './RepayLoanForm';
import RedeemCollateralForm from './RedeemCollateralForm';

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
	const [showIssuanceForm, setShowIssuanceForm] = useState(false);
	const [showBorrowForm, setShowBorrowForm] = useState(false);
	const [showRedeemCollateralForm, setShowRedeemCollateralForm] = useState(false);
	const [showRepayLoanForm, setShowRepayLoanForm] = useState(false);

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
		if (action === 'Issue new RWA') setShowIssuanceForm(true);
		if (action === 'Borrow') setShowBorrowForm(true)
		if (action === 'Redeem Collateral') setShowRedeemCollateralForm(true)
		if (action === 'Repay Loan') setShowRepayLoanForm(true)
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
								onClick={() => handleButtonClick('Issue new RWA')}
							>
								Issue new RWA
							</button>

						</div>
					</div>
				</div>
			</div>
			{showBorrowForm && <Modal onClose={() => setShowBorrowForm(false)}>
				<BorrowForm />
			</Modal>}
			{showIssuanceForm && <Modal onClose={() => setShowIssuanceForm(false)}>
				<AssetIssuanceForm />
			</Modal>}
			{showRedeemCollateralForm && <Modal onClose={() => setShowRedeemCollateralForm(false)}>
				<RedeemCollateralForm />
			</Modal>}
			{showRepayLoanForm && <Modal onClose={() => setShowRepayLoanForm(false)}>
				<RepayLoanForm />
			</Modal>}
		</div>
	)
}
export default Issuer;