"use client" // Tells Next.js this is a client-side component

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Share2, Copy, Eye, ArrowLeft } from "lucide-react"
import { FaFacebook, FaInstagram, FaXTwitter } from "react-icons/fa6"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { createUserOpinion } from "@/lib/firebase"
import { v4 as uuidv4 } from "uuid"
import TypewriterAnimation from '@/components/TypewriterAnimation'

export default function DIYOpinion() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [createdOpinion, setCreatedOpinion] = useState(null)
  const [isOpinionDropdownOpen, setIsOpinionDropdownOpen] = useState(false)
  const [isFeedbackSent, setIsFeedbackSent] = useState(false)

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const getOrCreateUserId = () => {
    let id = localStorage.getItem("anonUserId")
    if (!id) {
      id = uuidv4()
      localStorage.setItem("anonUserId", id)
    }
    return id
  }

  const handleCreateOpinion = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both title and opinion content.",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const userId = getOrCreateUserId()
      const result = await createUserOpinion(userId, {
        title: title.trim(),
        content: content.trim(),
        authorName: authorName.trim() || "Anonymous"
      })

      setCreatedOpinion(result)
      
      toast({
        title: "Opinion created! 🎉",
        description: "Your private discussion room is ready to share.",
      })
    } catch (error) {
      console.error("Error creating opinion:", error)
      toast({
        title: "Creation failed",
        description: "Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const copyShareLink = () => {
    if (!createdOpinion) return
    
    navigator.clipboard.writeText(createdOpinion.shareableLink).then(() => {
      toast({
        title: "Link copied! 📋",
        description: "Share this with friends to start the discussion!",
      })
    })
  }

  const resetForm = () => {
    setTitle("")
    setContent("")
    setAuthorName("")
    setCreatedOpinion(null)
  }

  const shareToSocial = (platform) => {
    if (!createdOpinion) return

    const shareText = `🏛️ THE DEMOCRACY DAILY - DIY OPINION 🗣️

"${title}"

Join my private discussion: ${createdOpinion.shareableLink}

#DemocracyDaily #YourVoiceMatters #Democracy`

    if (platform === 'twitter') {
      const text = encodeURIComponent(shareText)
      window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        if (platform === 'facebook') {
          window.open('https://www.facebook.com/', '_blank')
        } else if (platform === 'instagram') {
          window.open('https://www.instagram.com/', '_blank')
        }
        
        toast({
          title: `Copied for ${platform}! 📋`,
          description: `${platform} opened - paste your opinion link!`,
        })
      })
    }
  }

  const handleFeedback = async() => {
    try {
      const textarea = document.querySelector('textarea[placeholder*="improved"]') as HTMLTextAreaElement
      const feedbackContent = textarea.value
      if (!feedbackContent) return
      
      const response = await fetch('https://us-central1-thedailydemocracy-37e55.cloudfunctions.net/handlefeedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: feedbackContent
        }),
      })
      
      if (response.ok) {
        textarea.value = ''
        setIsFeedbackSent(true)
        toast({
          title: "Feedback sent!",
          description: "Thank you for your feedback.",
        })
      } else {
        throw new Error('Failed to send feedback')
      }
    } catch (error) {
      console.error("Error sending feedback:", error)
      toast({
        title: "Failed to send feedback",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Newspaper-style header */}
        <div className="bg-white border-b-4 border-black mb-6 p-6 text-center">
          <h1 className="text-5xl font-bold mb-2 font-serif tracking-tight">THE DEMOCRACY DAILY</h1>
          <div className="flex justify-between items-center text-sm text-gray-600 border-t border-b border-gray-300 py-2 px-4 my-2">
            <span>Vol. 1, No. 1</span>
            <span>{currentDate}</span>
            
            {/* Opinion Section Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsOpinionDropdownOpen(!isOpinionDropdownOpen)}
                className="flex items-center gap-1 hover:text-black transition-colors font-serif"
              >
                DIY Section
                <svg 
                  className={`w-3 h-3 transition-transform ${isOpinionDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isOpinionDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="py-2">
                    <a href="/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-serif">
                      📰 Daily Opinion
                    </a>
                    <a href="/diy" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-serif bg-gray-100">
                      ✍️ Create Opinion (Current)
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back to Daily Opinion */}
        <div className="mb-4">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-serif"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Daily Opinion
          </a>
        </div>

        {/* Main DIY Opinion Card */}
        {!createdOpinion ? (
          <Card className="w-full shadow-lg border-0">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-center text-2xl font-serif">
                ✍️ Create Your Opinion
              </CardTitle>
              <p className="text-center text-gray-600 font-serif">
                Share your thoughts with a private discussion group
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 font-serif">Your Name (Optional)</label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="How should friends see your name?"
                  className="font-serif"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 font-serif">Opinion Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your opinion about? (e.g., 'Should plastic bags be banned?')"
                  className="font-serif"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 font-serif">Your Opinion</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your thoughts... What do you think and why? Be specific and thoughtful - this will be the topic your friends discuss!"
                  rows={6}
                  className="font-serif"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-serif font-bold text-sm mb-2">🔒 How it works:</h4>
                <ul className="text-xs text-gray-600 space-y-1 font-serif">
                  <li>• You'll get a private link to share with friends</li>
                  <li>• Only people with the link can see your opinion</li>
                  <li>• Friends can agree/disagree and explain why</li>
                  <li>• Create your own private debate room!</li>
                  <li>• See real-time stats and responses</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-gray-50">
              <Button
                onClick={handleCreateOpinion}
                disabled={isCreating || !title.trim() || !content.trim()}
                className="w-full bg-gray-900 hover:bg-black font-serif"
              >
                {isCreating ? "Creating..." : "Create Private Discussion 🚀"}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          /* Success State */
          <Card className="w-full shadow-lg border-0">
            <CardHeader className="border-b bg-green-50">
              <CardTitle className="text-center text-2xl font-serif text-green-800">
                🎉 Opinion Created!
              </CardTitle>
              <p className="text-center text-green-600 font-serif">
                Your private discussion room is ready to share
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-serif text-lg font-bold mb-2">{title}</h3>
                <p className="font-serif text-gray-700 italic">"{content}"</p>
                <p className="text-sm text-gray-500 mt-2">- {authorName || "Anonymous"}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-serif font-bold mb-2 flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Share Your Private Discussion
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Send this link to friends to see your opinion and join the discussion:
                </p>
                <div className="flex gap-2 mb-3">
                  <Input 
                    value={createdOpinion.shareableLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button onClick={copyShareLink} size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Social Sharing */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => shareToSocial('twitter')} className="flex items-center gap-1">
                    <FaXTwitter className="h-3 w-3" />
                    Share on X
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => shareToSocial('facebook')} className="flex items-center gap-1">
                    <FaFacebook className="h-3 w-3" />
                    Share on Facebook
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => shareToSocial('instagram')} className="flex items-center gap-1">
                    <FaInstagram className="h-3 w-3" />
                    Share on Instagram
                  </Button>
                </div>
              </div>

              <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <p>📱 <strong>Only people with this link can see your opinion and respond</strong></p>
                <p>🔒 Your discussion is completely private</p>
                <p>📊 See real-time responses and stats</p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3 justify-center border-t bg-gray-50">
              <Button 
                onClick={() => window.open(createdOpinion.shareableLink, '_blank')}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black"
              >
                <Eye className="h-4 w-4" />
                Preview Discussion
              </Button>
              <Button onClick={resetForm} variant="outline">
                Create Another Opinion
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Typewriter Animation */}
        <div className="bg-white border rounded-lg shadow-lg mt-6 p-6">
          <div className="text-center">
            <h3 className="font-serif text-xl font-bold mb-4">Get Inspired!</h3>
            <TypewriterAnimation />
            <p className="text-sm text-gray-600 mt-4 font-serif">
              Create engaging opinions that spark meaningful discussions with your friends.
            </p>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="bg-white border-t-2 border-gray-300 mt-6">
          {/* Main Footer Content */}
          <div className="grid md:grid-cols-3 gap-6 p-6 text-sm">
            
            {/* See More About the Site */}
            <div className="text-center md:text-left">
              <h3 className="font-serif font-bold text-lg mb-3 border-b border-gray-300 pb-2">
                About The Democracy Daily
              </h3>
              <div className="space-y-2 text-gray-700">
                <p className="font-serif">A platform dedicated to fostering civic engagement through daily opinion discussions.</p>
                <div className="space-y-1">
                  <a href="mission.html" className="block hover:text-black transition-colors font-serif">
                    📜 Our Mission
                  </a>
                  <a href="works.html" className="block hover:text-black transition-colors font-serif">
                    ⚙️ How It Works
                  </a>
                  <a href="community.html" className="block hover:text-black transition-colors font-serif">
                    🤝 Community Guidelines
                  </a>
                  <a href="priv.html" className="block hover:text-black transition-colors font-serif">
                    🔒 Privacy Policy
                  </a>
                </div>
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
                <div className="flex justify-center md:justify-start gap-3 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-serif text-xs"
                    onClick={() => window.open('https://www.instagram.com/the_democracydaily/', '_blank')}
                  >
                    <FaInstagram className="h-3 w-3 mr-1" />
                    Instagram
                  </Button>
                </div>
              </div>
            </div>

            {/* Feedback Section */}
            <div className="text-center md:text-left">
              <h3 className="font-serif font-bold text-lg mb-3 border-b border-gray-300 pb-2">
                Your Feedback
              </h3>
              <div className="space-y-3">
                <p className="font-serif text-gray-700 text-xs">
                  Help us improve! Share your thoughts on the DIY opinion feature.
                </p>
                <Textarea 
                  placeholder="What would you like to see improved or added?"
                  className="font-serif text-xs h-20 resize-none"
                />
                <Button 
                  size="sm" 
                  className="w-full bg-gray-900 hover:bg-black font-serif text-xs"
                  onClick={handleFeedback}
                >
                  Send Feedback
                </Button>
                <div className="text-xs text-gray-500 font-serif">
                  <p>💡 Suggest new DIY features</p>
                  <p>🐛 Report issues</p>
                  <p>✨ Request improvements</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Bar */}
          <div className="border-t border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-600">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="font-serif">
                <strong>THE DEMOCRACY DAILY</strong> - Where Your Voice Matters
              </div>
              <div className="font-serif">
                Create and share your own opinion discussions.
              </div>
              <div className="font-serif text-gray-500">
                © 2025 The Democracy Daily
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}