import { type Address, type Hex, type WalletClient, concat } from "viem";
import { type Signer, type MultiKeySigner } from "./signers";

export type RevokePermissionsRequestParams = {
  permissionsContext: "0x{string}";
};

export type RevokePermissionsResponseResult = {};

export type GrantPermissionsResponse = {
  expiry: number
  factory?: `0x${string}` | undefined
  factoryData?: string | undefined
  grantedPermissions: readonly {
    data: unknown
    policies: readonly {
      data: unknown
      type: string
    }[]
    required?: boolean | undefined
    type: string
  }[]
  permissionsContext: string
  signerData?:
  | {
    userOpBuilder?: `0x${string}` | undefined
    submitToAddress?: `0x${string}` | undefined
  }
  | undefined
};

export type GrantPermissionsRequestParams = {
  smartAccountAddress: `0x${string}`;

  signer: MultiKeySigner;

  permissions: Permission[];

  expiry: number;
};

export type Permission = {
  type: PermissionType;
  policies: Policy[];
  required: boolean;
  data: any;
}

// export type PermissionData = {
//   target: Address;
//   abi: string;
//   valueLimit: bigint;
//   functionName: string;
// }

export type Policy = {
  type: PolicyType;
  data: any;
}

export type PermissionType = "native-token-transfer" | "erc20-token-transfer" | "erc721-token-transfer" | "erc1155-token-transfer" | {custom : any};
export type PolicyType = "gas-limit" | "call-limit" | "rate-limit" | "spent-limit" | "value-limit" | "time-frame" | "uni-action" | "simpler-signer" | {custom : any};

export type GetContextReturnType = {
  permissionData: Hex,
  permissionEnableData: Hex,
  permissionEnableDataSignature: Hex
}

export type PolicyData = {
  policy: string;
  initData: string;
}

export type ActionData = {
  actionId: string;
  actionPolicies: PolicyData[];
}

// define mode and exec type enums
export const CALLTYPE_SINGLE = "0x00" // 1 byte
export const CALLTYPE_BATCH = "0x01" // 1 byte
export const EXECTYPE_DEFAULT = "0x00" // 1 byte
export const EXECTYPE_TRY = "0x01" // 1 byte
export const EXECTYPE_DELEGATE = "0xFF" // 1 byte
export const MODE_DEFAULT = "0x00000000" // 4 bytes
export const UNUSED = "0x00000000" // 4 bytes
export const MODE_PAYLOAD = "0x00000000000000000000000000000000000000000000" // 22 bytes
export const ERC1271_MAGICVALUE = "0x1626ba7e"
export const ERC1271_INVALID = "0xffffffff"

export const EXECUTE_SINGLE = concat([
  CALLTYPE_SINGLE,
  EXECTYPE_DEFAULT,
  MODE_DEFAULT,
  UNUSED,
  MODE_PAYLOAD
])

export interface EnableSessions {
  isigner: Address;
  isignerInitData: Uint8Array;
  userOpPolicies: PolicyData[];
  erc1271Policies: PolicyData[];
  actions: ActionData[];
  permissionEnableSig: Uint8Array;
}

export enum SmartSessionMode {
  USE,
  ENABLE,
  UNSAFE_ENABLE
}

export type SignerId = Address;
export type ActionId = Address;

export type PrepareMockEnableDataParams = {
  smartAccountAddress: Address,
  signers: Signer[], 
  walletClient: WalletClient, 
  userOpPolicies: PolicyData[], 
  actions: ActionData[], 
  erc1271Policies: PolicyData[], 
  permissionEnableSig?: Hex
}

export type GetContextParams = {
  walletClient: WalletClient,
  smartAccountAddress: Address;
  smartAccountNonce: bigint,
  userOpPolicies: PolicyData[],
  actions: ActionData[], 
  erc1271Policies: PolicyData[],
  sessionKey: Hex;
  permissionEnableSig?: Hex,
}

export type PasskeyPublicKey = {
  pubKeyX: bigint
  pubKeyY: bigint
}