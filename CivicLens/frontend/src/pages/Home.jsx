import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  const features = [
    {
      title: 'Election Timeline',
      description: 'Follow the complete election process from registration to certification',
      icon: '📅',
      path: '/timeline'
    },
    {
      title: 'Quiz Yourself',
      description: 'Test your knowledge of election processes and voting rights',
      icon: '🧠',
      path: '/quiz'
    },
    {
      title: 'AI Assistant',
      description: 'Get personalized answers about elections from our AI expert',
      icon: '🤖',
      path: '/chat'
    }
  ]

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">
            Understand How Elections Work
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Learn about election processes, timelines, voting rights, and more. Clear, simple, and beginner-friendly.
          </p>
          <button
            onClick={() => navigate('/timeline')}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
          >
            Start Learning
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              onClick={() => navigate(feature.path)}
              className="bg-white p-8 rounded-xl shadow-md border cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}