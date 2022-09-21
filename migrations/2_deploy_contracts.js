// (c) Kallol Borah, 2021
// deploying market maker for Kyber

const PrimaryIssueManager = artifacts.require('PrimaryIssueManager');    
const Client = artifacts.require('Client');

const PoolIssueFee = web3.utils.toWei('0.01'); //1%

//const Client = '';
const Liquidity = '0x7d56F166AEA6A34525cC60Cf18e0b52c0ceC234f';//'0x358643DA31fdE65b15839EeC0C72f3dacD07EBeD';//goerli address
const Bridge = '0x19836182a3786CD592523cAB7445325be26c3334';//'0x8cdEFAb2bef4f259a80585efa76b1F9639861e63';
const Factory = '0x08223265869E87dD0f217AFBB94066358eCB671A';//'0x4e5f5b34d8E381da1f121f558Eda0004251ADeCa';//goerli address
const DMMFactory = '0x0639542a5cd99bd5f4e85f58cb1f61d8fbe32de9'; //Ropsten address
const DMMRouter = '0x96E8B9E051c81661C36a18dF64ba45F86AC80Aae'; //Ropsten address

module.exports = function(deployer, network, accounts) {
    
    deployer.deploy(Client);
    
    deployer.deploy(PrimaryIssueManager).then(async () => {
        const client = await Client.deployed();
        await client.initialize(Bridge);
        
        const primarymarketmaker = await PrimaryIssueManager.deployed();

        console.log("Contracts @ PrimaryManager "+primarymarketmaker.address+" Client "+client.address);
        await primarymarketmaker.initialize(DMMFactory, DMMRouter, PoolIssueFee, Factory, Liquidity, client.address, Bridge);
        //console.log("Contracts @ PrimaryManager "+primarymarketmaker.address+" Client "+Client);
        //await primarymarketmaker.initialize(DMMFactory, DMMRouter, PoolIssueFee, Factory, Liquidity, Client, Bridge);  
    });

}




