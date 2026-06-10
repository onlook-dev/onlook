export enum ApplyCodeChangeRisk {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

export interface ApplyCodeChangeSignal {
    key: string;
    label: string;
    score: number;
    weight: number;
    details?: string;
}

export interface ApplyCodeChangeStats {
    originalLines: number;
    updateLines: number;
    appliedLines?: number;
    editDensity: number;
    instructionCoverage: number;
    missingOriginalSymbols: string[];
    placeholders: string[];
}

export interface ApplyCodeChangeAssessment {
    score: number;
    confidence: number;
    risk: ApplyCodeChangeRisk;
    summary: string;
    signals: ApplyCodeChangeSignal[];
    blockingConcerns: string[];
    stats: ApplyCodeChangeStats;
}

export interface ApplyCodeChangeGateOptions {
    minimumScore?: number;
    blockHighRisk?: boolean;
    blockOnMissingSymbols?: boolean;
}

const DEFAULT_GATE_OPTIONS: Required<ApplyCodeChangeGateOptions> = {
    minimumScore: 55,
    blockHighRisk: true,
    blockOnMissingSymbols: true,
};

const PLACEHOLDER_PATTERNS = [
    /\.\.\.\s*(?:existing|new)?\s*code/gi,
    /\b(?:TODO|FIXME|XXX)\b/gi,
    /\b(?:your|insert)\s+(?:code|implementation)\s+here\b/gi,
    /\/\/\s*other fields\b/gi,
];

const RISKY_PATTERNS = [
    { pattern: /\beval\s*\(/g, label: 'uses eval' },
    { pattern: /\bnew\s+Function\s*\(/g, label: 'constructs a Function dynamically' },
    { pattern: /\bdangerouslySetInnerHTML\b/g, label: 'uses dangerouslySetInnerHTML' },
    { pattern: /\bdocument\.write\s*\(/g, label: 'writes directly to document' },
    { pattern: /\blocalStorage\.clear\s*\(/g, label: 'clears local storage' },
];

const STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'be',
    'by',
    'for',
    'from',
    'i',
    'in',
    'is',
    'it',
    'of',
    'on',
    'or',
    'that',
    'the',
    'this',
    'to',
    'with',
]);

export function assessCodeChange(
    originalCode: string,
    updateSnippet: string,
    instruction: string,
    appliedCode?: string | null,
): ApplyCodeChangeAssessment {
    const codeToAssess = appliedCode ?? updateSnippet;
    const originalLines = countLines(originalCode);
    const updateLines = countLines(updateSnippet);
    const appliedLines = appliedCode ? countLines(appliedCode) : undefined;
    const editDensity = calculateEditDensity(originalCode, codeToAssess);
    const instructionCoverage = calculateInstructionCoverage(instruction, codeToAssess);
    const missingOriginalSymbols = appliedCode
        ? findMissingOriginalSymbols(originalCode, appliedCode)
        : [];
    const placeholders = findPlaceholders(codeToAssess);
    const riskyPatterns = findRiskyPatterns(codeToAssess);
    const syntaxBalanceScore = scoreSyntaxBalance(codeToAssess);

    const signals: ApplyCodeChangeSignal[] = [
        {
            key: 'syntax-balance',
            label: 'Syntax balance',
            score: syntaxBalanceScore,
            weight: 0.24,
            details:
                syntaxBalanceScore === 100
                    ? 'Brackets, braces, and string delimiters look balanced.'
                    : 'Potentially unbalanced delimiters.',
        },
        {
            key: 'placeholder-free',
            label: 'Placeholder-free output',
            score: clampScore(100 - placeholders.length * (appliedCode ? 35 : 18)),
            weight: 0.18,
            details: placeholders.length
                ? `Found ${placeholders.length} placeholder marker(s).`
                : 'No obvious placeholders detected.',
        },
        {
            key: 'symbol-preservation',
            label: 'Original symbol preservation',
            score: missingOriginalSymbols.length
                ? clampScore(100 - missingOriginalSymbols.length * 24)
                : 100,
            weight: appliedCode ? 0.2 : 0.08,
            details: missingOriginalSymbols.length
                ? `Missing exported or declared symbol(s): ${missingOriginalSymbols.slice(0, 6).join(', ')}`
                : 'No obvious exported or declared symbols were dropped.',
        },
        {
            key: 'instruction-coverage',
            label: 'Instruction coverage',
            score: clampScore(Math.round(instructionCoverage * 100)),
            weight: 0.14,
            details: `${Math.round(instructionCoverage * 100)}% of meaningful instruction tokens appear in the assessed code.`,
        },
        {
            key: 'edit-density',
            label: 'Edit density',
            score: scoreEditDensity(editDensity, appliedCode),
            weight: 0.14,
            details: `${Math.round(editDensity * 100)}% approximate line-level change density.`,
        },
        {
            key: 'risky-patterns',
            label: 'Risky pattern scan',
            score: clampScore(100 - riskyPatterns.length * 28),
            weight: 0.1,
            details: riskyPatterns.length
                ? riskyPatterns.join(', ')
                : 'No obvious high-risk browser/runtime patterns detected.',
        },
    ];

    const score = weightedScore(signals);
    const blockingConcerns = [
        ...placeholders.map((placeholder) => `Placeholder left in generated code: ${placeholder}`),
        ...missingOriginalSymbols.map((symbol) => `Possible dropped original symbol: ${symbol}`),
        ...riskyPatterns.map((risk) => `Risky generated code pattern: ${risk}`),
    ];
    if (syntaxBalanceScore < 70) {
        blockingConcerns.unshift('Generated code appears to have unbalanced syntax delimiters.');
    }

    const risk = getRisk(score, blockingConcerns);
    return {
        score,
        confidence: getConfidence(
            Boolean(appliedCode),
            signals,
            originalCode,
            updateSnippet,
            instruction,
        ),
        risk,
        summary: summarizeAssessment(score, risk, blockingConcerns, Boolean(appliedCode)),
        signals,
        blockingConcerns,
        stats: {
            originalLines,
            updateLines,
            appliedLines,
            editDensity,
            instructionCoverage,
            missingOriginalSymbols,
            placeholders,
        },
    };
}

export function shouldBlockApply(
    assessment: ApplyCodeChangeAssessment,
    options: ApplyCodeChangeGateOptions = {},
): boolean {
    const gate = { ...DEFAULT_GATE_OPTIONS, ...options };
    if (assessment.score < gate.minimumScore) {
        return true;
    }
    if (gate.blockHighRisk && assessment.risk === ApplyCodeChangeRisk.HIGH) {
        return true;
    }
    if (gate.blockOnMissingSymbols && assessment.stats.missingOriginalSymbols.length > 0) {
        return true;
    }
    return false;
}

function countLines(value: string): number {
    if (!value.trim()) {
        return 0;
    }
    return value.split(/\r?\n/).length;
}

function calculateEditDensity(originalCode: string, assessedCode: string): number {
    const originalLines = normalizeLines(originalCode);
    const assessedLines = normalizeLines(assessedCode);
    if (!originalLines.length && !assessedLines.length) {
        return 0;
    }

    const maxLength = Math.max(originalLines.length, assessedLines.length);
    let changed = Math.abs(originalLines.length - assessedLines.length);
    const sharedLength = Math.min(originalLines.length, assessedLines.length);
    for (let i = 0; i < sharedLength; i += 1) {
        if (originalLines[i] !== assessedLines[i]) {
            changed += 1;
        }
    }
    return roundRatio(changed / maxLength);
}

function normalizeLines(value: string): string[] {
    return value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function calculateInstructionCoverage(instruction: string, assessedCode: string): number {
    const instructionTokens = tokenize(instruction);
    if (!instructionTokens.length) {
        return 1;
    }
    const codeTokens = new Set(tokenize(assessedCode));
    const matched = instructionTokens.filter((token) => codeTokens.has(token));
    return roundRatio(matched.length / instructionTokens.length);
}

function tokenize(value: string): string[] {
    const tokens = value.toLowerCase().match(/[a-z][a-z0-9_]{2,}/g) ?? [];
    return [...new Set(tokens.filter((token) => !STOP_WORDS.has(token)))];
}

function findMissingOriginalSymbols(originalCode: string, appliedCode: string): string[] {
    const originalSymbols = extractDeclaredSymbols(originalCode);
    const appliedSymbols = extractDeclaredSymbols(appliedCode);
    return [...originalSymbols].filter((symbol) => !appliedSymbols.has(symbol)).sort();
}

function extractDeclaredSymbols(code: string): Set<string> {
    const symbols = new Set<string>();
    const patterns = [
        /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
        /\b(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
        /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
    ];
    for (const pattern of patterns) {
        for (const match of code.matchAll(pattern)) {
            if (match[1]) {
                symbols.add(match[1]);
            }
        }
    }
    return symbols;
}

function findPlaceholders(code: string): string[] {
    const placeholders = new Set<string>();
    for (const pattern of PLACEHOLDER_PATTERNS) {
        for (const match of code.matchAll(pattern)) {
            placeholders.add(match[0].trim());
        }
    }
    return [...placeholders];
}

function findRiskyPatterns(code: string): string[] {
    const riskyPatterns = new Set<string>();
    for (const { pattern, label } of RISKY_PATTERNS) {
        if (pattern.test(code)) {
            riskyPatterns.add(label);
        }
        pattern.lastIndex = 0;
    }
    return [...riskyPatterns];
}

function scoreSyntaxBalance(code: string): number {
    const stripped = stripStringsAndComments(code);
    const pairs: Record<string, string> = {
        '(': ')',
        '[': ']',
        '{': '}',
    };
    const closers = new Set(Object.values(pairs));
    const stack: string[] = [];
    let mismatches = 0;

    for (const char of stripped) {
        if (pairs[char]) {
            stack.push(pairs[char]);
        } else if (closers.has(char) && stack.pop() !== char) {
            mismatches += 1;
        }
    }

    return clampScore(100 - (stack.length + mismatches) * 18);
}

function stripStringsAndComments(code: string): string {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '');
}

function scoreEditDensity(
    editDensity: number,
    hasAppliedCode: string | null | undefined | boolean,
): number {
    if (!hasAppliedCode) {
        return editDensity > 0.85 ? 55 : 85;
    }
    if (editDensity <= 0.45) {
        return 100;
    }
    if (editDensity <= 0.7) {
        return 78;
    }
    if (editDensity <= 0.9) {
        return 58;
    }
    return 38;
}

function weightedScore(signals: ApplyCodeChangeSignal[]): number {
    const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
    const score =
        signals.reduce((sum, signal) => sum + signal.score * signal.weight, 0) / totalWeight;
    return clampScore(Math.round(score));
}

function getRisk(score: number, blockingConcerns: string[]): ApplyCodeChangeRisk {
    if (score < 60 || blockingConcerns.length >= 3) {
        return ApplyCodeChangeRisk.HIGH;
    }
    if (score < 80 || blockingConcerns.length > 0) {
        return ApplyCodeChangeRisk.MEDIUM;
    }
    return ApplyCodeChangeRisk.LOW;
}

function getConfidence(
    hasAppliedCode: boolean,
    signals: ApplyCodeChangeSignal[],
    originalCode: string,
    updateSnippet: string,
    instruction: string,
): number {
    const nonEmptyInputs = [originalCode, updateSnippet, instruction].filter(
        (value) => value.trim().length > 0,
    ).length;
    const base = hasAppliedCode ? 0.78 : 0.58;
    const inputBonus = nonEmptyInputs * 0.05;
    const signalBonus = Math.min(signals.length, 6) * 0.015;
    return roundRatio(Math.min(base + inputBonus + signalBonus, 0.92));
}

function summarizeAssessment(
    score: number,
    risk: ApplyCodeChangeRisk,
    blockingConcerns: string[],
    hasAppliedCode: boolean,
): string {
    const stage = hasAppliedCode ? 'Applied code' : 'Preflight snippet';
    if (risk === ApplyCodeChangeRisk.LOW) {
        return `${stage} looks clear enough to review with low risk.`;
    }
    if (blockingConcerns.length) {
        return `${stage} needs review before apply. Main concern: ${blockingConcerns[0]}`;
    }
    return `${stage} scored ${score}/100 and should get a closer look before apply.`;
}

function clampScore(value: number): number {
    return Math.max(0, Math.min(100, value));
}

function roundRatio(value: number): number {
    return Math.round(value * 1000) / 1000;
}
