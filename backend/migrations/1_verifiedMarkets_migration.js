const VerifiedMarkets = artifacts.require("VerifiedMarkets");

module.exports = function(deployer) {
  deployer.deploy(VerifiedMarkets);
};
