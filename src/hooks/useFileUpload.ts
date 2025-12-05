'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { processFile } from '@/lib/utils/fileProcessor';
import type { ProcessedFileResult } from '@/types/file-processing';

export interface UploadedFile {
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    checksum: string;
    url: string;
    uploadedAt: string;
    activityId?: string;
}

export interface FileWithStatus {
    id: string;
    file: File;
    originalFile: File;
    status: 'pending' | 'processing' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
    processedResult?: ProcessedFileResult;
    uploadedFile?: UploadedFile;
}

export interface UseFileUploadOptions {
    onSuccess?: (files: UploadedFile[]) => void;
    onError?: (error: string) => void;
    activityId?: string;
    maxFiles?: number;
    maxSize?: number; // in MB
    acceptedTypes?: string[];
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
    const {
        onSuccess,
        onError,
        activityId,
        maxFiles = 5,
        maxSize,
        acceptedTypes,
    } = options;
    const [files, setFiles] = useState<FileWithStatus[]>([]);
    const prevSuccessCountRef = useRef(0);

    // Notify parent when successful uploads change
    useEffect(() => {
        const successFiles = files.filter(f => f.status === 'success' && f.uploadedFile);

        // Only trigger if the number of successful files has changed
        // This covers both additions (upload complete) and removals (user deleted file)
        if (successFiles.length !== prevSuccessCountRef.current) {
            prevSuccessCountRef.current = successFiles.length;

            if (onSuccess) {
                const uploadedFiles = successFiles.map(f => f.uploadedFile!);
                onSuccess(uploadedFiles);
            }
        }
    }, [files, onSuccess]);

    /**
     * Process file (compression/validation) then upload
     */
    const processAndUploadFile = useCallback(async (fileStatus: FileWithStatus) => {
        const { id, originalFile } = fileStatus;

        try {
            // Step 1: Process file (compression or validation)
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id ? { ...f, status: 'processing' as const, progress: 0 } : f
                )
            );

            const processedResult = await processFile(originalFile, (progress) => {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === id ? { ...f, progress: Math.round(progress) } : f
                    )
                );
            });

            if (!processedResult.success) {
                throw new Error(processedResult.error?.messageVi || processedResult.error?.message || 'Processing failed');
            }

            // Step 2: Upload processed file
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id
                        ? {
                            ...f,
                            status: 'uploading' as const,
                            progress: 0,
                            file: processedResult.file as File,
                            processedResult,
                        }
                        : f
                )
            );

            const formData = new FormData();
            formData.append('file', processedResult.file!);
            if (activityId) {
                formData.append('activityId', activityId);
            }

            const response = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            // Step 3: Success
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id
                        ? {
                            ...f,
                            status: 'success' as const,
                            progress: 100,
                            uploadedFile: result.file,
                        }
                        : f
                )
            );

        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : 'Upload failed';

            // Remove file from list on error (auto-remove)
            setFiles((prev) => prev.filter((f) => f.id !== id));

            onError?.(errorMessage);
        }
    }, [activityId, onError]);

    /**
     * Add and process files
     */
    const addFiles = useCallback(
        async (newFiles: File[]) => {
            // Validate max files count
            if (files.length + newFiles.length > maxFiles) {
                onError?.(`Chỉ có thể tải lên tối đa ${maxFiles} tệp.`);
                return;
            }

            // Validate each file before adding
            for (const file of newFiles) {
                // Check file size if maxSize is specified
                if (maxSize !== undefined) {
                    const fileSizeMB = file.size / (1024 * 1024);
                    if (fileSizeMB > maxSize) {
                        onError?.(`Tệp "${file.name}" vượt quá kích thước tối đa ${maxSize}MB (${fileSizeMB.toFixed(2)}MB).`);
                        return;
                    }
                }

                // Check file type if acceptedTypes is specified
                if (acceptedTypes && acceptedTypes.length > 0) {
                    if (!acceptedTypes.includes(file.type)) {
                        const acceptedTypesStr = acceptedTypes.join(', ');
                        onError?.(`Tệp "${file.name}" có định dạng không được chấp nhận. Chỉ chấp nhận: ${acceptedTypesStr}.`);
                        return;
                    }
                }
            }

            // Create file status objects
            const filesWithStatus: FileWithStatus[] = newFiles.map((file) => ({
                id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
                file,
                originalFile: file,
                status: 'pending' as const,
                progress: 0,
            }));

            setFiles((prev) => [...prev, ...filesWithStatus]);

            // Process and upload each file
            for (const fileStatus of filesWithStatus) {
                await processAndUploadFile(fileStatus);
            }
        },
        [files.length, maxFiles, maxSize, acceptedTypes, onError, processAndUploadFile]
    );

    /**
     * Remove a file from the list
     */
    const removeFile = useCallback((fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }, []);

    /**
     * Clear all files
     */
    const clearFiles = useCallback(() => {
        setFiles([]);
    }, []);

    return {
        files,
        addFiles,
        removeFile,
        clearFiles,
        isUploading: files.some((f) => f.status === 'uploading' || f.status === 'processing'),
    };
}
