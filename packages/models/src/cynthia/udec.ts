/**
 * UDEC Scoring System for Cynthia Design Auditor
 * Defines all scoring axes, severity levels, and fix types
 */

export enum UDECAxis {
    CTX = 'CTX', // Context & Clarity
    DYN = 'DYN', // Dynamic & Responsive
    LFT = 'LFT', // Layout & Flow
    TYP = 'TYP', // Typography
    CLR = 'CLR', // Color
    GRD = 'GRD', // Grid & Spacing
    SPC = 'SPC', // Spacing
    IMG = 'IMG', // Imagery
    MOT = 'MOT', // Motion
    ACC = 'ACC', // Accessibility
    RSP = 'RSP', // Responsive
    TRD = 'TRD', // Trends
    EMO = 'EMO', // Emotional Impact
}

export enum IssueSeverity {
    INFO = 'info',
    MINOR = 'minor',
    MAJOR = 'major',
    CRITICAL = 'critical',
}

export enum FixType {
    TOKEN_CHANGE = 'token_change',
    CONTENT_CHANGE = 'content_change',
    LAYOUT_CHANGE = 'layout_change',
    COMPONENT_CHANGE = 'component_change',
    MOTION_CHANGE = 'motion_change',
}

export interface UDECScores {
    [UDECAxis.CTX]: number;
    [UDECAxis.DYN]: number;
    [UDECAxis.LFT]: number;
    [UDECAxis.TYP]: number;
    [UDECAxis.CLR]: number;
    [UDECAxis.GRD]: number;
    [UDECAxis.SPC]: number;
    [UDECAxis.IMG]: number;
    [UDECAxis.MOT]: number;
    [UDECAxis.ACC]: number;
    [UDECAxis.RSP]: number;
    [UDECAxis.TRD]: number;
    [UDECAxis.EMO]: number;
}

export interface DesignIssue {
    id: string;
    axis: UDECAxis;
    severity: IssueSeverity;
    title: string;
    description: string;
    reason: string;
    impact: string;
    elementPath?: string;
    fix: IssueFix;
}

export interface IssueFix {
    type: FixType;
    description: string;
    measurements: FixMeasurements;
    before?: string;
    after?: string;
}

export interface FixMeasurements {
    values?: Record<string, string | number>;
    duration?: string;
    easing?: string;
    contrast?: number;
    tapTarget?: string;
}
