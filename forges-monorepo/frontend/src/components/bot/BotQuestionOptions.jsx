import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import BotCommentaireInput from './BotCommentaireInput';
import {
  canUseQuestionComment,
  getBotCopy,
  getQuestionCommentLength,
  isAllowedBotValue,
} from './botHelpers';

const RATING_QUESTION_IDS = new Set([
  'note_globale',
  'qualite_contenu',
  'qualite_animation',
  'utilite_professionnelle',
  'feedback_note_globale',
  'feedback_note_contenu',
  'feedback_note_formateur',
]);

const EMPTY_OPTIONS = [];

function StarButton({ active, label, onClick, disabled, onMouseEnter, onMouseLeave }) {
  return (
    <button
      type="button"
      className={`rounded-full p-2 transition-colors ${active ? 'text-warning' : 'text-border hover:text-warning'} disabled:cursor-not-allowed disabled:opacity-50`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.08 3.323a1 1 0 00.95.69h3.492c.969 0 1.371 1.24.588 1.81l-2.826 2.054a1 1 0 00-.364 1.118l1.08 3.323c.3.922-.755 1.688-1.539 1.118l-2.826-2.054a1 1 0 00-1.176 0l-2.826 2.054c-.784.57-1.838-.196-1.539-1.118l1.08-3.323a1 1 0 00-.364-1.118L2.98 8.75c-.783-.57-.38-1.81.588-1.81H7.06a1 1 0 00.95-.69l1.08-3.323z" />
      </svg>
    </button>
  );
}

StarButton.propTypes = {
  active: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

function BotQuestionOptionsContent({ question, language = 'FR', onSubmit, isLoading }) {
  const [commentaire, setCommentaire] = useState('');
  const [commentaireError, setCommentaireError] = useState('');
  const [hoveredRating, setHoveredRating] = useState(null);
  const copy = getBotCopy(language);

  const options = question?.options ?? EMPTY_OPTIONS;
  const allowComment = canUseQuestionComment(question);
  const maxLength = getQuestionCommentLength(question);
  const optionValues = useMemo(() => options.map((option) => option.value), [options]);

  const submitValue = (value) => {
    if (!isAllowedBotValue(question, value)) {
      setCommentaireError(copy.invalidChoice);
      return;
    }

    if (!allowComment && commentaire.trim()) {
      setCommentaireError(copy.commentNotAllowed);
      return;
    }

    if (commentaire.length > maxLength) {
      setCommentaireError(copy.commentTooLong(maxLength));
      return;
    }

    setCommentaireError('');
    onSubmit(value, allowComment ? commentaire.trim() || null : null);
  };

  if (RATING_QUESTION_IDS.has(question.id)) {
    const starOptions = options.filter((o) => o.value !== 'PASSER');
    const skipOption = options.find((o) => o.value === 'PASSER');
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1">
          {starOptions.map((option, index) => (
            <StarButton
              key={option.value}
              active={hoveredRating ? index < hoveredRating : false}
              label={`${option.label} ${option.label === '1' ? copy.ratingLabelSingular : copy.ratingLabelPlural}`}
              onClick={() => submitValue(option.value)}
              disabled={isLoading}
              onMouseEnter={() => setHoveredRating(index + 1)}
              onMouseLeave={() => setHoveredRating(null)}
            />
          ))}
        </div>
        {skipOption && (
          <Button
            variant="outline"
            size="small"
            onClick={() => submitValue(skipOption.value)}
            disabled={isLoading}
          >
            {skipOption.label}
          </Button>
        )}
        {commentaireError && (
          <p className="text-xs text-danger">{commentaireError}</p>
        )}
      </div>
    );
  }

  // Sinon, afficher des boutons
  return (
    <div className="space-y-3">
      {allowComment && (
        <BotCommentaireInput
          value={commentaire}
          onChange={setCommentaire}
          error={commentaireError}
          maxLength={maxLength}
          placeholder={copy.commentPlaceholder}
        />
      )}

      <div className={`grid gap-1.5 ${optionValues.length > 3 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => submitValue(option.value)}
            disabled={isLoading}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-bg px-3.5 py-2.5 text-left text-sm text-text transition-all hover:border-primary/40 hover:bg-primary/5 hover:translate-x-0.5 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-border group-hover:bg-primary" />
            {option.label}
          </button>
        ))}
      </div>

      {!allowComment && commentaireError && (
        <p className="text-xs text-danger">{commentaireError}</p>
      )}
    </div>
  );
}

BotQuestionOptionsContent.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
      })
    ).isRequired,
    allow_commentaire: PropTypes.bool,
    commentaire_max_length: PropTypes.number,
  }).isRequired,
  language: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default function BotQuestionOptions({ question, language = 'FR', onSubmit, isLoading }) {
  return (
    <BotQuestionOptionsContent
      key={question.id}
      question={question}
      language={language}
      onSubmit={onSubmit}
      isLoading={isLoading}
    />
  );
}

BotQuestionOptions.propTypes = BotQuestionOptionsContent.propTypes;
