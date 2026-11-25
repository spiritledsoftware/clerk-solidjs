import { describe, expect, it } from 'vitest';
import { useRoutingProps } from '../use-routing-props';

describe('useRoutingProps()', () => {
  it('defaults to path routing and requires a path', () => {
    expect(() => useRoutingProps('TestingComponent', {})).toThrowError(
      /The <TestingComponent\/> component uses path-based routing by default/
    );
  });

  it('takes the path from the routing options', () => {
    expect(
      useRoutingProps('TestingComponent', {}, { path: '/path-option' })
    ).toEqual({ path: '/path-option', routing: 'path' });
  });

  it('lets the path prop override the routing options', () => {
    expect(
      useRoutingProps(
        'TestingComponent',
        { path: '/path-prop' },
        { path: '/path-option' }
      )
    ).toEqual({ path: '/path-prop', routing: 'path' });
  });

  it.each(['hash', 'virtual'] as const)(
    'drops the path option with %s routing',
    (routing) => {
      expect(
        useRoutingProps('TestingComponent', { routing } as any, {
          path: '/path-option'
        })
      ).toEqual({ routing, path: undefined });
    }
  );

  it.each(['hash', 'virtual'] as const)(
    'rejects a path prop with %s routing',
    (routing) => {
      expect(() =>
        useRoutingProps('TestingComponent', {
          routing,
          path: '/path-prop'
        } as any)
      ).toThrowError(/<TestingComponent\/>/);
    }
  );
});
