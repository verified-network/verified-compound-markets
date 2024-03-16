import axios from "axios";

const pinataJwt = import.meta.env.VITE_APP_PINATA_JWT;

export const fetchRwas = async (subgraphUrl: string) => {
  const query = `query {
    rwas{
      id
      issuer{
        id
        name
        accountid
      }
      asset{
        id
        security
        productCategory
        currency
      }
      bond{
        id
        token
        tokenName
        tokenType
      }
      apy
      issuingDocs
      faceValue
    }
  }`;
  return await axios({
    method: "POST",
    url: subgraphUrl,
    data: {
      query: query,
    },
  })
    .then((res: any) => {
      if (res.data.errors) {
        console.error("error while fetching RWAs: ", res.data.errors)
        return [];
      } else {
        return res.data.data.rwas;
      }
    })
    .catch((err: any) => {
      console.error("error while fetching RWAs: ", err)
      return null;
    });
};

export const fetchCollaterals = async (subgraphUrl: string) => {
  const query = `query {
    collaterals{
      id
      issuer{
        id
        name
        accountid
      }
      asset{
        id
        security
        productCategory
        currency
      }
      collateral
      amount
    }
  }`;
  return await axios({
    method: "POST",
    url: subgraphUrl,
    data: {
      query: query,
    },
  })
    .then((res: any) => {
      if (res.data.errors) {
        console.error("error while fetching Collateral: ", res.data.errors)
        return [];
      } else {
        return res.data.data.collaterals;
      }
    })
    .catch((err: any) => {
      console.error("error while fetching Collateral: ", err)
      return null;
    });
};

export const fetchCollaterizedLoans = async (subgraphUrl: string) => {
  const query = `query {
    collaterizedLoans{
      id
      borrower{
        id
        name
        accountid
      }
      base
      amount
    }
  }`;
  return await axios({
    method: "POST",
    url: subgraphUrl,
    data: {
      query: query,
    },
  })
    .then((res: any) => {
      if (res.data.errors) {
        console.error("error while fetching Collaterized Loans: ", res.data.errors)
        return [];
      } else {
        return res.data.data.collaterizedLoans;
      }
    })
    .catch((err: any) => {
      console.error("error while fetching Collaterized Loans: ", err)
      return null;
    });
};

export const fetchCollaterizedLoanRepayments = async (subgraphUrl: string) => {
  const query = `query {
    collaterizedLoanRepayments{
      id
      borrower{
        id
        name
        accountid
      }
      base 
      amount
    }
  }`;
  return await axios({
    method: "POST",
    url: subgraphUrl,
    data: {
      query: query,
    },
  })
    .then((res: any) => {
      if (res.data.errors) {
        console.error("error while fetching Collaterized Loan Repayments: ", res.data.errors)
        return [];
      } else {
        return res.data.data.collaterizedLoanRepayments;
      }
    })
    .catch((err: any) => {
      console.error("error while fetching Collaterized Loan Repayments: ", err)
      return null;
    });
};

export const fetchUserDetails = async(subgraphUrl: string, userAddress: string) => {
  const query = `query {
    users(where: {accountid: ${userAddress}}){
      id
      accountid
      name
      bondIssues{
        id
        token{
          id
          token
          tokenName
          tokenType
        }
        bondName
        issuedAmount 
        collateralCurrency{
          id
          name
        }
        collateralAmount
        issueTime
      }
      bondPurchases{
        id
        purchaser{
          id
          name
          accountid
        }
        token{
          id
          token
          tokenName
          tokenType
        }
        bondName
        purchaseValue
        paidInCurrency{
          id
          name
        }
        purchasedAmount
        purchaseTime
      }
    }
  }`;
  return await axios({
    method: "POST",
    url: subgraphUrl,
    data: {
      query: query,
    },
  })
    .then((res: any) => {
      if (res.data.errors) {
        console.error("error while fetching user details: ", res.data.errors)
        return [];
      } else {
        return res.data.data.users;
      }
    })
    .catch((err: any) => {
      console.error("error while fetching user details: ", err)
      return null;
    });
}

export const pinToIpfs = async (file: File, tokenId: string, chainId: number, sender: string) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify({
      name: `${chainId}-${tokenId}-${sender}-OfferingDocs`,
      description: `Offering Docs for token: ${tokenId}`,
      creator: sender,
      time: Date.now().toString()
    }));
    formData.append("pinataOptions", JSON.stringify({
      cidVersion: 1,
    }));
    const res = await axios({
      method: "POST",
      url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      data: formData
    });
    if (res.data.errors) {
      console.log(
        `Unexpected error while pining file to ipfs: ${JSON.stringify(
          res.data.errors
        )}`
      );
      return null;
    } 
    console.log("file pinned to pinata succesfully with hash: ", res.data.ipfsHash);
    return res.data.ipfsHash;
  } catch (err: any) {
    console.error("Error while pinning file to ipfs: ", err);
    return null;
  }
};