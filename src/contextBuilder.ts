import type { EnableSessions, GrantPermissionsRequestParams, PrepareMockEnableDataParams } from "./types/general";
import { EXECUTE_SINGLE, SmartSessionMode } from "./types/general";
import { type Hex, type WalletClient, encodeAbiParameters, encodePacked, keccak256, parseAbiParameters, toBytes, toFunctionSelector } from "viem";
import { mockValidator, smartSessionAddress, timeFramePolicyAddress, multiKeySignerAddress } from "./utils/constants";
import { ethers } from "ethers";
import { decodeDIDToPublicKey, encodeSigners, getSignerType } from "./utils/methods";
import { Signer, SignerType } from "./types/signers";

export const getContext = async (walletClient: WalletClient, {
  smartAccountAddress,
  permissions,
  expiry,
  signer
}: GrantPermissionsRequestParams): Promise<`0x${string}`> => {
  // Convert the address to a BigInt (equivalent to uint160 in Solidity)
  const uint160Address = BigInt(smartSessionAddress);

  // Shift left by 32 bits to get the uint192 value
  const nonceKey = uint160Address << BigInt(32);

  let signers: Signer[] = [];
  if(signer.type === "keys") {
    signers = signer.data.ids.map((id) => ({type: getSignerType(decodeDIDToPublicKey(id).keyType), data: id}));
  }
  const signerId = keccak256(encodeAbiParameters(parseAbiParameters("address, bytes"), [multiKeySignerAddress, encodeSigners(signers)])) // do I need to pass signer.data.address here instead ?

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
      smartAccountAddress,
      signer, 
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
    smartAccountAddress,
    signer,
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
    let signers: Signer[]  = [];
    if(signer.type === "keys") {
      signers = signer.data.ids.map((id) => ({type: getSignerType(decodeDIDToPublicKey(id).keyType), data: id}));
    }
    // Construct enableData    
    let enableData: EnableSessions = {
        isigner: multiKeySignerAddress, // Example ISigner address
        isignerInitData: toBytes(encodeSigners(signers)),
        userOpPolicies,
        erc1271Policies,
        actions,
        permissionEnableSig: toBytes("") 
    };

    const abi = [
      "function getDigest(address isigner, address account, tuple(address isigner, bytes isignerInitData, tuple(address policy, bytes initData)[] userOpPolicies, tuple(address policy, bytes initData)[] erc1271Policies, tuple(bytes32 actionId, tuple(address policy, bytes initData)[] actionPolicies)[] actions, bytes permissionEnableSig) data, uint8 mode) view returns (bytes32)"
    ];
    const provider = new ethers.JsonRpcProvider(walletClient.chain.rpcUrls.default.http[0]);
    const contract = new ethers.Contract(smartSessionAddress, abi, provider);
  
    const digest = await contract.getDigest(
      multiKeySignerAddress,
      smartAccountAddress,
      enableData,
      SmartSessionMode.UNSAFE_ENABLE
    );

    enableData.permissionEnableSig = toBytes(encodePacked(['address', 'bytes'], [mockValidator, await walletClient.signMessage({account: walletClient.account!, message: digest})]));
    return enableData;
}

// export const getDigest = (data: EnableSessions, chainId: number): string => {
//   return ethers.keccak256(
//     ethers.AbiCoder.defaultAbiCoder().encode(
//       ['address', 'uint256', 'uint256', 'uint8', 'address', 'bytes', 'tuple(address,bytes)[]', 'tuple(address,bytes)[]', 'tuple(bytes32,tuple(address,bytes)[])[]'],
//       [
//         multiKeySignerAddress,
//         0n, // @todo need to fetch nonce from smart session instead
//         chainId, 
//         SmartSessionMode.UNSAFE_ENABLE,
//         data.isigner,
//         data.isignerInitData,
//         data.userOpPolicies.map(p => [p.policy, p.initData]),
//         data.erc1271Policies.map(p => [p.policy, p.initData]),
//         data.actions.map(a => [a.actionId, a.actionPolicies.map(p => [p.policy, p.initData])])
//       ]
//     )
//   );
// }