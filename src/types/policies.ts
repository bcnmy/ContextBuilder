import { Hex } from "viem";

// The maximum gas limit spent in the session in total
export type GasLimitPolicy = {
  type: "gas-limit";
  data: {
    limit: Hex; // hex value
  };
};

// The number of calls the session can make in total
export type CallLimitPolicy = {
  type: "call-limit";
  data: {
    count: number;
  };
};

// The number of calls the session can make during each interval
export type RateLimitPolicy = {
  type: "rate-limit";
  data: {
    count: number; // the number of times during each interval
    interval: number; // in seconds
  };
};

// The amount of Native Token that can be spent by a permission
export type NativeTokenSpendLimitPolicy = {
  type: "spent-limit";
  data: {
    allowance: Hex; // hex value
  };
};