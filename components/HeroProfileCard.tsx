import { Card } from '@/components/ui/Card'

type HeroProfileCardProps = {
  title: string
  description: string
  emoji: string
  affirmation?: string | null
}

export function HeroProfileCard({
  title,
  description,
  emoji,
  affirmation,
}: HeroProfileCardProps) {
  return (
    <Card className="glass-panel p-4">
      <div className="flex items-start gap-4">
        <div className="sigil-ring h-16 w-16 text-2xl">
          <span className="glow-blue">{emoji}</span>
        </div>
        <div className="flex-1">
          <div className="text-xs text-dd-muted uppercase tracking-widest">
            Hero&apos;s Profile
          </div>
          <div className="text-lg font-serif uppercase tracking-widest text-mana mt-1">
            {title}
          </div>
          <div className="text-sm text-dd-muted mt-1">{description}</div>
          {affirmation && (
            <div className="text-xs text-dd-muted/80 mt-3 italic">
              {affirmation}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
