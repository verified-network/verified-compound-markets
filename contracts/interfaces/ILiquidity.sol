// Interface of Verified Liquidity token
// (c) Kallol Borah, 2021

//"SPDX-License-Identifier: UNLICENSED"

pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

interface ILiquidity {

    struct platform{
        bytes32 platformName;
        address platformAddress;
        bytes32 isin;
    }

    struct token{
        bytes32 tokenName;
        address tokenAddress;
    }

    struct provider{
        string assetInvested;
        address investorAddress;
    }

    function registerPlatform(address _liquidityPlatform, bytes32 _platformName) external;

    function getPlaforms() external view returns(platform[] memory);

    function createSupply(uint256 _supply) external;

    function supportTokens(address _token, bytes32 _name) external;

    function buy(address _token, uint256 _amount) external;

    function getInvestors() external view returns(address[] memory);

    function getInvestment(address _investor, string calldata _tokenName) external view returns(uint256);

    function issue(address _investor, string calldata _tokenName, uint256 _tokenAmount, uint256 _LPToIssue) external;

    function stake(uint256 _toStake) external;

    function withdraw(uint256 _fromStake) external;

    function distribute(uint256 _distribution, address _token, address _manager) external;

    function addManager(address _platform, address _manager) external;

    function removeManager(address _platform, address _manager) external;

    function getManagers(address _platform) external view returns(address[] memory);

    function getPlatformPerformance(address _platform) external view returns(uint256 unstakedLiquidity, 
                                                                            uint256 balancePlatformLiquidity,
                                                                            uint256 platformLiquidityProvided,
                                                                            uint256 platformCommissionsEarned);

    function getManagerPerformance(address _platform, address _manager) external view returns(uint256 managerLiquidityProvided,
                                                                            uint256 managerCommissionsEarned);

    function provideLiquidity(address _platform, address _manager, uint256 _liquidity) external;

    function checkSupportForToken(address _token) external view returns(bool);

}

