const { network, ethers } = require("hardhat");
const { expect } = require("chai");
const Comet = require("../artifacts/contracts/interfaces/CometInterface.sol/Comet.json");
const Faucet = require("../artifacts/contracts/interfaces/Fauceteer.sol/Fauceteer.json");
const ERC20 = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20.json");

/**
 * @notice To run Tests: line 85 to 87 in VerifiedMarkets.sol(../contracts/VerifiedMarkets.sol) must be commented out
 *      // require(
        //     Bond(bond).getIssuer() == msg.sender,
        //     "RWA submission : Invalid issuer"
        // ); 
        These tests do not include Bond related test(s).
 * @notice  This Tests run on baseSepolia only any other chain/network will not work. 
 * @notice  If Tests failed with insufficient gas or ERC20:balance error reach out to Verified Network team.
 **/

describe("VerifiedMarkets Tests On Base Sepolia", () => {
  let contractOwner,
    issuer,
    verifiedMarketsIssuerContract,
    verifiedMarketsAddress,
    faucetContract,
    chainId;
  const cometUSDC = "0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017"; //cUSDCv3 on base sepolia
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
  const collateralAddress = "0x4200000000000000000000000000000000000006"; //WETH on base sepolia

  before(async () => {
    chainId = network.config.chainId;
    expect(chainId).to.equal(
      84532,
      `This test only works on base sepolia network(chainId: 84532). run "npx hardhat test --network baseSepoliaa" and try again`
    );
    const accounts = await ethers.getSigners();
    expect(accounts.length).to.greaterThanOrEqual(
      2,
      "At least 2 accounts are needed to fully run tests. first account is reserved as contract owner"
    );
    contractOwner = accounts[0];
    issuer = accounts[1];
    const verifiedMarketsArtifacts = await ethers.getContractFactory(
      "VerifiedMarkets"
    );
    console.log("Deploying VerifiedMarkets...");
    const verifiedMarketsCont = await verifiedMarketsArtifacts
      .connect(contractOwner)
      .deploy(cometUSDC);
    verifiedMarketsAddress = await verifiedMarketsCont.getAddress();
    expect(verifiedMarketsAddress).to.properAddress;
    verifiedMarketsIssuerContract = verifiedMarketsCont.connect(issuer);
    console.log("VerifiedMarkets Deployed");
    const faucetAddress = "0x68793eA49297eB75DFB4610B68e076D2A5c7646C"; //faucet on sepolia
    faucetContract = new ethers.Contract(
      faucetAddress,
      Faucet.abi,
      ethers.provider
    ).connect(issuer);
    const cometUSDCContract = new ethers.Contract(
      cometUSDC,
      Comet.abi,
      ethers.provider
    );
    console.log("Allowing new VerifiedMarkets on Comet for Issuer...");
    await expect(
      cometUSDCContract.connect(issuer).allow(verifiedMarketsAddress, true)
    ).to.not.be.reverted;
    const permissionStatus = await cometUSDCContract.hasPermission(
      issuer.address,
      verifiedMarketsAddress
    );
    expect(permissionStatus).to.be.true;
    console.log(
      "VerifiedMarkets allowed(permitted to borrow/repay for Issuer)"
    );
  });

  //faucet seem inactive on baseSepolia(couldn't find the address)???
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
      await expect(
        faucetContract.drip(collateralAddress),
        "Drip on Fauceteer must not fail if called...."
      ).not.to.be.reverted;
      const newBalance = await collateralContract.balanceOf(signer);
      expect(Number(newBalance) >= Number(amountToCheck)).to.be.true;
    }
  };

  const checkAllowance = async (tokenContract, amountToCheck, signer) => {
    const cometAllowance = await tokenContract.allowance(signer, cometUSDC);
    //always approve maxUint256 to handle one time approval for collaterals that support it
    if (Number(cometAllowance) < Number(amountToCheck)) {
      await expect(
        tokenContract.approve(
          cometUSDC,
          maxUint256.toLocaleString("fullwide", {
            useGrouping: false,
          })
        )
      ).not.to.be.reverted;
      const newAllowance = await tokenContract.allowance(signer, cometUSDC);
      expect(Number(newAllowance)).to.equal(Number(maxUint256));
    }
  };

  const verifyTokenBalance = async (
    tokenContract,
    balanceBefore,
    expectedAmount,
    increased,
    signer
  ) => {
    const tokenNewBalance = await tokenContract.balanceOf(signer);
    increased
      ? expect(Number(tokenNewBalance) - Number(balanceBefore)).to.equal(
          expectedAmount
        )
      : expect(Number(balanceBefore) - Number(tokenNewBalance)).to.equal(
          expectedAmount
        );
  };

  describe("submitNewRWA Tests", () => {
    it("Should Create 2 new RWAs for Issuer", async () => {
      const submitNewRWA1 = verifiedMarketsIssuerContract.submitNewRWA(
        securityAssest1,
        bond1,
        apyInWei,
        issuingDocs,
        faceValueInWei
      );
      await expect(submitNewRWA1)
        .to.emit(verifiedMarketsIssuerContract, "NewRWA")
        .withArgs(
          issuer,
          securityAssest1,
          bond1,
          apyInWei,
          issuingDocs,
          faceValueInWei
        );

      const submitNewRWA2 = verifiedMarketsIssuerContract.submitNewRWA(
        securityAssest2,
        bond2,
        apyInWei,
        issuingDocs,
        faceValueInWei
      );
      await expect(submitNewRWA2)
        .to.emit(verifiedMarketsIssuerContract, "NewRWA")
        .withArgs(
          issuer,
          securityAssest2,
          bond2,
          apyInWei,
          issuingDocs,
          faceValueInWei
        );
    });

    it("Should revert when submitNewRWA params are wrong", async () => {
      await expect(
        verifiedMarketsIssuerContract.submitNewRWA(
          nullAddress, //asset is null address
          bond2,
          apyInWei,
          issuingDocs,
          faceValueInWei
        )
      ).to.be.revertedWith("RWA submission : Invalid request");

      await expect(
        verifiedMarketsIssuerContract.submitNewRWA(
          securityAssest2,
          nullAddress, //bond is null address
          apyInWei,
          issuingDocs,
          faceValueInWei
        )
      ).to.be.revertedWith("RWA submission : Invalid request");

      await expect(
        verifiedMarketsIssuerContract.submitNewRWA(
          securityAssest2,
          bond2,
          0, //apy is not greater than 0
          issuingDocs,
          faceValueInWei
        )
      ).to.be.revertedWith("RWA submission : Invalid request");

      await expect(
        verifiedMarketsIssuerContract.submitNewRWA(
          securityAssest2,
          bond2,
          apyInWei,
          issuingDocs,
          0 //faceValue is not greater than 0
        )
      ).to.be.revertedWith("RWA submission : Invalid request");
    });

    it("Should edit the 2 RWAs created and confirm their new details", async () => {
      const newRWA1Apy = 70000000000000n;
      const newRWA1Facevalue = 230000000n;

      const newRWA2IssuingDocs = "ipfsHash2";
      const newRWA2Apy = 3452000000000000000n;

      const editRWA1 = verifiedMarketsIssuerContract.submitNewRWA(
        securityAssest1,
        bond1,
        newRWA1Apy,
        issuingDocs,
        newRWA1Facevalue
      );

      await expect(editRWA1)
        .to.emit(verifiedMarketsIssuerContract, "NewRWA")
        .withArgs(
          issuer,
          securityAssest1,
          bond1,
          newRWA1Apy, //apy changed
          issuingDocs, //issuingDocs remains the same
          newRWA1Facevalue //faceValue changed
        );

      const editRWA2 = verifiedMarketsIssuerContract.submitNewRWA(
        securityAssest2,
        bond2,
        newRWA2Apy,
        newRWA2IssuingDocs,
        faceValueInWei
      );

      await expect(editRWA2)
        .to.emit(verifiedMarketsIssuerContract, "NewRWA")
        .withArgs(
          issuer,
          securityAssest2,
          bond2,
          newRWA2Apy, //apy changed
          newRWA2IssuingDocs, //issuing docs changed
          faceValueInWei //faceValue remains the same
        );
    });

    it("Should revert when trying to edit RWAs with wrong params", async () => {
      await expect(
        verifiedMarketsIssuerContract.submitNewRWA(
          securityAssest2,
          bond1, //wrong bond to securityAsset2
          apyInWei,
          issuingDocs,
          faceValueInWei
        )
      ).to.be.revertedWith("RWA submission : Invalid bond");

      await expect(
        verifiedMarketsIssuerContract.submitNewRWA(
          securityAssest1,
          bond2, //wrong bond to securityAsset1
          apyInWei,
          issuingDocs,
          faceValueInWei
        )
      ).to.be.revertedWith("RWA submission : Invalid bond");
    });
  });

  describe("postCollateral Tests", async () => {
    it("Should post 0.00001 WETH from Issuer To RWA1 as collateral", async () => {
      const collateralContract = new ethers.Contract(
        collateralAddress,
        ERC20.abi,
        ethers.provider
      ).connect(issuer);
      const amountToPost =
        0.00001 * 10 ** Number(await collateralContract.decimals()); //0.000001 in wei(since WETH is 18decimals)

      await checkWithFaucet(
        "WETH",
        collateralAddress,
        collateralContract,
        amountToPost,
        issuer.address
      );
      await checkAllowance(collateralContract, amountToPost, issuer.address);
      const collateralBalanceBefore = await collateralContract.balanceOf(
        issuer.address
      );

      //check reverts first to capture getAssetInfoByAddress require before posting collateral
      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          securityAssest1,
          USDC, //baseToken is used as collateral
          amountToPost
        )
      ).to.be.revertedWith("Posting Collateral: Invalid collateral");
      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          securityAssest1,
          bond1, //unaccepted token is used as collateral
          amountToPost
        )
      ).to.be.revertedWith("Posting Collateral: Invalid collateral");

      //post collateral
      const postCollateral = verifiedMarketsIssuerContract.postCollateral(
        securityAssest1,
        collateralAddress,
        amountToPost
      );
      await expect(postCollateral)
        .to.emit(verifiedMarketsIssuerContract, "PostedCollateral")
        .withArgs(issuer, securityAssest1, collateralAddress, amountToPost);

      //verify WETH(collateral) balance reduces with right amount
      await verifyTokenBalance(
        collateralContract,
        collateralBalanceBefore,
        amountToPost,
        false,
        issuer.address
      );
    });

    it("Should post 0.00002 WETH from Issuer To RWA2 as collateral", async () => {
      const collateralContract = new ethers.Contract(
        collateralAddress,
        ERC20.abi,
        ethers.provider
      ).connect(issuer);
      const amountToPost =
        0.00002 * 10 ** Number(await collateralContract.decimals()); //0.0000002 in WETH decimals
      await checkWithFaucet(
        "WETH",
        collateralAddress,
        collateralContract,
        amountToPost,
        issuer.address
      );
      await checkAllowance(collateralContract, amountToPost, issuer.address);
      const collateralBalanceBefore = await collateralContract.balanceOf(
        issuer.address
      );

      //check reverts first to capture getAssetInfoByAddress require before posting collateral
      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          securityAssest2,
          USDC, //baseToken is used as collateral
          amountToPost
        )
      ).to.be.revertedWith("Posting Collateral: Invalid collateral");

      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          securityAssest2,
          bond2, //unaccepted token is used as collateral
          amountToPost
        )
      ).to.be.revertedWith("Posting Collateral: Invalid collateral");

      //post collateral
      const postCollateral = verifiedMarketsIssuerContract.postCollateral(
        securityAssest2,
        collateralAddress,
        amountToPost
      );
      await expect(postCollateral)
        .to.emit(verifiedMarketsIssuerContract, "PostedCollateral")
        .withArgs(issuer, securityAssest2, collateralAddress, amountToPost);

      //verify WETH(collateral) balance reduces with right amount
      await verifyTokenBalance(
        collateralContract,
        collateralBalanceBefore,
        amountToPost,
        false,
        issuer.address
      );
    });

    it("Should revert if postCollateral params are wrong", async () => {
      const amountToPost = 1000000000n;
      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          nullAddress, //asset is null address
          collateralAddress,
          amountToPost
        )
      ).to.be.revertedWith("Posting Collateral: Invalid");

      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          securityAssest1,
          nullAddress, //collateral is null address
          amountToPost
        )
      ).to.be.revertedWith("Posting Collateral: Invalid");

      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          securityAssest1,
          collateralAddress,
          0 //amount is not greater than 0
        )
      ).to.be.revertedWith("Posting Collateral: Invalid");

      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          securityAssest1,
          bond1, //wrong collateral to assest1 after collateral has been posted
          1000000n
        )
      ).to.be.revertedWith("Post Collateral: Invalid collateral");

      await expect(
        verifiedMarketsIssuerContract.postCollateral(
          securityAssest2,
          bond2, //wrong collateral to assest2 after collateral has been posted
          1000000n
        )
      ).to.be.revertedWith("Post Collateral: Invalid collateral");
    });
  });

  describe("borrowBase Tests", async () => {
    it("Should borrow 0.00001 base(USDC) from RWA1", async () => {
      const baseContract = new ethers.Contract(
        USDC,
        ERC20.abi,
        ethers.provider
      ).connect(issuer);
      const baseBalanceBefore = await baseContract.balanceOf(issuer.address);
      const amountToBorrow =
        0.00001 * 10 ** Number(await baseContract.decimals()); //0.00001 in baseDecimals
      const borrowBase = verifiedMarketsIssuerContract.borrowBase(
        securityAssest1,
        amountToBorrow
      );
      await expect(borrowBase)
        .to.emit(verifiedMarketsIssuerContract, "Borrowed")
        .withArgs(issuer, USDC, amountToBorrow);

      //verify base(USDC) balance increases with right amount
      await verifyTokenBalance(
        baseContract,
        baseBalanceBefore,
        amountToBorrow,
        true,
        issuer.address
      );
    });

    it("Should borrow 0.00003 base(USDC) from RWA2", async () => {
      const baseContract = new ethers.Contract(
        USDC,
        ERC20.abi,
        ethers.provider
      ).connect(issuer);
      const baseBalanceBefore = await baseContract.balanceOf(issuer.address);
      const amountToBorrow =
        0.000003 * 10 ** Number(await baseContract.decimals()); //0.00003 in baseDecimals
      const borrowBase = verifiedMarketsIssuerContract.borrowBase(
        securityAssest2,
        amountToBorrow
      );
      await expect(borrowBase)
        .to.emit(verifiedMarketsIssuerContract, "Borrowed")
        .withArgs(issuer, USDC, amountToBorrow);

      //verify base(USDC) balance increases with right amount
      await verifyTokenBalance(
        baseContract,
        baseBalanceBefore,
        amountToBorrow,
        true,
        issuer.address
      );
    });

    it("Should revert if borrowBase params are wrong", async () => {
      const amountToBorrow = 1000000000n;
      await expect(
        verifiedMarketsIssuerContract.borrowBase(
          nullAddress, //asset is null address
          amountToBorrow
        )
      ).to.be.revertedWith("Borrowing base : Invalid");

      await expect(
        verifiedMarketsIssuerContract.borrowBase(
          securityAssest1,
          0 //amount lesser than borrow minimum
        )
      ).to.be.revertedWith("Borrowing base : Invalid");
    });
  });

  describe("repayBase Tests", async () => {
    it("Should repay 0.000001 base(USDC) to RWA1", async () => {
      const baseContract = new ethers.Contract(
        USDC,
        ERC20.abi,
        ethers.provider
      ).connect(issuer);
      const amountToPay = 0.00001 * 10 ** Number(await baseContract.decimals()); //0.00001 in baseDecimals
      await checkAllowance(baseContract, amountToPay, issuer.address);
      const baseBalanceBefore = await baseContract.balanceOf(issuer.address);
      const repayBase = verifiedMarketsIssuerContract.repayBase(
        securityAssest1,
        amountToPay
      );
      await expect(repayBase)
        .to.emit(verifiedMarketsIssuerContract, "Repaid")
        .withArgs(issuer, USDC, amountToPay);

      //verify base(USDC) balance reduces with right amount
      await verifyTokenBalance(
        baseContract,
        baseBalanceBefore,
        amountToPay,
        false,
        issuer.address
      );

      //verify WETH(collateral) balance increases with right amount??
    });

    it("Should repay 0.000002 base(USDC) from RWA2", async () => {
      const baseContract = new ethers.Contract(
        USDC,
        ERC20.abi,
        ethers.provider
      ).connect(issuer);
      const amountToPay =
        0.000002 * 10 ** Number(await baseContract.decimals()); //0.00001 in baseDecimals
      await checkAllowance(baseContract, amountToPay, issuer.address);
      const baseBalanceBefore = await baseContract.balanceOf(issuer.address);
      const repayBase = verifiedMarketsIssuerContract.repayBase(
        securityAssest2,
        amountToPay
      );
      await expect(repayBase)
        .to.emit(verifiedMarketsIssuerContract, "Repaid")
        .withArgs(issuer, USDC, amountToPay);

      //verify base(USDC) balance reduces with right amount
      await verifyTokenBalance(
        baseContract,
        baseBalanceBefore,
        amountToPay,
        false,
        issuer.address
      );

      //verify WETH(collateral) balance increases with right amount??
    });

    it("Should revert if repayBase params are wrong", async () => {
      const amountToPay = 1000000000n;
      await expect(
        verifiedMarketsIssuerContract.repayBase(
          nullAddress, //asset is null address
          amountToPay
        )
      ).to.be.revertedWith("Repaying base : Invalid");

      await expect(
        verifiedMarketsIssuerContract.repayBase(
          securityAssest1,
          0 //amount not greater than 0
        )
      ).to.be.revertedWith("Repaying base : Invalid");

      await expect(
        verifiedMarketsIssuerContract.repayBase(
          bond1, //unrecongnised asset used
          amountToPay
        )
      ).to.be.revertedWith("Repaying base : Invalid asset");
    });
  });
});
