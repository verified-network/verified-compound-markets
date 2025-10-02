import axios from "axios";
import { ethers } from "ethers";
import { CID } from "multiformats/cid";
import { base58btc } from "multiformats/bases/base58";
import { create } from "multiformats/hashes/digest";
import Web3 from "web3";

const generalPoolsField = `id
            address
            poolType
            isPaused
            swapFee
            tokensList
            totalLiquidity
            totalSwapVolume
            totalSwapFee
            totalShares
            security
            securityType
            currency
            collateral
            cficode
            margin
            securityOffered
            balancerManager
            minOrderSize
            owner
            factory
            cutoffTime
            offeringDocs
            amp
            createTime
            minimumOrderSize
            minimumPrice
            swapEnabled
            orderBook
            secondaryTrades{
                amount
                price
                executionDate
                orderType
                orderReference
                counterparty {
                    id
                }
                party {
                    id
                }
            }
            secondaryPreTrades {
                id
                pool {
                    id
                }
                party {
                    id
                }
                counterparty {
                    id
                }
                executionDate
            }
            tokens {
                assetManager
                symbol
                name
                decimals
                index
                address
                oldPriceRate
                priceRate
                balance
                paidProtocolFees
                cashBalance
                managedBalance
            }
            orders {
                id
                pool {
                  id
                  address
                  security
                  currency
                  tokens {
                    symbol
                    name
                    decimals
                    index
                    address
                  }
                  tokensList
                }
                tokenIn {
                    address
                }
                tokenOut {
                    address
                }
                amountOffered
                priceOffered
                orderReference
                creator
                timestamp
            } 
            primarySubscriptions{
                subscription
                price
                executionDate
                assetIn{
                  address
                }
                assetOut{
                  address
                }
                investor{
                id
                }
              executionDate
            }
            marginOrders {
                id
                pool {
                  id
                  address
                  security
                  currency
                  margin
                  tokensList
                  tokens {
                    symbol
                    name
                    decimals
                    index
                    address
                  }
                }
                creator
                tokenIn {
                    id
                    symbol
                    name
                    decimals
                    address
                }
                tokenOut {
                    id
                    symbol
                    name
                    decimals
                    address
                }
                amountOffered
                priceOffered
                stoplossPrice
                timestamp
                orderReference
}`;

const generalSecurityField = `security
  isin
  id
  issuer {
    id
    name
  }
  currency
  country
  restricted
  restrictions
  issueManager
  productCategory
  liquidityOffered {
    offered
    offeredBy {
      id
    }
    tomatch {
      id
    }
    isin
    amount
    desired
    minimum
    orderSize
    offeringDocs
  }
  liquidityProviders {
    owner {
      id
    }
    tokenOffered
    security {
      id
    }
    currency
    underwritten
    earned
  }
  primarySubscribers {
    id
    pool
    currency
    security {
      id
    }
    cashSwapped
    investor {
      id
    }
    securitySwapped
    timestamp
    bought
  }
  secondaryInvestors {
    id
    currency
    security {
      id
    }
    amount
    investor {
      id
    }
    issuer {
      id
    }
    price
    timestamp
    tradeRef
    DPID
  }
  trades {
    poolid
    transferor {
      id
    }
    transferee {
      id
    }
    timestamp
    unitsToTransfer
    amountPaid
    price
    settlementStatus
    tradingCommission
    tradeRef
  }
  subscriptionsClosed {
    timestamp
  }
  primarySettlements {
    liquidityProvider {
      id
    }
    underwritingFee
    issuer {
      id
    }
    subscription
    currency
  }
  marginTraders{
    id
    security {
      id
      security
    }
    securityTraded
    currency
    cashTraded
    orderRef
    timestamp
  }
  primaryAllotments{
    investor {
      id
    }
    currency
    security {
      id
    }
    allotedAmount
    securitySubscribed
    timestamp
  }
  subscriptionsClosed {
    timestamp
  }
  primaryRefunds {
    investor {
      id
    }
    securitySubscribed
    refundAmount
    currency
    timestamp
  }
  resolutions{
    security{
      id
    }
    recordDate
    resolution
    voting
  }
  snapshots{
    security {
      id
    }
    oldTime
    newTime
}
`;

