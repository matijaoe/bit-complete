<script lang="ts" setup>
import { wordlistEn } from './wordlist/bip39-en'

// 23 words
const incompleteSeedphrase = ref<string>('')
const incompleteSeedWords = computed({
	get: () => incompleteSeedphrase.value?.split(/\s+/).filter(Boolean) || [],
	set: (val: string[]) => {
		incompleteSeedphrase.value = val.join(' ')
	},
})

const loading = ref(false)

// 24 words
const seedWords = ref<string[]>([])
const seedphrase = computed(() => seedWords.value.join(' '))

// first 23 words
const generateIncompleteSeed = async () => {
	const randomBits = Array.from({ length: 253 }, () => secureRandom(2)) // 253 bits

	const bitsString = randomBits.join('')

	const wordsAsBinary = chunk(bitsString.split(''), 11).map((chunk) =>
		chunk.join('')
	)

	const decimalChunks23 = wordsAsBinary.map(bin2dec)

	const words = decimalChunks23.map((dec) => wordlistEn[dec])

	return words
}

const onGenerateIncompleteWordsHandler = async () => {
	incompleteSeedWords.value = await generateIncompleteSeed()
}

// 23 word array
const calculateLastWord = async (words: string[]) => {
	const words23AsDecimals = words.map((word) => wordlistEn.indexOf(word))
	const word23AsBinary = words23AsDecimals.map((c) => dec2bin(c, 11)).join('')

	const hashed = await sha256bitsMode(word23AsBinary)
	const checksum = hashed.slice(0, 2).split('')
	const checksumBits = checksum.map((n) => hex2bin(n, 4)).join('')

	const seedphraseBinary = `${word23AsBinary}${checksumBits}`

	const wordsBinary = chunk(seedphraseBinary.split(''), 11).map((chunk) =>
		chunk.join('')
	)
	const wordsDecimal = wordsBinary.map(bin2dec)

	const lastWord = wordlistEn[wordsDecimal[23]]

	return lastWord
}

const calculateSeed = async () => {
	loading.value = true
	const lastWord = await calculateLastWord(incompleteSeedWords.value)
	loading.value = false
	seedWords.value = [...incompleteSeedWords.value, lastWord]
}

const isInputValid = computed(() => {
	const rgx = /^(\b\w+\b\s?){23}$/g
	const containsInvalidWords = incompleteSeedWords.value.some(
		(word) => !wordlistEn.includes(word)
	)
	const isComplete = rgx.test(incompleteSeedphrase.value)
	return !containsInvalidWords && isComplete
})

const clear = () => {
	incompleteSeedWords.value = []
	seedWords.value = []
}

watch(isInputValid, (valid) => {
	if (!valid) {
		seedWords.value = []
	}
})
</script>

<template>
	<Body>
		<div class="min-h-screen flex flex-col justify-between">
			<main class="container-fluid max-w-5xl py-8 grow">
				<div class="text-xs mb-10">
					<details>
						<summary>Why?</summary>
						<div>
							<p>
								In a BIP39 seed phrase, not every word can be used as a final
								word. The last word serves as a kind of "checksum", ensuring
								that the seed phrase follows the rules laid out in the BIP39
								standard.
							</p>

							<p>
								In case of 24-word seedphrase, checksum is calculated by hashing
								the first 23 words along with the first 3 bytes of the 24th
								word, taking the first 8 bits of that hash and appending them to
								first 3 bits, in order to find one of the valid 24th words.
							</p>
						</div>
					</details>
				</div>

				<div class="grow">
					<label for="incomplete-words-input"> Your first 23 words </label>
					<textarea
						class="text-sm leading-loose"
						id="incomplete-words-input"
						pattern="^(\b\w+\b\s?){23}$"
						:aria-invalid="
							incompleteSeedphrase.trim() && !isInputValid ? true : undefined
						"
						type="text"
						v-model="incompleteSeedphrase"
					/>
				</div>

				<div class="flex justify-end gap-3 mt-3">
					<button
						v-if="!incompleteSeedWords.length"
						class="secondary"
						@click="onGenerateIncompleteWordsHandler"
					>
						Generate
					</button>
					<button
						v-else
						class="secondary"
						@click="clear"
					>
						Clear
					</button>
					<button
						:disabled="!isInputValid"
						@click="calculateSeed"
					>
						Calculate
					</button>
				</div>

				<div
					v-if="seedphrase"
					class="mt-4"
				>
					<label for="incomplete-words-input">Final seedphrase</label>
					<textarea
						class="text-sm leading-loose"
						type="text"
						:value="seedphrase"
						readonly
					/>

					<div class="mt-3 text-xl text-left">
						<p>
							24th word:
							<strong
								class="underline decoration-pink-500 decoration-offset-3"
								>{{ seedWords.at(-1) }}</strong
							>
						</p>
					</div>
				</div>
			</main>

			<footer class="mt-auto py-8 text-xs text-center text-muted">
				by
				<NuxtLink
					to="https://matijao.com"
					class="contrast"
				>
					matija</NuxtLink
				>
				on
				<NuxtLink
					to="https://github.com/matijao/bitcoin-seed-finisher"
					class="contrast"
					>github</NuxtLink
				>
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
	font-family: 'Martian Mono', ui-monospace, Menlo, Monaco, 'Cascadia Mono',
		'Segoe UI Mono', 'Roboto Mono', 'Oxygen Mono', 'Ubuntu Monospace',
		'Source Code Pro', 'Fira Mono', 'Droid Sans Mono', 'Courier New', monospace;
}
</style>
