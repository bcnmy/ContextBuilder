# ContextBuilder
# @biconomy/permission-context-builder

## Overview

@biconomy/permission-context-builder is a TypeScript library designed to facilitate the creation and management of smart sessions for blockchain interactions. It provides utilities for generating permission contexts, encoding session data, and handling various types of signers including EOA (Externally Owned Accounts) and Passkeys.

## Features

- Generate permission contexts for smart contract interactions
- Support for multiple signer types (EOA and Passkeys)
- Encoding and decoding of DID (Decentralized Identifier) keys
- Integration with Viem for Ethereum interactions
- Utilities for handling smart account permissions and policies

## Installation

```bash
npm install @biconomy/permission-context-builder
```

## Usage

### Generating Permission Context

To generate a permission context for a smart contract interaction:

```typescript
import { getContext } from '@biconomy/permission-context-builder';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';

const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: sepolia,
});

const context = await getContext(walletClient, {
  signer: {
    type: 'keys',
    data: {
      ids: [
        "did:key:zDnaerx...", // Your DID key here
        "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169"
      ],
    }
  },
  smartAccountAddress: walletClient.account?.address,
  permissions: [
    {
      type: {
        custom: 'donut-purchase'
      },
      data: {
        target: donutContractAddress,
        abi: donutContractAbi,
        valueLimit: parseEther('0.001'),
        functionName: 'function purchase()'
      },
      policies: [],
      required: true
    }
  ],
  expiry: Date.now() + 1000
});
```

### Decoding DID Keys

To decode a DID key:

```typescript
import { decodeDIDToPublicKey } from '@biconomy/permission-context-builder';

const result = decodeDIDToPublicKey("did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169");
console.log(result.key); // Public key
console.log(result.keyType); // Key type (e.g., "secp256r1")
```

## API Reference

### `getContext(walletClient, options)`

Generates a permission context for smart contract interactions.

- `walletClient`: Viem WalletClient instance
- `options`: Object containing:
  - `signer`: Signer information
  - `smartAccountAddress`: Address of the smart account
  - `permissions`: Array of permission objects
  - `expiry`: Expiration timestamp

Returns: `Promise<string>` - The generated context as a hexadecimal string

### `decodeDIDToPublicKey(didKey)`

Decodes a DID key to its public key and key type.

- `didKey`: DID key string

Returns: `{ key: string, keyType: string }`

## Testing

To run the test suite:

```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).