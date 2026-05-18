import { ApiRequestor } from '../requestor';
import { FileUpload, SignedUpload } from './file-upload';

// Resources accept a pre-built ApiRequestor only. Direct token-based instantiation goes
// through the static `withToken` factory — this keeps the constructor signature unambiguous
// and lets PingenClient share a single requestor across all resources.
export abstract class BaseResource {
  constructor(protected readonly requestor: ApiRequestor) {}
}

export abstract class OrgResource {
  constructor(
    protected readonly orgId: string,
    protected readonly requestor: ApiRequestor,
  ) {}

  // Shared upload flow used by Letters/Batches/Ebills/Emails. Requests a signed URL, PUTs the
  // file to it, and returns the URL + signature so the caller can attach them to its create()
  // call. Throws if the signed-URL upload fails (see ApiRequestor.put).
  protected uploadFile(filePath: string): Promise<SignedUpload> {
    const fu = new FileUpload(this.requestor);
    return fu.requestFileUpload().then(async (signed) => {
      await fu.putFile(filePath, signed.url);
      return signed;
    });
  }

  // Shared "upload then create" flow: takes upload options containing `filePath`, runs the
  // signed-URL upload, then forwards the rest to the resource-specific `create` step with
  // fileUrl/fileSignature attached. Each resource keeps its own typed Create/Upload pair —
  // this helper just removes the four-line boilerplate that used to live in every subclass.
  protected async uploadAndCall<U extends { filePath: string }, R>(
    opts: U,
    create: (rest: Omit<U, 'filePath'> & { fileUrl: string; fileSignature: string }) => Promise<R>,
  ): Promise<R> {
    const { url, signature } = await this.uploadFile(opts.filePath);
    const { filePath: _filePath, ...rest } = opts;
    return create({ ...rest, fileUrl: url, fileSignature: signature } as Omit<U, 'filePath'> & {
      fileUrl: string;
      fileSignature: string;
    });
  }
}
