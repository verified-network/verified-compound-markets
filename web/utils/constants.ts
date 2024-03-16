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
    chainId: number | null
    account: string | null
    signer: any
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