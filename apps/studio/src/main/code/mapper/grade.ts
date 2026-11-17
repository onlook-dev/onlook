import type { CodeMapGrade, CodeMapVia } from '@studio/events';

export interface GradeFacts {
  via: CodeMapVia;
  candidates: number;
  moved: boolean;
}

export function gradeOf(facts: GradeFacts): CodeMapGrade {
  if (facts.via === 'element-search' || facts.candidates > 1) return 'best-guess';
  if (facts.via === 'name-search' || facts.via === 'component-stack' || facts.moved) return 'likely';
  return 'exact';
}
