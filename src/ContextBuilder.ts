import { parseAccount, privateKeyToAccount } from "viem/accounts";
import { GrantPermissionsRequestParams, GrantPermissionsResponse } from "./types/general";
import { WalletGrantPermissionsReturnType, createPublicClient, createWalletClient, http, numberToHex } from "viem";
import { baseSepolia } from "viem/chains";
import { GrantPermissionsParameters, GrantPermissionsReturnType, walletActionsErc7715 } from "viem/experimental";

export class ContextBuilder {

    // async getContext(parameters: GrantPermissionsParameters): Promise<GrantPermissionsReturnType> {

    //     const client = createWalletClient({
    //         chain: baseSepolia,
    //         transport: http(''),
    //     }).extend(walletActionsErc7715())

    //     const { account, expiry, permissions, signer } = parameters

    //     const result = await client.request(
    //         {
    //           method: 'wallet_grantPermissions',
    //           params: [
    //             this.formatParameters({ account, expiry, permissions, signer } as any),
    //           ],
    //         },
    //         { retryCount: 0 },
    //       )
    //     return this.formatRequest(result);       
    // }

    formatParameters(parameters: GrantPermissionsParameters) {
        const { expiry, permissions, signer: signer_ } = parameters
      
        const account = parameters.account
          ? parseAccount(parameters.account)
          : undefined
      
        const signer = (() => {
          if (!account && !signer_) return undefined
      
          // JSON-RPC Account as signer.
          if (account?.type === 'json-rpc')
            return {
              type: 'wallet',
            }
      
          // Local Account as signer.
          if (account?.type === 'local')
            return {
              type: 'account',
              data: {
                id: account.address,
              },
            }
      
          // ERC-7715 Signer as signer.
          return signer_
        })()
      
        return {
          expiry,
          permissions: permissions.map((permission) => ({
            ...permission,
            policies: permission.policies.map((policy) => {
              const data = (() => {
                if (policy.type === 'token-allowance')
                  return {
                    allowance: numberToHex(policy.data.allowance),
                  }
                if (policy.type === 'gas-limit')
                  return {
                    limit: numberToHex(policy.data.limit),
                  }
                return policy.data
              })()
      
              return {
                data,
                type:
                  typeof policy.type === 'string' ? policy.type : policy.type.custom,
              }
            }),
            required: permission.required ?? false,
            type:
              typeof permission.type === 'string'
                ? permission.type
                : permission.type.custom,
          })),
          ...(signer ? { signer } : {}),
        }
      }

    formatRequest(request: WalletGrantPermissionsReturnType) {
        return {
          expiry: request.expiry,
          ...(request.factory ? { factory: request.factory } : {}),
          ...(request.factoryData ? { factoryData: request.factoryData } : {}),
          grantedPermissions: request.grantedPermissions.map((permission) => ({
            ...permission,
            policies: permission.policies.map((policy) => {
              const data = (() => {
                if (policy.type === 'token-allowance')
                  return {
                    allowance: BigInt((policy.data as any).allowance),
                  }
                if (policy.type === 'gas-limit')
                  return {
                    limit: BigInt((policy.data as any).limit),
                  }
                return policy.data
              })()
      
              return {
                data,
                type: policy.type,
              }
            }),
          })),
          permissionsContext: request.permissionsContext,
          ...(request.signerData ? { signerData: request.signerData } : {}),
        }
    }

}