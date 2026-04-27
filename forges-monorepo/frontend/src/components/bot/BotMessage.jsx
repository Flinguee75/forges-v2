import PropTypes from 'prop-types';

export default function BotMessage({ text, isUser = false, className = '' }) {
  return (
    <div
      className={`flex bot-message-appear ${
        isUser ? 'justify-end' : 'justify-start'
      } ${className}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-action-primary text-white rounded-br-sm'
            : 'bg-gray-100 text-text rounded-bl-sm'
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
