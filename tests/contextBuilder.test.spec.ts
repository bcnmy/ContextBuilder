import { describe, expect, test } from 'vitest';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, encodeAbiParameters, Hex, http, keccak256, parseAbiItem, parseAbiParameters, parseEther, toFunctionSelector } from 'viem';
import { digestEncoderAddress, simplerSignerAddress, timeFramePolicyAddress } from '../src/utils/constants';
import { getContext, getDigest } from '../index';
import { ActionData, PolicyData } from '../src/types/general';
import { donutContractAbi, donutContractaddress } from '../src/utils/contract';
import { encodeSecp256k1PublicKeyToDID } from '../src/utils/methods';

describe("Context Builder Unit Tests", async () => {
    test('Should generate permission context', async () => {
      const wKey = process.env.PRIVATE_KEY! as Hex;
      const account = privateKeyToAccount(wKey);

      const walletClient = createWalletClient({
        account,
        transport: http(),
        chain: sepolia,
      })

        // Initialize userOpPolicyData
      const userOpPolicyData: PolicyData[] = [];
      let policyInitData = encodeAbiParameters(parseAbiParameters("address"), [walletClient.account?.address!]);
      userOpPolicyData.push({ policy: simplerSignerAddress, initData: policyInitData });

      // Initialize actionPolicyData
      const blockTimestamp = Math.floor(Date.now() / 1000); // Current timestamp
      const actionPolicyData: PolicyData[] = [];
      policyInitData = encodeAbiParameters(parseAbiParameters("uint128, uint128"), [BigInt(blockTimestamp + 1000), BigInt(blockTimestamp - 1)]);
      actionPolicyData.push({ policy: timeFramePolicyAddress, initData: policyInitData });

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
          type: 'key',
          data: {
            id: encodeSecp256k1PublicKeyToDID(walletClient.account?.address),
            address: walletClient.account?.address
          }
       },
       account: walletClient.account?.address,
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

    test('Should calculate off-chain digest', async () => {
      const publicClient = createPublicClient({
        transport: http(),
        chain: sepolia,
      });
      
      const mockEnableData = {
        isigner: "0xd3C85Fdd3695Aee3f0A12B3376aCD8DC54020549" as Hex,
        isignerInitData: '0x000000000000000000000000d3c85fdd3695aee3f0a12b3376acd8dc54020549' as Hex,
        userOpPolicies: [
          {
            policy: '0x3bA365eC55098c8A559D651c05751C1d7C765899' as Hex,
            initData: '0x000000000000000000000000d3c85fdd3695aee3f0a12b3376acd8dc54020549' as Hex
          }
        ],
        erc1271Policies: [],
        actions: [
          {
            actionId: '0x27a652f8b0ea0b5a889e3fe594a5c9de6e0908a9abb11396a5bb49ce7a0a7c54' as Hex,
            actionPolicies: [] // The original data had [Array] here, but we'll use an empty array for now
          }
        ],
        permissionEnableSig: ''
      };

      const mockSignerId = "0x1234567890123456789012345678901234567890123456789012345678901234";

      const digest = getDigest(mockSignerId, mockEnableData, sepolia.id);

      const digestFromContract = await publicClient.readContract({
        address: digestEncoderAddress,
        abi: [parseAbiItem(["function digest(bytes32 signerId, uint256 nonce, EnableSessions memory data) external view returns (bytes32)", 
          "struct EnableSessions {address isigner; bytes isignerInitData; PolicyData[] userOpPolicies; PolicyData[] erc1271Policies; ActionData[] actions; bytes permissionEnableSig}",
          "struct PolicyData {address policy; bytes initData}",
          "struct ActionData {bytes32 actionId; PolicyData[] actionPolicies}"
        ])],
        functionName: "digest",
        args: [mockSignerId, BigInt(0), mockEnableData]
      })
    
      expect(digest).toBe(digestFromContract);
    })
});