const VerifiedMarkets = artifacts.require("VerifiedMarkets");
const Comet = artifacts.require("Comet");
const ERC20 = artifacts.require("IERC20");
const Faucet = artifacts.require("Fauceteer");
const { Web3 } = require("web3");
const truffleAssert = require("truffle-assertions");

contract("Verifiedmarkets On Base Sepolia", (accounts) => {
  let verifiedMarketsCont, verifiedMarketsAddress, faucetContract, chainId;
  const web3 = new Web3(VerifiedMarkets.web3.currentProvider);
  const cometUSDC = "0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017"; //cUSDCv3 on base sepolia
  const contractOwner = accounts[0];
  const issuer = accounts[1];
  const nullAddress = "0x0000000000000000000000000000000000000000";
  const securityAssest1 = "0x5570Ffa8868Ec35cfb0E360d3d720E0232a64AcF";
  const securityAssest2 = "0x863c1Eeb0506c18eaA402787e662596a94F31BC1";
  const bond1 = "0x3ABee586676F885d57D8f896C42a9c8037E6cbD3";
  const bond2 = "0x7C8D807BbB7EBB3DCF77BcA12F1084FBe63929BA";
  const apyInWei = 10000000000000000n;
  const faceValueInWei = 100000000000000n;
  const issuingDocs = "ipfshash";
  const maxUint256 = BigInt(
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  );
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; //USDC on base sepolia

  before(async () => {
    chainId = await web3.eth.getChainId();
    assert.equal(
      chainId,
      84532,
      `This test only works base sepolia network(chainId: 84532). run "truffle test --network baseSepolia" and try again`
    );
    assert.isTrue(
      accounts.length > 1,
      "Accounts needs to be at least 2 to run test(first account is reserved for contract owner)"
    );
    verifiedMarketsCont = await VerifiedMarkets.new(cometUSDC, {
      from: contractOwner,
    });
    verifiedMarketsAddress = verifiedMarketsCont.address;
    assert.isNotNull(
      verifiedMarketsAddress,
      "Newly deployed VerifiedMarkets address should exist"
    );
    const faucetAddress = "0x68793eA49297eB75DFB4610B68e076D2A5c7646C"; //faucet on sepolia
    faucetContract = await Faucet.at(faucetAddress);
    const cometUSDCContract = await Comet.at(cometUSDC);
    const hasPermission = await cometUSDCContract.hasPermission(
      issuer,
      verifiedMarketsAddress
    );
    if (!hasPermission) {
      await truffleAssert.passes(
        cometUSDCContract.allow(verifiedMarketsAddress, true, { from: issuer }),
        "Allow on comet contract should not fail if called"
      );
      const permissionStatus = await cometUSDCContract.hasPermission(
        issuer,
        verifiedMarketsAddress
      );
      assert.isTrue(
        permissionStatus,
        "Permission status should change after allow is called"
      );
    }
  });

  const checkWithFaucet = async (
    collateralSymbol,
    collateralAddress,
    collateralContract,
    amountToCheck,
    signer
  ) => {
    const collateralBalance = await collateralContract.balanceOf(signer);
    if (Number(collateralBalance) < Number(amountToCheck)) {
      console.log(
        `${collateralSymbol} Balance lesser than amount. Will try to get ${collateralSymbol} from faucet...`
      );
      await truffleAssert.passes(
        faucetContract.drip(collateralAddress, { from: signer }),
        "Drip on Fauceteer must not fail if called...."
      );
      const newBalance = await collateralContract.balanceOf(signer);
      assert.isTrue(
        Number(newBalance) >= Number(amountToCheck),
        `${collateralSymbol}balance after faucet call is still lesser than amount`
      );
    }
  };

  const checkAllowance = async (collateralContract, signer) => {
    const cometAllowance = await collateralContract.allowance(
      signer,
      cometUSDC
    );
    //always approve maxUint256 to handle one time approval for collaterals that support it
    if (Number(cometAllowance) != Number(maxUint256)) {
      await truffleAssert.passes(
        collateralContract.approve(
          cometUSDC,
          maxUint256.toLocaleString("fullwide", {
            useGrouping: false,
          }),
          {
            from: signer,
          }
        ),
        "Approve on collateral contract should not fail if called"
      );
      const newAllowance = await collateralContract.allowance(
        signer,
        cometUSDC
      );
      assert.equal(
        newAllowance,
        Number(maxUint256),
        "Allowance should be max256 after approve on collateral is called"
      );
    }
  };

  it("Should create 2 new RWAs for issuer", async () => {
    const submitNewRWA1 = await verifiedMarketsCont.submitNewRWA(
      securityAssest1,
      bond1,
      apyInWei,
      issuingDocs,
      faceValueInWei,
      { from: issuer }
    );

    truffleAssert.eventEmitted(
      submitNewRWA1,
      "NewRWA",
      {
        issuer: issuer,
        asset: securityAssest1,
        bond: bond1,
        issuingDocs: issuingDocs,
      },
      "NewRWA should be emitted with right parameters/arguments"
    );

    const submitNewRWA2 = await verifiedMarketsCont.submitNewRWA(
      securityAssest2,
      bond2,
      apyInWei,
      issuingDocs,
      faceValueInWei,
      { from: issuer }
    );

    truffleAssert.eventEmitted(
      submitNewRWA2,
      "NewRWA",
      {
        issuer: issuer,
        asset: securityAssest2,
        bond: bond2,
        issuingDocs: issuingDocs,
      },
      "NewRWA should be emitted with right parameters/arguments"
    );
  });

  it("Should revert when submitNewRWA params are wrong", async () => {
    await truffleAssert.reverts(
      verifiedMarketsCont.submitNewRWA(
        nullAddress,
        bond2,
        apyInWei,
        issuingDocs,
        faceValueInWei,
        { from: issuer }
      ),
      "RWA submission : Invalid request",
      "Invalid parameters for submitNewRWA should revert with right error"
    ); //assest is null address

    await truffleAssert.reverts(
      verifiedMarketsCont.submitNewRWA(
        securityAssest2,
        nullAddress,
        apyInWei,
        issuingDocs,
        faceValueInWei,
        { from: issuer }
      ),
      "RWA submission : Invalid request",
      "Invalid parameters for submitNewRWA should revert with right error"
    ); //bond is null address

    await truffleAssert.reverts(
      verifiedMarketsCont.submitNewRWA(
        securityAssest2,
        bond2,
        0,
        issuingDocs,
        faceValueInWei,
        { from: issuer }
      ),
      "RWA submission : Invalid request",
      "Invalid parameters for submitNewRWA should revert with right error"
    ); //apy is not greater than 0

    await truffleAssert.reverts(
      verifiedMarketsCont.submitNewRWA(
        securityAssest2,
        bond2,
        apyInWei,
        issuingDocs,
        0,
        { from: issuer }
      ),
      "RWA submission : Invalid request",
      "Invalid parameters for submitNewRWA should revert with right error"
    ); //faceValue is not greater than 0
  });

  it("Should edit the 2 RWAs created and confirm their new details", async () => {
    const newRWA1Apy = 70000000000000n;
    const newRWA1Facevalue = 230000000n;

    const newRWA2IssuingDocs = "ipfsHash2";
    const newRWA2Apy = 3452000000000000000n;

    const editRWA1 = await verifiedMarketsCont.submitNewRWA(
      securityAssest1,
      bond1,
      newRWA1Apy,
      issuingDocs,
      newRWA1Facevalue,
      { from: issuer }
    );

    truffleAssert.eventEmitted(
      editRWA1,
      "NewRWA",
      (data) => {
        return (
          data.bond === bond1 &&
          data.issuer === issuer &&
          data.asset === securityAssest1 &&
          Number(data.apy) === Number(newRWA1Apy) &&
          Number(data.faceValue) === Number(newRWA1Facevalue) &&
          data.issuingDocs === issuingDocs //issuingDocs remains the same for RWA1
        );
      },
      "NewRWA should be emitted with right parameters/arguments"
    );

    const editRWA2 = await verifiedMarketsCont.submitNewRWA(
      securityAssest2,
      bond2,
      newRWA2Apy,
      newRWA2IssuingDocs,
      faceValueInWei,
      { from: issuer }
    );

    truffleAssert.eventEmitted(
      editRWA2,
      "NewRWA",
      (data) => {
        return (
          data.bond === bond2 &&
          data.issuer === issuer &&
          data.asset === securityAssest2 &&
          Number(data.apy) === Number(newRWA2Apy) &&
          Number(data.faceValue) === Number(faceValueInWei) && //faceValue remains the same for RWA2
          data.issuingDocs === newRWA2IssuingDocs
        );
      },
      "NewRWA should be emitted with right parameters/arguments"
    );
  });

  it("Should revert when trying to edit RWAs with wrong params", async () => {
    await truffleAssert.reverts(
      verifiedMarketsCont.submitNewRWA(
        securityAssest2,
        bond1,
        apyInWei,
        issuingDocs,
        faceValueInWei,
        { from: issuer }
      ),
      "RWA submission : Invalid bond",
      "Invalid parameters for submitNewRWA should revert with right error"
    ); //wrong bond to securityAsset2

    await truffleAssert.reverts(
      verifiedMarketsCont.submitNewRWA(
        securityAssest1,
        bond2,
        apyInWei,
        issuingDocs,
        faceValueInWei,
        { from: issuer }
      ),
      "RWA submission : Invalid bond",
      "Invalid parameters for submitNewRWA should revert with right error"
    ); //wrong bond to securityAsset1
  });

  it("Should post 0.000001 WETH from Issuer To RWA1 as collateral", async () => {
    const collateralAddress = "0x4200000000000000000000000000000000000006"; //WETH on base sepolia
    const collateralContract = await ERC20.at(collateralAddress);
    const amountToPost =
      0.000001 * 10 ** Number(await collateralContract.decimals()); //0.000001 in wei(since WETH is 18decimals)
    await checkWithFaucet(
      "WETH",
      collateralAddress,
      collateralContract,
      amountToPost,
      issuer
    );
    await checkAllowance(collateralContract, issuer);
    const postCollateral = await verifiedMarketsCont.postCollateral(
      securityAssest1,
      collateralAddress,
      amountToPost,
      { from: issuer }
    );
    truffleAssert.eventEmitted(
      postCollateral,
      "PostedCollateral",
      (data) => {
        return (
          data.issuer === issuer,
          data.asset === securityAssest1,
          data.collateral === collateralAddress,
          Number(data.amount) === Number(amountToPost)
        );
      },
      "PostedCollateral should be emitted with right parameters/arguments"
    );
  });

  it("Should post 0.000000002 WETH from Issuer To RWA2 as collateral", async () => {
    const collateralAddress = "0x4200000000000000000000000000000000000006"; //WBTC on base sepolia
    const collateralContract = await ERC20.at(collateralAddress);
    const amountToPost =
      0.000000002 * 10 ** Number(await collateralContract.decimals()); //0.000000002 in WETH decimals
    await checkWithFaucet(
      "WETH",
      collateralAddress,
      collateralContract,
      amountToPost,
      issuer
    );
    await checkAllowance(collateralContract, issuer);
    const postCollateral = await verifiedMarketsCont.postCollateral(
      securityAssest2,
      collateralAddress,
      amountToPost,
      { from: issuer }
    );
    truffleAssert.eventEmitted(
      postCollateral,
      "PostedCollateral",
      (data) => {
        return (
          data.issuer === issuer,
          data.asset === securityAssest2,
          data.collateral === collateralAddress,
          Number(data.amount) === Number(amountToPost)
        );
      },
      "PostedCollateral should be emitted with right parameters/arguments"
    );
  });

  it("Should borrow 0.0001 base(USDC) from RWA1", async () => {
    const amountToBorrow = 0.0001 * 10 ** 6; //0.000001 in 6 decimals(since USDC is 6decimals)
    const borrowBase = await verifiedMarketsCont.borrowBase(
      securityAssest1,
      amountToBorrow,
      { from: issuer }
    );
    truffleAssert.eventEmitted(
      borrowBase,
      "Borrowed",
      (data) => {
        return (
          data.borrower === issuer,
          data.base.toLowerCase() === USDC.toLowerCase(),
          Number(data.amount) === Number(amountToBorrow)
        );
      },
      "borrowBases should be emitted with right parameters/arguments"
    );
  });

  it("Should borrow 0.00003 base(USDC) from RWA2", async () => {
    const amountToBorrow = 0.00003 * 10 ** 6; //0.000001 in 6 decimals(since USDC is 6decimals)
    const borrowBase = await verifiedMarketsCont.borrowBase(
      securityAssest2,
      amountToBorrow,
      { from: issuer }
    );
    truffleAssert.eventEmitted(
      borrowBase,
      "Borrowed",
      (data) => {
        return (
          data.borrower === issuer,
          data.base.toLowerCase() === USDC.toLowerCase(),
          Number(data.amount) === Number(amountToBorrow)
        );
      },
      "borrowBases should be emitted with right parameters/arguments"
    );
  });

  it("Should repay 0.0001 base(USDC) to RWA1", async () => {
    const amountToPay = 0.0001 * 10 ** 6; //0.000001 in 6 decimals(since USDC is 6decimals)
    const baseContract = await ERC20.at(USDC);
    await checkAllowance(baseContract, issuer);
    const repayBase = await verifiedMarketsCont.repayBase(
      securityAssest1,
      amountToPay,
      { from: issuer }
    );
    truffleAssert.eventEmitted(
      repayBase,
      "Repaid",
      (data) => {
        return (
          data.borrower === issuer,
          data.base.toLowerCase() === USDC.toLowerCase(),
          Number(data.amount) === Number(amountToPay)
        );
      },
      "repayBase should be emitted with right parameters/arguments"
    );
  });

  it("Should repay 0.00002 base(USDC) to RWA2", async () => {
    const amountToPay = 0.00002 * 10 ** 6; //0.000001 in 6 decimals(since USDC is 6decimals)
    const baseContract = await ERC20.at(USDC);
    await checkAllowance(baseContract, issuer);
    const repayBase = await verifiedMarketsCont.repayBase(
      securityAssest2,
      amountToPay,
      { from: issuer }
    );
    truffleAssert.eventEmitted(
      repayBase,
      "Repaid",
      (data) => {
        return (
          data.borrower === issuer,
          data.base.toLowerCase() === USDC.toLowerCase(),
          Number(data.amount) === Number(amountToPay)
        );
      },
      "repayBase should be emitted with right parameters/arguments"
    );
  });
});
