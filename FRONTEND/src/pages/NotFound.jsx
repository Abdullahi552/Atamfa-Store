import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
      <p className="num text-7xl font-semibold">404</p>
      <p className="text-muted">That page doesn't exist.</p>
      <Link to="/" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg">Go home</Link>
    </div>
  );
}
