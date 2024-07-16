import { parseAccount, privateKeyToAccount } from "viem/accounts";
import { ActionData, EXECUTE_SINGLE, EnableSessions, PolicyData, SignerId } from "./types/general";
import { Address, Hex, WalletClient, WalletGrantPermissionsReturnType, createPublicClient, encodeAbiParameters, encodePacked, http, keccak256, maxUint256, numberToBytes, numberToHex, parseAbi, parseAbiParameters, toBytes, toFunctionSelector, toHex } from "viem";
import { GrantPermissionsParameters } from "viem/experimental";
import { createSmartAccountClient } from "@biconomy/account";
import { counterContractAddress, mockValidator, smartSessionAddress, simplerSignerAddress, timeFramePolicyAddress } from "./utils/constants";
import { ethers } from "ethers";
import { sepolia } from "viem/chains";
export class ContextBuilder {
    async getContext(walletClient: WalletClient): Promise<`0x${string}`> {
        const smartAccountClient = await createSmartAccountClient({
            signer: walletClient,
            chainId: walletClient.chain?.id,
            bundlerUrl: `https://api.pimlico.io/v2/${walletClient.chain?.id}/rpc?apikey=d4ba0b0e-26cc-4ea0-90d4-4e0e146705f2`
        })

        // Convert the address to a BigInt (equivalent to uint160 in Solidity)
        const uint160Address = BigInt(smartSessionAddress);

        // Shift left by 32 bits to get the uint192 value
        const nonceKey = uint160Address << BigInt(32);

        const signerId = ethers.hexlify(numberToBytes(await smartAccountClient.getNonce(), { size: 32 }) ) as Hex;
        const enableData = await this._prepareMockEnableData(walletClient.account?.address!, await smartAccountClient.getNonce(), walletClient);
        
        const context = encodePacked(['uint192', 'bytes', 'bytes32', 'bytes'], 
            [
                nonceKey, //192 bits, 24 bytes
                EXECUTE_SINGLE, //execution mode, 32 bytes
                signerId,
                this.encodeEnableSessions(enableData) as Hex
            ]
        );
        return context;
    }

    encodeEnableSessions(enableData: EnableSessions): string {
      return ethers.AbiCoder.defaultAbiCoder().encode(
        [
          'tuple(address isigner, bytes isignerInitData, tuple(address policy, bytes initData)[] userOpPolicies, tuple(address policy, bytes initData)[] erc1271Policies, tuple(bytes32 actionId, tuple(address policy, bytes initData)[] actionPolicies)[] actions, bytes permissionEnableSig)'
        ],
        [{
          isigner: enableData.isigner, // Assuming ISigner has an 'address' property
          isignerInitData: enableData.isignerInitData,
          userOpPolicies: enableData.userOpPolicies,
          erc1271Policies: enableData.erc1271Policies,
          actions: enableData.actions.map(action => ({
            actionId: action.actionId,
            actionPolicies: action.actionPolicies
          })),
          permissionEnableSig: enableData.permissionEnableSig
        }]
      );
    }

    async _prepareMockEnableData(signerAddress: Address, nonce: bigint, walletClient: WalletClient): Promise<any> {
        // Initialize userOpPolicyData
        const userOpPolicyData: PolicyData[] = [];
        let policyInitData = encodeAbiParameters(parseAbiParameters("address"), [signerAddress]);
        userOpPolicyData.push({ policy: simplerSignerAddress, initData: policyInitData });

        // Initialize actionPolicyData
        const blockTimestamp = Math.floor(Date.now() / 1000); // Current timestamp
        const actionPolicyData: PolicyData[] = [];
        policyInitData = encodeAbiParameters(parseAbiParameters("uint128, uint128"), [BigInt(blockTimestamp + 1000), BigInt(blockTimestamp - 1)]);
        actionPolicyData.push({ policy: timeFramePolicyAddress, initData: policyInitData });

        const incrementSelector = toFunctionSelector('function increment()');

        // Compute actionId
        const actionId = keccak256(encodeAbiParameters(
          parseAbiParameters("address, bytes4"),
            [counterContractAddress, incrementSelector]
          )
        );

        // Initialize actions
        const actions: ActionData[] = [];
        actions.push({ actionId: actionId, actionPolicies: actionPolicyData });

        // Construct enableData
        const enableData: EnableSessions = {
            isigner: simplerSignerAddress, // Example ISigner address
            isignerInitData: encodeAbiParameters(parseAbiParameters("address"), [signerAddress]),
            userOpPolicies: userOpPolicyData,
            erc1271Policies: [],
            actions: actions,
            permissionEnableSig: "" // ?
        };

        // Compute hash and sign it
        const signerId = ethers.hexlify(numberToBytes(nonce, { size: 32 }) ) as Hex;
        const hash = this.getDigest(signerId, nonce, enableData);
        enableData.permissionEnableSig = encodePacked(['address', 'bytes'], [mockValidator, await walletClient.signMessage({account: walletClient.account!, message: hash})]);

        return enableData;
    }

    getDigest(signerId: SignerId, nonce: bigint, data: EnableSessions): string {
      return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'uint256', 'uint256', 'address', 'bytes', 'tuple(address,bytes)[]', 'tuple(address,bytes)[]', 'tuple(bytes32,tuple(address,bytes)[])[]'],
          [
            signerId,
            nonce,
            sepolia.id, // This returns a Promise, you might need to handle it differently
            data.isigner,
            data.isignerInitData,
            data.userOpPolicies.map(p => [p.policy, p.initData]),
            data.erc1271Policies.map(p => [p.policy, p.initData]),
            data.actions.map(a => [a.actionId, a.actionPolicies.map(p => [p.policy, p.initData])])
          ]
        )
      );
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