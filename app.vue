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

// 23 words
const seedphrase = ref<string[]>([])
const seedphraseArr = computed(() => seedphrase.value.join(' '))

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
	const seedphrase = words.concat(lastWord)

	return {
		lastWord,
		seedphrase,
	}
}

const calculateSeed = async () => {
	incompleteSeed.value = (await generateIncompleteSeed()).join(' ')
	console.log('incompleteSeedStr.value :', incompleteSeed)

	const res = await calculateLastWord(incompleteSeedArr.value)
	seedphrase.value = res.seedphrase
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
					<label
						for="incomplete-words-input"
						class="text-sm"
					>
						Fill in your first 23 words (space separated)
						<span>{{ incompleteSeedArr.length }}</span>
					</label>
					<input
						class="mb-0!"
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
				v-if="seedphraseArr"
				class="mt-4"
			>
				<input
					type="text"
					:value="seedphraseArr"
				/>
			</div>
		</main>
	</Body>
</template>

<style lang="postcss">
@import url('@picocss/pico/css/pico.css');

</style>
