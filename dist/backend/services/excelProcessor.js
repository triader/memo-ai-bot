"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelProcessor = void 0;
const XLSX = __importStar(require("xlsx"));
class ExcelProcessor {
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
            throw new Error('Invalid file format. The Excel file should have columns named "word" and "translation".');
        }
        return true;
    }
    static prepareWords(data, userId, categoryId) {
        return data.map((row) => ({
            user_id: userId,
            category_id: categoryId,
            word: row.word.trim(),
            translation: row.translation.trim(),
            created_at: new Date()
        }));
    }
}
exports.ExcelProcessor = ExcelProcessor;
//# sourceMappingURL=excelProcessor.js.map