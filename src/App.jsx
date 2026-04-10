import React, { useState } from 'react'
import { SetupScreen } from './components/SetupScreen'
import { GameScreen } from './components/GameScreen'
import { ResultsScreen } from './components/ResultsScreen'

export default function App() {
  const [screen, setScreen] = useState('setup') // setup | game | results
  const [playerConfig, setPlayerConfig] = useState(null)
  const [gameResults, setGameResults] = useState(null)

  const handleStart = (config) => {
    setPlayerConfig(config)
    setScreen('game')
  }

  const handleComplete = (results) => {
    setGameResults(results)
    setScreen('results')
  }

  const handleRestart = () => {
    setGameResults(null)
    setScreen('setup')
  }

  return (
    <>
      {screen === 'setup' && (
        <SetupScreen onStart={handleStart} />
      )}
      {screen === 'game' && playerConfig && (
        <GameScreen
          playerConfig={playerConfig}
          onComplete={handleComplete}
        />
      )}
      {screen === 'results' && gameResults && (
        <ResultsScreen
          results={gameResults}
          playerName={playerConfig?.name || 'Player'}
          age={playerConfig?.age || 30}
          onRestart={handleRestart}
        />
      )}
    </>
  )
}
