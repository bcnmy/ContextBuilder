import bs58 from 'bs58'
import { encodePacked, type Hex } from 'viem'
import { type Signer, SignerType } from '../types/signers'

export const encodeSecp256k1PublicKeyToDID = (publicKey: string) => {
    // Remove '0x' prefix if present
    publicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey
  
    // Convert publicKey to Buffer
    const publicKeyBuffer = Buffer.from(publicKey, 'hex')
  
    // Base58 encode the address
    const encodedPublicKey = bs58.encode(publicKeyBuffer)
  
    // Construct the did:key
    return `did:key:zQ3s${encodedPublicKey}`
  }

  
export function encodeSigners(signers: Signer[]): Hex {
  let encoded: Hex = encodePacked(['uint8'], [signers.length]);
  // signer.data = decoded public key from DID
  for (const signer of signers) {
    encoded = encodePacked(
      ['bytes', 'uint8', 'bytes'],
      [encoded, signer.type, signer.data as Hex]
    );
  }
  
  return encoded;
}

export enum KEY_TYPES {
  secp256k1 = 'secp256k1',
  secp256r1 = 'secp256r1'
}

export const decodeDIDToPublicKey = (
  did: string
): {
  key: `0x${string}`
  keyType: KEY_TYPES
} => {
  // Define the DID prefix to key type mapping
  const didPrefixToKeyType: Record<string, KEY_TYPES> = {
    'did:key:zQ3s': KEY_TYPES.secp256k1,
    'did:key:zDn': KEY_TYPES.secp256r1
  }

  // Find the matching key type prefix
  const matchingPrefix = Object.keys(didPrefixToKeyType).find(prefix => did.startsWith(prefix))

  if (!matchingPrefix) {
    throw new Error('Invalid DID format. Unsupported key type.')
  }

  // Extract the Base58 encoded part
  const encodedPart = did.slice(matchingPrefix.length)

  // Decode the Base58 string
  const decodedBuffer = bs58.decode(encodedPart)

  // Convert the Buffer to a hex string
  const publicKey = Buffer.from(decodedBuffer).toString('hex')

  // Add the '0x' prefix
  const formattedPublicKey = `0x${publicKey}` as Hex
  
  const keyType = didPrefixToKeyType[matchingPrefix]

  return {
    key: formattedPublicKey,
    keyType
  }
}

export const getSignerType = (keyType: KEY_TYPES): SignerType => {
  switch (keyType) {
    case KEY_TYPES.secp256k1:
      return SignerType.EOA
    case KEY_TYPES.secp256r1:
      return SignerType.PASSKEY
    default:
      return SignerType.EOA
  }
}

export function bigIntReplacer(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString()
  }

  return value
}