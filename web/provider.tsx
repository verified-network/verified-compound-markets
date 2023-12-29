// Import necessary dependencies and styles
import { useState } from 'react';
import './ui.css';
import { Link } from 'react-router-dom';

// Import data and components
import TableData from './provider_data';
import ProvideCollateralForm from './ProvideCollateralForm';
import LiquidateCollateralForm from './LiquidateCollateralForm';
import Modal from './Modal';
import '../styles/main.scss';

// Define the structure of each row in the table
interface TableRow {
	"Asset": string;
	"Collateral": string;
	"APY": string;
	'Currency': string;
	'Face value': string;
	'Issuing docs': string;
	"Collateral posted": string;
	"Status": string;
}

// Main functional component for Providers
function Providers() {
	// State variables for showing/hiding forms
	const [showProvideCollateralForm, setShowProvideCollateralForm] = useState(false);
	const [showLiquidateCollateralForm, setShowLiquidateCollateralForm] = useState(false);

	// Sample data for the table
	const data: TableRow[] = TableData;

	// Define the header names for the table
	const headerNames: (keyof TableRow)[] = [
		"Asset",
		'Collateral',
		'APY',
		'Currency',
		'Face value',
		'Issuing docs',
		'Collateral posted',
		'Status',
	];

	// Helper component for rendering table headers
	const ThData = () => {
		return headerNames.map((headerName) => {
			return <th key={headerName}>{headerName}</th>;
		});
	};

	// Helper component for rendering table data rows
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

	// Handle button click to show relevant forms
	const handleButtonClick = (action: string) => {
		if (action === 'Provide collateral') {
			setShowProvideCollateralForm(true);
		}
		else if (action === 'Liquidate collateral') {
			setShowLiquidateCollateralForm(true);
		}
	};

	// Main render function
	return (
		<div className="home__content">
			{/* Table section */}
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

			{/* Sidebar section */}
			<div className="home__sidebar">
				<div className="position-card__summary">
					<div className="panel position-card L3">
						<div className="panel__header-row">
							<label className="L1 label text-color--1">Summary</label>
						</div>
						<div className="panel__header-row">
							{/* Summary text */}
							<p className="text-color--1">
								Verified RWA Markets allows asset managers of real world assets to sell them for collateral that can
								be used to borrow liquid digital assets, and for users to buy staked real world assets with collateral
								supported on Compound and earn income from underlying real world assets.
							</p>
						</div>

						{/* Navigation links and buttons */}
						<div className="buttons-cont">
							{/* Navigation links */}
							<li className="link-container">
								<Link to="/">
									<a className="link-container2">Number of issues by Issuer</a>
								</Link>
							</li>
							<li className="link-container">
								<Link to="/">
									<a className="link-container2">Total borrowing for all issues</a>
								</Link>
							</li>
							<li className="link-container">
								<Link to="/">
									<a className="link-container2"> Borrowing for this issue</a>
								</Link>
							</li>
							<li className="link-container">
								<Link to="/">
									<a className="link-container2">Total repayments for all issue</a>
								</Link>
							</li>
							<li className="link-container">
								<Link to="/">
									<a className="link-container2">Repayment of this issue</a>
								</Link>
							</li>
							<li className="link-container">
								<Link to="/">
									<a className="link-container2">Number of issues defaulted</a>
								</Link>
							</li>

							{/* Buttons to trigger actions */}
							<button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Provide collateral')}>
								Provide collateral
							</button>
							<button className="sidebar-button button--large button--supply" onClick={() => handleButtonClick('Liquidate collateral')}>
								Liquidate collateral
							</button>

							{/* Link to navigate to issue new RWA page */}
							<Link to="/issue">
								<button className='sidebar-button button--large button--supply'>Issue New RWA</button>
							</Link>
						</div>
					</div>
				</div>
			</div>

			{/* Modals for providing and liquidating collateral */}
			{showProvideCollateralForm && <Modal onClose={() => setShowProvideCollateralForm(false)}>
				<ProvideCollateralForm />
			</Modal>}
			{showLiquidateCollateralForm && <Modal onClose={() => setShowLiquidateCollateralForm(false)}>
				<LiquidateCollateralForm />
			</Modal>}
		</div>
	);
}

export default Providers;
