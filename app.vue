<script lang="ts" setup>
import { wordlistEn } from './wordlist/bip39-en'

// 23 words
const incompleteSeed = ref<string>('')
const incompleteSeedArr = computed({
	get: () => incompleteSeed.value?.split(/\s+/).filter(Boolean) || [],
	set: (val: string[]) => {
		incompleteSeed.value = val.join(' ')
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
	incompleteSeedArr.value = await generateIncompleteSeed()
}

// 23 word array
const calculateLastWord = async (words: string[]) => {
	const words23AsDecimals = words.map((word) => wordlistEn.indexOf(word))
	const word23AsBinary = words23AsDecimals.map((c) => dec2bin(c, 11)).join('')

	const hashed = await sha256bitsMode(word23AsBinary)
	const checksum = hashed.slice(0, 2).split('')
	const checksumBits = checksum.map((n) => hex2bin(n, 4)).join('')

	const seedphraseBinary = `${word23AsBinary}${checksumBits}`

	const wordsBinary = chunk(seedphraseBinary.split(''), 11)
	const wordsDecimal = wordsBinary.map((chunk) => chunk.join('')).map(bin2dec)

	const lastWord = wordlistEn[wordsDecimal[23]]

	return lastWord
}

const calculateSeed = async () => {
	loading.value = true
	const lastWord = await calculateLastWord(incompleteSeedArr.value)
	loading.value = false
	seedWords.value = [...incompleteSeedArr.value, lastWord]
}

const isInputValid = () => {
	const rgx = /^(\b\w+\b\s?){23}$/g
	return rgx.test(incompleteSeed.value)
}
</script>

<template>
	<Body>
		<main class="container-fluid max-w-8xl py-8">
			<div class="flex items-end gap-2 w-full">
				<div class="grow">
					<label for="incomplete-words-input">
						Fill in your first 23 words
					</label>
					<input
						class="mb-0! font-mono text-sm"
						id="incomplete-words-input"
						pattern="^(\b\w+\b\s?){23}$"
						:aria-invalid="
							incompleteSeed.trim() && !isInputValid() ? true : undefined
						"
						type="text"
						v-model="incompleteSeed"
					/>
				</div>

				<div class="flex gap-2">
					<button
						v-if="!incompleteSeedArr.length"
						class="secondary"
						@click="onGenerateIncompleteWordsHandler"
					>
						Generate
					</button>
					<button
						:disabled="incompleteSeedArr.length !== 23"
						@click="calculateSeed"
					>
						Calculate
					</button>
				</div>
			</div>

			<div
				v-if="seedphrase"
				class="mt-4"
			>
				<input
					class="text-sm font-mono"
					type="text"
					:value="seedphrase"
					readonly
				/>

				<div class="mt-2 text-xl text-right">
					<p>
						24th word is <strong>{{ seedWords.at(-1) }}</strong>
					</p>
				</div>
			</div>
		</main>
	</Body>
</template>

<style lang="postcss">
@import url('@picocss/pico/css/pico.css');
</style>
