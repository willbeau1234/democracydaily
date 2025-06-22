"use client"

import React from 'react'

interface WordCloudItem {
  text: string
  size: number
}

interface WordCloudProps {
  data: WordCloudItem[]
  title?: string
}

export default function WordCloudComponent({ data, title }: WordCloudProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p className="font-serif">No comments yet to generate word cloud</p>
      </div>
    )
  }

  // Calculate font sizes based on frequency
  const maxSize = Math.max(...data.map(item => item.size))
  const minSize = Math.min(...data.map(item => item.size))
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      {title && (
        <h3 className="font-serif text-lg font-bold mb-4 text-center">{title}</h3>
      )}
      <div className="flex flex-wrap justify-center gap-2 p-4">
        {data.slice(0, 20).map((item, index) => {
          // Calculate font size between 12px and 32px based on frequency
          const fontSize = 12 + ((item.size - minSize) / (maxSize - minSize)) * 20
          const opacity = 0.6 + ((item.size - minSize) / (maxSize - minSize)) * 0.4
          
          return (
            <span
              key={index}
              className="inline-block px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-default"
              style={{
                fontSize: `${fontSize}px`,
                opacity: opacity,
                fontWeight: item.size > maxSize * 0.7 ? 'bold' : 'normal'
              }}
              title={`${item.text}: ${item.size} times`}
            >
              {item.text}
            </span>
          )
        })}
      </div>
      <p className="text-xs text-gray-500 text-center mt-2">
        Word frequency from {data.length} most common words in comments
      </p>
    </div>
  )
} 