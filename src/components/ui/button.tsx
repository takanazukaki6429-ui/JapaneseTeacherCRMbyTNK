import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-bold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
                    {
                        "bg-teal-500 text-white shadow-md hover:bg-teal-400 hover:shadow-lg": variant === "default",
                        "bg-rose-500 text-white shadow-md hover:bg-rose-400 hover:shadow-lg": variant === "destructive",
                        "border-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300": variant === "outline",
                        "bg-teal-50 text-teal-900 hover:bg-teal-100": variant === "secondary",
                        "hover:bg-slate-100 hover:text-slate-900": variant === "ghost",
                        "text-slate-900 underline-offset-4 hover:underline": variant === "link",
                        "h-10 px-6 py-2": size === "default",
                        "h-9 px-4": size === "sm",
                        "h-12 px-8 text-base": size === "lg",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
