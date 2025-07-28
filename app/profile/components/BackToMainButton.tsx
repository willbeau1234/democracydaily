'use client';

import { useRouter } from 'next/navigation';

export default function BackToMainButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.push('/')}
      className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
    >
      🏠 Back to Main Page
    </button>
  );
}