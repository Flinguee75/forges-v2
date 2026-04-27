import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Icon from '../ui/Icon';

export default function Sidebar({
  isOpen,
  onToggle,
  sections,
  currentPath,
}) {
  const isActive = (path) => currentPath === path || currentPath.startsWith(`${path}/`);

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } border-r border-border bg-white transition-all duration-300 flex flex-col overflow-y-auto`}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {isOpen ? (
          <Link to="/backoffice" className="text-xl font-bold text-primary">
            FORGES
          </Link>
        ) : <span className="text-lg font-bold text-primary">F</span>}

        <button
          onClick={onToggle}
          className="text-primary/70 transition-colors hover:text-primary"
          aria-label={isOpen ? 'Réduire la sidebar' : 'Ouvrir la sidebar'}
          type="button"
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      <nav className="flex-1 py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            {isOpen ? (
              <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-primary/60">
                {section.title}
              </p>
            ) : null}

            {section.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex w-full min-h-12 items-center gap-3 overflow-hidden border-r-4 border-transparent px-4 py-3 transition-colors ${
                  isActive(item.href)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-primary/80 hover:bg-primary/5 hover:text-primary'
                }`}
                title={!isOpen ? item.name : undefined}
              >
                {item.icon && <Icon name={item.icon} size={20} className="flex-shrink-0" />}
                {isOpen && <span className="min-w-0 flex-1 truncate font-medium whitespace-nowrap">{item.name}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  currentPath: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
          href: PropTypes.string.isRequired,
          icon: PropTypes.string,
        })
      ).isRequired,
    })
  ).isRequired,
};
