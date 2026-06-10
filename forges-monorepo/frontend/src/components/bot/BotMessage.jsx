import PropTypes from 'prop-types';

export default function BotMessage({ text, isUser = false, className = '' }) {
  return (
    <div
      className={`flex bot-message-appear items-end gap-2 ${
        isUser ? 'justify-end' : 'justify-start'
      } ${className}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
          <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-bg border border-border text-text rounded-bl-sm'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

BotMessage.propTypes = {
  text: PropTypes.string.isRequired,
  isUser: PropTypes.bool,
  className: PropTypes.string,
};
