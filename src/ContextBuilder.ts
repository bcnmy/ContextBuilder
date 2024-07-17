import { parseAccount } from "viem/accounts";
import { EXECUTE_SINGLE, EnableSessions, GetContextParams, PrepareMockEnableDataParams, SignerId } from "./types/general";
import { Hex, concat, encodeAbiParameters, encodePacked, keccak256, numberToBytes, numberToHex, parseAbiParameters, toBytes, toHex } from "viem";
import { GrantPermissionsParameters } from "viem/experimental";
import { mockValidator, smartSessionAddress, simplerSignerAddress } from "./utils/constants";
import { ethers } from "ethers";

export const getContext = async ({
  walletClient,
  smartAccountNonce,
  smartAccountAddress,
  sessionKey,
  userOpPolicies,
  erc1271Policies,
  actions,
  permissionEnableSig
}: GetContextParams): Promise<`0x${string}`> => {
  if(walletClient.account?.address === undefined) {
    throw new Error("Account address is undefined");
  }
  // Convert the address to a BigInt (equivalent to uint160 in Solidity)
  const uint160Address = BigInt(smartSessionAddress);

  // Shift left by 32 bits to get the uint192 value
  const nonceKey = uint160Address << BigInt(32);

  console.log(Date.now().toString(), "Date.now().toString()");
  const signerId = ethers.hexlify(
    encodePacked(
      ["bytes32"], 
      [keccak256
        (
          concat(
            [
              toHex("Signer Id"), 
              sessionKey, 
              smartAccountAddress, 
              simplerSignerAddress, 
              toHex(Date.now().toString())
            ]
          )
        )
      ]
    )
  );
  
  const enableData = await _prepareMockEnableData(
    {
      signerAddress: walletClient.account?.address!, 
      nonce: smartAccountNonce, 
      walletClient, 
      userOpPolicies, 
      actions, 
      erc1271Policies, 
      permissionEnableSig
    }
  );
  
  const context = encodePacked(['uint192', 'bytes', 'bytes32', 'bytes'], 
      [
          nonceKey, //192 bits, 24 bytes
          EXECUTE_SINGLE, //execution mode, 32 bytes
          signerId as Hex, // 32 bytes
          encodeEnableSessions(enableData) as Hex
      ]
  );
  return context;
}

export const encodeEnableSessions = (enableData: EnableSessions): string => {
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

export const _prepareMockEnableData = async (
  {
    signerAddress, 
    nonce, 
    walletClient, 
    userOpPolicies, 
    actions, 
    erc1271Policies,
    permissionEnableSig
  } : PrepareMockEnableDataParams): Promise<any> => {
    if(walletClient.account === undefined) {
      throw new Error("Account is undefined");
    }
    if(walletClient.chain === undefined) {
      throw new Error("Chain is undefined");
    }
    // Construct enableData
    const enableData: EnableSessions = {
        isigner: simplerSignerAddress, // Example ISigner address
        isignerInitData: encodeAbiParameters(parseAbiParameters("address"), [signerAddress]),
        userOpPolicies,
        erc1271Policies,
        actions,
        permissionEnableSig: permissionEnableSig ?? "" 
    };

    // Compute hash and sign it
    const signerId = ethers.hexlify(numberToBytes(nonce, { size: 32 }) ) as Hex;
    const hash = getDigest(signerId, nonce, enableData, walletClient.chain?.id!);
    enableData.permissionEnableSig = encodePacked(['address', 'bytes'], [mockValidator, await walletClient.signMessage({account: walletClient.account!, message: hash})]);

    return enableData;
}

export const getDigest = (signerId: SignerId, nonce: bigint, data: EnableSessions, chainId: number): string => {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256', 'uint256', 'address', 'bytes', 'tuple(address,bytes)[]', 'tuple(address,bytes)[]', 'tuple(bytes32,tuple(address,bytes)[])[]'],
      [
        signerId,
        nonce,
        chainId, 
        data.isigner,
        data.isignerInitData,
        data.userOpPolicies.map(p => [p.policy, p.initData]),
        data.erc1271Policies.map(p => [p.policy, p.initData]),
        data.actions.map(a => [a.actionId, a.actionPolicies.map(p => [p.policy, p.initData])])
      ]
    )
  );
}

export const formatParameters = (parameters: GrantPermissionsParameters) => {
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