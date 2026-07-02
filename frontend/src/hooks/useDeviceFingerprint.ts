'use client';

import { useEffect, useState, useCallback } from 'react';
import { sha256 } from '@/utils/crypto';

function generateRawFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr-fallback';

  const props: string[] = [
    navigator.userAgent || '',
    navigator.language || '',
    navigator.platform || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    navigator.hardwareConcurrency?.toString() || '',
    (navigator as unknown as Record<string, number | undefined>).deviceMemory?.toString() || '',
  ];

  if ((navigator as unknown as Record<string, unknown>).webdriver) {
    props.push('webdriver=true');
  }

  return props.join('|||');
}

export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('device_fingerprint');
    if (stored) {
      setFingerprint(stored);
      setIsLoading(false);
      return;
    }

    const raw = generateRawFingerprint();
    sha256(raw).then((hash) => {
      const fp = `mekong-${hash.slice(0, 32)}`;
      localStorage.setItem('device_fingerprint', fp);
      setFingerprint(fp);
      setIsLoading(false);
    });
  }, []);

  const getFingerprint = useCallback((): string | null => {
    return fingerprint || localStorage.getItem('device_fingerprint');
  }, [fingerprint]);

  return { fingerprint, isLoading, getFingerprint };
}
