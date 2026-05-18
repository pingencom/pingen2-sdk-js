import nock from 'nock';
import { FileUpload } from '../../src/resources';
import { ApiRequestor } from '../../src/requestor';
import { PingenError } from '../../src/errors';
import { API, TOKEN } from '../helpers';

describe('FileUpload.requestFileUpload', () => {
  afterEach(() => nock.cleanAll());

  const fu = () => new FileUpload(new ApiRequestor(TOKEN));

  test('returns { url, signature } on a well-formed response', async () => {
    nock(API)
      .get('/file-upload')
      .reply(200, {
        data: {
          id: 'x',
          type: 'file_uploads',
          attributes: { url: 'https://signed.ex/u', url_signature: '$sig', expires_at: '2099-01-01' },
        },
      });
    const result = await fu().requestFileUpload();
    expect(result).toEqual({ url: 'https://signed.ex/u', signature: '$sig' });
  });

  test('throws PingenError when /file-upload returns empty attributes (no url, no signature)', async () => {
    nock(API)
      .get('/file-upload')
      .reply(200, { data: { id: 'x', type: 'file_uploads', attributes: {} } });
    const err = await fu()
      .requestFileUpload()
      .catch((e) => e);
    expect(err).toBeInstanceOf(PingenError);
    expect(err.message).toMatch(/missing url or url_signature/);
  });

  test('throws PingenError when /file-upload omits url_signature', async () => {
    nock(API)
      .get('/file-upload')
      .reply(200, {
        data: { id: 'x', type: 'file_uploads', attributes: { url: 'https://signed.ex/u' } },
      });
    await expect(fu().requestFileUpload()).rejects.toThrow(/missing url or url_signature/);
  });

  test('throws PingenError when /file-upload omits url', async () => {
    nock(API)
      .get('/file-upload')
      .reply(200, {
        data: { id: 'x', type: 'file_uploads', attributes: { url_signature: '$sig' } },
      });
    await expect(fu().requestFileUpload()).rejects.toThrow(/missing url or url_signature/);
  });
});
