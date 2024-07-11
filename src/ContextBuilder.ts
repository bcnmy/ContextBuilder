import { parseAccount, privateKeyToAccount } from "viem/accounts";
import { ActionData, EXECUTE_SINGLE, EnableSessions, PolicyData } from "./types/general";
import { Address, WalletClient, WalletGrantPermissionsReturnType, encodeAbiParameters, encodePacked, keccak256, maxUint256, numberToHex, parseAbiParameters, toFunctionSelector, toHex } from "viem";
import { GrantPermissionsParameters } from "viem/experimental";
import { createSmartAccountClient } from "@biconomy/account";
import { counterContractAddress, mockValidator, simpleGasPolicy, smartSessionAddress, timeFramePolicy } from "./utils/constants";
import { ethers } from "ethers";
export class ContextBuilder {
    async getContext(walletClient: WalletClient): Promise<`0x${string}`> {
        const smartAccountClient = await createSmartAccountClient({
            signer: walletClient,
            bundlerUrl: "https://api.pimlico.io/v2/84532/rpc?apikey=d4ba0b0e-26cc-4ea0-90d4-4e0e146705f2"
        })

        // Convert the address to a BigInt (equivalent to uint160 in Solidity)
        const uint160Address = BigInt(smartSessionAddress);

        // Shift left by 32 bits to get the uint192 value
        const nonceKey = uint160Address << BigInt(32);

        const enableData = await this._prepareMockEnableData(walletClient.account?.address!, await smartAccountClient.getAddress(), walletClient);
        const context = encodePacked(['uint192', 'bytes', 'address', 'bytes'], 
            [
                nonceKey, //192 bits, 24 bytes
                EXECUTE_SINGLE, //execution mode, 32 bytes
                walletClient.account?.address!,
                enableData
            ]
        );

       return context;
    }

