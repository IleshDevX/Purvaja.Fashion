import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="py-24 lg:py-32 flex items-center justify-center px-6 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <p className="text-overline text-gold-600">404 Error</p>
        <h1 className="font-serif text-display-lg text-charcoal-900 leading-none">
          Page Uncharted
        </h1>
        <p className="text-body text-charcoal-500 leading-relaxed">
          The archive or page you requested does not exist or has been relocated to another collection.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-8 py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wide hover:bg-charcoal-800 transition-colors inline-flex items-center justify-center gap-2"
          >
            Return to Home <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/shop"
            className="px-8 py-3.5 border border-charcoal-400 text-charcoal-800 text-body-sm font-semibold tracking-wide hover:border-charcoal-900 transition-colors"
          >
            Browse All Shirts
          </Link>
        </div>
      </div>
    </div>
  );
}
