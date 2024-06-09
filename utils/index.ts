import crypto from 'uncrypto'
import { wordlistEn } from '~/wordlist/bip39-en'

export function secureRandom(count: number) {
  const rand = new Uint32Array(1)
  const skip = 0x7fffffff - (0x7fffffff % count)
  let result

  if (((count - 1) & count) === 0) {
    crypto.getRandomValues(rand)
    return rand[0] & (count - 1)
  }
  do {
    crypto.getRandomValues(rand)
    result = rand[0] & 0x7fffffff
  } while (result >= skip)
  return result % count
}

export const chunk = <TElem, TChunkSize extends number>(list: readonly TElem[], size: TChunkSize) => {
  if (!list || size < 1) {
    return []
  }

  const chunkCount = Math.ceil(list.length / Math.trunc(size))
  return Array.from({ length: chunkCount }, (_v, i) => list.slice(i * size, i * size + size))
}

export const dec2bin = (dec: number, padding: number) => {
  return dec.toString(2).padStart(padding, '0')
}

export const bin2dec = (bin: string) => {
  return Number.parseInt(bin, 2)
}

export const hexChar2bin = (hexChar: string) => {
  return Number.parseInt(hexChar, 16).toString(2).padStart(4, '0')
}

export const hex2bin = (hex: string) => {
  return hex.split('').map(hexChar2bin).join('')
}

// Function to convert a string of binary digits to a Uint8Array of bytes
// similar to -0 mode in shasum, although it does not provide the same exact cash, checksum is valid (although using different word)
export const binaryStringToBytes = (binaryString: string) => {
  const bytes = []
  for (let i = 0; i < binaryString.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (binaryString[i + j] === '1' ? 1 : 0)
    }
    bytes.push(byte)
  }
  return new Uint8Array(bytes)
}

// Function to calculate SHA-256 hash from a string of binary digits
// takes in 0s and 1s only
export const sha256bitsMode = async (bits: string) => {
  // Convert the input bits string to bytes
  const dataAsBytes = binaryStringToBytes(bits)

  // Calculate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataAsBytes)

  // Convert hashBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Generate all possible permutations of the varying bits
 *
 * @example numBits = 3
 * => ['000', '001', '010', '011', '100', '101', '110', '111']
 */
function generateBitPermutations(numBits: number): string[] {
  const numPermutations = 2 ** numBits

  const bitPermutationsBits = Array.from({ length: numPermutations }, (_, i) => {
    // Convert i to a binary string and pad with leading zeros to ensure it's always numBits long
    return i.toString(2).padStart(numBits, '0')
  })

  return bitPermutationsBits
}

export const calculateChecksumWords = async (stringSeedPhrase: string) => {
  const BITS_PER_WORD = 11

  const seedPhrase = stringSeedPhrase.toLowerCase().trim().split(' ')

  if (seedPhrase.length !== 11 && seedPhrase.length !== 23) {
    throw new Error('Invalid number of seed phrase words. Must be 11 or 23.')
  }

  // Get the decimal representation of the incomplete words
  const concatBits = seedPhrase
    // Get the index of each word in the wordlist
    .map((word) => wordlistEn.indexOf(word))
    // Convert each index to a 11-bit binary number
    .map((c) => dec2bin(c, BITS_PER_WORD))
    // Join the binary numbers together
    .join('')

  const concatBitsLength = concatBits.length

  if (concatBitsLength !== 11 * seedPhrase.length) {
    throw new Error('Invalid number of bits in seed phrase.')
  }

  // 23 words | 11 words
  const checksumLengthBits = (concatBitsLength + BITS_PER_WORD) / 33 // 8 | 4
  const entropyLengthBits = concatBitsLength + BITS_PER_WORD - checksumLengthBits // 256 | 128
  const varyingLengthBits = entropyLengthBits - concatBitsLength // 3 | 7

  const bitPermutationsBits = generateBitPermutations(varyingLengthBits)

  const checksumWords = await Promise.all(
    bitPermutationsBits.map(async (permutationBits) => {
      // concat bits + varying bits
      const entropyBits = `${concatBits}${permutationBits}`

      // hash of 256 | 128 bits
      const entropyHash = await sha256bitsMode(entropyBits)
      const entropyHashBits = hex2bin(entropyHash)

      // Get first 8 | 4 bits of the hash (2 | 1 hex characters)
      const checksumBits = entropyHashBits.slice(0, checksumLengthBits)

      // Construct the full 11-bit word
      const wordBits = `${permutationBits}${checksumBits}`
      const wordIndex = bin2dec(wordBits)
      const word = wordlistEn[wordIndex]

      return word
    })
  )

  return checksumWords
}

export const getRandomItem = async <T>(list: T[]) => {
  const randomIndex = secureRandom(list.length)
  return list[randomIndex]
}
