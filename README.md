# Comet Extension for Verified Markets

The Verified Markets extension enables real world asset (RWA) owners and managers to borrow liquidity from the Compound protocol. It also enables Compound users to stake collateral for RWAs on Compound and benefit from additional returns that RWAs generate. The [Verified Markets specification is here](https://github.com/verified-network/verified-compound-markets/tree/master/docs/Verified_Compound_Markets_v1.pdf).

The operator code is built with [Truffle](https://archive.trufflesuite.com/docs/), and the web extension code is built on [React](https://reactjs.org/) using [Vite](https://vitejs.dev/).

## Getting Started With The Frontend(Web Dapp)


1. First, install [NodeJS](https://nodejs.org/en/download/package-manager/) and [yarn](https://yarnpkg.com/).
   
2. Install dependencies by running:
```
yarn install
```
3. Start the web Dapp by running:
```
yarn start
or
yarn web:dev
```
This should spawn a web server at an address such as http://localhost:5183. Visit the page to interact with the web dapp.

A few notes:
- `Yarn` is required and used to install dependencies and start the frontend not `npm`
- Any changes to web source code should auto-reload.


  	##Frontend(Web Dapp) Workflow

    From the url:
    [Official Url](https://verified-markets.web.app/)
          or
    [Localhost Url](http://localhost:5183)
    
    Users have access to 2 different pages:
    1. The Investor Page: also the landing/home page. ends with `/` and includes a table showing all Bonds issued which investors can   purchase with collaterals that are accepted on compound. Investors can also reclaim collateral by liquidating bonds if issuers failed to repay them.
       
    2. The Issuer Page: ends with `/issue` allows issuers to issue bonds using RWA tokens as collateral. Once the bonds are sold to investors, issuers can borrow USDC or Ether from compound. Issuers can also redeem bonds by repaying investors.


## License

MIT License
