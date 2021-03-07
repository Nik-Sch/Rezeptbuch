import { useState, useEffect } from 'react';
import { useImmer } from 'use-immer';
import { Draft } from "immer";
import variables from '../../util/variables.scss';

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
  };
}

export function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}

export function useMobile() {
  const { width, height } = useWindowDimensions();
  return width <= parseInt(variables.mobileWidth) || height <= parseInt(variables.mobileWidth);
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handle = () => {
      setOnline(navigator.onLine);
    }

    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    }
  }, []);

  return online;
}

export function usePersistentImmer<T>(initialValue: T, storageKey: string): [T, (f: (draft: Draft<T>) => void | T) => void] {
  return useStoredImmer(window.localStorage, initialValue, storageKey);
}

export function useSessionImmer<T>(initialValue: T, storageKey: string): [T, (f: (draft: Draft<T>) => void | T) => void] {
  return useStoredImmer(window.sessionStorage, initialValue, storageKey);
}

function useStoredImmer<T>(storage: Storage, initialValue: T, storageKey: string): [T, (f: (draft: Draft<T>) => void | T) => void] {
  let value: T;
  try {
    const item = storage.getItem(storageKey);
    if (typeof item === 'string') {
      value = JSON.parse(item);
    } else {
      value = initialValue;
    }
  } catch (err) {
    value = initialValue;
  }
  const [state, setState] = useImmer<T>(value);

  useEffect(() => {
    storage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey, storage]);

  return [state, setState];
}