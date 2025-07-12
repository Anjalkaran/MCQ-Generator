import type { ComponentProps } from 'react';

export function Logo(props: Omit<ComponentProps<'svg'>, 'children'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 350 100"
      {...props}
    >
      <text
        x="10"
        y="65"
        fontFamily="cursive, sans-serif"
        fontSize="55"
        fontWeight="bold"
        fill="#FFD700" 
      >
        Anjal
      </text>
      <text
        x="135"
        y="65"
        fontFamily="sans-serif"
        fontSize="65"
        fontWeight="bold"
        fill="#D92E1B"
      >
        Karan
      </text>
    </svg>
  );
}
