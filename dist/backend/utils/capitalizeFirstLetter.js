"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalizeFirstLetter = capitalizeFirstLetter;
function capitalizeFirstLetter(string) {
    if (!string)
        return string;
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}
//# sourceMappingURL=capitalizeFirstLetter.js.map