import React from 'react';

const IconLogo = () => (
  <svg id="logo" xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 200 100">
    <title>Logo</title>
    <g transform="translate(0, 15)">
      <circle
        className="flash"
        cx="50"
        cy="50"
        r="30"
        stroke="white"
        strokeWidth="10"
        fill="none"
      />
      <path
        className="flash"
        d="M125,80 L150,20 L175,80"
        stroke="white"
        strokeWidth="10"
        fill="none"
      />
    </g>
  </svg>
);

export default IconLogo;
