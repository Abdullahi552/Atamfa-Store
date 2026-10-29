import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '@/App';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';

vi.mock('react-chartjs-2', () => ({ Line: () => <div data-testid="line" />, Bar: () => <div data-testid="bar" /> }));
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
window.print = vi.fn();
URL.createObjectURL = URL.createObjectURL || (() => 'blob:x');

const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); };

const T = { timeout: 8000 };
function mount(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider><ToastProvider><AuthProvider><SettingsProvider><App /></SettingsProvider></AuthProvider></ToastProvider></ThemeProvider>
    </MemoryRouter>,
  );
}
async function login(user, pass) {
  const u = userEvent.setup();
  await u.type(await screen.findByLabelText('Username', {}, T), user);
  await u.type(screen.getByLabelText('Password'), pass);
  await u.click(screen.getByRole('button', { name: 'Sign in' }));
  return u;
}

test('admin walkthrough', async () => {
  mount('/');
  const u = await login('admin', 'admin123');
  expect(await screen.findByText("Today's sales", {}, T)).toBeTruthy();
  expect(await screen.findByText('Profit summary', {}, T)).toBeTruthy();
  expect(await screen.findByText('Cashier activity', {}, T)).toBeTruthy();

  const nav = screen.getByRole('navigation', { name: 'Main' });
  await u.click(within(nav).getByText('Products'));
  expect(await screen.findByText('Atamfa Turmi Premium', {}, T)).toBeTruthy();
  await u.click(screen.getAllByRole('button', { name: /Add material/ })[0]);
  expect(await screen.findByText('Add new material', {}, T)).toBeTruthy();
  // validation: submit empty
  await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add material' }));
  expect(await screen.findByText('Choose at least one colour.', {}, T)).toBeTruthy();
  // fill and save
  await u.type(screen.getByPlaceholderText(/Atamfa Turmi Premium/), 'Test Fabric');
  await u.type(screen.getByPlaceholderText('TUR-001'), 'TST-001');
  await u.click(screen.getByRole('button', { name: 'Fuchsia' }));
  const dlg = screen.getByRole('dialog');
  const nums = within(dlg).getAllByRole('spinbutton');
  await u.type(nums[0], '5000'); await u.type(nums[1], '3000'); await u.type(nums[2], '10');
  await u.click(within(dlg).getByRole('button', { name: 'Add material' }));
  await waitFor(() => expect(screen.queryByText('Add new material')).toBeNull(), T);

  await u.click(within(nav).getByText('Sales'));
  expect((await screen.findAllByText(/^RCP-/, {}, T)).length).toBeGreaterThan(3);
  await u.click(screen.getAllByText(/^RCP-/)[0]);
  expect(await screen.findByText(/^Receipt RCP-/, {}, T)).toBeTruthy();
  await u.click(screen.getByRole('button', { name: 'Close' }));

  await u.click(within(nav).getByText('Cashiers'));
  expect(await screen.findByText('Aisha Bello', {}, T)).toBeTruthy();
  await u.click(within(nav).getByText('Reports'));
  expect(await screen.findByText('Revenue (before tax)', {}, T)).toBeTruthy();
  for (const tab of ['Best sellers', 'Slow movers', 'Inventory', 'Cashier activity', 'Sales & profit']) {
    await u.click(screen.getByRole('tab', { name: tab }));
    await waitFor(() => expect(screen.getByRole('tab', { name: tab, selected: true })).toBeTruthy());
    await new Promise((r) => setTimeout(r, 500));
  }
  await u.click(within(nav).getByText('Settings'));
  expect(await screen.findByText('Vacation mode', {}, T)).toBeTruthy();
  await u.click(screen.getByRole('button', { name: 'Save shop settings' }));
  expect(await screen.findByText('Shop settings saved.', {}, T)).toBeTruthy();
});

test('cashier sells', async () => {
  cleanup(); localStorage.clear();
  mount('/');
  const u = await login('aisha', 'cashier123');
  expect(await screen.findByText('Atamfa Turmi Premium', {}, T)).toBeTruthy();
  await u.click(screen.getByText('Atamfa Turmi Premium'));
  expect(await screen.findByText('Which colour?', {}, T)).toBeTruthy();
  await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Gold/ }));
  expect(await screen.findByText('Subtotal', {}, T)).toBeTruthy();
  await u.click(screen.getByLabelText('Increase'));
  await u.click(screen.getByRole('button', { name: '3' })); // keypad -> qty 3
  expect(screen.getAllByText(/55,500/).length).toBeGreaterThan(0);
  await u.click(screen.getByRole('button', { name: 'Paid' }));
  expect(await screen.findByText(/^Receipt RCP-/, {}, T)).toBeTruthy();
  await u.click(screen.getByRole('button', { name: 'Print' }));
  expect(window.print).toHaveBeenCalled();
  await u.click(screen.getByRole('button', { name: 'Close' }));
  // hold flow
  await u.click(screen.getByText('Cotton Plain White'));
  await u.click(screen.getByRole('button', { name: 'Hold cart' }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Held \(1\)/ })).toBeTruthy(), T);
  await u.click(screen.getByRole('button', { name: /Held \(1\)/ }));
  await u.click(await screen.findByRole('button', { name: /Resume/ }));
  await waitFor(() => expect(screen.getAllByText('Cotton Plain White').length).toBeGreaterThan(1), T);
  const nav = screen.getByRole('navigation', { name: 'Main' });
  await u.click(within(nav).getByText('My sales'));
  expect((await screen.findAllByText(/^RCP-/, {}, T)).length).toBeGreaterThan(0);
});

afterAll(() => {
  console.error = origError;
  const real = errors.filter((e) => !/not wrapped in act|Not implemented: window.print/.test(e));
  if (real.length) console.log('CONSOLE ERRORS:\n' + real.join('\n---\n'));
  expect(real).toEqual([]);
});
