"use client"

import { Copy, Facebook, Twitter, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface SharePanelProps {
    opinionText: string
    selectedOption: "agree" | "disagree"
    reasoning: string
}

export default function SharePanel({
    opinionText,
    selectedOption,
    reasoning,
}: SharePanelProps) {
    const copyToClipboard = () => {
        const shareText = `THE DEMOCRACY DAILY\nOpinion of the Day: "${opinionText}"\n\nMy response: I ${selectedOption} because ${reasoning}`
        navigator.clipboard.writeText(shareText).then(
            () => {
                toast({
                    title: "Copied to clipboard",
                    description: "Your opinion and response have been copied to your clipboard.",
                })
            },
            () => {
                toast({
                    title: "Failed to copy",
                    description: "Could not copy text to clipboard.",
                    variant: "destructive",
                })
            }
        )
    }

    const shareToTwitter = () => {
        const text = encodeURIComponent(
            `THE DEMOCRACY DAILY\nI ${selectedOption} that "${opinionText}" because ${reasoning.substring(0, 100)}${reasoning.length > 100 ? "..." : ""}`
        )
        window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
    }

    const shareToFacebook = () => {
        const url = encodeURIComponent(window.location.href)
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank")
    }

    return (
        <div className="border rounded-lg p-6 bg-white">
            <h3 className="font-serif text-xl font-bold mb-3 flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share your opinion
            </h3>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-1">
                    <Copy className="h-4 w-4" />
                    Copy to clipboard
                </Button>
                <Button variant="outline" size="sm" onClick={shareToTwitter} className="flex items-center gap-1">
                    <Twitter className="h-4 w-4" />
                    Share on Twitter
                </Button>
                <Button variant="outline" size="sm" onClick={shareToFacebook} className="flex items-center gap-1">
                    <Facebook className="h-4 w-4" />
                    Share on Facebook
                </Button>
            </div>
        </div>
    )
}
