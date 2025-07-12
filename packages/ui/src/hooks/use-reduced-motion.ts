import { useEffect, useState } from 'react';

export function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        function onChange(event: MediaQueryListEvent) {
            setPrefersReducedMotion(event.matches);
        }

        const result = matchMedia('(prefers-reduced-motion: reduce)');
        result.addEventListener('change', onChange);
        setPrefersReducedMotion(result.matches);

        return () => result.removeEventListener('change', onChange);
    }, []);

    return prefersReducedMotion;
}
