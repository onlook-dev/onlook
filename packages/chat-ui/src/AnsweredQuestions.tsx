import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { answerParts, withoutRecommended, type Question, type QuestionAnswers } from '@studio/events';
import { fade, SHEET_TIMING as T, useQuestionSheetScope } from './questionSheetMotion.js';

export interface AnsweredQuestionsProps {
  toolCallId: string;
  questions: Question[];
  answers: QuestionAnswers;
}

/** The answered view the sheet leaves behind; fed only by `answerParts`, so another design replaces this file alone. */
export function AnsweredQuestions({ toolCallId, questions, answers }: AnsweredQuestionsProps): ReactNode {
  const { justAnswered } = useQuestionSheetScope();
  const root = useRef<HTMLDivElement>(null);
  const rises = useRef(justAnswered.has(toolCallId));

  useLayoutEffect(() => {
    if (rises.current && root.current !== null) fade(root.current, 'in', T.recordIn, { rise: T.recordRise, delay: T.recordInDelay });
  }, []);

  const rows = questions.flatMap((question) => {
    const answer = answers[question.question];
    return answer === undefined ? [] : [{ question, ...answerParts(question, answer) }];
  });
  if (rows.length === 0) return null;

  return (
    <VStack ref={root} gap={4} width="100%" data-testid="question-answered" style={{ borderInlineStart: '2px solid var(--color-border)', paddingInlineStart: 12, marginBlock: 4 }}>
      {rows.map(({ question, picks, note }) => {
        const said = picks.map(withoutRecommended).join(', ');
        return (
          <VStack key={question.question} gap={0.5} data-testid="question-answer">
            <Text type="supporting" color="secondary" textWrap="pretty">{question.question}</Text>
            <Text type="body" color="primary" textWrap="pretty" style={{ overflowWrap: 'anywhere' }}>{said === '' ? note : said}</Text>
            {said !== '' && note !== '' ? (
              <Text type="body" color="primary" textWrap="pretty" style={{ overflowWrap: 'anywhere' }}>{note}</Text>
            ) : null}
          </VStack>
        );
      })}
    </VStack>
  );
}
