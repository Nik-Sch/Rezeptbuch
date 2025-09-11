import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import variables from '../../util/variables.module.scss';

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
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
    };

    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    };
  }, []);

  return online;
}

export function usePersistentState<T>(
  initialValue: T,
  storageKey: string,
): [T, Dispatch<SetStateAction<T>>] {
  return useStoredState(window.localStorage, initialValue, storageKey);
}

export function useSessionState<T>(
  initialValue: T,
  storageKey: string,
): [T, Dispatch<SetStateAction<T>>] {
  return useStoredState(window.sessionStorage, initialValue, storageKey);
}

function useStoredState<T>(
  storage: Storage,
  initialValue: T,
  storageKey: string,
): [T, Dispatch<SetStateAction<T>>] {
  let value: T;
  try {
    const item = storage.getItem(storageKey);
    if (typeof item === 'string') {
      value = JSON.parse(item) as T;
    } else {
      value = initialValue;
    }
  } catch {
    value = initialValue;
  }
  const [state, setState] = useState<T>(value);

  useEffect(() => {
    storage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey, storage]);

  return [state, setState];
}
