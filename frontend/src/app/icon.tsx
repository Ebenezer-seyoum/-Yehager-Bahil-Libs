import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 192,
  height: 192,
}
export const contentType = 'image/png'

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '25%', // Oval/Rounded rectangle shape
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <img 
          src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png" 
          style={{ position: 'absolute', top: '-45%', left: '-50%', width: '200%', height: '200%', objectFit: 'cover' }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
