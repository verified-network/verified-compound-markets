import axios from "axios";

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
