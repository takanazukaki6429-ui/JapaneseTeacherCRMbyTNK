import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
    value: number[]
    min: number
    max: number
    step: number
    onValueChange: (value: number[]) => void
    className?: string
}

export function Slider({ value, min, max, step, onValueChange, className }: SliderProps) {
    const percentage = ((value[0] - min) / (max - min)) * 100

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange([parseFloat(e.target.value)])
    }

    return (
        <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[0]}
                onChange={handleChange}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full bg-teal-600"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div
                className="absolute h-5 w-5 rounded-full border-2 border-teal-600 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                style={{ left: `calc(${percentage}% - 10px)` }}
            />
        </div>
    )
}
