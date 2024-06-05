// Deployment of Compound markets
// (c) Kallol Borah, 2021

const Compound = artifacts.require('VerifiedMarkets');

const cUSDCv3 = '0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017';
const cWETHv3 = '0x61490650AbaA31393464C3f34E8B29cd1C44118E';

module.exports = async function (deployer) {

    deployer.deploy(Compound, cUSDCv3).then(async () => {
        await deployer.deploy(Compound, cWETHv3);
    })
};