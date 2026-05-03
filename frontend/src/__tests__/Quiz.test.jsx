import { render, screen, fireEvent } from '@testing-library/react'
import { within } from '@testing-library/dom'
import Quiz from '../../pages/Quiz'
import { vi } from 'vitest'

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ feedback: 'AI feedback' }) })
  )
})

test('first question renders', () => {
  render(<Quiz />)
  expect(screen.getByText('What is the minimum age to vote in the United States?')).toBeInTheDocument()
})

test('clicking an answer disables other options', async () => {
  render(<Quiz />)
  const questionHeading = screen.getByText('What is the minimum age to vote in the United States?')
  const container = questionHeading.parentElement
  const optionButtons = within(container).getAllByRole('button')
  // click the first option
  fireEvent.click(optionButtons[0])

  // after selecting, all option buttons in the options area should be disabled
  const optionsAfter = within(container).getAllByRole('button')
  // ensure at least one option was present and now disabled state applied
  expect(optionsAfter.length).toBeGreaterThan(0)
  optionsAfter.forEach(btn => {
    expect(btn).toBeDisabled()
  })
})
