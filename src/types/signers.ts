// A wallet is the signer for these permissions

import { type Address } from "viem";

// `data` is not necessary for this signer type as the wallet is both the signer and grantor of these permissions
export type WalletSigner = {
    type: "wallet";
    data: {};
  };
  
// A signer representing a single key.
// `id` is a did:key identifier and can therefore represent both Secp256k1 or Secp256r1 keys, among other key types.
export type KeySigner = {
    type: "key";
    data: {
        id: string;
    };
};

// A signer representing a multisig signer.
// Each element of `ids` is a did:key identifier just like the `key` signer.
export type MultiKeySigner = {
    type: "keys";
    data: {
        ids: string[];
        address?: Address;
    };
};

// An account that can be granted with permissions as in ERC-7710.
export type AccountSigner = {
    type: "account";
    data: {
        id: `0x${string}`;
    };
};

export enum SignerType {
    EOA,
    PASSKEY
}

export type Signer = {
    type: SignerType;
    data: string;
};