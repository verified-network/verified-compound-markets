
const ethers = require('ethers');
const userEvent = require('@testing-library/user-event');
const AssetIssuanceForm = require('../issue_form');
const Issuer = require('../issuer');

// Mock the ethers object
jest.mock('ethers', () => ({
    providers: {
        Web3Provider: jest.fn().mockImplementation(() => ({
            getNetwork: jest.fn(),
            getSigner: jest.fn(),
        })),
    },
    Contract: jest.fn().mockImplementation(() => ({
        requestIssue: jest.fn(),
        submitNewRWA: jest.fn(),
        postCollateral: jest.fn(),
        borrowBase: jest.fn(),
        repayBase: jest.fn(),
    })),
    utils: {
        parseUnits: jest.fn(),
        formatBytes32String: jest.fn(),
    },
}));

test('calls requestIssue and submitNewRWA', () => {
    const assetIssuanceForm = new AssetIssuanceForm();

    // Mock the form values
    assetIssuanceForm.state = {
        assetAddress: '0x123',
        collateralAddress: '0x456',
        faceValue: '10000',
        apyOffered: '5',
        selectedCurrency: 'USD',
        issuingDocument: 'document.pdf',
    };

    // Call the handleSubmit function
    assetIssuanceForm.handleSubmit(null);

    // Check that the ethers functions were called
    expect(ethers.Contract.mock.instances[0].requestIssue).toHaveBeenCalled();
    expect(ethers.Contract.mock.instances[0].submitNewRWA).toHaveBeenCalled();
});

test('calls postCollateral, borrowBase, repayBase', () => {
    const issuer = new Issuer();


    // Mock the form values
    issuer.setAsset('0x123');
    issuer.setCollateral('0x456');


    // Call the handleSubmit function
    issuer.handleButtonClick('Post Collateral');
    issuer.handleButtonClick('Borrow');
    issuer.handleButtonClick('Repay Loan');

    // Check that the ethers functions were called
    expect(ethers.Contract.mock.instances[0].postCollateral).toHaveBeenCalled();
    expect(ethers.Contract.mock.instances[0].borrowBase).toHaveBeenCalled();
    expect(ethers.Contract.mock.instances[0].repayBase).toHaveBeenCalled();
});
