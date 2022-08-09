// (c) Kallol Borah, 2021
// deploying market maker for Kyber

const PrimaryIssueManager = artifacts.require('PrimaryIssueManager');                   
const Client = artifacts.require('Client');

const PoolIssueFee = web3.utils.toWei('0.01'); //1%

const Liquidity = '0x358643DA31fdE65b15839EeC0C72f3dacD07EBeD';//'0x4F463b023CAb22242ac5131a16074B417b80ceB6';
const Bridge = '0x19836182a3786CD592523cAB7445325be26c3334';//'0x8cdEFAb2bef4f259a80585efa76b1F9639861e63';
const Factory = '0x4e5f5b34d8E381da1f121f558Eda0004251ADeCa';//'0x59029834a584CfC623E46839b6b1AF82087B95f0';
const DMMFactory = '0x0639542a5cd99bd5f4e85f58cb1f61d8fbe32de9'; //Ropsten address
const DMMRouter = '0x96E8B9E051c81661C36a18dF64ba45F86AC80Aae'; //Ropsten address

module.exports = function(deployer, network, accounts) {
    
    deployer.deploy(Client);

    deployer.deploy(PrimaryIssueManager).then(async () => {
        const primarymarketmaker = await PrimaryIssueManager.deployed();
        const client = await Client.deployed();

        console.log("Contracts @ PrimaryManager "+primarymarketmaker.address+" Pool factory "+PrimaryIssuePoolFactory+" Client "+client.address);
        await primarymarketmaker.initialize(DMMFactory, DMMRouter, PoolIssueFee, Factory, Liquidity, client.address, Bridge);  
        await client.initialize(Bridge);
    });

}




