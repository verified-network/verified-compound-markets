const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const cUSDCv3 = "0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017"; //cUSDCV3 on base sepolia

module.exports = buildModule("VerifiedMarketsModule", (m) => {
  const comet = m.getParameter("comet", cUSDCv3);

  const verifiedMarkets = m.contract("VerifiedMarkets", [comet]);

  return { verifiedMarkets };
});
