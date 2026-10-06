const iconPaths: Record<string, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  flask: 'M9 3h6 M10 3v6l-5.5 9.1A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.9L14 9V3 M8 15h8',
  cpu: 'M9 9h6v6H9z M9 2v3m6-3v3m0 14v3m-6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3 M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  sessions: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6m3-3h-6',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  analysis: 'M3 3v18h18 M8 15l4-4 4 3 5-7',
  spark: 'm12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z M19 14l1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14z',
  shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4',
  play: 'M5 3l14 9-14 9z',
  chart: 'M3 3v18h18 M8 16v-5m5 5V7m5 9v-8',
  brain: 'M12 18V5 M15 13a4.2 4.2 0 0 0 0-8 5 5 0 0 0-9 2 4 4 0 0 0 0 8 4.5 4.5 0 0 0 6 4.2 M9 13a4.2 4.2 0 0 1 0-8 M15 13a4.2 4.2 0 0 1 0 8',
  database: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8 0l-.2.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.5-1l-.2.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.1-1.8L7 15V9l.2-.1a1.7 1.7 0 0 0 .7-1.7l-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8-.1L12 4h3l.1.2a1.7 1.7 0 0 0 1.7.7l.2-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .1 1.8l.2.1v3l-.2.1a1.7 1.7 0 0 0-.7 1.7z',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  chevron: 'm9 18 6-6-6-6',
}

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name] ?? iconPaths.grid} /></svg>
}
