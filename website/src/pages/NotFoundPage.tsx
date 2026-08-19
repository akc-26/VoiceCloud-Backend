import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="vc-placeholder vc-page-width">
      <div className="vc-placeholder__card">
        <span className="vc-eyebrow">404</span>
        <h1>That page isn’t here.</h1>
        <p>The link may have changed, or the page may not be available to your account.</p>
        <Link className="vc-button vc-button--primary" to="/">Return Home</Link>
      </div>
    </section>
  );
}
