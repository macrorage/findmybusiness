/** The model answered, but the output didn't match the schema. Triggers one retry with the error. */
export class AiValidationError extends Error {
  constructor(
    message: string,
    readonly rawText: string,
  ) {
    super(message);
    this.name = "AiValidationError";
  }
}

/** The provider declined the request (safety refusal). Goes straight to the fallback route. */
export class AiRefusalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiRefusalError";
  }
}

/** Every route failed. `causes` lists each attempt's error. */
export class AiFailedError extends Error {
  constructor(
    message: string,
    readonly causes: Error[],
  ) {
    super(message);
    this.name = "AiFailedError";
  }
}
