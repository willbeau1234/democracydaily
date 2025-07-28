import { Suspense } from 'react'
import OpinionGameClient from '@/components/OpinionGameClient'
import OpinionDropdown from '@/components/OpinionDropdown'

export const dynamic = 'force-dynamic'

// Fetch initial data server-side
async function getOpinionData() {
  // Your existing data fetching logic here
  return {
    opinionPiece: "Social media platforms should be required by law to verify the identity of all users before allowing them to create accounts. This would reduce cyberbullying, misinformation, and online harassment while creating a more accountable digital environment and more.",
    opinionStats: {
      totalResponses: 0,
      agreePercentage: 0,
      disagreePercentage: 100,
      agreeCount: 0,
      disagreeCount: 0
    }
  }
}

export default async function HomePage() {
  const { opinionPiece, opinionStats } = await getOpinionData()
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* SEO-friendly header - server rendered */}
        <header className="bg-white border-b-4 border-black mb-4 sm:mb-6 p-3 sm:p-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 font-serif tracking-tight">
            THE DEMOCRACY DAILY
          </h1>
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-2 sm:px-4 my-2 gap-2 sm:gap-0">
            <span>Vol. 1, No. 1</span>
            <span>{currentDate}</span>
            <div data-tutorial="opinion-dropdown">
              <OpinionDropdown sectionName="Daily Opinion" currentPage="home" />
            </div>
          </div>
        </header>

        {/* ONLY the interactive component - remove server-rendered duplicate */}
        <Suspense fallback={
          <div className="bg-white shadow-lg border-0 rounded-lg mb-6 p-6">
            <div className="text-center">
              <h2 className="text-2xl font-serif mb-4">Opinion of the Day</h2>
              <div className="min-h-[120px] p-4 sm:p-6 bg-white rounded-lg border border-gray-200 font-serif text-base sm:text-lg">
                <p>{opinionPiece}</p>
              </div>
              <div className="mt-6 text-center">
                <p className="text-gray-600 mb-4">
                  Join thousands of citizens in meaningful democratic dialogue. Share your perspective and see how your community responds.
                </p>
                <div className="text-center p-8">Loading interactive features...</div>
              </div>
            </div>
          </div>
        }>
          <OpinionGameClient
            initialOpinion={opinionPiece}
            initialStats={opinionStats}
          />
        </Suspense>

        {/* SEO-friendly footer - server rendered */}
        <footer className="bg-white border-t-2 border-gray-300 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 text-xs sm:text-sm">
            
            {/* About Section */}
            <div className="text-center md:text-left">
              <h3 className="font-serif font-bold text-lg mb-3 border-b border-gray-300 pb-2">
                About The Democracy Daily
              </h3>
              <div className="space-y-2 text-gray-700">
                <p className="font-serif">A platform dedicated to fostering civic engagement through daily opinion discussions.</p>
                <nav className="space-y-1">
                  <a href="/mission" className="block hover:text-black transition-colors font-serif">
                    📜 Our Mission
                  </a>
                  <a href="/how-it-works" className="block hover:text-black transition-colors font-serif">
                    ⚙️ How It Works
                  </a>
                  <a href="/community" className="block hover:text-black transition-colors font-serif">
                    🤝 Community Guidelines
                  </a>
                  <a href="/privacy" className="block hover:text-black transition-colors font-serif">
                    🔒 Privacy Policy
                  </a>
                </nav>
              </div>
            </div>

            {/* Contact Section */}
            <div className="text-center md:text-left">
              <h3 className="font-serif font-bold text-lg mb-3 border-b border-gray-300 pb-2">
                Contact
              </h3>
              <div className="space-y-2 text-gray-700">
                <div className="font-serif">
                  <p className="font-semibold mb-2">Get in touch:</p>
                  <div className="space-y-1">
                    <p>📧 democracydaily.editor@gmail.com</p>
                    <p>📱 Follow us on social media</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Section */}
            <div className="text-center md:text-left">
              <h3 className="font-serif font-bold text-lg mb-3 border-b border-gray-300 pb-2">
                Engage with Democracy
              </h3>
              <div className="space-y-3">
                <p className="font-serif text-gray-700 text-xs">
                  Your voice matters in shaping our democratic discourse.
                </p>
                <div className="text-xs text-gray-500 font-serif">
                  <p>💡 Share thoughtful opinions</p>
                  <p>🗣️ Engage in respectful dialogue</p>
                  <p>🏛️ Strengthen democracy together</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-600">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="font-serif">
                <strong>THE DEMOCRACY DAILY</strong> - Where Your Voice Matters
              </div>
              <div className="font-serif">
                All opinions expressed are subject to public discourse and democratic values.
              </div>
              <div className="font-serif text-gray-500">
                © 2025 The Democracy Daily
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}