const chainDetails = {
  //0 is the default chain when users are not connected to fetch and display data
  0: {
    chainId: 8453,
    name: "Base Mainnet",
    vaultSubgraphUrl: `https://gateway.thegraph.com/api/b8a85dbf6f1f1111a5d83b479ee31262/subgraphs/id/HESgHTG2RE8F74MymKrdXKJw2u4s8YBJgbCjHuzhpXeC`,
    walletSubgraphUrl: `https://gateway.thegraph.com/api/b8a85dbf6f1f1111a5d83b479ee31262/subgraphs/id/2aGD2WDR6ncrTvGU4wEaME2Ywke1ookuNucMNJmcnrz5`,
    rpcUrl: `https://base-mainnet.public.blastapi.io`,
  },

  1: {
    chainId: 1,
    name: "Ethereum",
    vaultSubgraphUrl:
      "https://api.studio.thegraph.com/query/77016/vault-mainnet/version/latest",
    walletSubgraphUrl: `https://api.studio.thegraph.com/query/77016/wallet-mainnet/version/latest`,
  },
  100: {
    chainId: 100,
    name: "Gnosis",
    vaultSubgraphUrl:
      "https://api.studio.thegraph.com/query/77016/vault-gnosis/version/latest",
    walletSubgraphUrl:
      "https://api.studio.thegraph.com/query/77016/wallet-gnosis/version/latest",
  },
  8453: {
    chainId: 8453,
    name: "Base Mainnet",
    vaultSubgraphUrl: `https://gateway.thegraph.com/api/b8a85dbf6f1f1111a5d83b479ee31262/subgraphs/id/HESgHTG2RE8F74MymKrdXKJw2u4s8YBJgbCjHuzhpXeC`,
    walletSubgraphUrl: `https://gateway.thegraph.com/api/b8a85dbf6f1f1111a5d83b479ee31262/subgraphs/id/2aGD2WDR6ncrTvGU4wEaME2Ywke1ookuNucMNJmcnrz5`,
  },
  11155111: {
    chainId: 11155111,
    name: "Sepolia Test Network",
    vaultSubgraphUrl: `https://gateway.thegraph.com/api/b8a85dbf6f1f1111a5d83b479ee31262/subgraphs/id/BZYwDU6CtLq1GBwCaGUZBU4KcQk9CAtPDkEY4LAKfoJN`,
    walletSubgraphUrl: `https://gateway.thegraph.com/api/b8a85dbf6f1f1111a5d83b479ee31262/subgraphs/id/6Qxzqb6J12vxKqgaGmCopuQH6bzGhAzYz45bRzPs2EiG`,
  },
};

const PoolType = {
  primaryPool: "PrimaryIssue",
  secondaryPool: "SecondaryIssue",
  marginPool: "MarginIssue",
};

const securityCategoriesAlias = {
  stock: "Fixed Income Products",
  bond: "Fixed Income Products",
  funds: "Fixed Income Products",
  cfd: "Derivatives",
  amc: "Active Managed Certificates",
};

const currenciesToFiat = {
  USDC: "USD",
  USDT: "USD",
  DAI: "USD",
  ETH: "ETH",
};

const tokenGcexAlias = {
  SHIB: "SHB",
  SAND: "SND",
  GLMR: "GLM",
  COMP: "CMP",
  LINK: "LNK",
};

const convertFromBlockTimestamp = (blockTimestamp) => {
  const unixTime = new Date(Number(blockTimestamp) * 1000);
  return unixTime.toLocaleDateString("default");
};

const formatNumberWithUnits = (numberToFormat, decimals) => {
  const units = ["", "K", "M", "B", "T", "P"];
  let unitIdx = 0;

  for (
    numberToFormat;
    Number(numberToFormat) >= 1000 && unitIdx < units.length - 1;
    unitIdx++
  ) {
    numberToFormat = Number(numberToFormat) / 1000;
  }

  if (decimals === undefined) {
    return Number(numberToFormat).toFixed(2) + units[unitIdx];
  } else if (Number(decimals) === 0) {
    return numberToFormat + units[unitIdx];
  } else if (Number(decimals) > 0) {
    return Number(numberToFormat).toFixed(decimals) + units[unitIdx];
  }
};

