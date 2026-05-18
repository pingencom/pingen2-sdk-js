import { PingenError } from '../errors';
import { ApiRequestor } from '../requestor';

export interface FileUploadAttributes {
  url?: string;
  url_signature?: string;
  expires_at?: string;
}

export interface SignedUpload {
  url: string;
  signature: string;
}

export class FileUpload {
  constructor(private readonly requestor: ApiRequestor) {}

  async requestFileUpload(): Promise<SignedUpload> {
    const res = await this.requestor.get('/file-upload');
    const { url, url_signature } = res.toResource<FileUploadAttributes>().attributes;
    // The /file-upload endpoint MUST return both fields — if it doesn't we want to fail loudly
    // here instead of silently propagating `undefined` into the subsequent create() payload.
    if (!url || !url_signature) {
      throw new PingenError(
        'Pingen /file-upload returned a response missing url or url_signature.',
        res.statusCode,
        res.data,
      );
    }
    return { url, signature: url_signature };
  }

  putFile(filePath: string, fileUrl: string): Promise<void> {
    return this.requestor.put(fileUrl, filePath);
  }
}
