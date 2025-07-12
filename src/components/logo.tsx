import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 70"
      aria-hidden="true"
      {...props}
    >
      {/* Bird shape */}
      <path 
        d="M51.9,25.3c-1.2-0.8-2.6-1.3-4-1.5c-3.2-0.5-6.4,0.3-8.9,2.2c-2.3,1.8-3.9,4.3-4.5,7.2c-0.6,2.7-0.4,5.5,0.6,8 c1.1,2.7,3.1,5,5.7,6.4c2.5,1.4,5.4,1.8,8.2,1.2c2.9-0.6,5.5-2.2,7.4-4.5c1.8-2.1,2.8-4.8,2.9-7.6c0.1-2.8-0.7-5.6-2.2-7.9 C59.9,32.2,56.5,27.5,51.9,25.3z M34.2,46.5c-1.3-1.8-1.9-4-1.7-6.2c0.3-2.6,1.5-5,3.4-6.8c1.9-1.8,4.4-2.8,7.1-2.9 c2.6-0.1,5.2,0.7,7.2,2.3c2.1,1.6,3.5,3.9,4,6.4c0.5,2.4,0.2,5-0.9,7.2c-1.1,2.3-2.9,4.2-5.1,5.3c-2.2,1.2-4.8,1.5-7.3,0.9 c-2.4-0.6-4.6-2-6.2-4c-0.1-0.1-0.2-0.3-0.3-0.4C34.3,47.8,34,47.1,34.2,46.5z"
        fill="#d40000"
      />
      {/* Wing */}
      <path 
        d="M26.1,23.7c3.5,1.7,6.4,4.4,8.5,7.7c-2.7,0.4-5.4,0.3-8-0.4c-4.6-1.2-8.7-3.8-11.8-7.4c-0.5-0.6-0.4-1.5,0.2-2 c0.6-0.5,1.5-0.4,2,0.2c2.6,3,6.1,5.2,10.1,6.3c1.9,0.5,3.8,0.6,5.7,0.4c-1.6-2.5-3-5-4.2-7.7C28.2,20.1,27.3,19.5,26.1,23.7z"
        fill="#d40000"
      />
      
      {/* Air swooshes */}
      <path
        d="M 25 53 C 45 72, 65 72, 85 53"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 28 60 C 48 79, 68 79, 88 60"
        fill="none"
        stroke="#FBBF24"
        strokeWidth="6"
        strokeLinecap="round"
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
        x="185"
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
