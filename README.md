# zennia

Web app for practicing Japanese vocabulary: it shows a word, you type the reading in romaji, and it checks the answer.

```bash
npm install
npm run dev
```

It needs a Supabase project, set in `.env` (see `.env.example`). How the system works is in [docs/](docs/architecture.md).

## License

The code is licensed under [AGPL-3.0](LICENSE). The bundled dictionary and stroke data keep their own licenses, listed in [docs/integrations.md](docs/integrations.md#bundled-data), and the fonts are under the SIL Open Font License.
