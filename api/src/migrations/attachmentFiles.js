import { Attachment } from '../models/index.js';
import { storeFile, attachmentUrl } from '../services/fileStorage.js';

export async function migrateAttachmentFiles() {
  for await (const file of Attachment.collection.find({ data: { $exists: true } })) {
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data.value(true));
    await storeFile(file._id, data);
    await Attachment.collection.updateOne({ _id: file._id }, { $set: { url: attachmentUrl(file._id) }, $unset: { data: '' } });
  }
}
