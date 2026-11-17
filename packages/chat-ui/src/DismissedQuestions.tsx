import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { withoutRecommended, type Question } from '@studio/events';
import { fade, SHEET_TIMING as T, useQuestionSheetScope } from './questionSheetMotion.js';
import type { QuestionSheetStrings } from './strings.js';

export interface DismissedQuestionsProps {
  toolCallId: string;
  questions: Question[];
  strings: QuestionSheetStrings;
}

const DISMISSED_CSS = `.chat-question-dismissed { text-decoration-style: dotted; text-underline-offset: 0.25em; }`;

export function DismissedQuestions({ toolCallId, questions, strings }: DismissedQuestionsProps): ReactNode {
  const { justDismissed } = useQuestionSheetScope();
  const [isOpen, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const fadesIn = useRef(justDismissed.has(toolCallId));

  useLayoutEffect(() => {
    if (fadesIn.current && root.current !== null) fade(root.current, 'in', T.dismissedIn, { delay: T.dismissedInDelay });
  }, []);

  if (questions.length === 0) return null;
  return (
    <VStack ref={root} gap={2} width="100%" style={{ alignItems: 'flex-end' }} data-testid="question-dismissed" data-open={isOpen ? 'true' : 'false'}>
      <style href="chat-question-dismissed" precedence="medium">{DISMISSED_CSS}</style>
      <Link
        type="supporting"
        size="sm"
        color={isOpen ? 'secondary' : 'disabled'}
        hasUnderline
        className="chat-question-dismissed"
        onClick={() => setOpen((open) => !open)}
        aria-expanded={isOpen}
        data-testid="question-dismissed-toggle"
      >
        {questions.length === 1 ? strings.dismissedOne : strings.dismissedMany}
      </Link>
      {isOpen ? (
        <VStack gap={3} style={{ border: 'var(--border-width) solid var(--color-border)', borderRadius: 12, padding: '10px 14px 12px', maxWidth: '100%', boxSizing: 'border-box' }} data-testid="question-dismissed-list">
          {questions.map((question) => (
            <VStack key={question.question} gap={1}>
              <Text type="supporting" color="secondary" textWrap="pretty">{question.question}</Text>
              {question.options.map((option) => (
                <Text key={option.label} type="supporting" color="disabled" textWrap="pretty">{withoutRecommended(option.label)}</Text>
              ))}
            </VStack>
          ))}
        </VStack>
      ) : null}
    </VStack>
  );
}
