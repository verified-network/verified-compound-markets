
declare module '@verified-network/verified-sdk' {
    export const Bond: typeof import('@verified-network/verified-sdk/dist/abi/payments').Bond;
    export const Compound: typeof import('@verified-network/verified-sdk/dist/abi/loans/compound/VerifiedMarkets.json').Compound;
    export const Token: typeof import('@verified-network/verified-sdk/dist/abi/payments').Token;
}


declare module '@verified-network/verified-sdk/dist/contractAddress' {
    const VerifiedContractAddress: {
        [key: string]: {
            Bond: string;
            Client: string;
            Compound: string;
            Token: string;
            BOND: {
                VBEUR: string;
                VBINR: string;
                VBUSD: string;
                VCCHF: string;
            }
        }
    };
    export = VerifiedContractAddress;
}