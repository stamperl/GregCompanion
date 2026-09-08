import { ArrowLeft, CircleHelp, FastForward, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './FieldLab.css'
import { parseFieldProgram, type FieldCommand } from './fieldProgram'

type Direction = 0 | 1 | 2 | 3
type Crop = 'ripe' | 'soil' | 'sprout'
type Drone = { x: number; y: number; direction: Direction }
type FieldLabProps = { onExit: () => void }

const size = 5
const starterProgram = `// Guide Sprig around the field
harvest();
move();
turnRight();
move();
harvest();`

const initialCrops = (): Crop[] => [
  'ripe', 'soil', 'sprout', 'soil', 'ripe',
  'soil', 'ripe', 'soil', 'sprout', 'soil',
  'sprout', 'soil', 'ripe', 'soil', 'ripe',
  'soil', 'sprout', 'soil', 'ripe', 'soil',
  'ripe', 'soil', 'sprout', 'soil', 'ripe',
]

export default function FieldLab({ onExit }: FieldLabProps) {
  const [source, setSource] = useState(() => localStorage.getItem('click-foundry-field-program') ?? starterProgram)
  const [crops, setCrops] = useState<Crop[]>(initialCrops)
  const [drone, setDrone] = useState<Drone>({ x: 0, y: 0, direction: 1 })
  const [harvested, setHarvested] = useState(0)
  const [planted, setPlanted] = useState(0)
  const [queue, setQueue] = useState<FieldCommand[]>([])
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(520)
  const [message, setMessage] = useState('Harvest 3 ripe sunpods and plant 2 empty plots.')
  const timerRef = useRef<number | null>(null)
  const parsed = useMemo(() => parseFieldProgram(source), [source])
  const completed = harvested >= 3 && planted >= 2

  useEffect(() => {
    localStorage.setItem('click-foundry-field-program', source)
  }, [source])

  useEffect(() => {
    if (!running || step >= queue.length) {
      if (running && step >= queue.length) {
        setRunning(false)
        setMessage(completed ? 'Routine complete — the plot is thriving!' : 'Routine finished. Adjust the code and try again.')
      }
      return
    }
    timerRef.current = window.setTimeout(() => {
      const command = queue[step]
      if (command === 'turnLeft') setDrone((value) => ({ ...value, direction: ((value.direction + 3) % 4) as Direction }))
      if (command === 'turnRight') setDrone((value) => ({ ...value, direction: ((value.direction + 1) % 4) as Direction }))
      if (command === 'move') setDrone((value) => {
        const offsets = [[0, -1], [1, 0], [0, 1], [-1, 0]]
        const [dx, dy] = offsets[value.direction]
        const next = { ...value, x: value.x + dx, y: value.y + dy }
        if (next.x < 0 || next.x >= size || next.y < 0 || next.y >= size) {
          setMessage('Sprig reached the field edge and stayed put.')
          return value
        }
        return next
      })
      if (command === 'harvest' || command === 'plant') {
        const cell = drone.y * size + drone.x
        setCrops((value) => {
          const next = [...value]
          if (command === 'harvest' && next[cell] === 'ripe') {
            next[cell] = 'soil'; setHarvested((count) => count + 1)
          } else if (command === 'plant' && next[cell] === 'soil') {
            next[cell] = 'sprout'; setPlanted((count) => count + 1)
          } else {
            setMessage(command === 'harvest' ? 'Nothing ripe on this plot.' : 'This plot is not ready for a seed.')
          }
          return next
        })
      }
      setStep((value) => value + 1)
    }, speed)
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current) }
  }, [completed, drone.x, drone.y, queue, running, speed, step])

  const reset = () => {
    setRunning(false); setQueue([]); setStep(0); setDrone({ x: 0, y: 0, direction: 1 })
    setCrops(initialCrops()); setHarvested(0); setPlanted(0); setMessage('Field reset. Write a new routine.')
  }

  const run = () => {
    if (parsed.error) { setMessage(parsed.error); return }
    setQueue(parsed.commands); setStep(0); setRunning(true); setMessage('Sprig is following your routine…')
  }

  return (
    <main className="field-lab-shell">
      <header className="field-lab-header">
        <button type="button" onClick={onExit} aria-label="Back to Click Foundry"><ArrowLeft size={20} /></button>
        <div><span>CLICK FOUNDRY // SIDE LAB</span><h1>FieldScript</h1></div>
        <div className="field-lab-level">LESSON<br /><strong>01</strong></div>
      </header>

      <section className="field-lab-mission">
        <div><span className="field-lab-kicker">TODAY'S ROUTINE</span><h2>First harvest</h2></div>
        <p>{message}</p>
        <div className="field-lab-progress" aria-label="Mission progress">
          <span className={harvested >= 3 ? 'done' : ''}>☀ {harvested}/3</span>
          <span className={planted >= 2 ? 'done' : ''}>♧ {planted}/2</span>
        </div>
      </section>

      <section className="field-lab-board" aria-label="Automation field">
        {crops.map((crop, index) => {
          const x = index % size; const y = Math.floor(index / size)
          const occupied = drone.x === x && drone.y === y
          return <div className={`field-cell ${crop}`} key={`${x}-${y}`}>
            {crop === 'ripe' && <span className="sunpod" aria-label="ripe sunpod">✦</span>}
            {crop === 'sprout' && <span className="sprout" aria-label="sprout">♧</span>}
            {occupied && <span className={`field-drone direction-${drone.direction}`} aria-label="Sprig drone">▲</span>}
          </div>
        })}
      </section>

      <section className="field-code-panel">
        <div className="field-code-toolbar"><span><i /> ROUTINE.JS</span><button type="button" title="Command help" onClick={() => setMessage('Commands: move, turnLeft, turnRight, harvest, and plant. Put (); after each one.')}><CircleHelp size={18} /></button></div>
        <div className="field-editor-wrap"><div className="field-line-numbers">{source.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div><textarea aria-label="Field routine code" value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} /></div>
        <div className="field-run-controls">
          <button type="button" className="field-reset" onClick={reset}><RotateCcw size={18} /> Reset</button>
          <button type="button" onClick={() => setSpeed((value) => value === 520 ? 180 : 520)} aria-label="Toggle run speed"><FastForward size={18} /> {speed === 520 ? '1×' : '3×'}</button>
          <button type="button" className="field-run" onClick={running ? () => setRunning(false) : run}>{running ? <Pause size={18} /> : <Play size={18} />}{running ? 'Pause' : 'Run code'}</button>
        </div>
      </section>
    </main>
  )
}
