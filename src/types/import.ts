/**
 * Import Types
 * Types related to file imports and data ingestion
 */

export type ImportFileType = 'excel' | 'pdf';

export interface ImportedFile {
    id: string;
    name: string;
    type: ImportFileType;
    importDate: string;
    transactionCount: number;
    transactionIds: string[];
}
