import { createElement, type FC, Fragment, type ReactElement } from 'react';
import { describe, expect, test, vi } from 'vitest';
import {
  cloneChildren,
  countChildren,
  getFragmentChildren,
  isValidChild,
  mapChildren,
  renderChildren,
} from './react';

const Alpha: FC<Record<string, any>> = () => null;
const Beta: FC<Record<string, any>> = () => null;

const alpha = (props?: Record<string, any>) => createElement(Alpha, props);
const beta = (props?: Record<string, any>) => createElement(Beta, props);

describe('getFragmentChildren', () => {
  test('returns the children of a fragment', () => {
    const a = alpha();
    const b = beta();

    const children = getFragmentChildren(createElement(Fragment, null, a, b)) as ReactElement[];

    expect(Array.isArray(children)).toBe(true);
    expect(children[0]).toBe(a);
    expect(children[1]).toBe(b);
  });

  test('returns a single child of a fragment directly', () => {
    const a = alpha();

    expect(getFragmentChildren(createElement(Fragment, null, a))).toBe(a);
  });

  test('returns non-fragment elements unchanged', () => {
    const a = alpha();

    expect(getFragmentChildren(a)).toBe(a);
  });

  test('returns non-element children unchanged', () => {
    expect(getFragmentChildren('text')).toBe('text');
    expect(getFragmentChildren(null)).toBeNull();
  });
});

describe('isValidChild', () => {
  test('returns the matching type when the child is valid', () => {
    expect(isValidChild(alpha(), Alpha)).toBe(Alpha);
  });

  test('matches the child against any of the allowed types', () => {
    expect(isValidChild(beta(), [Alpha, Beta])).toBe(Beta);
  });

  test('returns undefined when the child type is not allowed', () => {
    expect(isValidChild(alpha(), Beta)).toBeUndefined();
    expect(isValidChild(alpha(), [Beta])).toBeUndefined();
  });

  test('returns false when the child is not a valid element', () => {
    expect(isValidChild('text' as unknown as ReactElement, Alpha)).toBe(false);
    expect(isValidChild(null as unknown as ReactElement, Alpha)).toBe(false);
  });
});

