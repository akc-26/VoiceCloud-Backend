import { assertRedisPingResponse } from './redis-response.util';

describe('assertRedisPingResponse', () => {
  it('accepts the expected Redis PONG response', () => {
    expect(() => assertRedisPingResponse('PONG')).not.toThrow();
  });

  it.each([
    ['unexpected string', 'NOPE'],
    ['null', null],
    ['number', 1],
  ])('rejects %s responses', (_label, response) => {
    expect(() => assertRedisPingResponse(response)).toThrow(
      `Unexpected Redis ping response: ${String(response)}`,
    );
  });
});
