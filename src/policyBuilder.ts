// import { encodeAbiParameters } from "viem";
// import { ActionData, PolicyData } from "./types/general";

// export const getParsedPolicies = (userOpPolicies: Policy[], actions: ActionData[]) => {
//      // Initialize userOpPolicyData
//     let policyInitData = encodeAbiParameters(parseAbiParameters("address"), [signerAddress]);
//     userOpPolicyData.push({ policy: simplerSignerAddress, initData: policyInitData });

//     // Initialize actionPolicyData
//     const blockTimestamp = Math.floor(Date.now() / 1000); // Current timestamp
//     const actionPolicyData: PolicyData[] = [];
//     policyInitData = encodeAbiParameters(parseAbiParameters("uint128, uint128"), [BigInt(blockTimestamp + 1000), BigInt(blockTimestamp - 1)]);
//     actionPolicyData.push({ policy: timeFramePolicyAddress, initData: policyInitData });

//     const incrementSelector = toFunctionSelector('function increment()');

//     // Compute actionId
//     const actionId = keccak256(encodeAbiParameters(
//     parseAbiParameters("address, bytes4"),
//         [counterContractAddress, incrementSelector]
//     )
//     );

//     // Initialize actions
//     const actions: ActionData[] = [];
//     actions.push({ actionId: actionId, actionPolicies: actionPolicyData });
// }