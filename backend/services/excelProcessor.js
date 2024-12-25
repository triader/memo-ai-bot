import * as XLSX from 'xlsx';

export class ExcelProcessor {
  static async processFile(fileUrl) {
    const fileResponse = await fetch(fileUrl);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  static validateData(data) {
    if (!data.length) {
      throw new Error('The Excel file is empty.');
    }

    const isValidFormat = data.every((row) => row.word && row.translation);
    if (!isValidFormat) {
      throw new Error(
        'Invalid file format. The Excel file should have columns named "word" and "translation".'
      );
    }

    return true;
  }

  static prepareWords(data, userId, categoryId) {
    return data.map((row) => ({
      user_id: userId,
      category_id: categoryId,
      word: row.word.trim(),
      translation: row.translation.trim(),
      created_at: new Date(),
    }));
  }
}
