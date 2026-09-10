import React from 'react'

export default function CoatOfArms({ size = 80, className = '', style = {} }) {
  return (
    <img
      src="/coat-of-arms.jpg"
      alt="Nigerian Coat of Arms"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain',
        width: size,
        height: size,
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
        ...style,
      }}
    />
  )
}
