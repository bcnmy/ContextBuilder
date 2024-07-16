import { describe, expect, test } from 'vitest';
import { ContextBuilder } from '../src/ContextBuilder';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, Hex, http, parseAbiItem } from 'viem';
import { digestEncoderAddress } from '../src/utils/constants';

describe("Context Builder Unit Tests", async () => {
    test('Should generate permission context', async () => {
        const contextBuilder = new ContextBuilder();
        
        const wKey = process.env.PRIVATE_KEY! as Hex;
        const account = privateKeyToAccount(wKey);

        const walletClient = createWalletClient({
          transport: http(),
          chain: sepolia,
          account
        })

        const context = await contextBuilder.getContext(walletClient)
      
        expect(context).toBeDefined();
    });

    test('Should calculate off-chain digest', async () => {
      const contextBuilder = new ContextBuilder();
      const publicClient = createPublicClient({
        transport: http(),
        chain: sepolia,
      });
      const walletClient = createWalletClient({
        account: privateKeyToAccount(process.env.PRIVATE_KEY! as Hex),
        chain: sepolia,
        transport: http()
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

      const digest = contextBuilder.getDigest(mockSignerId, BigInt(1), mockEnableData);

      const digestFromContract = await publicClient.readContract({
        address: digestEncoderAddress,
        abi: [parseAbiItem(["function digest(bytes32 signerId, uint256 nonce, EnableSessions memory data) external view returns (bytes32)", 
          "struct EnableSessions {address isigner; bytes isignerInitData; PolicyData[] userOpPolicies; PolicyData[] erc1271Policies; ActionData[] actions; bytes permissionEnableSig}",
          "struct PolicyData {address policy; bytes initData}",
          "struct ActionData {bytes32 actionId; PolicyData[] actionPolicies}"
        ])],
        functionName: "digest",
        args: [mockSignerId, BigInt(1), mockEnableData]
      })
    
      expect(digest).toBe(digestFromContract);
    })
});