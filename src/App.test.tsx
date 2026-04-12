import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { vi } from 'vitest';

// Mock the TrainingTracker component
vi.mock('@amzn/harmony-react-tutorials', () => ({
  TrainingTracker: vi.fn(() => <div data-testid="training-tracker-mock">TrainingTracker Mock</div>)
}));

let mockLookup = vi.fn();
describe('App', () => {
  mockLookup.mockResolvedValue({ firstName: 'John' });

  beforeEach(() => {
    // Mock the window.harmony API
    vi.stubGlobal('harmony', { user: { lookup: mockLookup } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render successfully', async () => {
    render(<App />);
    expect(screen.getByText('Welcome to React in Harmony', { exact: false })).toBeInTheDocument();
  });

  it('should render the username successfully', async () => {
    mockLookup.mockResolvedValue({ firstName: 'firstNameForTesting' });

    render(<App />);

    // Wait for the useEffect to complete and the username to appear
    await waitFor(() => {
      expect(screen.getByText('firstNameForTesting')).toBeInTheDocument();
    });

    // Verify the lookup function was called
    expect(mockLookup).toHaveBeenCalledTimes(1);
  });

  it('should render the TT queue link with the correct href', () => {
    render(<App />);
    const ttQueueLink = screen.getByTestId('tt-queue'); // This looks for `data-testid` in the attributes of the HTML element
    expect(ttQueueLink).toBeInTheDocument();
    expect(ttQueueLink).toHaveAttribute(
      'href',
      'https://t.corp.amazon.com/create/templates/ea99e1bb-99d1-43d0-815f-c9927730bd4d'
    );
  });
});
