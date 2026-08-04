export function assertRedisPingResponse(
  response: unknown,
): asserts response is 'PONG' {
  if (response !== 'PONG') {
    throw new Error(`Unexpected Redis ping response: ${String(response)}`);
  }
}
