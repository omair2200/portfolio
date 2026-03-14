import React from 'react';

const Loader = () => (
  <svg id="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <title>Loader Logo</title>
    <g transform="translate(0, 40)">
      <rect
        x="50"
        y="50"
        width="300"
        height="300"
        stroke="white"
        strokeWidth="10"
        fill="currentColor"
      />
      <circle
        className="o"
        cx="150"
        cy="200"
        r="60"
        stroke="white"
        strokeWidth="10"
        fill="none"
        opacity="0"
      />
      <path
        className="a"
        d="M240,260 L270,140 L300,260"
        stroke="white"
        strokeWidth="10"
        fill="none"
        opacity="0"
      />
    </g>
  </svg>
);

export default Loader;