const getIpfsUrlFromHash = (ipfsHash) => {
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
};

const readIpfsDocumentFromHash = async (ipfsHash) => {
  try {
    return await axios({
      method: "GET",
      url: getIpfsUrlFromHash(ipfsHash),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }).then((res) => {
      return res.data;
    });
  } catch (err) {
    console.error("Error while reading ipfs file: ", err?.message);
    return {};
  }
};

const hexToUint8Array = (hex) => {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

const convertBytes32ToIpfsHash = (bytes32) => {
  const digestBytes = hexToUint8Array(bytes32);
  const multihash = create(0x12, digestBytes);
  const cid = CID.createV0(multihash);
  return cid.toString(base58btc);
};

const fetchTokenPriceFromVerified = async (
  cfiCode,
  securitySymbol,
  currencyFiatSymbol,
  priceType
) => {
  const url = `https://gateway.verified.network/api/${cfiCode.toLowerCase()}?security=${securitySymbol?.toUpperCase()}&cash=${currencyFiatSymbol?.toUpperCase()}&type=${
    priceType?.toUpperCase() || "BUY"
  }`;
  return await axios({
    method: "GET",
    url: url,
  })
    .then((res) => {
      if (res?.data?.body?.price) {
        return res?.data?.body?.price;
      } else {
        return "0";
      }
    })
    .catch(() => {
      return "0";
    });
};

/**
 *
 * @param {string} subgraphUrl
 * @param {string} query
 * @param {string} queryEntity
 * @param {any} defaultReturn
 * @returns {Promise<any>}
 */

const sendSubgraphQuery = async (
  subgraphUrl,
  query,
  queryEntity,
  defaultReturn
) => {
  if (!subgraphUrl || !query || !queryEntity || !defaultReturn) {
    console.error(
      "Invalid subgraph query parameters, check subgraphUrl, query, queryEntity and defaultReturn"
    );
    return defaultReturn;
  }

  try {
    const res = await axios.post(subgraphUrl, { query });

    if (res?.data?.data && res.data.data[queryEntity]) {
      return res.data.data[queryEntity];
    }

    return defaultReturn;
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn(
        `sendSubgraphQuery for entity: "${queryEntity}" on subgraph url: ${subgraphUrl} hit rate limit`
      );
    } else {
      console.error(
        `sendSubgraphQuery for entity: "${queryEntity}" on subgraph url: ${subgraphUrl} failed with error: ${
          err?.response?.data || err?.message || err
        }`
      );
    }
    return defaultReturn;
  }
};

/**
 *
 * @param {number} chainId
 * @returns {string} latest wallet subgraph url
 */
const getWalletSubgraphUrl = (chainId) => {
  return chainDetails[chainId].walletSubgraphUrl;
};

/**
 *
 * @param {number} chainId
 * @returns {string} latest vault subgraph url
 */
const getVaultSubgraphUrl = (chainId) => {
  return chainDetails[chainId]?.vaultSubgraphUrl;
};

/**
 *
 * @param {number} chainId
 * @param {string} securityAddress
 * @returns {promise<any[]>} fetch security by address
 */
const fetchSecurityByAddress = async (chainId, securityAddress) => {
  const query = `query{
    securities: securities(
        where: {
        security: "${securityAddress.toLowerCase()}"
        }
    ) {
        ${generalSecurityField}
    }
}`;
  return await sendSubgraphQuery(
    getWalletSubgraphUrl(chainId),
    query,
    "securities",
    []
  );
};

/**
 *
 * @param {number} chainId
 * @returns {promise<any[]>} margin pools
 */
const fetchMarginPools = async (chainId) => {
  const query = `query {
            pools: pools( 
              orderBy: createTime
              orderDirection: desc
              where: {
                poolType: "MarginIssue"
              }
            ) {
               ${generalPoolsField} 
            }
          }`;
  return await sendSubgraphQuery(
    getVaultSubgraphUrl(chainId),
    query,
    "pools",
    []
  );
};