describe('mapChildren', () => {
  test('calls the handler for every child with its index', () => {
    const handler = vi.fn(child => `mapped:${child.props.id}`);
    const a = alpha({ id: 'a' });
    const b = beta({ id: 'b' });

    expect(mapChildren([a, b], handler)).toEqual(['mapped:a', 'mapped:b']);
    expect(handler).toHaveBeenCalledWith(a, 0);
    expect(handler).toHaveBeenCalledWith(b, 1);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('flattens nested arrays of children keeping sequential indexes', () => {
    const handler = vi.fn((_child, index) => `index:${index}`);

    expect(mapChildren([[alpha(), beta()], alpha()], handler)).toEqual([
      'index:0',
      'index:1',
      'index:2',
    ]);
  });

  test('returns null when there are no children', () => {
    const handler = vi.fn();

    expect(mapChildren(null, handler)).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  test('returns undefined for undefined children and an empty array for no element children', () => {
    const handler = vi.fn();

    expect(mapChildren(undefined, handler)).toBeUndefined();
    expect(mapChildren([], handler)).toEqual([]);
    expect(handler).not.toHaveBeenCalled();
  });

  test('drops children without props, like text', () => {
    const handler = vi.fn(() => 'mapped');

    expect(mapChildren('text', handler)).toEqual([]);
    expect(mapChildren([alpha(), 'text'], handler)).toEqual(['mapped']);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('cloneChildren', () => {
  test('clones each element child with the props returned by the handler', () => {
    const a = alpha({ id: 'a' });
    const b = beta({ id: 'b' });

    const result = cloneChildren([a, b], (_child, index) => ({ order: index })) as ReactElement[];

    expect(result).toHaveLength(2);
    expect(result[0]).not.toBe(a);
    expect(result[0].type).toBe(Alpha);
    expect(result[0].props).toEqual({ id: 'a', order: 0 });
    expect(result[1].props).toEqual({ id: 'b', order: 1 });
  });

  test('returns null when there are no children', () => {
    const handler = vi.fn();

    expect(cloneChildren(null, handler)).toBeNull();
    expect(cloneChildren(undefined, handler)).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  test('returns an empty array for an empty children array', () => {
    expect(cloneChildren([], () => ({ order: 0 }))).toEqual([]);
  });

  test('drops non-element children', () => {
    const result = cloneChildren([alpha(), 'text'], () => ({ order: 0 })) as ReactElement[];

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(Alpha);
  });

  test('keeps invalid children uncloned when onlyRenderValid is false', () => {
    const a = alpha();
    const handler = vi.fn(() => ({ order: 0 }));

    const result = cloneChildren(a, handler, { validChildren: [Beta] }) as ReactElement[];

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(Alpha);
    expect(result[0].props).toEqual({});
    expect(handler).not.toHaveBeenCalled();
  });

  test('drops invalid children when onlyRenderValid is true', () => {
    const result = cloneChildren([alpha(), beta()], () => ({ order: 0 }), {
      validChildren: [Beta],
      onlyRenderValid: true,
    }) as ReactElement[];

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(Beta);
    expect(result[0].props).toEqual({ order: 0 });
  });
});

describe('renderChildren', () => {
  test('renders each item with the children function and clones the results', () => {
    const result = renderChildren(
      (item, _index) => alpha({ name: item, key: item }),
      ['a', 'b'],
      (_child, index) => ({ order: index }),
    ) as ReactElement[];

    expect(result).toHaveLength(2);
    expect(result[0].props).toEqual({ name: 'a', order: 0 });
    expect(result[1].props).toEqual({ name: 'b', order: 1 });
    expect(result[0].key).toBe('.$a');
    expect(result[1].key).toBe('.$b');
  });

  test('returns an empty array when the children function has no items', () => {
    expect(
      renderChildren(
        () => alpha(),
        [],
        () => ({ order: 0 }),
      ),
    ).toEqual([]);
    expect(
      renderChildren(
        () => alpha(),
        null as unknown as any[],
        () => ({ order: 0 }),
      ),
    ).toEqual([]);
  });

  test('clones element children when children is not a function', () => {
    const result = renderChildren(alpha({ id: 'a' }), ['ignored'], () => ({
      order: 0,
    })) as ReactElement[];

    expect(result).toHaveLength(1);
    expect(result[0].props).toEqual({ id: 'a', order: 0 });
  });

  test('returns null when there are no children', () => {
    expect(renderChildren(null, [], () => ({ order: 0 }))).toBeNull();
  });

  test('unwraps fragment children', () => {
    const a = alpha({ id: 'a' });
    const b = beta({ id: 'b' });

    const result = renderChildren(createElement(Fragment, null, a, b), [], () => ({
      order: 0,
    })) as ReactElement[];

    expect(result).toHaveLength(2);
    expect(result[0].props).toEqual({ id: 'a', order: 0 });
    expect(result[1].props).toEqual({ id: 'b', order: 0 });
  });

  test('forwards options to cloneChildren', () => {
    const result = renderChildren([alpha(), beta()], [], () => ({ order: 0 }), {
      validChildren: [Beta],
      onlyRenderValid: true,
    }) as ReactElement[];

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(Beta);
    expect(result[0].props).toEqual({ order: 0 });
  });
});

describe('countChildren', () => {
  test('counts element children', () => {
    expect(countChildren([alpha(), beta()])).toBe(2);
    expect(countChildren(alpha())).toBe(1);
  });

  test('counts nested arrays and text children', () => {
    expect(countChildren([alpha(), [beta(), alpha()], 'text'])).toBe(4);
  });

  test('returns 0 when there are no children', () => {
    expect(countChildren(null)).toBe(0);
    expect(countChildren(undefined)).toBe(0);
  });

  test('counts the children of a fragment', () => {
    expect(countChildren(createElement(Fragment, null, alpha(), beta()))).toBe(2);
    expect(countChildren(createElement(Fragment))).toBe(0);
  });
});
