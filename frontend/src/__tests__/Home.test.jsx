import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../../pages/Home'

test('hero heading and Start Learning button present', () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

  expect(screen.getByText('Understand How Elections Work')).toBeInTheDocument()
  expect(screen.getByText('Start Learning')).toBeInTheDocument()
})
