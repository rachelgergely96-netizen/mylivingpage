// Leaves room for multipart boundaries and headers under serverless request-body limits.
export const MAX_RESUME_FILE_BYTES = Math.floor(3.5 * 1024 * 1024);
export const MAX_RESUME_FILE_LABEL = "3.5 MB";
