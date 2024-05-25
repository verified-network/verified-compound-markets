export const CurrenciesToBondMapping: any = {
    "USD": "VBUSD",
    "EUR": "VBEUR",
    "INR": "VBINR",
    "AUD": "VBAUD",
    "GBP": "VBGBP",
    "NGN": "VBNGN"
};

export interface ComponentDefaultprops {
    web3?: any,
    chainId?: number,
    account?: string,
    signer?: any
    page?: string,
    setPage?: any
}

export const pinataDedicatedGateway = null;

export const pinataDefaultGateway = "https://ipfs.io"

export const subgraphConfig: any = {
    5: {
        subgraphUrl: "https://api.thegraph.com/subgraphs/name/verified-network/payments/"
    },

    1: {
        subgraphUrl: ""
    }
}
export const wallectConnectId = "61ff571878e5243b01e3264c14ed54b8"