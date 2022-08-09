// (c) Kallol Borah, 2020
// Interface definition of the Via cash and bond factory.
// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IFactory{

    event securitiesAdded(address indexed security, address issuer, bytes32 isin, bytes32 currency);

    function getTokenCount() external view returns(uint tokenCount);

    function getToken(uint256 n) external view returns(address);

    function getName(address viaAddress) external view returns(bytes32);

    function getType(address viaAddress) external view returns(bytes32);

    function getNameAndType(address viaAddress) external view returns(bytes32, bytes32);

    function getTokenByNameType(bytes32 tokenName, bytes32 tokenType) external view returns(address);

    function getIssuer(bytes32 tokenType, bytes32 tokenName) external view returns(address);

    function createIssuer(address _target, bytes32 tokenName, bytes32 tokenType, bytes32 tokenCurrency, address feeRate) external;

    function issueSecurity(address security, bytes32 company, bytes32 isin, bytes32 currency, address issuer, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) 
                            external;

    function addBalance(address security, address transferor, address transferee, uint256 amount, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) 
                            external;

    function checkProduct(address issue) external view returns(bool);

}