"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandParser = void 0;
const commandParser = (text) => {
    if (!text?.startsWith('/'))
        return null;
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    return { command, args };
};
exports.commandParser = commandParser;
//# sourceMappingURL=commandParser.js.map