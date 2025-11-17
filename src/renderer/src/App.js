"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var react_codemirror_1 = __importDefault(require("@uiw/react-codemirror"));
var lang_markdown_1 = require("@codemirror/lang-markdown");
var codemirror_themes_1 = require("@uiw/codemirror-themes"); // Correct named import (camelCase 'githubLight')
var App = function () {
    var _a = (0, react_1.useState)(null), vaultPath = _a[0], setVaultPath = _a[1];
    var _b = (0, react_1.useState)([]), files = _b[0], setFiles = _b[1];
    var _c = (0, react_1.useState)(null), currentFile = _c[0], setCurrentFile = _c[1];
    var _d = (0, react_1.useState)(''), content = _d[0], setContent = _d[1];
    var handleSelectVault = function () { return __awaiter(void 0, void 0, void 0, function () {
        var path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, window.electronAPI.selectVault()];
                case 1:
                    path = _a.sent();
                    if (path) {
                        setVaultPath(path);
                        refreshFiles();
                    }
                    return [2 /*return*/];
            }
        });
    }); };
    var refreshFiles = function () { return __awaiter(void 0, void 0, void 0, function () {
        var fileList;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!vaultPath) return [3 /*break*/, 2];
                    return [4 /*yield*/, window.electronAPI.listFiles()];
                case 1:
                    fileList = _a.sent();
                    setFiles(fileList);
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
    var openFile = function (file) { return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setCurrentFile(file);
                    return [4 /*yield*/, window.electronAPI.readFile(file)];
                case 1:
                    data = _a.sent();
                    setContent(data || '');
                    return [2 /*return*/];
            }
        });
    }); };
    var saveFile = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!currentFile) return [3 /*break*/, 2];
                    return [4 /*yield*/, window.electronAPI.writeFile(currentFile, content)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        if (vaultPath) {
            refreshFiles();
        }
    }, [vaultPath]);
    return ((0, jsx_runtime_1.jsx)("div", __assign({ style: { display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' } }, { children: !vaultPath ? ((0, jsx_runtime_1.jsx)("div", __assign({ style: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' } }, { children: (0, jsx_runtime_1.jsx)("button", __assign({ onClick: handleSelectVault }, { children: "Select Vault Directory" })) }))) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", __assign({ style: { width: '250px', borderRight: '1px solid #ddd', padding: '10px', overflowY: 'auto' } }, { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Files" }), (0, jsx_runtime_1.jsx)("ul", __assign({ style: { listStyleType: 'none', padding: 0 } }, { children: files.map(function (file) { return ((0, jsx_runtime_1.jsx)("li", __assign({ onClick: function () { return openFile(file); }, style: { cursor: 'pointer', padding: '5px', borderBottom: '1px solid #eee' } }, { children: file }), file)); }) })), (0, jsx_runtime_1.jsx)("button", __assign({ onClick: function () { } }, { children: "New Note" }))] })), (0, jsx_runtime_1.jsx)("div", __assign({ style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '10px' } }, { children: currentFile && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h3", { children: currentFile }), (0, jsx_runtime_1.jsx)(react_codemirror_1.default, { value: content, height: "calc(100vh - 100px)" // Full height minus headers/buttons
                                , extensions: [(0, lang_markdown_1.markdown)()], theme: codemirror_themes_1.githubLight, onChange: function (value) { return setContent(value); } }), (0, jsx_runtime_1.jsx)("button", __assign({ onClick: saveFile, style: { marginTop: '10px' } }, { children: "Save" }))] })) }))] })) })));
};
exports.default = App;
