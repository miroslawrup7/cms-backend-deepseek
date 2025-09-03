const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ======================
// KONFIGURACJA
// ======================

const inputItems = [
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\.vscode",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\__tests__",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\backup",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\controllers",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\middleware",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\models",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\routes",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\services",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\uploads",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\utils",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\.editorconfig",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\.env",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\.env.test",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\.gitattributes",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\.gitignore",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\.prettierrc",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\eslint.config.js",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\jest-mongodb-config.js",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\jest.config.js",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\jest.setup.js",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\package.json",
    "D:\\Programowanie\\projekty inne\\CMS DeepSeek\\cms-backend DeepSeek\\server.js",
];

const outputName = "Backend";
const versionFile = path.join(process.cwd(), "project_version.json");
const fileHistoryDir = path.join(process.cwd(), "history");

if (!fs.existsSync(fileHistoryDir)) fs.mkdirSync(fileHistoryDir, { recursive: true });

// ======================
// FUNKCJE POMOCNICZE
// ======================

function md5Hash(bufferOrString) {
    return crypto.createHash("md5").update(bufferOrString).digest("hex");
}

function safeStat(p) {
    if (!fs.existsSync(p)) {
        console.error(`❌ Plik lub folder nie istnieje: ${p}`);
        return null;
    }
    return fs.statSync(p);
}

function buildStructureTree(p, indent = "") {
    const stats = safeStat(p);
    if (!stats) return "";

    let structure = "";
    if (stats.isFile()) {
        structure += `${indent}- ${path.basename(p)}\n`;
    } else if (stats.isDirectory()) {
        structure += `${indent}+ ${path.basename(p)}\n`;
        const files = fs.readdirSync(p).sort();
        files.forEach((file) => {
            structure += buildStructureTree(path.join(p, file), indent + "  ");
        });
    }
    return structure;
}

function readFilesRecursively(p, result = []) {
    const stats = safeStat(p);
    if (!stats) return result;

    if (stats.isFile()) {
        result.push(p);
    } else if (stats.isDirectory()) {
        const files = fs.readdirSync(p).sort();
        files.forEach((file) => readFilesRecursively(path.join(p, file), result));
    }
    return result;
}

// Rozróżnienie plików tekstowych po rozszerzeniu
function isTextFile(filePath) {
    const textExtensions = [".js", ".ts", ".json", ".html", ".css", ".txt", ".md", ".scss", ".csv"];
    const ext = path.extname(filePath).toLowerCase();
    // Wymuszamy traktowanie .env jako tekstowy
    if (path.basename(filePath).toLowerCase() === ".env") return true;
    return textExtensions.includes(ext);
}

// ======================
// WERSJONOWANIE PLIKÓW I PROJEKTU
// ======================

const fileVersionsPath = path.join(process.cwd(), "file_versions.json");
let fileVersions = fs.existsSync(fileVersionsPath) ? JSON.parse(fs.readFileSync(fileVersionsPath, "utf-8")) : {};

const projectVersionData = fs.existsSync(versionFile) ? JSON.parse(fs.readFileSync(versionFile, "utf-8")) : { version: 0, structureHash: "" };

// ======================
// FUNKCJA SCALANIA
// ======================

function mergeFiles(inputPaths, outputName) {
    let output = "";

    // Budowanie struktury i listy plików
    let allFiles = [];
    let structureStr = "";
    inputPaths.forEach((p) => {
        structureStr += buildStructureTree(p, "");
        allFiles.push(...readFilesRecursively(p));
    });
    structureStr = structureStr.trim();

    // Hash struktury + zawartości wszystkich plików
    let combinedHash = crypto.createHash("md5");
    combinedHash.update(structureStr);

    allFiles.forEach((f) => {
        const buffer = fs.readFileSync(f);
        combinedHash.update(f + md5Hash(buffer));
    });

    const currentHash = combinedHash.digest("hex");

    const previousOutputFile = path.join(process.cwd(), `${outputName}_v${projectVersionData.version}.txt`);
    const isFirstRun = projectVersionData.version === 0 || !fs.existsSync(previousOutputFile);

    if (!isFirstRun && currentHash === projectVersionData.structureHash) {
        console.log("Brak zmian w projekcie, wersja pozostaje bez zmian.");
        return;
    }

    const projectVersion = projectVersionData.version + 1;
    const outputFile = path.join(process.cwd(), `${outputName}_v${projectVersion}.txt`);

    // Nagłówek globalny
    output += `${outputName} v.${projectVersion}\n\n`;
    output += "==================================\n";
    output += "STRUKTURA PROJEKTU\n";
    output += "==================================\n\n";
    output += structureStr + "\n";

    // Dodanie treści plików z wersjonowaniem
    allFiles.forEach((filePath) => {
        const textFile = isTextFile(filePath);
        let content = "";

        if (textFile) {
            try {
                content = fs.readFileSync(filePath, "utf-8");
                if (path.basename(filePath).toLowerCase() === ".env") {
                    content = content.replace(/^\uFEFF/, ""); // usuwa BOM
                }
            } catch (err) {
                console.error(`Błąd odczytu pliku tekstowego ${filePath}:`, err);
                content = "<błąd odczytu>";
            }
        } else {
            content = "<plik binarny, nie wyświetlono zawartości>";
        }

        const hash = textFile ? md5Hash(Buffer.from(content, "utf-8")) : md5Hash(fs.readFileSync(filePath));

        let version = 1;
        if (fileVersions[filePath] && fileVersions[filePath].hash === hash) {
            version = fileVersions[filePath].version;
        } else if (fileVersions[filePath]) {
            version = fileVersions[filePath].version + 1;
        }

        // Zapis historii tylko jeśli zmiana
        if (!fileVersions[filePath] || fileVersions[filePath].hash !== hash) {
            const safeName = path.basename(filePath).replace(/[\/\\]/g, "_");
            const histFile = path.join(fileHistoryDir, `${safeName}_v${version}.txt`);

            if (textFile) {
                fs.writeFileSync(histFile, content, "utf-8");
            } else {
                fs.writeFileSync(histFile, "<plik binarny, nie zapisano treści>", "utf-8");
            }
        }

        fileVersions[filePath] = { version, hash };

        output += `\n==================================\n`;
        output += `${path.basename(filePath)} v.${version}\n`;
        output += `==================================\n\n`;
        output += content + "\n";
    });

    fs.writeFileSync(fileVersionsPath, JSON.stringify(fileVersions, null, 2));
    fs.writeFileSync(outputFile, output, "utf-8");
    fs.writeFileSync(versionFile, JSON.stringify({ version: projectVersion, structureHash: currentHash }, null, 2));

    console.log(`✔ Pliki scalone do: ${outputFile}`);
    console.log(`✔ Historia plików w: ${fileHistoryDir}`);
}

// ======================
// URUCHOMIENIE
// ======================

mergeFiles(inputItems, outputName);
