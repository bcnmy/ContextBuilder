import { parseAccount, privateKeyToAccount } from "viem/accounts";
import { GetContextReturnType, GetEnableContextParams, GrantPermissionsRequestParams, GrantPermissionsResponse } from "./types/general";
import { Account, Address, Hex, WalletClient, WalletGrantPermissionsReturnType, concat, createPublicClient, createWalletClient, encodeAbiParameters, encodeFunctionData, encodePacked, http, keccak256, maxUint256, numberToHex, parseAbiItem, parseAbiParameters, toBytes, toFunctionSelector, toHex } from "viem";
import { baseSepolia } from "viem/chains";
import { GrantPermissionsParameters, GrantPermissionsReturnType, walletActionsErc7715 } from "viem/experimental";
import { createSmartAccountClient } from "@biconomy/account";

export class ContextBuilder {

    public mockValidator: Address = "0x";
    public counterContractAddress: Address = "0x2e20Ed3729694Ee5C69484fEE3F731462cfA7E19"; // base sepolia
    public incrementSelector = toFunctionSelector('function increment()');

    async getContext(): Promise<any> {
        const accountAddress = "0x";
        const simpleSignerValidator = "0x";
        const usageLimitPolicy = "0x";
        const simpleGasPolicy = "0x";
        const timeFramePolicy = "0x";

        const account = privateKeyToAccount("0x");

        const smartAccountClient = await createSmartAccountClient({
            signer: account,
            bundlerUrl: "https://api.pimlico.io/v2/84532/rpc?apikey=d4ba0b0e-26cc-4ea0-90d4-4e0e146705f2"
        })

        const incrementCalldata = encodeFunctionData({
            abi: [parseAbiItem('function increment()')],
            functionName: 'increment',
        })

        const userOp = await smartAccountClient.buildUserOp([{
            to: this.counterContractAddress,
            data: incrementCalldata,
            value: 0n
        }])

        let signedUserOp = await smartAccountClient.signUserOp(userOp);

        const newSignerId = keccak256(encodePacked(["string", "address", "address", "uint256"], ["Signer Id for ", accountAddress, simpleSignerValidator, BigInt(Date.now() +1000)]));
        const {permissionData, permissionEnableData, permissionEnableDataSignature} = await this._getPermissionEnableContext(account, {newSignerId, simpleSignerValidator, signerValidatorConfigData: account?.address, usageLimitPolicy, simpleGasPolicy, timeFramePolicy});
    
        return {permissionData, permissionEnableData, permissionEnableDataSignature}
        // const signature = encodePacked(
        //     ['bytes', 'uint1', 'uint32', 'bytes', 'uint32', 'bytes', 'uint32', 'bytes', 'bytes'],
        //     [
        //         "0x01", //Enable mode
        //         1, // index of permission in sessionEnableData
        //         permissionEnableData.length,
        //         permissionEnableData,
        //         permissionEnableDataSignature.length,
        //         permissionEnableDataSignature,
        //         permissionData.length,
        //         permissionData,
        //         signedUserOp.signature as Hex
        //     ]
        // );

        // signedUserOp.signature = signature;

        // return signedUserOp;
    }

    async _getPermissionEnableContext(account: Account, params: GetEnableContextParams): Promise<GetContextReturnType> {

        const { newSignerId, simpleSignerValidator, signerValidatorConfigData, usageLimitPolicy, simpleGasPolicy, timeFramePolicy} = params

        const permissionDataStructureDescriptor: string = toHex(
            (1 << 24) + // setup signer mode = true
            (2 << 16) + // number of userOp policies
            (2 << 8) +  // number of action policies
            1           // number of 1271 policies
        );

        let permissionData = toHex(concat([
            toBytes(newSignerId),
            toBytes(permissionDataStructureDescriptor),
            toBytes(simpleSignerValidator),
            toBytes(encodeAbiParameters([{ name: 'length', type: 'uint32' }], [2])),
            toBytes(signerValidatorConfigData)
        ]));

        // Encode additional permission data
        permissionData = toHex(concat([
            toBytes(permissionData),
            toBytes(usageLimitPolicy),
            toBytes(encodeAbiParameters([{ name: 'usageLimitPolicy', type: 'uint32' }], [32])),
            toBytes(encodeAbiParameters([{ name: 'limit', type: 'uint256' }], [10n])),
            toBytes(simpleGasPolicy),
            toBytes(encodeAbiParameters([{ name: 'simpleGasPolicy', type: 'uint32' }], [32])),
            toBytes(encodeAbiParameters([{ name: 'limit', type: 'uint256' }], [maxUint256])),
        ]));
  
        // Compute action ID
        const actionId = keccak256(encodeAbiParameters(
            parseAbiParameters('address, bytes'),
            [this.counterContractAddress, this.incrementSelector]
        ));
  
        // Encode action policies
        const actionPoliciesData = toHex(concat([
            toBytes(permissionData),
            toBytes(actionId),
            toBytes(usageLimitPolicy),
            toBytes(encodeAbiParameters(parseAbiParameters("uint32"), [32])),
            toBytes(encodeAbiParameters(parseAbiParameters("uint256"), [5n])),
            toBytes(timeFramePolicy),
            toBytes(encodeAbiParameters(parseAbiParameters("uint32"), [32])),
            toBytes(encodeAbiParameters(
            parseAbiParameters("uint256"), 
            [BigInt(((Date.now() + 1000) << 128) + Date.now())]
            ))
        ]));
  
        // Encode 1271 policies
        const finalPermissionData = toHex(concat([
            toBytes(actionPoliciesData),
            toBytes(timeFramePolicy),
            toBytes(encodeAbiParameters(parseAbiParameters("uint32"), [32])),
            toBytes(encodeAbiParameters(
            parseAbiParameters("uint256"), 
                [BigInt(((Date.now() + 1000) << 128) + Date.now())]
            ))
        ]));
  
        // Compute permission digest
        const permissionDigest = keccak256(finalPermissionData);
  
        // Construct session enable data
        const permissionEnableData = toHex(concat([
            toBytes(encodeAbiParameters(parseAbiParameters("uint64"), [0x01n])), // mainnet chain ID
            toBytes(permissionDigest),
            toBytes(encodeAbiParameters(parseAbiParameters("uint64"), [BigInt(baseSepolia.id)])), // current chain ID
            toBytes(permissionDigest)
        ]));

        const signature = await account.signMessage!({message: keccak256(permissionEnableData)});
        const permissionEnableDataSignature = encodePacked(['address', 'bytes'], [this.mockValidator, signature]);

        return {
            permissionData,
            permissionEnableData,
            permissionEnableDataSignature
        }
    }
    

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