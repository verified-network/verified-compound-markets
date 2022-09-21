// (c) Kallol Borah, 2020
// Client interface
// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface VerifiedClient{

    function addRole(address _manager, address _submanager, bytes32 _country, bytes32 _role, bytes32 _id, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

    function getRole(address _user) external view returns(bytes32, bytes32);

    function removeRole(address _manager, address _submanager, bytes32 _country, bytes32 _role, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

    function setSigner(address _signer) external;

    function KycUpdate(address client, bytes32 name, bytes32 surname, bytes32 country, uint status, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) external;

    function getTransferAgent(address party) external view returns(bytes32);
}