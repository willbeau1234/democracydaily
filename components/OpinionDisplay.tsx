"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import KaraokeText from "@/components/karaoke-text"

interface OpinionDisplayProps {
    opinionText: string
    karaokeSpeed: number
    setKaraokeSpeed: (speed: number) => void
    selectedOption: "agree" | "disagree" | null
    setSelectedOption: (option: "agree" | "disagree") => void
    reasoning: string
    setReasoning: (value: string) => void
    isAnimationComplete: boolean
    onAnimationComplete: () => void
}

export default function OpinionDisplay({
    opinionText,
    karaokeSpeed,
    setKaraokeSpeed,
    selectedOption,
    setSelectedOption,
    reasoning,
    setReasoning,
    isAnimationComplete,
    onAnimationComplete,
}: OpinionDisplayProps) {
    return (
        <>
            {/* Animated Opinion Text */}
            <div className="min-h-[120px] p-6 bg-white rounded-lg border border-gray-200 font-serif text-lg">
                <KaraokeText
                    text={opinionText}
                    onComplete={onAnimationComplete}
                    speed={karaokeSpeed}
                />
            </div>

            {/* Speed control */}
            <div className="flex justify-center items-center gap-2">
                <label htmlFor="speed" className="text-sm font-medium">
                    Speed:
                </label>
                <input
                    type="range"
                    id="speed"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={karaokeSpeed}
                    onChange={(e) => setKaraokeSpeed(Number(e.target.value))}
                    className="w-32"
                />
                <span className="text-sm">{karaokeSpeed.toFixed(1)}x</span>
            </div>

            {/* Options and reasoning */}
            {isAnimationComplete && (
                <>
                    <div className="flex justify-center gap-4 mt-6">
                        <Button
                            variant={selectedOption === "agree" ? "default" : "outline"}
                            onClick={() => setSelectedOption("agree")}
                            className="w-32"
                        >
                            Agree
                        </Button>
                        <Button
                            variant={selectedOption === "disagree" ? "default" : "outline"}
                            onClick={() => setSelectedOption("disagree")}
                            className="w-32"
                        >
                            Disagree
                        </Button>
                    </div>

                    {selectedOption && (
                        <div className="space-y-2 mt-4">
                            <h3 className="font-medium font-serif text-lg">
                                Why do you {selectedOption}?
                            </h3>
                            <Textarea
                                placeholder="Share your reasoning..."
                                value={reasoning}
                                onChange={(e) => setReasoning(e.target.value)}
                                rows={4}
                                className="font-serif"
                            />
                        </div>
                    )}
                </>
            )}
        </>
    )
}
