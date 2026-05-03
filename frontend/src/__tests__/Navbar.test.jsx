import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../../components/Navbar'

test('Navbar renders CivicLens and links', () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )

  expect(screen.getByText(/CivicLens/)).toBeInTheDocument()
  expect(screen.getByText('Home')).toBeInTheDocument()
  expect(screen.getByText('Timeline')).toBeInTheDocument()
  expect(screen.getByText('Quiz')).toBeInTheDocument()
  expect(screen.getByText('Chat')).toBeInTheDocument()
})
