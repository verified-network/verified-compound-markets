const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const cUSDCv3 = "0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e"; //cUSDCV3 on sepolia

module.exports = buildModule("VerifiedMarketsModule", (m) => {
  const comet = m.getParameter("comet", cUSDCv3);

  const verifiedMarkets = m.contract("VerifiedMarkets", [comet]);

  return { verifiedMarkets };
});