/**
 *
 * @param {number} chainId
 * @param {string[]} acceptedPoolTypesArray string formatted array of poolType e.g ["PrimaryIssue", "SecondaryIssue"]
 * @returns {promise<any[]>} all pools
 */
const fetchCustomPools = async (chainId, acceptedPoolTypesArray) => {
  const query = `query {
    pools: pools( 
      orderBy: createTime
      orderDirection: desc
      where: {
        poolType_in: ${acceptedPoolTypesArray}
      }
    ) {
       ${generalPoolsField} 
    }
  }`;
  return await sendSubgraphQuery(
    getVaultSubgraphUrl(chainId),
    query,
    "pools",
    []
  );
};

const reduceOrdersUnified = (orders, key = "creator") =>
  orders.reduce(
    (acc, curr) => {
      const id = curr[key]?.toLowerCase?.();
      if (id && !acc.investors.has(id)) acc.investors.add(id);
      acc.totalAmount += Number(curr.amountOffered ?? curr.subscription ?? 0);
      acc.latestDate = Math.max(
        acc.latestDate,
        Number(curr.executionDate || 0)
      );
      acc.latestPrice = Number(curr.price ?? 0);
      return acc;
    },
    { totalAmount: 0, investors: new Set(), latestDate: 0, latestPrice: 0 }
  );

const getPriceFromTraders = (traders, currencyDecimals, securityDecimals) =>
  traders
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .map((t) => {
      const [month, day, year] = convertFromBlockTimestamp(t.timestamp)
        .split("/")
        .map(Number);
      const price =
        Number(ethers.utils.formatUnits(t.cashTraded, currencyDecimals)) /
        Number(ethers.utils.formatUnits(t.securityTraded, securityDecimals));
      return [Date.UTC(year, month - 1, day), Number(price.toFixed(6))];
    });

const getOfferingDocData = async (ipfsHash) => {
  const validHash = ipfsHash?.find(
    (rest) =>
      !rest.endsWith("0000") && convertBytes32ToIpfsHash(rest)?.length > 0
  );
  const convertedHash = validHash ? convertBytes32ToIpfsHash(validHash) : null;
  return convertedHash ? await readIpfsDocumentFromHash(convertedHash) : null;
};

const maybeDelay = async (shouldDelay, delayTime) => {
  if (shouldDelay)
    await new Promise((res) => setTimeout(res, Number(delayTime)));
};

