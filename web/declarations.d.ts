declare module '@verified-network/verified-sdk/dist/contractAddress' {
    const VerifiedContractAddress: {
        [key: string]: {
            Bond: string;
            Client: string;
            Compound: string
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
// declare module '@verified-network/verified-sdk/dist';