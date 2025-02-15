<script lang="ts" setup>
import { wordlistEn } from './wordlist/bip39-en'

// Incomplete seed phrase (without last word)
const partialSeedPhrase = ref<string>('')
const partialSeedWords = computed({
  get: () => partialSeedPhrase.value?.split(/\s+/).filter(Boolean) || [],
  set: (val: string[]) => {
    partialSeedPhrase.value = val.join(' ')
  },
})

const seedWords = ref<string[]>([])
const seedphrase = computed(() => seedWords.value.join(' '))

const checksumWords = ref<string[]>([])
const selectedChecksumWord = ref<string>('')

const setRandomChecksumWord = async () => {
  selectedChecksumWord.value = await getRandomItem(checksumWords.value)
}

const changeChecksumWord = async () => {
  // call setRandomChecksumWord until we get a different word
  const word = await getRandomItem(checksumWords.value)
  // ensure we get a different word
  if (word !== selectedChecksumWord.value) {
    selectedChecksumWord.value = word
  } else {
    changeChecksumWord()
  }
}

watch(
  checksumWords,
  async (_words) => {
    await setRandomChecksumWord()
  },
  { immediate: true }
)

watch(
  selectedChecksumWord,
  (word) => {
    seedWords.value = [...partialSeedWords.value, word]
  },
  { immediate: true }
)

const loading = ref(false)

const generateIncompleteSeed = async (len: 11 | 23) => {
  const bitsNeeded = len * 11
  const entropy = Array.from({ length: bitsNeeded }, () => secureRandom(2))

  const wordsBits = chunk(entropy, 11).map((chunk) => chunk.join(''))

  const wordsDecimal = wordsBits.map(bin2dec)

  const words = wordsBits.map((wordBits) => {
    const wordDec = bin2dec(wordBits)
    return wordlistEn[wordDec]
  })

  return words
}

const onGenerateIncompleteWordsHandler = async (len: 11 | 23) => {
  partialSeedWords.value = await generateIncompleteSeed(len)
}

const calculateSeed = async () => {
  loading.value = true
  checksumWords.value = await calculateChecksumWords(partialSeedPhrase.value)
  loading.value = false
}

const isInputValid = computed(() => {
  const rgx = /^((\b\w+\b\s?){11}|(\b\w+\b\s?){14}|(\b\w+\b\s?){17}|(\b\w+\b\s?){19}|(\b\w+\b\s?){23})$/g
  const containsInvalidWords = partialSeedWords.value.some((word) => !wordlistEn.includes(word))
  const isComplete = rgx.test(partialSeedPhrase.value)
  return !containsInvalidWords && isComplete
})

const clear = () => {
  partialSeedWords.value = []
  seedWords.value = []
  checksumWords.value = []
}

watch(isInputValid, (valid) => {
  if (!valid) {
    seedWords.value = []
  }
})

const selectAll = (e: MouseEvent) => {
  const target = e.target as HTMLTextAreaElement
  target.select()
}
</script>

<template>
  <Body>
    <div class="min-h-screen flex flex-col justify-between">
      <main class="container-fluid max-w-5xl py-8 grow">
        <div class="text-xs mb-8">
          <details>
            <summary>Why?</summary>
            <div>
              <p>
                In a BIP39 seed phrase, not every word can be used as a final word. The last word serves as a kind of
                <em>checksum</em>, ensuring that the seed phrase follows the rules laid out in the BIP39 standard.
              </p>

              <p>
                In case of 24-word seedphrase, checksum is calculated by hashing the bits of first 23 words along with
                the first 3 bits of the 24th word, in order to find one of the valid checksum words.
              </p>
            </div>
          </details>
        </div>

        <div class="grow">
          <label for="incomplete-words-input"> Your seedphrase (without last word)</label>
          <textarea
            class="text-sm leading-loose resize-none"
            id="incomplete-words-input"
            pattern="^(\b\w+\b\s?){11,23}$"
            :aria-invalid="partialSeedPhrase.trim() && !isInputValid ? true : undefined"
            type="text"
            v-model="partialSeedPhrase"
            @dblclick="selectAll"
          />
        </div>

        <!-- TODO: enable working with 20, 18 and 15 words seedphrases in UI - it also supports them -->
        <div class="flex justify-end gap-3 mt-3">
          <button v-if="!partialSeedWords.length" class="secondary" @click="onGenerateIncompleteWordsHandler(11)">
            Generate (11)
          </button>

          <button v-if="!partialSeedWords.length" class="secondary" @click="onGenerateIncompleteWordsHandler(23)">
            Generate (23)
          </button>
          <button v-else class="secondary" @click="clear">Clear</button>
          <button :disabled="!isInputValid" @click="calculateSeed">Calculate</button>
        </div>

        <div v-if="seedphrase" class="mt-2">
          <label for="complete-words-input">Complete seedphrase</label>
          <textarea
            id="complete-words-input"
            class="text-sm leading-loose resize-none"
            type="text"
            :value="seedphrase"
            readonly
            @dblclick="selectAll"
          />

          <div class="mt-12">
            <label for="checksum-words">Checksum words</label>

            <div class="flex items-center gap-4">
              <select id="checksum-words" name="checksum-words" required v-model="selectedChecksumWord" class="mb-0">
                <option v-for="word in checksumWords" :value="word" :key="word">{{ word }}</option>
              </select>
              <button class="secondary" @click="changeChecksumWord">Change</button>
            </div>
          </div>
        </div>
      </main>

      <footer class="mt-auto py-8 text-xs text-center text-muted">
        by
        <NuxtLink to="https://matijao.com" class="contrast"> matija</NuxtLink>
        on
        <NuxtLink to="https://github.com/matijaoe/bit-complete" class="contrast">github</NuxtLink>
      </footer>
    </div>
  </Body>
</template>

<style lang="postcss">
@import url('@picocss/pico/css/pico.css');
@import url('https://fonts.cdnfonts.com/css/martian-mono');

.text-muted {
  color: #7b8495;
}

body {
  font-family: 'Martian Mono', ui-monospace, Menlo, Monaco, 'Cascadia Mono', 'Segoe UI Mono', 'Roboto Mono',
    'Oxygen Mono', 'Ubuntu Monospace', 'Source Code Pro', 'Fira Mono', 'Droid Sans Mono', 'Courier New', monospace;
}
</style>
