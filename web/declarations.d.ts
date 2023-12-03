declare module '@verified-network/verified-sdk/dist/contractAddress' {
    const VerifiedContractAddress: {
        [key: string]: {
            Bond: string;
            Client: string;
            Compound: string

        }
    };
    export = VerifiedContractAddress;
}