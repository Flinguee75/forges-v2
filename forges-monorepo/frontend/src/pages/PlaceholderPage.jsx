import PropTypes from 'prop-types';

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/60">
          F4 Layout Validation
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-primary">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-subtext sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}

PlaceholderPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};
