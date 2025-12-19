import { useEffect, useRef, useState } from 'react'
import { Card } from './ui/Card'

type Props = {
  svgPath: string
  segments: { key: string; cost: number }[]
  progress?: Record<string, number>
  className?: string
}

// Renders the SVG blueprint and toggles built/unbuilt classes based on progress.
export function CathedralBlueprint({ svgPath, segments, progress = {}, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null)

  useEffect(() => {
    fetch(svgPath)
      .then((res) => res.text())
      .then((markup) => setSvgMarkup(markup))
      .catch((err) => console.error('Failed to load blueprint SVG', err))
  }, [svgPath])

  useEffect(() => {
    if (!svgMarkup) return
    const el = containerRef.current
    if (!el) return

    const segKeys = segments.map((s) => s.key)

    segKeys.forEach((key) => {
      const seg = el.querySelector<SVGElement>(`#${key}`)
      if (!seg) return

      const applied = progress[key] || 0
      const cost = segments.find((s) => s.key === key)?.cost || 0
      const isComplete = cost > 0 && applied >= cost

      seg.classList.remove('dd-built', 'dd-unbuilt')
      seg.classList.add(isComplete ? 'dd-built' : 'dd-unbuilt')
    })
  }, [svgMarkup, progress, segments])

  return (
    <Card className={className}>
      <div className="w-full flex justify-center">
        <div
          ref={containerRef}
          className="w-full max-w-2xl text-dd-text"
          dangerouslySetInnerHTML={{ __html: svgMarkup || '' }}
        />
      </div>
    </Card>
  )
}
