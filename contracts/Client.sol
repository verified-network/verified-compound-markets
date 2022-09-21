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

    struct user{
        bytes32 name;
        bytes32 surname;
        uint256 kycstatus; //3 for pass, 1 for pending
        bytes32 country;
    }

    //mapping of client address to user attributes
    mapping(address => user) private clients;

    //storing users for each country
    mapping(bytes32 => address[]) private usersbyCountry;

    //mapping of client to manager
    mapping(address => address) private managers;

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
        if(_role=="DP")
            assignManagerToUser(_submanager, _country);
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
        if(_role=="DP")
            unassignManagerFromUser(_submanager, _country);
        emit ManagerRemoved(_manager, _submanager, _role, _country);
    }

    function KycUpdate(address client, bytes32 name, bytes32 surname, bytes32 country, uint status, bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) override external {
        bytes32 payloadHash = keccak256(abi.encode(_hashedMessage, "L2toL1"));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        require(ecrecover(messageHash, _v, _r, _s)== bridge);
        clients[client].name = name;
        clients[client].surname = surname;
        clients[client].kycstatus = status;
        clients[client].country = country;
        usersbyCountry[country].push(client);
        matchManagerToClient(client, country, "client");
    }

    function matchManagerToClient(address client, bytes32 country, bytes32 userRole) private {
        if(userRole=="client"){
            for(uint256 i=0; i<submanagers.length; i++){
                if(roles[submanagers[i]].country==country && roles[submanagers[i]].role=="DP"){
                    managers[client] = submanagers[i];
                }
            }
        }
    }

    function unassignManagerFromUser(address _submanager, bytes32 _country) private {
        for(uint256 i=0; i<usersbyCountry[_country].length; i++){
            if(managers[usersbyCountry[_country][i]]==_submanager)
                managers[usersbyCountry[_country][i]] = address(0x0);
        }
    }

    function assignManagerToUser(address _submanager, bytes32 _country) private {
        for(uint256 i=0; i<usersbyCountry[_country].length; i++){
            if(managers[usersbyCountry[_country][i]]==address(0x0))
                managers[usersbyCountry[_country][i]] = _submanager;
        }
    }

    /**
        Gets transfer agent for any of the parties in the trade
        @param  party         reference to the party or counterparty in a trade
     */
    function getTransferAgent(address party) override external view returns(bytes32){
        return(roles[managers[party]].id);
    }

}