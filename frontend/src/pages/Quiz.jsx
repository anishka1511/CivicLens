import { useState, useEffect, useMemo } from 'react'

const questionsStatic = [
  {
    question: 'What is the minimum age to vote in the United States?',
    options: ['16', '18', '21', '25'],
    correct: '18'
  },
  {
    question: 'Which amendment guarantees the right to vote regardless of race?',
    options: ['13th', '14th', '15th', '19th'],
    correct: '15th'
  },
  {
    question: 'What is the term length for a U.S. President?',
    options: ['2 years', '4 years', '6 years', '8 years'],
    correct: '4 years'
  },
  {
    question: 'Which body has the sole power to impeach federal officials?',
    options: ['Senate', 'Supreme Court', 'House of Representatives', 'Electoral College'],
    correct: 'House of Representatives'
  },
  {
    question: 'How many electoral votes are needed to win the U.S. presidency?',
    options: ['250', '270', '300', '538'],
    correct: '270'
  },
  {
    question: 'What does the term "gerrymandering" refer to?',
    options: [
      'Drawing district boundaries to favor a particular party',
      'Counting votes multiple times',
      'Registering ineligible voters',
      'Preventing people from voting'
    ],
    correct: 'Drawing district boundaries to favor a particular party'
  },
  {
    question: 'Which amendment lowered the voting age from 21 to 18?',
    options: ['22nd', '24th', '26th', '27th'],
    correct: '26th'
  },
  {
    question: 'What is the primary purpose of the Electoral College?',
    options: [
      'To cast formal votes for president based on state results',
      'To count the popular vote nationwide',
      'To verify voter identities',
      'To conduct presidential debates'
    ],
    correct: 'To cast formal votes for president based on state results'
  }
]

function getRating(score, total) {
  const percentage = (score / total) * 100
  if (percentage >= 88) return { emoji: '🏆', text: 'Expert!' }
  if (percentage >= 75) return { emoji: '🎓', text: 'Great job!' }
  if (percentage >= 60) return { emoji: '👍', text: 'Good effort!' }
  if (percentage >= 40) return { emoji: '📚', text: 'Keep learning!' }
  return { emoji: '💪', text: 'Try again!' }
}

export default function Quiz() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [showAI, setShowAI] = useState(false)
  const [aiFeedback, setAiFeedback] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [finished, setFinished] = useState(false)
  const API = import.meta.env.VITE_API_URL || ''

  const questions = useMemo(() => questionsStatic, [])
  const currentQ = questions[currentIndex]

  const handleAnswer = async (option) => {
    if (selected !== null) return
    setSelected(option)
    const isCorrect = option === currentQ.correct
    if (isCorrect) setScore(s => s + 1)

    setFeedback(isCorrect ? 'Correct!' : `Incorrect. The answer is: ${currentQ.correct}`)
    setShowAI(true)

    // Get AI feedback
    setIsLoadingAI(true)
    try {
      const res = await fetch(`${API}/api/quiz-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          selected: option,
          correct: currentQ.correct
        })
      })

      if (!res.ok) {
        let msg = 'Could not get AI feedback.'
        try {
          const body = await res.json()
          if (body && body.error) msg = body.error
        } catch (_) {}
        setAiFeedback(msg)
        return
      }

      const data = await res.json()
      setAiFeedback(data.feedback || 'Could not get AI feedback.')
    } catch (networkErr) {
      setAiFeedback('Network error — please check your connection.')
    } finally {
      setIsLoadingAI(false)
    }
  }

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
      setSelected(null)
      setFeedback('')
      setShowAI(false)
      setAiFeedback('')
    } else {
      setFinished(true)
    }
  }

  const reset = () => {
    setCurrentIndex(0)
    setScore(0)
    setSelected(null)
    setFeedback('')
    setShowAI(false)
    setAiFeedback('')
    setFinished(false)
  }

  if (finished) {
    const rating = getRating(score, questions.length)
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">{rating.emoji}</div>
          <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-xl text-gray-600 mb-2">
            You scored {score} out of {questions.length}
          </p>
          <p className="text-lg font-semibold text-blue-600 mb-6">{rating.text}</p>
          <button
            onClick={reset}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Try the quiz again"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-700">Question {currentIndex + 1} of {questions.length}</span>
          <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={questions.length} aria-label={`Question ${currentIndex + 1} of ${questions.length}`}>
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-8">
        <h2 className="text-xl font-bold mb-6">{currentQ.question}</h2>
        <div className="space-y-3">
          {currentQ.options.map((option, i) => {
            const isSelected = selected === option
            const isCorrect = option === currentQ.correct
            let bgColor = 'bg-gray-50 hover:bg-gray-100'
            let borderColor = 'border-gray-200'
            if (selected !== null) {
              if (isCorrect) {
                bgColor = 'bg-green-50 border-green-200'
                borderColor = 'border-green-300'
              } else if (isSelected) {
                bgColor = 'bg-red-50 border-red-200'
                borderColor = 'border-red-300'
              }
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(option)}
                disabled={selected !== null}
                className={`w-full text-left p-4 rounded-lg border ${borderColor} ${bgColor} transition-colors disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  isSelected ? 'ring-2 ring-blue-300' : ''
                }`}
                aria-label={`Option: ${option}`}
              >
                <span className="font-medium">{option}</span>
              </button>
            )
          })}
        </div>

        {feedback && (
          <p className={`mt-4 font-semibold ${feedback.startsWith('Correct') ? 'text-green-700' : 'text-red-700'}`} aria-live="assertive" aria-label={feedback}>
            {feedback}
          </p>
        )}

        {showAI && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200" aria-live="polite">
            {isLoadingAI ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" aria-label="Loading AI feedback"></div>
                <span className="text-sm text-blue-700">Getting AI feedback...</span>
              </div>
            ) : aiFeedback ? (
              <>
                <div className="text-sm text-gray-700 mb-1 font-semibold">AI Tutor:</div>
                <div className="text-gray-800">{aiFeedback}</div>
              </>
            ) : null}
          </div>
        )}

        {selected !== null && (
          <button
            onClick={nextQuestion}
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label={currentIndex < questions.length - 1 ? 'Next question' : 'Finish quiz'}
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        )}
      </div>
    </div>
  )
}