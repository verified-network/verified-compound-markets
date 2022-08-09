// Verified managers
// (c) Kallol Borah, Verified Network, 2021

//"SPDX-License-Identifier: UNLICENSED"

pragma solidity ^0.6.12;

import "./interfaces/VerifiedClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Client is VerifiedClient, Ownable {
    
    //bridge
    address bridge;

    struct role{
        address manager;
        bytes32 country;
        bytes32 role;
        bytes32 id;
    }

    //mapping of a manager to its sub managers
    mapping(address=> role) private roles;

    //storing submanagers
    address[] submanagers;

    //submanager index
    mapping(address => uint256) private managerIndex;

    event ManagerAdded(address manager, address indexed submanager, bytes32 role, bytes32 country, bytes32 managerId);
    event ManagerRemoved(address manager, address indexed submanager, bytes32 role, bytes32 country);

    function initialize(address _signer) onlyOwner public {
        bridge = _signer;
    }

    function setSigner(address _signer) onlyOwner override external{
        bridge = _signer;
    }
    
    function addRole(address _manager, address _submanager, bytes32 _country, bytes32 _role, bytes32 _id, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) 
                            override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        require(_role=="Custodian" || _role=="AM" || _role=="DP" || _role=="KYCAML");
        submanagers.push(_submanager);
        managerIndex[_submanager] = submanagers.length;
        roles[_submanager].manager = _manager;
        roles[_submanager].country = _country;
        roles[_submanager].role = _role;
        roles[_submanager].id = _id;
        emit ManagerAdded(_manager, _submanager, _role, _country, _id);
    }

    function getRole(address _user) override external view returns(bytes32, bytes32){
        uint256 position = managerIndex[_user];
        if(position>0){
            if(submanagers[position-1]==_user){
                return (roles[submanagers[position-1]].role, roles[submanagers[position-1]].id);
            }
        }
        if(_user==owner())
            return ("Admin","");
        else
            return ("","");
    }

    function removeRole(address _manager, address _submanager, bytes32 _country, bytes32 _role, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) 
                            override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        require(_role=="Custodian" || _role=="AM" || _role=="DP" || _role=="KYCAML");
        uint256 position = managerIndex[_submanager];
        if(position>0){
            if( submanagers[position-1]==_submanager &&
                roles[submanagers[position-1]].role==_role && 
                roles[submanagers[position-1]].country==_country &&
                roles[submanagers[position-1]].manager==_manager){
                delete(roles[submanagers[position-1]]);
            }
        }
        emit ManagerRemoved(_manager, _submanager, _role, _country);
    }

}