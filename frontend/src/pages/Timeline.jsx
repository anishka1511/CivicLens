import { useState, useEffect } from 'react'

const phases = [
  {
    name: 'Registration',
    description: 'Voter registration period where eligible citizens sign up to vote.',
    steps: [
      'Check eligibility requirements (age, citizenship, residency)',
      'Complete registration form online or in-person',
      'Verify registration status',
      'Update information if needed (address, name change)'
    ]
  },
  {
    name: 'Nomination',
    description: 'Candidates declare their intent to run for office.',
    steps: [
      'Candidates announce their campaigns',
      'File necessary paperwork and petitions',
      'Meet ballot access requirements',
      'Primary elections narrow the field'
    ]
  },
  {
    name: 'Campaign',
    description: 'Candidates present their platforms to the public.',
    steps: [
      'Debates and public forums',
      'Advertising and outreach',
      'Fundraising activities',
      'Get-out-the-vote efforts'
    ]
  },
  {
    name: 'Voting Day',
    description: 'Election day when registered voters cast their ballots.',
    steps: [
      'Polls open at designated times',
      'Voters present identification',
      'Ballots are cast (in-person or mail)',
      'Polls close and votes are secured'
    ]
  },
  {
    name: 'Counting',
    description: 'Votes are tallied and results are prepared.',
    steps: [
      'Secure transport of ballots to counting centers',
      'Tabulation of votes',
      'Processing of mail-in and provisional ballots',
      'Preparation of official results'
    ]
  },
  {
    name: 'Certification',
    description: 'Official results are certified and winners declared.',
    steps: [
      'Canvassing board reviews results',
      'Recounts if margin is within threshold',
      'Official certification of winners',
      'Certificates of election issued'
    ]
  },
  {
    name: 'Post-Election',
    description: 'Analysis, transitions, and preparation for next cycle.',
    steps: [
      'Winners take office',
      'Transition of power',
      'Electoral reform discussions',
      'Voter feedback and assessment'
    ]
  }
]

export default function Timeline() {
  const [expandedPhase, setExpandedPhase] = useState(null)
  const [explainingPhase, setExplainingPhase] = useState(null)
  const [aiExplanation, setAiExplanation] = useState('')
  const API = import.meta.env.VITE_API_URL || ''

  const togglePhase = (index) => {
    setExpandedPhase(expandedPhase === index ? null : index)
    setExplainingPhase(null)
    setAiExplanation('')
  }

  const askAI = async (phase) => {
    setExplainingPhase(phase.name)
    setAiExplanation('')
    try {
      const response = await fetch(`${API}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: phase.name })
      })
      const data = await response.json()
      setAiExplanation(data.explanation)
    } catch (error) {
      setAiExplanation('Failed to get AI explanation. Please try again.')
    } finally {
      setExplainingPhase(null)
    }
  }

  const exploredCount = expandedPhase !== null ? 1 : 0
  const totalPhases = phases.length

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Election Timeline</h1>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg p-4 mb-8 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Phases Explored</span>
          <span className="text-sm font-medium text-blue-600">{exploredCount} / {totalPhases}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${(exploredCount / totalPhases) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {phases.map((phase, index) => (
          <div key={index} className="mb-8 relative">
            {/* Connecting line */}
            {index < phases.length - 1 && (
              <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-300 -ml-px"></div>
            )}

            {/* Phase node */}
            <div className="relative flex items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {index + 1}
              </div>
              <div className="ml-6 flex-1 bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{phase.name}</h2>
                <p className="text-gray-600 mb-4">{phase.description}</p>

                {expandedPhase === index && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Key Steps:</h3>
                    <ul className="space-y-1 mb-4">
                      {phase.steps.map((step, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          <span className="text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => askAI(phase)}
                      disabled={explainingPhase === phase.name}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {explainingPhase === phase.name ? 'Loading...' : 'Ask AI about this'}
                    </button>

                    {aiExplanation && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-gray-600 mb-2 font-semibold">AI Explanation:</div>
                        <div className="text-gray-800 whitespace-pre-line">{aiExplanation}</div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => togglePhase(index)}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {expandedPhase === index ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}