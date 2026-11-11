# zennia

A calm web app for learning Japanese from zero: hiragana, katakana, then the basic (JLPT N5) vocabulary. It shows a kana or a word, you type its reading in romaji, and it checks the answer by sound. What you miss comes up more often.

Try it at [zennia-japanese.vercel.app](https://zennia-japanese.vercel.app/).

## Features

- **Learn.** A guided path through hiragana, katakana and the N5 words. The app decides what comes next: it introduces a few items at a time, and an item is known after three right answers in a row.
- **Free practice.** Practice your own words and the kana you choose, weighted toward the ones you miss.
- **Answers checked by sound.** `shi` and `si`, `tsu` and `tu`, or macrons like `ō` all count. A wrong vowel length is pointed out as almost right. For words with kanji, what you type is shown as kana while you type.
- **Reading, meaning or both.** Choose whether a word asks for its reading, its meaning, or both.
- **Feedback.** The result shows the word with furigana and romaji, plays a short sound, and can say the word aloud in Japanese.
- **Vocabulary.** Add words by hand or paste a list in romaji and pick each one from a bundled dictionary. Organize them with colored tags, search and filter them, and import from Anki or JSON.
- **Kana charts.** Pick which hiragana and katakana to practice, from the basic rows to dakuten and combinations.
- **Stats.** Accuracy for every word and kana you've answered.
- **Writing sheets.** Print a sheet to practice writing the selected words, with stroke order, tracing and free squares.
- **Practice fonts.** Show words in different Japanese typefaces to get used to their shapes.

Sign in with Google to keep your words and progress across devices.

## Development

```bash
npm install
npm run dev
```

It needs a Supabase project, set in `.env` (see `.env.example`). How the system works is in [docs/](docs/architecture.md).
