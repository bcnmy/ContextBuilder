import { describe, expect, test } from 'vitest';
import { baseSepolia, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, encodeAbiParameters, Hex, http, keccak256, parseAbiParameters, parseEther, toFunctionSelector } from 'viem';
import { multiKeySignerAddress, timeFramePolicyAddress } from '../src/utils/constants';
import { getContext } from '../index';
import { ActionData, PolicyData } from '../src/types/general';
import { donutContractAbi, donutContractaddress } from '../src/utils/contract';
import { decodeDIDToPublicKey, encodeSecp256k1PublicKeyToDID } from '../src/utils/methods';

describe("Context Builder Unit Tests", async () => {
  test('Should generate permission context - Base Sepolia', async () => {
    const wKey = process.env.PRIVATE_KEY! as Hex;
    const account = privateKeyToAccount(wKey);

    const walletClient = createWalletClient({
      account,
      transport: http(),
      chain: baseSepolia,
    })

    const chainId = walletClient.chain?.id;

    // Initialize userOpPolicyData
    const userOpPolicyData: PolicyData[] = [];
    let policyInitData = encodeAbiParameters(parseAbiParameters("address"), [walletClient.account?.address!]);
    userOpPolicyData.push({ policy: multiKeySignerAddress[chainId], initData: policyInitData });

    // Initialize actionPolicyData
    const blockTimestamp = Math.floor(Date.now() / 1000); // Current timestamp
    const actionPolicyData: PolicyData[] = [];
    policyInitData = encodeAbiParameters(parseAbiParameters("uint128, uint128"), [BigInt(blockTimestamp + 1000), BigInt(blockTimestamp - 1)]);
    actionPolicyData.push({ policy: timeFramePolicyAddress[chainId], initData: policyInitData });

    const donutPurchase = toFunctionSelector('function purchase()');

    // Compute actionId
    const actionId = keccak256(encodeAbiParameters(
      parseAbiParameters("address, bytes4"),
      [donutContractaddress, donutPurchase]
    )
    );

    // Initialize actions
    const actions: ActionData[] = [];
    actions.push({ actionId: actionId, actionPolicies: actionPolicyData });

    const context = await getContext(walletClient, {
      signer: {
        type: 'keys',
        data: {
          ids: [encodeSecp256k1PublicKeyToDID(walletClient.account?.address), "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169"],
        }
      },
      smartAccountAddress: walletClient.account?.address,
      permissions: [
        {
          type: {
            custom: 'donut-purchase'
          },
          data: {
            target: donutContractaddress,
            abi: donutContractAbi,
            valueLimit: parseEther('0.001'),
            functionName: 'function purchase()'
          },
          policies: [],
          required: true
        }
      ],
      expiry: Date.now() + 1000
    })

    expect(context).toBeDefined();
  });

  test('Should generate permission context - Sepolia', async () => {
    const wKey = process.env.PRIVATE_KEY! as Hex;
    const account = privateKeyToAccount(wKey);

    const walletClient = createWalletClient({
      account,
      transport: http(),
      chain: sepolia,
    })

    const chainId = walletClient.chain?.id;

    // Initialize userOpPolicyData
    const userOpPolicyData: PolicyData[] = [];
    let policyInitData = encodeAbiParameters(parseAbiParameters("address"), [walletClient.account?.address!]);
    userOpPolicyData.push({ policy: multiKeySignerAddress[chainId], initData: policyInitData });

    // Initialize actionPolicyData
    const blockTimestamp = Math.floor(Date.now() / 1000); // Current timestamp
    const actionPolicyData: PolicyData[] = [];
    policyInitData = encodeAbiParameters(parseAbiParameters("uint128, uint128"), [BigInt(blockTimestamp + 1000), BigInt(blockTimestamp - 1)]);
    actionPolicyData.push({ policy: timeFramePolicyAddress[chainId], initData: policyInitData });

    const donutPurchase = toFunctionSelector('function purchase()');

    // Compute actionId
    const actionId = keccak256(encodeAbiParameters(
      parseAbiParameters("address, bytes4"),
      [donutContractaddress, donutPurchase]
    )
    );

    // Initialize actions
    const actions: ActionData[] = [];
    actions.push({ actionId: actionId, actionPolicies: actionPolicyData });

    const context = await getContext(walletClient, {
      signer: {
        type: 'keys',
        data: {
          ids: [encodeSecp256k1PublicKeyToDID(walletClient.account?.address), "did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169"],
        }
      },
      smartAccountAddress: walletClient.account?.address,
      permissions: [
        {
          type: {
            custom: 'donut-purchase'
          },
          data: {
            target: donutContractaddress,
            abi: donutContractAbi,
            valueLimit: parseEther('0.001'),
            functionName: 'function purchase()'
          },
          policies: [],
          required: true
        }
      ],
      expiry: Date.now() + 1000
    })

    expect(context).toBeDefined();
  });

  // test('Should calculate off-chain digest', async () => {
  //   const publicClient = createPublicClient({
  //     transport: http(),
  //     chain: baseSepolia,
  //   });

  //   const mockEnableData = {
  //     isigner: "0xdB3CCF893b55020153444e163EB0e7fCB4F2f721" as Hex,
  //     isignerInitData: '0x000000000000000000000000d3c85fdd3695aee3f0a12b3376acd8dc54020549' as Hex,
  //     userOpPolicies: [
  //       {
  //         policy: '0x3bA365eC55098c8A559D651c05751C1d7C765899' as Hex,
  //         initData: '0x000000000000000000000000d3c85fdd3695aee3f0a12b3376acd8dc54020549' as Hex
  //       }
  //     ],
  //     erc1271Policies: [],
  //     actions: [
  //       {
  //         actionId: '0x27a652f8b0ea0b5a889e3fe594a5c9de6e0908a9abb11396a5bb49ce7a0a7c54' as Hex,
  //         actionPolicies: [] // The original data had [Array] here, but we'll use an empty array for now
  //       }
  //     ],
  //     permissionEnableSig: ''
  //   };

  //   const mockSignerId = "0x30f5bc16f8bd33b236143f821fed5a500e1cb1b3559f1cbea62b0229c37da89f";

  //   const digest = getDigest(mockEnableData, baseSepolia.id);

  //   const digestFromContract = await publicClient.readContract({
  //     address: digestEncoderAddress,
  //     abi: [parseAbiItem(["function digest(bytes32 signerId, uint256 nonce, EnableSessions memory data) external view returns (bytes32)", 
  //       "struct EnableSessions {address isigner; bytes isignerInitData; PolicyData[] userOpPolicies; PolicyData[] erc1271Policies; ActionData[] actions; bytes permissionEnableSig}",
  //       "struct PolicyData {address policy; bytes initData}",
  //       "struct ActionData {bytes32 actionId; PolicyData[] actionPolicies}"
  //     ])],
  //     functionName: "digest",
  //     args: [mockSignerId, BigInt(0), mockEnableData]
  //   })

  //   expect(digest).toBe(digestFromContract);
  // })

  test('Should decode did key', async () => {
    const result = decodeDIDToPublicKey("did:key:zDnaerDaTF5BXEavCrfRZEk316dpbLsfPDZ3WJ5hRTPFU2169");
    expect(result.key).toBe("0x19aa820aaa856b2f4f298cbe599e964e3f652f7d0a0cdd97c8188460173640653542")
    expect(result.keyType).toBe("secp256r1")
  })
});