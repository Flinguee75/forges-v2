import PropTypes from 'prop-types';

export default function BotQuestion({ question, className = '' }) {
  return (
    <div className={`bot-question-appear rounded-lg border border-border bg-white p-4 shadow-sm ${className}`}>
      <p className="text-sm font-medium leading-6 text-text">{question}</p>
    </div>
  );
}

BotQuestion.propTypes = {
  question: PropTypes.string.isRequired,
  className: PropTypes.string,
};
