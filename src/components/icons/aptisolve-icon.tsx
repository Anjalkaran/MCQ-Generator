import type { SVGProps } from 'react';

export function AptiSolveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
      <path d="m8 9-3 3 3 3" />
      <path d="m16 15 3-3-3-3" />
    </svg>
  );
}
