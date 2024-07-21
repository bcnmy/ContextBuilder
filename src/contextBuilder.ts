import type { EnableSessions, GrantPermissionsRequestParams, PrepareMockEnableDataParams, SignerId } from "./types/general";
import { EXECUTE_SINGLE } from "./types/general";
import { type Hex, type WalletClient, concat, encodeAbiParameters, encodePacked, keccak256, parseAbiParameters, toFunctionSelector, toHex } from "viem";
import { mockValidator, smartSessionAddress, simplerSignerAddress, timeFramePolicyAddress } from "./utils/constants";
import { ethers } from "ethers";

export const getContext = async (walletClient: WalletClient, {
  account,
  permissions,
  expiry,
  signer
}: GrantPermissionsRequestParams): Promise<`0x${string}`> => {
  // Convert the address to a BigInt (equivalent to uint160 in Solidity)
  const uint160Address = BigInt(smartSessionAddress);

  // Shift left by 32 bits to get the uint192 value
  const nonceKey = uint160Address << BigInt(32);

  const signerId = ethers.hexlify(
    encodePacked(
      ["bytes32"], 
      [keccak256
        (
          concat(
            [
              toHex("Signer Id"), 
              signer.data.id, 
              account, 
              getSignerPolicyByType(signer.type), 
              toHex(Date.now().toString())
            ]
          )
        )
      ]
    )
  ) as Hex;

  const actions = permissions.map(permission => (
    {
      actionId: keccak256(
        encodeAbiParameters(
          parseAbiParameters("address, bytes4"),
              [permission.data.target, toFunctionSelector(permission.data.functionName)]
          )
      ),
      actionPolicies: [{policy: timeFramePolicyAddress, initData: encodeAbiParameters(parseAbiParameters("uint128, uint128"), [BigInt(expiry), BigInt(0)])}] // hardcoded for demo
    }
  ))
  
  const enableData = await _prepareMockEnableData(
    {
      signerAddress: signer.data.address, 
      signerId,
      walletClient, 
      userOpPolicies: [], // @todo for demo, no userOpPolicies 
      actions, 
      erc1271Policies: [], // @todo for demo, no erc1271Policies 
    }
  );
  
  const context = encodePacked(['uint192', 'bytes', 'bytes32', 'bytes'], 
      [
        nonceKey, // 192 bits, 24 bytes
        EXECUTE_SINGLE, // execution mode, 32 bytes
        signerId as Hex, // 32 bytes
        encodeEnableSessions(enableData) as Hex
      ]
  );
  return context;
}

const getSignerPolicyByType = (signerType: string): Hex => {
  switch(signerType) {
    case "key":
      return simplerSignerAddress;
    default:
      throw new Error("Invalid signer type");
  }
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
    signerId,
    walletClient, 
    userOpPolicies, 
    actions, 
    erc1271Policies,
  } : PrepareMockEnableDataParams): Promise<any> => {
    if(walletClient.account === undefined) {
      throw new Error("Account is undefined");
    }
    if(walletClient.chain === undefined) {
      throw new Error("Chain is undefined");
    }
    // Construct enableData
    let enableData: EnableSessions = {
        isigner: simplerSignerAddress, // Example ISigner address
        isignerInitData: encodeAbiParameters(parseAbiParameters("address"), [signerAddress]),
        userOpPolicies,
        erc1271Policies,
        actions,
        permissionEnableSig: "" 
    };

    // Compute hash and sign it
    const hash = getDigest(signerId, enableData, walletClient.chain?.id!);
    enableData.permissionEnableSig = encodePacked(['address', 'bytes'], [mockValidator, await walletClient.signMessage({account: walletClient.account!, message: hash})]);

    return enableData;
}

export const getDigest = (signerId: SignerId, data: EnableSessions, chainId: number): string => {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint256', 'uint256', 'address', 'bytes', 'tuple(address,bytes)[]', 'tuple(address,bytes)[]', 'tuple(bytes32,tuple(address,bytes)[])[]'],
      [
        signerId,
        0n, // @todo need to fetch nonce from smart session instead
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