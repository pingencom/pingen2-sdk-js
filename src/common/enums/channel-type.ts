// Channel a batch is dispatched through. `post` is the physical letter channel and stays the
// default; `ebill` / `email` require the matching channel to be configured on the organisation.
export enum ChannelType {
  Post = 'post',
  Ebill = 'ebill',
  Email = 'email',
}
