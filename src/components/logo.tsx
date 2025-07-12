import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 70"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M20 53 C 40 72, 60 72, 80 53"
        fill="none"
        stroke="#FBBF24" // yellow-400
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M23 60 C 43 79, 63 79, 83 60"
        fill="none"
        stroke="#FBBF24" // yellow-400
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M2,38 L50,2 L98,38 L50,70 L40,62 V45 L50,52 L80,38 L50,20 L20,38 L50,52 L40,45 V62 L2,38 Z"
        className="fill-primary"
      />
    </svg>
  );
}
