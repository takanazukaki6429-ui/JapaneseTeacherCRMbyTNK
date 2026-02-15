import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoadmapGenerator from '../components/roadmap/RoadmapGenerator'

// Mock dependencies
vi.mock('lucide-react', () => ({
    Sparkles: () => <div data-testid="sparkles-icon" />,
    Loader2: () => <div data-testid="loader-icon" />,
    Globe: () => <div data-testid="globe-icon" />,
    ArrowRight: () => <div data-testid="arrow-right-icon" />,
    Check: () => <div data-testid="check-icon" />,
    Info: () => <div data-testid="info-icon" />,
    BookText: () => <div data-testid="book-text-icon" />,
    PenLine: () => <div data-testid="pen-line-icon" />,
    MessageCircle: () => <div data-testid="message-circle-icon" />,
    BookOpen: () => <div data-testid="book-open-icon" />,
    Headphones: () => <div data-testid="headphones-icon" />,
    Briefcase: () => <div data-testid="briefcase-icon" />,
    Heart: () => <div data-testid="heart-icon" />,
    Plane: () => <div data-testid="plane-icon" />,
    Clock: () => <div data-testid="clock-icon" />,
    Target: () => <div data-testid="target-icon" />,
    TrendingUp: () => <div data-testid="trending-up-icon" />,
    CheckCircle2: () => <div data-testid="check-circle2-icon" />,
    GraduationCap: () => <div data-testid="graduation-cap-icon" />,
    Gamepad2: () => <div data-testid="gamepad2-icon" />,
    Landmark: () => <div data-testid="landmark-icon" />,
    Home: () => <div data-testid="home-icon" />,
    Brain: () => <div data-testid="brain-icon" />,
    MoreHorizontal: () => <div data-testid="more-horizontal-icon" />,
    Save: () => <div data-testid="save-icon" />,
    FileText: () => <div data-testid="file-text-icon" />,
    Download: () => <div data-testid="download-icon" />,
    Share2: () => <div data-testid="share2-icon" />,
    ChevronDown: () => <div data-testid="chevron-down-icon" />,
    Search: () => <div data-testid="search-icon" />,
    User: () => <div data-testid="user-icon" />,
    LogOut: () => <div data-testid="logout-icon" />,
    Settings: () => <div data-testid="settings-icon" />,
    Bell: () => <div data-testid="bell-icon" />,
}))

vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/textarea', () => ({
    Textarea: (props: any) => <textarea {...props} />,
}))

vi.mock('@/components/ui/card', () => ({
    Card: ({ children }: any) => <div>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <div>{children}</div>,
    CardDescription: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
    CardFooter: ({ children }: any) => <div>{children}</div>,
}))

describe('RoadmapGenerator Component', () => {
    it('renders correctly', () => {
        render(<RoadmapGenerator />)

        expect(screen.getByText(/Japanese Learning Roadmap/i)).toBeInTheDocument()
        expect(screen.getByText(/Current Level/i)).toBeInTheDocument()
    })

    it('enables generation when purpose is selected', async () => {
        // Pass initialPurpose to satisfy canGenerate condition (along with default levels)
        render(<RoadmapGenerator initialPurpose="anime" />)

        // Find the generate button
        const generateButton = screen.getByRole('button', { name: /Create Roadmap/i })
        expect(generateButton).toBeEnabled()

        // Click to generate
        await userEvent.click(generateButton)

        // Check if summary appears
        expect(screen.getByText(/Your Study Plan Overview/i)).toBeInTheDocument()
    })
})
