import { describe, test } from 'vitest';
import { ContextBuilder } from '../src/ContextBuilder';
import { baseSepolia, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createSmartAccountClient } from '@biconomy/account';

describe("Context Builder Unit Tests", async () => {
    test('Should correctly format request', async () => {

        const contextBuilder = new ContextBuilder();

        const result = {
            grantedPermissions: [
              {
                type: 'native-token-transfer',
                policies: [
                  {
                    type: 'gas-limit',
                    data: {
                      limit: '1',
                    },
                  },
                  {
                    type: 'call-limit',
                    data: {
                      count: 1,
                    },
                  },
                ],
                required: true,
                data: {
                  address: '0xECF8B93B9b56F9105C329381C573E42640a27A73',
                  allowance: '0x1DCD6500'
                }
              },
              {
                type: 'erc20-token-transfer',
                policies: [
                  {
                    type: 'gas-limit',
                    data: {
                      limit: '1',
                    },
                  }
                ],
                required: false,
                data: {
                  address: '0xECF8B93B9b56F9105C329381C573E42640a27A73',
                  allowance: '0x3B9ACA00'
                }
              }
            ],
          
            expiry: 1577840461,
          
            permissionsContext: '0x',
          }

        const formattedReq = contextBuilder.formatRequest(result);
        console.log("Formatted: ", formattedReq);
    });

    // test('Should generate permission context', async () => {

    //     const contextBuilder = new ContextBuilder();

    //     const account = privateKeyToAccount("0x");

    //     const smartAccountClient = await createSmartAccountClient({
    //         signer: account,
    //         rpcUrl: baseSepolia.rpcUrls.default.http[0],
    //         chainId: baseSepolia.id,
    //         bundlerUrl: "https://api.pimlico.io/v2/84532/rpc?apikey=d4ba0b0e-26cc-4ea0-90d4-4e0e146705f2"
    //     })

    //     const context = await contextBuilder.getContext(wa, await smartAccountClient.getAddress())
    //     console.log("Context: ", context);
        
    // });
});