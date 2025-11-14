import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement, useRef } from 'react';

interface RenderHookResult<T> {
  result: {
    current: T;
  };
  rerender: () => void;
  unmount: () => void;
}

export function renderHook<T>(callback: () => T): RenderHookResult<T> {
  const container = document.createElement('div');
  const root: Root = createRoot(container);
  const result = { current: undefined as unknown as T };

  function TestComponent() {
    const value = callback();
    const valueRef = useRef(value);
    valueRef.current = value;
    result.current = valueRef.current;
    return null;
  }

  act(() => {
    root.render(createElement(TestComponent));
  });

  return {
    result,
    rerender: () => {
      act(() => {
        root.render(createElement(TestComponent));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}