    async _prepareMockEnableData(signerAddress: Address, accountAddress: Address, walletClient: WalletClient): Promise<any> {
        // Initialize userOpPolicyData
        const userOpPolicyData: PolicyData[] = [];
        let policyInitData = encodeAbiParameters(parseAbiParameters("uint256"), [maxUint256]);
        userOpPolicyData.push({ policy: simpleGasPolicy, initData: policyInitData });

        // Initialize actionPolicyData
        const blockTimestamp = Math.floor(Date.now() / 1000); // Current timestamp
        const actionPolicyData: PolicyData[] = [];
        policyInitData = encodeAbiParameters(parseAbiParameters("uint128, uint128"), [BigInt(blockTimestamp + 1000), BigInt(blockTimestamp - 1)]);
        actionPolicyData.push({ policy: timeFramePolicy, initData: policyInitData });

        const incrementSelector = toFunctionSelector('function increment()');

        // Compute actionId
        const actionId = keccak256(encodeAbiParameters(
        parseAbiParameters("address, bytes4"),
            [counterContractAddress, incrementSelector]
        ));

        // Initialize actions
        const actions: ActionData[] = [];
        actions.push({ actionId: actionId, actionPolicies: actionPolicyData });

        // Construct enableData
        const enableData: EnableSessions = {
            isigner: "0x1111111111111111111111111111111111111111", // Example ISigner address
            isignerInitData: encodeAbiParameters(parseAbiParameters("address"), [signerAddress]),
            userOpPolicies: userOpPolicyData,
            erc1271Policies: [],
            actions: actions,
            permissionEnableSig: ""
        };

        const getDigest = (signer: string, account: string, data: EnableSessions): string => {
            // Simulate the digest computation as done in Solidity
            return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
              ["address", "address", "tuple(address isigner, bytes isignerInitData, tuple(address policy, bytes initData)[] userOpPolicies, tuple(address policy, bytes initData)[] erc1271Policies, tuple(bytes32 actionId, tuple(address policy, bytes initData)[] actionPolicies)[] actions, bytes permissionEnableSig)"],
              [signer, account, data]
            ));
          };

        // Compute hash and sign it
        const hash = getDigest(signerAddress, accountAddress, enableData);
        enableData.permissionEnableSig = encodePacked(['address', 'bytes'], [mockValidator, await walletClient.signMessage({account: walletClient.account!, message: hash})]);

        return enableData;
    }

    // async _getPermissionEnableContext(account: Account, params: GetEnableContextParams): Promise<GetContextReturnType> {

    //     const { newSignerId, simpleSignerValidator, signerValidatorConfigData, usageLimitPolicy, simpleGasPolicy, timeFramePolicy} = params

    //     const permissionDataStructureDescriptor: string = toHex(
    //         (1 << 24) + // setup signer mode = true
    //         (2 << 16) + // number of userOp policies
    //         (2 << 8) +  // number of action policies
    //         1           // number of 1271 policies
    //     );

    //     let permissionData = toHex(concat([
    //         toBytes(newSignerId),
    //         toBytes(permissionDataStructureDescriptor),
    //         toBytes(simpleSignerValidator),
    //         toBytes(encodeAbiParameters([{ name: 'length', type: 'uint32' }], [2])),
    //         toBytes(signerValidatorConfigData)
    //     ]));

    //     // Encode additional permission data
    //     permissionData = toHex(concat([
    //         toBytes(permissionData),
    //         toBytes(usageLimitPolicy),
    //         toBytes(encodeAbiParameters([{ name: 'usageLimitPolicy', type: 'uint32' }], [32])),
    //         toBytes(encodeAbiParameters([{ name: 'limit', type: 'uint256' }], [10n])),
    //         toBytes(simpleGasPolicy),
    //         toBytes(encodeAbiParameters([{ name: 'simpleGasPolicy', type: 'uint32' }], [32])),
    //         toBytes(encodeAbiParameters([{ name: 'limit', type: 'uint256' }], [maxUint256])),
    //     ]));
  
    //     // Compute action ID
    //     const actionId = keccak256(encodeAbiParameters(
    //         parseAbiParameters('address, bytes'),
    //         [this.counterContractAddress, this.incrementSelector]
    //     ));
  
    //     // Encode action policies
    //     const actionPoliciesData = toHex(concat([
    //         toBytes(permissionData),
    //         toBytes(actionId),
    //         toBytes(usageLimitPolicy),
    //         toBytes(encodeAbiParameters(parseAbiParameters("uint32"), [32])),
    //         toBytes(encodeAbiParameters(parseAbiParameters("uint256"), [5n])),
    //         toBytes(timeFramePolicy),
    //         toBytes(encodeAbiParameters(parseAbiParameters("uint32"), [32])),
    //         toBytes(encodeAbiParameters(
    //         parseAbiParameters("uint256"), 
    //         [BigInt(((Date.now() + 1000) << 128) + Date.now())]
    //         ))
    //     ]));
  
    //     // Encode 1271 policies
    //     const finalPermissionData = toHex(concat([
    //         toBytes(actionPoliciesData),
    //         toBytes(timeFramePolicy),
    //         toBytes(encodeAbiParameters(parseAbiParameters("uint32"), [32])),
    //         toBytes(encodeAbiParameters(
    //         parseAbiParameters("uint256"), 
    //             [BigInt(((Date.now() + 1000) << 128) + Date.now())]
    //         ))
    //     ]));
  
    //     // Compute permission digest
    //     const permissionDigest = keccak256(finalPermissionData);
  
    //     // Construct session enable data
    //     const permissionEnableData = toHex(concat([
    //         toBytes(encodeAbiParameters(parseAbiParameters("uint64"), [0x01n])), // mainnet chain ID
    //         toBytes(permissionDigest),
    //         toBytes(encodeAbiParameters(parseAbiParameters("uint64"), [BigInt(baseSepolia.id)])), // current chain ID
    //         toBytes(permissionDigest)
    //     ]));

    //     const signature = await account.signMessage!({message: keccak256(permissionEnableData)});
    //     const permissionEnableDataSignature = encodePacked(['address', 'bytes'], [this.mockValidator, signature]);

    //     return {
    //         permissionData,
    //         permissionEnableData,
    //         permissionEnableDataSignature
    //     }
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