async function* getAMCAndFixedIncomeProducts(
  chainId,
  shouldDelay = false,
  delayTime = 1000
) {
  try {
    const allPoolsRaw = await fetchCustomPools(
      chainId,
      JSON.stringify([PoolType.primaryPool, PoolType.secondaryPool])
    );

    const securityDetailMap = new Map();

    for (const pool of allPoolsRaw) {
      try {
        let fetchedSecurityDetails = securityDetailMap.get(pool.security);

        if (!fetchedSecurityDetails) {
          const details = await fetchSecurityByAddress(chainId, pool.security);
          if (!details?.length || details[0].subscriptionsClosed?.length > 0) {
            // Skip if no details or subscriptions are closed
            continue;
          }
          securityDetailMap.set(pool.security, details);
          fetchedSecurityDetails = details;
        }

        const securityCategory = ethers.utils.parseBytes32String(
          fetchedSecurityDetails[0].productCategory
        );
        if (!securityCategory) continue;

        const securityDetails = pool.tokens.find(
          (t) => t.address === pool.security
        );
        const currencyDetails = pool.tokens.find(
          (t) => t.address === pool.currency
        );

        if (!securityDetails || !currencyDetails) continue;

        let totalBought = 0;
        let totalSold = 0;
        let prices = [];
        let priceChartData = [];
        let currentPrice = "0.00";
        let offeringDocData = null;

        if (pool.poolType === PoolType.primaryPool) {
          const buyOrders = pool.primarySubscriptions.filter(
            (ord) => ord.assetIn.address === pool.currency
          );
          const sellOrders = pool.primarySubscriptions.filter(
            (ord) => ord.assetIn.address === pool.security
          );

          const buyStats = reduceOrdersUnified(buyOrders, "investor.id");
          const sellStats = reduceOrdersUnified(sellOrders, "investor.id");

          totalBought = buyStats.totalAmount;
          totalSold = sellStats.totalAmount;

          prices = (fetchedSecurityDetails[0]?.primarySubscribers || [])
            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
            .map((sub) => {
              const [mm, dd, yyyy] = convertFromBlockTimestamp(sub.timestamp)
                .split("/")
                .map(Number);
              const cash = Number(
                ethers.utils.formatUnits(
                  sub.cashSwapped,
                  currencyDetails.decimals
                )
              );
              const security = Number(
                ethers.utils.formatUnits(
                  sub.securitySwapped,
                  securityDetails.decimals
                )
              );
              const price = cash / security;

              if (securityCategory.toLowerCase() === "amc") {
                priceChartData.push({
                  time: sub.timestamp,
                  value: Number(price.toFixed(6)),
                });
              }

              return [Date.UTC(yyyy, mm - 1, dd), Number(price.toFixed(6))];
            });

          currentPrice = prices.length ? prices[0][1] : "0.00";
          offeringDocData = await readIpfsDocumentFromHash(pool.offeringDocs);
        } else if (pool.poolType === PoolType.secondaryPool) {
          const buyOrders = pool.orders.filter(
            (ord) => ord.tokenIn.address === pool.currency
          );
          const sellOrders = pool.orders.filter(
            (ord) => ord.tokenIn.address === pool.security
          );

          const buyStats = reduceOrdersUnified(buyOrders, "creator");
          const sellStats = reduceOrdersUnified(sellOrders, "creator");

          totalBought = buyStats.totalAmount;
          totalSold = sellStats.totalAmount;

          prices = (fetchedSecurityDetails[0]?.secondaryInvestors || [])
            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
            .map((inv) => {
              const [mm, dd, yyyy] = convertFromBlockTimestamp(inv.timestamp)
                .split("/")
                .map(Number);
              return [
                Date.UTC(yyyy, mm - 1, dd),
                Number(ethers.utils.formatEther(inv.price)).toFixed(6),
              ];
            });

          currentPrice = prices.length ? prices[0][1] : "0.00";

          offeringDocData = await getOfferingDocData(
            fetchedSecurityDetails[0]?.restrictions
          );
        }

        const chartData =
          priceChartData.length > 0
            ? Array.from(
                new Map(priceChartData.map((p) => [p.time, p])).values()
              ).reverse()
            : null;

        const formattedPool = {
          id: pool.id,
          type: pool.poolType,
          priceChartData: chartData,
          name: securityDetails.name,
          symbol: securityDetails.symbol,
          logo:
            offeringDocData?.Business?.Logo ||
            offeringDocData?.Business?.Icon ||
            "",
          apy: offeringDocData?.Business?.Apy
            ? `${offeringDocData.Business.Apy}%`
            : "0%",
          securityCategory,
          category: securityCategoriesAlias[securityCategory.toLowerCase()],
          pairName: currencyDetails.name,
          pairSymbol: currencyDetails.symbol,
          price: currentPrice,
          prices,
          tvl:
            totalBought + totalSold > 0
              ? formatNumberWithUnits(totalBought + totalSold)
              : "0",
        };

        yield formattedPool;
        await maybeDelay(shouldDelay, delayTime);
      } catch (poolError) {
        console.warn(
          `Failed to process pool ${pool.id}: ${poolError?.message}`
        );
      }
    }
  } catch (err) {
    console.error("getAMCAndFixedIncomeProducts failed:", err?.message);
  }
}

