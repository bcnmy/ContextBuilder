import { Address, Hex } from "viem";

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
    account?: `0x${string}`;
  
    chainId: number;
  
    signer: {
      type: string;
      data: any;
    };
  
    permissions: Permission[];
  
    expiry: number;
};

export interface Permission {
    type: PermissionType;
    policies: Policy[];
    required: boolean;
    data: any;
}

export interface Policy {
    type: PolicyType;
    data: any;
}

export type PermissionType = "native-token-transfer" | "erc20-token-transfer" | "erc721-token-transfer" | "erc1155-token-transfer";
export type PolicyType = "gas-limit" | "call-limit" | "rate-limit" | "spent-limit";

export type GetEnableContextParams = {
  newSignerId: Hex,
  simpleSignerValidator: Address,
  signerValidatorConfigData: Hex,
  usageLimitPolicy: Address,
  simpleGasPolicy: Address,
  timeFramePolicy: Address,
}

export type GetContextReturnType = {
  permissionData: Hex,
  permissionEnableData: Hex,
  permissionEnableDataSignature: Hex
}