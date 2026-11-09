var pdfStyles = {
    Classic: { font: "times", margin: 20, nameSize: 18, textSize: 11, headSize: 10, centered: true, color: [0, 0, 0], rule: 0.3 },
    Modern: { font: "helvetica", margin: 20, nameSize: 20, textSize: 10.5, headSize: 10, centered: false, color: [26, 58, 143], rule: 0.8 },
    Compact: { font: "helvetica", margin: 15, nameSize: 16, textSize: 9.5, headSize: 9, centered: true, color: [0, 0, 0], rule: 0.3 }
};

function buildPdf(resume) {
    var s = pdfStyles[resume.template] || pdfStyles.Classic;
    var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    var left = s.margin;
    var right = 210 - s.margin;
    var bottom = 297 - s.margin;
    var y = s.margin + 4;
    var profile = data.profile;

    function room(height) {
        if (y + height > bottom) {
            doc.addPage();
            y = s.margin;
        }
    }

    function put(text, size, style, color, x, align) {
        doc.setFont(s.font, style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(text, x, y, { align: align });
    }

    function header(text, size, style, color) {
        room(size * 0.5);
        put(text, size, style, color, s.centered ? 105 : left, s.centered ? "center" : "left");
        y += size * 0.5;
    }

    function rule() {
        y += 1;
        doc.setDrawColor(s.color[0], s.color[1], s.color[2]);
        if (s.color[0] == 0) doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(s.rule);
        doc.line(left, y, right, y);
        y += 5;
    }

    function heading(text) {
        room(12);
        y += 3;
        put(text.toUpperCase(), s.headSize, "bold", s.color, left, "left");
        y += 5;
    }

    function paragraph(text, size) {
        var lines = doc.splitTextToSize(text, right - left);
        lines.forEach(function (line) {
            room(size * 0.5);
            put(line, size, "normal", [40, 40, 40], left, "left");
            y += size * 0.5;
        });
    }

    header(profile.name, s.nameSize, "bold", s.centered ? [0, 0, 0] : s.color);
    y += 1;
    [profile.program, [profile.email, profile.phone].filter(Boolean).join("  |  "), profile.address].filter(Boolean).forEach(function (line) {
        header(line, s.textSize - 1, "normal", [90, 90, 90]);
    });
    rule();

    if (resume.summary) {
        heading("Summary");
        paragraph(resume.summary, s.textSize);
    }

    heading("Achievements");
    var entries = resume.entryIds.map(findEntry).filter(function (e) { return e; });
    entries.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    entries.forEach(function (e) {
        room(s.textSize * 1.2);
        put(e.title, s.textSize, "bold", [0, 0, 0], left, "left");
        put(monthYear(e.date), s.textSize, "normal", [90, 90, 90], right, "right");
        y += s.textSize * 0.5;
        if (e.description) paragraph(e.description, s.textSize - 0.5);
        y += resume.template == "Compact" ? 1.5 : 3;
    });

    return doc;
}

function makePdf(resume) {
    var doc = buildPdf(resume);
    var fileName = (resume.name.replace(/[^\w\- ]/g, "").trim().replace(/\s+/g, "_") || "resume") + ".pdf";

    if (!window.cordova || !window.resolveLocalFileSystemURL) {
        doc.save(fileName);
        toast("PDF saved");
        return;
    }

    var blob = doc.output("blob");

    function failed() {
        toast("The PDF could not be saved");
    }

    resolveLocalFileSystemURL(cordova.file.externalDataDirectory || cordova.file.dataDirectory, function (dir) {
        dir.getFile(fileName, { create: true }, function (file) {
            file.createWriter(function (writer) {
                var cleared = false;
                writer.onwriteend = function () {
                    if (!cleared) {
                        cleared = true;
                        writer.write(blob);
                        return;
                    }
                    openPdf(file.nativeURL);
                };
                writer.onerror = failed;
                writer.truncate(0);
            }, failed);
        }, failed);
    }, failed);
}

function openPdf(path) {
    if (!cordova.plugins || !cordova.plugins.fileOpener2) {
        toast("PDF saved in the app folder");
        return;
    }
    cordova.plugins.fileOpener2.open(path, "application/pdf", {
        error: function () {
            toast("PDF saved, but no app could open it");
        }
    });
}
