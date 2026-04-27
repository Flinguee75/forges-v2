import PropTypes from 'prop-types';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisible = 5,
}) {
  const getPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-text bg-white border border-border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Précédent
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-text bg-white border border-border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-subtext">
            Page <span className="font-medium">{currentPage}</span> sur{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {/* Previous Button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-white text-sm font-medium text-subtext hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Précédent</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            {/* First Page */}
            {pages[0] > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="relative inline-flex items-center px-4 py-2 border border-border bg-white text-sm font-medium text-text hover:bg-gray-50"
                >
                  1
                </button>
                {pages[0] > 2 && (
                  <span className="relative inline-flex items-center px-4 py-2 border border-border bg-white text-sm font-medium text-subtext">
                    ...
                  </span>
                )}
              </>
            )}

            {/* Page Numbers */}
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  page === currentPage
                    ? 'z-10 bg-primary border-primary text-white'
                    : 'bg-white border-border text-text hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}

            {/* Last Page */}
            {pages[pages.length - 1] < totalPages && (
              <>
                {pages[pages.length - 1] < totalPages - 1 && (
                  <span className="relative inline-flex items-center px-4 py-2 border border-border bg-white text-sm font-medium text-subtext">
                    ...
                  </span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="relative inline-flex items-center px-4 py-2 border border-border bg-white text-sm font-medium text-text hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Next Button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-white text-sm font-medium text-subtext hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Suivant</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  maxVisible: PropTypes.number,
};
