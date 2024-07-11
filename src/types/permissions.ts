// Native token transfer, e.g. ETH on Ethereum
export type NativeTokenTransferPermission = {
    type: 'native-token-transfer';
    policies: [];
    data: {
      allowance: '0x...'; // hex value
    };
  };
  
  // ERC20 token transfer
export type ERC20TokenTransferPermission = {
    type: 'erc20-token-transfer';
    policies: [];
    data: {
      address: '0x...'; // erc20 contract
      allowance: '0x...'; // hex value
    };
  };
  
  // ERC721 token transfer
export type ERC721TokenTransferPermission = {
    type: 'erc721-token-transfer';
    policies: [];
    data: {
      address: '0x...'; // erc721 contract
      tokenIds: '0x...'[]; // hex value array
    };
  };
  
  // ERC1155 token transfer
export type ERC1155TokenTransferPermission = {
    type: 'erc1155-token-transfer';
    policies: [];
    data: {
      address: '0x...'; // erc1155 contract
      allowances: {
          [tokenId: string]: '0x...'; // hex value
      }
    };
  };
  