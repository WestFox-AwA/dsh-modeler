# Tests

Run all shipped suites:

```bash
npm install
node tests/run-public.mjs
```

Each suite is a standalone `node tests/<name>.mjs` process that prints a JSON
summary. Suites use temporary directories and do not touch user assets.

Three legacy geometry suites (`primitives-closed`, `grille`, `cutouts`) are not
shipped while their known residual failures are being fixed; they are not part of
the public alpha acceptance.
