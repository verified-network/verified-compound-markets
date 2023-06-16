export default [
  {
    "inputs": [
      {
        "internalType": "contract Comet",
        "name": "comet_",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "comet",
    "outputs": [
      {
        "internalType": "contract Comet",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;