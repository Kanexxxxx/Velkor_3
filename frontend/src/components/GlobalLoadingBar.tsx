'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function isActionElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('a[href], button, [role="button"], input[type="submit"], input[type="button"]'));
}

export function GlobalLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  function start(duration = 900) {
    setActive(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setActive(false), duration);
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (isActionElement(event.target)) start();
    }

    function handleSubmit() {
      start(1400);
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, []);

  useEffect(() => {
    start(450);
  }, [pathname, searchParams]);

  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  return <div className={`global-loading-bar${active ? ' active' : ''}`} aria-hidden="true" />;
}
