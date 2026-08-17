import Ajv2020 from "ajv/dist/2020.js";

const candidatePath = "packages/game-cartridges/src/cartridges/my-game/";

/**
 * Validates candidate metadata against the repository JSON Schema.
 * @param {unknown} metadata Candidate metadata.
 * @param {object} schema JSON Schema for candidate metadata.
 */
export function validateCandidateMetadata(metadata, schema) {
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  if (validate(metadata)) return;

  const errors = validate.errors
    ?.map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join("; ");
  throw new Error(`cartridge-candidate.json does not match its schema: ${errors}`);
}

/**
 * Returns changed files outside the intern-owned candidate boundary.
 * @param {Iterable<string>} changedPaths Repository-relative changed paths.
 */
export function findProtectedPaths(changedPaths) {
  return [...new Set(changedPaths)]
    .filter(
      (changedPath) =>
        changedPath !== "cartridge-candidate.json" &&
        !changedPath.startsWith(candidatePath),
    )
    .sort();
}