async function* getDerivatives(chainId, shouldDelay = false, delayTime = 1000) {
  try {
    const allPoolsRaw = await fetchMarginPools(chainId);
    const securityDetailMap = new Map();

    for (const pool of allPoolsRaw) {
      if (pool.poolType !== PoolType.marginPool) continue;

      try {
        let fetchedSecurityDetails = securityDetailMap.get(pool.security);
        if (!fetchedSecurityDetails) {
          const details = await fetchSecurityByAddress(chainId, pool.security);
          if (!details?.length || details[0].subscriptionsClosed?.length > 0)
            continue;
          securityDetailMap.set(pool.security, details);
          fetchedSecurityDetails = details;
        }

        const securityCategory = ethers.utils.parseBytes32String(
          fetchedSecurityDetails[0].productCategory
        );
        if (!securityCategory) continue;

        const securityDetails = pool.tokens.find(
          (t) => t.address === pool.security
        );
        const currencyDetails = pool.tokens.find(
          (t) => t.address === pool.currency
        );
        if (!securityDetails || !currencyDetails) continue;

        const buyOrders = pool.marginOrders.filter(
          (ord) => ord.tokenIn.address === pool.currency
        );
        const sellOrders = pool.marginOrders.filter(
          (ord) => ord.tokenIn.address === pool.security
        );

        const buyStats = reduceOrdersUnified(buyOrders);
        const sellStats = reduceOrdersUnified(sellOrders);

        const prices = getPriceFromTraders(
          fetchedSecurityDetails[0]?.marginTraders || [],
          currencyDetails.decimals,
          securityDetails.decimals
        );

        const currencyFiat = currencyDetails?.symbol
          ?.toLowerCase()
          ?.startsWith("vc")
          ? currenciesToFiat[
              currencyDetails?.symbol
                ?.toLowerCase()
                .replace("vc", "")
                .toUpperCase()
            ]
          : currenciesToFiat[
              currencyDetails?.symbol?.toLowerCase()?.toUpperCase()
            ];

        const web3 = new Web3(chainDetails[0]?.rpcUrl);

        const cficodeDecoded = ethers.utils.parseBytes32String(
          pool.cficode || ""
        );
        const cficodeSymbol = cficodeDecoded.toLowerCase().startsWith("0x")
          ? web3.utils.toAscii(cficodeDecoded)
          : cficodeDecoded;

        const currentPrice = pool.cficode
          ? await fetchTokenPriceFromVerified(
              cficodeSymbol,
              tokenGcexAlias[securityDetails?.symbol?.toUpperCase()] ||
                securityDetails?.symbol,
              currencyFiat,
              "BUY"
            )
          : prices.length
          ? prices[0][1]
          : "0.00";

        const offeringDocData = await getOfferingDocData(
          fetchedSecurityDetails[0]?.restrictions
        );

        const priceChartData = Array.from(
          new Map(
            prices.map(([time, value]) => [time, { time, value }])
          ).values()
        ).reverse();

        const formattedPool = {
          id: pool.id,
          type: pool.poolType,
          priceChartData: priceChartData.length ? priceChartData : null,
          name: securityDetails.name,
          symbol: securityDetails.symbol,
          logo:
            offeringDocData?.Business?.Logo ||
            offeringDocData?.Business?.Icon ||
            "",
          apy: offeringDocData?.Business?.Apy
            ? `${offeringDocData.Business.Apy}%`
            : "0%",
          securityCategory,
          category: securityCategoriesAlias[securityCategory.toLowerCase()],
          pairName: currencyDetails.name,
          pairSymbol: currencyDetails.symbol,
          price: currentPrice,
          prices,
          tvl:
            buyStats.totalAmount + sellStats.totalAmount > 0
              ? formatNumberWithUnits(
                  buyStats.totalAmount + sellStats.totalAmount
                )
              : "0",
        };

        yield formattedPool;
        await maybeDelay(shouldDelay, delayTime);
      } catch (err) {
        console.warn(`Error processing pool ${pool.id}:`, err?.message);
      }
    }
  } catch (err) {
    console.error("getDerivatives failed:", err?.message);
  }
}

if (typeof window !== "undefined") {
  window.getAMCAndFixedIncomeProducts = getAMCAndFixedIncomeProducts;

  window.getDerivatives = getDerivatives;
}

export { getAMCAndFixedIncomeProducts, getDerivatives };
