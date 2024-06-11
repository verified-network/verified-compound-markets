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
    setIsLoading?: any
}

export const pinataDedicatedGateway = null;

export const pinataDefaultGateway = "https://ipfs.io"

export const subgraphConfig: any = {
    5: {
        subgraphUrl: "https://api.thegraph.com/subgraphs/name/verified-network/payments/"
    },

    1: {
        subgraphUrl: ""
    },

    137: {
        subgraphUrl: ""
    },

    11155111: {
        subgraphUrl: "https://api.thegraph.com/subgraphs/name/verified-network/wallet/",
        explorerUrl: "https://sepolia.etherscan.io/"
    },
    84532: {
        subgraphUrl: "https://api.studio.thegraph.com/query/77016/wallet-base/0.0.6/",
        explorerUrl: "https://sepolia.basescan.org/",
        acceptedCollaterals: {
            "WETH": {
                name: "Wrapped ETH",
                address: "0x4200000000000000000000000000000000000006"
            },
            "BTC": {
                name: "Bitcoin",
                address: ""
            },
            "COMP": {
                name: "Compound Token",
                address: "0x2f535da74048c0874400f0371Fba20DF983A56e2"
            }
        },
        baseToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        cUSDCv3: "0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017",
        cUSDCExt: "0xe28860fBB866751b0c0CB07ce1BA54F467b19B03",
    }
    
}
export const wallectConnectId = "61ff571878e5243b01e3264c14ed54b8"