import { PingenResponse } from '../../common/response';
import { ListParams } from '../../common/list-params';
import { ValidationError } from '../../errors';
import { OrgResource } from '../base';
import { buildJsonApi } from '../../utils/payload';
import { definedOnly } from '../../utils/object';
import { PaperType } from '../../common/enums';
import { LetterCreateOptions, LetterUploadOptions, LetterSendOptions, LetterPriceOptions } from './types';

function validateAutoSend(opts: { autoSend: boolean } & Partial<LetterCreateOptions>): void {
  if (!opts.autoSend) {
    return;
  }
  if (!opts.deliveryProduct) {
    throw new ValidationError('deliveryProduct', 'deliveryProduct is required when autoSend is true');
  }
  if (!opts.printMode) {
    throw new ValidationError('printMode', 'printMode is required when autoSend is true');
  }
  if (!opts.printSpectrum) {
    throw new ValidationError('printSpectrum', 'printSpectrum is required when autoSend is true');
  }
}

export class Letters extends OrgResource {
  getDetails(letterId: string, params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/letters/${letterId}`, params);
  }

  getCollection(params?: ListParams): Promise<PingenResponse> {
    return this.requestor.get(`/organisations/${this.orgId}/deliveries/letters`, params);
  }

  uploadAndCreate(opts: LetterUploadOptions): Promise<PingenResponse> {
    validateAutoSend(opts);
    return this.uploadAndCall(opts, (rest) => this.createValidated(rest));
  }

  create(opts: LetterCreateOptions): Promise<PingenResponse> {
    validateAutoSend(opts);
    return this.createValidated(opts);
  }

  private createValidated(opts: LetterCreateOptions): Promise<PingenResponse> {
    const attributes = definedOnly({
      file_original_name: opts.fileOriginalName,
      file_url: opts.fileUrl,
      file_url_signature: opts.fileSignature,
      address_position: opts.addressPosition,
      auto_send: opts.autoSend,
      delivery_product: opts.deliveryProduct,
      print_mode: opts.printMode,
      print_spectrum: opts.printSpectrum,
      meta_data: opts.metaData,
    });
    return this.requestor.post(
      `/organisations/${this.orgId}/deliveries/letters`,
      buildJsonApi({ type: 'letters', attributes, relationships: opts.preset?.toValue() }),
    );
  }

  send(opts: LetterSendOptions): Promise<PingenResponse> {
    return this.requestor.patch(
      `/organisations/${this.orgId}/deliveries/letters/${opts.letterId}/send`,
      buildJsonApi({
        type: 'letters',
        id: opts.letterId,
        attributes: {
          delivery_product: opts.deliveryProduct,
          print_mode: opts.printMode,
          print_spectrum: opts.printSpectrum,
        },
      }),
    );
  }

  cancel(letterId: string): Promise<PingenResponse> {
    return this.requestor.patch(`/organisations/${this.orgId}/deliveries/letters/${letterId}/cancel`);
  }

  delete(letterId: string): Promise<PingenResponse> {
    return this.requestor.delete(`/organisations/${this.orgId}/deliveries/letters/${letterId}`);
  }

  edit(letterId: string, paperTypes: PaperType[]): Promise<PingenResponse> {
    return this.requestor.patch(
      `/organisations/${this.orgId}/deliveries/letters/${letterId}`,
      buildJsonApi({ type: 'letters', id: letterId, attributes: { paper_types: paperTypes } }),
    );
  }

  getFile(letterId: string): Promise<string> {
    return this.requestor.stream(`/organisations/${this.orgId}/deliveries/letters/${letterId}/file`);
  }

  calculatePrice(opts: LetterPriceOptions): Promise<PingenResponse> {
    return this.requestor.post(
      `/organisations/${this.orgId}/deliveries/letters/price-calculator`,
      buildJsonApi({
        type: 'letter_price_calculator',
        attributes: {
          country: opts.country,
          paper_types: opts.paperTypes,
          print_mode: opts.printMode,
          print_spectrum: opts.printSpectrum,
          delivery_product: opts.deliveryProduct,
        },
      }),
    );
  }
}
