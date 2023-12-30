import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/main.scss';
import '../styles/components/_button.scss';
import Modal from './Modal';
import AssetIssuanceForm from './issue_form';
import BorrowForm from './BorrowForm';
import RepayLoanForm from './RepayLoanForm';
import RedeemCollateralForm from './RedeemCollateralForm';
import { ethers } from 'ethers';

interface TableRow {
	"Asset": string;
	"Collateral": string;
	"Issued value": string;
	"Collateral posted": string;
	"Borrowed": string;
	"Repayments": string;
	"APY": string;
	"Status": string;
}

const Issuer: React.FC = () => {
	const [showIssuanceForm, setShowIssuanceForm] = useState(false);
	const [showBorrowForm, setShowBorrowForm] = useState(false);
	const [showRedeemCollateralForm, setShowRedeemCollateralForm] = useState(false);
	const [showRepayLoanForm, setShowRepayLoanForm] = useState(false);
	const [tableData, setTableData] = useState<any>([]);

	const headerNames: (keyof TableRow)[] = [
		'Asset',
		'Collateral',
		'Issued value',
		'Collateral posted',
		'Borrowed',
		'Repayments',
		'APY',
		'Status',
	];


	const ThData = () => {
		return headerNames.map((headerName) => {
			return <th key={headerName}>{headerName}</th>;
		});
	};

	const handleButtonClick = (action: string) => {
		if (action === 'Issue new RWA') setShowIssuanceForm(true);
		if (action === 'Borrow') setShowBorrowForm(true)
		if (action === 'Redeem Collateral') setShowRedeemCollateralForm(true)
		if (action === 'Repay Loan') setShowRepayLoanForm(true)
	};

	useEffect(() => {
		const fetchData = async () => {
			const provider = new ethers.providers.Web3Provider(window.ethereum);
			const signer = provider.getSigner();
			const signerAddress = await signer.getAddress();
			const result = await fetch(`https://api.thegraph.com/subgraphs/name/verified-network/payments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `{
						rwas(
						  where: {issuer_: {accountid: "${signerAddress}"}}
						) {
						  id
						  issuer {
							id
							name
							client
							accountid
						  }
						  asset {
							id
							security
							productCategory
							isin
							currency
							restricted
							issueManager
							restrictions
							country
							issuer {
							  id
							  name
							  client
							  accountid
							}
						  }
						  bond {
							id
							token
							tokenName
							tokenType
						  }
						  apy
						  issuingDocs
						  faceValue
						}
						collaterizedLoans {
						  id
						  borrower {
							id
							name
							client
						  }
						  base
						  amount
						}
						collaterizedLoanRepayments {
						  id
						  borrower {
							id
							name
							client
						  }
						  base
						  amount
						}
						collaterals {
						  id
						  issuer {
							id
							name
							client
						  }
						  asset {
							id
							security
							productCategory
							issuer {
							  id
							  name
							  client
							}
							isin
							currency
							restricted
							issueManager
							restrictions
							country
						  }
						  collateral
						  amount
						}
					}`
				}),
			}).then((res) => res.json());
			setTableData(result);
		}
		fetchData();
	}, [])

	return (

		<div className="home__content">
			<div className="home__assets">
				<div className="panel panel--assets">

					<div className="assets-table">
						<table className="table">
							<thead>
								<tr>{ThData()}</tr>
							</thead>
							<tbody>
								{
									!tableData?.data?.rwas?.length ? (<tr>
										<td colSpan={8}>No data</td>
									</tr>) : (
										tableData?.data?.rwas.map((rwa: any, index:number) => {
											return <tr>
												<td>{rwa?.asset?.security}</td>
												<td>{tableData?.data?.collaterals[index].amount}</td>
												<td>{rwa?.asset?.faceValue}</td>
												<td>{tableData?.data?.collaterizedLoanRepayments[index].amount}</td>
												<td>{tableData?.data?.collaterals[index].amount}</td>
												<td>{tableData?.data?.collaterizedLoans[index].amount}</td>
												<td>{rwa?.asset?.apy}</td>
												<td>{tableData?.data?.collaterizedLoanRepayments[index].amount ? 'Active' : 'Inactive'}</td>
											</tr>
										})
									)
								}
							</tbody>
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
								<Link to="/">
									<a className="link-container2">Borrowing capacity left</a>
								</Link>
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