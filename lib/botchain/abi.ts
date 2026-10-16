/**
 * HandleRegistry's ABI.
 *
 * Hand-written and `as const` rather than imported from `contracts/out`. The const assertion is
 * what gives viem and wagmi their argument and return types; a generated JSON artifact loses that
 * unless it is cast, and a mistyped argument would then only surface as a revert.
 *
 * `NameTaken` carries the current owner, which is what lets the UI say who holds a name rather
 * than only that the transaction failed — so the custom errors are not optional here.
 */
export const handleRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }, { name: "to", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setPrimary",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "nameOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "isAvailable",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "isValid",
    stateMutability: "pure",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "nameHash", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
    ],
  },
  {
    type: "error",
    name: "NameTaken",
    inputs: [{ name: "name", type: "string" }, { name: "owner", type: "address" }],
  },
  {
    type: "error",
    name: "NotOwner",
    inputs: [{ name: "name", type: "string" }, { name: "owner", type: "address" }],
  },
  {
    type: "error",
    name: "TooShort",
    inputs: [{ name: "length", type: "uint256" }, { name: "min", type: "uint256" }],
  },
  {
    type: "error",
    name: "TooLong",
    inputs: [{ name: "length", type: "uint256" }, { name: "max", type: "uint256" }],
  },
  {
    type: "error",
    name: "InvalidCharacter",
    inputs: [{ name: "character", type: "bytes1" }, { name: "position", type: "uint256" }],
  },
  { type: "error", name: "LeadingOrTrailingHyphen", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
] as const;
