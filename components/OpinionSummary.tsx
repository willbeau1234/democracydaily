"use client"

import { Card } from "@/components/ui/card"

interface OpinionSummaryProps {
    opinionText: string
    selectedOption: "agree" | "disagree"
    reasoning: string
}

export default function OpinionSummary({
    opinionText,
    selectedOption,
    reasoning,
}: OpinionSummaryProps) {
    return (
        <div className="border rounded-lg p-6 bg-white space-y-4">
            <div>
                <h3 className="font-serif text-xl font-bold mb-2">Today's Opinion</h3>
                <p className="font-serif text-lg italic">{opinionText}</p>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Your stance:</span>
                <span
                    className={`px-2 py-1 rounded text-sm ${selectedOption === "agree"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                >
                    {selectedOption === "agree" ? "Agree" : "Disagree"}
                </span>
            </div>

            <div>
                <span className="text-sm font-semibold">Your reasoning:</span>
                <p className="font-serif text-gray-700 mt-1 border-l-4 pl-4 py-2">
                    {reasoning}
                </p>
            </div>
        </div>
    )
}
