# Game Contract

## Input

The host supplies a vocabulary or sentence array.

```ts
type LearningItem = {
  term: string;
  translation: string;
};
```

Use the manifest `inputMode` to select vocabulary or sentence semantics.

The shared nonempty-content system rejects empty arrays and blank strings before gameplay starts.

## Runtime Context

The current runtime supplies:

- `input`: validated learning items
- `edition`: host-owned semantic asset bindings
- `inputController`: normalized keyboard and pointer state
- `composition`: optional compact or wide geometry
- `seed`: optional deterministic session seed
- `diagnostic`: structured runtime reporting
- `complete`: fire-once result boundary

The retired competition-only `context.assets` and `edition.colors` APIs are not available.

## Results

Emit exactly these fields:

```ts
{
  accuracy: number;       // 0 through 1
  xp: number;             // nonnegative display value
  score: number;          // nonnegative integer
  correctAnswers: number; // nonnegative integer
  totalAttempts: number;  // nonnegative integer
}
```

The runtime validates the object and accepts it once per session.

The host owns authoritative XP, identity, tenancy, persistence, idempotency, and navigation.

## Manifest Adapter

`manifest.ts` uses the developer-kit `2.0.0` candidate manifest.

The local `adaptCandidateManifestToRuntime()` function creates the runtime `1.0.0` eight-field manifest. The production monorepo does not yet publish this bridge.

This adapter is a beta boundary. Production import review must replace or accept it.
