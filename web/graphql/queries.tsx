
import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import client from './client';
import gql from 'graphql-tag';

interface RwaData {
    id: string;
    issuer: string;
    asset: string;
    bond: string;
    apy: number;
    issuingDocs: string;
    faceValue: number;
}

interface CollateralData {
    id: string;
    issuer: string;
    asset: string;
    collateral: string;
    amount: number;
}

interface CollaterizedLoanData {
    id: string;
    borrower: string;
    base: string;
    amount: number;
}

interface CollaterizedLoanRepaymentData {
    id: string;
    borrower: string;
    base: string;
    amount: number;
}

const GET_RWA_DATA = gql`
  query GetRwaData {
    rwa {
      id
      issuer
      asset
      bond
      apy
      issuingDocs
      faceValue
    }
  }
`;

const GET_COLLATERAL_DATA = gql`
  query GetCollateralData {
    collateral {
      id
      issuer
      asset
      collateral
      amount
    }
  }
`;

const GET_COLLATERIZED_LOAN_DATA = gql`
  query GetCollaterizedLoanData {
    collaterizedLoan {
      id
      borrower
      base
      amount
    }
  }
`;

const GET_COLLATERIZED_LOAN_REPAYMENT_DATA = gql`
  query GetCollaterizedLoanRepaymentData {
    collaterizedLoanRepayment {
      id
      borrower
      base
      amount
    }
  }
`;

const Quaries: React.FC = () => {
    const [rwaItems, setRwaItems] = useState<RwaData[]>([]);
    const [collateralItems, setCollateralItems] = useState<CollateralData[]>([]);
    const [loanItems, setLoanItems] = useState<CollaterizedLoanData[]>([]);
    const [repaymentItems, setRepaymentItems] = useState<CollaterizedLoanRepaymentData[]>([]);

    const { loading: rwaLoading, error: rwaError, data: rwaData } = useQuery<{ rwa: RwaData[] }>(GET_RWA_DATA, { client });
    const { loading: collateralLoading, error: collateralError, data: collateralData } = useQuery<{ collateral: CollateralData[] }>(GET_COLLATERAL_DATA, { client });
    const { loading: loanLoading, error: loanError, data: loanData } = useQuery<{ collaterizedLoan: CollaterizedLoanData[] }>(GET_COLLATERIZED_LOAN_DATA, { client });
    const { loading: repaymentLoading, error: repaymentError, data: repaymentData } = useQuery<{ collaterizedLoanRepayment: CollaterizedLoanRepaymentData[] }>(
        GET_COLLATERIZED_LOAN_REPAYMENT_DATA,
        { client }
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const rwaResponse = rwaData?.rwa || [];
                const collateralResponse = collateralData?.collateral || [];
                const loanResponse = loanData?.collaterizedLoan || [];
                const repaymentResponse = repaymentData?.collaterizedLoanRepayment || [];

                setRwaItems(rwaResponse);
                console.log('rwaItems after setting:', rwaItems);
                setCollateralItems(collateralResponse);
                setLoanItems(loanResponse);
                setRepaymentItems(repaymentResponse);

                console.log('State:', { rwaItems, collateralItems, loanItems, repaymentItems });

            } catch (error) {
                console.error('Error:', error);
            }
        };

        fetchData();
    }, [rwaData, collateralData, loanData, repaymentData]);

    if (rwaLoading || collateralLoading || loanLoading || repaymentLoading) {
        return <p>Loading...</p>;
    }

    if (rwaError || collateralError || loanError || repaymentError) {
        console.error('Error:', rwaError || collateralError || loanError || repaymentError);
        return <p>Error: {rwaError?.message || collateralError?.message || loanError?.message || repaymentError?.message}</p>;
    }

    return (
        <div>
            <h1>RWA Data</h1>
            <ul>
                {rwaItems.map((rwa) => (
                    <li key={rwa.id}>
                        <strong>Issuer:</strong> {rwa.issuer}, <strong>Asset:</strong> {rwa.asset}, <strong>APY:</strong> {rwa.apy}%
                    </li>
                ))}
            </ul>

            <h1>Collateral Data</h1>
            <ul>
                {collateralItems.map((collateral) => (
                    <li key={collateral.id}>
                        <strong>Issuer:</strong> {collateral.issuer}, <strong>Asset:</strong> {collateral.asset}, <strong>Amount:</strong> {collateral.amount}
                    </li>
                ))}
            </ul>

            <h1>Collaterized Loan Data</h1>
            <ul>
                {loanItems.map((loan) => (
                    <li key={loan.id}>
                        <strong>Borrower:</strong> {loan.borrower}, <strong>Base:</strong> {loan.base}, <strong>Amount:</strong> {loan.amount}
                    </li>
                ))}
            </ul>

            <h1>Collaterized Loan Repayment Data</h1>
            <ul>
                {repaymentItems.map((repayment) => (
                    <li key={repayment.id}>
                        <strong>Borrower:</strong> {repayment.borrower}, <strong>Base:</strong> {repayment.base}, <strong>Amount:</strong> {repayment.amount}
                    </li>
                ))}
            </ul>

            {/* Your existing JSX */}
        </div>
    );
};

export default Quaries;
