import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 70"
      aria-hidden="true"
      {...props}
    >
      {/* A more dynamic, upward-flying bird shape */}
      <path 
        d="M20,40 C25,20 45,20 50,40 C55,50 40,60 35,55 C30,50 25,45 20,40 M45,35 C55,15 70,25 60,45 C50,55 40,50 45,35"
        fill="#d40000"
      />
      
      {/* Text: Anjal */}
      <text
        x="95"
        y="45"
        fontFamily="cursive, sans-serif"
        fontSize="40"
        fill="#FBBF24"
        fontWeight="bold"
        fontStyle="italic"
      >
        Anjal
      </text>

      {/* Text: Karan */}
      <text
        x="195"
        y="45"
        fontFamily="sans-serif"
        fontSize="22"
        fill="#d40000"
        fontWeight="bold"
      >
        Karan
      </text>
    </svg>
  );
}
