import axios from "axios";
import { TableRow } from "../providero";
import { ERC20 } from "@verified-network/verified-sdk";
import { resolve } from "path";
import { promises } from "dns";

const pinataJwt = import.meta.env.VITE_APP_PINATA_JWT;

export const fetchTokens = async (subgraphUrl: string, web3: any, signer: any) => {
  const query = `query {
    tokens{
      id
      token
      tokenName 
      tokenType
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
        collateralCurrency
        collateralAmount
        issueTime   
      }
      bondPurchases{
        id
        token{
          id
          token
          tokenName
          tokenType
        }
        bondName
        purchaseValue
        paidInCurrency
        purchasedAmount 
        purchaseTime
      }
      bondRedemptions{
        id
        token{
          id
          token
          tokenName
          tokenType
        }
        bondName
        redeemedValue
        redemptionCurrency
        redemptionAmount 
      }
      bondLiquidations{
        id
        token{
          id
          token
          tokenName
          tokenType
        }
        liquidatedValue
        bondName
        liquidationCurrency
        liquidatedAmount  
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
        console.error("error while fetching Tokens: ", res.data.errors)
        return []
      } else {
        const allTokens = res.data.data.tokens;
        let data: any[] = [];
        allTokens.map(async(tokens: any) => {
          tokens.bondIssues.map(async (bond: any) => {
            // console.log("tokens: ", tokens, "bonds: ", bond)
            data.push({
              "Asset": web3.utils.hexToAscii(bond.bondName.toString()).replace(/\0/g, ""),
              "Issuer": bond.issuer? web3.utils.hexToAscii(bond.issuer.name.toString()).replace(/\0/g, ""): "",
              "Collateral": web3.utils.hexToAscii(bond.collateralCurrency.toString().replace(/\0/g, "")).replace(/\0/g, ""),
              "CollateralName": bond.collateralCurrency.toString(),
              "CollateralAddress": bond.collateralCurrency?.id ? bond.collateralCurrency.id.toString() : "",
              "BondTokenAddress": tokens.token.toString(),
              // "APY": bond.issuedAmount.toString(),
              'Currency': web3.utils.hexToAscii(bond.bondName.toString()).replace(/\0/g, "").replace("VB", ""),
              'Face Value': bond.issuedAmount.toString() === "0"?  bond.issuedAmount.toString(): web3.utils.fromWei(bond.issuedAmount.toString(), "ether"),
              "Issued Value": bond.issuedAmount.toString() === "0"?  bond.issuedAmount.toString(): web3.utils.fromWei(bond.issuedAmount.toString(), "ether"),
              "Borrowed": tokens.bondPurchases.map((prch: any) =>{ return Number(web3.utils.fromWei(prch.purchasedAmount.toString(), "ether"))}).reduce((a:number , c: number) => {
                return a + c
              }, 0),
              "Sold Value": tokens.bondPurchases.map((prch: any) =>{ return Number(web3.utils.fromWei(prch.purchasedAmount.toString(), "ether"))}).reduce((a:number , c: number) => {
                return a + c
              }, 0),
              // 'Issuing Docs': "",
              "Collateral Posted": bond.collateralAmount.toString() === "0"?  bond.collateralAmount.toString()
              : web3.utils.fromWei(bond.collateralAmount.toString(), "ether"),
              "Status": tokens.bondRedemptions.filter((rmdBond: any) => rmdBond.id.toLowerCase() === bond.id.toLowerCase())?.redemptionAmount == bond.collateralAmount || 
                tokens.bondLiquidations.filter((lqdBond: any) => lqdBond.id.toLowerCase() === bond.id.toLowerCase())?.liquidatedAmount ==  bond.collateralAmount ? "Inactive" : "Active",
              "Action": "",
            })
          })
        
        })
        return data
      }
      
    })
    .catch((err: any) => {
      console.error("error while fetching Tokens: ", err)
      return []
    })
};

export const fetchRwas = async (subgraphUrl: string, web3: any, signer: any) => {
  const query = `query {
    rwas{
      id
      issuer{
        id
        name
        accountid
        country
        bondIssues{
          id
        }
      }
      bond{
        id
        token
        tokenName
        tokenType
        bondIssues{
          id
          collateralAmount
          collateralCurrency
          issuedAmount
          bondName
        }
        bondPurchases{
        id
        token{
          id
          token
          tokenName
          tokenType
        }
        bondName
        purchaseValue
        paidInCurrency
        purchasedAmount 
        purchaseTime
      }
      bondRedemptions{
        id
        token{
          id
          token
          tokenName
          tokenType
        }
        bondName
        redeemedValue
        redemptionCurrency
        redemptionAmount 
      }
      bondLiquidations{
        id
        token{
          id
          token
          tokenName
          tokenType
        }
        liquidatedValue
        bondName
        liquidationCurrency
        liquidatedAmount  
      }
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
        console.error("error while fetching Rwas: ", res.data.errors)
        return []
      } else {
        const allRwas = res.data.data.rwas;
        // console.log("res...: ", allRwas)
        let data: any[] = [];
        allRwas.map((rwa: any) => {
          rwa.bond.bondIssues.map((bond: any) => {
            const borrowed = rwa.bond.bondPurchases.map((prch: any) =>{ return Number(web3.utils.fromWei(prch.purchasedAmount.toString(), "ether"))}).reduce((a:number , c: number) => {
              return a + c
            }, 0);
            data.push({
                "Asset": web3.utils.hexToAscii(bond.bondName?.toString()).replace(/\0/g, ""),
                "Issuer": rwa.issuer? web3.utils.hexToAscii(rwa.issuer.name.toString()).replace(/\0/g, ""): "",
                "IssuerAddress": rwa.issuer? rwa.issuer.id.toString() : "",
                "IssuerCountry": rwa.issuer? web3.utils.hexToAscii(rwa.issuer.country.toString()).replace(/\0/g, ""): "",
                "IssuerTotalIssues": rwa.issuer? rwa.issuer.bondIssues.length.toString(): "0",
                "IssuerTotalIssuesBorrowed": allRwas.filter((_rwa: any) => _rwa.issuer.id === rwa.issuer.id).map((irwa: any) =>{
                  return irwa.bond.bondPurchases.map((prch: any) =>{ return Number(web3.utils.fromWei(prch.purchasedAmount.toString(), "ether"))}).reduce((a:number , c: number) => {
                    return a + c
                  }, 0)
                }).reduce((y:number , z: number) => {
                  return y + z
                }, 0),
                "IssuerTotalIssuesRepaid": "0", //Todo: update this
                "Collateral": web3.utils.hexToAscii(bond.collateralCurrency.toString()).replace(/\0/g, ""),
                "CollateralName": bond.collateralCurrency.toString(),
                "InvestorsCollateral": bond.collateralCurrency.toString(),
                "BondTokenAddress": rwa.bond.token.toString(),
                // "Face Value": rwa.faceValue.toString() === "0" ? rwa.faceValue.toString() : web3.utils.fromWei(rwa.faceValue.toString(), "ether"),
                'Currency': web3.utils.hexToAscii(bond.bondName.toString()).replace(/\0/g, "").replace("VB", ""),
                'APY': rwa.apy.toString() === "0"? rwa.apy.toString() : web3.utils.fromWei(rwa.apy.toString(), "ether"),
                "Issued Value": bond.issuedAmount.toString() === "0"?  bond.issuedAmount.toString(): web3.utils.fromWei(bond.issuedAmount.toString(), "ether"),
                'Issuing Docs': rwa.issuingDocs.toString().substring(0, 15) + "..." + rwa.issuingDocs.toString().substring(rwa.issuingDocs.toString().length - 5, rwa.issuingDocs.toString().length),
                "DocUrl": rwa.issuingDocs.toString(),
                "Borrowed": borrowed === 0 ? borrowed: borrowed.toFixed(6),
                "Borrowers": rwa.bond.bondPurchases.length,
                "Repaid": "0", //Todo: update this
                "Sold Value": borrowed === 0 ? borrowed: borrowed.toFixed(6),
                "Collateral Posted": bond.collateralAmount.toString() === "0"?  bond.collateralAmount.toString()
                : web3.utils.fromWei(bond.collateralAmount.toString(), "ether"),
                "Status": rwa.bond.bondRedemptions.filter((rmdBond: any) => rmdBond.id.toLowerCase() === bond.id.toLowerCase())?.redemptionAmount == bond.collateralAmount || 
                rwa.bond.bondLiquidations.filter((lqdBond: any) => lqdBond.id.toLowerCase() === bond.id.toLowerCase())?.liquidatedAmount ==  bond.collateralAmount ? "Inactive" : "Active",
                "Action": "",
              })
          })
        
        
        })
        return data
      }
      
    })
    .catch((err: any) => {
      console.error("error while fetching Rwa: ", err)
      return []
    })
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
    console.log("file pinned to pinata succesfully with hash: ", res.data.IpfsHash);
    return res.data.IpfsHash;
  } catch (err: any) {
    console.error("Error while pinning file to ipfs: ", err);
    return null;
  }
};