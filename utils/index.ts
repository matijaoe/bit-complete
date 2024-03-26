import crypto from 'uncrypto'

export function secureRandom(count: number) {
  const rand = new Uint32Array(1)
  const skip = 0x7FFFFFFF - 0x7FFFFFFF % count
  let result

  if (((count - 1) & count) === 0) {
    crypto.getRandomValues(rand)
    return rand[0] & (count - 1)
  }
  do {
    crypto.getRandomValues(rand)
    result = rand[0] & 0x7FFFFFFF
  } while (result >= skip)
  return result % count
}

export const chunk = <TElem, TChunkSize extends number>(list: readonly TElem[], size: TChunkSize) => {
  if (!list || size < 1) {
    return []
  }

  const chunkCount = Math.ceil(list.length / Math.trunc(size))
  return Array.from(
    { length: chunkCount },
    (_v, i) => list.slice(i * size, i * size + size),
  )
}

export const dec2bin = (dec: number, padding: number) => {
  return dec.toString(2).padStart(padding, '0')
}

export const bin2dec = (bin: string) => {
  return Number.parseInt(bin, 2)
}

export const hex2bin = (hex: string, padding: number) => {
  return Number.parseInt(hex, 16).toString(2).padStart(padding, '0')
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
